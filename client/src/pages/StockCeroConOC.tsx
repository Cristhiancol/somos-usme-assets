import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { useState, useMemo } from "react";
import { AlertTriangle, Siren, ShoppingCart, Banknote, Search } from "lucide-react";

// ── Paleta corporativa para prioridades ─────────────────────────────
const PRIORIDAD_STYLE: Record<string, { bg: string; text: string; border: string; shadow: string }> = {
  "CRITICO":           { bg: "#fee2e2", text: "#991b1b", border: "#f87171", shadow: "0 0 6px rgba(239,68,68,0.4)" },
  "REORDEN INMEDIATO": { bg: "#fff7ed", text: "#9a3412", border: "#fb923c", shadow: "0 0 6px rgba(251,146,60,0.4)" },
  "PRECAUCION":        { bg: "#fefce8", text: "#854d0e", border: "#eab308", shadow: "0 0 6px rgba(234,179,8,0.3)" },
  "OPTIMO":            { bg: "#f0f9e8", text: "#281C19", border: "#8CB32A", shadow: "0 0 6px rgba(140,179,42,0.4)" },
  "EXCESO":            { bg: "#f0fdfb", text: "#134e4a", border: "#009890", shadow: "0 0 6px rgba(0,152,144,0.3)" },
};

function PrioridadBadge({ prioridad }: { prioridad: string | null }) {
  const p = (prioridad || "").toUpperCase();
  const s = PRIORIDAD_STYLE[p];
  if (!s) return (
    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold border"
      style={{ background: '#f5f5f5', color: '#281C19', borderColor: '#ccc', fontFamily: "'Space Grotesk', sans-serif" }}>
      {prioridad || "—"}
    </span>
  );
  return (
    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold border"
      style={{ background: s.bg, color: s.text, borderColor: s.border, boxShadow: s.shadow, fontFamily: "'Space Grotesk', sans-serif" }}>
      {prioridad}
    </span>
  );
}

function EstadoBadge({ estado }: { estado: string | null }) {
  const e = (estado || "").toUpperCase();
  const map: Record<string, { bg: string; text: string; border: string }> = {
    "PENDIENTE":     { bg: "#fefce8", text: "#854d0e", border: "#eab308" },
    "CASI COMPLETO": { bg: "#f0fdfb", text: "#134e4a", border: "#009890" },
    "VENCIDO":       { bg: "#fee2e2", text: "#991b1b", border: "#f87171" },
  };
  const s = map[e];
  if (!s) return (
    <span className="inline-block px-2 py-0.5 rounded text-[10px] border"
      style={{ background: '#f5f5f5', color: '#281C19', borderColor: '#ccc', fontFamily: "'Space Grotesk', sans-serif" }}>
      {estado || "—"}
    </span>
  );
  return (
    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold border"
      style={{ background: s.bg, color: s.text, borderColor: s.border, fontFamily: "'Space Grotesk', sans-serif" }}>
      {estado}
    </span>
  );
}

function formatCurrency(val: number | null) {
  if (!val) return "$0";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val);
}

