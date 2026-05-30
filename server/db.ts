import { eq, sql, desc, asc, like, and, or, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, inventoryItems, purchaseOrders, suppliers, syncLogs, consumoMensual, facturacionOC, facturacionOCS, informeMensualProveedor } from "../drizzle/schema";
import { ENV } from './_core/env';
import { serverLogger } from './logger';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      serverLogger.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { serverLogger.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; } else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { serverLogger.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(sql`LOWER(${users.email}) = LOWER(${email})`).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ── Dashboard KPIs ──
export async function getDashboardKPIs() {
  const db = await getDb();
  if (!db) return null;

  const [totalResult] = await db.select({
    totalRefs: sql<number>`COUNT(*)`,
    totalValue: sql<number>`COALESCE(ROUND(SUM(${inventoryItems.totalStock}), 2), 0)`,
    zeroStock: sql<number>`SUM(CASE WHEN ${inventoryItems.stockActual} = 0 THEN 1 ELSE 0 END)`,
    withStock: sql<number>`SUM(CASE WHEN ${inventoryItems.stockActual} > 0 THEN 1 ELSE 0 END)`,
    avgStock: sql<number>`COALESCE(AVG(CASE WHEN ${inventoryItems.stockActual} > 0 THEN ${inventoryItems.stockActual} END), 0)`,
    classA: sql<number>`SUM(CASE WHEN ${inventoryItems.claseAbc} = 'A' THEN 1 ELSE 0 END)`,
    classB: sql<number>`SUM(CASE WHEN ${inventoryItems.claseAbc} = 'B' THEN 1 ELSE 0 END)`,
    classC: sql<number>`SUM(CASE WHEN ${inventoryItems.claseAbc} = 'C' THEN 1 ELSE 0 END)`,
  }).from(inventoryItems);

  const [ordersResult] = await db.select({
    // Contar OC unicas (una OC puede tener multiples lineas/referencias)
    totalPending: sql<number>`COUNT(DISTINCT ${purchaseOrders.ordenCompra})`,
    totalPendingValue: sql<number>`COALESCE(SUM(${purchaseOrders.valorPendiente}), 0)`,
    // Urgentes: contar OC unicas con prioridad CRITICO o REORDEN INMEDIATO
    urgentOrders: sql<number>`COUNT(DISTINCT CASE WHEN ${purchaseOrders.prioridad} IN ('CRITICO','REORDEN INMEDIATO') THEN ${purchaseOrders.ordenCompra} END)`,
  }).from(purchaseOrders).where(
    or(eq(purchaseOrders.estado, 'PENDIENTE'), eq(purchaseOrders.estado, 'RECIBIDO PARCIAL'), eq(purchaseOrders.estado, 'VENCIDO'), eq(purchaseOrders.estado, 'CASI COMPLETO'))
  );

  // Contar referencias con stock=0 que tienen OC activa (SQL nativo para evitar alias conflict en Drizzle)
  const stockCeroConOCRows = await db.execute(sql`
    SELECT COUNT(DISTINCT inv.id) as stockCeroConOC
    FROM inventory_items inv
    INNER JOIN purchase_orders po
      ON UPPER(TRIM(inv.descripcion)) = UPPER(TRIM(po.descripcion))
    WHERE inv.stockActual = 0
      AND po.estado IN ('PENDIENTE', 'CASI COMPLETO')
  `);
  const stockCeroConOC = Number((stockCeroConOCRows as any[])[0]?.[0]?.stockCeroConOC ?? 0);

  return { ...totalResult, ...ordersResult, stockCeroConOC };
}

// ── JIT Alerts (Semaforo) ──
export async function getJITAlerts() {
  const db = await getDb();
  if (!db) return null;

  const [alerts] = await db.select({
    critico: sql<number>`SUM(CASE WHEN ${inventoryItems.stockActual} = 0 THEN 1 ELSE 0 END)`,
    reorden: sql<number>`SUM(CASE WHEN ${inventoryItems.estado} = 'REORDEN' OR ${inventoryItems.estado} = 'CRITICO' THEN 1 ELSE 0 END)`,
    precaucion: sql<number>`SUM(CASE WHEN ${inventoryItems.estado} = 'PRECAUCION' THEN 1 ELSE 0 END)`,
    optimo: sql<number>`SUM(CASE WHEN ${inventoryItems.estado} = 'OPTIMO' OR ${inventoryItems.estado} = 'EXCESO' THEN 1 ELSE 0 END)`,
  }).from(inventoryItems);

  return alerts;
}

// ── Value by Category ──
export async function getValueByCategory() {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    cuenta: inventoryItems.cuenta,
    totalValue: sql<number>`COALESCE(SUM(${inventoryItems.totalStock}), 0)`,
    itemCount: sql<number>`COUNT(*)`,
    zeroStock: sql<number>`SUM(CASE WHEN ${inventoryItems.stockActual} = 0 THEN 1 ELSE 0 END)`,
  }).from(inventoryItems)
    .groupBy(inventoryItems.cuenta)
    .orderBy(desc(sql`SUM(${inventoryItems.totalStock})`));
}

