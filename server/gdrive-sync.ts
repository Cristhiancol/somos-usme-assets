import { exec } from "child_process";
import { promisify } from "util";
import { readFileSync, existsSync, mkdirSync } from "fs";
import { bulkUpsertInventory, bulkUpsertOrders, bulkUpsertSuppliers, logSync } from "./db";

const execAsync = promisify(exec);

const RCLONE_CONFIG = "/home/ubuntu/.gdrive-rclone.ini";
const DRIVE_FILE = "DASBOARD SOMOS U - GESTOR 1.xlsx";
const LOCAL_DIR = "/home/ubuntu/gdrive-sync-temp";
const LOCAL_FILE = `${LOCAL_DIR}/drive_file.xlsx`;

export async function syncFromGoogleDrive(): Promise<{ success: boolean; message: string; stats?: any }> {
  try {
    // Ensure temp dir exists
    if (!existsSync(LOCAL_DIR)) mkdirSync(LOCAL_DIR, { recursive: true });

    // Download file from Google Drive using rclone
    console.log("[Sync] Downloading from Google Drive...");
    const { stdout, stderr } = await execAsync(
      `rclone copy "manus_google_drive:${DRIVE_FILE}" "${LOCAL_DIR}/" --config "${RCLONE_CONFIG}" -v 2>&1`
    );

    // Rename to consistent name
    const { stdout: lsOut } = await execAsync(`ls "${LOCAL_DIR}/"`)
    const files = lsOut.trim().split('\n').filter(f => f.endsWith('.xlsx'));
    if (files.length === 0) {
      throw new Error("No xlsx file found after download");
    }

    const downloadedFile = `${LOCAL_DIR}/${files[0]}`;

    // Parse Excel using Python (most reliable for complex xlsx)
    console.log("[Sync] Parsing Excel data...");
    const parseScript = `
import pandas as pd
import json
import math
import sys

def safe_float(val, default=0):
    if val is None or (isinstance(val, float) and math.isnan(val)):
        return default
    try:
        return float(val)
    except:
        return default

def safe_str(val, default=None):
    if val is None or (isinstance(val, float) and math.isnan(val)):
        return default
    return str(val).strip() if str(val).strip() else default

def safe_date(val):
    if val is None or (isinstance(val, float) and math.isnan(val)):
        return None
    try:
        ts = pd.Timestamp(val)
        if pd.isna(ts):
            return None
        return ts.strftime('%Y-%m-%d %H:%M:%S')
    except:
        return None

xlsx = pd.ExcelFile('${downloadedFile.replace(/'/g, "\\'")}')

df_ctrl = pd.read_excel(xlsx, 'CONTROL INVENTARIO', header=2)
df_data = pd.read_excel(xlsx, 'DATA', header=2)

data_lookup = {}
for _, row in df_data.iterrows():
    ref = safe_str(row.get('REFERENCIA'))
    if ref:
        data_lookup[ref] = row

inventory = []
for _, row in df_ctrl.iterrows():
    ref = safe_str(row.get('REFERENCIA'))
    if not ref:
        continue
    data_row = data_lookup.get(ref, {})
    item = {
        "referencia": ref,
        "descripcion": safe_str(row.get('DESCRIPCION')),
        "parteFabricante": safe_str(row.get('FABRICANTES')),
        "stockActual": safe_float(row.get('STOCK ACTUAL')),
        "costoUnitario": safe_float(row.get('COSTO UNIT.')),
        "totalStock": safe_float(row.get('VALOR INVENTARIO')),
        "cuenta": safe_str(row.get('CUENTA')),
        "puntoPedido": safe_float(data_row.get('PUNTO PEDIDO') if isinstance(data_row, pd.Series) else 0),
        "minimo": safe_float(data_row.get('MINIMO') if isinstance(data_row, pd.Series) else 0),
        "maximo": safe_float(data_row.get('MAXIMO') if isinstance(data_row, pd.Series) else 0),
        "umEmision": safe_str(row.get('UM')),
        "claseAbc": safe_str(row.get('CLASE ABC')),
        "usoAnno": safe_float(data_row.get('USO ANNO') if isinstance(data_row, pd.Series) else 0),
        "usoAnnoAnt": safe_float(data_row.get('USO ANNO ANT.') if isinstance(data_row, pd.Series) else 0),
        "leadTimeProm": safe_float(data_row.get('LEAD TIME PROM.') if isinstance(data_row, pd.Series) else 0),
        "rotacionAnno": safe_float(data_row.get('ROTACION ANNO') if isinstance(data_row, pd.Series) else 0),
        "rotacionAnt": safe_float(data_row.get('ROTACION ANT.') if isinstance(data_row, pd.Series) else 0),
        "quiebresAnno": safe_float(data_row.get('QUIEBRES ANNO') if isinstance(data_row, pd.Series) else 0),
        "quiebresAnt": safe_float(data_row.get('QUIEBRES ANT.') if isinstance(data_row, pd.Series) else 0),
        "costoPromedio": safe_float(data_row.get('COSTO PROM.') if isinstance(data_row, pd.Series) else 0),
        "ultimoCosto": safe_float(data_row.get('ULTIMO COSTO') if isinstance(data_row, pd.Series) else 0),
        "nitProveedor": safe_str(row.get('NIT PROVEEDOR')),
        "bodega": safe_str(row.get('BODEGA')),
        "proveedor": safe_str(row.get('PROVEEDOR')),
        "consumoAnual": safe_float(row.get('CONSUMO ANUAL')),
        "consumoDiario": safe_float(row.get('CONSUMO DIARIO')),
        "leadTimeDias": safe_float(row.get('LEAD TIME (dias)')),
        "stockSeguridad": safe_float(row.get('STOCK SEGURIDAD')),
        "puntoReorden": safe_float(row.get('PUNTO REORDEN')),
        "inventarioDias": safe_float(row.get('INVENTARIO (dias)')),
        "estado": safe_str(row.get('ESTADO')),
        "accionRequerida": safe_str(row.get('ACCION REQUERIDA')),
        "cantidadAPedir": safe_float(row.get('CANTIDAD A PEDIR')),
        "valorAPedir": safe_float(row.get('VALOR A PEDIR')),
        "prioridad": safe_str(row.get('PRIORIDAD')),
    }
    inventory.append(item)

df_pend = pd.read_excel(xlsx, 'DATA PENDIENTES', header=2)
orders = []
for _, row in df_pend.iterrows():
    oc = safe_str(row.get('ORDEN COMPRA'))
    if not oc:
        continue
    orders.append({
        "ordenCompra": oc,
        "descripcion": safe_str(row.get('DESCRIPCION')),
        "qtyOrdenada": safe_float(row.get('QTY ORDENADA')),
        "um": safe_str(row.get('UM')),
        "qtyRecibida": safe_float(row.get('QTY RECIBIDA')),
        "qtyPendiente": safe_float(row.get('QTY PENDIENTE')),
        "costoUnitario": safe_float(row.get('COSTO UNIT.')),
        "proveedor": safe_str(row.get('PROVEEDOR')),
        "parteFabricante": safe_str(row.get('PARTE FABRICANTE')),
        "comprador": safe_str(row.get('COMPRADOR')),
        "mainsaver": safe_str(row.get('MAINSAVER')),
        "fechaPromesa": safe_date(row.get('FECHA PROMESA')),
        "fechaRequerida": safe_date(row.get('FECHA REQUERIDA')),
        "valorImpuesto": safe_float(row.get('VALOR IMPUESTO')),
        "valorPendiente": safe_float(row.get('VALOR PENDIENTE')),
        "diasRetraso": int(safe_float(row.get('DIAS RETRASO'))),
        "estado": safe_str(row.get('ESTADO')),
        "cumplimiento": safe_float(row.get('CUMPLIMIENTO')),
        "prioridad": safe_str(row.get('PRIORIDAD')),
    })

df_prov = pd.read_excel(xlsx, 'PROVEEDORES', header=None)
suppliers_list = []
seen_nits = set()
for _, row in df_prov.iterrows():
    nit = safe_str(row.iloc[0])
    if not nit or nit in seen_nits:
        continue
    try:
        int(nit)
    except:
        continue
    seen_nits.add(nit)
    suppliers_list.append({
        "nit": nit,
        "nombre": safe_str(row.iloc[1]),
        "tipoImpuesto": safe_str(row.iloc[2]),
    })

result = {"inventory": inventory, "orders": orders, "suppliers": suppliers_list}
print(json.dumps(result, ensure_ascii=False, default=str))
`;

    // Write parse script to temp
    const scriptPath = `${LOCAL_DIR}/parse_excel.py`;
    const { writeFileSync } = await import("fs");
    writeFileSync(scriptPath, parseScript);

    const { stdout: jsonOut } = await execAsync(`python3 "${scriptPath}"`, { maxBuffer: 50 * 1024 * 1024 });
    const parsed = JSON.parse(jsonOut);

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
