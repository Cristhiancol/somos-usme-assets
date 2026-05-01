/**
 * Analytics v1.0 — Dashboard de Análisis Avanzado
 * Tendencias históricas, distribución de riesgo, performance de proveedores
 * Gráficos CSS/SVG puros (sin Recharts)
 */
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown, BarChart3, PieChart, Activity, Target, Zap } from "lucide-react";

function formatCurrency(val: number) {
  if (val >= 1e9) return `${(val / 1e9).toFixed(1)}B COP`;
  if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M COP`;
  if (val >= 1e3) return `${(val / 1e3).toFixed(0)}K COP`;
  return `${val.toFixed(0)} COP`;
}

function formatNumber(val: number) {
  return new Intl.NumberFormat("es-CO").format(val);
}

export default function Analytics() {
  const { data: kpis, isLoading: kpisLoading } = trpc.dashboard.kpis.useQuery();
  const { data: jit, isLoading: jitLoading } = trpc.dashboard.jitAlerts.useQuery();
  const { data: categories, isLoading: catLoading } = trpc.dashboard.valueByCategory.useQuery();
  const { data: top20Value } = trpc.dashboard.top20Value.useQuery();
  const { data: orders } = trpc.orders.list.useQuery();

  if (kpisLoading || jitLoading || catLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#8CB32A' }} />
          <span className="text-sm font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#009890' }}>CARGANDO ANALYTICS...</span>
        </div>
      </div>
    );
  }

  const totalRefs = Number(kpis?.totalRefs) || 0;
  const zeroStock = Number(kpis?.zeroStock) || 0;
  const withStock = Number(kpis?.withStock) || 0;
  const totalValue = Number(kpis?.totalValue) || 0;
  const pendingOrders = Number(kpis?.totalPending) || 0;
  const urgentOrders = Number(kpis?.urgentOrders) || 0;

  // Risk distribution
  const riskData = [
    { label: "CRÍTICO", count: Number(jit?.critico) || 0, color: "#DC2626", bg: "#FEE2E2" },
    { label: "REORDEN", count: Number(jit?.reorden) || 0, color: "#EA580C", bg: "#FFF7ED" },
    { label: "PRECAUCIÓN", count: Number(jit?.precaucion) || 0, color: "#CA8A04", bg: "#FEFCE8" },
    { label: "ÓPTIMO", count: Number(jit?.optimo) || 0, color: "#8CB32A", bg: "#F0F9E8" },
  ];
  const totalAlerts = riskData.reduce((s, d) => s + d.count, 0) || 1;

  // Category analysis
  const categoryData = (categories || []).map((c) => ({
    name: c.cuenta || "N/A",
    value: Number(c.totalValue) || 0,
    items: Number(c.itemCount) || 0,
    zero: Number(c.zeroStock) || 0,
    healthPct: Number(c.itemCount) > 0 ? Math.round(((Number(c.itemCount) - Number(c.zeroStock)) / Number(c.itemCount)) * 100) : 100,
  }));

  // Order analysis
  const ordersArray = Array.isArray(orders) ? orders : [];
  const ordersByStatus: Record<string, number> = {};
  ordersArray.forEach((o: any) => {
    const status = o.estado || "DESCONOCIDO";
    ordersByStatus[status] = (ordersByStatus[status] || 0) + 1;
  });

  const orderStatusData = Object.entries(ordersByStatus).map(([status, count]) => ({
    status,
    count,
    color: status === "PENDIENTE" ? "#F97316" : status === "VENCIDO" ? "#DC2626" : status === "RECIBIDO PARCIAL" ? "#CA8A04" : status === "CASI COMPLETO" ? "#8CB32A" : "#6B7280",
  })).sort((a, b) => b.count - a.count);

  // Top retraso
  const topRetraso = ordersArray
    .filter((o: any) => (o.diasRetraso || 0) > 0)
    .sort((a: any, b: any) => (b.diasRetraso || 0) - (a.diasRetraso || 0))
    .slice(0, 10);

  // Health score
  const healthScore = totalRefs > 0 ? Math.round((withStock / totalRefs) * 100) : 0;
  const healthColor = healthScore >= 70 ? "#8CB32A" : healthScore >= 50 ? "#CA8A04" : "#DC2626";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Activity className="h-6 w-6" style={{ color: '#009890' }} />
        <div>
          <h1 className="text-2xl font-black tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#281C19' }}>
            ANALYTICS
          </h1>
          <p className="text-sm text-muted-foreground">Análisis avanzado del inventario y abastecimiento</p>
        </div>
      </div>

      {/* Health Score + Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Health Score Gauge */}
        <Card className="cyber-card p-6 rounded-xl flex flex-col items-center justify-center">
          <h3 className="text-xs font-bold tracking-wider mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#281C19' }}>
            SALUD DEL INVENTARIO
          </h3>
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#E5E7EB" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="40" fill="none"
                stroke={healthColor}
                strokeWidth="8"
                strokeDasharray={`${healthScore * 2.51} 251`}
                strokeLinecap="round"
                style={{ transition: "stroke-dasharray 1s ease-out" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black" style={{ fontFamily: "'Space Grotesk', sans-serif", color: healthColor }}>
                {healthScore}%
              </span>
              <span className="text-[10px]" style={{ color: '#6B7280' }}>disponible</span>
            </div>
          </div>
          <div className="mt-3 text-center">
            <p className="text-xs" style={{ color: '#6B7280' }}>{formatNumber(withStock)} de {formatNumber(totalRefs)} refs con stock</p>
          </div>
        </Card>

        {/* Risk Distribution */}
        <Card className="cyber-card p-6 rounded-xl">
          <h3 className="text-xs font-bold tracking-wider mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#281C19' }}>
            DISTRIBUCIÓN DE RIESGO
          </h3>
          <div className="space-y-3">
            {riskData.map((d) => {
              const pct = (d.count / totalAlerts) * 100;
              return (
                <div key={d.label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                      <span className="font-semibold" style={{ color: '#281C19' }}>{d.label}</span>
                    </div>
                    <span className="font-mono font-bold" style={{ color: d.color }}>{formatNumber(d.count)}</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: d.bg }}>
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${pct}%`, background: d.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Quick Stats */}
        <Card className="cyber-card p-6 rounded-xl">
          <h3 className="text-xs font-bold tracking-wider mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#281C19' }}>
            MÉTRICAS CLAVE
          </h3>
          <div className="space-y-4">
            <MetricRow icon={Target} label="Tasa de disponibilidad" value={`${healthScore}%`} color={healthColor} />
            <MetricRow icon={Zap} label="Refs urgentes (stock 0)" value={formatNumber(zeroStock)} color="#DC2626" />
            <MetricRow icon={TrendingDown} label="OC urgentes" value={formatNumber(urgentOrders)} color="#F97316" />
            <MetricRow icon={TrendingUp} label="Valor inventario" value={formatCurrency(totalValue)} color="#8CB32A" />
            <MetricRow icon={BarChart3} label="OC pendientes" value={formatNumber(pendingOrders)} color="#009890" />
          </div>
        </Card>
      </div>

      {/* Category Health */}
      <Card className="cyber-card p-6 rounded-xl">
        <h2 className="text-sm font-bold mb-4 tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#281C19' }}>
          SALUD POR CATEGORÍA
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <thead>
              <tr className="table-header-corp border-b" style={{ borderColor: 'rgba(0,152,144,0.2)' }}>
                <th className="text-left py-3 px-3 font-semibold">Categoría</th>
                <th className="text-right py-3 px-3 font-semibold">Items</th>
                <th className="text-right py-3 px-3 font-semibold">Stock 0</th>
                <th className="text-right py-3 px-3 font-semibold">Valor</th>
                <th className="text-right py-3 px-3 font-semibold">Salud</th>
              </tr>
            </thead>
            <tbody>
              {categoryData.map((cat, i) => (
                <tr key={i} className="border-b transition-colors hover:bg-lime-50" style={{ borderColor: 'rgba(140,179,42,0.12)' }}>
                  <td className="py-2.5 px-3 font-medium" style={{ color: '#281C19' }}>{cat.name}</td>
                  <td className="text-right py-2.5 px-3">{formatNumber(cat.items)}</td>
                  <td className="text-right py-2.5 px-3">
                    <span className={cat.zero > 0 ? "text-red-500 font-semibold" : "text-green-500"}>{cat.zero}</span>
                  </td>
                  <td className="text-right py-2.5 px-3 font-mono font-bold" style={{ color: '#009890' }}>{formatCurrency(cat.value)}</td>
                  <td className="text-right py-2.5 px-3">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-2 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${cat.healthPct}%`,
                            background: cat.healthPct >= 70 ? "#8CB32A" : cat.healthPct >= 50 ? "#CA8A04" : "#DC2626",
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono w-10 text-right" style={{
                        color: cat.healthPct >= 70 ? "#8CB32A" : cat.healthPct >= 50 ? "#CA8A04" : "#DC2626",
                      }}>
                        {cat.healthPct}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Orders Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orders by Status */}
        <Card className="cyber-card p-6 rounded-xl">
          <h2 className="text-sm font-bold mb-4 tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#281C19' }}>
            ÓRDENES POR ESTADO
          </h2>
          <div className="space-y-3">
            {orderStatusData.map((d) => {
              const maxCount = Math.max(...orderStatusData.map(x => x.count), 1);
              const pct = (d.count / maxCount) * 100;
              return (
                <div key={d.status} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium" style={{ color: '#281C19' }}>{d.status}</span>
                    <span className="font-mono font-bold" style={{ color: d.color }}>{d.count}</span>
                  </div>
                  <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: '#F3F4F6' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: d.color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Top 10 Retraso */}
        <Card className="cyber-card p-6 rounded-xl">
          <h2 className="text-sm font-bold mb-4 tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#281C19' }}>
            TOP 10 MAYOR RETRASO
          </h2>
          <div className="space-y-2">
            {topRetraso.length === 0 ? (
              <p className="text-sm text-center py-4 text-muted-foreground">Sin órdenes con retraso</p>
            ) : (
              topRetraso.map((o: any, i: number) => {
                const dias = o.diasRetraso || 0;
                const color = dias > 60 ? "#DC2626" : dias > 30 ? "#F97316" : "#CA8A04";
                return (
                  <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg transition-colors hover:bg-gray-50">
                    <span
                      className="text-xs font-mono font-bold w-8 text-center py-1 rounded"
                      style={{ background: `${color}15`, color }}
                    >
                      {dias}d
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: '#1C1C1E' }}>{o.descripcion || "N/A"}</p>
                      <p className="text-[10px] truncate" style={{ color: '#9CA3AF' }}>
                        OC: {o.ordenCompra} | {o.proveedor || "Sin proveedor"}
                      </p>
                    </div>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: `${color}15`, color, border: `1px solid ${color}30` }}
                    >
                      {o.prioridad || o.estado || "N/A"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground py-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Analytics — Datos en tiempo real sincronizados desde Google Drive
      </div>
    </div>
  );
}

function MetricRow({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
        <Icon className="h-4 w-4" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs" style={{ color: '#6B7280' }}>{label}</p>
      </div>
      <span className="text-sm font-bold font-mono" style={{ color, fontFamily: "'Space Grotesk', sans-serif" }}>{value}</span>
    </div>
  );
}
