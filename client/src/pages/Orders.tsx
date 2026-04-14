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

// Prioridades actualizadas con los valores reales del Drive
function getPrioridadBadge(p: string | null) {
  if (!p) return null;
  const map: Record<string, string> = {
    "CRITICO":           "bg-red-600/30 text-red-300 border-red-500/50",
    "REORDEN INMEDIATO": "bg-orange-500/30 text-orange-300 border-orange-500/50",
    "PRECAUCION":        "bg-yellow-500/30 text-yellow-300 border-yellow-500/50",
    "OPTIMO":            "bg-green-600/30 text-green-300 border-green-500/50",
    "EXCESO":            "bg-blue-500/30 text-blue-300 border-blue-500/50",
  };
  return <Badge variant="outline" className={`text-[10px] font-bold ${map[p] || "bg-gray-500/20 text-gray-300"}`}>{p}</Badge>;
}

function getEstadoBadge(e: string | null) {
  if (!e) return null;
  const map: Record<string, string> = {
    "PENDIENTE":    "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    "CASI COMPLETO":"bg-blue-500/20 text-blue-400 border-blue-500/30",
    "VENCIDO":      "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return <Badge variant="outline" className={`text-[10px] ${map[e] || ""}`}>{e}</Badge>;
}

// Badge de tipo de referencia: NUEVO (azul), REPARADO (ámbar), SERVICIO (morado)
function getTipoBadge(tipo: string) {
  if (tipo === "REPARADO") {
    return (
      <Badge variant="outline" className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border-amber-500/40 gap-1">
        <Wrench className="h-2.5 w-2.5" />REPARADO
      </Badge>
    );
  }
  if (tipo === "SERVICIO") {
    return (
      <Badge variant="outline" className="text-[10px] font-bold bg-purple-500/20 text-purple-300 border-purple-500/40 gap-1">
        <Settings className="h-2.5 w-2.5" />SERVICIO
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[10px] font-bold bg-blue-500/20 text-blue-300 border-blue-500/40 gap-1">
      <Package className="h-2.5 w-2.5" />NUEVO
    </Badge>
  );
}

// Resaltar el sufijo -R en la referencia
function ReferenciaBadge({ ref: refStr }: { ref: string | null }) {
  if (!refStr) return <span className="text-muted-foreground/40 text-xs">—</span>;
  const hasR = refStr.match(/^(.+)(-R)$/i);
  if (hasR) {
    return (
      <span className="font-mono text-xs font-bold">
        <span className="text-neon-cyan">{hasR[1]}</span>
        <span className="text-amber-400 bg-amber-500/20 px-0.5 rounded">-R</span>
      </span>
    );
  }
  return <span className="font-mono text-neon-cyan text-xs font-bold">{refStr}</span>;
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
      className="h-9 w-full rounded-md border border-neon-pink/20 bg-cyber-dark px-3 py-1 text-sm text-foreground shadow-xs outline-none focus:border-neon-pink/50 focus:ring-1 focus:ring-neon-pink/30 appearance-none cursor-pointer"
      style={{ fontFamily: "Rajdhani", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23ff2d95' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
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

  const tipoButtons: { key: TipoFiltro; label: string; count?: number; color: string }[] = [
    { key: "TODOS",    label: "Todos",    count: data?.length,  color: tipoReferencia === "TODOS"    ? "bg-neon-pink/30 border-neon-pink text-neon-pink"    : "bg-transparent border-neon-pink/20 text-muted-foreground hover:border-neon-pink/50" },
    { key: "NUEVO",    label: "Nuevos",   count: conteoNuevos,  color: tipoReferencia === "NUEVO"    ? "bg-blue-500/30 border-blue-400 text-blue-300"       : "bg-transparent border-blue-500/20 text-muted-foreground hover:border-blue-400/50" },
    { key: "REPARADO", label: "Reparados",count: conteoReparados,color:tipoReferencia === "REPARADO" ? "bg-amber-500/30 border-amber-400 text-amber-300"    : "bg-transparent border-amber-500/20 text-muted-foreground hover:border-amber-400/50" },
    { key: "SERVICIO", label: "Servicios",count: conteoServicios,color:tipoReferencia === "SERVICIO" ? "bg-purple-500/30 border-purple-400 text-purple-300" : "bg-transparent border-purple-500/20 text-muted-foreground hover:border-purple-400/50" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-6 w-6 text-neon-yellow" />
          <h1 className="text-xl font-bold text-neon-cyan tracking-wider" style={{ fontFamily: "Orbitron" }}>
            ÓRDENES PENDIENTES
          </h1>
          <span className="text-xs text-muted-foreground" style={{ fontFamily: "Rajdhani" }}>
            {data?.length ?? "..."} órdenes — {formatCurrency(totalPendingValue)}
          </span>
        </div>
        <Button
          onClick={() => notifyDelayed.mutate()}
          disabled={notifyDelayed.isPending}
          className="bg-neon-pink/20 border border-neon-pink/40 text-neon-pink hover:bg-neon-pink/30 gap-2"
          style={{ fontFamily: "Orbitron" }}
          size="sm"
        >
          <Bell className="h-4 w-4" />
          {notifyDelayed.isPending ? "Enviando..." : "ALERTAR RETRASOS"}
        </Button>
      </div>

      {alertMsg && (
        <div className="p-3 rounded-lg border border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan text-sm" style={{ fontFamily: "Rajdhani" }}>
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
            className={`px-3 py-1.5 rounded-md border text-xs font-bold transition-all flex items-center gap-1.5 ${btn.color}`}
            style={{ fontFamily: "Rajdhani" }}
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
          <span className="text-xs text-purple-300 self-center ml-2" style={{ fontFamily: "Rajdhani" }}>
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
              style={{ fontFamily: "Rajdhani" }}
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
          <div className="text-center py-16 text-muted-foreground" style={{ fontFamily: "Rajdhani" }}>
            No se encontraron órdenes con los filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ fontFamily: "Rajdhani" }}>
              <thead>
                <tr className="border-b border-neon-pink/20 bg-neon-pink/5">
                  <th className="text-left py-3 px-2 text-neon-pink font-semibold text-xs">TIPO</th>
                  <th className="text-left py-3 px-2 text-neon-pink font-semibold text-xs">OC</th>
                  <th className="text-left py-3 px-2 text-neon-pink font-semibold text-xs">REFERENCIA</th>
                  <th className="text-left py-3 px-2 text-neon-pink font-semibold text-xs">DESCRIPCIÓN</th>
                  <th className="text-left py-3 px-2 text-neon-pink font-semibold text-xs">PROVEEDOR</th>
                  <th className="text-right py-3 px-2 text-neon-pink font-semibold text-xs">PEDIDO</th>
                  <th className="text-right py-3 px-2 text-neon-pink font-semibold text-xs">RECIBIDO</th>
                  <th className="text-right py-3 px-2 text-neon-pink font-semibold text-xs">PENDIENTE</th>
                  <th className="text-right py-3 px-2 text-neon-pink font-semibold text-xs">VALOR PEND.</th>
                  <th className="text-center py-3 px-2 text-neon-pink font-semibold text-xs">CUMPL.</th>
                  <th className="text-center py-3 px-2 text-neon-pink font-semibold text-xs">RETRASO</th>
                  <th className="text-center py-3 px-2 text-neon-pink font-semibold text-xs">ESTADO</th>
                  <th className="text-center py-3 px-2 text-neon-pink font-semibold text-xs">PRIORIDAD</th>
                </tr>
              </thead>
              <tbody>
                {(data || []).map((o, i) => {
                  const tipo = (o as any).tipoReferencia as string || 'NUEVO';
                  const rowBg = tipo === 'SERVICIO'
                    ? 'bg-purple-500/5'
                    : tipo === 'REPARADO'
                    ? 'bg-amber-500/5'
                    : '';
                  return (
                    <tr
                      key={`${o.ordenCompra}-${o.mainsaver}-${i}`}
                      className={`border-b border-border/20 hover:bg-neon-cyan/5 transition-colors ${(o.diasRetraso || 0) > 0 ? "bg-red-500/5" : rowBg}`}
                    >
                      <td className="py-2 px-2 text-center">{getTipoBadge(tipo)}</td>
                      <td className="py-2 px-2 font-mono text-neon-cyan text-xs">{o.ordenCompra}</td>
                      <td className="py-2 px-2 text-xs">
                        <ReferenciaBadge ref={o.mainsaver} />
                      </td>
                      <td className="py-2 px-2 text-xs max-w-[160px] truncate" title={o.descripcion ?? ""}>{o.descripcion}</td>
                      <td className="py-2 px-2 text-xs max-w-[140px] truncate text-muted-foreground" title={o.proveedor ?? ""}>{o.proveedor}</td>
                      <td className="py-2 px-2 text-right font-mono text-xs">{o.qtyOrdenada?.toFixed(0)}</td>
                      <td className="py-2 px-2 text-right font-mono text-neon-green text-xs">{o.qtyRecibida?.toFixed(0)}</td>
                      <td className="py-2 px-2 text-right font-mono text-orange-400 text-xs">{o.qtyPendiente?.toFixed(0)}</td>
                      <td className="py-2 px-2 text-right font-mono text-neon-cyan text-xs">{formatCurrency(o.valorPendiente || 0)}</td>
                      <td className="py-2 px-2 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="text-xs font-mono">{((o.cumplimiento || 0) * 100).toFixed(0)}%</span>
                          <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-neon-cyan rounded-full" style={{ width: `${(o.cumplimiento || 0) * 100}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={`font-mono text-xs font-bold ${(o.diasRetraso || 0) > 90 ? "text-red-400" : (o.diasRetraso || 0) > 30 ? "text-orange-400" : (o.diasRetraso || 0) > 0 ? "text-yellow-400" : "text-green-400"}`}>
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
      <div className="text-xs text-muted-foreground/60 text-right" style={{ fontFamily: "Rajdhani" }}>
        <span className="inline-flex items-center gap-1 mr-4">
          <Package className="h-3 w-3 text-blue-400" /> NUEVO = repuesto nuevo en espera de entrega
        </span>
        <span className="inline-flex items-center gap-1 mr-4">
          <Wrench className="h-3 w-3 text-amber-400" /> REPARADO (-R) = repuesto en taller/reparación
        </span>
        <span className="inline-flex items-center gap-1">
          <Settings className="h-3 w-3 text-purple-400" /> SERVICIO (SVR) = requiere cierre por Mantenimiento
        </span>
      </div>
    </div>
  );
}
