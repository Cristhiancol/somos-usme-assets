import { eq, sql, desc, asc, like, and, or, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, inventoryItems, purchaseOrders, suppliers, syncLogs } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
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
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
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
    totalValue: sql<number>`COALESCE(SUM(${inventoryItems.totalStock}), 0)`,
    zeroStock: sql<number>`SUM(CASE WHEN ${inventoryItems.stockActual} = 0 THEN 1 ELSE 0 END)`,
    withStock: sql<number>`SUM(CASE WHEN ${inventoryItems.stockActual} > 0 THEN 1 ELSE 0 END)`,
    avgStock: sql<number>`COALESCE(AVG(CASE WHEN ${inventoryItems.stockActual} > 0 THEN ${inventoryItems.stockActual} END), 0)`,
    classA: sql<number>`SUM(CASE WHEN ${inventoryItems.claseAbc} = 'A' THEN 1 ELSE 0 END)`,
    classB: sql<number>`SUM(CASE WHEN ${inventoryItems.claseAbc} = 'B' THEN 1 ELSE 0 END)`,
    classC: sql<number>`SUM(CASE WHEN ${inventoryItems.claseAbc} = 'C' THEN 1 ELSE 0 END)`,
  }).from(inventoryItems);

  const [ordersResult] = await db.select({
    totalPending: sql<number>`COUNT(*)`,
    totalPendingValue: sql<number>`COALESCE(SUM(${purchaseOrders.valorPendiente}), 0)`,
    // Urgentes: CRITICO o REORDEN INMEDIATO (valores reales del Drive)
    urgentOrders: sql<number>`SUM(CASE WHEN ${purchaseOrders.prioridad} IN ('CRITICO','REORDEN INMEDIATO') THEN 1 ELSE 0 END)`,
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
  if (filters?.search) conditions.push(
    or(
      like(purchaseOrders.descripcion, `%${filters.search}%`),
      like(purchaseOrders.ordenCompra, `%${filters.search}%`),
      like(purchaseOrders.proveedor, `%${filters.search}%`),
      like(purchaseOrders.mainsaver, `%${filters.search}%`)
    )
  );
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
  if (filters?.search) conditions.push(
    or(
      like(inventoryItems.referencia, `%${filters.search}%`),
      like(inventoryItems.descripcion, `%${filters.search}%`),
      like(inventoryItems.proveedor, `%${filters.search}%`)
    )
  );

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
  
  // Clear and re-insert (simpler for full sync)
  await db.delete(inventoryItems);
  let count = 0;
  for (let i = 0; i < items.length; i += 100) {
    const batch = items.slice(i, i + 100);
    await db.insert(inventoryItems).values(batch);
    count += batch.length;
  }
  return count;
}

export async function bulkUpsertOrders(orders: any[]) {
  const db = await getDb();
  if (!db) return 0;
  
  await db.delete(purchaseOrders);
  let count = 0;
  for (let i = 0; i < orders.length; i += 100) {
    const batch = orders.slice(i, i + 100).map((o: any) => ({
      ...o,
      fechaPromesa: o.fechaPromesa ? new Date(o.fechaPromesa) : null,
      fechaRequerida: o.fechaRequerida ? new Date(o.fechaRequerida) : null,
    }));
    await db.insert(purchaseOrders).values(batch);
    count += batch.length;
  }
  return count;
}

export async function bulkUpsertSuppliers(suppliersList: any[]) {
  const db = await getDb();
  if (!db) return 0;
  
  await db.delete(suppliers);
  let count = 0;
  for (let i = 0; i < suppliersList.length; i += 100) {
    const batch = suppliersList.slice(i, i + 100);
    await db.insert(suppliers).values(batch);
    count += batch.length;
  }
  return count;
}

export async function logSync(data: { syncType: string; status: string; itemsProcessed?: number; ordersProcessed?: number; suppliersProcessed?: number; errorMessage?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(syncLogs).values(data);
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
