import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { bulkUpsertInventory, bulkUpsertOrders, bulkUpsertSuppliers, bulkUpsertConsumo, bulkUpsertFacturacionOC, bulkUpsertFacturacionOCS, bulkUpsertInformeMensual, logSync, updateSyncLog } from "./db";
import { getValidAccessToken } from "./gdrive-oauth";
import { serverLogger } from "./logger";
import { startSyncMonitoring, recordSyncCompletion } from "./monitoring";
import { notificarSincronizacion, notificarStockCero, isZapierConfigured } from "./zapier";

const LOCAL_DIR = "/tmp/gdrive-sync-temp";
const LOCAL_FILE = `${LOCAL_DIR}/drive_file.xlsx`;
const DATA_FILE = "/home/ubuntu/somos-usme-assets/data/DASBOARD_SOMOS_U_GESTOR_1.xlsx";
// CDN URL for production (fallback only — static snapshot)
const CDN_FILE_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310519663355008483/Cn82Y4DQbN9nyZtZuLDx26/DASBOARD_SOMOS_U_GESTOR_1_a015c179.xlsx";
// Google Drive file ID (direct — no search needed)
const DRIVE_FILE_ID = "1sMQ-SsIfguGHGWnhm7IkHFIrBxjC3YZ8";
// Google Sheets — Facturación pendiente por pagar (segundo Drive)
const DRIVE_FACTURACION_ID = "18FXUJRjG79rFAqc2EDY-bnlFk5aHov4UjVPywnNDbL8";

/**
 * Get file data: Google Drive OAuth (primary) > local file (dev) > CDN (fallback)
 */
async function getFileData(): Promise<Buffer> {
  // 1. Try Google Drive with OAuth token (primary source — always up to date)
  try {
    const accessToken = await getValidAccessToken();
    if (accessToken) {
      serverLogger.log("[Sync] Downloading from Google Drive (OAuth)...");
      // Export as xlsx from Google Sheets
      const exportUrl = `https://www.googleapis.com/drive/v3/files/${DRIVE_FILE_ID}/export?mimeType=application%2Fvnd.openxmlformats-officedocument.spreadsheetml.sheet`;
      const exportRes = await fetch(exportUrl, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (exportRes.ok) {
        const arrayBuffer = await exportRes.arrayBuffer();
        const buf = Buffer.from(arrayBuffer);
        serverLogger.log(`[Sync] Google Drive export OK: ${(buf.length / 1024 / 1024).toFixed(2)} MB`);
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
        serverLogger.log(`[Sync] Google Drive direct download OK: ${(buf.length / 1024 / 1024).toFixed(2)} MB`);
        return buf;
      }
      serverLogger.warn(`[Sync] Google Drive returned ${exportRes.status}, trying local file...`);
    } else {
      serverLogger.warn("[Sync] No Google Drive OAuth token available, trying local file...");
      // Si no hay token, lanzar error claro para que el usuario re-autorice
      // (solo si no hay fallback local disponible)
      if (!existsSync(DATA_FILE)) {
        throw new Error("TOKEN_REVOKED: El token de Google Drive ha expirado o fue revocado. Por favor, haz clic en 'Re-autorizar' en la p\u00e1gina de Sincronizaci\u00f3n para reconectar tu cuenta de Google.");
      }
    }
  } catch (e: any) {
    // Si es un error de token revocado, propagarlo directamente
    if (e?.message?.startsWith("TOKEN_REVOKED")) {
      throw e;
    }
    serverLogger.warn("[Sync] Google Drive fetch failed, trying local file...", e);
  }

  // 2. Try local file (development sandbox)
  if (existsSync(DATA_FILE)) {
    serverLogger.log("[Sync] Using local data file...");
    return readFileSync(DATA_FILE);
  }

  // 3. Fallback to CDN (static snapshot — may be outdated)
  try {
    serverLogger.log("[Sync] Downloading from CDN (static snapshot)...");
    const res = await fetch(CDN_FILE_URL);
    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuffer);
      serverLogger.log(`[Sync] CDN download OK: ${(buf.length / 1024 / 1024).toFixed(2)} MB`);
      return buf;
    }
    serverLogger.warn(`[Sync] CDN returned ${res.status}`);
  } catch (e) {
    serverLogger.warn("[Sync] CDN fetch failed", e);
  }

  throw new Error("No se encontró token de Google Drive. Autoriza el acceso en la página de Sincronización.");
}

