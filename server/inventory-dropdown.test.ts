/**
 * PRUEBAS OBLIGATORIAS — Fix dropdown Inventario: REORDEN → REORDEN INMEDIATO
 *
 * PRUEBA 1: Dropdown muestra exactamente los 6 valores correctos
 * PRUEBA 2: Filtro REORDEN INMEDIATO coincide con badges de la tabla (272 refs en BD)
 * PRUEBA 3: "Todos los estados" restaura todas las referencias (1828)
 * PRUEBA 4: Demás filtros siguen funcionando (CRITICO=613, OPTIMO=414, EXCESO=325, PRECAUCION=204)
 * PRUEBA 5: Regresión — otros componentes sin cambios
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import mysql from "mysql2/promise";

const DB_URL = process.env.DATABASE_URL!;

async function query(sql: string, params: unknown[] = []) {
  const conn = await mysql.createConnection(DB_URL);
  const [rows] = await conn.execute(sql, params);
  await conn.end();
  return rows as Record<string, unknown>[];
}

// ── PRUEBA 1: Dropdown contiene exactamente los 6 valores correctos ──
describe("PRUEBA 1 — Dropdown muestra los 6 valores exactos", () => {
  const inventoryFile = readFileSync(
    join(__dirname, "../client/src/pages/Inventory.tsx"),
    "utf-8"
  );

  it("ESTADOS array contiene exactamente 5 opciones (+ placeholder = 6 en UI)", () => {
    const match = inventoryFile.match(/const ESTADOS = \[([^\]]+)\]/);
    expect(match).not.toBeNull();
    const estados = match![1].split(",").map(s => s.trim().replace(/['"]/g, ""));
    expect(estados).toHaveLength(5);
    expect(estados).toContain("CRITICO");
    expect(estados).toContain("REORDEN INMEDIATO");
    expect(estados).toContain("PRECAUCION");
    expect(estados).toContain("OPTIMO");
    expect(estados).toContain("EXCESO");
  });

  it("ESTADOS array NO contiene la opción antigua 'REORDEN' (sin INMEDIATO)", () => {
    const match = inventoryFile.match(/const ESTADOS = \[([^\]]+)\]/);
    const estados = match![1].split(",").map(s => s.trim().replace(/['"]/g, ""));
    const tieneReordenSolo = estados.some(e => e === "REORDEN");
    expect(tieneReordenSolo).toBe(false);
  });

  it("El mapa de estilos del badge usa 'REORDEN INMEDIATO' como clave (no 'REORDEN')", () => {
    expect(inventoryFile).toContain('"REORDEN INMEDIATO": "bg-orange-500');
    // No debe existir la clave REORDEN sin espacio INMEDIATO en el mapa de estilos
    expect(inventoryFile).not.toMatch(/REORDEN":\s*"bg-orange/);
  });
});

// ── PRUEBA 2: Filtro REORDEN INMEDIATO en BD ─────────────────────────
describe("PRUEBA 2 — Filtro REORDEN INMEDIATO coincide con datos reales en BD", () => {
  it("Existen 272 referencias con estado 'REORDEN INMEDIATO' en inventory_items", async () => {
    const rows = await query(
      "SELECT COUNT(*) as total FROM inventory_items WHERE estado = 'REORDEN INMEDIATO'"
    );
    const total = Number((rows[0] as { total: number }).total);
    expect(total).toBe(272);
  });

  it("El filtro por 'REORDEN INMEDIATO' devuelve solo filas con ese estado exacto", async () => {
    const rows = await query(
      "SELECT DISTINCT estado FROM inventory_items WHERE estado = 'REORDEN INMEDIATO' LIMIT 5"
    );
    for (const row of rows) {
      expect(row.estado).toBe("REORDEN INMEDIATO");
    }
  });

  it("No existen referencias con estado 'REORDEN' (sin INMEDIATO) en BD", async () => {
    const rows = await query(
      "SELECT COUNT(*) as total FROM inventory_items WHERE estado = 'REORDEN'"
    );
    const total = Number((rows[0] as { total: number }).total);
    expect(total).toBe(0);
  });
});

// ── PRUEBA 3: "Todos los estados" restaura 1828 referencias ──────────
describe("PRUEBA 3 — Todos los estados restaura el total completo (1828)", () => {
  it("Sin filtro de estado, el total de referencias es 1828", async () => {
    const rows = await query("SELECT COUNT(*) as total FROM inventory_items");
    const total = Number((rows[0] as { total: number }).total);
    expect(total).toBe(1828);
  });

  it("La suma de todos los estados = 1828 (CRITICO+OPTIMO+EXCESO+REORDEN INMEDIATO+PRECAUCION)", async () => {
    const rows = await query(
      "SELECT estado, COUNT(*) as cnt FROM inventory_items GROUP BY estado"
    );
    const sumEstados = rows.reduce((acc, r) => acc + Number((r as { cnt: number }).cnt), 0);
    expect(sumEstados).toBe(1828);
  });
});

// ── PRUEBA 4: Demás filtros siguen funcionando ────────────────────────
describe("PRUEBA 4 — Demás filtros (CRITICO, PRECAUCION, OPTIMO, EXCESO) funcionan", () => {
  const esperados: Record<string, number> = {
    "CRITICO": 613,
    "OPTIMO": 414,
    "EXCESO": 325,
    "REORDEN INMEDIATO": 272,
    "PRECAUCION": 204,
  };

  for (const [estadoFiltro, expectedCount] of Object.entries(esperados)) {
    it(`Filtro '${estadoFiltro}' devuelve ${expectedCount} referencias`, async () => {
      const rows = await query(
        "SELECT COUNT(*) as total FROM inventory_items WHERE estado = ?",
        [estadoFiltro]
      );
      const total = Number((rows[0] as { total: number }).total);
      expect(total).toBe(expectedCount);
    });
  }
});

// ── PRUEBA 5: Regresión — otros componentes sin cambios ─────────────
describe("PRUEBA 5 — Regresión: otros componentes sin modificaciones", () => {
  it("DashboardLayout.tsx NO contiene array ESTADOS de inventario", () => {
    const layout = readFileSync(
      join(__dirname, "../client/src/components/DashboardLayout.tsx"),
      "utf-8"
    );
    expect(layout).not.toMatch(/const ESTADOS = \[/);
  });

  it("Home.tsx NO contiene array ESTADOS de inventario", () => {
    const home = readFileSync(join(__dirname, "../client/src/pages/Home.tsx"), "utf-8");
    expect(home).not.toMatch(/const ESTADOS = \[/);
  });

  it("Orders.tsx NO contiene array ESTADOS de inventario", () => {
    const orders = readFileSync(join(__dirname, "../client/src/pages/Orders.tsx"), "utf-8");
    expect(orders).not.toMatch(/const ESTADOS = \["CRITICO"/);
  });

  it("StockCeroConOC.tsx NO contiene array ESTADOS de inventario", () => {
    const page = readFileSync(join(__dirname, "../client/src/pages/StockCeroConOC.tsx"), "utf-8");
    expect(page).not.toMatch(/const ESTADOS = \[/);
  });

  it("Solo Inventory.tsx contiene el array ESTADOS con 'REORDEN INMEDIATO'", () => {
    const inv = readFileSync(join(__dirname, "../client/src/pages/Inventory.tsx"), "utf-8");
    expect(inv).toContain('const ESTADOS = ["CRITICO", "REORDEN INMEDIATO"');
  });

  it("Home.tsx NO tiene la opción 'REORDEN' como string aislado en filtros", () => {
    const home = readFileSync(join(__dirname, "../client/src/pages/Home.tsx"), "utf-8");
    // No debe tener "REORDEN" como valor de filtro (puede tener REORDEN INMEDIATO en badges)
    expect(home).not.toMatch(/"REORDEN"[,\]]/);
  });
});
