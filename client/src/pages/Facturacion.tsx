import { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { VegaChart, pieSpec, hbarSpec, barSpec, CORP_COLORS } from "@/components/VegaChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Search,
  DollarSign,
  FileStack,
  Building2,
  TrendingUp,
  Loader2,
  Download,
} from "lucide-react";

function formatCurrency(n: number | null | undefined): string {
  if (n === null || n === undefined) return "$0";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Math.abs(n));
}

function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return "0";
  return new Intl.NumberFormat("es-CO").format(n);
}

function KpiCard({ icon: Icon, label, value, sub, color }: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white p-5 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight text-slate-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {value}
        </p>
        <p className="text-xs text-slate-500 mt-1">{label}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// Simple CSV export helper
function downloadCSV(data: any[], columns: { key: string; header: string }[], filename: string) {
  const header = columns.map(c => c.header).join(",");
  const rows = data.map(row =>
    columns.map(c => {
      const val = row[c.key];
      if (val === null || val === undefined) return "";
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    }).join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function FacturacionPage() {
  const [activeTab, setActiveTab] = useState("oc");
  const [searchOC, setSearchOC] = useState("");
  const [searchOCS, setSearchOCS] = useState("");

  const { data: kpis, isLoading: kpisLoading } = trpc.facturacion.kpis.useQuery();
  const { data: ocData, isLoading: ocLoading } = trpc.facturacion.oc.useQuery(
    searchOC.length >= 3 ? { search: searchOC } : undefined
  );
  const { data: ocsData, isLoading: ocsLoading } = trpc.facturacion.ocs.useQuery(
    searchOCS.length >= 3 ? { search: searchOCS } : undefined
  );
  const { data: resumen, isLoading: resumenLoading } = trpc.facturacion.resumen.useQuery();

  // Charts
  const donutData = useMemo(() => {
    if (!kpis) return null;
    return pieSpec(
      [
        { label: "OC (Compras)", value: kpis.oc?.totalNeto || 0 },
        { label: "OCS (Servicios)", value: kpis.ocs?.totalNeto || 0 },
      ],
      { title: "Distribución OC vs OCS", width: 300, height: 220 }
    );
  }, [kpis]);

  const topProvData = useMemo(() => {
    if (!resumen || resumen.length === 0) return null;
    const top10 = resumen.slice(0, 10).reverse();
    return hbarSpec(
      top10.map((p) => ({
        label: p.proveedor.length > 30 ? p.proveedor.substring(0, 28) + "…" : p.proveedor,
        value: p.totalNeto,
      })),
      { title: "Top 10 Proveedores por Valor Neto", width: 500, height: 280 }
    );
  }, [resumen]);

  const estadosOCData = useMemo(() => {
    if (!ocData || ocData.length === 0) return null;
    const estadoMap = new Map<string, number>();
    for (const item of ocData) {
      const estado = item.estado || "Sin estado";
      estadoMap.set(estado, (estadoMap.get(estado) || 0) + 1);
    }
    return barSpec(
      Array.from(estadoMap.entries()).map(([label, value]) => ({ label, value })),
      { title: "OC por Estado", width: 400, height: 220 }
    );
  }, [ocData]);

  const handleExportOC = useCallback(() => {
    if (!ocData) return;
    downloadCSV(ocData, [
      { key: "documento", header: "Documento" },
      { key: "referencia", header: "Referencia" },
      { key: "descItem", header: "Descripción" },
      { key: "proveedor", header: "Proveedor" },
      { key: "cantidad", header: "Cantidad" },
      { key: "precioUnit", header: "Precio Unit." },
      { key: "valorSubtotal", header: "Subtotal" },
      { key: "valorNeto", header: "Neto" },
      { key: "comprador", header: "Comprador" },
      { key: "estado", header: "Estado" },
    ], "facturacion_oc");
  }, [ocData]);

  const handleExportOCS = useCallback(() => {
    if (!ocsData) return;
    downloadCSV(ocsData, [
      { key: "nroDocto", header: "Nro. Docto" },
      { key: "referencia", header: "Referencia" },
      { key: "descServicio", header: "Servicio" },
      { key: "razonSocial", header: "Proveedor" },
      { key: "subtotal", header: "Subtotal" },
      { key: "valorNeto", header: "Neto" },
      { key: "estado", header: "Estado" },
      { key: "fecha", header: "Fecha" },
    ], "facturacion_ocs");
  }, [ocsData]);

  if (kpisLoading) {
    return (
      <div className="flex items-center justify-center h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: CORP_COLORS.green }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Pendiente por Facturar
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            OC y OCS pendientes de pago — sincronizado desde Google Sheets
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={DollarSign}
          label="Total OC (Sin IVA)"
          value={formatCurrency(kpis?.oc?.totalSubtotal)}
          sub={`${formatNumber(kpis?.oc?.totalOC)} líneas · ${formatNumber(kpis?.oc?.docsUnicos)} documentos`}
          color={CORP_COLORS.green}
        />
        <KpiCard
          icon={FileStack}
          label="Total OCS (Sin IVA)"
          value={formatCurrency(kpis?.ocs?.totalSubtotal)}
          sub={`${formatNumber(kpis?.ocs?.totalOCS)} líneas · ${formatNumber(kpis?.ocs?.docsUnicos)} documentos`}
          color={CORP_COLORS.teal}
        />
        <KpiCard
          icon={Building2}
          label="Documentos Únicos"
          value={formatNumber(kpis?.docsTotales)}
          sub="OC + OCS combinados"
          color="#3b82f6"
        />
        <KpiCard
          icon={TrendingUp}
          label="Total Neto Combinado"
          value={formatCurrency(kpis?.totalCombinado)}
          sub="Valor con impuestos incluidos"
          color="#ef4444"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {donutData && (
          <div className="rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm">
            <VegaChart spec={donutData} />
          </div>
        )}
        {estadosOCData && (
          <div className="rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm">
            <VegaChart spec={estadosOCData} />
          </div>
        )}
        {topProvData && (
          <div className="rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm lg:col-span-1">
            <VegaChart spec={topProvData} />
          </div>
        )}
      </div>

      {/* Tabs: OC | OCS | Resumen */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100 border border-slate-200/70">
          <TabsTrigger value="oc" className="data-[state=active]:bg-white data-[state=active]:text-[#8CB32A] data-[state=active]:shadow-sm">
            OC — Compras ({formatNumber(kpis?.oc?.totalOC)})
          </TabsTrigger>
          <TabsTrigger value="ocs" className="data-[state=active]:bg-white data-[state=active]:text-[#009890] data-[state=active]:shadow-sm">
            OCS — Servicios ({formatNumber(kpis?.ocs?.totalOCS)})
          </TabsTrigger>
          <TabsTrigger value="resumen" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
            Resumen Proveedores
          </TabsTrigger>
        </TabsList>

        {/* Tab OC */}
        <TabsContent value="oc" className="mt-4">
          <div className="rounded-xl border border-slate-200/70 bg-white shadow-sm">
            <div className="flex items-center gap-3 p-4 border-b border-slate-100">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar referencia, proveedor, documento..."
                  value={searchOC}
                  onChange={(e) => setSearchOC(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#8CB32A]/30 focus:border-[#8CB32A]/50"
                />
              </div>
              <button
                onClick={handleExportOC}
                disabled={!ocData || ocData.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  background: "rgba(0,152,144,0.1)",
                  color: "#009890",
                  border: "1px solid rgba(0,152,144,0.3)",
                }}
              >
                <Download className="h-3.5 w-3.5" />
                Exportar CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Documento</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Referencia</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Descripción</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Proveedor</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider text-right">Cantidad</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider text-right">Subtotal</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider text-right">Neto</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Comprador</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {ocLoading ? (
                    <tr><td colSpan={9} className="text-center py-8 text-slate-400"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></td></tr>
                  ) : !ocData || ocData.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-8 text-slate-400">No hay datos de OC. Sincronice primero.</td></tr>
                  ) : (
                    ocData.slice(0, 100).map((item, i) => (
                      <tr key={item.id ?? i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{item.documento || "—"}</td>
                        <td className="px-4 py-2.5 text-xs font-medium text-slate-800">{item.referencia?.trim() || "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-600 max-w-[200px] truncate">{item.descItem || "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-600 max-w-[180px] truncate">{item.proveedor || "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-right font-mono">{formatNumber(item.cantidad)}</td>
                        <td className="px-4 py-2.5 text-xs text-right font-mono">{formatCurrency(item.valorSubtotal)}</td>
                        <td className="px-4 py-2.5 text-xs text-right font-mono font-medium">{formatCurrency(item.valorNeto)}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{item.comprador || "—"}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            item.estado === "Contabilizado" ? "bg-emerald-50 text-emerald-700" :
                            item.estado === "Confirmada" ? "bg-blue-50 text-blue-700" :
                            "bg-slate-100 text-slate-600"
                          }`}>
                            {item.estado || "—"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {ocData && ocData.length > 100 && (
                <div className="px-4 py-3 text-xs text-slate-400 border-t border-slate-100">
                  Mostrando 100 de {formatNumber(ocData.length)} registros. Use el buscador para filtrar.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab OCS */}
        <TabsContent value="ocs" className="mt-4">
          <div className="rounded-xl border border-slate-200/70 bg-white shadow-sm">
            <div className="flex items-center gap-3 p-4 border-b border-slate-100">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar servicio, proveedor, documento..."
                  value={searchOCS}
                  onChange={(e) => setSearchOCS(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#009890]/30 focus:border-[#009890]/50"
                />
              </div>
              <button
                onClick={handleExportOCS}
                disabled={!ocsData || ocsData.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  background: "rgba(0,152,144,0.1)",
                  color: "#009890",
                  border: "1px solid rgba(0,152,144,0.3)",
                }}
              >
                <Download className="h-3.5 w-3.5" />
                Exportar CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Nro. Docto</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Referencia</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Servicio</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Proveedor</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider text-right">Subtotal</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider text-right">Neto</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Estado</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {ocsLoading ? (
                    <tr><td colSpan={8} className="text-center py-8 text-slate-400"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></td></tr>
                  ) : !ocsData || ocsData.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-8 text-slate-400">No hay datos de OCS. Sincronice primero.</td></tr>
                  ) : (
                    ocsData.slice(0, 100).map((item, i) => (
                      <tr key={item.id ?? i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{item.nroDocto || "—"}</td>
                        <td className="px-4 py-2.5 text-xs font-medium text-slate-800">{item.referencia || "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-600 max-w-[200px] truncate">{item.descServicio || "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-600 max-w-[180px] truncate">{item.razonSocial || "—"}</td>
                        <td className="px-4 py-2.5 text-xs text-right font-mono">{formatCurrency(item.subtotal)}</td>
                        <td className="px-4 py-2.5 text-xs text-right font-mono font-medium">{formatCurrency(item.valorNeto)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                            item.estado === "Confirmada" ? "bg-blue-50 text-blue-700" :
                            item.estado === "Contabilizado" ? "bg-emerald-50 text-emerald-700" :
                            "bg-slate-100 text-slate-600"
                          }`}>
                            {item.estado || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-slate-500">{item.fecha || "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {ocsData && ocsData.length > 100 && (
                <div className="px-4 py-3 text-xs text-slate-400 border-t border-slate-100">
                  Mostrando 100 de {formatNumber(ocsData.length)} registros.
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Tab Resumen Proveedores */}
        <TabsContent value="resumen" className="mt-4">
          <div className="rounded-xl border border-slate-200/70 bg-white shadow-sm">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">Resumen Total por Proveedor — OC + OCS</h3>
              <p className="text-xs text-slate-400 mt-0.5">Totales acumulados pendientes por facturar</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left">
                    <th className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">#</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider">Proveedor</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider text-right">OC (Sin IVA)</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider text-right">OCS (Sin IVA)</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider text-right">Total Neto</th>
                    <th className="px-4 py-3 font-medium text-slate-500 text-xs uppercase tracking-wider text-right">% del Total</th>
                  </tr>
                </thead>
                <tbody>
                  {resumenLoading ? (
                    <tr><td colSpan={6} className="text-center py-8 text-slate-400"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></td></tr>
                  ) : !resumen || resumen.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-8 text-slate-400">No hay datos de proveedores. Sincronice primero.</td></tr>
                  ) : (() => {
                    const grandTotal = resumen.reduce((sum, p) => sum + p.totalNeto, 0);
                    return resumen.map((prov, i) => {
                      const pct = grandTotal > 0 ? ((prov.totalNeto / grandTotal) * 100) : 0;
                      return (
                        <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-2.5 text-xs text-slate-400 font-mono">{i + 1}</td>
                          <td className="px-4 py-2.5 text-xs font-medium text-slate-800">{prov.proveedor}</td>
                          <td className="px-4 py-2.5 text-xs text-right font-mono">{formatCurrency(prov.ocSubtotal)}</td>
                          <td className="px-4 py-2.5 text-xs text-right font-mono">{formatCurrency(prov.ocsSubtotal)}</td>
                          <td className="px-4 py-2.5 text-xs text-right font-mono font-semibold">{formatCurrency(prov.totalNeto)}</td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: CORP_COLORS.green }}
                                />
                              </div>
                              <span className="text-xs text-slate-500 font-mono w-12 text-right">{pct.toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
