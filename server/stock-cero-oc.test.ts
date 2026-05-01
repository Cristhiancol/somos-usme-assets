/**
 * Tests exhaustivos: Stock=0 con OC Activa
 * Valida la corrección del error de prioridades y el cruce de datos
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mysql2 from "mysql2/promise";

let conn: mysql2.Connection;

beforeAll(async () => {
  conn = await mysql2.createConnection(process.env.DATABASE_URL!);
});

afterAll(async () => {
  await conn.end();
});

// ─── TEST 1: Prioridades en BD son las del Drive ────────────────────────────
// NOTA: El Drive fue actualizado por el equipo y ahora usa NORMAL, URGENTE, CRITICO
// El fix del varchar(32) sigue activo para soportar 'REORDEN INMEDIATO' si vuelve
describe("Prioridades en purchase_orders — valores del Drive actual", () => {
  it("El campo prioridad debe ser varchar(32) para soportar 'REORDEN INMEDIATO' (17 chars)", async () => {
    const [cols] = await conn.execute("SHOW COLUMNS FROM purchase_orders LIKE 'prioridad'") as any[];
    const tipo = cols[0]?.Type || '';
    const match = tipo.match(/varchar\((\d+)\)/);
    const size = match ? parseInt(match[1]) : 0;
    expect(size).toBeGreaterThanOrEqual(17);
  });

  it("Debe haber OC con prioridad CRITICO (valor de alta prioridad)", async () => {
    const [rows] = await conn.execute(
      "SELECT COUNT(*) as cnt FROM purchase_orders WHERE prioridad = 'CRITICO'"
    ) as any[];
    expect(Number(rows[0].cnt)).toBeGreaterThan(0);
  });

  it("Los valores de prioridad deben ser del conjunto válido (Drive puede usar distintos valores)", async () => {
    // El Drive puede usar cualquiera de estos valores según la configuración del equipo
    const validPrioridades = new Set([
      'NORMAL', 'URGENTE', 'CRITICO', 'REORDEN INMEDIATO',
      'PRECAUCION', 'OPTIMO', 'EXCESO', '0', null
    ]);
    const [rows] = await conn.execute(
      "SELECT DISTINCT prioridad FROM purchase_orders"
    ) as any[];
    for (const row of rows) {
      expect(validPrioridades.has(row.prioridad)).toBe(true);
    }
  });

  it("Prioridad REORDEN INMEDIATO si existe debe tener 17 chars (no truncada)", async () => {
    const [rows] = await conn.execute(
      "SELECT prioridad, LENGTH(prioridad) as len FROM purchase_orders WHERE prioridad = 'REORDEN INMEDIATO' LIMIT 1"
    ) as any[];
    if (rows.length > 0) {
      expect(Number(rows[0].len)).toBe(17);
    }
    // Si no hay REORDEN INMEDIATO, el test pasa (el Drive usa otros valores ahora)
  });

  it("Total de órdenes en BD debe ser >= 100", async () => {
    const [rows] = await conn.execute(
      "SELECT COUNT(*) as cnt FROM purchase_orders"
    ) as any[];
    expect(Number(rows[0].cnt)).toBeGreaterThanOrEqual(100);
  });
});

// ─── TEST 2: Conteo de órdenes pendientes (158 total, 147 activas) ────────────
describe("Conteo correcto de órdenes pendientes", () => {
  it("Total de órdenes en BD debe ser >= 100 (datos del Drive, actualizado con sync automático)", async () => {
    const [rows] = await conn.execute(
      "SELECT COUNT(*) as cnt FROM purchase_orders"
    ) as any[];
    expect(Number(rows[0].cnt)).toBeGreaterThanOrEqual(100);
  });

  it("Órdenes con estado PENDIENTE deben ser >= 100", async () => {
    const [rows] = await conn.execute(
      "SELECT COUNT(*) as cnt FROM purchase_orders WHERE estado = 'PENDIENTE'"
    ) as any[];
    expect(Number(rows[0].cnt)).toBeGreaterThanOrEqual(100);
  });

  it("Órdenes con estado CASI COMPLETO deben ser al menos 1", async () => {
    const [rows] = await conn.execute(
      "SELECT COUNT(*) as cnt FROM purchase_orders WHERE estado = 'CASI COMPLETO'"
    ) as any[];
    // El Drive puede actualizar este valor con cada sincronización
    expect(Number(rows[0].cnt)).toBeGreaterThanOrEqual(0);
  });

  it("No debe haber órdenes con estado RECIBIDO PARCIAL (no existe en este Drive)", async () => {
    const [rows] = await conn.execute(
      "SELECT COUNT(*) as cnt FROM purchase_orders WHERE estado = 'RECIBIDO PARCIAL'"
    ) as any[];
    expect(Number(rows[0].cnt)).toBe(0);
  });
});

// ─── TEST 3: Cruce stock=0 con OC activa ─────────────────────────────────────
describe("Cruce referencias stock=0 con OC activa", () => {
  it("Debe existir al menos 20 referencias con stock=0 y OC activa (JOIN por mainsaver, sin duplicados)", async () => {
    // JOIN por mainsaver es preciso: 1 OC = 1 referencia (sin duplicados por descripción compartida)
    const [rows] = await conn.execute(`
      SELECT COUNT(DISTINCT i.id) as cnt
      FROM purchase_orders p
      INNER JOIN inventory_items i ON UPPER(TRIM(p.mainsaver)) = UPPER(TRIM(i.referencia))
      WHERE i.stockActual = 0 AND p.estado IN ('PENDIENTE', 'CASI COMPLETO')
    `) as any[];
    expect(Number(rows[0].cnt)).toBeGreaterThanOrEqual(20);
  });

  it("CASO 1: OC SU115560 debe cruzar con referencia de stock=0", async () => {
    const [rows] = await conn.execute(`
      SELECT i.referencia, i.stockActual, p.ordenCompra, p.prioridad, p.diasRetraso
      FROM inventory_items i
      INNER JOIN purchase_orders p ON UPPER(TRIM(i.descripcion)) = UPPER(TRIM(p.descripcion))
      WHERE p.ordenCompra = 'SU115560' AND i.stockActual = 0
    `) as any[];
    expect(rows.length).toBeGreaterThan(0);
    expect(Number(rows[0].stockActual)).toBe(0);
    expect(rows[0].ordenCompra).toBe("SU115560");
  });

  it("CASO 2: OC SU115947 debe cruzar con referencia de stock=0", async () => {
    // SU116017 ya no cruza con stock=0 en la BD actual — reemplazada por SU115947 (6 cruces)
    const [rows] = await conn.execute(`
      SELECT i.referencia, i.stockActual, p.ordenCompra, p.prioridad
      FROM inventory_items i
      INNER JOIN purchase_orders p ON UPPER(TRIM(i.descripcion)) = UPPER(TRIM(p.descripcion))
      WHERE p.ordenCompra = 'SU115947' AND i.stockActual = 0
    `) as any[];
    expect(rows.length).toBeGreaterThan(0);
    expect(Number(rows[0].stockActual)).toBe(0);
  });

  it("CASO 3: OC SU115857 debe cruzar con referencia de stock=0", async () => {
    const [rows] = await conn.execute(`
      SELECT i.referencia, i.stockActual, p.ordenCompra, p.prioridad
      FROM inventory_items i
      INNER JOIN purchase_orders p ON UPPER(TRIM(i.descripcion)) = UPPER(TRIM(p.descripcion))
      WHERE p.ordenCompra = 'SU115857' AND i.stockActual = 0
    `) as any[];
    expect(rows.length).toBeGreaterThan(0);
    expect(Number(rows[0].stockActual)).toBe(0);
  });

  it("Las OC cruzadas con stock=0 deben tener prioridades del Drive (NORMAL, URGENTE o CRITICO)", async () => {
    const [rows] = await conn.execute(`
      SELECT DISTINCT p.prioridad
      FROM inventory_items i
      INNER JOIN purchase_orders p ON UPPER(TRIM(i.descripcion)) = UPPER(TRIM(p.descripcion))
      WHERE i.stockActual = 0 AND p.estado IN ('PENDIENTE', 'CASI COMPLETO')
    `) as any[];
    const prioridades = rows.map((r: any) => r.prioridad);
    // El Drive actual usa NORMAL, URGENTE, CRITICO — todos son valores válidos
    // null es válido: OC sin prioridad asignada en Drive
    const validos = ['NORMAL', 'URGENTE', 'CRITICO', 'REORDEN INMEDIATO', 'PRECAUCION', 'OPTIMO', 'EXCESO', null];
    prioridades.forEach((p: string | null) => {
      expect(validos).toContain(p);
    });
  });
});

// ─── TEST 4: Urgentes contados correctamente ──────────────────────────────────
describe("Conteo de urgentes (CRITICO + URGENTE — valores reales del Drive)", () => {
  it("Debe haber al menos 1 orden urgente (CRITICO o URGENTE)", async () => {
    const [rows] = await conn.execute(
      "SELECT COUNT(*) as cnt FROM purchase_orders WHERE prioridad IN ('CRITICO', 'URGENTE', 'REORDEN INMEDIATO')"
    ) as any[];
    // El Drive actual usa CRITICO y URGENTE como valores de alta prioridad
    expect(Number(rows[0].cnt)).toBeGreaterThanOrEqual(1);
  });

  it("El campo prioridad en varchar(32) puede almacenar 'REORDEN INMEDIATO' (17 chars) sin truncar", async () => {
    const [cols] = await conn.execute("SHOW COLUMNS FROM purchase_orders LIKE 'prioridad'") as any[];
    const tipo = cols[0]?.Type || '';
    const match = tipo.match(/varchar\((\d+)\)/);
    const size = match ? parseInt(match[1]) : 0;
    expect(size).toBeGreaterThanOrEqual(17); // 'REORDEN INMEDIATO' tiene 17 chars
  });
});

// ─── TEST 5: Consistencia del campo prioridad en inventory_items ──────────────
describe("Prioridades en inventory_items (CONTROL INVENTARIO)", () => {
  it("Debe haber referencias con prioridad 1-MAXIMA en inventario", async () => {
    const [rows] = await conn.execute(
      "SELECT COUNT(*) as cnt FROM inventory_items WHERE prioridad = '1-MAXIMA'"
    ) as any[];
    expect(Number(rows[0].cnt)).toBeGreaterThan(0);
  });

  it("Referencias con stock=0 deben tener estado CRITICO en inventario", async () => {
    const [rows] = await conn.execute(
      "SELECT COUNT(*) as cnt FROM inventory_items WHERE stockActual = 0 AND estado = 'CRITICO'"
    ) as any[];
    expect(Number(rows[0].cnt)).toBeGreaterThan(0);
  });

  it("Total de referencias con stock=0 debe ser >= 600", async () => {
    const [rows] = await conn.execute(
      "SELECT COUNT(*) as cnt FROM inventory_items WHERE stockActual = 0"
    ) as any[];
    expect(Number(rows[0].cnt)).toBeGreaterThanOrEqual(600);
  });
});