// ── TOP 20 Highest Value ──
export async function getTop20Value() {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    referencia: inventoryItems.referencia,
    descripcion: inventoryItems.descripcion,
    proveedor: inventoryItems.proveedor,
    stockActual: inventoryItems.stockActual,
    costoUnitario: inventoryItems.costoUnitario,
    totalStock: inventoryItems.totalStock,
    claseAbc: inventoryItems.claseAbc,
    cuenta: inventoryItems.cuenta,
  }).from(inventoryItems)
    .where(sql`${inventoryItems.stockActual} > 0`)
    .orderBy(desc(inventoryItems.totalStock))
    .limit(20);
}

// ── TOP 20 Zero Stock (Critical) ──
export async function getTop20ZeroStock() {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    referencia: inventoryItems.referencia,
    descripcion: inventoryItems.descripcion,
    proveedor: inventoryItems.proveedor,
    consumoAnual: inventoryItems.consumoAnual,
    consumoDiario: inventoryItems.consumoDiario,
    costoUnitario: inventoryItems.costoUnitario,
    claseAbc: inventoryItems.claseAbc,
    cuenta: inventoryItems.cuenta,
    nitProveedor: inventoryItems.nitProveedor,
  }).from(inventoryItems)
    .where(sql`${inventoryItems.stockActual} = 0 AND ${inventoryItems.consumoAnual} > 0`)
    .orderBy(desc(inventoryItems.consumoAnual))
    .limit(20);
}

// ── Purchase Orders ──
export async function getPurchaseOrders(filters?: { estado?: string; prioridad?: string; search?: string; tipoReferencia?: string }) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters?.estado) conditions.push(eq(purchaseOrders.estado, filters.estado));
  if (filters?.prioridad) conditions.push(eq(purchaseOrders.prioridad, filters.prioridad));
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    conditions.push(
      or(
        sql`LOWER(${purchaseOrders.descripcion}) LIKE ${`%${searchLower}%`}`,
        sql`LOWER(${purchaseOrders.ordenCompra}) LIKE ${`%${searchLower}%`}`,
        sql`LOWER(${purchaseOrders.proveedor}) LIKE ${`%${searchLower}%`}`,
        sql`LOWER(${purchaseOrders.mainsaver}) LIKE ${`%${searchLower}%`}`
      )
    );
  }
  // Filtro por tipo: NUEVO (sin -R, sin SRV), REPARADO (-R), SERVICIO (SRV)
  // NOTA: El valor real en la BD es 'SRV' (no 'SVR') — verificado en purchase_orders
  if (filters?.tipoReferencia === 'SERVICIO') {
    conditions.push(eq(purchaseOrders.um, 'SRV'));
  } else if (filters?.tipoReferencia === 'REPARADO') {
    conditions.push(sql`${purchaseOrders.um} != 'SRV' AND ${purchaseOrders.mainsaver} REGEXP '-R$'`);
  } else if (filters?.tipoReferencia === 'NUEVO') {
    conditions.push(sql`${purchaseOrders.um} != 'SRV' AND (${purchaseOrders.mainsaver} IS NULL OR ${purchaseOrders.mainsaver} NOT REGEXP '-R$')`);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Devolver con campo tipoReferencia calculado
  const rows = await db.select().from(purchaseOrders)
    .where(where)
    .orderBy(desc(purchaseOrders.diasRetraso));

  return rows.map(r => ({
    ...r,
    tipoReferencia: r.um === 'SRV' ? 'SERVICIO'
      : (r.mainsaver || '').match(/-R$/i) ? 'REPARADO'
      : 'NUEVO',
  })) as typeof rows[0] extends object ? Array<typeof rows[0] & { tipoReferencia: string }> : never;
}

