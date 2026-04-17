import { createConnection } from 'mysql2/promise';

const conn = await createConnection(process.env.DATABASE_URL);

// Check if CONTROL INVENTARIO fields are populated
const [stats] = await conn.execute(`
  SELECT 
    COUNT(*) as total,
    SUM(CASE WHEN parteFabricante IS NOT NULL AND parteFabricante != '' THEN 1 ELSE 0 END) as conParteFab,
    SUM(CASE WHEN accionRequerida IS NOT NULL AND accionRequerida != '' THEN 1 ELSE 0 END) as conAccion,
    SUM(CASE WHEN cantidadAPedir > 0 THEN 1 ELSE 0 END) as conCantPedir,
    SUM(CASE WHEN estado IS NOT NULL AND estado != '' THEN 1 ELSE 0 END) as conEstado
  FROM inventory_items
`);
console.log('Campos CONTROL INVENTARIO:', JSON.stringify(stats[0]));

// Sample parteFabricante values
const [samples] = await conn.execute(`
  SELECT referencia, parteFabricante, accionRequerida, cantidadAPedir, estado
  FROM inventory_items 
  WHERE parteFabricante IS NOT NULL AND parteFabricante != ''
  LIMIT 10
`);
console.log('\nSamples parteFabricante:');
samples.forEach(s => console.log(`  ${s.referencia}: PF='${s.parteFabricante}' ACC='${s.accionRequerida}' CANT=${s.cantidadAPedir} EST=${s.estado}`));

// Check for parteFabricante with text (not just number)
const [withText] = await conn.execute(`
  SELECT referencia, parteFabricante FROM inventory_items 
  WHERE parteFabricante REGEXP '[A-Za-z]' 
  LIMIT 10
`);
console.log('\nPF con texto (no solo número):', withText.length);
withText.forEach(w => console.log(`  ${w.referencia}: '${w.parteFabricante}'`));

// Check Top 20 by valor
const [top20] = await conn.execute(`
  SELECT referencia, descripcion, parteFabricante, totalStock, estado, accionRequerida, cantidadAPedir
  FROM inventory_items 
  ORDER BY totalStock DESC 
  LIMIT 20
`);
console.log('\nTop 20 por valor:');
top20.forEach((t, i) => console.log(`  ${i+1}. ${t.referencia}: $${t.totalStock} EST=${t.estado} ACC=${t.accionRequerida} PF=${t.parteFabricante}`));

// Count by estado
const [estados] = await conn.execute(`
  SELECT estado, COUNT(*) as cnt FROM inventory_items GROUP BY estado ORDER BY cnt DESC
`);
console.log('\nDistribución estados:', estados.map(e => `${e.estado}=${e.cnt}`).join(', '));

// Count by accionRequerida
const [acciones] = await conn.execute(`
  SELECT accionRequerida, COUNT(*) as cnt FROM inventory_items WHERE accionRequerida IS NOT NULL AND accionRequerida != '' GROUP BY accionRequerida ORDER BY cnt DESC
`);
console.log('Distribución acciones:', acciones.map(a => `${a.accionRequerida}=${a.cnt}`).join(', '));

await conn.end();
