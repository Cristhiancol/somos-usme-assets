import { exec } from "child_process";
import { promisify } from "util";
import { existsSync, mkdirSync, readFileSync, readdirSync } from "fs";
import * as XLSX from "xlsx";
import { bulkUpsertInventory, bulkUpsertOrders, bulkUpsertSuppliers, logSync } from "./db";

const execAsync = promisify(exec);

const RCLONE_CONFIG = "/home/ubuntu/.gdrive-rclone.ini";
const DRIVE_FILE = "DASBOARD SOMOS U - GESTOR 1.xlsx";
const LOCAL_DIR = "/home/ubuntu/gdrive-sync-temp";

function safeFloat(val: any, def = 0): number {
  if (val == null || val === "" || val === undefined) return def;
  const n = Number(val);
  return isNaN(n) ? def : n;
}

function safeStr(val: any, def: string | null = null): string | null {
  if (val == null || val === "" || val === undefined) return def;
  const s = String(val).trim();
  return s || def;
}

function safeDate(val: any): string | null {
  if (val == null || val === "" || val === undefined) return null;
  try {
    if (typeof val === "number") {
      // Excel serial date
      const d = XLSX.SSF.parse_date_code(val);
      if (d) {
        const dt = new Date(d.y, d.m - 1, d.d, d.H || 0, d.M || 0, d.S || 0);
        return dt.toISOString().slice(0, 19).replace("T", " ");
      }
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 19).replace("T", " ");
  } catch {
    return null;
  }
}

function sheetToRows(wb: XLSX.WorkBook, sheetName: string, headerRow = 2): Record<string, any>[] {
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
  if (raw.length <= headerRow || headerRow < 0) return [];
  const headerArr = raw[headerRow];
  if (!headerArr || !Array.isArray(headerArr)) return [];
  const headers = headerArr.map((h: any) => (h ? String(h).trim() : ""));
  const rows: Record<string, any>[] = [];
  for (let i = headerRow + 1; i < raw.length; i++) {
    const rawRow = raw[i];
    if (!rawRow || !Array.isArray(rawRow)) continue;
    const row: Record<string, any> = {};
    for (let j = 0; j < headers.length; j++) {
      if (headers[j]) row[headers[j]] = rawRow[j] ?? null;
    }
    rows.push(row);
  }
  return rows;
}

export async function syncFromGoogleDrive(): Promise<{ success: boolean; message: string; stats?: any }> {
  try {
    if (!existsSync(LOCAL_DIR)) mkdirSync(LOCAL_DIR, { recursive: true });

    // Download file from Google Drive using rclone
    console.log("[Sync] Downloading from Google Drive...");
    await execAsync(
      `rclone copy "manus_google_drive:${DRIVE_FILE}" "${LOCAL_DIR}/" --config "${RCLONE_CONFIG}" -v 2>&1`
    );

    // Find downloaded xlsx
    const files = readdirSync(LOCAL_DIR).filter(f => f.endsWith(".xlsx"));
    if (files.length === 0) throw new Error("No xlsx file found after download");
    const downloadedFile = `${LOCAL_DIR}/${files[0]}`;

    // Parse Excel using xlsx (pure JS, no Python dependency)
    console.log("[Sync] Parsing Excel data with xlsx...");
    const buf = readFileSync(downloadedFile);
    const wb = XLSX.read(buf, { type: "buffer", cellDates: true });

    // Parse CONTROL INVENTARIO
    const ctrlRows = sheetToRows(wb, "CONTROL INVENTARIO", 2);
    // Parse DATA for lookup
    const dataRows = sheetToRows(wb, "DATA", 2);
    const dataLookup: Record<string, Record<string, any>> = {};
    for (const row of dataRows) {
      const ref = safeStr(row["REFERENCIA"]);
      if (ref) dataLookup[ref] = row;
    }

    const inventory = [];
    for (const row of ctrlRows) {
      const ref = safeStr(row["REFERENCIA"]);
      if (!ref) continue;
      const dr = dataLookup[ref] || {};
      inventory.push({
        referencia: ref,
        descripcion: safeStr(row["DESCRIPCION"]),
        parteFabricante: safeStr(row["FABRICANTES"]),
        stockActual: safeFloat(row["STOCK ACTUAL"]),
        costoUnitario: safeFloat(row["COSTO UNIT."]),
        totalStock: safeFloat(row["VALOR INVENTARIO"]),
        cuenta: safeStr(row["CUENTA"]),
        puntoPedido: safeFloat(dr["PUNTO PEDIDO"]),
        minimo: safeFloat(dr["MINIMO"]),
        maximo: safeFloat(dr["MAXIMO"]),
        umEmision: safeStr(row["UM"]),
        claseAbc: safeStr(row["CLASE ABC"]),
        usoAnno: safeFloat(dr["USO ANNO"]),
        usoAnnoAnt: safeFloat(dr["USO ANNO ANT."]),
        leadTimeProm: safeFloat(dr["LEAD TIME PROM."]),
        rotacionAnno: safeFloat(dr["ROTACION ANNO"]),
        rotacionAnt: safeFloat(dr["ROTACION ANT."]),
        quiebresAnno: safeFloat(dr["QUIEBRES ANNO"]),
        quiebresAnt: safeFloat(dr["QUIEBRES ANT."]),
        costoPromedio: safeFloat(dr["COSTO PROM."]),
        ultimoCosto: safeFloat(dr["ULTIMO COSTO"]),
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
    const pendRows = sheetToRows(wb, "DATA PENDIENTES", 2);
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

    // Parse PROVEEDORES - has header row at index 0
    const provWs = wb.Sheets["PROVEEDORES"];
    const provRaw: any[][] = provWs ? XLSX.utils.sheet_to_json(provWs, { header: 1, defval: null }) : [];
    const suppliers_list: { nit: string; nombre: string | null; tipoImpuesto: string | null }[] = [];
    const seenNits = new Set<string>();
    // Skip header row (index 0), start from index 1
    for (let i = 1; i < provRaw.length; i++) {
      const row = provRaw[i];
      if (!row || !Array.isArray(row)) continue;
      const nit = safeStr(row[0]);
      if (!nit || seenNits.has(nit)) continue;
      // Only include numeric NITs
      if (!/^\d+/.test(nit)) continue;
      seenNits.add(nit);
      suppliers_list.push({
        nit,
        nombre: safeStr(row[1]),
        tipoImpuesto: safeStr(row[2]),
      });
    }

    console.log(`[Sync] Parsed: ${inventory.length} inventory, ${orders.length} orders, ${suppliers_list.length} suppliers`);

    // Upsert to database
    const itemsCount = await bulkUpsertInventory(inventory);
    const ordersCount = await bulkUpsertOrders(orders);
    const suppliersCount = await bulkUpsertSuppliers(suppliers_list);

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