// ── Inventory with filters ──
export async function getInventory(filters?: { cuenta?: string; claseAbc?: string; estado?: string; search?: string; page?: number; limit?: number }) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const page = filters?.page ?? 1;
  const limit = filters?.limit ?? 50;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (filters?.cuenta) conditions.push(eq(inventoryItems.cuenta, filters.cuenta));
  if (filters?.claseAbc) conditions.push(eq(inventoryItems.claseAbc, filters.claseAbc));
  if (filters?.estado) conditions.push(eq(inventoryItems.estado, filters.estado));
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    conditions.push(
      or(
        sql`LOWER(${inventoryItems.referencia}) LIKE ${`%${searchLower}%`}`,
        sql`LOWER(${inventoryItems.descripcion}) LIKE ${`%${searchLower}%`}`,
        sql`LOWER(${inventoryItems.proveedor}) LIKE ${`%${searchLower}%`}`,
        sql`LOWER(${inventoryItems.parteFabricante}) LIKE ${`%${searchLower}%`}`
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db.select({ count: sql<number>`COUNT(*)` }).from(inventoryItems).where(where);
  const items = await db.select().from(inventoryItems)
    .where(where)
    .orderBy(desc(inventoryItems.totalStock))
    .limit(limit)
    .offset(offset);

  return { items, total: countResult.count };
}

// ── Suppliers ──
export async function getSuppliers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(suppliers).orderBy(asc(suppliers.nombre));
}

// ── Sync Logs ──
export async function getLastSync() {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(syncLogs).orderBy(desc(syncLogs.startedAt)).limit(1);
  return result.length > 0 ? result[0] : null;
}

// ── Bulk upsert for sync ──
export async function bulkUpsertInventory(items: any[]) {
  const db = await getDb();
  if (!db) return 0;
  
  // Batch size 500 to minimize round-trips to TiDB
  let count = 0;
  for (let i = 0; i < items.length; i += 500) {
    const batch = items.slice(i, i + 500);
    const keys = Object.keys(batch[0]).filter(k => k !== 'id' && k !== 'referencia');
    const setClause: Record<string, any> = { updatedAt: sql`CURRENT_TIMESTAMP` };
    for (const key of keys) {
      setClause[key] = sql.raw(`VALUES(${key})`);
    }
    await db.insert(inventoryItems).values(batch).onDuplicateKeyUpdate({ set: setClause });
    count += batch.length;
  }
  return count;
}

export async function bulkUpsertOrders(orders: any[]) {
  const db = await getDb();
  if (!db) return 0;
  
  let count = 0;
  for (let i = 0; i < orders.length; i += 500) {
    const batch = orders.slice(i, i + 500).map((o: any) => ({
      ...o,
      fechaPromesa: o.fechaPromesa ? new Date(o.fechaPromesa) : null,
      fechaRequerida: o.fechaRequerida ? new Date(o.fechaRequerida) : null,
    }));
    const keys = Object.keys(batch[0]).filter(k => k !== 'id' && k !== 'ordenCompra');
    const setClause: Record<string, any> = { updatedAt: sql`CURRENT_TIMESTAMP` };
    for (const key of keys) {
      setClause[key] = sql.raw(`VALUES(${key})`);
    }
    await db.insert(purchaseOrders).values(batch).onDuplicateKeyUpdate({ set: setClause });
    count += batch.length;
  }
  return count;
}

