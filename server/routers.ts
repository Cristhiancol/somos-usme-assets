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
  bulkUpsertInventory,
  bulkUpsertOrders,
  bulkUpsertSuppliers,
  logSync,
} from "./db";
import { notifyOwner } from "./_core/notification";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
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
      }).optional())
      .query(async ({ input }) => {
        return getPurchaseOrders(input ?? undefined);
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
  }),

  suppliers: router({
    list: publicProcedure.query(async () => {
      return getSuppliers();
    }),
  }),

  sync: router({
    trigger: protectedProcedure.mutation(async () => {
      try {
        // This will be called from the frontend to trigger a Drive sync
        // The actual sync logic runs server-side via the sync endpoint
        const response = await fetch(`http://localhost:${process.env.PORT || 3000}/api/sync-drive`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const result = await response.json();
        return result;
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }),

    lastSync: publicProcedure.query(async () => {
      return getLastSync();
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