/**
 * Get facturacion file data from Google Drive (second spreadsheet)
 */
async function getFacturacionFileData(): Promise<Buffer | null> {
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      serverLogger.warn("[Sync] No OAuth token for facturacion sheet, skipping...");
      return null;
    }
    serverLogger.log("[Sync] Downloading facturacion sheet from Google Drive...");
    const exportUrl = `https://www.googleapis.com/drive/v3/files/${DRIVE_FACTURACION_ID}/export?mimeType=application%2Fvnd.openxmlformats-officedocument.spreadsheetml.sheet`;
    const exportRes = await fetch(exportUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (exportRes.ok) {
      const arrayBuffer = await exportRes.arrayBuffer();
      const buf = Buffer.from(arrayBuffer);
      serverLogger.log(`[Sync] Facturacion export OK: ${(buf.length / 1024 / 1024).toFixed(2)} MB`);
      return buf;
    }
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${DRIVE_FACTURACION_ID}?alt=media`;
    const downloadRes = await fetch(downloadUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (downloadRes.ok) {
      const arrayBuffer = await downloadRes.arrayBuffer();
      const buf = Buffer.from(arrayBuffer);
      serverLogger.log(`[Sync] Facturacion direct download OK: ${(buf.length / 1024 / 1024).toFixed(2)} MB`);
      return buf;
    }
    serverLogger.warn(`[Sync] Facturacion download failed: ${exportRes.status}`);
    return null;
  } catch (e) {
    serverLogger.warn("[Sync] Error downloading facturacion sheet (non-fatal):", e);
    return null;
  }
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
      serverLogger.error("[Sync] Invalid GDRIVE_TOKEN in environment");
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
    // Handle Colombian/European number format: 1.234.567,89 → 1234567.89
    if (typeof val === "string") {
      // Remove thousand separators (dots) and replace decimal comma with dot
      const cleaned = val.replace(/\./g, "").replace(",", ".");
      const n = Number(cleaned);
      return isNaN(n) ? def : n;
    }
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
      descripcion: safeStr(row["DESCRIPCION"]) || "",
      qtyOrdenada: safeFloat(row["QTY ORDENADA"]),
      um: safeStr(row["UM"]),
      qtyRecibida: safeFloat(row["QTY RECIBIDA"]),
      qtyPendiente: safeFloat(row["QTY PENDIENTE"]),
      costoUnitario: safeFloat(row["COSTO UNIT."]),
      proveedor: safeStr(row["PROVEEDOR"]),
      parteFabricante: safeStr(row["PARTE FABRICANTE"]),
      comprador: safeStr(row["COMPRADOR"]),
      mainsaver: safeStr(row["MAINSAVER"]) || "",
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

/**
 * Parse "Consumo general mensual" sheet
 * Pivots columns D+ (months like 2025-04, 2025-05...) into normalized rows
 */
async function parseConsumoSheet(filePath: string) {
  const { read, utils } = await import("xlsx");
  const fileData = readFileSync(filePath);
  const workbook = read(fileData, { type: "buffer" });

  const sheet = workbook.Sheets["Consumo general mensual"];
  if (!sheet) {
    serverLogger.warn("[Sync] Sheet 'Consumo general mensual' not found");
    return [];
  }

  const raw = utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];
  if (!raw || raw.length < 2) return [];

  // Row 0 = headers: [Referencia, Fabricante?, Descripcion, 2025-04, 2025-05, ...]
  const headers = raw[0] as any[];

  // Find month columns (match YYYY-MM pattern or serial date)
  const monthCols: { idx: number; mes: string }[] = [];
  for (let c = 0; c < headers.length; c++) {
    const h = headers[c];
    if (h === null || h === undefined) continue;
    const s = String(h).trim();
    // Match patterns like "2025-04", "2025-05"
    if (/^\d{4}-\d{2}$/.test(s)) {
      monthCols.push({ idx: c, mes: s });
    }
    // Also handle Excel serial dates that xlsx may convert
    else if (typeof h === 'number' && h > 40000 && h < 50000) {
      const epoch = new Date(1899, 11, 30);
      const d = new Date(epoch.getTime() + h * 86400000);
      const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthCols.push({ idx: c, mes });
    }
  }

  if (monthCols.length === 0) {
    serverLogger.warn("[Sync] No month columns found in Consumo sheet");
    return [];
  }

  serverLogger.log(`[Sync] Found ${monthCols.length} month columns: ${monthCols.map(m => m.mes).join(", ")}`);

  // Find column indices for Referencia (A=0), Fabricante (B=1), Descripcion (C=2)
  const result: { referencia: string; fabricante: string | null; descripcion: string | null; mes: string; cantidad: number }[] = [];

  for (let r = 1; r < raw.length; r++) {
    const row = raw[r];
    if (!row) continue;

    const ref = row[0];
    if (!ref) continue;
    const referencia = String(ref).trim();
    if (!referencia) continue;

    const fabricante = row[1] ? String(row[1]).trim() : null;
    const descripcion = row[2] ? String(row[2]).trim() : null;

    for (const mc of monthCols) {
      const val = row[mc.idx];
      const cantidad = (val !== null && val !== undefined && val !== "") ? Number(val) : 0;
      if (isNaN(cantidad)) continue;

      result.push({
        referencia,
        fabricante: fabricante || null,
        descripcion: descripcion || null,
        mes: mc.mes,
        cantidad,
      });
    }
  }

  serverLogger.log(`[Sync] Parsed ${result.length} consumption records`);
  return result;
}

/**
 * Parse Facturación sheets (DATOS_OC + DATOS_OCS) from the second spreadsheet
 */
async function parseFacturacionData(buffer: Buffer) {
  const { read, utils } = await import("xlsx");
  const workbook = read(buffer, { type: "buffer" });

  function safeFloatCOP(val: any, def = 0): number {
    if (val === null || val === undefined || val === "") return def;
    if (typeof val === "number") return isNaN(val) ? def : val;
    if (typeof val === "string") {
      let cleaned = val.replace(/[^0-9\.,-]/g, "");
      const lastDotIndex = cleaned.lastIndexOf(".");
      const lastCommaIndex = cleaned.lastIndexOf(",");
      const decimalSeparatorIndex = Math.max(lastDotIndex, lastCommaIndex);
      
      if (decimalSeparatorIndex !== -1) {
        if (cleaned.length - decimalSeparatorIndex <= 3) {
          const integerPart = cleaned.substring(0, decimalSeparatorIndex).replace(/[\.,]/g, "");
          const decimalPart = cleaned.substring(decimalSeparatorIndex + 1);
          const n = Number(integerPart + "." + decimalPart);
          return isNaN(n) ? def : n;
        }
      }
      const n = Number(cleaned.replace(/[\.,]/g, ""));
      return isNaN(n) ? def : n;
    }
    return def;
  }

  function safeStr(val: any): string | null {
    if (val === null || val === undefined || val === "") return null;
    return String(val).trim() || null;
  }

  // ── Parse DATOS_OC ──
  const ocSheet = workbook.Sheets["DATOS_OC"];
  const ocItems: any[] = [];
  if (ocSheet) {
    const raw = utils.sheet_to_json(ocSheet, { header: 1, defval: null }) as any[][];
    for (let r = 3; r < raw.length; r++) {
      const row = raw[r];
      if (!row) continue;
      const hasData = row.some((v: any) => v !== null && v !== undefined && v !== "");
      if (!hasData) continue;
      ocItems.push({
        fechaEntrega: safeStr(row[0]),
        fechaOC: safeStr(row[1]),
        bodega: safeStr(row[2]),
        referencia: safeStr(row[3]),
        item: safeStr(row[4]),
        moneda: safeStr(row[5]),
        descItem: safeStr(row[6]),
        um: safeStr(row[7]),
        cantidad: safeFloatCOP(row[8]),
        precioUnit: safeFloatCOP(row[9]),
        valorImptos: safeFloatCOP(row[10]),
        valorSubtotal: safeFloatCOP(row[11]),
        valorNeto: safeFloatCOP(row[12]),
        documento: safeStr(row[13]),
        proveedor: safeStr(row[14]),
        doctoSolicitud: safeStr(row[15]),
        doctoOrden: safeStr(row[16]),
        referenciaOC: safeStr(row[17]),
        comprador: safeStr(row[18]),
        estado: safeStr(row[19]),
        fecha: safeStr(row[20]),
      });
    }
  }

  // ── Parse DATOS_OCS ──
  const ocsSheet = workbook.Sheets["DATOS_OCS"];
  const ocsItems: any[] = [];
  if (ocsSheet) {
    const raw = utils.sheet_to_json(ocsSheet, { header: 1, defval: null }) as any[][];
    for (let r = 3; r < raw.length; r++) {
      const row = raw[r];
      if (!row) continue;
      const hasData = row.some((v: any) => v !== null && v !== undefined && v !== "");
      if (!hasData) continue;
      ocsItems.push({
        referencia: safeStr(row[0]),
        notasDocto: safeStr(row[1]),
        co: safeStr(row[2]),
        nroDocto: safeStr(row[3]),
        fecha: safeStr(row[4]),
        estado: safeStr(row[5]),
        nroFactura: safeStr(row[6]),
        razonSocial: safeStr(row[7]),
        descServicio: safeStr(row[8]),
        moneda: safeStr(row[9]),
        valorBruto: safeFloatCOP(row[10]),
        valorDescuentos: safeFloatCOP(row[11]),
        subtotal: safeFloatCOP(row[12]),
        valorImpuestos: safeFloatCOP(row[13]),
        valorNeto: safeFloatCOP(row[14]),
      });
    }
  }

  serverLogger.log(`[Sync] Facturación parsed: ${ocItems.length} OC, ${ocsItems.length} OCS`);
  return { ocItems, ocsItems };
}

/**
 * Parse INFORME POR MES sheet with hyperlinks extraction
 * Extracts hyperlinks from "Paz y Salvo" cells using Google Sheets API
 */
async function parseInformeMensualData(buffer: Buffer): Promise<any[]> {
  const { read, utils } = await import("xlsx");
  const workbook = read(buffer, { type: "buffer" });

  function safeFloatCOP(val: any, def = 0): number {
    if (val === null || val === undefined || val === "") return def;
    if (typeof val === "number") return isNaN(val) ? def : val;
    if (typeof val === "string") {
      let cleaned = val.replace(/[^0-9\.,-]/g, "");
      const lastDotIndex = cleaned.lastIndexOf(".");
      const lastCommaIndex = cleaned.lastIndexOf(",");
      const decimalSeparatorIndex = Math.max(lastDotIndex, lastCommaIndex);
      
      if (decimalSeparatorIndex !== -1) {
        if (cleaned.length - decimalSeparatorIndex <= 3) {
          const integerPart = cleaned.substring(0, decimalSeparatorIndex).replace(/[\.,]/g, "");
          const decimalPart = cleaned.substring(decimalSeparatorIndex + 1);
          const n = Number(integerPart + "." + decimalPart);
          return isNaN(n) ? def : n;
        }
      }
      const n = Number(cleaned.replace(/[\.,]/g, ""));
      return isNaN(n) ? def : n;
    }
    return def;
  }

  function safeStr(val: any): string | null {
    if (val === null || val === undefined || val === "") return null;
    return String(val).trim() || null;
  }

  function safeInt(val: any, def = 0): number {
    if (val === null || val === undefined || val === "") return def;
    const n = Number(val);
    return isNaN(n) ? def : Math.floor(n);
  }

  const sheet = workbook.Sheets["INFORME POR MES"];
  const items: any[] = [];
  
  if (!sheet) {
    serverLogger.warn("[Sync] Sheet 'INFORME POR MES' not found");
    return [];
  }

  const raw = utils.sheet_to_json(sheet, { header: 1, defval: null }) as any[][];
  
  // Row 4 is header, data starts at row 5 (index 4)
  for (let r = 4; r < raw.length; r++) {
    const row = raw[r];
    if (!row) continue;
    
    const hasData = row.some((v: any) => v !== null && v !== undefined && v !== "");
    if (!hasData) continue;

    // Skip subtotal rows
    const proveedor = safeStr(row[3]);
    if (!proveedor || proveedor.toUpperCase().includes("SUBTOTAL")) continue;

    // Extract hyperlink from column J (index 9) using xlsx cell metadata
    // In xlsx, cell addresses are like J5, J6, etc. Row r=4 in raw array corresponds to spreadsheet row 5
    const cellAddress = utils.encode_cell({ r: r, c: 9 }); // column J = index 9
    const cell = sheet[cellAddress];
    const hyperlink = cell?.l?.Target || null;

    items.push({
      anno: safeInt(row[0]),
      mes: safeInt(row[1]),
      nombreMes: safeStr(row[2]),
      proveedor: proveedor,
      ocSinIVA: safeFloatCOP(row[4]),
      ocConIVA: safeFloatCOP(row[5]),
      ocsSinIVA: safeFloatCOP(row[6]),
      ocsConIVA: safeFloatCOP(row[7]),
      totalConIVA: safeFloatCOP(row[8]),
      observaciones: safeStr(row[9]),
      enlacePazSalvo: hyperlink,
      rowIndex: r,
    });
  }

  const linkCount = items.filter(i => i.enlacePazSalvo).length;
  serverLogger.log(`[Sync] Informe Mensual parsed: ${items.length} rows, ${linkCount} with PDF hyperlinks`);
  return items;
}

/**
 * Extract hyperlinks from INFORME POR MES using Google Sheets API
 */
async function extractInformeMensualHyperlinks(items: any[]): Promise<any[]> {
  try {
    const accessToken = await getValidAccessToken();
    if (!accessToken) {
      serverLogger.warn("[Sync] No OAuth token, skipping hyperlink extraction");
      return items;
    }

    // Get hyperlinks from column J (Observaciones) - column index 9
    const range = "'INFORME POR MES'!J5:J1000"; // Adjust range as needed
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${DRIVE_FACTURACION_ID}?ranges=${encodeURIComponent(range)}&fields=sheets(data(rowData(values(hyperlink,formattedValue))))`;
    
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      serverLogger.warn(`[Sync] Google Sheets API returned ${response.status}, skipping hyperlinks`);
      return items;
    }

    const data = await response.json();
    const rowData = data?.sheets?.[0]?.data?.[0]?.rowData || [];

    // Match hyperlinks with items
    let hyperlinkCount = 0;
    for (const item of items) {
      const rowDataIndex = item.rowIndex - 4; // Since range starts at J5 and row[4] in raw
      if (rowDataIndex >= 0 && rowDataIndex < rowData.length) {
        const cellData = rowData[rowDataIndex]?.values?.[0];
        if (cellData?.hyperlink) {
          item.enlacePazSalvo = cellData.hyperlink;
          hyperlinkCount++;
        }
      }
    }

    serverLogger.log(`[Sync] Extracted ${hyperlinkCount} hyperlinks from Informe Mensual`);
    return items;
  } catch (e) {
    serverLogger.warn("[Sync] Error extracting hyperlinks (non-fatal):", e);
    return items;
  }
}

