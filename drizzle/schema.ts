import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, double, bigint } from "drizzle-orm/mysql-core";

// ── Users (Auth) ──
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  activo: int("activo").default(1).notNull(), // 1=activo, 0=inactivo
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
  prioridad: varchar("prioridad", { length: 32 }), // REORDEN INMEDIATO, OPTIMO, PRECAUCION, CRITICO, EXCESO (valores del Drive)
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

// ── Auditoría de Accesos ──
export const auditoriaAccesos = mysqlTable("auditoria_accesos", {
  id: int("id").autoincrement().primaryKey(),
  evento: mysqlEnum("evento", [
    "LOGIN_EXITOSO",
    "LOGIN_RECHAZADO",
    "LOGOUT",
    "ACCESO_DENEGADO",
  ]).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  openId: varchar("openId", { length: 64 }),
  detalle: varchar("detalle", { length: 500 }),
  ip: varchar("ip", { length: 64 }),
  userAgent: varchar("userAgent", { length: 500 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditoriaAcceso = typeof auditoriaAccesos.$inferSelect;
export type InsertAuditoriaAcceso = typeof auditoriaAccesos.$inferInsert;

// ── Consumo Mensual (por referencia × mes) ──
export const consumoMensual = mysqlTable("consumo_mensual", {
  id: int("id").autoincrement().primaryKey(),
  referencia: varchar("referencia", { length: 64 }).notNull(),
  fabricante: varchar("fabricante", { length: 128 }),
  descripcion: text("descripcion"),
  mes: varchar("mes", { length: 7 }).notNull(), // YYYY-MM
  cantidad: double("cantidad").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ConsumoMensual = typeof consumoMensual.$inferSelect;
export type InsertConsumoMensual = typeof consumoMensual.$inferInsert;

// ── Facturación OC (Órdenes de Compra pendientes por pagar) ──
export const facturacionOC = mysqlTable("facturacion_oc", {
  id: int("id").autoincrement().primaryKey(),
  fechaEntrega: varchar("fechaEntrega", { length: 32 }),
  fechaOC: varchar("fechaOC", { length: 32 }),
  bodega: varchar("bodega", { length: 16 }),
  referencia: varchar("referencia", { length: 64 }),
  item: varchar("item", { length: 16 }),
  moneda: varchar("moneda", { length: 8 }),
  descItem: text("descItem"),
  um: varchar("um", { length: 16 }),
  cantidad: double("cantidad").default(0),
  precioUnit: double("precioUnit").default(0),
  valorImptos: double("valorImptos").default(0),
  valorSubtotal: double("valorSubtotal").default(0),
  valorNeto: double("valorNeto").default(0),
  documento: varchar("documento", { length: 64 }),
  proveedor: text("proveedor"),
  doctoSolicitud: varchar("doctoSolicitud", { length: 64 }),
  doctoOrden: varchar("doctoOrden", { length: 64 }),
  referenciaOC: varchar("referenciaOC", { length: 64 }),
  comprador: varchar("comprador", { length: 128 }),
  estado: varchar("estado", { length: 32 }),
  fecha: varchar("fecha", { length: 32 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FacturacionOC = typeof facturacionOC.$inferSelect;
export type InsertFacturacionOC = typeof facturacionOC.$inferInsert;

// ── Facturación OCS (Órdenes de Compra de Servicios pendientes por pagar) ──
export const facturacionOCS = mysqlTable("facturacion_ocs", {
  id: int("id").autoincrement().primaryKey(),
  referencia: varchar("referencia", { length: 64 }),
  notasDocto: text("notasDocto"),
  co: varchar("co", { length: 16 }),
  nroDocto: varchar("nroDocto", { length: 32 }),
  fecha: varchar("fecha", { length: 32 }),
  estado: varchar("estado", { length: 32 }),
  nroFactura: varchar("nroFactura", { length: 64 }),
  razonSocial: text("razonSocial"),
  descServicio: text("descServicio"),
  moneda: varchar("moneda", { length: 8 }),
  valorBruto: double("valorBruto").default(0),
  valorDescuentos: double("valorDescuentos").default(0),
  subtotal: double("subtotal").default(0),
  valorImpuestos: double("valorImpuestos").default(0),
  valorNeto: double("valorNeto").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FacturacionOCS = typeof facturacionOCS.$inferSelect;
export type InsertFacturacionOCS = typeof facturacionOCS.$inferInsert;

// ── Informe Mensual OC/OCS por Proveedor (con enlaces Paz y Salvo) ──
export const informeMensualProveedor = mysqlTable("informe_mensual_proveedor", {
  id: int("id").autoincrement().primaryKey(),
  anno: int("anno").notNull(),
  mes: int("mes").notNull(),
  nombreMes: varchar("nombreMes", { length: 32 }),
  proveedor: text("proveedor"),
  ocSinIVA: double("ocSinIVA").default(0),
  ocConIVA: double("ocConIVA").default(0),
  ocsSinIVA: double("ocsSinIVA").default(0),
  ocsConIVA: double("ocsConIVA").default(0),
  totalConIVA: double("totalConIVA").default(0),
  observaciones: text("observaciones"),
  enlacePazSalvo: text("enlacePazSalvo"), // URL del documento PDF
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type InformeMensualProveedor = typeof informeMensualProveedor.$inferSelect;
export type InsertInformeMensualProveedor = typeof informeMensualProveedor.$inferInsert;