export async function bulkUpsertSuppliers(suppliersList: any[]) {
  const db = await getDb();
  if (!db) return 0;
  
  let count = 0;
  for (let i = 0; i < suppliersList.length; i += 500) {
    const batch = suppliersList.slice(i, i + 500);
    const keys = Object.keys(batch[0]).filter(k => k !== 'id' && k !== 'nit');
    const setClause: Record<string, any> = { updatedAt: sql`CURRENT_TIMESTAMP` };
    for (const key of keys) {
      setClause[key] = sql.raw(`VALUES(${key})`);
    }
    await db.insert(suppliers).values(batch).onDuplicateKeyUpdate({ set: setClause });
    count += batch.length;
  }
  return count;
}

export async function logSync(data: { syncType: string; status: string; itemsProcessed?: number; ordersProcessed?: number; suppliersProcessed?: number; errorMessage?: string }): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;
  try {
    // Insert and then SELECT the most recent record to get the real ID
    // This avoids relying on Drizzle's insertId which is inconsistent with TiDB
    await db.insert(syncLogs).values({
      syncType: data.syncType,
      status: data.status,
      itemsProcessed: data.itemsProcessed ?? 0,
      ordersProcessed: data.ordersProcessed ?? 0,
      suppliersProcessed: data.suppliersProcessed ?? 0,
      errorMessage: data.errorMessage ?? null,
    });
    // SELECT the most recent record of this type and status
    const rows = await db.select({ id: syncLogs.id })
      .from(syncLogs)
      .where(and(eq(syncLogs.syncType, data.syncType), eq(syncLogs.status, data.status)))
      .orderBy(desc(syncLogs.id))
      .limit(1);
    const insertId = rows.length > 0 ? rows[0].id : null;
    serverLogger.log(`[DB] logSync insertId: ${insertId}, status: ${data.status}`);
    return insertId;
  } catch (err: any) {
    serverLogger.error('[DB] logSync error:', err.message);
    return null;
  }
}

export async function updateSyncLog(id: number, data: { status: string; itemsProcessed?: number; ordersProcessed?: number; suppliersProcessed?: number; errorMessage?: string; completedAt?: Date }) {
  const db = await getDb();
  if (!db) return;
  await db.update(syncLogs).set({ ...data, completedAt: data.completedAt ?? new Date() }).where(eq(syncLogs.id, id));
}

export async function getRunningSync() {
  const db = await getDb();
  if (!db) return null;

  // Auto-cleanup: mark as error any 'running' record older than 3 minutes (zombie from Cloud Run restart)
  try {
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
    await db.update(syncLogs)
      .set({ status: 'error', errorMessage: 'Timeout - proceso interrumpido (Cloud Run)', completedAt: new Date() })
      .where(and(
        eq(syncLogs.status, 'running'),
        sql`${syncLogs.startedAt} < ${threeMinutesAgo}`
      ));
  } catch { /* ignore cleanup errors */ }

  const result = await db.select().from(syncLogs)
    .where(eq(syncLogs.status, 'running'))
    .orderBy(desc(syncLogs.startedAt))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

// ── Orders Summary for notifications ──
export async function getDelayedOrders() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(purchaseOrders)
    .where(sql`${purchaseOrders.diasRetraso} > 0 AND ${purchaseOrders.estado} != 'RECIBIDO'`)
    .orderBy(desc(purchaseOrders.diasRetraso));
}

export async function getCriticalStockItems() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inventoryItems)
    .where(sql`${inventoryItems.stockActual} = 0 AND ${inventoryItems.consumoAnual} > 0`)
    .orderBy(desc(inventoryItems.consumoAnual));
}

