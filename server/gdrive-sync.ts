import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { bulkUpsertInventory, bulkUpsertOrders, bulkUpsertSuppliers, logSync } from "./db";

const LOCAL_DIR = "/tmp/gdrive-sync-temp";
const LOCAL_FILE = `${LOCAL_DIR}/drive_file.xlsx`;

// Google Drive file ID — we find it dynamically via search
const DRIVE_FILE_NAME = "DASBOARD SOMOS U - GESTOR 1.xlsx";

/**
 * Get rclone token from config file (available in sandbox and production)
 */
function getRcloneToken(): { access_token: string; token_type: string } | null {
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
 * Search for the file in Google Drive by name
 */
async function findFileInDrive(accessToken: string): Promise<string | null> {
  const query = encodeURIComponent(`name = '${DRIVE_FILE_NAME}' and trashed = false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Drive search failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

/**
 * Download file from Google Drive by file ID
 */
async function downloadFileFromDrive(accessToken: string, fileId: string): Promise<Buffer> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Drive download failed: ${res.status} ${await res.text()}`);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
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
      estado: safeStr(row["ESTADO"]),
      cumplimiento: safeFloat(row["CUMPLIMIENTO"]),
      prioridad: safeStr(row["PRIORIDAD"]),
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

    // Get access token from rclone config
    const token = getRcloneToken();
    if (!token) {
      throw new Error("No se encontró token de Google Drive. Verifica la configuración.");
    }

    console.log("[Sync] Searching for file in Google Drive...");
    const fileId = await findFileInDrive(token.access_token);
    if (!fileId) {
      throw new Error(`No se encontró el archivo '${DRIVE_FILE_NAME}' en Google Drive`);
    }

    console.log(`[Sync] Found file ID: ${fileId}. Downloading...`);
    const fileBuffer = await downloadFileFromDrive(token.access_token, fileId);
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