export default function StockCeroConOC() {
  const { data, isLoading } = trpc.inventory.stockCeroConOC.useQuery();
  const [search, setSearch] = useState("");
  const [filterPrioridad, setFilterPrioridad] = useState<string>("TODAS");

  const prioridades = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.map(r => (r.prioridadOC || "").toUpperCase()));
    return ["TODAS", ...Array.from(set).sort()];
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter(r => {
      const matchSearch =
        !search ||
        (r.referencia || "").toLowerCase().includes(search.toLowerCase()) ||
        (r.descripcion || "").toLowerCase().includes(search.toLowerCase()) ||
        (r.proveedorOC || "").toLowerCase().includes(search.toLowerCase()) ||
        (r.ordenCompra || "").toLowerCase().includes(search.toLowerCase());
      const matchPrioridad =
        filterPrioridad === "TODAS" ||
        (r.prioridadOC || "").toUpperCase() === filterPrioridad;
      return matchSearch && matchPrioridad;
    });
  }, [data, search, filterPrioridad]);

  const criticos = useMemo(() => filtered.filter(r => (r.prioridadOC || "").toUpperCase() === "CRITICO").length, [filtered]);
  const reordenInmediato = useMemo(() => filtered.filter(r => (r.prioridadOC || "").toUpperCase() === "REORDEN INMEDIATO").length, [filtered]);
  const valorTotal = useMemo(() => filtered.reduce((s, r) => s + (r.valorPendiente || 0), 0), [filtered]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Siren className="h-6 w-6 animate-pulse-neon" style={{ color: '#dc2626' }} />
          <h1 className="text-xl font-bold tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#281C19' }}>
            STOCK CERO — OC ACTIVA
          </h1>
        </div>
        <p className="text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#6b7280' }}>
          Referencias sin stock con Orden de Compra pendiente — presionar al proveedor
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="kpi-card-corp rounded-xl" style={{ borderLeft: '3px solid #dc2626' }}>
          <CardContent className="pt-4 pb-3">
            <AlertTriangle className="h-4 w-4 mb-2" style={{ color: '#dc2626' }} />
            <div className="text-xs mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#6b7280' }}>TOTAL AFECTADAS</div>
            <div className="text-3xl font-black" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#dc2626' }}>
              {isLoading ? "..." : (data?.length ?? 0)}
            </div>
            <div className="text-[10px] mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#9ca3af' }}>refs stock=0 + OC activa</div>
          </CardContent>
        </Card>
        <Card className="kpi-card-corp rounded-xl" style={{ borderLeft: '3px solid #f87171' }}>
          <CardContent className="pt-4 pb-3">
            <AlertTriangle className="h-4 w-4 mb-2" style={{ color: '#f87171' }} />
            <div className="text-xs mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#6b7280' }}>CRÍTICO</div>
            <div className="text-3xl font-black" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#f87171' }}>{criticos}</div>
            <div className="text-[10px] mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#9ca3af' }}>acción inmediata</div>
          </CardContent>
        </Card>
        <Card className="kpi-card-corp rounded-xl" style={{ borderLeft: '3px solid #fb923c' }}>
          <CardContent className="pt-4 pb-3">
            <ShoppingCart className="h-4 w-4 mb-2" style={{ color: '#fb923c' }} />
            <div className="text-xs mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#6b7280' }}>REORDEN INMEDIATO</div>
            <div className="text-3xl font-black" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#fb923c' }}>{reordenInmediato}</div>
            <div className="text-[10px] mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#9ca3af' }}>presionar proveedor</div>
          </CardContent>
        </Card>
        <Card className="kpi-card-corp rounded-xl" style={{ borderLeft: '3px solid #8CB32A' }}>
          <CardContent className="pt-4 pb-3">
            <Banknote className="h-4 w-4 mb-2" style={{ color: '#8CB32A' }} />
            <div className="text-xs mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#6b7280' }}>VALOR PENDIENTE</div>
            <div className="text-xl font-black" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#8CB32A' }}>
              {isLoading ? "..." : formatCurrency(valorTotal)}
            </div>
            <div className="text-[10px] mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#9ca3af' }}>en órdenes activas</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: '#009890' }} />
          <input
            type="text"
            placeholder="Buscar por referencia, descripción, proveedor u OC..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="cyber-input w-full h-9 pl-9 pr-3 rounded-md text-sm"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {prioridades.map(p => {
            const isActive = filterPrioridad === p;
            const s = PRIORIDAD_STYLE[p];
            return (
              <button
                key={p}
                onClick={() => setFilterPrioridad(p)}
                className="px-3 py-1.5 rounded text-xs font-bold border transition-all"
                style={{
                  fontFamily: "'Space Grotesk', sans-serif",
                  background: isActive ? (s ? s.bg : 'rgba(0,152,144,0.12)') : '#ffffff',
                  color: isActive ? (s ? s.text : '#009890') : '#6b7280',
                  borderColor: isActive ? (s ? s.border : '#009890') : 'rgba(140,179,42,0.3)',
                  boxShadow: isActive ? (s ? s.shadow : '0 0 8px rgba(0,152,144,0.3)') : 'none',
                }}
              >
                {p}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tabla */}
      <Card className="cyber-card rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="text-center py-20 animate-pulse" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#009890' }}>
            Cargando datos del cruce inventario × órdenes...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#9ca3af' }}>
            No se encontraron referencias con los filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <thead>
                <tr className="table-header-corp border-b" style={{ borderColor: 'rgba(0,152,144,0.2)' }}>
                  <th className="text-left px-3 py-3 font-semibold">PRIORIDAD OC</th>
                  <th className="text-left px-3 py-3 font-semibold">REFERENCIA</th>
                  <th className="text-left px-3 py-3 font-semibold">DESCRIPCIÓN</th>
                  <th className="text-left px-3 py-3 font-semibold">OC</th>
                  <th className="text-left px-3 py-3 font-semibold">PROVEEDOR</th>
                  <th className="text-right px-3 py-3 font-semibold">DÍAS RETRASO</th>
                  <th className="text-right px-3 py-3 font-semibold">QTY PEND.</th>
                  <th className="text-right px-3 py-3 font-semibold">VALOR PEND.</th>
                  <th className="text-left px-3 py-3 font-semibold">ESTADO OC</th>
                  <th className="text-left px-3 py-3 font-semibold">COMPRADOR</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const diasRetraso = r.diasRetraso ?? 0;
                  const retrasoColor =
                    diasRetraso > 90 ? '#991b1b' :
                    diasRetraso > 30 ? '#9a3412' :
                    diasRetraso > 0  ? '#854d0e' : '#8CB32A';
                  return (
                    <tr
                      key={`${r.referencia}-${r.ordenCompra}-${i}`}
                      className="border-b transition-colors hover:bg-lime-50"
                      style={{ borderColor: 'rgba(140,179,42,0.12)' }}
                    >
                      <td className="px-3 py-2.5">
                        <PrioridadBadge prioridad={r.prioridadOC} />
                      </td>
                      <td className="px-3 py-2.5 font-bold" style={{ color: '#009890' }}>
                        {r.referencia}
                      </td>
                      <td className="px-3 py-2.5 max-w-[200px] truncate" title={r.descripcion ?? ""} style={{ color: '#281C19' }}>
                        {r.descripcion}
                      </td>
                      <td className="px-3 py-2.5 font-bold" style={{ color: '#8CB32A' }}>
                        {r.ordenCompra}
                      </td>
                      <td className="px-3 py-2.5 max-w-[160px] truncate" title={r.proveedorOC ?? ""} style={{ color: '#6b7280' }}>
                        {r.proveedorOC}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold" style={{ color: retrasoColor }}>
                        {diasRetraso > 0 ? `${diasRetraso}d` : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right" style={{ color: '#281C19' }}>
                        {r.qtyPendiente?.toLocaleString("es-CO") ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-bold" style={{ color: '#281C19' }}>
                        {formatCurrency(r.valorPendiente)}
                      </td>
                      <td className="px-3 py-2.5">
                        <EstadoBadge estado={r.estadoOC} />
                      </td>
                      <td className="px-3 py-2.5" style={{ color: '#6b7280' }}>
                        {r.comprador}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Footer */}
      <div className="text-xs text-right" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#9ca3af' }}>
        Mostrando {filtered.length} de {data?.length ?? 0} referencias | Cruce: inventario × órdenes de compra activas
      </div>
    </div>
  );
}
