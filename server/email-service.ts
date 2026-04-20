/**
 * Servicio de correo — Nodemailer
 * Envía el reporte diario de Stock Cero + OC Activa
 * Destinatario: gestor.compras1@somos.co
 */
import nodemailer from 'nodemailer';
import { getStockCeroConOC } from './db';
import { buildStockCeroEmailHTML } from './email-templates/stock-cero-report';

// ── Configuración del transporte SMTP ───────────────────────────────
// Usa variables de entorno para no exponer credenciales en código
function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error('[EmailService] Variables SMTP no configuradas: SMTP_HOST, SMTP_USER, SMTP_PASS');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

// ── Función principal: enviar reporte diario ─────────────────────────
export async function sendStockCeroReport(options?: {
  to?: string;
  testMode?: boolean;
}): Promise<{ success: boolean; message: string; itemsCount: number; to: string }> {
  const recipient = options?.to || process.env.STOCK_CERO_EMAIL_TO || 'gestor.compras1@somos.co';
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'asset-tracker@somos.co';

  // 1. Obtener datos de la BD
  const items = await getStockCeroConOC();
  const generatedAt = new Date();

  // 2. Construir HTML
  const html = buildStockCeroEmailHTML(items, generatedAt);

  // 3. Construir asunto con resumen ejecutivo
  const mainItems = items.filter(i => i.um !== 'SRV');
  const criticos = mainItems.filter(i => (i.diasRetraso ?? 0) > 30).length;
  const subject = `ALERTA STOCK CERO — ${mainItems.length} Refs${criticos > 0 ? ` (${criticos} CRÍTICAS)` : ''} — Somos Usme`;

  // 4. Enviar
  const transport = createTransport();
  const info = await transport.sendMail({
    from: `"Asset Tracker — Somos Usme" <${from}>`,
    to: recipient,
    subject,
    html,
    // Versión texto plano para clientes que no soporten HTML
    text: `ASSET TRACKER — ALERTA STOCK CERO\n\nTotal referencias afectadas: ${mainItems.length}\nCríticos (>30d): ${criticos}\n\nEste reporte requiere un cliente de correo con soporte HTML para visualizarse correctamente.`,
  });

  return {
    success: true,
    message: `Correo enviado a ${recipient}. MessageId: ${info.messageId}`,
    itemsCount: items.length,
    to: recipient,
  };
}

// ── Función de prueba: genera el HTML sin enviar ─────────────────────
export async function previewStockCeroReport(): Promise<string> {
  const items = await getStockCeroConOC();
  return buildStockCeroEmailHTML(items, new Date());
}
