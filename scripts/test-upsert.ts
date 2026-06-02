import { sql } from "drizzle-orm";
import { inventoryItems } from "./drizzle/schema";

export function test() {
  const batch = [{ referencia: "1", stockActual: 10 }];
  const keys = Object.keys(batch[0]).filter(k => k !== 'referencia' && k !== 'id');
  const setClause: Record<string, any> = { updatedAt: sql`CURRENT_TIMESTAMP` };
  for (const key of keys) {
    setClause[key] = sql.raw(`VALUES(${key})`);
  }
  return setClause;
}
