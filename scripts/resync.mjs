/**
 * Script de resincronización: descarga el Excel del Drive y actualiza la BD
 * con las prioridades correctas (REORDEN INMEDIATO, CRITICO, OPTIMO, etc.)
 */
import mysql2 from 'mysql2/promise';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const DRIVE_FILE_ID = '1sMQ-SsIfguGHGWnhm7IkHFIrBxjC3YZ8';
const LOCAL_FILE = '/tmp/resync_file.xlsx';
const CDN_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355008483/Cn82Y4DQbN9nyZtZuLDx26/DASBOARD_SOMOS_U_GESTOR_1_a015c179.xlsx';

async function getAccessToken(conn) {
  const [tokens] = await conn.execute(
    "SELECT accessToken, refreshToken, expiresAt FROM oauth_tokens WHERE provider = 'google_drive' LIMIT 1"
  );
  if (!tokens.length) return null;

  const tok = tokens[0];
  if (tok.expiresAt > Date.now()) return tok.accessToken;

  if (!tok.refreshToken) return null;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_DRIVE_CLIENT_ID,
      client_secret: process.env.GOOGLE_DRIVE_CLIENT_SECRET,
      refresh_token: tok.refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json();
  if (!data.access_token) {
    console.warn('No se pudo refrescar token:', data.error);
    return null;
  }

  const newExpiry = Date.now() + data.expires_in * 1000;
  await conn.execute(
    "UPDATE oauth_tokens SET accessToken = ?, expiresAt = ? WHERE provider = 'google_drive'",
    [data.access_token, newExpiry]
  );
  console.log('Token refrescado OK');
  return data.access_token;
}

