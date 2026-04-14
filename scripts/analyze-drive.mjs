import mysql2 from 'mysql2/promise';
import fs from 'fs';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';

const DRIVE_FILE_ID = '1sMQ-SsIfguGHGWnhm7IkHFIrBxjC3YZ8';
const OUTPUT_FILE = '/tmp/drive_analysis.xlsx';

async function main() {
  console.log('=== ANÁLISIS DRIVE: Referencias Stock=0 con OC Activa ===\n');

  const conn = await mysql2.createConnection(process.env.DATABASE_URL);

  // 1. Obtener token OAuth
  const [tokens] = await conn.execute(
    "SELECT accessToken, refreshToken, expiresAt FROM oauth_tokens WHERE provider = 'google_drive' LIMIT 1"
  );

  let accessToken = null;

  if (tokens.length > 0) {
    const tok = tokens[0];
    const isExpired = tok.expiresAt < Date.now();
    console.log('Token encontrado. Expirado:', isExpired);

    if (isExpired && tok.refreshToken) {
      console.log('Refrescando token...');
      const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;

      const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: tok.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      const refreshData = await refreshRes.json();

      if (refreshData.access_token) {
        accessToken = refreshData.access_token;
        const newExpiresAt = Date.now() + refreshData.expires_in * 1000;
        await conn.execute(
          "UPDATE oauth_tokens SET accessToken = ?, expiresAt = ? WHERE provider = 'google_drive'",
          [accessToken, newExpiresAt]
        );
        console.log('Token refrescado y guardado OK');
      } else {
        console.log('ERROR refrescando token:', JSON.stringify(refreshData));
      }
    } else if (!isExpired) {
      accessToken = tok.accessToken;
      console.log('Usando token vigente');
    }
  } else {
    console.log('No hay token OAuth en BD');
  }

  // 2. Descargar Excel
  let fileBuffer = null;

  if (accessToken) {
    console.log('\nDescargando Excel desde Google Drive (OAuth)...');
    const exportUrl = `https://www.googleapis.com/drive/v3/files/${DRIVE_FILE_ID}/export?mimeType=application%2Fvnd.openxmlformats-officedocument.spreadsheetml.sheet`;
    const exportRes = await fetch(exportUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (exportRes.ok) {
      fileBuffer = Buffer.from(await exportRes.arrayBuffer());
      console.log(`Export OK: ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    } else {
      console.log(`Export falló (${exportRes.status}), intentando descarga directa...`);
      const directRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${DRIVE_FILE_ID}?alt=media`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (directRes.ok) {
        fileBuffer = Buffer.from(await directRes.arrayBuffer());
        console.log(`Descarga directa OK: ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB`);
      } else {
        console.log(`Descarga directa falló (${directRes.status})`);
      }
    }
  }

  // 3. Fallback: archivo local
  const LOCAL_FILE = '/home/ubuntu/somos-usme-assets/data/DASBOARD_SOMOS_U_GESTOR_1.xlsx';
  if (!fileBuffer && existsSync(LOCAL_FILE)) {
    fileBuffer = readFileSync(LOCAL_FILE);
    console.log('Usando archivo local:', (fileBuffer.length / 1024 / 1024).toFixed(2), 'MB');
  }

  // 4. Fallback: CDN
  if (!fileBuffer) {
    const CDN_URL = 'https://d2xsxph8kpxj0f.cloudfront.net/310519663355008483/Cn82Y4DQbN9nyZtZuLDx26/DASBOARD_SOMOS_U_GESTOR_1_a015c179.xlsx';
    console.log('Descargando desde CDN (snapshot estático)...');
    const cdnRes = await fetch(CDN_URL);
    if (cdnRes.ok) {
      fileBuffer = Buffer.from(await cdnRes.arrayBuffer());
      console.log(`CDN OK: ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB`);
    }
  }

  if (!fileBuffer) {
    console.log('FATAL: No se pudo obtener el archivo Excel');
    await conn.end();
    return;
  }

  writeFileSync(OUTPUT_FILE, fileBuffer);
  console.log(`Archivo guardado en ${OUTPUT_FILE}`);

  // 5. Parsear Excel con xlsx
  console.log('\n=== PARSEANDO EXCEL ===');
  const xlsx = await import('xlsx');
  const workbook = xlsx.read(fileBuffer, { type: 'buffer' });

  console.log('Hojas disponibles:', workbook.SheetNames);

  function safeFloat(val, def = 0) {
    if (val === null || val === undefined || val === '') return def;
    const n = Number(val);
    return isNaN(n) ? def : n;
  }

  function safeStr(val) {
    if (val === null || val === undefined || val === '') return null;
    return String(val).trim() || null;
  }

  function sheetToRows(sheetName, headerRow = 2) {
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

  // 6. Leer CONTROL INVENTARIO
  const ctrlRows = sheetToRows('CONTROL INVENTARIO', 2);
  console.log(`\nCONTROL INVENTARIO: ${ctrlRows.length} filas`);

  // 7. Leer DATA PENDIENTES (órdenes de compra)
  const pendRows = sheetToRows('DATA PENDIENTES', 2);
  console.log(`DATA PENDIENTES: ${pendRows.length} filas`);

  // 8. Mostrar columnas disponibles en DATA PENDIENTES
  if (pendRows.length > 0) {
    console.log('\nColumnas DATA PENDIENTES:', Object.keys(pendRows[0]).join(' | '));
    console.log('Ejemplo fila 1:', JSON.stringify(pendRows[0], null, 2).substring(0, 500));
  }

  // 9. Mostrar columnas disponibles en CONTROL INVENTARIO
  if (ctrlRows.length > 0) {
    console.log('\nColumnas CONTROL INVENTARIO:', Object.keys(ctrlRows[0]).join(' | '));
  }

  // 10. Identificar referencias con stock=0
  const zeroStockRefs = ctrlRows.filter(r => {
    const stock = safeFloat(r['STOCK ACTUAL']);
    return stock === 0;
  });
  console.log(`\nReferencias con STOCK ACTUAL = 0: ${zeroStockRefs.length}`);

  // 11. Identificar estados distintos en DATA PENDIENTES
  const estadosOC = {};
  pendRows.forEach(r => {
    const est = safeStr(r['ESTADO']) || 'NULL';
    estadosOC[est] = (estadosOC[est] || 0) + 1;
  });
  console.log('\nEstados en DATA PENDIENTES (Drive):');
  Object.entries(estadosOC).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  "${k}": ${v}`);
  });

  // 12. Prioridades en DATA PENDIENTES
  const prioridadesOC = {};
  pendRows.forEach(r => {
    const p = safeStr(r['PRIORIDAD']) || 'NULL';
    prioridadesOC[p] = (prioridadesOC[p] || 0) + 1;
  });
  console.log('\nPrioridades en DATA PENDIENTES (Drive):');
  Object.entries(prioridadesOC).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  "${k}": ${v}`);
  });

  // 13. Cruzar: referencias con stock=0 que tienen OC en DATA PENDIENTES
  // Buscar por descripción o referencia
  const zeroStockDescriptions = new Set(
    zeroStockRefs.map(r => safeStr(r['DESCRIPCION'])?.toUpperCase()).filter(Boolean)
  );
  const zeroStockReferencias = new Set(
    zeroStockRefs.map(r => safeStr(r['REFERENCIA'])?.toUpperCase()).filter(Boolean)
  );

  const ocConStockCero = pendRows.filter(r => {
    const desc = safeStr(r['DESCRIPCION'])?.toUpperCase() || '';
    // Buscar si la descripción de la OC coincide con alguna referencia en stock 0
    return zeroStockDescriptions.has(desc);
  });

  console.log(`\nOC en DATA PENDIENTES cuya descripción coincide con ref stock=0: ${ocConStockCero.length}`);

  // 14. Mostrar primeros 10 casos
  if (ocConStockCero.length > 0) {
    console.log('\nPrimeros 10 casos (OC con stock=0):');
    ocConStockCero.slice(0, 10).forEach((oc, i) => {
      console.log(`  [${i+1}] OC: ${oc['ORDEN COMPRA']} | Desc: ${String(oc['DESCRIPCION']).substring(0, 40)} | Estado: ${oc['ESTADO']} | Prioridad: ${oc['PRIORIDAD']} | Proveedor: ${String(oc['PROVEEDOR'] || '').substring(0, 30)}`);
    });
  }

  // 15. Verificar qué estados tienen las OC de referencias con stock=0
  const estadosOcStockCero = {};
  ocConStockCero.forEach(r => {
    const est = safeStr(r['ESTADO']) || 'NULL';
    estadosOcStockCero[est] = (estadosOcStockCero[est] || 0) + 1;
  });
  console.log('\nEstados de OC para referencias con stock=0:');
  Object.entries(estadosOcStockCero).forEach(([k, v]) => {
    console.log(`  "${k}": ${v}`);
  });

  // 16. Verificar qué estados tiene el inventario (CONTROL INVENTARIO)
  const estadosInv = {};
  ctrlRows.forEach(r => {
    const est = safeStr(r['ESTADO']) || 'NULL';
    estadosInv[est] = (estadosInv[est] || 0) + 1;
  });
  console.log('\nEstados en CONTROL INVENTARIO (Drive):');
  Object.entries(estadosInv).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  "${k}": ${v}`);
  });

  // 17. Verificar PRIORIDAD en CONTROL INVENTARIO para stock=0
  const prioridadesStockCero = {};
  zeroStockRefs.forEach(r => {
    const p = safeStr(r['PRIORIDAD']) || 'NULL';
    prioridadesStockCero[p] = (prioridadesStockCero[p] || 0) + 1;
  });
  console.log('\nPrioridades en CONTROL INVENTARIO para stock=0:');
  Object.entries(prioridadesStockCero).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  "${k}": ${v}`);
  });

  // 18. Comparar con BD actual
  console.log('\n=== COMPARACIÓN CON BASE DE DATOS ===');
  const [bdOrders] = await conn.execute(
    'SELECT estado, prioridad, COUNT(*) as cnt FROM purchase_orders GROUP BY estado, prioridad ORDER BY cnt DESC'
  );
  console.log('Estados/Prioridades en BD (purchase_orders):');
  bdOrders.forEach(r => {
    console.log(`  Estado: "${r.estado}" | Prioridad: "${r.prioridad}" | Count: ${r.cnt}`);
  });

  // 19. Contar referencias stock=0 en BD con OC pendiente
  const [stockCeroConOC] = await conn.execute(`
    SELECT i.referencia, i.descripcion, i.stockActual, i.proveedor, i.estado as estadoInv,
           p.ordenCompra, p.estado as estadoOC, p.prioridad as prioridadOC, p.diasRetraso, p.proveedor as proveedorOC
    FROM inventory_items i
    INNER JOIN purchase_orders p ON (
      UPPER(TRIM(i.descripcion)) = UPPER(TRIM(p.descripcion))
    )
    WHERE i.stockActual = 0
    ORDER BY p.diasRetraso DESC
    LIMIT 30
  `);
  
  console.log(`\nReferencias stock=0 con OC asociada (por descripción): ${stockCeroConOC.length}`);
  if (stockCeroConOC.length > 0) {
    console.log('\nPrimeros 10:');
    stockCeroConOC.slice(0, 10).forEach((r, i) => {
      console.log(`  [${i+1}] REF: ${r.referencia} | Stock: ${r.stockActual} | EstadoInv: ${r.estadoInv} | OC: ${r.ordenCompra} | EstadoOC: ${r.estadoOC} | PrioridadOC: ${r.prioridadOC} | Retraso: ${r.diasRetraso}d`);
    });
  }

  // 20. Guardar resultado completo en JSON para análisis
  const resultado = {
    timestamp: new Date().toISOString(),
    driveStats: {
      totalInventario: ctrlRows.length,
      totalOrdenes: pendRows.length,
      stockCero: zeroStockRefs.length,
      ocConStockCero: ocConStockCero.length,
      estadosOC: estadosOC,
      estadosInventario: estadosInv,
    },
    bdStats: {
      ordenesBD: bdOrders,
    },
    casosStockCeroConOC: stockCeroConOC.slice(0, 50),
    primerosEjemplos: ocConStockCero.slice(0, 20).map(oc => ({
      ordenCompra: oc['ORDEN COMPRA'],
      descripcion: oc['DESCRIPCION'],
      estado: oc['ESTADO'],
      prioridad: oc['PRIORIDAD'],
      proveedor: oc['PROVEEDOR'],
      diasRetraso: oc['DIAS RETRASO'],
    })),
  };

  writeFileSync('/tmp/analisis-resultado.json', JSON.stringify(resultado, null, 2));
  console.log('\nResultado guardado en /tmp/analisis-resultado.json');

  await conn.end();
  console.log('\n=== ANÁLISIS COMPLETADO ===');
}

main().catch(e => {
  console.error('FATAL ERROR:', e.message, e.stack);
  process.exit(1);
});
