import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Loader2, Package, Banknote, AlertTriangle, ShoppingCart, TrendingUp, TrendingDown, Shield, Clock, Bus, Zap } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";

function formatCurrency(val: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val);
}

function formatCurrencyShort(val: number) {
  if (val >= 1e9) return `${(val / 1e9).toFixed(1)}B COP`;
  if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M COP`;
  if (val >= 1e3) return `${(val / 1e3).toFixed(0)}K COP`;
  return `${val.toFixed(0)} COP`;
}

function formatNumber(val: number) {
  return new Intl.NumberFormat("es-CO").format(val);
}

const CATEGORY_COLORS: Record<string, string> = {
  PLATAFORMA: "#e879f9",
  LLANTAS: "#22d3ee",
  LUBRICANTES: "#a78bfa",
  CARROCERIA: "#f472b6",
  COMUNICACIONES: "#34d399",
  ELECTRICIDAD: "#fbbf24",
  CAJA: "#fb923c",
  COMBUSTIBLE: "#60a5fa",
};

export default function Home() {
  const { data: kpis, isLoading: kpisLoading } = trpc.dashboard.kpis.useQuery();
  const { data: jit, isLoading: jitLoading } = trpc.dashboard.jitAlerts.useQuery();
  const { data: categories, isLoading: catLoading } = trpc.dashboard.valueByCategory.useQuery();
  const { data: lastSync } = trpc.dashboard.lastSync.useQuery();

  if (kpisLoading || jitLoading || catLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-neon-pink" />
          <span className="text-neon-cyan text-sm" style={{ fontFamily: "Orbitron" }}>CARGANDO SISTEMA...</span>
        </div>
      </div>
    );
  }

  const categoryData = (categories || []).map((c) => ({
    name: c.cuenta || "N/A",
    value: Number(c.totalValue) || 0,
    items: Number(c.itemCount) || 0,
    zero: Number(c.zeroStock) || 0,
  }));

  const abcData = [
    { name: "Clase A", value: Number(kpis?.classA) || 0, color: "#e879f9" },
    { name: "Clase B", value: Number(kpis?.classB) || 0, color: "#22d3ee" },
    { name: "Clase C", value: Number(kpis?.classC) || 0, color: "#a78bfa" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Bus className="h-7 w-7 text-neon-pink" />
            <h1 className="text-2xl md:text-3xl font-black tracking-wider text-neon-cyan" style={{ fontFamily: "Orbitron" }}>
              SISTEMA JIT
            </h1>
            <Zap className="h-5 w-5 text-neon-yellow animate-pulse-neon" />
          </div>
          <p className="text-muted-foreground text-sm" style={{ fontFamily: "Rajdhani" }}>
            Control de Inventario y Abastecimiento — Gestión de Flota 260 Buses — Somos Bogotá Usme
          </p>
        </div>
        {lastSync && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Última sync: {new Date(lastSync.startedAt).toLocaleString("es-CO")}</span>
          </div>
        )}
      </div>

      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Total Referencias"
          value={formatNumber(Number(kpis?.totalRefs) || 0)}
          subtitle="Sin límite de crecimiento"
          icon={Package}
          glowClass="cyber-glow-cyan"
          color="text-neon-cyan"
        />
        <KPICard
          title="Valor Inventario"
          value={formatCurrencyShort(Number(kpis?.totalValue) || 0)}
          subtitle={formatCurrency(Number(kpis?.totalValue) || 0)}
          icon={Banknote}
          glowClass="cyber-glow-pink"
          color="text-neon-pink"
        />
        <KPICard
          title="Stock CERO"
          value={formatNumber(Number(kpis?.zeroStock) || 0)}
          subtitle="Riesgo parada de flota"
          icon={AlertTriangle}
          glowClass="cyber-glow-red"
          color="text-neon-red"
          pulse
        />
        <KPICard
          title="Órdenes Pendientes"
          value={formatNumber(Number(kpis?.totalPending) || 0)}
          subtitle={`${Number(kpis?.urgentOrders) || 0} urgentes`}
          icon={ShoppingCart}
          glowClass="cyber-glow-yellow"
          color="text-neon-yellow"
        />
      </div>

      {/* KPI Cards Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Clase A (Alto Valor)"
          value={formatNumber(Number(kpis?.classA) || 0)}
          subtitle="Control estricto"
          icon={TrendingUp}
          glowClass="cyber-glow-pink"
          color="text-neon-pink"
        />
        <KPICard
          title="Clase B (Medio)"
          value={formatNumber(Number(kpis?.classB) || 0)}
          subtitle="Control moderado"
          icon={TrendingDown}
          glowClass="cyber-glow-cyan"
          color="text-neon-cyan"
        />
        <KPICard
          title="Clase C (Normal)"
          value={formatNumber(Number(kpis?.classC) || 0)}
          subtitle="Control estándar"
          icon={Shield}
          glowClass="cyber-glow-purple"
          color="text-neon-purple"
        />
        <KPICard
          title="Con Stock"
          value={formatNumber(Number(kpis?.withStock) || 0)}
          subtitle={`Promedio: ${(Number(kpis?.avgStock) || 0).toFixed(1)} und/ref`}
          icon={Package}
          glowClass="cyber-glow-green"
          color="text-neon-green"
        />
      </div>

      {/* JIT Semaphore */}
      <Card className="cyber-card p-6 rounded-xl">
        <h2 className="text-lg font-bold text-neon-cyan mb-4 tracking-wider" style={{ fontFamily: "Orbitron" }}>
          SEMÁFORO DE ALERTAS — SISTEMA JIT
        </h2>
        <p className="text-xs text-muted-foreground mb-4" style={{ fontFamily: "Rajdhani" }}>
          Punto de Reorden Dinámico — Principios Logísticos Ballou Cap. 9
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SemaphoreCard
            count={Number(jit?.critico) || 0}
            label="CRÍTICO"
            sublabel="Stock Cero — Riesgo Parada"
            bgColor="bg-red-500/10"
            borderColor="border-red-500/40"
            textColor="text-red-400"
            glowClass="cyber-glow-red"
            pulse
          />
          <SemaphoreCard
            count={Number(jit?.reorden) || 0}
            label="REORDEN INMEDIATO"
            sublabel="Stock ≤ Punto Reorden"
            bgColor="bg-orange-500/10"
            borderColor="border-orange-500/40"
            textColor="text-orange-400"
            glowClass="cyber-glow-yellow"
          />
          <SemaphoreCard
            count={Number(jit?.precaucion) || 0}
            label="PRÓXIMO A MÍNIMO"
            sublabel="Revisar en 48 horas"
            bgColor="bg-yellow-500/10"
            borderColor="border-yellow-500/40"
            textColor="text-yellow-400"
            glowClass="cyber-glow-yellow"
          />
          <SemaphoreCard
            count={Number(jit?.optimo) || 0}
            label="STOCK SEGURO"
            sublabel="Nivel Óptimo JIT"
            bgColor="bg-green-500/10"
            borderColor="border-green-500/40"
            textColor="text-green-400"
            glowClass="cyber-glow-green"
          />
        </div>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Value by Category */}
        <Card className="cyber-card p-6 rounded-xl">
          <h2 className="text-sm font-bold text-neon-cyan mb-4 tracking-wider" style={{ fontFamily: "Orbitron" }}>
            VALOR POR CATEGORÍA
          </h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical" margin={{ left: 10, right: 10 }}>
                <XAxis type="number" tickFormatter={(v) => formatCurrencyShort(v)} stroke="#666" fontSize={10} />
                <YAxis type="category" dataKey="name" width={100} stroke="#888" fontSize={10} tick={{ fontFamily: "Rajdhani" }} />
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.14 0.025 280)",
                    border: "1px solid oklch(0.7 0.25 350 / 0.3)",
                    borderRadius: "8px",
                    color: "#e0e0e0",
                    fontFamily: "Rajdhani",
                  }}
                  formatter={(value: number) => [formatCurrency(value), "Valor"]}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {categoryData.map((entry, i) => (
                    <Cell key={i} fill={CATEGORY_COLORS[entry.name] || "#a78bfa"} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* ABC Classification */}
        <Card className="cyber-card p-6 rounded-xl">
          <h2 className="text-sm font-bold text-neon-cyan mb-4 tracking-wider" style={{ fontFamily: "Orbitron" }}>
            CLASIFICACIÓN ABC — PARETO 80/20
          </h2>
          <div className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={abcData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={{ stroke: "#666" }}
                  fontSize={12}
                  fontFamily="Rajdhani"
                >
                  {abcData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} fillOpacity={0.85} stroke={entry.color} strokeWidth={1} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "oklch(0.14 0.025 280)",
                    border: "1px solid oklch(0.7 0.25 350 / 0.3)",
                    borderRadius: "8px",
                    color: "#e0e0e0",
                    fontFamily: "Rajdhani",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-2">
            {abcData.map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-muted-foreground">{d.name}: <span className="text-foreground font-semibold">{d.value}</span></span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Category Detail Table */}
      <Card className="cyber-card p-6 rounded-xl overflow-hidden">
        <h2 className="text-sm font-bold text-neon-cyan mb-4 tracking-wider" style={{ fontFamily: "Orbitron" }}>
          DISTRIBUCIÓN POR CUENTA
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ fontFamily: "Rajdhani" }}>
            <thead>
              <tr className="border-b border-neon-pink/20">
                <th className="text-left py-3 px-3 text-neon-pink font-semibold">Categoría</th>
                <th className="text-right py-3 px-3 text-neon-pink font-semibold">Valor Total</th>
                <th className="text-right py-3 px-3 text-neon-pink font-semibold">Items</th>
                <th className="text-right py-3 px-3 text-neon-pink font-semibold">Stock Cero</th>
                <th className="text-right py-3 px-3 text-neon-pink font-semibold">% del Total</th>
              </tr>
            </thead>
            <tbody>
              {categoryData.map((cat, i) => {
                const totalVal = categoryData.reduce((s, c) => s + c.value, 0);
                const pct = totalVal > 0 ? ((cat.value / totalVal) * 100).toFixed(1) : "0";
                return (
                  <tr key={i} className="border-b border-border/30 hover:bg-neon-cyan/5 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat.name] || "#a78bfa" }} />
                        <span className="font-medium">{cat.name}</span>
                      </div>
                    </td>
                    <td className="text-right py-2.5 px-3 font-mono text-neon-cyan">{formatCurrency(cat.value)}</td>
                    <td className="text-right py-2.5 px-3">{cat.items}</td>
                    <td className="text-right py-2.5 px-3">
                      <span className={cat.zero > 0 ? "text-red-400 font-semibold" : "text-green-400"}>{cat.zero}</span>
                    </td>
                    <td className="text-right py-2.5 px-3">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[cat.name] || "#a78bfa" }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground py-4" style={{ fontFamily: "Rajdhani" }}>
        Principios Logísticos Aplicados — Ballou, Logística: Cadena de Suministro 5ta Ed. — Clasificación ABC, JIT, EOQ, Stock de Seguridad
      </div>
    </div>
  );
}

function KPICard({
  title, value, subtitle, icon: Icon, glowClass, color, pulse,
}: {
  title: string; value: string; subtitle: string; icon: any; glowClass: string; color: string; pulse?: boolean;
}) {
  return (
    <Card className={`cyber-card p-4 rounded-xl ${glowClass} transition-all hover:scale-[1.02]`}>
      <div className="flex items-start justify-between mb-2">
        <Icon className={`h-5 w-5 ${color} ${pulse ? "animate-pulse-neon" : ""}`} />
      </div>
      <div className={`text-2xl md:text-3xl font-black ${color} tracking-wider`} style={{ fontFamily: "Orbitron" }}>
        {value}
      </div>
      <div className="text-xs font-semibold text-foreground mt-1" style={{ fontFamily: "Rajdhani" }}>{title}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5" style={{ fontFamily: "Rajdhani" }}>{subtitle}</div>
    </Card>
  );
}

function SemaphoreCard({
  count, label, sublabel, bgColor, borderColor, textColor, glowClass, pulse,
}: {
  count: number; label: string; sublabel: string; bgColor: string; borderColor: string; textColor: string; glowClass: string; pulse?: boolean;
}) {
  return (
    <div className={`${bgColor} border ${borderColor} rounded-xl p-4 ${glowClass} transition-all hover:scale-[1.02]`}>
      <div className={`text-3xl md:text-4xl font-black ${textColor} ${pulse ? "animate-pulse-neon" : ""}`} style={{ fontFamily: "Orbitron" }}>
        {formatNumber(count)}
      </div>
      <div className={`text-xs font-bold ${textColor} mt-2 tracking-wider`} style={{ fontFamily: "Orbitron" }}>
        {label}
      </div>
      <div className="text-[10px] text-muted-foreground mt-1" style={{ fontFamily: "Rajdhani" }}>
        {sublabel}
      </div>
    </div>
  );
}
