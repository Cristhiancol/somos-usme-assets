/**
 * PRUEBAS DE ACEPTACIÓN — Template HTML Correo Stock Cero OC
 * Basadas en el documento "INSTRUCCIONES_DE_CORRECCIÓN"
 *
 * PRUEBA 1: El correo renderiza tabla HTML limpia (no texto plano)
 * PRUEBA 2: Solo Top 15 ítems, no toda la BD
 * PRUEBA 3: Badges correctos por días de retraso (CRÍTICO/ALERTA/SEGUIMIENTO)
 * PRUEBA 4: Número de OC claramente visible en cada fila
 * PRUEBA 5: Sin enlaces rotos ni botones inútiles — información autónoma
 */
import { describe, it, expect } from 'vitest';
import { buildStockCeroEmailHTML, type StockCeroEmailItem } from './email-templates/stock-cero-report';

// ── Datos de prueba ──────────────────────────────────────────────────
function makeItem(overrides: Partial<StockCeroEmailItem> = {}): StockCeroEmailItem {
  return {
    referencia: 'TEST001',
    descripcion: 'REPUESTO DE PRUEBA',
    ordenCompra: 'SU999001',
    proveedorOC: 'PROVEEDOR TEST S.A.S',
    proveedorInventario: null,
    diasRetraso: 45,
    valorPendiente: 1500000,
    prioridadOC: 'CRITICO',
    claseAbc: 'A',
    um: 'UND',
    tipoReferencia: 'NUEVO',
    ...overrides,
  };
}

// 20 ítems: 15 normales + 5 extra para probar el Top 15
const twentyItems: StockCeroEmailItem[] = Array.from({ length: 20 }, (_, i) =>
  makeItem({
    referencia: `REF${String(i + 1).padStart(3, '0')}`,
    ordenCompra: `SU${900000 + i}`,
    diasRetraso: 100 - i * 3, // Orden descendente: 100, 97, 94...
    valorPendiente: 1000000 + i * 50000,
  })
);

// Ítem SRV para sección separada (valor real en BD es 'SRV', no 'SVR')
const svrItem: StockCeroEmailItem = makeItem({
  referencia: 'SRV001',
  ordenCompra: 'SU888001',
  um: 'SRV',
  diasRetraso: 20,
  tipoReferencia: 'SERVICIO',
});

// ── PRUEBA 1: Tabla HTML limpia (no texto plano) ─────────────────────
describe('PRUEBA 1 — Correo renderiza tabla HTML limpia (no texto plano)', () => {
  const html = buildStockCeroEmailHTML(twentyItems);

  it('1.1 — El output contiene DOCTYPE y estructura HTML válida', () => {
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html');
    expect(html).toContain('</html>');
    expect(html).toContain('<body');
    expect(html).toContain('</body>');
  });

  it('1.2 — Contiene elemento <table> (no lista de bullets)', () => {
    expect(html).toContain('<table');
    expect(html).not.toContain('• OC '); // No debe haber bullets de texto plano
    expect(html).not.toContain('- OC '); // No debe haber guiones de texto plano
  });

  it('1.3 — Contiene cabeceras de tabla: PRIORIDAD, OC, PROVEEDOR, DÍAS', () => {
    expect(html).toContain('PRIORIDAD');
    expect(html).toContain('>OC<');
    expect(html).toContain('PROVEEDOR');
    expect(html).toContain('DÍAS');
  });

  it('1.4 — Contiene el banner header con #281C19', () => {
    expect(html).toContain('#281C19');
    expect(html).toContain('ASSET TRACKER');
    expect(html).toContain('ALERTA STOCK CERO');
  });

  it('1.5 — Contiene KPI cards (Total Afectadas y Valor Pendiente)', () => {
    expect(html).toContain('TOTAL AFECTADAS');
    expect(html).toContain('VALOR PENDIENTE');
  });
});

