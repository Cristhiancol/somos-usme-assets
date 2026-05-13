/**
 * Analytics v2.0 — Dashboard de Análisis Avanzado con Vega-Lite
 * Gráficos declarativos interactivos (equivalente a Altair en Python)
 */
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import {
  Loader2, TrendingUp, TrendingDown, BarChart3, Activity, Target, Zap,
} from "lucide-react";
import { useMemo } from "react";
import { VegaChart, pieSpec, hbarSpec, barSpec, CORP_COLORS } from "@/components/VegaChart";

function formatCurrency(val: number) {
  if (val >= 1e9) return `${(val / 1e9).toFixed(2)}B COP`;
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
  const { data: orders } = trpc.orders.list.useQuery();

  // ── Derived data ──────────────────────────────────────────────────────
  const totalRefs = Number(kpis?.totalRefs) || 0;
  const zeroStock = Number(kpis?.zeroStock) || 0;
  const withStock = Number(kpis?.withStock) || 0;
  const totalValue = Number(kpis?.totalValue) || 0;
  const pendingOrders = Number(kpis?.totalPending) || 0;
  const urgentOrders = Number(kpis?.urgentOrders) || 0;
  const healthScore = totalRefs > 0 ? Math.round((withStock / totalRefs) * 100) : 0;
  const healthColor = healthScore >= 70 ? CORP_COLORS.green : healthScore >= 50 ? CORP_COLORS.amber : CORP_COLORS.red;

  const ordersArray = Array.isArray(orders) ? orders : [];
  // Contar OC únicas (una OC puede tener múltiples líneas/referencias)
  const uniqueOCCount = useMemo(() => new Set(ordersArray.map((o: any) => o.ordenCompra)).size, [ordersArray]);
  const topRetraso = ordersArray
    .filter((o: any) => (o.diasRetraso || 0) > 0)
    .sort((a: any, b: any) => (b.diasRetraso || 0) - (a.diasRetraso || 0))
    .slice(0, 10);

  // ── Vega-Lite specs ───────────────────────────────────────────────────

  // Dona — distribución de riesgo JIT
  const riskPieSpec = useMemo(() => pieSpec(
    [
      { label: "CRÍTICO", value: Number(jit?.critico) || 0 },
      { label: "REORDEN", value: Number(jit?.reorden) || 0 },
      { label: "PRECAUCIÓN", value: Number(jit?.precaucion) || 0 },
      { label: "ÓPTIMO", value: Number(jit?.optimo) || 0 },
    ].filter(d => d.value > 0),
    { title: "Distribución JIT", width: 260, height: 220, innerRadius: 60 }
  ), [jit]);

  // Barras — valor por categoría
  const categoryBarSpec = useMemo(() => {
    const data = (categories || [])
      .map((c) => ({
        label: c.cuenta || "N/A",
        value: Number(c.totalValue) || 0,
      }))
      .sort((a, b) => b.value - a.value);
    return barSpec(data, {
      title: "Valor inventario por categoría",
      yLabel: "COP",
      height: 220,
      colorField: true,
    });
  }, [categories]);

  // Barras horiz — top retraso OC
  const retrasoBarSpec = useMemo(() => {
    const data = topRetraso.map((o: any) => ({
      label: `${o.ordenCompra} | ${(o.descripcion || "").slice(0, 22)}`,
      value: o.diasRetraso || 0,
    }));
    return hbarSpec(data, {
      title: "OC con mayor retraso",
      xLabel: "Días de retraso",
      height: 280,
      color: CORP_COLORS.red,
    });
  }, [topRetraso]);

  // Barras — estado de órdenes
  const orderStatusSpec = useMemo(() => {
    const ordersByStatus: Record<string, Set<string>> = {};
    ordersArray.forEach((o: any) => {
      const status = o.estado || "OTRO";
      if (!ordersByStatus[status]) ordersByStatus[status] = new Set();
      ordersByStatus[status].add(o.ordenCompra || `unknown-${Math.random()}`);
    });
    const data = Object.entries(ordersByStatus)
      .map(([label, ocSet]) => ({ label, value: ocSet.size }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
    return barSpec(data, {
      title: "Órdenes por estado",
      yLabel: "# órdenes",
      height: 200,
      colorField: true,
    });
  }, [ordersArray]);

  // Barras — salud por categoría (% con stock)
  const categoryHealthSpec = useMemo(() => {
    const data = (categories || [])
      .map((c) => {
        const items = Number(c.itemCount) || 1;
        const zero = Number(c.zeroStock) || 0;
        return {
          label: c.cuenta || "N/A",
          value: Math.round(((items - zero) / items) * 100),
        };
      })
      .sort((a, b) => b.value - a.value);
    return hbarSpec(data, {
      title: "Salud por categoría (%)",
      xLabel: "% con stock disponible",
      height: 220,
      color: CORP_COLORS.teal,
      format: ".0f",
    });
  }, [categories]);

  if (kpisLoading || jitLoading || catLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#8CB32A" }} />
          <span className="text-sm font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#009890" }}>
            CARGANDO ANALYTICS...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Activity className="h-6 w-6" style={{ color: "#009890" }} />
        <div>
          <h1 className="text-2xl font-black tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#281C19" }}>
            ANALYTICS
          </h1>
          <p className="text-sm text-muted-foreground">
            Dashboard de abastecimiento — Gráficos declarativos Vega-Lite interactivos
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { icon: Target, label: "Salud inventario", value: `${healthScore}%`, color: healthColor },
          { icon: Zap, label: "Stock CERO", value: formatNumber(zeroStock), color: CORP_COLORS.red },
          { icon: TrendingDown, label: "OC urgentes", value: formatNumber(urgentOrders), color: "#F97316" },
          { icon: TrendingUp, label: "Valor total", value: formatCurrency(totalValue), color: CORP_COLORS.green },
          { icon: BarChart3, label: "OC pendientes", value: formatNumber(pendingOrders), color: CORP_COLORS.teal },
        ].map((kpi) => (
          <Card key={kpi.label} className="kpi-card-corp p-4 rounded-xl" style={{ borderLeft: `3px solid ${kpi.color}` }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: `${kpi.color}18` }}>
                <kpi.icon className="h-3.5 w-3.5" style={{ color: kpi.color }} />
              </div>
            </div>
            <div className="text-xl font-black" style={{ fontFamily: "'Space Grotesk', sans-serif", color: kpi.color }}>
              {kpi.value}
            </div>
            <div className="text-xs font-semibold mt-1" style={{ color: "#281C19" }}>{kpi.label}</div>
          </Card>
        ))}
      </div>

      {/* Health Gauge + Risk Pie + Order Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Gauge de salud — SVG puro */}
        <Card className="cyber-card p-6 rounded-xl flex flex-col items-center justify-center">
          <h3 className="text-xs font-bold tracking-wider mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#281C19" }}>
            SALUD DEL INVENTARIO
          </h3>
          <div className="relative w-36 h-36">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#E5E7EB" strokeWidth="10" />
              <circle
                cx="50" cy="50" r="40" fill="none"
                stroke={healthColor}
                strokeWidth="10"
                strokeDasharray={`${healthScore * 2.51} 251`}
                strokeLinecap="round"
                style={{ transition: "stroke-dasharray 1.2s ease-out" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black" style={{ fontFamily: "'Space Grotesk', sans-serif", color: healthColor }}>
                {healthScore}%
              </span>
              <span className="text-[10px]" style={{ color: "#6B7280" }}>disponible</span>
            </div>
          </div>
          <div className="mt-3 text-center space-y-0.5">
            <p className="text-xs" style={{ color: "#6B7280" }}>
              {formatNumber(withStock)} de {formatNumber(totalRefs)} refs con stock
            </p>
            <p className="text-[10px]" style={{ color: "#6B7280" }}>
              {zeroStock} referencias en riesgo
            </p>
          </div>
        </Card>

        {/* Dona — distribución de riesgo JIT (Vega-Lite) */}
        <Card className="cyber-card p-6 rounded-xl flex flex-col items-center">
          <h3 className="text-xs font-bold tracking-wider mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#281C19" }}>
            DISTRIBUCIÓN DE RIESGO JIT
          </h3>
          <p className="text-[10px] text-muted-foreground mb-2">Pasar el cursor para detalles</p>
          <VegaChart spec={riskPieSpec} />
        </Card>

        {/* Órdenes por estado (Vega-Lite) */}
        <Card className="cyber-card p-6 rounded-xl">
          <h3 className="text-xs font-bold tracking-wider mb-1" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#281C19" }}>
            ÓRDENES POR ESTADO
          </h3>
          <p className="text-[10px] text-muted-foreground mb-2">Total: {formatNumber(uniqueOCCount)} órdenes</p>
          <VegaChart spec={orderStatusSpec} style={{ width: "100%" }} />
        </Card>
      </div>

      {/* Valor por categoría */}
      <Card className="cyber-card p-6 rounded-xl">
        <h2 className="text-sm font-bold mb-1 tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#281C19" }}>
          VALOR DE INVENTARIO POR CATEGORÍA
        </h2>
        <p className="text-[11px] text-muted-foreground mb-4">
          Total: <strong style={{ color: "#009890" }}>{formatCurrency(totalValue)}</strong> — pasar el cursor para ver el monto exacto
        </p>
        <VegaChart spec={categoryBarSpec} style={{ width: "100%" }} />
      </Card>

      {/* Salud por categoría + Retraso OC */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Salud por categoría */}
        <Card className="cyber-card p-6 rounded-xl">
          <h2 className="text-sm font-bold mb-1 tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#281C19" }}>
            SALUD POR CATEGORÍA
          </h2>
          <p className="text-[11px] text-muted-foreground mb-4">% de referencias con stock disponible</p>
          <VegaChart spec={categoryHealthSpec} style={{ width: "100%" }} />
        </Card>

        {/* Top retraso OC */}
        <Card className="cyber-card p-6 rounded-xl">
          <h2 className="text-sm font-bold mb-1 tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#281C19" }}>
            TOP 10 MAYOR RETRASO EN OC
          </h2>
          <p className="text-[11px] text-muted-foreground mb-4">Días de retraso — pasar cursor para detalles</p>
          {topRetraso.length === 0 ? (
            <div className="flex items-center justify-center h-[200px]">
              <p className="text-sm text-muted-foreground">Sin órdenes con retraso ✓</p>
            </div>
          ) : (
            <VegaChart spec={retrasoBarSpec} style={{ width: "100%" }} />
          )}
        </Card>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground py-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Analytics v2.0 — Vega-Lite · Datos en tiempo real sincronizados desde Google Drive
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
        <p className="text-xs" style={{ color: "#6B7280" }}>{label}</p>
      </div>
      <span className="text-sm font-bold font-mono" style={{ color, fontFamily: "'Space Grotesk', sans-serif" }}>{value}</span>
    </div>
  );
}