// ── Referencias Stock=0 con OC Activa (cruce inventario x órdenes) ──
export async function getStockCeroConOC() {
  const db = await getDb();
  if (!db) return [];

  // Cruce por mainsaver (referencia exacta) para evitar duplicados por descripción compartida
  // mainsaver contiene la referencia específica (ej: 43000048-R) que identifica la OC en inventario
  const rows = await db.execute(sql`
    SELECT
      i.id,
      i.referencia,
      i.descripcion,
      i.stockActual,
      i.claseAbc,
      i.cuenta,
      i.proveedor AS proveedorInventario,
      i.consumoAnual,
      i.consumoDiario,
      i.costoUnitario,
      i.estado AS estadoInventario,
      i.prioridad AS prioridadInventario,
      i.parteFabricante,
      p.id AS ocId,
      p.ordenCompra,
      p.estado AS estadoOC,
      p.prioridad AS prioridadOC,
      p.proveedor AS proveedorOC,
      p.diasRetraso,
      p.qtyPendiente,
      p.valorPendiente,
      p.fechaPromesa,
      p.comprador,
      p.um,
      CASE
        WHEN p.um = 'SRV' THEN 'SERVICIO'
        WHEN i.referencia REGEXP '-R$' THEN 'REPARADO'
        ELSE 'NUEVO'
      END AS tipoReferencia
    FROM inventory_items i
    INNER JOIN purchase_orders p
      ON UPPER(TRIM(p.mainsaver)) = UPPER(TRIM(i.referencia))
    WHERE i.stockActual = 0
      AND p.estado IN ('PENDIENTE', 'CASI COMPLETO')
    ORDER BY p.diasRetraso DESC, i.costoUnitario DESC
  `);

  return (rows as any[])[0] as Array<{
    id: number;
    referencia: string;
    descripcion: string | null;
    stockActual: number | null;
    claseAbc: string | null;
    cuenta: string | null;
    proveedorInventario: string | null;
    consumoAnual: number | null;
    consumoDiario: number | null;
    costoUnitario: number | null;
    estadoInventario: string | null;
    prioridadInventario: string | null;
    parteFabricante: string | null;
    ocId: number;
    ordenCompra: string | null;
    estadoOC: string | null;
    prioridadOC: string | null;
    proveedorOC: string | null;
    diasRetraso: number | null;
    qtyPendiente: number | null;
    valorPendiente: number | null;
    fechaPromesa: Date | null;
    comprador: string | null;
    um: string | null;
    tipoReferencia: 'NUEVO' | 'REPARADO' | 'SERVICIO';
  }>;
}

// ── Consumo Mensual ──
export async function bulkUpsertConsumo(items: { referencia: string; fabricante: string | null; descripcion: string | null; mes: string; cantidad: number }[]) {
  const db = await getDb();
  if (!db) return 0;

  const BATCH = 500;
  let count = 0;
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    const keys = Object.keys(batch[0]).filter(k => k !== 'id' && k !== 'referencia' && k !== 'mes');
    const setClause: Record<string, any> = {};
    for (const key of keys) {
      setClause[key] = sql.raw(`VALUES(${key})`);
    }
    await db.insert(consumoMensual).values(batch).onDuplicateKeyUpdate({ set: setClause });
    count += batch.length;
  }
  return count;
}

export async function getConsumoMensual(referencia?: string) {
  const db = await getDb();
  if (!db) return [];

  if (referencia) {
    return db.select().from(consumoMensual)
      .where(eq(consumoMensual.referencia, referencia))
      .orderBy(asc(consumoMensual.mes));
  }
  return db.select().from(consumoMensual).orderBy(asc(consumoMensual.mes));
}

