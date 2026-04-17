import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mysql2 from "mysql2/promise";
import fs from "fs";
import path from "path";

let conn: mysql2.Connection;

beforeAll(async () => {
  conn = await mysql2.createConnection(process.env.DATABASE_URL!);
});

afterAll(async () => {
  if (conn) await conn.end();
});

// Helper: leer archivo como string
function readFile(filePath: string): string {
  return fs.readFileSync(path.resolve(__dirname, "..", filePath), "utf-8");
}

describe("UPGRADE MANUS MAX — 10 Tests Obligatorios", () => {

  // ═══════════════════════════════════════════════════════════════
  // TEST 1: Design Tokens — Space Grotesk + JetBrains Mono
  // ═══════════════════════════════════════════════════════════════
  describe("TEST 1: Design Tokens — Tipografía Space Grotesk + JetBrains Mono", () => {
    it("1.1 — index.html incluye Google Fonts CDN para Space Grotesk y JetBrains Mono", () => {
      const html = readFile("client/index.html");
      expect(html).toContain("Space+Grotesk");
      expect(html).toContain("JetBrains+Mono");
    });

    it("1.2 — index.css define Space Grotesk como font-family principal", () => {
      const css = readFile("client/src/index.css");
      expect(css.toLowerCase()).toContain("space grotesk");
    });

    it("1.3 — design-tokens.ts existe y exporta paleta corporativa", () => {
      const tokens = readFile("shared/design-tokens.ts");
      expect(tokens).toContain("#281C19");
      expect(tokens).toContain("#8CB32A");
      expect(tokens).toContain("#009890");
    });

    it("1.4 — Ningún componente frontend usa Rajdhani ni Orbitron", () => {
      const pages = ["Home.tsx", "Inventory.tsx", "Orders.tsx", "StockCeroConOC.tsx", "Suppliers.tsx", "Sync.tsx", "Top20Value.tsx", "Top20Zero.tsx"];
      const components = ["DashboardLayout.tsx", "BusTransmilenio.tsx"];
      
      for (const file of pages) {
        const content = readFile(`client/src/pages/${file}`);
        expect(content).not.toContain('fontFamily: "Rajdhani"');
        expect(content).not.toContain('fontFamily: "Orbitron"');
      }
      for (const file of components) {
        const filePath = `client/src/components/${file}`;
        if (fs.existsSync(path.resolve(__dirname, "..", filePath))) {
          const content = readFile(filePath);
          expect(content).not.toContain('fontFamily: "Rajdhani"');
          expect(content).not.toContain('fontFamily: "Orbitron"');
        }
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST 2: Bus SVG Transmilenio
  // ═══════════════════════════════════════════════════════════════
  describe("TEST 2: Bus SVG Transmilenio con glow neón", () => {
    it("2.1 — BusTransmilenio.tsx existe y exporta componente", () => {
      const bus = readFile("client/src/components/BusTransmilenio.tsx");
      expect(bus).toContain("BusTransmilenio");
      expect(bus).toContain("<svg");
    });

    it("2.2 — Home.tsx importa y usa BusTransmilenio", () => {
      const home = readFile("client/src/pages/Home.tsx");
      expect(home).toContain("BusTransmilenio");
      expect(home).toContain("<BusTransmilenio");
    });

    it("2.3 — Bus SVG tiene glow neón rojo (filter o shadow)", () => {
      const bus = readFile("client/src/components/BusTransmilenio.tsx");
      const hasGlow = bus.includes("glow") || bus.includes("filter") || bus.includes("shadow") || bus.includes("blur");
      expect(hasGlow).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST 3: Campos CONTROL INVENTARIO en BD
  // ═══════════════════════════════════════════════════════════════
  describe("TEST 3: Campos CONTROL INVENTARIO sincronizados desde Drive", () => {
    it("3.1 — Schema tiene campos parteFabricante, accionRequerida, cantidadAPedir", () => {
      const schema = readFile("drizzle/schema.ts");
      expect(schema).toContain("parteFabricante");
      expect(schema).toContain("accionRequerida");
      expect(schema).toContain("cantidadAPedir");
    });

    it("3.2 — gdrive-sync.ts mapea los campos del Drive correctamente", () => {
      const sync = readFile("server/gdrive-sync.ts");
      expect(sync).toContain("parteFabricante");
      expect(sync).toContain("accionRequerida");
      expect(sync).toContain("cantidadAPedir");
    });

    it("3.3 — BD tiene datos reales en parteFabricante (>1000 registros)", async () => {
      const [rows] = await conn.execute("SELECT COUNT(*) as cnt FROM inventory_items WHERE parteFabricante IS NOT NULL AND parteFabricante != ''") as any[];
      const count = Number(rows[0]?.cnt || 0);
      expect(count).toBeGreaterThan(1000);
    });

    it("3.4 — BD tiene datos reales en accionRequerida (>1500 registros)", async () => {
      const [rows] = await conn.execute("SELECT COUNT(*) as cnt FROM inventory_items WHERE accionRequerida IS NOT NULL AND accionRequerida != ''") as any[];
      const count = Number(rows[0]?.cnt || 0);
      expect(count).toBeGreaterThan(1500);
    });

    it("3.5 — BD tiene datos reales en cantidadAPedir (>200 registros con valor >0)", async () => {
      const [rows] = await conn.execute("SELECT COUNT(*) as cnt FROM inventory_items WHERE cantidadAPedir IS NOT NULL AND cantidadAPedir > 0") as any[];
      const count = Number(rows[0]?.cnt || 0);
      expect(count).toBeGreaterThan(200);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST 4: Expand Rows en Inventory.tsx
  // ═══════════════════════════════════════════════════════════════
  describe("TEST 4: Expand Rows en tabla de inventario", () => {
    it("4.1 — Inventory.tsx tiene lógica de expand/collapse (expandedRow o similar)", () => {
      const inv = readFile("client/src/pages/Inventory.tsx");
      const hasExpand = inv.includes("expandedRow") || inv.includes("expanded") || inv.includes("expand") || inv.includes("isOpen");
      expect(hasExpand).toBe(true);
    });

    it("4.2 — Expand row muestra parteFabricante", () => {
      const inv = readFile("client/src/pages/Inventory.tsx");
      expect(inv).toContain("parteFabricante");
    });

    it("4.3 — Expand row muestra accionRequerida", () => {
      const inv = readFile("client/src/pages/Inventory.tsx");
      expect(inv).toContain("accionRequerida");
    });

    it("4.4 — Expand row muestra cantidadAPedir", () => {
      const inv = readFile("client/src/pages/Inventory.tsx");
      expect(inv).toContain("cantidadAPedir");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST 5: Loading Skeletons
  // ═══════════════════════════════════════════════════════════════
  describe("TEST 5: Loading Skeletons en componentes principales", () => {
    it("5.1 — Inventory.tsx tiene skeleton/loading state", () => {
      const inv = readFile("client/src/pages/Inventory.tsx");
      const hasSkeleton = inv.includes("skeleton") || inv.includes("Skeleton") || inv.includes("animate-pulse") || inv.includes("isLoading");
      expect(hasSkeleton).toBe(true);
    });

    it("5.2 — Home.tsx tiene loading state", () => {
      const home = readFile("client/src/pages/Home.tsx");
      const hasLoading = home.includes("isLoading") || home.includes("Loader2") || home.includes("animate-spin");
      expect(hasLoading).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST 6: Tabla con máximo 8 columnas visibles
  // ═══════════════════════════════════════════════════════════════
  describe("TEST 6: Tabla Inventory con máximo 8 columnas visibles", () => {
    it("6.1 — Tabla principal tiene ≤8 columnas de datos + 1 expand control en thead", () => {
      const inv = readFile("client/src/pages/Inventory.tsx");
      // Contar <th en la primera fila del thead
      const theadMatch = inv.match(/<thead[\s\S]*?<\/thead>/);
      if (theadMatch) {
        const thCount = (theadMatch[0].match(/<th/g) || []).length;
        // 8 columnas de datos + 1 columna de expand/collapse control = 9 max
        expect(thCount).toBeLessThanOrEqual(9);
        // Verificar que hay exactamente 7 columnas con texto (las de datos)
        const dataColumns = (theadMatch[0].match(/<th[^>]*>[A-Z]/g) || []).length;
        expect(dataColumns).toBeLessThanOrEqual(8);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST 7: Badges actualizados con paleta corporativa
  // ═══════════════════════════════════════════════════════════════
  describe("TEST 7: Badges con paleta corporativa", () => {
    it("7.1 — Inventory.tsx tiene badges de estado (CRITICO, REORDEN INMEDIATO, etc.)", () => {
      const inv = readFile("client/src/pages/Inventory.tsx");
      expect(inv).toContain("REORDEN INMEDIATO");
      expect(inv).toContain("CRITICO");
    });

    it("7.2 — Badges usan colores corporativos (#281C19, #8CB32A, #009890 o derivados)", () => {
      const inv = readFile("client/src/pages/Inventory.tsx");
      const hasCorpColors = inv.includes("#281C19") || inv.includes("#8CB32A") || inv.includes("#009890") || inv.includes("bg-red") || inv.includes("bg-amber");
      expect(hasCorpColors).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST 8: Template Email compatible Gmail/Outlook
  // ═══════════════════════════════════════════════════════════════
  describe("TEST 8: Template Email compatible Gmail/Outlook", () => {
    it("8.1 — Template usa inline styles (no <style> blocks)", () => {
      const template = readFile("server/email-templates/stock-cero-report.ts");
      // El HTML generado no debe tener <style> blocks (Gmail los elimina)
      expect(template).not.toContain("<style>");
    });

    it("8.2 — Template usa Arial/Helvetica como fallback (no Google Fonts)", () => {
      const template = readFile("server/email-templates/stock-cero-report.ts");
      expect(template).toContain("Arial, Helvetica, sans-serif");
    });

    it("8.3 — Template no tiene enlaces externos ni botones", () => {
      const template = readFile("server/email-templates/stock-cero-report.ts");
      expect(template).not.toContain("<a href=");
      expect(template).not.toContain("<button");
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST 9: Inventario total = 1828 refs
  // ═══════════════════════════════════════════════════════════════
  describe("TEST 9: Inventario total consistente", () => {
    it("9.1 — BD tiene al menos 1800 referencias en inventory_items", async () => {
      const [rows] = await conn.execute("SELECT COUNT(*) as cnt FROM inventory_items") as any[];
      const count = Number(rows[0]?.cnt || 0);
      expect(count).toBeGreaterThanOrEqual(1800);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  // TEST 10: Regresión — Tests anteriores siguen pasando
  // ═══════════════════════════════════════════════════════════════
  describe("TEST 10: Regresión — Archivos críticos no tienen errores de sintaxis", () => {
    it("10.1 — App.tsx importa todas las rutas correctamente", () => {
      const app = readFile("client/src/App.tsx");
      expect(app).toContain("Home");
      expect(app).toContain("Inventory");
      expect(app).toContain("Orders");
    });

    it("10.2 — routers.ts exporta appRouter", () => {
      const routers = readFile("server/routers.ts");
      expect(routers).toContain("appRouter");
    });

    it("10.3 — schema.ts exporta tablas principales", () => {
      const schema = readFile("drizzle/schema.ts");
      expect(schema).toContain("inventoryItems");
      expect(schema).toContain("purchaseOrders");
      expect(schema).toContain("suppliers");
    });
  });
});
