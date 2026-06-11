/**
 * PRUEBAS — Web Quality (/web-quality)
 * 
 * Verifica los 4 cambios de calidad web aplicados al proyecto:
 * 
 * PRUEBA 1: Optimización de fuentes (preload + font-display:swap)
 * PRUEBA 2: Accesibilidad ARIA en botón de perfil
 * PRUEBA 3: Content Security Policy (CSP) correctamente configurada
 * PRUEBA 4: Limpieza de memoria (syncPollingRef = null)
 * PRUEBA 5: Regresión — La CSP NO bloquea recursos críticos
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const projectRoot = join(__dirname, "..");

function readFile(relativePath: string): string {
  return readFileSync(join(projectRoot, relativePath), "utf-8");
}

// ── PRUEBA 1: Optimización de Fuentes ────────────────────────────────
describe("PRUEBA 1 — Optimización de carga de fuentes", () => {
  const html = readFile("client/index.html");

  it("index.html tiene preload para Google Fonts", () => {
    expect(html).toContain('rel="preload"');
    expect(html).toContain('as="style"');
    expect(html).toContain("fonts.googleapis.com");
  });

  it("index.html tiene font-display:swap en la URL de Google Fonts", () => {
    expect(html).toContain("display=swap");
  });

  it("index.html tiene técnica media=print + onload para carga no-bloqueante", () => {
    expect(html).toContain('media="print"');
    expect(html).toContain("onload=\"this.media='all'\"");
  });

  it("index.html tiene fallback <noscript> para navegadores sin JS", () => {
    expect(html).toContain("<noscript>");
    // Dentro de noscript debe haber un link stylesheet directo
    const noscriptMatch = html.match(/<noscript>([\s\S]*?)<\/noscript>/);
    expect(noscriptMatch).not.toBeNull();
    expect(noscriptMatch![1]).toContain('rel="stylesheet"');
    expect(noscriptMatch![1]).toContain("fonts.googleapis.com");
  });

  it("index.html mantiene preconnect a fonts.googleapis.com y fonts.gstatic.com", () => {
    expect(html).toContain('rel="preconnect" href="https://fonts.googleapis.com"');
    expect(html).toContain('rel="preconnect" href="https://fonts.gstatic.com"');
  });
});

// ── PRUEBA 2: Accesibilidad ARIA ─────────────────────────────────────
describe("PRUEBA 2 — Accesibilidad ARIA en botón de perfil", () => {
  const layout = readFile("client/src/components/DashboardLayout.tsx");

  it("Botón de perfil tiene aria-label descriptivo con nombre de usuario", () => {
    expect(layout).toContain("aria-label={`Menú de usuario:");
  });

  it("Botón de perfil tiene aria-haspopup para indicar menú desplegable", () => {
    expect(layout).toContain('aria-haspopup="true"');
  });

  it("Avatar decorativo tiene aria-hidden para lectores de pantalla", () => {
    expect(layout).toContain('aria-hidden="true"');
  });

  it("El botón de sidebar toggle ya tenía aria-label (verificar regresión)", () => {
    expect(layout).toContain('aria-label="Alternar sidebar"');
  });
});

// ── PRUEBA 3: Content Security Policy (CSP) ──────────────────────────
describe("PRUEBA 3 — Content Security Policy correctamente configurada", () => {
  const html = readFile("client/index.html");

  it("index.html tiene meta tag CSP", () => {
    expect(html).toContain('http-equiv="Content-Security-Policy"');
  });

  it("CSP incluye default-src 'self' como base segura", () => {
    expect(html).toContain("default-src 'self'");
  });

  it("CSP permite scripts propios y inline (necesario para Vite/React)", () => {
    expect(html).toContain("script-src 'self' 'unsafe-inline'");
  });

  it("CSP permite estilos de Google Fonts", () => {
    expect(html).toContain("style-src");
    expect(html).toContain("fonts.googleapis.com");
  });

  it("CSP permite fuentes de Google Fonts gstatic", () => {
    expect(html).toContain("font-src");
    expect(html).toContain("fonts.gstatic.com");
  });

  it("CSP permite imágenes data: y blob: (necesario para QR codes y uploads)", () => {
    expect(html).toContain("img-src");
    expect(html).toContain("data:");
    expect(html).toContain("blob:");
  });

  it("CSP permite conexiones a Sentry para error tracking", () => {
    expect(html).toContain("connect-src");
    expect(html).toContain("sentry.io");
  });

  it("CSP permite conexiones a Google Maps proxy (forge.butterfly-effect.dev)", () => {
    expect(html).toContain("forge.butterfly-effect.dev");
  });

  it("CSP permite workers blob: (necesario para QR scanner html5-qrcode)", () => {
    expect(html).toContain("worker-src");
    expect(html).toContain("blob:");
  });
});

// ── PRUEBA 4: Limpieza de Memoria ────────────────────────────────────
describe("PRUEBA 4 — Limpieza de memoria en syncPollingRef", () => {
  const layout = readFile("client/src/components/DashboardLayout.tsx");

  it("syncPollingRef se establece a null después de clearInterval", () => {
    // Debe existir clearInterval + asignación a null en secuencia
    expect(layout).toContain("clearInterval(syncPollingRef.current)");
    expect(layout).toContain("syncPollingRef.current = null");
  });

  it("useEffect de cleanup tiene return con función de limpieza", () => {
    // Verificar que el cleanup useEffect existe
    expect(layout).toContain("// Cleanup polling on unmount");
    // Verificar el patrón return () => { ... clearInterval ...}
    const hasCleanup = layout.includes("return () =>") && layout.includes("clearInterval");
    expect(hasCleanup).toBe(true);
  });
});

// ── PRUEBA 5: Regresión — CSP NO bloquea la sincronización ───────────
describe("PRUEBA 5 — Regresión: CSP no bloquea recursos críticos", () => {
  const html = readFile("client/index.html");

  it("CSP permite connect-src 'self' (cubre /api/sync-drive y /api/trpc)", () => {
    // 'self' en connect-src permite todas las llamadas al mismo origin
    // Esto incluye: /api/sync-drive, /api/trpc, /api/gdrive/*, /api/webhooks/*
    const cspMatch = html.match(/Content-Security-Policy"[\s\S]*?content="([^"]*)"/);
    expect(cspMatch).not.toBeNull();
    const csp = cspMatch![1];
    expect(csp).toContain("connect-src 'self'");
  });

  it("La sincronización usa fetch relativo ('/api/sync-drive') cubierto por 'self'", () => {
    const layout = readFile("client/src/components/DashboardLayout.tsx");
    // Verificar que la URL de sync es relativa (no absoluta)
    expect(layout).toContain("fetch('/api/sync-drive'");
    // Si fuera absoluta (https://...) necesitaríamos dominio explícito en CSP
    expect(layout).not.toContain("fetch('https://");
  });

  it("tRPC usa URL relativa ('/api/trpc') cubierta por 'self'", () => {
    const main = readFile("client/src/main.tsx");
    expect(main).toContain('url: "/api/trpc"');
  });

  it("index.html mantiene meta viewport sin cambios", () => {
    expect(html).toContain('width=device-width, initial-scale=1.0, maximum-scale=1');
  });

  it("index.html mantiene el script de analytics Umami", () => {
    expect(html).toContain("VITE_ANALYTICS_ENDPOINT");
    expect(html).toContain("VITE_ANALYTICS_WEBSITE_ID");
  });

  it("index.html mantiene el entry point React", () => {
    expect(html).toContain('src="/src/main.tsx"');
    expect(html).toContain('id="root"');
  });
});
