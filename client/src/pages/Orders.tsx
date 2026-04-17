import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Search, ShoppingCart, Bell, Wrench, Package, Settings } from "lucide-react";
import { useState, useMemo } from "react";

function formatCurrency(val: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val);
}

// Prioridades — Paleta corporativa + alertas
function getPrioridadBadge(p: string | null) {
  if (!p) return null;
  // CRITICO y REORDEN INMEDIATO usan rojo alerta (no corporativo, solo alertas críticas)
  // PRECAUCION usa naranja alerta
  // OPTIMO usa Lima corporativo
  // EXCESO usa Teal corporativo
  const map: Record<string, { bg: string; text: string; border: string; shadow: string }> = {
    "CRITICO":           { bg: "#fee2e2", text: "#991b1b", border: "#f87171", shadow: "0 0 6px rgba(239,68,68,0.4)" },
    "REORDEN INMEDIATO": { bg: "#fff7ed", text: "#9a3412", border: "#fb923c", shadow: "0 0 6px rgba(251,146,60,0.4)" },
    "PRECAUCION":        { bg: "#fefce8", text: "#854d0e", border: "#eab308", shadow: "0 0 6px rgba(234,179,8,0.3)" },
    "OPTIMO":            { bg: "#f0f9e8", text: "#281C19", border: "#8CB32A", shadow: "0 0 6px rgba(140,179,42,0.4)" },
    "EXCESO":            { bg: "#f0fdfb", text: "#134e4a", border: "#009890", shadow: "0 0 6px rgba(0,152,144,0.3)" },
  };
  const s = map[p];
  if (!s) return <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold border" style={{ background: '#f5f5f5', color: '#281C19', borderColor: '#ccc' }}>{p}</span>;
  return (
    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold border" style={{ background: s.bg, color: s.text, borderColor: s.border, boxShadow: s.shadow, fontFamily: "'Space Grotesk', sans-serif" }}>
      {p}
    </span>
  );
}

function getEstadoBadge(e: string | null) {
  if (!e) return null;
  const map: Record<string, { bg: string; text: string; border: string }> = {
    "PENDIENTE":     { bg: "#fefce8", text: "#854d0e", border: "#eab308" },
    "CASI COMPLETO": { bg: "#f0fdfb", text: "#134e4a", border: "#009890" },
    "VENCIDO":       { bg: "#fee2e2", text: "#991b1b", border: "#f87171" },
  };
  const s = map[e];
  if (!s) return <span className="inline-block px-2 py-0.5 rounded text-[10px] border" style={{ background: '#f5f5f5', color: '#281C19', borderColor: '#ccc' }}>{e}</span>;
  return (
    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold border" style={{ background: s.bg, color: s.text, borderColor: s.border, fontFamily: "'Space Grotesk', sans-serif" }}>
      {e}
    </span>
  );
}

// Badge de tipo de referencia — Paleta Corporativa
// NUEVO: Lima #8CB32A, texto oscuro #281C19, glow lima
// REPARADO: Oscuro #281C19, texto blanco, borde Lima neón
// SERVICIO: Teal #009890, texto blanco, glow teal
function getTipoBadge(tipo: string) {
  if (tipo === "REPARADO") {
    return (
      <span className="badge-reparado inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px]">
        <Wrench className="h-2.5 w-2.5" />REPARADO
      </span>
    );
  }
  if (tipo === "SERVICIO") {
    return (
      <span className="badge-servicio inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px]">
        <Settings className="h-2.5 w-2.5" />SERVICIO
      </span>
    );
  }
  return (
    <span className="badge-nuevo inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px]">
      <Package className="h-2.5 w-2.5" />NUEVO
    </span>
  );
}