async function downloadFile(accessToken) {
  if (accessToken) {
    const exportUrl = `https://www.googleapis.com/drive/v3/files/${DRIVE_FILE_ID}/export?mimeType=application%2Fvnd.openxmlformats-officedocument.spreadsheetml.sheet`;
    const r = await fetch(exportUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (r.ok) {
      const buf = Buffer.from(await r.arrayBuffer());
      console.log(`Drive export OK: ${(buf.length / 1024 / 1024).toFixed(2)} MB`);
      return buf;
    }
    const r2 = await fetch(`https://www.googleapis.com/drive/v3/files/${DRIVE_FILE_ID}?alt=media`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (r2.ok) {
      const buf = Buffer.from(await r2.arrayBuffer());
      console.log(`Drive direct OK: ${(buf.length / 1024 / 1024).toFixed(2)} MB`);
      return buf;
    }
    console.warn('Drive falló, usando CDN...');
  }

  const LOCAL = '/home/ubuntu/somos-usme-assets/data/DASBOARD_SOMOS_U_GESTOR_1.xlsx';
  if (existsSync(LOCAL)) {
    console.log('Usando archivo local');
    return readFileSync(LOCAL);
  }

  const r = await fetch(CDN_URL);
  if (r.ok) {
    const buf = Buffer.from(await r.arrayBuffer());
    console.log(`CDN OK: ${(buf.length / 1024 / 1024).toFixed(2)} MB`);
    return buf;
  }
  throw new Error('No se pudo obtener el archivo');
}

function safeFloat(val, def = 0) {
  if (val === null || val === undefined || val === '') return def;
  const n = Number(val);
  return isNaN(n) ? def : n;
}

function safeStr(val) {
  if (val === null || val === undefined || val === '') return null;
  return String(val).trim() || null;
}

function safeDate(val) {
  if (!val) return null;
  try {
    if (typeof val === 'number') {
      const epoch = new Date(1899, 11, 30);
      const d = new Date(epoch.getTime() + val * 86400000);
      return isNaN(d.getTime()) ? null : d.toISOString().replace('T', ' ').substring(0, 19);
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d.toISOString().replace('T', ' ').substring(0, 19);
  } catch { return null; }
}

function sheetToRows(workbook, sheetName, headerRow = 2) {
  const xlsx = workbook._xlsx;
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  const raw = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: null });
  if (!raw || raw.length <= headerRow) return [];
  const headers = raw[headerRow] || [];
  const rows = [];
  for (let i = headerRow + 1; i < raw.length; i++) {
    const rowData = raw[i];
    if (!rowData) continue;
    const obj = {};
    let hasData = false;
    headers.forEach((h, idx) => {
      if (h !== null && h !== undefined) {
        const key = String(h).trim();
        const val = rowData[idx] !== undefined ? rowData[idx] : null;
        obj[key] = val;
        if (val !== null && val !== undefined && val !== '') hasData = true;
      }
    });
    if (hasData) rows.push(obj);
  }
  return rows;
}

async function main() {
  console.log('=== RESINCRONIZACIÓN CON PRIORIDADES CORRECTAS ===\n');

  const conn = await mysql2.createConnection(process.env.DATABASE_URL);

  const accessToken = await getAccessToken(conn);
  const fileBuffer = await downloadFile(accessToken);
  writeFileSync(LOCAL_FILE, fileBuffer);

  const xlsx = await import('xlsx');
  const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
  workbook._xlsx = xlsx;

  // Parse órdenes
  const pendRows = sheetToRows(workbook, 'DATA PENDIENTES', 2);
  console.log(`Órdenes parseadas: ${pendRows.length}`);

  // Verificar prioridades antes de guardar
  const prioridades = {};
  pendRows.forEach(r => {
    const p = safeStr(r['PRIORIDAD']) || 'NULL';
    prioridades[p] = (prioridades[p] || 0) + 1;
  });
  console.log('Prioridades en Excel:', prioridades);

  // Limpiar y re-insertar órdenes
  await conn.execute('DELETE FROM purchase_orders');
  console.log('Tabla purchase_orders limpiada');

  let inserted = 0;
  const BATCH = 50;
  for (let i = 0; i < pendRows.length; i += BATCH) {
    const batch = pendRows.slice(i, i + BATCH);
    for (const row of batch) {
      const oc = safeStr(row['ORDEN COMPRA']);
      if (!oc) continue;
      const prioridad = (safeStr(row['PRIORIDAD']) || '').toUpperCase().trim() || null;
      const estado = (safeStr(row['ESTADO']) || '').toUpperCase().trim() || null;
      await conn.execute(
        `INSERT INTO purchase_orders
          (ordenCompra, descripcion, qtyOrdenada, um, qtyRecibida, qtyPendiente,
           costoUnitario, proveedor, parteFabricante, comprador, mainsaver,
           fechaPromesa, fechaRequerida, valorImpuesto, valorPendiente,
           diasRetraso, estado, cumplimiento, prioridad)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          oc,
          safeStr(row['DESCRIPCION']),
          safeFloat(row['QTY ORDENADA']),
          safeStr(row['UM']),
          safeFloat(row['QTY RECIBIDA']),
          safeFloat(row['QTY PENDIENTE']),
          safeFloat(row['COSTO UNIT.']),
          safeStr(row['PROVEEDOR']),
          safeStr(row['PARTE FABRICANTE']),
          safeStr(row['COMPRADOR']),
          safeStr(row['MAINSAVER']),
          safeDate(row['FECHA PROMESA']),
          safeDate(row['FECHA REQUERIDA']),
          safeFloat(row['VALOR IMPUESTO']),
          safeFloat(row['VALOR PENDIENTE']),
          Math.round(safeFloat(row['DIAS RETRASO'])),
          estado,
          safeFloat(row['CUMPLIMIENTO']),
          prioridad,
        ]
      );
      inserted++;
    }
  }
  console.log(`Órdenes insertadas: ${inserted}`);

  // Verificar resultado
  const [result] = await conn.execute(
    'SELECT prioridad, COUNT(*) as cnt FROM purchase_orders GROUP BY prioridad ORDER BY cnt DESC'
  );
  console.log('\nPRIORIDADES EN BD DESPUÉS DE RESYNC:');
  result.forEach(r => console.log(`  "${r.prioridad}": ${r.cnt}`));

  const [estados] = await conn.execute(
    'SELECT estado, COUNT(*) as cnt FROM purchase_orders GROUP BY estado ORDER BY cnt DESC'
  );
  console.log('\nESTADOS EN BD DESPUÉS DE RESYNC:');
  estados.forEach(r => console.log(`  "${r.estado}": ${r.cnt}`));

  // Contar referencias stock=0 con OC activa
  const [cruce] = await conn.execute(`
    SELECT COUNT(DISTINCT i.id) as cnt
    FROM inventory_items i
    INNER JOIN purchase_orders p ON UPPER(TRIM(i.descripcion)) = UPPER(TRIM(p.descripcion))
    WHERE i.stockActual = 0 AND p.estado IN ('PENDIENTE', 'CASI COMPLETO')
  `);
  console.log(`\nReferencias stock=0 con OC activa: ${cruce[0].cnt}`);

  // Verificar urgentes
  const [urgentes] = await conn.execute(
    "SELECT COUNT(*) as cnt FROM purchase_orders WHERE prioridad IN ('CRITICO', 'REORDEN INMEDIATO')"
  );
  console.log(`Órdenes CRITICO + REORDEN INMEDIATO: ${urgentes[0].cnt}`);

  await conn.execute(
    "INSERT INTO sync_logs (syncType, status, ordersProcessed) VALUES ('resync_prioridades', 'success', ?)",
    [inserted]
  );

  await conn.end();
  console.log('\n=== RESINCRONIZACIÓN COMPLETADA ===');
}

main().catch(e => {
  console.error('FATAL:', e.message);
  process.exit(1);
});