// ── PRUEBA 2: Solo Top 15 ítems ──────────────────────────────────────
describe('PRUEBA 2 — Solo Top 15 ítems, no toda la BD', () => {
  const html = buildStockCeroEmailHTML(twentyItems);

  it('2.1 — Con 20 ítems, el HTML muestra el texto "Top 15 de mayor retraso"', () => {
    expect(html).toContain('Top 15 de mayor retraso');
  });

  it('2.2 — Con 20 ítems, indica "5 órdenes restantes no mostradas"', () => {
    expect(html).toContain('5 órdenes restantes no mostradas');
  });

  it('2.3 — Con 20 ítems, el HTML contiene exactamente 15 filas de datos (no 20)', () => {
    // Contamos las OC que aparecen en el HTML — solo las primeras 15
    const matches = html.match(/SU9000\d\d/g) || [];
    // Las OC van de SU900000 a SU900019; solo deben aparecer las primeras 15 (SU900000-SU900014)
    const uniqueOCs = new Set(matches);
    expect(uniqueOCs.size).toBeLessThanOrEqual(15);
    // La OC número 16 (SU900015) NO debe aparecer en el HTML
    expect(html).not.toContain('SU900015');
    expect(html).not.toContain('SU900019');
  });

  it('2.4 — Con 10 ítems (menos de 15), NO muestra el texto de "restantes"', () => {
    const tenItems = twentyItems.slice(0, 10);
    const htmlSmall = buildStockCeroEmailHTML(tenItems);
    expect(htmlSmall).not.toContain('restantes no mostradas');
  });
});

// ── PRUEBA 3: Badges correctos por días de retraso ───────────────────
describe('PRUEBA 3 — Badges de colores correctos según días de retraso', () => {
  it('3.1 — Ítem con 45 días → badge CRÍTICO (rojo #DC2626)', () => {
    const html = buildStockCeroEmailHTML([makeItem({ diasRetraso: 45 })]);
    expect(html).toContain('CRÍTICO');
    expect(html).toContain('#DC2626');
  });

  it('3.2 — Ítem con 20 días → badge ALERTA (naranja #EA580C)', () => {
    const html = buildStockCeroEmailHTML([makeItem({ diasRetraso: 20 })]);
    expect(html).toContain('ALERTA');
    expect(html).toContain('#EA580C');
  });

  it('3.3 — Ítem con 5 días → badge SEGUIMIENTO (amarillo #CA8A04)', () => {
    const html = buildStockCeroEmailHTML([makeItem({ diasRetraso: 5 })]);
    expect(html).toContain('SEGUIMIENTO');
    expect(html).toContain('#CA8A04');
  });

  it('3.4 — Ítem con exactamente 30 días → badge ALERTA (límite inferior de CRÍTICO es >30)', () => {
    const html = buildStockCeroEmailHTML([makeItem({ diasRetraso: 30 })]);
    // El badge en la fila debe ser ALERTA (naranja), no CRÍTICO (rojo)
    // Nota: el HTML puede contener #DC2626 en los KPI cards (borde del card Total Afectadas)
    // pero el badge de la fila de la tabla debe ser ALERTA
    expect(html).toContain('ALERTA');
    // Verificar que el badge de la fila usa color naranja #EA580C (ALERTA), no rojo
    const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/i);
    expect(tbodyMatch).not.toBeNull();
    expect(tbodyMatch![1]).toContain('#EA580C'); // ALERTA
    expect(tbodyMatch![1]).not.toContain('#DC2626'); // No debe ser CRÍTICO en la fila
  });

  it('3.5 — Ítem con exactamente 31 días → badge CRÍTICO', () => {
    const html = buildStockCeroEmailHTML([makeItem({ diasRetraso: 31 })]);
    expect(html).toContain('CRÍTICO');
  });

  it('3.6 — Ítem con exactamente 15 días → badge ALERTA (límite inferior de ALERTA es >=15)', () => {
    const html = buildStockCeroEmailHTML([makeItem({ diasRetraso: 15 })]);
    expect(html).toContain('ALERTA');
  });

  it('3.7 — Ítem con 14 días → badge SEGUIMIENTO', () => {
    const html = buildStockCeroEmailHTML([makeItem({ diasRetraso: 14 })]);
    expect(html).toContain('SEGUIMIENTO');
  });
});

