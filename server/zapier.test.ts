import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mock de fetch global ──
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

// ── Mock de process.env para Zapier ──
const originalEnv = { ...process.env };

describe("Integración Zapier → WhatsApp", () => {
  beforeEach(() => {
    vi.resetModules();
    mockFetch.mockReset();
    // Configurar env de Zapier para tests
    process.env.ZAPIER_WEBHOOK_SECRET = "test-secret-123";
    process.env.WHATSAPP_COMPRAS = "573153792823";
    process.env.ZAPIER_WEBHOOK_STOCK_CERO = "https://hooks.zapier.com/test/stock-cero";
    process.env.ZAPIER_WEBHOOK_ORDEN_CREADA = "https://hooks.zapier.com/test/orden-creada";
    process.env.ZAPIER_WEBHOOK_ORDEN_APROBADA = "https://hooks.zapier.com/test/orden-aprobada";
    process.env.ZAPIER_WEBHOOK_SINCRONIZACION = "https://hooks.zapier.com/test/sincronizacion";
    process.env.INTERNAL_API_TOKEN = "internal-token-test";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("1 — Cliente Zapier (server/zapier.ts)", () => {
    it("1.1 — notificarZapier envía POST con headers y payload correcto", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const { notificarZapier } = await import("./zapier");

      const result = await notificarZapier("https://hooks.zapier.com/test", {
        evento: "TEST",
        referencia: "REF001",
      });

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledOnce();

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe("https://hooks.zapier.com/test");
      expect(options.method).toBe("POST");
      expect(options.headers["Content-Type"]).toBe("application/json");
      expect(options.headers["X-Zapier-Secret"]).toBe("test-secret-123");

      const body = JSON.parse(options.body);
      expect(body.evento).toBe("TEST");
      expect(body.referencia).toBe("REF001");
      expect(body.whatsapp_destino).toBe("573153792823");
      expect(body.sistema).toContain("Somos Bogotá Usme");
      expect(body.timestamp).toBeTruthy();
    });

    it("1.2 — notificarZapier retorna false si webhookUrl está vacío", async () => {
      const { notificarZapier } = await import("./zapier");
      const result = await notificarZapier("", { evento: "TEST" });
      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("1.3 — notificarZapier retorna false si webhookUrl es undefined", async () => {
      const { notificarZapier } = await import("./zapier");
      const result = await notificarZapier(undefined, { evento: "TEST" });
      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("1.4 — notificarZapier retorna false si ZAPIER_WEBHOOK_SECRET no está configurado", async () => {
      process.env.ZAPIER_WEBHOOK_SECRET = "";
      const { notificarZapier } = await import("./zapier");
      const result = await notificarZapier("https://hooks.zapier.com/test", { evento: "TEST" });
      expect(result).toBe(false);
    });

    it("1.5 — Fire-and-forget: fetch falla pero no lanza excepción", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));
      const { notificarZapier } = await import("./zapier");
      const result = await notificarZapier("https://hooks.zapier.com/test", { evento: "TEST" });
      expect(result).toBe(false);
      // No debe lanzar excepción
    });

    it("1.6 — notificarZapier retorna false si Zapier responde con error HTTP", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
      const { notificarZapier } = await import("./zapier");
      const result = await notificarZapier("https://hooks.zapier.com/test", { evento: "TEST" });
      expect(result).toBe(false);
    });
  });

  describe("2 — Funciones de alto nivel", () => {
    it("2.1 — notificarStockCero genera mensaje WhatsApp con referencia y proveedor", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const { notificarStockCero } = await import("./zapier");

      notificarStockCero({
        referencia: "FILTRO-ACEITE-001",
        descripcion: "Filtro de aceite motor Volvo",
        proveedor: "TC IMPORTACIONES",
        parteFabricante: "FA-2100",
        costoUnitario: 85000,
      });

      // Esperar a que el fire-and-forget se ejecute
      await new Promise(r => setTimeout(r, 50));

      expect(mockFetch).toHaveBeenCalledOnce();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.evento).toBe("STOCK_CERO");
      expect(body.referencia).toBe("FILTRO-ACEITE-001");
      expect(body.proveedor_nombre).toBe("TC IMPORTACIONES");
      expect(body.parte_fabricante).toBe("FA-2100");
      expect(body.mensaje_whatsapp).toContain("ALERTA STOCK CERO");
      expect(body.mensaje_whatsapp).toContain("FILTRO-ACEITE-001");
      expect(body.mensaje_whatsapp).toContain("TC IMPORTACIONES");
      expect(body.mensaje_whatsapp).toContain("FA-2100");
    });

    it("2.2 — notificarOrdenCreada genera mensaje con OC, proveedor y valor", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const { notificarOrdenCreada } = await import("./zapier");

      notificarOrdenCreada({
        numero: "SU116074",
        proveedor: { nombre: "SMIDT SUMINISTRO", nit: "900123456" },
        valorTotal: 7570000,
        items: [
          { referencia: "LACA-001", descripcion: "Laca negro mate", cantidad: 7570 },
        ],
      });

      await new Promise(r => setTimeout(r, 50));

      expect(mockFetch).toHaveBeenCalledOnce();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.evento).toBe("ORDEN_CREADA");
      expect(body.numero_oc).toBe("SU116074");
      expect(body.proveedor_nombre).toBe("SMIDT SUMINISTRO");
      expect(body.mensaje_whatsapp).toContain("NUEVA ORDEN DE COMPRA");
      expect(body.mensaje_whatsapp).toContain("SU116074");
    });

    it("2.3 — notificarOrdenAprobada genera mensaje con fecha de entrega", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const { notificarOrdenAprobada } = await import("./zapier");

      notificarOrdenAprobada({
        numero: "SU116074",
        proveedor: { nombre: "SMIDT SUMINISTRO" },
        valorTotal: 7570000,
        fechaEntregaEstimada: "2026-05-15",
        aprobadoPor: "Cristhian Benítez",
      });

      await new Promise(r => setTimeout(r, 50));

      expect(mockFetch).toHaveBeenCalledOnce();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.evento).toBe("ORDEN_APROBADA");
      expect(body.mensaje_whatsapp).toContain("ORDEN DE COMPRA APROBADA");
      expect(body.mensaje_whatsapp).toContain("2026-05-15");
      expect(body.mensaje_whatsapp).toContain("Cristhian Benítez");
    });

    it("2.4 — notificarSincronizacion genera resumen con stock cero detectados", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const { notificarSincronizacion } = await import("./zapier");

      notificarSincronizacion({
        registrosActualizados: 1828,
        registrosNuevos: 5,
        ordenes: 124,
        proveedores: 45,
        errores: 0,
        duracionSegundos: 12,
        stockCeroDetectados: 610,
      });

      await new Promise(r => setTimeout(r, 50));

      expect(mockFetch).toHaveBeenCalledOnce();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.evento).toBe("SINCRONIZACION_COMPLETADA");
      expect(body.registros_actualizados).toBe(1828);
      expect(body.stock_cero_detectados).toBe(610);
      expect(body.mensaje_whatsapp).toContain("SINCRONIZACIÓN COMPLETADA");
      expect(body.mensaje_whatsapp).toContain("1828");
      expect(body.mensaje_whatsapp).toContain("610");
    });

    it("2.5 — notificarSincronizacion muestra errores si los hay", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const { notificarSincronizacion } = await import("./zapier");

      notificarSincronizacion({
        registrosActualizados: 1800,
        registrosNuevos: 0,
        ordenes: 120,
        proveedores: 40,
        errores: 3,
      });

      await new Promise(r => setTimeout(r, 50));

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.mensaje_whatsapp).toContain("Errores detectados");
      expect(body.mensaje_whatsapp).toContain("3");
    });
  });

  describe("3 — isZapierConfigured", () => {
    it("3.1 — Retorna true cuando secret y al menos un webhook están configurados", async () => {
      const { isZapierConfigured } = await import("./zapier");
      expect(isZapierConfigured()).toBe(true);
    });

    it("3.2 — Retorna false cuando ZAPIER_WEBHOOK_SECRET está vacío", async () => {
      process.env.ZAPIER_WEBHOOK_SECRET = "";
      const { isZapierConfigured } = await import("./zapier");
      expect(isZapierConfigured()).toBe(false);
    });
  });

  describe("4 — Seguridad", () => {
    it("4.1 — El número de WhatsApp se inyecta desde env, no hardcodeado", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const { notificarZapier } = await import("./zapier");

      await notificarZapier("https://hooks.zapier.com/test", { evento: "TEST" });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.whatsapp_destino).toBe("573153792823");
      // El número viene de process.env.WHATSAPP_COMPRAS, no hardcodeado
    });

    it("4.2 — El secret se envía en header X-Zapier-Secret", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const { notificarZapier } = await import("./zapier");

      await notificarZapier("https://hooks.zapier.com/test", { evento: "TEST" });

      const headers = mockFetch.mock.calls[0][1].headers;
      expect(headers["X-Zapier-Secret"]).toBe("test-secret-123");
    });

    it("4.3 — Todos los payloads incluyen sistema y timestamp", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const { notificarZapier } = await import("./zapier");

      await notificarZapier("https://hooks.zapier.com/test", { evento: "TEST" });

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.sistema).toContain("Somos Bogotá Usme");
      expect(body.timestamp).toBeTruthy();
      expect(typeof body.timestamp).toBe("string");
    });
  });

  describe("5 — Manejo de valores nulos/opcionales", () => {
    it("5.1 — notificarStockCero maneja proveedor null", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const { notificarStockCero } = await import("./zapier");

      notificarStockCero({
        referencia: "REF-NULL",
        descripcion: null,
        proveedor: null,
        parteFabricante: null,
        costoUnitario: 0,
      });

      await new Promise(r => setTimeout(r, 50));

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.proveedor_nombre).toBe("Sin proveedor asignado");
      expect(body.parte_fabricante).toBe("N/A");
      expect(body.descripcion).toBe("Sin descripción");
    });

    it("5.2 — notificarOrdenCreada maneja orden sin items", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const { notificarOrdenCreada } = await import("./zapier");

      notificarOrdenCreada({
        numero: "SU999999",
        valorTotal: 0,
      });

      await new Promise(r => setTimeout(r, 50));

      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.proveedor_nombre).toBe("N/A");
      expect(body.total_items).toBe(0);
      expect(body.mensaje_whatsapp).toContain("Sin detalle");
    });
  });
});
