import { getDb } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('No database connection');
    process.exit(1);
  }

  console.log('Truncando tabla purchase_orders_v3 para limpiar duplicados nulos...');
  await db.execute(sql`TRUNCATE TABLE purchase_orders_v3;`);
  console.log('Tabla limpiada exitosamente!');
  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
