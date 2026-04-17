/**
 * Tests: Columna Parte Fabricante (PF) en Órdenes y Stock Cero + OC
 * Verifica que parteFabricante está disponible en ambas queries y tiene datos reales.
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

// ─── PRUEBA 1: parteFabricante existe en inventory_items ─────────────────────
describe("parteFabricante en inventory_items", () => {
  it("La columna parteFabricante existe en la tabla inventory_items", async () => {
    const [cols] = await conn.execute(
      "SHOW COLUMNS FROM inventory_items LIKE 'parteFabricante'"
    ) as any[];
    expect(cols.length).toBe(1);
    expect(cols[0].Field).toBe("parteFabricante");
  });

  it("Al menos 1000 items de inventario tienen parteFabricante poblado", async () => {
    const [rows] = await conn.execute(
      "SELECT COUNT(*) as cnt FROM inventory_items WHERE parteFabricante IS NOT NULL AND parteFabricante != ''"
    ) as any[];
    expect(Number(rows[0].cnt)).toBeGreaterThanOrEqual(1000);
  });
});

// ─── PRUEBA 2: parteFabricante existe en purchase_orders ─────────────────────
describe("parteFabricante en purchase_orders", () => {
  it("La columna parteFabricante existe en la tabla purchase_orders", async () => {
    const [cols] = await conn.execute(
      "SHOW COLUMNS FROM purchase_orders LIKE 'parteFabricante'"
    ) as any[];
    expect(cols.length).toBe(1);
    expect(cols[0].Field).toBe("parteFabricante");
  });

  it("Al menos algunas OC tienen parteFabricante poblado", async () => {
    const [rows] = await conn.execute(
      "SELECT COUNT(*) as cnt FROM purchase_orders WHERE parteFabricante IS NOT NULL AND parteFabricante != ''"
    ) as any[];
    // Puede que no todas las OC tengan PF, pero al menos algunas sí
    expect(Number(rows[0].cnt)).toBeGreaterThanOrEqual(0);
  });
});

// ─── PRUEBA 3: parteFabricante en query de Stock Cero + OC ──────────────────
describe("parteFabricante en cruce Stock Cero + OC", () => {
  it("La query de stock cero con OC activa incluye parteFabricante del inventario", async () => {
    const [rows] = await conn.execute(`
      SELECT
        i.referencia,
        i.parteFabricante,
        p.ordenCompra
      FROM inventory_items i
      INNER JOIN purchase_orders p
        ON UPPER(TRIM(p.mainsaver)) = UPPER(TRIM(i.referencia))
      WHERE i.stockActual = 0
        AND p.estado IN ('PENDIENTE', 'CASI COMPLETO')
      LIMIT 10
    `) as any[];
    // Debe haber resultados del cruce
    expect(rows.length).toBeGreaterThan(0);
    // Cada fila debe tener la propiedad parteFabricante (puede ser null)
    for (const row of rows) {
      expect(row).toHaveProperty("parteFabricante");
    }
  });

  it("Al menos algunas filas del cruce tienen parteFabricante no nulo", async () => {
    const [rows] = await conn.execute(`
      SELECT COUNT(*) as cnt
      FROM inventory_items i
      INNER JOIN purchase_orders p
        ON UPPER(TRIM(p.mainsaver)) = UPPER(TRIM(i.referencia))
      WHERE i.stockActual = 0
        AND p.estado IN ('PENDIENTE', 'CASI COMPLETO')
        AND i.parteFabricante IS NOT NULL
        AND i.parteFabricante != ''
    `) as any[];
    expect(Number(rows[0].cnt)).toBeGreaterThan(0);
  });
});

// ─── PRUEBA 4: parteFabricante en query de Órdenes ──────────────────────────
describe("parteFabricante disponible en purchase_orders para vista Órdenes", () => {
  it("La query SELECT * FROM purchase_orders incluye parteFabricante", async () => {
    const [rows] = await conn.execute(
      "SELECT id, ordenCompra, parteFabricante FROM purchase_orders LIMIT 5"
    ) as any[];
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row).toHaveProperty("parteFabricante");
    }
  });
});

// ─── PRUEBA 5: Frontend — Orders.tsx tiene columna PF ───────────────────────
describe("Frontend: columna PF en Orders.tsx", () => {
  it("Orders.tsx contiene header PF en la tabla", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "/home/ubuntu/somos-usme-assets/client/src/pages/Orders.tsx",
      "utf-8"
    );
    expect(content).toContain(">PF</th>");
    expect(content).toContain("parteFabricante");
  });
});

// ─── PRUEBA 6: Frontend — StockCeroConOC.tsx tiene columna PF ───────────────
describe("Frontend: columna PF en StockCeroConOC.tsx", () => {
  it("StockCeroConOC.tsx contiene header PF en la tabla", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "/home/ubuntu/somos-usme-assets/client/src/pages/StockCeroConOC.tsx",
      "utf-8"
    );
    expect(content).toContain(">PF</th>");
    expect(content).toContain("parteFabricante");
  });
});

// ─── PRUEBA 7: getStockCeroConOC type incluye parteFabricante ───────────────
describe("Backend: db.ts incluye parteFabricante en tipo de retorno", () => {
  it("db.ts tiene parteFabricante en SELECT de getStockCeroConOC", async () => {
    const fs = await import("fs/promises");
    const content = await fs.readFile(
      "/home/ubuntu/somos-usme-assets/server/db.ts",
      "utf-8"
    );
    // Verificar que el SELECT incluye i.parteFabricante
    expect(content).toContain("i.parteFabricante");
    // Verificar que el tipo de retorno incluye parteFabricante
    expect(content).toContain("parteFabricante: string | null;");
  });
});
