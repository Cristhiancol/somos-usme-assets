import { drizzle } from "drizzle-orm/mysql2";
import { inventoryItems, purchaseOrders, suppliers, syncLogs } from "./drizzle/schema.ts";
import { readFileSync } from "fs";
import { sql } from "drizzle-orm";

const DATA_FILE = "/home/ubuntu/somos-usme-assets/seed-data.json";

async function main() {
  const db = drizzle(process.env.DATABASE_URL);
  const data = JSON.parse(readFileSync(DATA_FILE, "utf-8"));

  console.log("Clearing existing data...");
  await db.delete(inventoryItems);
  await db.delete(purchaseOrders);
  await db.delete(suppliers);
  await db.delete(syncLogs);

  // Insert inventory items in batches of 100
  console.log(`Inserting ${data.inventory.length} inventory items...`);
  for (let i = 0; i < data.inventory.length; i += 100) {
    const batch = data.inventory.slice(i, i + 100);
    await db.insert(inventoryItems).values(batch);
    console.log(`  Batch ${Math.floor(i / 100) + 1}: ${batch.length} items`);
  }

  // Insert purchase orders in batches of 100
  console.log(`Inserting ${data.orders.length} purchase orders...`);
  for (let i = 0; i < data.orders.length; i += 100) {
    const batch = data.orders.slice(i, i + 100).map(o => ({
      ...o,
      fechaPromesa: o.fechaPromesa ? new Date(o.fechaPromesa) : null,
      fechaRequerida: o.fechaRequerida ? new Date(o.fechaRequerida) : null,
    }));
    await db.insert(purchaseOrders).values(batch);
    console.log(`  Batch ${Math.floor(i / 100) + 1}: ${batch.length} orders`);
  }

  // Insert suppliers
  console.log(`Inserting ${data.suppliers.length} suppliers...`);
  if (data.suppliers.length > 0) {
    for (let i = 0; i < data.suppliers.length; i += 100) {
      const batch = data.suppliers.slice(i, i + 100);
      await db.insert(suppliers).values(batch);
    }
  }

  // Log sync
  await db.insert(syncLogs).values({
    syncType: "initial_seed",
    status: "success",
    itemsProcessed: data.inventory.length,
    ordersProcessed: data.orders.length,
    suppliersProcessed: data.suppliers.length,
  });

  console.log("Seed complete!");
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
