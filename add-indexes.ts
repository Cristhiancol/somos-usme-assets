import "dotenv/config";
import { getDb } from "./server/db";
import { sql } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.error("No db");
    return;
  }
  
  try {
    await db.execute(sql`ALTER TABLE inventory_items ADD UNIQUE INDEX idx_uniq_referencia (referencia);`);
    console.log("Added unique index to inventory_items");
  } catch (e: any) { console.error("inventory_items:", e.message); }

  try {
    await db.execute(sql`ALTER TABLE purchase_orders ADD UNIQUE INDEX idx_uniq_po (ordenCompra, mainsaver, um);`);
    console.log("Added unique index to purchase_orders");
  } catch (e: any) { console.error("purchase_orders:", e.message); }

  try {
    await db.execute(sql`ALTER TABLE suppliers ADD UNIQUE INDEX idx_uniq_nit (nit);`);
    console.log("Added unique index to suppliers");
  } catch (e: any) { console.error("suppliers:", e.message); }

  try {
    await db.execute(sql`ALTER TABLE consumo_mensual ADD UNIQUE INDEX idx_uniq_consumo (referencia, mes);`);
    console.log("Added unique index to consumo_mensual");
  } catch (e: any) { console.error("consumo_mensual:", e.message); }

  // Now execute the user's requested indexes
  const userIndexes = [
    `ALTER TABLE inventory_items ADD INDEX idx_estado (estado);`,
    `ALTER TABLE inventory_items ADD INDEX idx_claseAbc (claseAbc);`,
    `ALTER TABLE inventory_items ADD INDEX idx_cuenta (cuenta);`,
    `ALTER TABLE purchase_orders ADD INDEX idx_estado_po (estado);`,
    `ALTER TABLE purchase_orders ADD INDEX idx_prioridad_po (prioridad);`,
    `ALTER TABLE purchase_orders ADD INDEX idx_mainsaver_po (mainsaver);`,
    `ALTER TABLE facturacion_oc ADD INDEX idx_estado_foc (estado);`,
    `ALTER TABLE facturacion_ocs ADD INDEX idx_estado_focs (estado);`
  ];

  for (const query of userIndexes) {
    try {
      await db.execute(sql.raw(query));
      console.log("Executed:", query);
    } catch (e: any) {
      console.error("Index error:", query, e.message);
    }
  }

  process.exit(0);
}

main();
