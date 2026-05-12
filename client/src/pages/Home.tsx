import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Loader2, Package, ShoppingCart, TrendingUp, TrendingDown, Shield, Clock, Banknote } from "lucide-react";
import { BusTransmilenio } from "@/components/BusTransmilenio";
import { useLocation } from "wouter";

// SVG inline para AlertTriangle — evita que Lucide renderice como cuadrado en algunos entornos
function AlertIcon({ size = 20, color = "#dc2626", className = "" }: { size?: number; color?: string; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

// SVG inline para Siren (sirena de alerta)
function SirenIcon({ size = 20, color = "#dc2626", className = "" }: { size?: number; color?: string; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M7 12a5 5 0 0 1 5-5v0a5 5 0 0 1 5 5v6H7v-6z" />
      <path d="M5 20h14" />
      <path d="M12 3V1" />
      <path d="M4.22 4.22l1.42 1.42" />
      <path d="M19.78 4.22l-1.42 1.42" />
      <path d="M2 12H1" />
      <path d="M23 12h-1" />
    </svg>
  );
}

function formatCurrency(val: number) {
  if (val >= 1e9) return `${(val / 1e9).toFixed(1)}B COP`;
  if (val >= 1e6) return `${(val / 1e6).toFixed(1)}M COP`;
  if (val >= 1e3) return `${(val / 1e3).toFixed(0)}K COP`;
  return `${val.toFixed(0)} COP`;
}

function formatNumber(val: number) {
  return new Intl.NumberFormat("es-CO").format(val);
}

function formatCurrencyFull(val: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val);
}

// Paleta corporativa para categorías
const CATEGORY_COLORS: Record<string, string> = {
  PLATAFORMA:      "#8CB32A",  // Lima
  LLANTAS:         "#009890",  // Teal
  LUBRICANTES:     "#5a8c1a",  // Lima oscuro
  CARROCERIA:      "#007a74",  // Teal oscuro
  COMUNICACIONES:  "#a3c940",  // Lima claro
  ELECTRICIDAD:    "#00b8af",  // Teal claro
  CAJA:            "#281C19",  // Oscuro corporativo
  COMBUSTIBLE:     "#4a3530",  // Oscuro cálido
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
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#8CB32A' }} />
          <span className="text-sm font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#009890' }}>CARGANDO SISTEMA...</span>
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

  const abcData = [
    { name: "Clase A", value: Number(kpis?.classA) || 0, color: "#8CB32A", label: "Alto Valor" },
    { name: "Clase B", value: Number(kpis?.classB) || 0, color: "#009890", label: "Medio" },
    { name: "Clase C", value: Number(kpis?.classC) || 0, color: "#281C19", label: "Normal" },
  ];
  const abcTotal = abcData.reduce((s, d) => s + d.value, 0) || 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <BusTransmilenio />
            <h1 className="text-2xl md:text-3xl font-black tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#281C19' }}>
              SISTEMA JIT
            </h1>
            {/* Icono de cadena de suministro — reemplaza el Zap que se distorsionaba */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#009890"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
              style={{ filter: 'drop-shadow(0 0 4px rgba(0,152,144,0.4))' }}
              aria-hidden="true"
            >
              <circle cx="12" cy="4.5" r="2.5" />
              <path d="M12 7v3" />
              <circle cx="5" cy="19.5" r="2.5" />
              <path d="M5 17v-3.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2V17" />
              <circle cx="19" cy="19.5" r="2.5" />
            </svg>
          </div>
          <p className="text-muted-foreground text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
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
          accentColor="#009890"
          href="/inventario"
        />
        <KPICard
          title="Valor Inventario"
          value={formatCurrency(Number(kpis?.totalValue) || 0)}
          subtitle={`${formatCurrencyFull(Number(kpis?.totalValue) || 0)}`}
          icon={Banknote}
          accentColor="#8CB32A"
          href="/top-valor"
        />
        <KPICard
          title="Stock CERO"
          value={formatNumber(Number(kpis?.zeroStock) || 0)}
          subtitle="Riesgo parada de flota"
          icon="alert"
          accentColor="#dc2626"
          pulse
          href="/stock-cero"
        />
        <KPICard
          title="Órdenes Pendientes"
          value={formatNumber(Number(kpis?.totalPending) || 0)}
          subtitle={`${Number(kpis?.urgentOrders) || 0} crítico + reorden`}
          icon={ShoppingCart}
          accentColor="#8CB32A"
          href="/ordenes"
        />
        <KPICard
          title="Stock 0 + OC Activa"
          value={formatNumber(Number(kpis?.stockCeroConOC) || 0)}
          subtitle="Presionar proveedor"
          icon="siren"
          accentColor="#dc2626"
          pulse
          href="/stock-cero-oc"
        />
      </div>

      {/* KPI Cards Row 2 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          title="Clase A (Alto Valor)"
          value={formatNumber(Number(kpis?.classA) || 0)}
          subtitle="Control estricto"
          icon={TrendingUp}
          accentColor="#8CB32A"
        />
        <KPICard
          title="Clase B (Medio)"
          value={formatNumber(Number(kpis?.classB) || 0)}
          subtitle="Control moderado"
          icon={TrendingDown}
          accentColor="#009890"
        />
        <KPICard
          title="Clase C (Normal)"
          value={formatNumber(Number(kpis?.classC) || 0)}
          subtitle="Control estándar"
          icon={Shield}
          accentColor="#281C19"
        />
        <KPICard
          title="Con Stock"
          value={formatNumber(Number(kpis?.withStock) || 0)}
          subtitle={`Promedio: ${(Number(kpis?.avgStock) || 0).toFixed(1)} und/ref`}
          icon={Package}
          accentColor="#8CB32A"
        />
      </div>

      {/* JIT Semaphore */}
      <Card className="cyber-card p-6 rounded-xl">
        <h2 className="text-lg font-bold mb-4 tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#281C19' }}>
          SEMÁFORO DE ALERTAS — SISTEMA JIT
        </h2>
        <p className="text-xs text-muted-foreground mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Punto de Reorden Dinámico — Principios Logísticos Ballou Cap. 9
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SemaphoreCard
            count={Number(jit?.critico) || 0}
            label="CRÍTICO"
            sublabel="Stock Cero — Riesgo Parada"
            accentColor="#dc2626"
            bgHex="#fee2e2"
            pulse
          />
          <SemaphoreCard
            count={Number(jit?.reorden) || 0}
            label="REORDEN"
            sublabel="Stock ≤ Punto Reorden"
            accentColor="#ea580c"
            bgHex="#fff7ed"
          />
          <SemaphoreCard
            count={Number(jit?.precaucion) || 0}
            label="PRECAUCIÓN"
            sublabel="Revisar en 48 horas"
            accentColor="#ca8a04"
            bgHex="#fefce8"
          />
          <SemaphoreCard
            count={Number(jit?.optimo) || 0}
            label="SEGURO"
            sublabel="Nivel Óptimo JIT"
            accentColor="#8CB32A"
            bgHex="#f0f9e8"
          />
        </div>
      </Card>

      {/* Charts Row — Pure CSS, NO Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Value by Category — Horizontal CSS Bars */}
        <Card className="cyber-card p-6 rounded-xl">
          <h2 className="text-sm font-bold mb-4 tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#281C19' }}>
            VALOR POR CATEGORÍA
          </h2>
          <div className="space-y-3">
            {categoryData.map((cat) => {
              const pct = maxCatValue > 0 ? (cat.value / maxCatValue) * 100 : 0;
              const barColor = CATEGORY_COLORS[cat.name] || "#a78bfa";
              return (
                <div key={cat.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: barColor }} />
                      <span className="text-foreground font-medium">{cat.name}</span>
                    </div>
                    <span className="text-muted-foreground font-mono text-[11px]">{formatCurrency(cat.value)}</span>
                  </div>
                  <div className="w-full h-3 bg-muted/30 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, backgroundColor: barColor, boxShadow: `0 0 8px ${barColor}40` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* ABC Classification — CSS Donut */}
        <Card className="cyber-card p-6 rounded-xl">
          <h2 className="text-sm font-bold mb-4 tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#281C19' }}>
            CLASIFICACIÓN ABC — PARETO 80/20
          </h2>
          <div className="flex flex-col items-center gap-4">
            {/* SVG Donut */}
            <svg viewBox="0 0 200 200" className="w-48 h-48">
              {(() => {
                let cumAngle = -90;
                return abcData.map((d) => {
                  const angle = (d.value / abcTotal) * 360;
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
                  const pathD = `M 100 100 L ${x1} ${y1} A 70 70 0 ${largeArc} 1 ${x2} ${y2} Z`;
                  return <path key={d.name} d={pathD} fill={d.color} fillOpacity={0.9} stroke="#ffffff" strokeWidth="2" />;
                });
              })()}
              <circle cx="100" cy="100" r="40" fill="#ffffff" stroke="#e5e7eb" strokeWidth="1" />
              <text x="100" y="95" textAnchor="middle" fill="#281C19" fontSize="14" fontFamily="'Space Grotesk', sans-serif" fontWeight="bold">
                {formatNumber(abcTotal)}
              </text>
              <text x="100" y="115" textAnchor="middle" fill="#6b7280" fontSize="10" fontFamily="'Space Grotesk', sans-serif">
                Total Refs
              </text>
            </svg>

            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-4">
              {abcData.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-muted-foreground">
                    {d.name} ({d.label}): <span className="text-foreground font-semibold">{formatNumber(d.value)}</span>
                    <span className="text-muted-foreground ml-1">({((d.value / abcTotal) * 100).toFixed(0)}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Category Detail Table */}
      <Card className="cyber-card p-6 rounded-xl overflow-hidden">
          <h2 className="text-sm font-bold mb-4 tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#281C19' }}>
            DISTRIBUCIÓN POR CUENTA
          </h2>
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
              {categoryData.map((cat, i) => {
                const totalVal = categoryData.reduce((s, c) => s + c.value, 0);
                const pct = totalVal > 0 ? ((cat.value / totalVal) * 100).toFixed(1) : "0";
                return (
                  <tr key={i} className="border-b transition-colors hover:bg-lime-50" style={{ borderColor: 'rgba(140,179,42,0.12)' }}>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat.name] || "#009890" }} />
                        <span className="font-medium" style={{ color: '#281C19' }}>{cat.name}</span>
                      </div>
                    </td>
                    <td className="text-right py-2.5 px-3 font-mono font-bold" style={{ color: '#009890' }}>{formatCurrency(cat.value)}</td>
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
      <div className="text-center text-xs text-muted-foreground py-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Principios Logísticos Aplicados — Ballou, Logística: Cadena de Suministro 5ta Ed. — Clasificación ABC, JIT, EOQ, Stock de Seguridad
      </div>
    </div>
  );
}

function KPICard({
  title, value, subtitle, icon, accentColor, pulse, href,
}: {
  title: string; value: string; subtitle: string;
  icon: any; // puede ser componente Lucide o string 'alert' | 'siren'
  accentColor: string; pulse?: boolean; href?: string;
}) {
  const [, setLocation] = useLocation();
  const isAlert = icon === 'alert';
  const isSiren = icon === 'siren';
  const isCustomSvg = isAlert || isSiren;

  return (
    <Card
      className={`kpi-card-corp p-4 rounded-xl transition-all hover:scale-[1.02] ${href ? "cursor-pointer" : ""}`}
      style={{
        borderLeft: `3px solid ${accentColor}`,
        ...(pulse ? { boxShadow: `0 0 16px ${accentColor}35, inset 0 0 24px ${accentColor}08` } : {}),
      }}
      onClick={() => href && setLocation(href)}
    >
      <div className="flex items-start justify-between mb-2">
        {/* Icono: SVG inline si es alert/siren, Lucide en caso contrario */}
        {isAlert ? (
          <div
            style={{
              background: `${accentColor}18`,
              borderRadius: '8px',
              padding: '5px',
              display: 'inline-flex',
              boxShadow: pulse ? `0 0 10px ${accentColor}60` : 'none',
            }}
            className={pulse ? 'animate-pulse-neon' : ''}
          >
            <AlertIcon size={18} color={accentColor} />
          </div>
        ) : isSiren ? (
          <div
            style={{
              background: `${accentColor}18`,
              borderRadius: '8px',
              padding: '5px',
              display: 'inline-flex',
              boxShadow: pulse ? `0 0 10px ${accentColor}60` : 'none',
            }}
            className={pulse ? 'animate-pulse-neon' : ''}
          >
            <SirenIcon size={18} color={accentColor} />
          </div>
        ) : (
          (() => {
            const Icon = icon;
            return (
              <Icon
                className={`h-5 w-5 ${pulse ? 'animate-pulse-neon' : ''}`}
                style={{ color: accentColor }}
              />);
          })()
        )}
        {href && (
          <span
            className="text-[9px] px-1.5 py-0.5 rounded font-bold"
            style={{ background: `${accentColor}15`, color: accentColor }}
          >
            →
          </span>
        )}
      </div>
      <div
        className="text-2xl md:text-3xl font-black tracking-wider"
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          color: accentColor,
          ...(pulse ? { textShadow: `0 0 12px ${accentColor}80` } : {}),
        }}
      >
        {value}
      </div>
      <div className="text-xs font-semibold mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#281C19' }}>
        {title}
      </div>
      <div className="text-[10px] mt-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#6b7280' }}>
        {subtitle}
      </div>
    </Card>
  );
}

function SemaphoreCard({
  count, label, sublabel, accentColor, bgHex, pulse,
}: {
  count: number; label: string; sublabel: string; accentColor: string; bgHex: string; pulse?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 transition-all hover:scale-[1.02] ${pulse ? 'animate-pulse-neon' : ''}`}
      style={{
        background: `linear-gradient(135deg, ${bgHex} 60%, ${accentColor}10 100%)`,
        border: `1.5px solid ${accentColor}55`,
        boxShadow: `0 0 18px ${accentColor}35, 0 2px 8px ${accentColor}20`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Barra decorativa superior */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          background: `linear-gradient(90deg, ${accentColor}, ${accentColor}40)`,
          borderRadius: '12px 12px 0 0',
        }}
      />
      <div
        className="text-3xl md:text-4xl font-black"
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          color: accentColor,
          textShadow: pulse ? `0 0 14px ${accentColor}90` : `0 0 6px ${accentColor}30`,
        }}
      >
        {formatNumber(count)}
      </div>
      <div
        className="text-xs font-bold mt-2 tracking-widest uppercase"
        style={{ fontFamily: "'Space Grotesk', sans-serif", color: accentColor }}
      >
        {label}
      </div>
      <div className="text-[10px] mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#6b7280' }}>
        {sublabel}
      </div>
    </div>
  );
}
