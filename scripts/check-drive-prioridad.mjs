import 'dotenv/config';
import mysql from 'mysql2/promise';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Ver qué valores de prioridad hay en la BD (vienen del Drive)
const [vals] = await conn.query(`
  SELECT prioridad, COUNT(*) as cnt 
  FROM purchase_orders 
  GROUP BY prioridad 
  ORDER BY cnt DESC
`);
console.log('=== Valores de PRIORIDAD en BD (del Drive) ===');
vals.forEach(v => console.log(`  "${v.prioridad}": ${v.cnt} OC`));

// Ver los primeros 5 registros con prioridad NORMAL para entender el contexto
const [normales] = await conn.query(`
  SELECT ordenCompra, descripcion, prioridad, estado, diasRetraso
  FROM purchase_orders 
  WHERE prioridad = 'NORMAL' 
  LIMIT 5
`);
console.log('\n=== Muestra de OC con prioridad NORMAL ===');
normales.forEach(r => console.log(`  OC: ${r.ordenCompra} | ${r.descripcion?.substring(0,30)} | Estado: ${r.estado} | Días: ${r.diasRetraso}`));

// Ver los primeros 5 con URGENTE
const [urgentes] = await conn.query(`
  SELECT ordenCompra, descripcion, prioridad, estado, diasRetraso
  FROM purchase_orders 
  WHERE prioridad = 'URGENTE' 
  LIMIT 5
`);
console.log('\n=== Muestra de OC con prioridad URGENTE ===');
urgentes.forEach(r => console.log(`  OC: ${r.ordenCompra} | ${r.descripcion?.substring(0,30)} | Estado: ${r.estado} | Días: ${r.diasRetraso}`));

await conn.end();