export async function getConsumoSummary() {
  const db = await getDb();
  if (!db) return null;

  const [summary] = await db.select({
    totalRegistros: sql<number>`COUNT(*)`,
    totalRefs: sql<number>`COUNT(DISTINCT ${consumoMensual.referencia})`,
    totalConsumo: sql<number>`COALESCE(SUM(${consumoMensual.cantidad}), 0)`,
    meses: sql<number>`COUNT(DISTINCT ${consumoMensual.mes})`,
    mesMin: sql<string>`MIN(${consumoMensual.mes})`,
    mesMax: sql<string>`MAX(${consumoMensual.mes})`,
  }).from(consumoMensual);

  return summary;
}

export async function getTopConsumers(limit = 20) {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    referencia: consumoMensual.referencia,
    fabricante: consumoMensual.fabricante,
    descripcion: consumoMensual.descripcion,
    totalConsumo: sql<number>`SUM(${consumoMensual.cantidad})`,
    promedioMes: sql<number>`AVG(${consumoMensual.cantidad})`,
    mesesConConsumo: sql<number>`SUM(CASE WHEN ${consumoMensual.cantidad} > 0 THEN 1 ELSE 0 END)`,
  }).from(consumoMensual)
    .groupBy(consumoMensual.referencia, consumoMensual.fabricante, consumoMensual.descripcion)
    .orderBy(desc(sql`SUM(${consumoMensual.cantidad})`))
    .limit(limit);
}

export async function getConsumoByMonth() {
  const db = await getDb();
  if (!db) return [];

  return db.select({
    mes: consumoMensual.mes,
    totalConsumo: sql<number>`SUM(${consumoMensual.cantidad})`,
    refsActivas: sql<number>`COUNT(DISTINCT CASE WHEN ${consumoMensual.cantidad} > 0 THEN ${consumoMensual.referencia} END)`,
  }).from(consumoMensual)
    .groupBy(consumoMensual.mes)
    .orderBy(asc(consumoMensual.mes));
}

// ── Facturación OC ──
export async function bulkUpsertFacturacionOC(items: any[]) {
  const db = await getDb();
  if (!db) return 0;
  await db.delete(facturacionOC);
  let count = 0;
  for (let i = 0; i < items.length; i += 500) {
    const batch = items.slice(i, i + 500);
    await db.insert(facturacionOC).values(batch);
    count += batch.length;
  }
  return count;
}

export async function bulkUpsertFacturacionOCS(items: any[]) {
  const db = await getDb();
  if (!db) return 0;
  await db.delete(facturacionOCS);
  let count = 0;
  for (let i = 0; i < items.length; i += 500) {
    const batch = items.slice(i, i + 500);
    await db.insert(facturacionOCS).values(batch);
    count += batch.length;
  }
  return count;
}

export async function bulkUpsertInformeMensual(items: any[]) {
  const db = await getDb();
  if (!db) return 0;
  await db.delete(informeMensualProveedor);
  let count = 0;
  for (let i = 0; i < items.length; i += 500) {
    const batch = items.slice(i, i + 500).map((item: any) => ({
      anno: item.anno,
      mes: item.mes,
      nombreMes: item.nombreMes,
      proveedor: item.proveedor,
      ocSinIVA: item.ocSinIVA,
      ocConIVA: item.ocConIVA,
      ocsSinIVA: item.ocsSinIVA,
      ocsConIVA: item.ocsConIVA,
      totalConIVA: item.totalConIVA,
      observaciones: item.observaciones,
      enlacePazSalvo: item.enlacePazSalvo,
    }));
    await db.insert(informeMensualProveedor).values(batch);
    count += batch.length;
  }
  return count;
}

export async function getInformeMensual(filters?: { anno?: number; mes?: number; search?: string }) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters?.anno) conditions.push(eq(informeMensualProveedor.anno, filters.anno));
  if (filters?.mes) conditions.push(eq(informeMensualProveedor.mes, filters.mes));
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    conditions.push(
      or(
        sql`LOWER(${informeMensualProveedor.proveedor}) LIKE ${`%${s}%`}`,
        sql`LOWER(${informeMensualProveedor.observaciones}) LIKE ${`%${s}%`}`
      )
    );
  }

  const result = await db
    .select()
    .from(informeMensualProveedor)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(informeMensualProveedor.anno), desc(informeMensualProveedor.mes), asc(informeMensualProveedor.proveedor))
    .limit(1000);

  return result;
}

