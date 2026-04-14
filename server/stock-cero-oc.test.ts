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

// ─── TEST 1: Prioridades en BD son las del Drive (no "NORMAL") ───────────────
describe("Corrección de prioridades en purchase_orders", () => {
  it("NO debe haber ninguna OC con prioridad NORMAL después del fix", async () => {
    const [rows] = await conn.execute(
      "SELECT COUNT(*) as cnt FROM purchase_orders WHERE prioridad = 'NORMAL'"
    ) as any[];
    expect(Number(rows[0].cnt)).toBe(0);
  });

  it("Debe haber OC con prioridad REORDEN INMEDIATO (valor real del Drive)", async () => {
    const [rows] = await conn.execute(
      "SELECT COUNT(*) as cnt FROM purchase_orders WHERE prioridad = 'REORDEN INMEDIATO'"
    ) as any[];
    expect(Number(rows[0].cnt)).toBeGreaterThan(0);
  });

  it("Debe haber OC con prioridad CRITICO", async () => {
    const [rows] = await conn.execute(
      "SELECT COUNT(*) as cnt FROM purchase_orders WHERE prioridad = 'CRITICO'"
    ) as any[];
    expect(Number(rows[0].cnt)).toBeGreaterThan(0);
  });

  it("Los valores de prioridad deben ser del conjunto válido del Drive", async () => {
    const validPrioridades = new Set(["REORDEN INMEDIATO", "CRITICO", "OPTIMO", "PRECAUCION", "EXCESO", "0", null]);
    const [rows] = await conn.execute(
      "SELECT DISTINCT prioridad FROM purchase_orders"
    ) as any[];
    for (const row of rows) {
      expect(validPrioridades.has(row.prioridad)).toBe(true);
    }
  });

  it("Prioridad REORDEN INMEDIATO debe tener 17 chars — no truncada a 16", async () => {
    const [rows] = await conn.execute(
      "SELECT prioridad, LENGTH(prioridad) as len FROM purchase_orders WHERE prioridad = 'REORDEN INMEDIATO' LIMIT 1"
    ) as any[];
    if (rows.length > 0) {
      expect(Number(rows[0].len)).toBe(17);
    }
  });
});

// ─── TEST 2: Conteo de órdenes pendientes (158 total, 147 activas) ────────────
describe("Conteo correcto de órdenes pendientes", () => {
  it("Total de órdenes en BD debe ser 147 (datos del Drive)", async () => {
    const [rows] = await conn.execute(
      "SELECT COUNT(*) as cnt FROM purchase_orders"
    ) as any[];
    expect(Number(rows[0].cnt)).toBe(147);
  });

  it("Órdenes con estado PENDIENTE deben ser 143", async () => {
    const [rows] = await conn.execute(
      "SELECT COUNT(*) as cnt FROM purchase_orders WHERE estado = 'PENDIENTE'"
    ) as any[];
    expect(Number(rows[0].cnt)).toBe(143);
  });

  it("Órdenes con estado CASI COMPLETO deben ser 4", async () => {
    const [rows] = await conn.execute(
      "SELECT COUNT(*) as cnt FROM purchase_orders WHERE estado = 'CASI COMPLETO'"
    ) as any[];
    expect(Number(rows[0].cnt)).toBe(4);
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
  it("Debe existir al menos 30 referencias con stock=0 y OC activa", async () => {
    const [rows] = await conn.execute(`
      SELECT COUNT(DISTINCT i.id) as cnt
      FROM inventory_items i
      INNER JOIN purchase_orders p ON UPPER(TRIM(i.descripcion)) = UPPER(TRIM(p.descripcion))
      WHERE i.stockActual = 0 AND p.estado IN ('PENDIENTE', 'CASI COMPLETO')
    `) as any[];
    expect(Number(rows[0].cnt)).toBeGreaterThanOrEqual(30);
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

  it("CASO 2: OC SU115628 debe cruzar con referencia de stock=0", async () => {
    const [rows] = await conn.execute(`
      SELECT i.referencia, i.stockActual, p.ordenCompra, p.prioridad
      FROM inventory_items i
      INNER JOIN purchase_orders p ON UPPER(TRIM(i.descripcion)) = UPPER(TRIM(p.descripcion))
      WHERE p.ordenCompra = 'SU115628' AND i.stockActual = 0
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

  it("Las OC cruzadas con stock=0 deben tener prioridad correcta (no NORMAL)", async () => {
    const [rows] = await conn.execute(`
      SELECT DISTINCT p.prioridad
      FROM inventory_items i
      INNER JOIN purchase_orders p ON UPPER(TRIM(i.descripcion)) = UPPER(TRIM(p.descripcion))
      WHERE i.stockActual = 0 AND p.estado IN ('PENDIENTE', 'CASI COMPLETO')
    `) as any[];
    const prioridades = rows.map((r: any) => r.prioridad);
    expect(prioridades).not.toContain("NORMAL");
  });
});

// ─── TEST 4: Urgentes contados correctamente ──────────────────────────────────
describe("Conteo de urgentes (CRITICO + REORDEN INMEDIATO)", () => {
  it("Debe haber más de 50 órdenes urgentes (CRITICO + REORDEN INMEDIATO)", async () => {
    const [rows] = await conn.execute(
      "SELECT COUNT(*) as cnt FROM purchase_orders WHERE prioridad IN ('CRITICO', 'REORDEN INMEDIATO')"
    ) as any[];
    expect(Number(rows[0].cnt)).toBeGreaterThan(50);
  });

  it("La suma de CRITICO + REORDEN INMEDIATO debe ser 84", async () => {
    const [rows] = await conn.execute(
      "SELECT COUNT(*) as cnt FROM purchase_orders WHERE prioridad IN ('CRITICO', 'REORDEN INMEDIATO')"
    ) as any[];
    expect(Number(rows[0].cnt)).toBe(84);
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
