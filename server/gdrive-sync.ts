import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { bulkUpsertInventory, bulkUpsertOrders, bulkUpsertSuppliers, logSync } from "./db";
import { getValidAccessToken } from "./gdrive-oauth";

const LOCAL_DIR = "/tmp/gdrive-sync-temp";
const LOCAL_FILE = `${LOCAL_DIR}/drive_file.xlsx`;
const DATA_FILE = "/home/ubuntu/somos-usme-assets/data/DASBOARD_SOMOS_U_GESTOR_1.xlsx";
// CDN URL for production (fallback only — static snapshot)
const CDN_FILE_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663355008483/Cn82Y4DQbN9nyZtZuLDx26/DASBOARD_SOMOS_U_GESTOR_1_a015c179.xlsx";
// Google Drive file ID (direct — no search needed)
const DRIVE_FILE_ID = "1sMQ-SsIfguGHGWnhm7IkHFIrBxjC3YZ8";

/**
 * Get file data: Google Drive OAuth (primary) > local file (dev) > CDN (fallback)
 */
async function getFileData(): Promise<Buffer> {
  // 1. Try Google Drive with OAuth token (primary source — always up to date)
  try {
    const accessToken = await getValidAccessToken();
    if (accessToken) {
      console.log("[Sync] Downloading from Google Drive (OAuth)...");
      // Export as xlsx from Google Sheets
      const exportUrl = `https://www.googleapis.com/drive/v3/files/${DRIVE_FILE_ID}/export?mimeType=application%2Fvnd.openxmlformats-officedocument.spreadsheetml.sheet`;
      const exportRes = await fetch(exportUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (exportRes.ok) {
        const arrayBuffer = await exportRes.arrayBuffer();
        const buf = Buffer.from(arrayBuffer);
        console.log(`[Sync] Google Drive export OK: ${(buf.length / 1024 / 1024).toFixed(2)} MB`);
        return buf;
      }
      // If export fails (e.g. it's already xlsx, not a Sheet), try direct download
      const downloadUrl = `https://www.googleapis.com/drive/v3/files/${DRIVE_FILE_ID}?alt=media`;
      const downloadRes = await fetch(downloadUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (downloadRes.ok) {
        const arrayBuffer = await downloadRes.arrayBuffer();
        const buf = Buffer.from(arrayBuffer);
        console.log(`[Sync] Google Drive direct download OK: ${(buf.length / 1024 / 1024).toFixed(2)} MB`);
        return buf;
      }
      console.warn(`[Sync] Google Drive returned ${exportRes.status}, trying local file...`);
    } else {
      console.warn("[Sync] No Google Drive OAuth token available, trying local file...");
    }
  } catch (e) {
    console.warn("[Sync] Google Drive fetch failed, trying local file...", e);
  }

  // 2. Try local file (development sandbox)
  if (existsSync(DATA_FILE)) {
    console.log("[Sync] Using local data file...");
    return readFileSync(DATA_FILE);
  }

  // 3. Fallback to CDN (static snapshot — may be outdated)
  try {
    console.log("[Sync] Downloading from CDN (static snapshot)...");
    const res = await fetch(CDN_FILE_URL);
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuffer);
      console.log(`[Sync] CDN download OK: ${(buf.length / 1024 / 1024).toFixed(2)} MB`);
      return buf;
    }
    console.warn(`[Sync] CDN returned ${res.status}`);
  } catch (e) {
    console.warn("[Sync] CDN fetch failed", e);
  }

  throw new Error("No se encontró token de Google Drive. Autoriza el acceso en la página de Sincronización.");
}

/**
 * Get Google Drive token from environment variable or config file
 * Priority: env var > config file
 */
function getRcloneToken(): { access_token: string; token_type: string } | null {
  // Try environment variable first (for production)
  const envToken = process.env.GDRIVE_TOKEN;
  if (envToken) {
    try {
      return JSON.parse(envToken);
    } catch {
      console.error("[Sync] Invalid GDRIVE_TOKEN in environment");
      return null;
    }
  }

  // Fallback to config file (for development)
  const configPath = "/home/ubuntu/.gdrive-rclone.ini";
  try {
    if (!existsSync(configPath)) return null;
    const config = readFileSync(configPath, "utf-8");
    const tokenMatch = config.match(/token\s*=\s*(.+)/);
    if (!tokenMatch) return null;
    return JSON.parse(tokenMatch[1]);
  } catch {
    return null;
  }
}

/**
 * Parse Excel using xlsx (pure Node.js, no Python dependency)
 */
