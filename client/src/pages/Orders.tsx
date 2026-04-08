import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Search, ShoppingCart, Bell } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

function formatCurrency(val: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val);
}

function getPrioridadBadge(p: string | null) {
  if (!p) return null;
  const map: Record<string, string> = {
    CRITICO: "bg-red-500/20 text-red-400 border-red-500/30",
    URGENTE: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    NORMAL: "bg-green-500/20 text-green-400 border-green-500/30",
  };
  return <Badge variant="outline" className={`text-[10px] ${map[p] || ""}`}>{p}</Badge>;
}

function getEstadoBadge(e: string | null) {
  if (!e) return null;
  const map: Record<string, string> = {
    PENDIENTE: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    "RECIBIDO PARCIAL": "bg-blue-500/20 text-blue-400 border-blue-500/30",
    VENCIDO: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return <Badge variant="outline" className={`text-[10px] ${map[e] || ""}`}>{e}</Badge>;
}

export default function OrdersPage() {
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("");
  const [prioridad, setPrioridad] = useState("");

  const input = useMemo(() => ({
    search: search || undefined,
    estado: estado || undefined,
    prioridad: prioridad || undefined,
  }), [search, estado, prioridad]);

  const { data, isLoading } = trpc.orders.list.useQuery(input);
  const notifyDelayed = trpc.notifications.sendDelayedOrdersAlert.useMutation({
    onSuccess: (res) => {
      if (res.sent) toast.success(`Alerta enviada: ${res.count} órdenes con retraso`);
      else toast.info(res.message);
    },
    onError: () => toast.error("Error al enviar notificación"),
  });

  const totalPendingValue = (data || []).reduce((s, o) => s + (o.valorPendiente || 0), 0);

  return (
    <div className="space-y-6">
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

      {/* Filters */}
      <Card className="cyber-card p-4 rounded-xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar OC, descripción, proveedor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-cyber-dark border-neon-pink/20"
              style={{ fontFamily: "Rajdhani" }}
            />
          </div>
          <Select value={estado} onValueChange={(v) => setEstado(v === "ALL" ? "" : v)}>
            <SelectTrigger className="bg-cyber-dark border-neon-pink/20"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent className="cyber-card">
              <SelectItem value="ALL">Todos</SelectItem>
              <SelectItem value="PENDIENTE">Pendiente</SelectItem>
              <SelectItem value="RECIBIDO PARCIAL">Recibido Parcial</SelectItem>
              <SelectItem value="VENCIDO">Vencido</SelectItem>
            </SelectContent>
          </Select>
          <Select value={prioridad} onValueChange={(v) => setPrioridad(v === "ALL" ? "" : v)}>
            <SelectTrigger className="bg-cyber-dark border-neon-pink/20"><SelectValue placeholder="Prioridad" /></SelectTrigger>
            <SelectContent className="cyber-card">
              <SelectItem value="ALL">Todas</SelectItem>
              <SelectItem value="CRITICO">Crítico</SelectItem>
              <SelectItem value="URGENTE">Urgente</SelectItem>
              <SelectItem value="NORMAL">Normal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card className="cyber-card rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-neon-pink" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ fontFamily: "Rajdhani" }}>
              <thead>
                <tr className="border-b border-neon-pink/20 bg-neon-pink/5">
                  <th className="text-left py-3 px-2 text-neon-pink font-semibold text-xs">OC</th>
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
                {(data || []).map((o, i) => (
                  <tr key={i} className={`border-b border-border/20 hover:bg-neon-cyan/5 transition-colors ${(o.diasRetraso || 0) > 0 ? "bg-red-500/5" : ""}`}>
                    <td className="py-2 px-2 font-mono text-neon-cyan text-xs">{o.ordenCompra}</td>
                    <td className="py-2 px-2 text-xs max-w-[150px] truncate">{o.descripcion}</td>
                    <td className="py-2 px-2 text-xs max-w-[140px] truncate text-muted-foreground">{o.proveedor}</td>
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
                      <span className={`font-mono text-xs font-bold ${(o.diasRetraso || 0) > 0 ? "text-red-400" : "text-green-400"}`}>
                        {o.diasRetraso || 0}d
                      </span>
                    </td>
                    <td className="py-2 px-2 text-center">{getEstadoBadge(o.estado)}</td>
                    <td className="py-2 px-2 text-center">{getPrioridadBadge(o.prioridad)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
