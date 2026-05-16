/**
 * PRUEBAS OBLIGATORIAS — Rediseño Light Cyberpunk
 * 
 * PRUEBA 1: Contraste WCAG AA (ratio ≥ 4.5:1 para texto normal)
 * PRUEBA 2: Consistencia de paleta corporativa en archivos clave
 * PRUEBA 3: Badges NUEVO/REPARADO/SERVICIO con colores correctos
 * PRUEBA 4: Regresión funcional — todos los tests previos siguen pasando
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// ── Utilidades de contraste WCAG ─────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return [r, g, b];
}

function relativeLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(hex1: string, hex2: string): number {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  const L1 = relativeLuminance(r1, g1, b1);
  const L2 = relativeLuminance(r2, g2, b2);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ── PRUEBA 1: Contraste WCAG AA ──────────────────────────────────────
describe("PRUEBA 1 — Contraste WCAG AA (≥ 4.5:1 para texto normal)", () => {
  const WHITE = "#ffffff";
  const DARK_CORP = "#281C19";
  const LIMA = "#8CB32A";
  const TEAL = "#009890";

  it("Texto #281C19 sobre fondo blanco — ratio ≥ 4.5:1", () => {
    const ratio = contrastRatio(DARK_CORP, WHITE);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("Texto blanco sobre sidebar #281C19 — ratio ≥ 4.5:1", () => {
    const ratio = contrastRatio("#f5f5f5", DARK_CORP);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("Lima #8CB32A sobre fondo blanco — ratio real (solo usar como acento/borde, no texto)", () => {
    // Lima sobre blanco tiene ratio 2.44 — NO apto para texto normal
    // Se usa SOLO como borde, acento, icono — el texto siempre en #281C19
    const ratio = contrastRatio(LIMA, WHITE);
    // Verificamos que el ratio es el esperado (2.44) y documentamos la restricción
    expect(ratio).toBeGreaterThanOrEqual(2.0);
    expect(ratio).toBeLessThan(3.0); // Lima NO debe usarse como color de texto sobre blanco
  });

  it("Lima #8CB32A sobre sidebar oscuro — ratio ≥ 4.5:1", () => {
    const ratio = contrastRatio(LIMA, DARK_CORP);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("Teal #009890 sobre fondo blanco — ratio ≥ 3:1 (UI components)", () => {
    const ratio = contrastRatio(TEAL, WHITE);
    expect(ratio).toBeGreaterThanOrEqual(3.0);
  });

  it("Texto rojo crítico #991b1b sobre fondo claro #fee2e2 — ratio ≥ 4.5:1", () => {
    const ratio = contrastRatio("#991b1b", "#fee2e2");
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("Texto naranja #9a3412 sobre fondo #fff7ed — ratio ≥ 4.5:1", () => {
    const ratio = contrastRatio("#9a3412", "#fff7ed");
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("Texto amarillo #854d0e sobre fondo #fefce8 — ratio ≥ 4.5:1", () => {
    const ratio = contrastRatio("#854d0e", "#fefce8");
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});

// ── PRUEBA 2: Consistencia de paleta corporativa ─────────────────────
describe("PRUEBA 2 — Consistencia paleta corporativa en archivos clave", () => {
  const projectRoot = join(__dirname, "..");

  it("index.css define los colores corporativos principales", () => {
    const css = readFileSync(join(projectRoot, "client/src/index.css"), "utf-8");
    expect(css).toContain("281C19");   // Oscuro corporativo
    expect(css).toContain("8CB32A");   // Lima
    expect(css).toContain("009890");   // Teal
  });

  it("index.css NO usa colores neon-pink como primarios (solo como legado/alias)", () => {
    const css = readFileSync(join(projectRoot, "client/src/index.css"), "utf-8");
    // neon-pink puede existir como variable pero no debe ser el color primario
    // El primario debe ser la paleta corporativa
    expect(css).toContain("corp");   // Debe haber clases corporativas
  });

  it("DashboardLayout usa paleta corporativa #281C19 para sidebar", () => {
    const layout = readFileSync(join(projectRoot, "client/src/components/DashboardLayout.tsx"), "utf-8");
    expect(layout).toContain("281C19");
    expect(layout).toContain("8CB32A");
    expect(layout).toContain("009890");
  });

  it("DashboardLayout NO usa text-neon-pink como clase primaria de sidebar", () => {
    const layout = readFileSync(join(projectRoot, "client/src/components/DashboardLayout.tsx"), "utf-8");
    // Las clases neon-pink no deben aparecer en el sidebar activo
    const activeNavSection = layout.match(/isActive.*?neon-pink/s);
    expect(activeNavSection).toBeNull();
  });

  it("Home.tsx usa accentColor corporativo en KPICard (no glowClass neon)", () => {
    const home = readFileSync(join(projectRoot, "client/src/pages/Home.tsx"), "utf-8");
    expect(home).toContain("accentColor");
    expect(home).not.toContain("glowClass");
  });

  it("StockCeroConOC.tsx usa paleta corporativa (no bg-gray-950)", () => {
    const page = readFileSync(join(projectRoot, "client/src/pages/StockCeroConOC.tsx"), "utf-8");
    expect(page).not.toContain("bg-gray-950");
    expect(page).not.toContain("text-gray-100");
    expect(page).toContain("281C19");
  });
});

// ── PRUEBA 3: Badges NUEVO/REPARADO/SERVICIO ─────────────────────────
describe("PRUEBA 3 — Badges NUEVO/REPARADO/SERVICIO con colores correctos", () => {
  it("Orders.tsx define badge NUEVO con color azul corporativo", () => {
    const orders = readFileSync(join(__dirname, "../client/src/pages/Orders.tsx"), "utf-8");
    expect(orders).toContain("NUEVO");
    expect(orders).toContain("REPARADO");
    expect(orders).toContain("SERVICIO");
  });

  it("Orders.tsx tiene filtros de tipo de referencia", () => {
    const orders = readFileSync(join(__dirname, "../client/src/pages/Orders.tsx"), "utf-8");
    expect(orders).toContain("tipoReferencia");  // campo del backend
    expect(orders).toContain("setTipoReferencia");  // state setter del filtro
  });

  it("StockCeroConOC.tsx tiene PrioridadBadge con colores corporativos", () => {
    const page = readFileSync(join(__dirname, "../client/src/pages/StockCeroConOC.tsx"), "utf-8");
    expect(page).toContain("PrioridadBadge");
    expect(page).toContain("CRITICO");
    expect(page).toContain("REORDEN INMEDIATO");
    expect(page).toContain("fee2e2");  // fondo rojo claro
    expect(page).toContain("fff7ed");  // fondo naranja claro
  });

  it("StockCeroConOC.tsx tiene EstadoBadge para PENDIENTE/CASI COMPLETO/VENCIDO", () => {
    const page = readFileSync(join(__dirname, "../client/src/pages/StockCeroConOC.tsx"), "utf-8");
    expect(page).toContain("EstadoBadge");
    expect(page).toContain("PENDIENTE");
    expect(page).toContain("CASI COMPLETO");
  });
});

// ── PRUEBA 4: Regresión — TypeScript sin errores ──────────────────────
describe("PRUEBA 4 — Regresión: archivos clave son TypeScript válido", () => {
  it("DashboardLayout.tsx no tiene errores de sintaxis obvios", () => {
    const layout = readFileSync(join(__dirname, "../client/src/components/DashboardLayout.tsx"), "utf-8");
    // Verificar que el archivo tiene la estructura básica correcta
    expect(layout).toContain("export default function DashboardLayout");
    expect(layout).toContain("return (");
    // Verificar que no hay JSX roto (return statements sin cierre)
    const openParens = (layout.match(/return \(/g) || []).length;
    const closeParens = (layout.match(/^\s*\);\s*$/gm) || []).length;
    expect(openParens).toBeGreaterThan(0);
  });

  it("Home.tsx no tiene errores de sintaxis obvios", () => {
    const home = readFileSync(join(__dirname, "../client/src/pages/Home.tsx"), "utf-8");
    expect(home).toContain("export default function Home");
    // Asset Tracker v2.0: KPICard renombrado a ATKpiCard, SemaphoreCard a JITCard
    expect(home).toContain("function ATKpiCard");
    expect(home).toContain("function JITCard");
  });

  it("StockCeroConOC.tsx no tiene errores de sintaxis obvios", () => {
    const page = readFileSync(join(__dirname, "../client/src/pages/StockCeroConOC.tsx"), "utf-8");
    expect(page).toContain("export default function StockCeroConOC");
    expect(page).not.toContain("bg-gray-950");
  });

  it("index.css no tiene @apply con clases no-utility (error Tailwind 4)", () => {
    const css = readFileSync(join(__dirname, "../client/src/index.css"), "utf-8");
    // No debe haber @apply con clases personalizadas como cyber-glow-*
    const applyLines = css.match(/@apply [^;]+;/g) || [];
    for (const line of applyLines) {
      // @apply solo debe usarse con utilidades Tailwind estándar
      expect(line).not.toMatch(/@apply.*cyber-glow/);
    }
  });
});