export async function getPazYSalvoResumen() {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      proveedor: informeMensualProveedor.proveedor,
      totalMeses: sql<number>`COUNT(*)`,
      mesesConPazSalvo: sql<number>`SUM(CASE WHEN ${informeMensualProveedor.observaciones} IS NOT NULL AND (LOWER(${informeMensualProveedor.observaciones}) LIKE '%paz%' OR ${informeMensualProveedor.enlacePazSalvo} IS NOT NULL) THEN 1 ELSE 0 END)`,
      mesesPendientes: sql<number>`SUM(CASE WHEN ${informeMensualProveedor.observaciones} IS NULL OR (LOWER(${informeMensualProveedor.observaciones}) NOT LIKE '%paz%' AND ${informeMensualProveedor.enlacePazSalvo} IS NULL) THEN 1 ELSE 0 END)`,
      totalConIVA: sql<number>`COALESCE(SUM(${informeMensualProveedor.totalConIVA}), 0)`,
    })
    .from(informeMensualProveedor)
    .groupBy(informeMensualProveedor.proveedor)
    .orderBy(desc(sql`SUM(${informeMensualProveedor.totalConIVA})`))
    .limit(50);

  return result;
}

export async function getFacturacionKPIs() {
  const db = await getDb();
  if (!db) return null;

  const [ocResult] = await db.select({
    totalOC: sql<number>`COUNT(*)`,
    docsUnicos: sql<number>`COUNT(DISTINCT ${facturacionOC.documento})`,
    totalSubtotal: sql<number>`COALESCE(SUM(${facturacionOC.valorSubtotal}), 0)`,
    totalNeto: sql<number>`COALESCE(SUM(${facturacionOC.valorNeto}), 0)`,
    totalImpuestos: sql<number>`COALESCE(SUM(${facturacionOC.valorImptos}), 0)`,
  }).from(facturacionOC);

  const [ocsResult] = await db.select({
    totalOCS: sql<number>`COUNT(*)`,
    docsUnicos: sql<number>`COUNT(DISTINCT ${facturacionOCS.nroDocto})`,
    totalSubtotal: sql<number>`COALESCE(SUM(${facturacionOCS.subtotal}), 0)`,
    totalNeto: sql<number>`COALESCE(SUM(${facturacionOCS.valorNeto}), 0)`,
    totalImpuestos: sql<number>`COALESCE(SUM(${facturacionOCS.valorImpuestos}), 0)`,
  }).from(facturacionOCS);

  return {
    oc: ocResult,
    ocs: ocsResult,
    totalCombinado: (ocResult.totalNeto || 0) + (ocsResult.totalNeto || 0),
    docsTotales: (ocResult.docsUnicos || 0) + (ocsResult.docsUnicos || 0),
  };
}

export async function getFacturacionOCList(filters?: { search?: string; estado?: string; proveedor?: string }) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters?.estado) conditions.push(eq(facturacionOC.estado, filters.estado));
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    conditions.push(
      or(
        sql`LOWER(${facturacionOC.descItem}) LIKE ${`%${s}%`}`,
        sql`LOWER(${facturacionOC.proveedor}) LIKE ${`%${s}%`}`,
        sql`LOWER(${facturacionOC.documento}) LIKE ${`%${s}%`}`,
        sql`LOWER(${facturacionOC.referencia}) LIKE ${`%${s}%`}`,
        sql`LOWER(${facturacionOC.comprador}) LIKE ${`%${s}%`}`
      )
    );
  }
  if (filters?.proveedor) {
    conditions.push(sql`LOWER(${facturacionOC.proveedor}) LIKE ${`%${filters.proveedor.toLowerCase()}%`}`);
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(facturacionOC).where(where).orderBy(desc(facturacionOC.id));
}

