import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getUserByOpenId } from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // 1. Verificar token de sesión (cookie JWT)
    const tokenUser = await sdk.authenticateRequest(opts.req);

    if (tokenUser?.openId) {
      // 2. ═══ REVALIDACIÓN EN BD ═══
      // Verificar que el usuario sigue existiendo y está activo en la BD
      const dbUser = await getUserByOpenId(tokenUser.openId);

      if (dbUser && dbUser.activo === 1) {
        // ✅ Usuario existe y está activo — usar datos frescos de BD
        user = dbUser;
      } else {
        // ❌ Usuario eliminado o inactivo — invalidar sesión
        // No asignar user → ctx.user será null → protectedProcedure lanzará UNAUTHORIZED
        console.warn(
          `[Context] Usuario ${tokenUser.openId} tiene sesión pero ${
            !dbUser ? "no existe en BD" : "está inactivo (activo=0)"
          }`
        );
        user = null;
      }
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
