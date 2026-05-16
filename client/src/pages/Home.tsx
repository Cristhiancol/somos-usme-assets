import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Loader2, Package, ShoppingCart, TrendingUp, TrendingDown, Shield, Clock, Banknote, Calendar } from "lucide-react";
import { BusTransmilenio } from "@/components/BusTransmilenio";
import { useLocation } from "wouter";

// SVG inline para AlertTriangle
function AlertIcon({ size = 20, color = "#dc2626", className = "" }: { size?: number; color?: string; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function SirenIcon({ size = 20, color = "#dc2626", className = "" }: { size?: number; color?: string; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M7 12a5 5 0 0 1 5-5v0a5 5 0 0 1 5 5v6H7v-6z" /><path d="M5 20h14" />
      <path d="M12 3V1" /><path d="M4.22 4.22l1.42 1.42" /><path d="M19.78 4.22l-1.42 1.42" />
      <path d="M2 12H1" /><path d="M23 12h-1" />
    </svg>
  );
}

function formatCurrency(val: number) {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

function formatNumber(val: number) {
  return new Intl.NumberFormat("es-CO").format(val);
}

function formatCurrencyFull(val: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val);
}

const CATEGORY_COLORS: Record<string, string> = {
  PLATAFORMA: "#8CB32A", LLANTAS: "#009890", LUBRICANTES: "#5a8c1a",
  CARROCERIA: "#007a74", COMUNICACIONES: "#a3c940", ELECTRICIDAD: "#00b8af",
  CAJA: "#281C19", COMBUSTIBLE: "#4a3530",
};

const CAT_CHART_COLORS = ["#8CB32A", "#009890", "#5a8c1a", "#007a74", "#a3c940", "#00b8af", "#281C19", "#4a3530"];

export default function Home() {
  const { data: kpis, isLoading: kpisLoading } = trpc.dashboard.kpis.useQuery();
  const { data: jit, isLoading: jitLoading } = trpc.dashboard.jitAlerts.useQuery();
  const { data: categories, isLoading: catLoading } = trpc.dashboard.valueByCategory.useQuery();
  const { data: lastSync } = trpc.dashboard.lastSync.useQuery();

  if (kpisLoading || jitLoading || catLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#8CB32A' }} />
          <span className="text-sm font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#009890' }}>CARGANDO ASSET TRACKER...</span>
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
  const maxCatValue = Math.max(...categoryData.map((c) => c.value), 1);
  const totalCatValue = categoryData.reduce((s, c) => s + c.value, 0) || 1;

  const totalRefs = Number(kpis?.totalRefs) || 0;
  const zeroStock = Number(kpis?.zeroStock) || 0;
  const withStock = Number(kpis?.withStock) || 0;

  // Inventory status for donut
  const invStatus = [
    { label: "Con Stock", value: withStock, color: "#8CB32A" },
    { label: "Stock Bajo", value: Math.max(0, totalRefs - withStock - zeroStock), color: "#F59E0B" },
    { label: "Sin Stock", value: zeroStock, color: "#dc2626" },
  ].filter(d => d.value > 0);
  const invTotal = invStatus.reduce((s, d) => s + d.value, 0) || 1;

  // Top 5 categories with zero stock
  const topZeroCats = [...categoryData].sort((a, b) => b.zero - a.zero).slice(0, 5);

  const today = new Date().toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="space-y-6">
      {/* ═══ HEADER ═══ */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <BusTransmilenio />
            <h1 className="text-2xl md:text-3xl font-black tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#281C19' }}>
              Resumen General
            </h1>
          </div>
          <p className="text-muted-foreground text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Asset Tracker — Control de Inventario y Abastecimiento — Somos Bogotá Usme
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: '#F5F5F5', border: '1px solid #E5E7EB' }}>
            <Calendar className="h-4 w-4" style={{ color: '#009890' }} />
            <span className="text-xs font-medium" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#281C19' }}>{today}</span>
          </div>
          {lastSync && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              <span>Sync: {new Date(lastSync.startedAt).toLocaleString("es-CO")}</span>
            </div>
          )}
        </div>
      </div>

      {/* ═══ KPI ROW 1 — 4 cards ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Total Referencias" value={formatNumber(totalRefs)} subtitle="Catálogo activo" icon={Package} accentColor="#009890" href="/inventario" />
        <KPICard title="Valor Inventario" value={formatCurrency(Number(kpis?.totalValue) || 0)} subtitle={formatCurrencyFull(Number(kpis?.totalValue) || 0)} icon={Banknote} accentColor="#8CB32A" href="/top-valor" />
        <KPICard title="Stock CERO" value={formatNumber(zeroStock)} subtitle="Riesgo parada de flota" icon="alert" accentColor="#dc2626" pulse href="/stock-cero" />
        <KPICard title="Órdenes Pendientes" value={formatNumber(Number(kpis?.totalPending) || 0)} subtitle={`${Number(kpis?.urgentOrders) || 0} urgentes`} icon={ShoppingCart} accentColor="#8CB32A" href="/ordenes" />
      </div>

      {/* ═══ KPI ROW 2 — 4 cards ═══ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="Stock 0 + OC Activa" value={formatNumber(Number(kpis?.stockCeroConOC) || 0)} subtitle="Presionar proveedor" icon="siren" accentColor="#dc2626" pulse href="/stock-cero-oc" />
        <KPICard title="Clase A (Alto Valor)" value={formatNumber(Number(kpis?.classA) || 0)} subtitle="Control estricto" icon={TrendingUp} accentColor="#8CB32A" />
        <KPICard title="Clase B (Medio)" value={formatNumber(Number(kpis?.classB) || 0)} subtitle="Control moderado" icon={TrendingDown} accentColor="#009890" />
        <KPICard title="Clase C (Normal)" value={formatNumber(Number(kpis?.classC) || 0)} subtitle="Control estándar" icon={Shield} accentColor="#281C19" />
      </div>

      {/* ═══ CENTRAL — Barras + Top Categorías ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Barras de valor por categoría */}
        <div className="lg:col-span-3 at-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="at-section-title">Valor por Categoría</h2>
            <span className="text-[11px] px-3 py-1 rounded-full font-semibold" style={{ background: 'rgba(0,152,144,0.08)', color: '#009890' }}>
              Total: {formatCurrency(totalCatValue)} COP
            </span>
          </div>
          <div className="space-y-4">
            {categoryData.sort((a, b) => b.value - a.value).map((cat) => {
              const pct = (cat.value / maxCatValue) * 100;
              const barColor = CATEGORY_COLORS[cat.name] || "#009890";
              return (
                <div key={cat.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: barColor }} />
                      <span className="text-xs font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#281C19' }}>{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-mono" style={{ color: '#6B7280' }}>{cat.items} refs</span>
                      <span className="text-xs font-bold font-mono" style={{ color: '#009890' }}>{formatCurrency(cat.value)}</span>
                    </div>
                  </div>
                  <div className="at-progress-bar">
                    <div style={{ width: `${pct}%`, backgroundColor: barColor, boxShadow: `0 0 6px ${barColor}30` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top categorías con stock cero */}
        <div className="lg:col-span-2 at-card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="at-section-title">Mayor Riesgo Stock Cero</h2>
          </div>
          <div className="space-y-1">
            <div className="grid grid-cols-12 text-[10px] font-bold tracking-wider pb-2 mb-2" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#6B7280', borderBottom: '1px solid #F3F4F6' }}>
              <div className="col-span-5">Categoría</div>
              <div className="col-span-3 text-right">Sin Stock</div>
              <div className="col-span-4 text-right">Valor</div>
            </div>
            {topZeroCats.map((cat, i) => (
              <div key={cat.name} className="grid grid-cols-12 items-center py-2.5 rounded-lg transition-colors hover:bg-gray-50" style={{ borderBottom: '1px solid #FAFAFA' }}>
                <div className="col-span-5 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat.name] || '#009890' }} />
                  <span className="text-xs font-medium" style={{ color: '#281C19' }}>{cat.name}</span>
                </div>
                <div className="col-span-3 text-right">
                  <span className="at-badge" style={{ background: cat.zero > 10 ? '#FEE2E2' : '#FEF3C7', color: cat.zero > 10 ? '#dc2626' : '#D97706' }}>
                    {cat.zero}
                  </span>
                </div>
                <div className="col-span-4 text-right">
                  <span className="text-xs font-mono font-semibold" style={{ color: '#009890' }}>{formatCurrency(cat.value)}</span>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full text-center text-xs font-semibold mt-4 py-2 rounded-lg transition-colors" style={{ color: '#009890', background: 'rgba(0,152,144,0.05)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,152,144,0.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,152,144,0.05)'; }}
            onClick={() => window.location.href = '/stock-cero'}
          >
            Ver todas las alertas →
          </button>
        </div>
      </div>

      {/* ═══ BOTTOM — Donas + Alertas + Semáforo ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Dona — Valor por Categoría */}
        <div className="at-card p-6 flex flex-col items-center">
          <h2 className="at-section-title mb-4 self-start">Distribución por Categoría</h2>
          <DonutChart data={categoryData.sort((a, b) => b.value - a.value).map((c, i) => ({
            label: c.name, value: c.value, color: CAT_CHART_COLORS[i % CAT_CHART_COLORS.length],
          }))} centerLabel={formatCurrency(totalCatValue)} centerSub="Total" />
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-4">
            {categoryData.sort((a, b) => b.value - a.value).slice(0, 6).map((c, i) => (
              <div key={c.name} className="flex items-center gap-1.5 text-[10px]">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CAT_CHART_COLORS[i % CAT_CHART_COLORS.length] }} />
                <span style={{ color: '#6B7280' }}>{c.name}</span>
                <span className="font-semibold" style={{ color: '#281C19' }}>{((c.value / totalCatValue) * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dona — Estado del Inventario */}
        <div className="at-card p-6 flex flex-col items-center">
          <h2 className="at-section-title mb-4 self-start">Estado del Inventario</h2>
          <DonutChart data={invStatus} centerLabel={formatNumber(totalRefs)} centerSub="Total Refs" />
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-4">
            {invStatus.map(d => (
              <div key={d.label} className="flex items-center gap-1.5 text-[10px]">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                <span style={{ color: '#6B7280' }}>{d.label}</span>
                <span className="font-semibold" style={{ color: '#281C19' }}>{formatNumber(d.value)}</span>
                <span style={{ color: '#9CA3AF' }}>{((d.value / invTotal) * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alertas de Stock */}
        <div className="at-card p-6">
          <h2 className="at-section-title mb-4">Alertas de Stock</h2>
          <div className="space-y-3">
            {[
              { label: "CRÍTICO", count: Number(jit?.critico) || 0, sub: "Stock Cero — Riesgo Parada", color: "#dc2626", bg: "#FEE2E2" },
              { label: "REORDEN", count: Number(jit?.reorden) || 0, sub: "Stock ≤ Punto Reorden", color: "#ea580c", bg: "#FFF7ED" },
              { label: "PRECAUCIÓN", count: Number(jit?.precaucion) || 0, sub: "Revisar en 48h", color: "#ca8a04", bg: "#FEFCE8" },
              { label: "SEGURO", count: Number(jit?.optimo) || 0, sub: "Nivel Óptimo JIT", color: "#8CB32A", bg: "#F0F9E8" },
            ].map(alert => (
              <div key={alert.label} className="flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.01]"
                style={{ background: `${alert.bg}`, border: `1px solid ${alert.color}20` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${alert.color}15` }}>
                  <span className="text-sm font-black" style={{ fontFamily: "'Space Grotesk', sans-serif", color: alert.color }}>{alert.count}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="at-badge" style={{ background: `${alert.color}15`, color: alert.color, border: `1px solid ${alert.color}30` }}>
                      {alert.label}
                    </span>
                  </div>
                  <p className="text-[10px] mt-0.5 truncate" style={{ color: '#6B7280' }}>{alert.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ TABLA DISTRIBUCIÓN POR CUENTA ═══ */}
      <div className="at-card p-6 overflow-hidden">
        <h2 className="at-section-title mb-4">Distribución por Cuenta</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            <thead>
              <tr className="table-header-corp border-b" style={{ borderColor: 'rgba(0,152,144,0.2)' }}>
                <th className="text-left py-3 px-3 font-semibold">Categoría</th>
                <th className="text-right py-3 px-3 font-semibold">Valor Total</th>
                <th className="text-right py-3 px-3 font-semibold">Items</th>
                <th className="text-right py-3 px-3 font-semibold">Stock Cero</th>
                <th className="text-right py-3 px-3 font-semibold">% del Total</th>
              </tr>
            </thead>
            <tbody>
              {categoryData.map((cat) => {
                const pct = totalCatValue > 0 ? ((cat.value / totalCatValue) * 100).toFixed(1) : "0";
                return (
                  <tr key={cat.name} className="border-b transition-colors hover:bg-lime-50" style={{ borderColor: 'rgba(140,179,42,0.12)' }}>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat.name] || "#009890" }} />
                        <span className="font-medium" style={{ color: '#281C19' }}>{cat.name}</span>
                      </div>
                    </td>
                    <td className="text-right py-2.5 px-3 font-mono font-bold" style={{ color: '#009890' }}>{formatCurrency(cat.value)}</td>
                    <td className="text-right py-2.5 px-3">{cat.items}</td>
                    <td className="text-right py-2.5 px-3">
                      <span className={cat.zero > 0 ? "text-red-500 font-semibold" : "text-green-500"}>{cat.zero}</span>
                    </td>
                    <td className="text-right py-2.5 px-3">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[cat.name] || "#009890" }} />
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
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground py-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Asset Tracker v2.0 — Somos Bogotá Usme — Principios Logísticos Ballou Cap. 9 — JIT, ABC, EOQ
      </div>
    </div>
  );
}

/* ═══ KPI CARD ═══ */
function KPICard({ title, value, subtitle, icon, accentColor, pulse, href }: {
  title: string; value: string; subtitle: string;
  icon: any; accentColor: string; pulse?: boolean; href?: string;
}) {
  const [, setLocation] = useLocation();
  const isAlert = icon === 'alert';
  const isSiren = icon === 'siren';

  return (
    <div
      className={`at-kpi at-animate ${href ? "cursor-pointer" : ""}`}
      style={{ '--at-accent': accentColor, '--at-accent-glow': `${accentColor}20` } as React.CSSProperties}
      onClick={() => href && setLocation(href)}
    >
      <div className="flex items-start justify-between mb-2">
        {isAlert ? (
          <div className={`p-1.5 rounded-lg ${pulse ? 'animate-pulse-neon' : ''}`}
            style={{ background: `${accentColor}12`, boxShadow: pulse ? `0 0 10px ${accentColor}40` : 'none' }}>
            <AlertIcon size={18} color={accentColor} />
          </div>
        ) : isSiren ? (
          <div className={`p-1.5 rounded-lg ${pulse ? 'animate-pulse-neon' : ''}`}
            style={{ background: `${accentColor}12`, boxShadow: pulse ? `0 0 10px ${accentColor}40` : 'none' }}>
            <SirenIcon size={18} color={accentColor} />
          </div>
        ) : (() => {
          const Icon = icon;
          return <Icon className={`h-5 w-5 ${pulse ? 'animate-pulse-neon' : ''}`} style={{ color: accentColor }} />;
        })()}
        {href && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-md font-bold"
            style={{ background: `${accentColor}10`, color: accentColor }}>→</span>
        )}
      </div>
      <div className="text-2xl md:text-3xl font-black tracking-wider"
        style={{ fontFamily: "'Space Grotesk', sans-serif", color: accentColor,
          ...(pulse ? { textShadow: `0 0 12px ${accentColor}60` } : {}),
        }}>{value}</div>
      <div className="text-xs font-semibold mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#281C19' }}>{title}</div>
      <div className="text-[10px] mt-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#6b7280' }}>{subtitle}</div>
    </div>
  );
}

/* ═══ DONUT CHART — SVG puro ═══ */
function DonutChart({ data, centerLabel, centerSub }: {
  data: { label: string; value: number; color: string }[];
  centerLabel: string; centerSub: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let cumAngle = -90;

  return (
    <svg viewBox="0 0 200 200" className="w-44 h-44">
      {data.map((d) => {
        const angle = (d.value / total) * 360;
        const startAngle = cumAngle;
        cumAngle += angle;
        const endAngle = cumAngle;
        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;
        const x1 = 100 + 70 * Math.cos(startRad);
        const y1 = 100 + 70 * Math.sin(startRad);
        const x2 = 100 + 70 * Math.cos(endRad);
        const y2 = 100 + 70 * Math.sin(endRad);
        const largeArc = angle > 180 ? 1 : 0;
        return <path key={d.label} d={`M 100 100 L ${x1} ${y1} A 70 70 0 ${largeArc} 1 ${x2} ${y2} Z`}
          fill={d.color} fillOpacity={0.9} stroke="#ffffff" strokeWidth="2" />;
      })}
      <circle cx="100" cy="100" r="42" fill="#ffffff" stroke="#f3f4f6" strokeWidth="1" />
      <text x="100" y="96" textAnchor="middle" fill="#281C19" fontSize="15" fontFamily="'Space Grotesk', sans-serif" fontWeight="bold">
        {centerLabel}
      </text>
      <text x="100" y="114" textAnchor="middle" fill="#6b7280" fontSize="10" fontFamily="'Space Grotesk', sans-serif">
        {centerSub}
      </text>
    </svg>
  );
}