// Resaltar el sufijo -R en la referencia — Paleta corporativa
function ReferenciaBadge({ ref: refStr }: { ref: string | null }) {
  if (!refStr) return <span className="text-xs" style={{ color: '#9ca3af' }}>—</span>;
  const hasR = refStr.match(/^(.+)(-R)$/i);
  if (hasR) {
    return (
      <span className="font-mono text-xs font-bold">
        <span style={{ color: '#009890' }}>{hasR[1]}</span>
        <span className="px-0.5 rounded font-bold" style={{ color: '#ffffff', background: '#281C19', border: '1px solid #8CB32A', boxShadow: '0 0 4px rgba(140,179,42,0.5)' }}>-R</span>
      </span>
    );
  }
  return <span className="font-mono text-xs font-bold" style={{ color: '#009890' }}>{refStr}</span>;
}

function CyberSelect({ value, onChange, placeholder, options }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-md appearance-none cursor-pointer"
      style={{
        fontFamily: "'Space Grotesk', sans-serif",
        background: '#f9fafb',
        border: '1px solid rgba(140,179,42,0.3)',
        color: '#281C19',
        padding: '0 2rem 0 0.75rem',
        fontSize: '0.875rem',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23009890' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
        outline: 'none',
      }}
      onFocus={(e) => { e.target.style.borderColor = '#8CB32A'; e.target.style.boxShadow = '0 0 0 2px rgba(140,179,42,0.15)'; }}
      onBlur={(e) => { e.target.style.borderColor = 'rgba(140,179,42,0.3)'; e.target.style.boxShadow = 'none'; }}
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

type TipoFiltro = 'TODOS' | 'NUEVO' | 'REPARADO' | 'SERVICIO';

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("");
  const [prioridad, setPrioridad] = useState("");
  const [tipoReferencia, setTipoReferencia] = useState<TipoFiltro>("TODOS");

  const input = useMemo(() => ({
    search: search || undefined,
    estado: estado || undefined,
    prioridad: prioridad || undefined,
    tipoReferencia: tipoReferencia !== "TODOS" ? tipoReferencia : undefined,
  }), [search, estado, prioridad, tipoReferencia]);

  const { data, isLoading } = trpc.orders.list.useQuery(input);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const notifyDelayed = trpc.notifications.sendDelayedOrdersAlert.useMutation({
    onSuccess: (res) => {
      if (res.sent) setAlertMsg(`Alerta enviada: ${res.count} órdenes con retraso`);
      else setAlertMsg(res.message || "Sin órdenes con retraso");
    },
    onError: () => setAlertMsg("Error al enviar notificación"),
  });

  const totalPendingValue = (data || []).reduce((s, o) => s + (o.valorPendiente || 0), 0);

  // Conteos por tipo para los botones de filtro
  const conteoNuevos = useMemo(() =>
    (data || []).filter(o => (o as any).tipoReferencia === 'NUEVO').length, [data]);
  const conteoReparados = useMemo(() =>
    (data || []).filter(o => (o as any).tipoReferencia === 'REPARADO').length, [data]);
  const conteoServicios = useMemo(() =>
    (data || []).filter(o => (o as any).tipoReferencia === 'SERVICIO').length, [data]);

  // Clases activas con paleta corporativa
  const tipoButtons: { key: TipoFiltro; label: string; count?: number; activeClass: string }[] = [
    { key: "TODOS",    label: "Todos",     count: data?.length,   activeClass: "active-lime" },
    { key: "NUEVO",    label: "Nuevos",    count: conteoNuevos,   activeClass: "active-lime" },
    { key: "REPARADO", label: "Reparados", count: conteoReparados, activeClass: "active-dark" },
    { key: "SERVICIO", label: "Servicios", count: conteoServicios, activeClass: "active-teal" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-6 w-6" style={{ color: '#8CB32A' }} />
          <h1 className="text-xl font-bold tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#281C19' }}>
            ÓRDENES PENDIENTES
          </h1>
          <span className="text-xs text-muted-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            {data?.length ?? "..."} órdenes — {formatCurrency(totalPendingValue)}
          </span>
        </div>
        <Button
          onClick={() => notifyDelayed.mutate()}
          disabled={notifyDelayed.isPending}
          className="gap-2 font-bold"
          style={{ background: '#281C19', color: '#ffffff', border: '1px solid #8CB32A', boxShadow: '0 0 8px rgba(140,179,42,0.3)', fontFamily: "'Space Grotesk', sans-serif" }}
          size="sm"
        >
          <Bell className="h-4 w-4" />
          {notifyDelayed.isPending ? "Enviando..." : "ALERTAR RETRASOS"}
        </Button>
      </div>

      {alertMsg && (
        <div className="p-3 rounded-lg border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {alertMsg}
          <button onClick={() => setAlertMsg(null)} className="ml-3 text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Filtros de tipo — NUEVO / REPARADO / SERVICIO */}
      <div className="flex flex-wrap gap-2">
        {tipoButtons.map(btn => (
          <button
            key={btn.key}
            onClick={() => setTipoReferencia(btn.key)}
            className={`filter-btn px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5 ${tipoReferencia === btn.key ? btn.activeClass : ''}`}
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {btn.key === "NUEVO" && <Package className="h-3 w-3" />}
            {btn.key === "REPARADO" && <Wrench className="h-3 w-3" />}
            {btn.key === "SERVICIO" && <Settings className="h-3 w-3" />}
            {btn.label}
            {btn.count !== undefined && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/10 text-[10px]">{btn.count}</span>
            )}
          </button>
        ))}
        {tipoReferencia === "SERVICIO" && (
          <span className="text-xs text-purple-300 self-center ml-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            ⚠ Estos servicios requieren cierre por Mantenimiento
          </span>
        )}
      </div>

      {/* Filtros de búsqueda */}
      <Card className="cyber-card p-4 rounded-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar OC, descripción, proveedor, referencia..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-cyber-dark border-neon-pink/20"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            />
          </div>
          <CyberSelect
            value={estado}
            onChange={(v) => setEstado(v)}
            placeholder="Todos los estados"
            options={[
              { value: "PENDIENTE",     label: "Pendiente" },
              { value: "CASI COMPLETO", label: "Casi Completo" },
              { value: "VENCIDO",       label: "Vencido" },
            ]}
          />
          <CyberSelect
            value={prioridad}
            onChange={(v) => setPrioridad(v)}
            placeholder="Todas las prioridades"
            options={[
              { value: "CRITICO",           label: "Crítico" },
              { value: "REORDEN INMEDIATO", label: "Reorden Inmediato" },
              { value: "PRECAUCION",        label: "Precaución" },
              { value: "OPTIMO",            label: "Óptimo" },
              { value: "EXCESO",            label: "Exceso" },
            ]}
          />
        </div>
      </Card>

      {/* Tabla */}
      <Card className="cyber-card rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-neon-pink" />
          </div>
        ) : (data || []).length === 0 ? (
          <div className="text-center py-16 text-muted-foreground" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            No se encontraron órdenes con los filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <thead>
                <tr className="table-header-corp border-b" style={{ borderColor: 'rgba(0,152,144,0.2)' }}>
                  <th className="text-left py-3 px-2 font-semibold text-xs">TIPO</th>
                  <th className="text-left py-3 px-2 font-semibold text-xs">OC</th>
                  <th className="text-left py-3 px-2 font-semibold text-xs">REFERENCIA</th>
                  <th className="text-left py-3 px-2 font-semibold text-xs">DESCRIPCIÓN</th>
                  <th className="text-left py-3 px-2 font-semibold text-xs">PROVEEDOR</th>
                  <th className="text-right py-3 px-2 font-semibold text-xs">PEDIDO</th>
                  <th className="text-right py-3 px-2 font-semibold text-xs">RECIBIDO</th>
                  <th className="text-right py-3 px-2 font-semibold text-xs">PENDIENTE</th>
                  <th className="text-right py-3 px-2 font-semibold text-xs">VALOR PEND.</th>
                  <th className="text-center py-3 px-2 font-semibold text-xs">CUMPL.</th>
                  <th className="text-center py-3 px-2 font-semibold text-xs">RETRASO</th>
                  <th className="text-center py-3 px-2 font-semibold text-xs">ESTADO</th>
                  <th className="text-center py-3 px-2 font-semibold text-xs">PRIORIDAD</th>
                </tr>
              </thead>
              <tbody>
                {(data || []).map((o, i) => {
                  const tipo = (o as any).tipoReferencia as string || 'NUEVO';
                  // Fondo de fila sutil con paleta corporativa
                  const rowBg = tipo === 'SERVICIO'
                    ? 'bg-teal-50'
                    : tipo === 'REPARADO'
                    ? 'bg-stone-50'
                    : '';
                  return (
                    <tr
                      key={`${o.ordenCompra}-${o.mainsaver}-${i}`}
                      className={`border-b transition-colors hover:bg-lime-50 ${(o.diasRetraso || 0) > 0 ? 'bg-red-50' : rowBg}`}
                      style={{ borderColor: 'rgba(140,179,42,0.12)' }}
                    >
                      <td className="py-2 px-2 text-center">{getTipoBadge(tipo)}</td>
                      <td className="py-2 px-2 font-mono text-xs font-bold" style={{ color: '#009890' }}>{o.ordenCompra}</td>
                      <td className="py-2 px-2 text-xs">
                        <ReferenciaBadge ref={o.mainsaver} />
                      </td>
                      <td className="py-2 px-2 text-xs max-w-[160px] truncate" title={o.descripcion ?? ""}>{o.descripcion}</td>
                      <td className="py-2 px-2 text-xs max-w-[140px] truncate text-muted-foreground" title={o.proveedor ?? ""}>{o.proveedor}</td>
                      <td className="py-2 px-2 text-right font-mono text-xs">{o.qtyOrdenada?.toFixed(0)}</td>
                      <td className="py-2 px-2 text-right font-mono text-xs" style={{ color: '#8CB32A' }}>{o.qtyRecibida?.toFixed(0)}</td>
                      <td className="py-2 px-2 text-right font-mono text-xs" style={{ color: '#9a3412' }}>{o.qtyPendiente?.toFixed(0)}</td>
                      <td className="py-2 px-2 text-right font-mono text-xs font-bold" style={{ color: '#281C19' }}>{formatCurrency(o.valorPendiente || 0)}</td>
                      <td className="py-2 px-2 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-xs font-mono">{((o.cumplimiento || 0) * 100).toFixed(0)}%</span>
                          <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${(o.cumplimiento || 0) * 100}%`, background: '#009890' }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className="font-mono text-xs font-bold" style={{ color: (o.diasRetraso || 0) > 90 ? '#991b1b' : (o.diasRetraso || 0) > 30 ? '#9a3412' : (o.diasRetraso || 0) > 0 ? '#854d0e' : '#8CB32A' }}>
                          {(o.diasRetraso || 0) > 0 ? `${o.diasRetraso}d` : "OK"}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">{getEstadoBadge(o.estado)}</td>
                      <td className="py-2 px-2 text-center">{getPrioridadBadge(o.prioridad)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Footer informativo */}
      <div className="text-xs text-right" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#6b7280' }}>
        <span className="inline-flex items-center gap-1 mr-4">
          <Package className="h-3 w-3" style={{ color: '#8CB32A' }} /> NUEVO = repuesto nuevo en espera de entrega
        </span>
        <span className="inline-flex items-center gap-1 mr-4">
          <Wrench className="h-3 w-3" style={{ color: '#281C19' }} /> REPARADO (-R) = repuesto en taller/reparación
        </span>
        <span className="inline-flex items-center gap-1">
          <Settings className="h-3 w-3" style={{ color: '#009890' }} /> SERVICIO (SVR) = requiere cierre por Mantenimiento
        </span>
      </div>
    </div>
  );
}
