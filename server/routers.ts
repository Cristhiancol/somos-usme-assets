import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  getDashboardKPIs,
  getJITAlerts,
  getValueByCategory,
  getTop20Value,
  getTop20ZeroStock,
  getPurchaseOrders,
  getInventory,
  getSuppliers,
  getLastSync,
  getDelayedOrders,
  getCriticalStockItems,
  getStockCeroConOC,
} from "./db";
import { isGDriveAuthorized, getValidAccessToken } from "./gdrive-oauth";
import { notifyOwner } from "./_core/notification";
import { syncFromGoogleDrive } from "./gdrive-sync";
import * as predictionsModule from "./routers/predictions";
import { chatbotRouter } from "./routers/chatbot";
import { adminRouter } from "./routers/admin";
import { exportsRouter } from "./routers/exports";
import { consumoRouter } from "./routers/consumo";
import { sendStockCeroReport, previewStockCeroReport } from "./email-service";
import { registrarAuditoria } from "./auditoria";

export const appRouter = router({
  system: systemRouter,
  predictions: predictionsModule.predictionsRouter,
  chatbot: chatbotRouter,
  admin: adminRouter,
  exports: exportsRouter,
  consumo: consumoRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      // Registrar logout en auditoría
      if (ctx.user?.email) {
        await registrarAuditoria("LOGOUT", ctx.user.email, "Sesión cerrada", {
          openId: ctx.user.openId,
          ip: (ctx.req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? ctx.req.socket?.remoteAddress ?? "unknown",
          userAgent: (ctx.req.headers["user-agent"] ?? "unknown").substring(0, 500),
        });
      }
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  dashboard: router({
    kpis: publicProcedure.query(async () => {
      return getDashboardKPIs();
    }),

    jitAlerts: publicProcedure.query(async () => {
      return getJITAlerts();
    }),

    valueByCategory: publicProcedure.query(async () => {
      return getValueByCategory();
    }),

    top20Value: publicProcedure.query(async () => {
      return getTop20Value();
    }),

    top20ZeroStock: publicProcedure.query(async () => {
      return getTop20ZeroStock();
    }),

    lastSync: publicProcedure.query(async () => {
      return getLastSync();
    }),
  }),

  orders: router({
    list: publicProcedure
      .input(z.object({
        estado: z.string().optional(),
        prioridad: z.string().optional(),
        search: z.string().optional(),
        tipoReferencia: z.enum(['TODOS', 'NUEVO', 'REPARADO', 'SERVICIO']).optional(),
      }).optional())
      .query(async ({ input }) => {
        const filters = input ? {
          ...input,
          tipoReferencia: input.tipoReferencia === 'TODOS' ? undefined : input.tipoReferencia,
        } : undefined;
        return getPurchaseOrders(filters);
      }),

    delayed: publicProcedure.query(async () => {
      return getDelayedOrders();
    }),
  }),

  inventory: router({
    list: publicProcedure
      .input(z.object({
        cuenta: z.string().optional(),
        claseAbc: z.string().optional(),
        estado: z.string().optional(),
        search: z.string().optional(),
        page: z.number().optional(),
        limit: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return getInventory(input ?? undefined);
      }),

    critical: publicProcedure.query(async () => {
      return getCriticalStockItems();
    }),

    // Referencias con stock=0 que tienen Orden de Compra activa — vista priorizada
    stockCeroConOC: publicProcedure.query(async () => {
      return getStockCeroConOC();
    }),
  }),

  suppliers: router({
    list: publicProcedure.query(async () => {
      return getSuppliers();
    }),
  }),

  sync: router({
    trigger: protectedProcedure.mutation(async () => {
      // Call syncFromGoogleDrive directly — no internal fetch
      const result = await syncFromGoogleDrive();
      return result;
    }),

    lastSync: publicProcedure.query(async () => {
      return getLastSync();
    }),

    tokenStatus: publicProcedure.query(async () => {
      const authorized = await isGDriveAuthorized();
      if (!authorized) {
        return { status: 'none' as const };
      }
      // Check if the access token can still be obtained (not revoked)
      const token = await getValidAccessToken();
      if (!token) {
        return { status: 'revoked' as const };
      }
      return { status: 'authorized' as const };
    }),
  }),

  email: router({
    // Enviar reporte manual de Stock Cero OC (protegido — solo admin/owner)
    sendStockCeroReport: protectedProcedure
      .input(z.object({
        to: z.string().email().optional(),
      }).optional())
      .mutation(async ({ input }) => {
        const result = await sendStockCeroReport({ to: input?.to });
        return result;
      }),

    // Preview del HTML del correo (para verificar sin enviar)
    previewStockCeroReport: protectedProcedure.query(async () => {
      const html = await previewStockCeroReport();
      return { html };
    }),
  }),

  notifications: router({
    sendDelayedOrdersAlert: protectedProcedure.mutation(async () => {
      const delayed = await getDelayedOrders();
      if (delayed.length === 0) return { sent: false, message: "No hay órdenes con retraso" };

      const summary = delayed.slice(0, 10).map(o =>
        `• OC ${o.ordenCompra}: ${o.descripcion} - ${o.diasRetraso} días retraso - ${o.proveedor}`
      ).join('\n');

      await notifyOwner({
        title: `⚠️ ${delayed.length} Órdenes con Retraso - Somos Usme`,
        content: `Se detectaron ${delayed.length} órdenes de compra con retraso:\n\n${summary}\n\nRevise el dashboard para más detalles.`,
      });

      return { sent: true, count: delayed.length };
    }),

    sendCriticalStockAlert: protectedProcedure.mutation(async () => {
      const critical = await getCriticalStockItems();
      if (critical.length === 0) return { sent: false, message: "No hay items críticos" };

      const summary = critical.slice(0, 10).map(i =>
        `• ${i.referencia}: ${i.descripcion} - Consumo diario: ${i.consumoDiario?.toFixed(1)} - ${i.proveedor}`
      ).join('\n');

      await notifyOwner({
        title: `🔴 ${critical.length} Productos Stock CERO - Riesgo Parada Flota`,
        content: `Se detectaron ${critical.length} productos sin stock con consumo activo:\n\n${summary}\n\nAcción inmediata requerida.`,
      });

      return { sent: true, count: critical.length };
    }),
  }),
});

export type AppRouter = typeof appRouter;