async function parseExcelData(filePath: string) {
  // Dynamic import for ESM compatibility
  const { read, utils } = await import("xlsx");
  const fileData = readFileSync(filePath);
  const workbook = read(fileData, { type: "buffer" });

  // Helper functions
  function safeFloat(val: any, def = 0): number {
    if (val === null || val === undefined || val === "") return def;
    const n = Number(val);
    return isNaN(n) ? def : n;
  }

  function safeStr(val: any, def: string | null = null): string | null {
    if (val === null || val === undefined || val === "") return def;
    const s = String(val).trim();
    return s || def;
  }

  function safeDate(val: any): string | null {
    if (!val) return null;
    try {
      if (typeof val === "number") {
        // Excel serial date to JS Date
        const epoch = new Date(1899, 11, 30);
        const d = new Date(epoch.getTime() + val * 86400000);
        if (isNaN(d.getTime())) return null;
        return d.toISOString().replace("T", " ").substring(0, 19);
      }
      const d = new Date(val);
      if (isNaN(d.getTime())) return null;
      return d.toISOString().replace("T", " ").substring(0, 19);
    } catch {
      return null;
    }
  }

  function sheetToRows(sheetName: string, headerRow = 2): Record<string, any>[] {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) return [];
    const raw = utils.sheet_to_json(sheet, { header: 1, defval: null });
    if (!raw || raw.length <= headerRow) return [];
    const headers = (raw[headerRow] as any[]) || [];
    const rows: Record<string, any>[] = [];
    for (let i = headerRow + 1; i < raw.length; i++) {
      const rowData = raw[i] as any[];
      if (!rowData) continue;
      const obj: Record<string, any> = {};
      let hasData = false;
      headers.forEach((h: any, idx: number) => {
        if (h !== null && h !== undefined) {
          const key = String(h).trim();
          const val = rowData[idx] !== undefined ? rowData[idx] : null;
          obj[key] = val;
          if (val !== null && val !== undefined && val !== "") hasData = true;
        }
      });
      if (hasData) rows.push(obj);
    }
    return rows;
  }

  // Parse CONTROL INVENTARIO
  const ctrlRows = sheetToRows("CONTROL INVENTARIO", 2);

  // Parse DATA for lookup
  const dataRows = sheetToRows("DATA", 2);
  const dataLookup: Record<string, Record<string, any>> = {};
  for (const row of dataRows) {
    const ref = safeStr(row["REFERENCIA"]);
    if (ref) dataLookup[ref] = row;
  }

  // Build inventory
  const inventory = [];
  for (const row of ctrlRows) {
    const ref = safeStr(row["REFERENCIA"]);
    if (!ref) continue;
    const dataRow = dataLookup[ref] || {};
    inventory.push({
      referencia: ref,
      descripcion: safeStr(row["DESCRIPCION"]),
      parteFabricante: safeStr(row["FABRICANTES"]),
      stockActual: safeFloat(row["STOCK ACTUAL"]),
      costoUnitario: safeFloat(row["COSTO UNIT."]),
      totalStock: safeFloat(row["VALOR INVENTARIO"]),
      cuenta: safeStr(row["CUENTA"]),
      puntoPedido: safeFloat(dataRow["PUNTO PEDIDO"]),
      minimo: safeFloat(dataRow["MINIMO"]),
      maximo: safeFloat(dataRow["MAXIMO"]),
      umEmision: safeStr(row["UM"]),
      claseAbc: safeStr(row["CLASE ABC"]),
      usoAnno: safeFloat(dataRow["USO ANNO"]),
      usoAnnoAnt: safeFloat(dataRow["USO ANNO ANT."]),
      leadTimeProm: safeFloat(dataRow["LEAD TIME PROM."]),
      rotacionAnno: safeFloat(dataRow["ROTACION ANNO"]),
      rotacionAnt: safeFloat(dataRow["ROTACION ANT."]),
      quiebresAnno: safeFloat(dataRow["QUIEBRES ANNO"]),
      quiebresAnt: safeFloat(dataRow["QUIEBRES ANT."]),
      costoPromedio: safeFloat(dataRow["COSTO PROM."]),
      ultimoCosto: safeFloat(dataRow["ULTIMO COSTO"]),
      nitProveedor: safeStr(row["NIT PROVEEDOR"]),
      bodega: safeStr(row["BODEGA"]),
      proveedor: safeStr(row["PROVEEDOR"]),
      consumoAnual: safeFloat(row["CONSUMO ANUAL"]),
      consumoDiario: safeFloat(row["CONSUMO DIARIO"]),
      leadTimeDias: safeFloat(row["LEAD TIME (dias)"]),
      stockSeguridad: safeFloat(row["STOCK SEGURIDAD"]),
      puntoReorden: safeFloat(row["PUNTO REORDEN"]),
      inventarioDias: safeFloat(row["INVENTARIO (dias)"]),
      estado: safeStr(row["ESTADO"]),
      accionRequerida: safeStr(row["ACCION REQUERIDA"]),
      cantidadAPedir: safeFloat(row["CANTIDAD A PEDIR"]),
      valorAPedir: safeFloat(row["VALOR A PEDIR"]),
      prioridad: safeStr(row["PRIORIDAD"]),
    });
  }

  // Parse DATA PENDIENTES
  const pendRows = sheetToRows("DATA PENDIENTES", 2);
  const orders = [];
  for (const row of pendRows) {
    const oc = safeStr(row["ORDEN COMPRA"]);
    if (!oc) continue;
    orders.push({
      ordenCompra: oc,
      descripcion: safeStr(row["DESCRIPCION"]),
      qtyOrdenada: safeFloat(row["QTY ORDENADA"]),
      um: safeStr(row["UM"]),
      qtyRecibida: safeFloat(row["QTY RECIBIDA"]),
      qtyPendiente: safeFloat(row["QTY PENDIENTE"]),
      costoUnitario: safeFloat(row["COSTO UNIT."]),
      proveedor: safeStr(row["PROVEEDOR"]),
      parteFabricante: safeStr(row["PARTE FABRICANTE"]),
      comprador: safeStr(row["COMPRADOR"]),
      mainsaver: safeStr(row["MAINSAVER"]),
      fechaPromesa: safeDate(row["FECHA PROMESA"]),
      fechaRequerida: safeDate(row["FECHA REQUERIDA"]),
      valorImpuesto: safeFloat(row["VALOR IMPUESTO"]),
      valorPendiente: safeFloat(row["VALOR PENDIENTE"]),
      diasRetraso: Math.round(safeFloat(row["DIAS RETRASO"])),
      estado: (safeStr(row["ESTADO"]) || "").toUpperCase().trim() || null,
      cumplimiento: safeFloat(row["CUMPLIMIENTO"]),
      // Preservar prioridad original del Drive (REORDEN INMEDIATO, CRITICO, OPTIMO, PRECAUCION, EXCESO)
      prioridad: (safeStr(row["PRIORIDAD"]) || "").toUpperCase().trim() || null,
    });
  }

  // Parse PROVEEDORES (no header row)
  const provSheet = workbook.Sheets["PROVEEDORES"];
  const suppliers: { nit: string; nombre: string | null; tipoImpuesto: string | null }[] = [];
  if (provSheet) {
    const provRaw = utils.sheet_to_json(provSheet, { header: 1, defval: null });
    const seenNits = new Set<string>();
    for (const row of provRaw as any[][]) {
      if (!row) continue;
      const nit = safeStr(row[0]);
      if (!nit || seenNits.has(nit)) continue;
      // Check if it looks like a NIT (numeric)
      if (!/^\d+/.test(nit)) continue;
      seenNits.add(nit);
      suppliers.push({
        nit,
        nombre: safeStr(row[1]),
        tipoImpuesto: safeStr(row[2]),
      });
    }
  }

  return { inventory, orders, suppliers };
}

