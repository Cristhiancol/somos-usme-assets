import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, double, bigint, tinyint } from "drizzle-orm/mysql-core";

// ── Users (Auth) ──
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ── Inventory Items (DATA + CONTROL INVENTARIO) ──
export const inventoryItems = mysqlTable("inventory_items", {
  id: int("id").autoincrement().primaryKey(),
  referencia: varchar("referencia", { length: 64 }).notNull(),
  descripcion: text("descripcion"),
  parteFabricante: varchar("parteFabricante", { length: 128 }),
  stockActual: double("stockActual").default(0),
  costoUnitario: double("costoUnitario").default(0),
  totalStock: double("totalStock").default(0),
  cuenta: varchar("cuenta", { length: 64 }), // CAJA, CARROCERIA, COMBUSTIBLE, etc.
  puntoPedido: double("puntoPedido").default(0),
  minimo: double("minimo").default(0),
  maximo: double("maximo").default(0),
  umEmision: varchar("umEmision", { length: 16 }),
  claseAbc: varchar("claseAbc", { length: 4 }), // A, B, C
  usoAnno: double("usoAnno").default(0),
  usoAnnoAnt: double("usoAnnoAnt").default(0),
  leadTimeProm: double("leadTimeProm").default(0),
  rotacionAnno: double("rotacionAnno").default(0),
  rotacionAnt: double("rotacionAnt").default(0),
  quiebresAnno: double("quiebresAnno").default(0),
  quiebresAnt: double("quiebresAnt").default(0),
  costoPromedio: double("costoPromedio").default(0),
  ultimoCosto: double("ultimoCosto").default(0),
  nitProveedor: varchar("nitProveedor", { length: 32 }),
  bodega: varchar("bodega", { length: 32 }),
  // CONTROL INVENTARIO enriched fields
  proveedor: text("proveedor"),
  consumoAnual: double("consumoAnual").default(0),
  consumoDiario: double("consumoDiario").default(0),
  leadTimeDias: double("leadTimeDias").default(0),
  stockSeguridad: double("stockSeguridad").default(0),
  puntoReorden: double("puntoReorden").default(0),
  inventarioDias: double("inventarioDias").default(0),
  estado: varchar("estado", { length: 32 }), // CRITICO, REORDEN, PRECAUCION, OPTIMO, EXCESO
  accionRequerida: varchar("accionRequerida", { length: 64 }),
  cantidadAPedir: double("cantidadAPedir").default(0),
  valorAPedir: double("valorAPedir").default(0),
  prioridad: varchar("prioridad", { length: 16 }), // 1-CRITICA, 2-ALTA, 3-MEDIA, 4-BAJA
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = typeof inventoryItems.$inferInsert;

// ── Purchase Orders (DATA PENDIENTES) ──
export const purchaseOrders = mysqlTable("purchase_orders", {
  id: int("id").autoincrement().primaryKey(),
  ordenCompra: varchar("ordenCompra", { length: 32 }),
  descripcion: text("descripcion"),
  qtyOrdenada: double("qtyOrdenada").default(0),
  um: varchar("um", { length: 16 }),
  qtyRecibida: double("qtyRecibida").default(0),
  qtyPendiente: double("qtyPendiente").default(0),
  costoUnitario: double("costoUnitario").default(0),
  proveedor: text("proveedor"),
  parteFabricante: varchar("parteFabricante", { length: 128 }),
  comprador: varchar("comprador", { length: 128 }),
  mainsaver: varchar("mainsaver", { length: 64 }),
  fechaPromesa: timestamp("fechaPromesa"),
  fechaRequerida: timestamp("fechaRequerida"),
  valorImpuesto: double("valorImpuesto").default(0),
  valorPendiente: double("valorPendiente").default(0),
  diasRetraso: int("diasRetraso").default(0),
  estado: varchar("estado", { length: 32 }), // PENDIENTE, RECIBIDO PARCIAL, VENCIDO
  cumplimiento: double("cumplimiento").default(0),
  prioridad: varchar("prioridad", { length: 16 }), // NORMAL, URGENTE, CRITICO
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;

// ── Suppliers (PROVEEDORES) ──
export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  nit: varchar("nit", { length: 32 }).notNull(),
  nombre: text("nombre"),
  tipoImpuesto: varchar("tipoImpuesto", { length: 16 }),
  email: varchar("email", { length: 320 }),
  telefono: varchar("telefono", { length: 32 }),
  contacto: varchar("contacto", { length: 128 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

// ── Sync Log ──
export const syncLogs = mysqlTable("sync_logs", {
  id: int("id").autoincrement().primaryKey(),
  syncType: varchar("syncType", { length: 32 }).notNull(), // 'gdrive_import', 'manual_import'
  status: varchar("status", { length: 16 }).notNull(), // 'success', 'error', 'running'
  itemsProcessed: int("itemsProcessed").default(0),
  ordersProcessed: int("ordersProcessed").default(0),
  suppliersProcessed: int("suppliersProcessed").default(0),
  errorMessage: text("errorMessage"),
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type SyncLog = typeof syncLogs.$inferSelect;
export type InsertSyncLog = typeof syncLogs.$inferInsert;

// ── OAuth Tokens (Google Drive) ──
export const oauthTokens = mysqlTable("oauth_tokens", {
  id: int("id").autoincrement().primaryKey(),
  provider: varchar("provider", { length: 32 }).notNull(), // 'google_drive'
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  expiresAt: bigint("expiresAt", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type OAuthToken = typeof oauthTokens.$inferSelect;
export type InsertOAuthToken = typeof oauthTokens.$inferInsert;

// ── Consumption History (HISTÓRICO DE CONSUMO) ──
export const consumptionHistory = mysqlTable("consumption_history", {
  id: int("id").autoincrement().primaryKey(),
  inventoryItemId: int("inventoryItemId").notNull(),
  consumptionDate: timestamp("consumptionDate").notNull(),
  quantity: double("quantity").notNull(),
  unitCost: double("unitCost").default(0),
  failureType: varchar("failureType", { length: 100 }), // Tipo de falla (preventivo, correctivo, etc)
  busId: varchar("busId", { length: 32 }), // ID del bus que consumió la referencia
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ConsumptionHistory = typeof consumptionHistory.$inferSelect;
export type InsertConsumptionHistory = typeof consumptionHistory.$inferInsert;

// ── Stock Predictions (PREDICCIONES DE STOCK) ──
export const stockPredictions = mysqlTable("stock_predictions", {
  id: int("id").autoincrement().primaryKey(),
  inventoryItemId: int("inventoryItemId").notNull(),
  predictionDate: timestamp("predictionDate").notNull(), // Fecha para la cual se predice
  predictedDemand: double("predictedDemand").default(0), // Demanda predicha
  confidenceLow: double("confidenceLow").default(0), // Intervalo de confianza bajo (95%)
  confidenceHigh: double("confidenceHigh").default(0), // Intervalo de confianza alto (95%)
  reorderPoint: double("reorderPoint").default(0), // Punto de reorden calculado
  riskLevel: mysqlEnum("riskLevel", ["ALTO", "MEDIO", "BAJO"]).default("BAJO"), // Nivel de riesgo
  daysUntilStockout: int("daysUntilStockout").default(0), // Días hasta que se agote el stock
  recommendedOrderQty: double("recommendedOrderQty").default(0), // Cantidad recomendada a ordenar
  modelAccuracy: double("modelAccuracy").default(0), // MAPE del modelo (0-100%)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StockPrediction = typeof stockPredictions.$inferSelect;
export type InsertStockPrediction = typeof stockPredictions.$inferInsert;

// ── ABC Classification (CLASIFICACIÓN ABC) ──
export const abcClassification = mysqlTable("abc_classification", {
  id: int("id").autoincrement().primaryKey(),
  inventoryItemId: int("inventoryItemId").notNull(),
  classification: mysqlEnum("classification", ["A", "B", "C"]).notNull(),
  totalValue: double("totalValue").default(0), // Valor total (costo * cantidad consumida)
  accumulatedPercentage: double("accumulatedPercentage").default(0), // % acumulado
  consumptionPercentage: double("consumptionPercentage").default(0), // % de consumo
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
});

export type AbcClassification = typeof abcClassification.$inferSelect;
export type InsertAbcClassification = typeof abcClassification.$inferInsert;

// ── Supplier Performance (DESEMPEÑO DE PROVEEDORES) ──
export const supplierPerformance = mysqlTable("supplier_performance", {
  id: int("id").autoincrement().primaryKey(),
  supplierId: int("supplierId").notNull(),
  totalOrders: int("totalOrders").default(0), // Total de órdenes
  onTimeDeliveries: int("onTimeDeliveries").default(0), // Entregas a tiempo
  lateDeliveries: int("lateDeliveries").default(0), // Entregas retrasadas
  avgLeadTimeDays: double("avgLeadTimeDays").default(0), // Lead time promedio
  leadTimeStdDev: double("leadTimeStdDev").default(0), // Desviación estándar del lead time
  leadTimeP95: double("leadTimeP95").default(0), // Percentil 95 del lead time (para cálculos conservadores)
  onTimePercentage: double("onTimePercentage").default(0), // % de entregas a tiempo
  reliabilityScore: double("reliabilityScore").default(0), // Puntuación 0-100
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
});

export type SupplierPerformance = typeof supplierPerformance.$inferSelect;
export type InsertSupplierPerformance = typeof supplierPerformance.$inferInsert;

// ── Anomaly Detection (DETECCIÓN DE ANOMALÍAS) ──
export const anomalies = mysqlTable("anomalies", {
  id: int("id").autoincrement().primaryKey(),
  inventoryItemId: int("inventoryItemId").notNull(),
  anomalyDate: timestamp("anomalyDate").notNull(),
  actualConsumption: double("actualConsumption").notNull(),
  expectedConsumption: double("expectedConsumption").notNull(),
  zScore: double("zScore").notNull(), // Z-score (|z| > 3 = anomalía)
  probableCause: varchar("probableCause", { length: 255 }), // Causa probable
  severity: mysqlEnum("severity", ["BAJO", "MEDIO", "ALTO"]).default("BAJO"),
  resolved: tinyint("resolved").default(0), // 0 = false, 1 = true
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Anomaly = typeof anomalies.$inferSelect;
export type InsertAnomaly = typeof anomalies.$inferInsert;