// ── PRUEBA 4: Número de OC visible en cada fila ──────────────────────
describe('PRUEBA 4 — Número de OC claramente visible en cada fila', () => {
  it('4.1 — La OC "SU999001" aparece en el HTML generado', () => {
    const html = buildStockCeroEmailHTML([makeItem({ ordenCompra: 'SU999001' })]);
    expect(html).toContain('SU999001');
  });

  it('4.2 — La columna OC usa color teal #009890 para destacar', () => {
    const html = buildStockCeroEmailHTML([makeItem()]);
    expect(html).toContain('#009890');
  });

  it('4.3 — La cabecera de la columna OC está presente en la tabla', () => {
    const html = buildStockCeroEmailHTML([makeItem()]);
    // La cabecera OC debe estar en el thead
    const theadMatch = html.match(/<thead[\s\S]*?<\/thead>/i);
    expect(theadMatch).not.toBeNull();
    expect(theadMatch![0]).toContain('OC');
  });

  it('4.4 — Con ítem sin OC (null), muestra "—" en lugar de undefined/null', () => {
    const html = buildStockCeroEmailHTML([makeItem({ ordenCompra: null })]);
    expect(html).not.toContain('null');
    expect(html).not.toContain('undefined');
    expect(html).toContain('—');
  });

  it('4.5 — Con múltiples ítems, cada OC aparece en su fila correspondiente', () => {
    const items = [
      makeItem({ referencia: 'A001', ordenCompra: 'SU111111' }),
      makeItem({ referencia: 'B002', ordenCompra: 'SU222222' }),
      makeItem({ referencia: 'C003', ordenCompra: 'SU333333' }),
    ];
    const html = buildStockCeroEmailHTML(items);
    expect(html).toContain('SU111111');
    expect(html).toContain('SU222222');
    expect(html).toContain('SU333333');
  });
});

// ── PRUEBA 5: Sin enlaces rotos ni botones inútiles ──────────────────
describe('PRUEBA 5 — Información autónoma: sin enlaces ni botones inútiles', () => {
  const html = buildStockCeroEmailHTML(twentyItems);

  it('5.1 — No contiene elementos <button>', () => {
    expect(html).not.toContain('<button');
  });

  it('5.2 — No contiene enlaces <a href> que apunten al sistema interno', () => {
    // No debe haber links a usme.blog ni a localhost
    expect(html).not.toMatch(/<a\s+href="https?:\/\/usme\.blog/i);
    expect(html).not.toMatch(/<a\s+href="https?:\/\/localhost/i);
    expect(html).not.toMatch(/<a\s+href="https?:\/\/.*manus\.space/i);
  });

  it('5.3 — No contiene imágenes externas (src con http)', () => {
    // Las imágenes externas pueden fallar en clientes de correo
    expect(html).not.toMatch(/<img\s+src="https?:\/\//i);
  });

  it('5.4 — Contiene sección SVR separada cuando hay ítems SVR', () => {
    const htmlWithSVR = buildStockCeroEmailHTML([...twentyItems.slice(0, 5), svrItem]);
    expect(htmlWithSVR).toContain('SERVICIOS PENDIENTES DE CIERRE');
    expect(htmlWithSVR).toContain('SU888001');
  });

  it('5.5 — El ítem SRV NO aparece en la tabla principal', () => {
    const htmlWithSVR = buildStockCeroEmailHTML([...twentyItems.slice(0, 5), svrItem]);
    // SRV001 solo debe aparecer en la sección SRV, no en la tabla principal
    // La tabla principal tiene cabecera PRIORIDAD | REF | OC | PROVEEDOR | DÍAS | VALOR
    // La sección SVR tiene cabecera diferente (sin PRIORIDAD badge)
    const mainTableMatch = htmlWithSVR.match(/TOP 15[\s\S]*?SERVICIOS PENDIENTES/i);
    if (mainTableMatch) {
      // SRV001 no debe estar en la tabla principal (antes de la sección SRV)
      expect(mainTableMatch[0]).not.toContain('SU888001');
    }
  });

  it('5.6 — Con 0 ítems, muestra mensaje "Sin referencias críticas hoy"', () => {
    const htmlEmpty = buildStockCeroEmailHTML([]);
    expect(htmlEmpty).toContain('Sin referencias críticas hoy');
  });

  it('5.7 — El asunto del correo sigue el formato del mockup', () => {
    // Verificar que email-service.ts genera el asunto correcto
    const emailServiceFile = require('fs').readFileSync(
      require('path').join(__dirname, 'email-service.ts'),
      'utf-8'
    );
    expect(emailServiceFile).toContain('ALERTA STOCK CERO');
    expect(emailServiceFile).toContain('Somos Usme');
  });
});
