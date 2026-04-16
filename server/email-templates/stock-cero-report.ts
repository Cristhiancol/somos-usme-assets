/**
 * Template HTML inline para el reporte diario de Stock Cero + OC Activa
 * Estilo: Light Cyberpunk Corporativo
 * Compatible con Gmail, Outlook, Apple Mail (mobile + desktop)
 * Sin enlaces externos — toda la información está en el correo
 */

export interface StockCeroEmailItem {
  referencia: string;
  descripcion: string | null;
  ordenCompra: string | null;
  proveedorOC: string | null;
  proveedorInventario: string | null;
  diasRetraso: number | null;
  valorPendiente: number | null;
  prioridadOC: string | null;
  claseAbc: string | null;
  um: string | null;
  tipoReferencia: 'NUEVO' | 'REPARADO' | 'SERVICIO';
}

function formatCOP(value: number | null): string {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getPrioridadBadge(diasRetraso: number | null): { label: string; bg: string; color: string } {
  const dias = diasRetraso ?? 0;
  if (dias > 30) return { label: 'CRÍTICO', bg: '#DC2626', color: '#FFFFFF' };
  if (dias >= 15) return { label: 'ALERTA', bg: '#EA580C', color: '#FFFFFF' };
  return { label: 'SEGUIMIENTO', bg: '#CA8A04', color: '#FFFFFF' };
}

function buildRow(item: StockCeroEmailItem, index: number): string {
  const badge = getPrioridadBadge(item.diasRetraso);
  const proveedor = item.proveedorOC || item.proveedorInventario || '—';
  const desc = item.descripcion
    ? item.descripcion.length > 40
      ? item.descripcion.substring(0, 38) + '…'
      : item.descripcion
    : '—';
  const rowBg = index % 2 === 0 ? '#FFFFFF' : '#F8F8F8';

  return `
    <tr style="background-color: ${rowBg};">
      <td style="padding: 10px 8px; border-bottom: 1px solid #E5E7EB; text-align: center;">
        <span style="
          display: inline-block;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
          background-color: ${badge.bg};
          color: ${badge.color};
          font-family: Arial, Helvetica, sans-serif;
          white-space: nowrap;
        ">${badge.label}</span>
      </td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #E5E7EB; font-size: 12px; font-weight: 700; color: #009890; font-family: Arial, Helvetica, sans-serif; white-space: nowrap;">
        ${item.referencia || '—'}
      </td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #E5E7EB; font-size: 13px; font-weight: 800; color: #009890; font-family: Arial, Helvetica, sans-serif; white-space: nowrap; letter-spacing: 0.5px;">
        ${item.ordenCompra || '—'}
      </td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #E5E7EB; font-size: 12px; color: #374151; font-family: Arial, Helvetica, sans-serif; max-width: 160px;">
        ${proveedor.length > 28 ? proveedor.substring(0, 26) + '…' : proveedor}
      </td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #E5E7EB; text-align: center; font-size: 13px; font-weight: 700; color: ${(item.diasRetraso ?? 0) > 30 ? '#DC2626' : (item.diasRetraso ?? 0) >= 15 ? '#EA580C' : '#CA8A04'}; font-family: Arial, Helvetica, sans-serif;">
        ${item.diasRetraso ?? '—'}d
      </td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #E5E7EB; text-align: right; font-size: 12px; font-weight: 700; color: #281C19; font-family: Arial, Helvetica, sans-serif; white-space: nowrap;">
        ${formatCOP(item.valorPendiente)}
      </td>
    </tr>
  `;
}

function buildSVRRow(item: StockCeroEmailItem, index: number): string {
  const rowBg = index % 2 === 0 ? '#FFFFFF' : '#F8F8F8';
  const proveedor = item.proveedorOC || item.proveedorInventario || '—';
  return `
    <tr style="background-color: ${rowBg};">
      <td style="padding: 10px 8px; border-bottom: 1px solid #E5E7EB; font-size: 12px; font-weight: 700; color: #7C3AED; font-family: Arial, Helvetica, sans-serif;">${item.referencia || '—'}</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #E5E7EB; font-size: 12px; color: #281C19; font-family: Arial, Helvetica, sans-serif;">${item.descripcion || '—'}</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #E5E7EB; font-size: 12px; font-weight: 700; color: #281C19; font-family: Arial, Helvetica, sans-serif;">${item.ordenCompra || '—'}</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #E5E7EB; font-size: 12px; color: #374151; font-family: Arial, Helvetica, sans-serif;">${proveedor}</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #E5E7EB; text-align: right; font-size: 12px; font-weight: 700; color: #281C19; font-family: Arial, Helvetica, sans-serif;">${formatCOP(item.valorPendiente)}</td>
    </tr>
  `;
}

export function buildStockCeroEmailHTML(
  items: StockCeroEmailItem[],
  generatedAt: Date = new Date()
): string {
  // Separar SVR del resto
  const svrItems = items.filter(i => i.um === 'SVR');
  const mainItems = items.filter(i => i.um !== 'SVR');

  // Top 15 por días de retraso (ya viene ordenado DESC desde la query)
  const top15 = mainItems.slice(0, 15);

  const totalAfectadas = mainItems.length;
  const totalValor = mainItems.reduce((acc, i) => acc + (i.valorPendiente ?? 0), 0);
  const maxRetraso = mainItems.length > 0 ? (mainItems[0].diasRetraso ?? 0) : 0;
  const criticos = mainItems.filter(i => (i.diasRetraso ?? 0) > 30).length;

  const fechaStr = generatedAt.toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Bogota',
  });
  const horaStr = generatedAt.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Bogota',
  });

  const tableRows = top15.map((item, i) => buildRow(item, i)).join('');
  const svrRows = svrItems.map((item, i) => buildSVRRow(item, i)).join('');

  const svrSection = svrItems.length > 0 ? `
    <!-- SVR Section -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 32px;">
      <tr>
        <td>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F3E8FF; border-left: 4px solid #7C3AED; border-radius: 4px; margin-bottom: 12px;">
            <tr>
              <td style="padding: 12px 16px;">
                <span style="font-size: 14px; font-weight: 700; color: #7C3AED; font-family: Arial, Helvetica, sans-serif; text-transform: uppercase; letter-spacing: 1px;">
                  ⚙ SERVICIOS PENDIENTES DE CIERRE
                </span>
                <span style="font-size: 12px; color: #6B7280; font-family: Arial, Helvetica, sans-serif; margin-left: 8px;">
                  Reenviar a Mantenimiento para cierre
                </span>
              </td>
            </tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; border: 1px solid #E5E7EB; border-radius: 6px; overflow: hidden;">
            <thead>
              <tr style="background-color: #EDE9FE;">
                <th style="padding: 10px 8px; text-align: left; font-size: 11px; font-weight: 700; color: #7C3AED; font-family: Arial, Helvetica, sans-serif; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #DDD6FE;">REFERENCIA</th>
                <th style="padding: 10px 8px; text-align: left; font-size: 11px; font-weight: 700; color: #7C3AED; font-family: Arial, Helvetica, sans-serif; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #DDD6FE;">DESCRIPCIÓN</th>
                <th style="padding: 10px 8px; text-align: left; font-size: 11px; font-weight: 700; color: #7C3AED; font-family: Arial, Helvetica, sans-serif; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #DDD6FE;">OC</th>
                <th style="padding: 10px 8px; text-align: left; font-size: 11px; font-weight: 700; color: #7C3AED; font-family: Arial, Helvetica, sans-serif; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #DDD6FE;">PROVEEDOR</th>
                <th style="padding: 10px 8px; text-align: right; font-size: 11px; font-weight: 700; color: #7C3AED; font-family: Arial, Helvetica, sans-serif; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #DDD6FE;">VALOR PEND.</th>
              </tr>
            </thead>
            <tbody>
              ${svrRows}
            </tbody>
          </table>
        </td>
      </tr>
    </table>
  ` : '';

  const noDataSection = totalAfectadas === 0 ? `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 24px;">
      <tr>
        <td style="padding: 32px; text-align: center; background-color: #F0FDF4; border: 2px solid #86EFAC; border-radius: 8px;">
          <p style="font-size: 18px; color: #16A34A; font-weight: 700; font-family: Arial, Helvetica, sans-serif; margin: 0;">
            ✅ Sin referencias críticas hoy
          </p>
          <p style="font-size: 14px; color: #374151; font-family: Arial, Helvetica, sans-serif; margin: 8px 0 0 0;">
            No hay referencias con stock cero y órdenes de compra activas pendientes.
          </p>
        </td>
      </tr>
    </table>
  ` : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Asset Tracker - Alerta Stock Cero</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: Arial, Helvetica, sans-serif;">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F3F4F6; padding: 24px 0;">
    <tr>
      <td align="center">

        <!-- Container -->
        <table width="680" cellpadding="0" cellspacing="0" border="0" style="max-width: 680px; width: 100%; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">

          <!-- HEADER -->
          <tr>
            <td style="background-color: #281C19; padding: 28px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 11px; color: #8CB32A; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; font-family: Arial, Helvetica, sans-serif;">
                      SOMOS BOGOTÁ USME // SISTEMA JIT
                    </p>
                    <h1 style="margin: 6px 0 0 0; font-size: 22px; font-weight: 900; color: #FFFFFF; font-family: Arial, Helvetica, sans-serif; letter-spacing: 1px;">
                      ASSET TRACKER
                      <span style="color: #8CB32A;">— ALERTA STOCK CERO</span>
                    </h1>
                    <p style="margin: 8px 0 0 0; font-size: 12px; color: #A8A29E; font-family: Arial, Helvetica, sans-serif;">
                      ${fechaStr} · ${horaStr} (hora Colombia)
                    </p>
                  </td>
                  <td align="right" style="vertical-align: top;">
                    <span style="
                      display: inline-block;
                      background-color: #8CB32A;
                      color: #281C19;
                      font-size: 10px;
                      font-weight: 900;
                      padding: 4px 10px;
                      border-radius: 4px;
                      letter-spacing: 1px;
                      font-family: Arial, Helvetica, sans-serif;
                    ">REPORTE DIARIO</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- KPI CARDS -->
          <tr>
            <td style="padding: 24px 32px 0 32px; background-color: #FAFAFA; border-bottom: 1px solid #E5E7EB;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <!-- KPI 1: Total Afectadas -->
                  <td width="25%" style="padding: 0 8px 16px 0;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFFFFF; border: 1px solid #E5E7EB; border-left: 4px solid #DC2626; border-radius: 6px; padding: 14px 16px;">
                      <tr>
                        <td>
                          <p style="margin: 0; font-size: 10px; color: #6B7280; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; font-family: Arial, Helvetica, sans-serif;">TOTAL AFECTADAS</p>
                          <p style="margin: 4px 0 0 0; font-size: 28px; font-weight: 900; color: #DC2626; font-family: Arial, Helvetica, sans-serif;">${totalAfectadas}</p>
                          <p style="margin: 2px 0 0 0; font-size: 11px; color: #9CA3AF; font-family: Arial, Helvetica, sans-serif;">referencias</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- KPI 2: Valor Pendiente -->
                  <td width="25%" style="padding: 0 8px 16px 8px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFFFFF; border: 1px solid #E5E7EB; border-left: 4px solid #281C19; border-radius: 6px; padding: 14px 16px;">
                      <tr>
                        <td>
                          <p style="margin: 0; font-size: 10px; color: #6B7280; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; font-family: Arial, Helvetica, sans-serif;">VALOR PENDIENTE</p>
                          <p style="margin: 4px 0 0 0; font-size: 16px; font-weight: 900; color: #281C19; font-family: Arial, Helvetica, sans-serif;">${formatCOP(totalValor)}</p>
                          <p style="margin: 2px 0 0 0; font-size: 11px; color: #9CA3AF; font-family: Arial, Helvetica, sans-serif;">COP total</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- KPI 3: Críticos >30d -->
                  <td width="25%" style="padding: 0 8px 16px 8px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFFFFF; border: 1px solid #E5E7EB; border-left: 4px solid #EA580C; border-radius: 6px; padding: 14px 16px;">
                      <tr>
                        <td>
                          <p style="margin: 0; font-size: 10px; color: #6B7280; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; font-family: Arial, Helvetica, sans-serif;">CRÍTICOS &gt;30d</p>
                          <p style="margin: 4px 0 0 0; font-size: 28px; font-weight: 900; color: #EA580C; font-family: Arial, Helvetica, sans-serif;">${criticos}</p>
                          <p style="margin: 2px 0 0 0; font-size: 11px; color: #9CA3AF; font-family: Arial, Helvetica, sans-serif;">OC vencidas</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <!-- KPI 4: Mayor retraso -->
                  <td width="25%" style="padding: 0 0 16px 8px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #FFFFFF; border: 1px solid #E5E7EB; border-left: 4px solid #009890; border-radius: 6px; padding: 14px 16px;">
                      <tr>
                        <td>
                          <p style="margin: 0; font-size: 10px; color: #6B7280; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; font-family: Arial, Helvetica, sans-serif;">MAYOR RETRASO</p>
                          <p style="margin: 4px 0 0 0; font-size: 28px; font-weight: 900; color: #009890; font-family: Arial, Helvetica, sans-serif;">${maxRetraso}d</p>
                          <p style="margin: 2px 0 0 0; font-size: 11px; color: #9CA3AF; font-family: Arial, Helvetica, sans-serif;">días</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding: 24px 32px 32px 32px;">

              ${totalAfectadas === 0 ? noDataSection : `
              <!-- Section Title -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 16px;">
                <tr>
                  <td>
                    <h2 style="margin: 0; font-size: 14px; font-weight: 700; color: #281C19; font-family: Arial, Helvetica, sans-serif; text-transform: uppercase; letter-spacing: 1px; border-bottom: 3px solid #8CB32A; padding-bottom: 6px; display: inline-block;">
                      TOP 15 — MAYOR RETRASO
                    </h2>
                    <p style="margin: 4px 0 0 0; font-size: 12px; color: #6B7280; font-family: Arial, Helvetica, sans-serif;">
                      Ordenadas por mayor días de retraso. Total en sistema: <strong>${totalAfectadas} referencias</strong>.
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Leyenda de badges -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 12px;">
                <tr>
                  <td>
                    <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; background-color: #DC2626; color: #FFFFFF; font-family: Arial, Helvetica, sans-serif; margin-right: 6px;">CRÍTICO &gt;30d</span>
                    <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; background-color: #EA580C; color: #FFFFFF; font-family: Arial, Helvetica, sans-serif; margin-right: 6px;">ALERTA 15-30d</span>
                    <span style="display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; background-color: #CA8A04; color: #FFFFFF; font-family: Arial, Helvetica, sans-serif;">SEGUIMIENTO &lt;15d</span>
                  </td>
                </tr>
              </table>

              <!-- Main Table -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse: collapse; border: 1px solid #E5E7EB; border-radius: 6px; overflow: hidden; font-size: 12px;">
                <thead>
                  <tr style="background-color: #281C19;">
                    <th style="padding: 12px 8px; text-align: center; font-size: 10px; font-weight: 700; color: #8CB32A; font-family: Arial, Helvetica, sans-serif; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">PRIORIDAD</th>
                    <th style="padding: 12px 8px; text-align: left; font-size: 10px; font-weight: 700; color: #8CB32A; font-family: Arial, Helvetica, sans-serif; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">REFERENCIA</th>
                    <th style="padding: 12px 8px; text-align: left; font-size: 10px; font-weight: 700; color: #009890; font-family: Arial, Helvetica, sans-serif; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; background-color: #0D2E2C;">OC</th>
                    <th style="padding: 12px 8px; text-align: left; font-size: 10px; font-weight: 700; color: #8CB32A; font-family: Arial, Helvetica, sans-serif; text-transform: uppercase; letter-spacing: 0.5px;">PROVEEDOR</th>
                    <th style="padding: 12px 8px; text-align: center; font-size: 10px; font-weight: 700; color: #8CB32A; font-family: Arial, Helvetica, sans-serif; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">DÍAS RET.</th>
                    <th style="padding: 12px 8px; text-align: right; font-size: 10px; font-weight: 700; color: #8CB32A; font-family: Arial, Helvetica, sans-serif; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;">VALOR PEND.</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRows}
                </tbody>
              </table>

              ${mainItems.length > 15 ? `
              <p style="margin: 8px 0 0 0; font-size: 11px; color: #9CA3AF; font-family: Arial, Helvetica, sans-serif; text-align: center; font-style: italic;">
                Mostrando Top 15 de mayor retraso. ${mainItems.length - 15} órdenes restantes no mostradas.
              </p>
              ` : ''}

              ${svrSection}
              `}

              <!-- Footer -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top: 32px; border-top: 1px solid #E5E7EB; padding-top: 20px;">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 11px; color: #9CA3AF; font-family: Arial, Helvetica, sans-serif;">
                      Este reporte es generado automáticamente por el <strong>Asset Tracker — Somos Bogotá Usme</strong>.
                      Gestión de Flota 260 Buses · 1.828 referencias · Sistema JIT
                    </p>
                    <p style="margin: 6px 0 0 0; font-size: 11px; color: #9CA3AF; font-family: Arial, Helvetica, sans-serif;">
                      Destinatario: gestor.compras1@somos.co · Generado: ${fechaStr}
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

        </table>
        <!-- End Container -->

      </td>
    </tr>
  </table>
  <!-- End Wrapper -->

</body>
</html>`;
}