export async function getFacturacionOCSList(filters?: { search?: string; estado?: string }) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];
  if (filters?.estado) conditions.push(eq(facturacionOCS.estado, filters.estado));
  if (filters?.search) {
    const s = filters.search.toLowerCase();
    conditions.push(
      or(
        sql`LOWER(${facturacionOCS.descServicio}) LIKE ${`%${s}%`}`,
        sql`LOWER(${facturacionOCS.razonSocial}) LIKE ${`%${s}%`}`,
        sql`LOWER(${facturacionOCS.nroDocto}) LIKE ${`%${s}%`}`,
        sql`LOWER(${facturacionOCS.referencia}) LIKE ${`%${s}%`}`
      )
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  return db.select().from(facturacionOCS).where(where).orderBy(desc(facturacionOCS.id));
}

export async function getFacturacionResumenProveedores() {
  const db = await getDb();
  if (!db) return [];

  const ocByProv = await db.select({
    proveedor: facturacionOC.proveedor,
    ocSubtotal: sql<number>`COALESCE(SUM(ABS(${facturacionOC.valorSubtotal})), 0)`,
    ocNeto: sql<number>`COALESCE(SUM(ABS(${facturacionOC.valorNeto})), 0)`,
    ocCount: sql<number>`COUNT(*)`,
  }).from(facturacionOC)
    .groupBy(facturacionOC.proveedor)
    .orderBy(desc(sql`SUM(ABS(${facturacionOC.valorNeto}))`));

  const ocsByProv = await db.select({
    proveedor: facturacionOCS.razonSocial,
    ocsSubtotal: sql<number>`COALESCE(SUM(ABS(${facturacionOCS.subtotal})), 0)`,
    ocsNeto: sql<number>`COALESCE(SUM(ABS(${facturacionOCS.valorNeto})), 0)`,
    ocsCount: sql<number>`COUNT(*)`,
  }).from(facturacionOCS)
    .groupBy(facturacionOCS.razonSocial)
    .orderBy(desc(sql`SUM(ABS(${facturacionOCS.valorNeto}))`));

  const provMap = new Map<string, { proveedor: string; ocSubtotal: number; ocNeto: number; ocCount: number; ocsSubtotal: number; ocsNeto: number; ocsCount: number }>();
  
  for (const row of ocByProv) {
    const key = (row.proveedor || 'SIN PROVEEDOR').trim().toUpperCase();
    provMap.set(key, {
      proveedor: (row.proveedor || 'SIN PROVEEDOR').trim(),
      ocSubtotal: row.ocSubtotal, ocNeto: row.ocNeto, ocCount: row.ocCount,
      ocsSubtotal: 0, ocsNeto: 0, ocsCount: 0,
    });
  }

  for (const row of ocsByProv) {
    const key = (row.proveedor || 'SIN PROVEEDOR').trim().toUpperCase();
    const existing = provMap.get(key);
    if (existing) {
      existing.ocsSubtotal = row.ocsSubtotal;
      existing.ocsNeto = row.ocsNeto;
      existing.ocsCount = row.ocsCount;
    } else {
      provMap.set(key, {
        proveedor: (row.proveedor || 'SIN PROVEEDOR').trim(),
        ocSubtotal: 0, ocNeto: 0, ocCount: 0,
        ocsSubtotal: row.ocsSubtotal, ocsNeto: row.ocsNeto, ocsCount: row.ocsCount,
      });
    }
  }

  const result = Array.from(provMap.values()).map(p => ({
    ...p,
    totalNeto: p.ocNeto + p.ocsNeto,
    totalSubtotal: p.ocSubtotal + p.ocsSubtotal,
  }));

  result.sort((a, b) => b.totalNeto - a.totalNeto);
  return result;
}