export async function syncFromGoogleDrive(): Promise<{ success: boolean; message: string; stats?: any }> {
  try {
    // Ensure temp dir exists
    if (!existsSync(LOCAL_DIR)) mkdirSync(LOCAL_DIR, { recursive: true });

    // Get file data (local or Google Drive)
    const fileBuffer = await getFileData();
    writeFileSync(LOCAL_FILE, fileBuffer);
    console.log(`[Sync] Downloaded ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    // Parse Excel using xlsx (pure Node.js)
    console.log("[Sync] Parsing Excel data with xlsx...");
    const parsed = await parseExcelData(LOCAL_FILE);

    console.log(`[Sync] Parsed: ${parsed.inventory.length} inventory, ${parsed.orders.length} orders, ${parsed.suppliers.length} suppliers`);

    // Upsert to database
    const itemsCount = await bulkUpsertInventory(parsed.inventory);
    const ordersCount = await bulkUpsertOrders(parsed.orders);
    const suppliersCount = await bulkUpsertSuppliers(parsed.suppliers);

    await logSync({
      syncType: "gdrive_import",
      status: "success",
      itemsProcessed: itemsCount,
      ordersProcessed: ordersCount,
      suppliersProcessed: suppliersCount,
    });

    console.log("[Sync] Complete!");
    return {
      success: true,
      message: `Sincronización exitosa: ${itemsCount} referencias, ${ordersCount} órdenes, ${suppliersCount} proveedores`,
      stats: { itemsCount, ordersCount, suppliersCount },
    };
  } catch (error: any) {
    console.error("[Sync] Error:", error);
    await logSync({
      syncType: "gdrive_import",
      status: "error",
      errorMessage: error.message,
    });
    return { success: false, message: error.message };
  }
}
