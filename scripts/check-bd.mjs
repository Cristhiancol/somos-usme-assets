import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [invTotal] = await conn.execute('SELECT COUNT(*) as total FROM inventory_items');
const [invEstados] = await conn.execute('SELECT estado, COUNT(*) as cnt FROM inventory_items GROUP BY estado ORDER BY cnt DESC');
const [ocTotal] = await conn.execute('SELECT COUNT(*) as total FROM purchase_orders');
const [ocEstado] = await conn.execute("SELECT estado, COUNT(*) as cnt FROM purchase_orders GROUP BY estado");
const [ocPrioridad] = await conn.execute("SELECT prioridad, COUNT(*) as cnt FROM purchase_orders WHERE estado='PENDIENTE' GROUP BY prioridad ORDER BY cnt DESC");
const [ocStockCero] = await conn.execute(
  'SELECT COUNT(*) as total FROM purchase_orders po INNER JOIN inventory_items i ON po.mainsaver = i.referencia WHERE i.stockActual = 0 AND po.estado = "PENDIENTE"'
);

console.log('=== INVENTARIO ===');
console.log('Total refs:', invTotal[0].total);
console.log('Por estado:', JSON.stringify(invEstados));
console.log('=== ORDENES ===');
console.log('Total OC:', ocTotal[0].total);
console.log('Por estado:', JSON.stringify(ocEstado));
console.log('Por prioridad (PENDIENTE):', JSON.stringify(ocPrioridad));
console.log('Stock0+OC activa:', ocStockCero[0].total);

await conn.end();