export async function syncFromGoogleDrive(): Promise<{ success: boolean; message: string; stats?: any }> {
  // Insert 'running' record immediately so polling can detect it
  const syncId = await logSync({ syncType: "gdrive_import", status: "running" });
  startSyncMonitoring(String(syncId));
  try {
    // Ensure temp dir exists
    if (!existsSync(LOCAL_DIR)) mkdirSync(LOCAL_DIR, { recursive: true });

    // Get file data (local or Google Drive)
    const fileBuffer = await getFileData();
    writeFileSync(LOCAL_FILE, fileBuffer);
    serverLogger.log(`[Sync] Downloaded ${(fileBuffer.length / 1024 / 1024).toFixed(2)} MB`);

    // Parse Excel using xlsx (pure Node.js)
    serverLogger.log("[Sync] Parsing Excel data with xlsx...");
    const parsed = await parseExcelData(LOCAL_FILE);

    serverLogger.log(`[Sync] Parsed: ${parsed.inventory.length} inventory, ${parsed.orders.length} orders, ${parsed.suppliers.length} suppliers`);

    // Upsert to database — all 4 tables in parallel (independent, no deadlock risk)
    // Also parse consumo sheet concurrently with the first 3 upserts
    const [itemsCount, ordersCount, suppliersCount, consumoResult, facturacionResult] = await Promise.all([
      bulkUpsertInventory(parsed.inventory),
      bulkUpsertOrders(parsed.orders),
      bulkUpsertSuppliers(parsed.suppliers),
      // Parse + upsert consumo in one pipeline
      (async () => {
        try {
          const consumoData = await parseConsumoSheet(LOCAL_FILE);
          if (consumoData.length > 0) {
            const count = await bulkUpsertConsumo(consumoData);
            serverLogger.log(`[Sync] Consumo: ${count} registros`);
            return count;
          }
          return 0;
        } catch (e) {
          serverLogger.warn("[Sync] Error parsing consumption data (non-fatal):", e);
          return 0;
        }
      })(),
      // Download + parse + upsert facturacion (second Drive) in one pipeline
      (async () => {
        try {
          const facBuffer = await getFacturacionFileData();
          if (!facBuffer) return { ocCount: 0, ocsCount: 0, informeCount: 0 };
          
          const facData = await parseFacturacionData(facBuffer);
          
          // Parse informe mensual
          let informeMensualData = await parseInformeMensualData(facBuffer);
          // Extract hyperlinks from Google Sheets API
          informeMensualData = await extractInformeMensualHyperlinks(informeMensualData);
          
          const [ocCount, ocsCount, informeCount] = await Promise.all([
            facData.ocItems.length > 0 ? bulkUpsertFacturacionOC(facData.ocItems) : 0,
            facData.ocsItems.length > 0 ? bulkUpsertFacturacionOCS(facData.ocsItems) : 0,
            informeMensualData.length > 0 ? bulkUpsertInformeMensual(informeMensualData) : 0,
          ]);
          
          serverLogger.log(`[Sync] Facturación: ${ocCount} OC, ${ocsCount} OCS, ${informeCount} Informe Mensual`);
          return { ocCount, ocsCount, informeCount };
        } catch (e) {
          serverLogger.warn("[Sync] Error syncing facturacion (non-fatal):", e);
          return { ocCount: 0, ocsCount: 0, informeCount: 0 };
        }
      })(),
    ]);
    const consumoCount = consumoResult;
    const { ocCount: facOCCount, ocsCount: facOCSCount, informeCount } = facturacionResult;

    // Update sync log to 'success'
    if (syncId) {
      await updateSyncLog(syncId, {
        status: "success",
        itemsProcessed: itemsCount,
        ordersProcessed: ordersCount,
        suppliersProcessed: suppliersCount,
        completedAt: new Date(),
      });
    } else {
      await logSync({
        syncType: "gdrive_import",
        status: "success",
        itemsProcessed: itemsCount,
        ordersProcessed: ordersCount,
        suppliersProcessed: suppliersCount,
      });
    }

    recordSyncCompletion(String(syncId), {
      itemsProcessed: itemsCount,
      ordersProcessed: ordersCount,
      suppliersProcessed: suppliersCount,
      errorsCount: 0,
      status: 'success',
    });

    // ── Zapier: Detectar stock cero y notificar sincronización ──
    if (isZapierConfigured()) {
      try {
        // Detectar referencias con stock = 0 en los datos parseados
        const stockCeroItems = parsed.inventory.filter(i => i.stockActual === 0);
        const stockCeroCount = stockCeroItems.length;

        // Notificar cada referencia con stock cero (máximo 10 para no saturar WhatsApp)
        const topStockCero = stockCeroItems.slice(0, 10);
        for (const item of topStockCero) {
          notificarStockCero({
            referencia: item.referencia,
            descripcion: item.descripcion,
            proveedor: item.proveedor,
            parteFabricante: item.parteFabricante,
            costoUnitario: item.costoUnitario,
          });
        }

        // Notificar sincronización completada con resumen
        notificarSincronizacion({
          registrosActualizados: itemsCount,
          registrosNuevos: 0, // bulkUpsert no distingue nuevos vs actualizados
          ordenes: ordersCount,
          proveedores: suppliersCount,
          errores: 0,
          stockCeroDetectados: stockCeroCount,
        });

        serverLogger.log(`[Zapier] Notificaciones enviadas: ${stockCeroCount} stock cero, sync completada`);
      } catch (zapierError) {
        // Silencioso — Zapier nunca tumba la sincronización
        serverLogger.warn("[Zapier] Error en notificaciones post-sync (silenciado):", zapierError);
      }
    }

    serverLogger.log("[Sync] Complete!");
    return {
      success: true,
      message: `Sincronización exitosa: ${itemsCount} referencias, ${ordersCount} órdenes, ${suppliersCount} proveedores, ${consumoCount} consumos, ${facOCCount} fact. OC, ${facOCSCount} fact. OCS`,
      stats: { itemsCount, ordersCount, suppliersCount, consumoCount, facOCCount, facOCSCount },
    };
  } catch (error: any) {
    serverLogger.error("[Sync] Error:", error);
    if (syncId) {
      await updateSyncLog(syncId, { status: "error", errorMessage: error.message, completedAt: new Date() });
    } else {
      await logSync({ syncType: "gdrive_import", status: "error", errorMessage: error.message });
    }
    
    recordSyncCompletion(syncId ? syncId.toString() : "unknown", {
      itemsProcessed: 0,
      ordersProcessed: 0,
      suppliersProcessed: 0,
      errorsCount: 1,
      status: 'error',
    });

    return { success: false, message: error.message };
  }
}
