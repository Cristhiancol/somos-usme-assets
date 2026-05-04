import { describe, it, expect } from "vitest";

describe("Zapier Secrets Validation", () => {
  it("WHATSAPP_COMPRAS debe estar configurado", () => {
    const whatsapp = process.env.WHATSAPP_COMPRAS;
    expect(whatsapp).toBeDefined();
    expect(whatsapp).toBe("+573013748901");
    // Validar formato: +57 seguido de 10 dígitos
    expect(whatsapp).toMatch(/^\+57\d{10}$/);
  });

  it("INTERNAL_API_TOKEN debe estar configurado y ser válido", () => {
    const token = process.env.INTERNAL_API_TOKEN;
    expect(token).toBeDefined();
    expect(token).toHaveLength(64); // 32 bytes = 64 caracteres hex
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it("ZAPIER_WEBHOOK_SECRET debe estar configurado y ser válido", () => {
    const secret = process.env.ZAPIER_WEBHOOK_SECRET;
    expect(secret).toBeDefined();
    expect(secret).toHaveLength(64); // 32 bytes = 64 caracteres hex
    expect(secret).toMatch(/^[a-f0-9]{64}$/);
  });

  it("Todos los secretos deben estar presentes", () => {
    const allConfigured =
      process.env.WHATSAPP_COMPRAS &&
      process.env.INTERNAL_API_TOKEN &&
      process.env.ZAPIER_WEBHOOK_SECRET;
    expect(allConfigured).toBeTruthy();
  });
});
