/**
 * Admin Router — Gestión de usuarios y auditoría
 * Solo accesible por adminProcedure (role === 'admin')
 */
import { adminProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { users, auditoriaAccesos } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { serverLogger } from "../logger";

export const adminRouter = router({
  /**
   * Lista todos los usuarios registrados
   */
  users: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return [];
    return db.select().from(users).orderBy(desc(users.lastSignedIn));
  }),

  /**
   * Activar/desactivar un usuario
   */
  toggleUser: adminProcedure
    .input(z.object({
      userId: z.number(),
      activo: z.number().min(0).max(1),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Base de datos no disponible");

      await db.update(users)
        .set({ activo: input.activo })
        .where(eq(users.id, input.userId));

      serverLogger.info(`[Admin] Usuario ${input.userId} ${input.activo ? "activado" : "desactivado"}`);
      return { success: true };
    }),

  /**
   * Consultar auditoría de accesos con paginación
   */
  audit: adminProcedure
    .input(z.object({
      limit: z.number().optional().default(50),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const limit = input?.limit ?? 50;
      return db.select()
        .from(auditoriaAccesos)
        .orderBy(desc(auditoriaAccesos.createdAt))
        .limit(limit);
    }),
});
