import { trpc } from "@/lib/trpc";
import { Loader2, Package, ShoppingCart, TrendingUp, TrendingDown, Shield, Clock, Banknote, AlertTriangle, Siren } from "lucide-react";
import { BusTransmilenio } from "@/components/BusTransmilenio";
import { useLocation } from "wouter";

// ─── Helpers de formato ────────────────────────────────────────────────────────
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
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(val);
}

// ─── Paleta corporativa ────────────────────────────────────────────────────────
const CORP_GREEN  = "#8CB32A";
const CORP_TEAL   = "#009890";
const CORP_DARK   = "#281C19";
const CORP_RED    = "#dc2626";
const CORP_ORANGE = "#ea580c";
const CORP_AMBER  = "#ca8a04";

const CATEGORY_COLORS: Record<string, string> = {
  PLATAFORMA:     CORP_GREEN,
  LLANTAS:        CORP_TEAL,
  LUBRICANTES:    "#5a8c1a",
  CARROCERIA:     "#007a74",
  COMUNICACIONES: "#a3c940",
  ELECTRICIDAD:   "#00b8af",
  CAJA:           CORP_DARK,
  COMBUSTIBLE:    "#4a3530",
};

// ─── SVG inline AlertTriangle (evita distorsión en algunos entornos) ──────────
function AlertIcon({ size = 18, color = CORP_RED }: { size?: number; color?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function SirenIcon({ size = 18, color = CORP_RED }: { size?: number; color?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

// ─── Componente KPI Card (Asset Tracker style) ────────────────────────────────
function ATKpiCard({
  title, value, subtitle, accentColor, icon, pulse, href,
}: {
  title: string; value: string; subtitle: string;
  accentColor: string; icon: "alert" | "siren" | "package" | "cart" | "up" | "down" | "shield" | "banknote";
  pulse?: boolean; href?: string;
}) {
  const [, setLocation] = useLocation();

  const iconEl = (() => {
    const cls = `at-kpi-icon${pulse ? " animate-pulse-neon" : ""}`;
    const style = { color: accentColor };
    switch (icon) {
      case "alert":   return <AlertIcon size={18} color={accentColor} />;
      case "siren":   return <SirenIcon size={18} color={accentColor} />;
      case "package": return <Package  className={cls} style={style} />;
      case "cart":    return <ShoppingCart className={cls} style={style} />;
      case "up":      return <TrendingUp   className={cls} style={style} />;
      case "down":    return <TrendingDown className={cls} style={style} />;
      case "shield":  return <Shield       className={cls} style={style} />;
      case "banknote":return <Banknote     className={cls} style={style} />;
    }
  })();

  return (
    <div
      className={`at-card at-kpi${href ? " cursor-pointer" : ""}${pulse ? " at-pulse" : ""}`}
      style={{ "--at-accent": accentColor } as React.CSSProperties}
      onClick={() => href && setLocation(href)}
      role={href ? "button" : undefined}
      tabIndex={href ? 0 : undefined}
      onKeyDown={(e) => e.key === "Enter" && href && setLocation(href)}
    >
      <div className="at-kpi-header">
        <div
          className="at-kpi-icon-wrap"
          style={{
            background: `${accentColor}18`,
            boxShadow: pulse ? `0 0 10px ${accentColor}60` : "none",
          }}
        >
          {iconEl}
        </div>
        {href && (
          <span className="at-badge" style={{ background: `${accentColor}18`, color: accentColor }}>→</span>
        )}
      </div>
      <div
        className="at-kpi-value"
        style={{
          color: accentColor,
          textShadow: pulse ? `0 0 14px ${accentColor}80` : "none",
        }}
      >
        {value}
      </div>
      <div className="at-kpi-title">{title}</div>
      <div className="at-kpi-sub">{subtitle}</div>
    </div>
  );
}

// ─── Semáforo JIT ─────────────────────────────────────────────────────────────
function JITCard({
  count, label, sublabel, accentColor, bgHex, pulse,
}: {
  count: number; label: string; sublabel: string; accentColor: string; bgHex: string; pulse?: boolean;
}) {
  return (
    <div
      className={`at-jit-card${pulse ? " at-pulse" : ""}`}
      style={{
        background: `linear-gradient(135deg, ${bgHex} 60%, ${accentColor}10 100%)`,
        border: `1.5px solid ${accentColor}55`,
        boxShadow: `0 0 18px ${accentColor}35, 0 2px 8px ${accentColor}20`,
      }}
    >
      <div className="at-jit-bar" style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}40)` }} />
      <div className="at-jit-count" style={{ color: accentColor, textShadow: pulse ? `0 0 14px ${accentColor}90` : `0 0 6px ${accentColor}30` }}>
        {formatNumber(count)}
      </div>
      <div className="at-jit-label" style={{ color: accentColor }}>{label}</div>
      <div className="at-jit-sub">{sublabel}</div>
    </div>
  );
}

// ─── Gráfico de dona SVG ──────────────────────────────────────────────────────
function DonutChart({
  data, label,
}: {
  data: { name: string; value: number; color: string; sublabel?: string }[];
  label: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let cumAngle = -90;

  return (
    <div className="at-donut-wrap">
      <svg viewBox="0 0 200 200" className="at-donut-svg">
        {data.map((d) => {
          const angle = (d.value / total) * 360;
          const startAngle = cumAngle;
          cumAngle += angle;
          const endAngle = cumAngle;
          const startRad = (startAngle * Math.PI) / 180;
          const endRad   = (endAngle   * Math.PI) / 180;
          const x1 = 100 + 70 * Math.cos(startRad);
          const y1 = 100 + 70 * Math.sin(startRad);
          const x2 = 100 + 70 * Math.cos(endRad);
          const y2 = 100 + 70 * Math.sin(endRad);
          const largeArc = angle > 180 ? 1 : 0;
          return (
            <path
              key={d.name}
              d={`M 100 100 L ${x1} ${y1} A 70 70 0 ${largeArc} 1 ${x2} ${y2} Z`}
              fill={d.color}
              fillOpacity={0.9}
              stroke="#ffffff"
              strokeWidth="2"
            />
          );
        })}
        <circle cx="100" cy="100" r="42" fill="white" stroke="#e5e7eb" strokeWidth="1" />
        <text x="100" y="95" textAnchor="middle" fill={CORP_DARK} fontSize="14"
          fontFamily="'Space Grotesk', sans-serif" fontWeight="bold">
          {formatNumber(total)}
        </text>
        <text x="100" y="114" textAnchor="middle" fill="#6b7280" fontSize="10"
          fontFamily="'Space Grotesk', sans-serif">
          {label}
        </text>
      </svg>
      <div className="at-donut-legend">
        {data.map((d) => (
          <div key={d.name} className="at-donut-item">
            <div className="at-donut-dot" style={{ backgroundColor: d.color }} />
            <span className="at-donut-name">{d.name}</span>
            <span className="at-donut-val">{formatNumber(d.value)}</span>
            <span className="at-donut-pct">({((d.value / total) * 100).toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function Home() {
  const { data: kpis,       isLoading: kpisLoading } = trpc.dashboard.kpis.useQuery();
  const { data: jit,        isLoading: jitLoading  } = trpc.dashboard.jitAlerts.useQuery();
  const { data: categories, isLoading: catLoading  } = trpc.dashboard.valueByCategory.useQuery();
  const { data: lastSync }                            = trpc.dashboard.lastSync.useQuery();

  if (kpisLoading || jitLoading || catLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: CORP_GREEN }} />
          <span className="text-sm font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: CORP_TEAL }}>
            CARGANDO SISTEMA...
          </span>
        </div>
      </div>
    );
  }

  // ── Datos derivados ──────────────────────────────────────────────────────────
  const categoryData = (categories || []).map((c) => ({
    name:  c.cuenta || "N/A",
    value: Number(c.totalValue)  || 0,
    items: Number(c.itemCount)   || 0,
    zero:  Number(c.zeroStock)   || 0,
  }));
  const maxCatValue = Math.max(...categoryData.map((c) => c.value), 1);
  const totalCatValue = categoryData.reduce((s, c) => s + c.value, 0) || 1;

  // Tabla de riesgo: categorías con stock cero > 0, ordenadas por riesgo
  const riskData = [...categoryData]
    .filter((c) => c.zero > 0)
    .sort((a, b) => (b.zero / b.items) - (a.zero / a.items))
    .slice(0, 6);

  // Dona 1: distribución por categoría (top 5 + otros)
  const top5 = [...categoryData].sort((a, b) => b.value - a.value).slice(0, 5);
  const othersVal = categoryData.slice(5).reduce((s, c) => s + c.value, 0);
  const donutCat = [
    ...top5.map((c) => ({ name: c.name, value: c.value, color: CATEGORY_COLORS[c.name] || "#a78bfa" })),
    ...(othersVal > 0 ? [{ name: "Otros", value: othersVal, color: "#9ca3af" }] : []),
  ];

  // Dona 2: estado del inventario
  const donutEstado = [
    { name: "CRÍTICO",  value: Number(jit?.critico)   || 0, color: CORP_RED,    sublabel: "Stock Cero" },
    { name: "REORDEN",  value: Number(jit?.reorden)   || 0, color: CORP_ORANGE, sublabel: "Bajo Stock" },
    { name: "PRECAUCIÓN",value: Number(jit?.precaucion)|| 0, color: CORP_AMBER, sublabel: "Revisar" },
    { name: "SEGURO",   value: Number(jit?.optimo)    || 0, color: CORP_GREEN,  sublabel: "Óptimo" },
  ];

  return (
    <div className="at-page">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="at-header">
        <div className="at-header-left">
          <div className="at-header-title-row">
            <BusTransmilenio />
            <h1 className="at-title">ASSET TRACKER</h1>
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24"
              fill="none" stroke={CORP_TEAL} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="shrink-0" style={{ filter: `drop-shadow(0 0 4px ${CORP_TEAL}60)` }} aria-hidden="true">
              <circle cx="12" cy="4.5" r="2.5" />
              <path d="M12 7v3" />
              <circle cx="5" cy="19.5" r="2.5" />
              <path d="M5 17v-3.5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2V17" />
              <circle cx="19" cy="19.5" r="2.5" />
            </svg>
          </div>
          <p className="at-subtitle">
            Control de Inventario y Abastecimiento — Gestión de Flota 260 Buses — Somos Bogotá Usme
          </p>
        </div>
        {lastSync && (
          <div className="at-sync-badge">
            <Clock className="h-3.5 w-3.5" />
            <span>Última sync: {new Date(lastSync.startedAt).toLocaleString("es-CO")}</span>
          </div>
        )}
      </div>

      {/* ── KPI Row 1 ──────────────────────────────────────────────────────── */}
      <div className="at-kpi-grid">
        <ATKpiCard
          title="Total Referencias"
          value={formatNumber(Number(kpis?.totalRefs) || 0)}
          subtitle="Sin límite de crecimiento"
          icon="package"
          accentColor={CORP_TEAL}
          href="/inventario"
        />
        <ATKpiCard
          title="Valor Inventario"
          value={formatCurrency(Number(kpis?.totalValue) || 0)}
          subtitle={formatCurrencyFull(Number(kpis?.totalValue) || 0)}
          icon="banknote"
          accentColor={CORP_GREEN}
          href="/top-valor"
        />
        <ATKpiCard
          title="Stock CERO"
          value={formatNumber(Number(kpis?.zeroStock) || 0)}
          subtitle="Riesgo parada de flota"
          icon="alert"
          accentColor={CORP_RED}
          pulse
          href="/stock-cero"
        />
        <ATKpiCard
          title="Órdenes Pendientes"
          value={formatNumber(Number(kpis?.totalPending) || 0)}
          subtitle={`${Number(kpis?.urgentOrders) || 0} crítico + reorden`}
          icon="cart"
          accentColor={CORP_GREEN}
          href="/ordenes"
        />
      </div>

      {/* ── KPI Row 2 ──────────────────────────────────────────────────────── */}
      <div className="at-kpi-grid">
        <ATKpiCard
          title="Stock 0 + OC Activa"
          value={formatNumber(Number(kpis?.stockCeroConOC) || 0)}
          subtitle="Presionar proveedor"
          icon="siren"
          accentColor={CORP_RED}
          pulse
          href="/stock-cero-oc"
        />
        <ATKpiCard
          title="Clase A (Alto Valor)"
          value={formatNumber(Number(kpis?.classA) || 0)}
          subtitle="Control estricto"
          icon="up"
          accentColor={CORP_GREEN}
        />
        <ATKpiCard
          title="Clase B (Medio)"
          value={formatNumber(Number(kpis?.classB) || 0)}
          subtitle="Control moderado"
          icon="down"
          accentColor={CORP_TEAL}
        />
        <ATKpiCard
          title="Con Stock"
          value={formatNumber(Number(kpis?.withStock) || 0)}
          subtitle={`Promedio: ${(Number(kpis?.avgStock) || 0).toFixed(1)} und/ref`}
          icon="shield"
          accentColor={CORP_GREEN}
        />
      </div>

      {/* ── Barras de valor por categoría + Tabla de riesgo ────────────────── */}
      <div className="at-row-2col">

        {/* Barras de valor */}
        <div className="at-card at-section">
          <h2 className="at-section-title">VALOR POR CATEGORÍA</h2>
          <p className="at-section-sub">Distribución del inventario valorizado</p>
          <div className="at-bars">
            {categoryData.map((cat) => {
              const pct = maxCatValue > 0 ? (cat.value / maxCatValue) * 100 : 0;
              const color = CATEGORY_COLORS[cat.name] || "#a78bfa";
              return (
                <div key={cat.name} className="at-bar-row">
                  <div className="at-bar-meta">
                    <div className="flex items-center gap-2">
                      <div className="at-bar-dot" style={{ backgroundColor: color }} />
                      <span className="at-bar-name">{cat.name}</span>
                    </div>
                    <span className="at-bar-val">{formatCurrency(cat.value)}</span>
                  </div>
                  <div className="at-bar-track">
                    <div
                      className="at-bar-fill"
                      style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 8px ${color}40` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tabla de riesgo stock cero */}
        <div className="at-card at-section">
          <h2 className="at-section-title">CATEGORÍAS CON MAYOR RIESGO STOCK CERO</h2>
          <p className="at-section-sub">Ordenado por % de referencias en cero</p>
          <div className="overflow-x-auto">
            <table className="at-table">
              <thead>
                <tr>
                  <th className="text-left">Categoría</th>
                  <th className="text-right">Stock Cero</th>
                  <th className="text-right">Total Refs</th>
                  <th className="text-right">% Riesgo</th>
                </tr>
              </thead>
              <tbody>
                {riskData.map((cat) => {
                  const riskPct = cat.items > 0 ? ((cat.zero / cat.items) * 100).toFixed(1) : "0";
                  const riskNum = parseFloat(riskPct);
                  const riskColor = riskNum >= 40 ? CORP_RED : riskNum >= 20 ? CORP_ORANGE : CORP_AMBER;
                  return (
                    <tr key={cat.name}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="at-bar-dot" style={{ backgroundColor: CATEGORY_COLORS[cat.name] || CORP_TEAL }} />
                          <span style={{ color: CORP_DARK, fontWeight: 500 }}>{cat.name}</span>
                        </div>
                      </td>
                      <td className="text-right font-bold" style={{ color: CORP_RED }}>{cat.zero}</td>
                      <td className="text-right text-muted-foreground">{cat.items}</td>
                      <td className="text-right">
                        <span
                          className="at-badge"
                          style={{ background: `${riskColor}18`, color: riskColor, fontWeight: 700 }}
                        >
                          {riskPct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Semáforo JIT ────────────────────────────────────────────────────── */}
      <div className="at-card at-section">
        <h2 className="at-section-title">SEMÁFORO DE ALERTAS — SISTEMA JIT</h2>
        <p className="at-section-sub">Punto de Reorden Dinámico — Principios Logísticos Ballou Cap. 9</p>
        <div className="at-jit-grid">
          <JITCard
            count={Number(jit?.critico)   || 0}
            label="CRÍTICO"
            sublabel="Stock Cero — Riesgo Parada"
            accentColor={CORP_RED}
            bgHex="#fee2e2"
            pulse
          />
          <JITCard
            count={Number(jit?.reorden)   || 0}
            label="REORDEN"
            sublabel="Stock ≤ Punto Reorden"
            accentColor={CORP_ORANGE}
            bgHex="#fff7ed"
          />
          <JITCard
            count={Number(jit?.precaucion)|| 0}
            label="PRECAUCIÓN"
            sublabel="Revisar en 48 horas"
            accentColor={CORP_AMBER}
            bgHex="#fefce8"
          />
          <JITCard
            count={Number(jit?.optimo)    || 0}
            label="SEGURO"
            sublabel="Nivel Óptimo JIT"
            accentColor={CORP_GREEN}
            bgHex="#f0f9e8"
          />
        </div>
      </div>

      {/* ── Gráficos de dona ─────────────────────────────────────────────────── */}
      <div className="at-row-2col">
        <div className="at-card at-section">
          <h2 className="at-section-title">DISTRIBUCIÓN POR CATEGORÍA</h2>
          <p className="at-section-sub">Participación en valor total del inventario</p>
          <DonutChart data={donutCat} label="Total Refs" />
        </div>

        <div className="at-card at-section">
          <h2 className="at-section-title">ESTADO DEL INVENTARIO</h2>
          <p className="at-section-sub">Clasificación JIT por nivel de stock</p>
          <DonutChart data={donutEstado} label="Refs" />
        </div>
      </div>

      {/* ── Tabla de distribución por cuenta ────────────────────────────────── */}
      <div className="at-card at-section">
        <h2 className="at-section-title">DISTRIBUCIÓN POR CUENTA</h2>
        <div className="overflow-x-auto">
          <table className="at-table">
            <thead>
              <tr>
                <th className="text-left">Categoría</th>
                <th className="text-right">Valor Total</th>
                <th className="text-right">Items</th>
                <th className="text-right">Stock Cero</th>
                <th className="text-right">% del Total</th>
              </tr>
            </thead>
            <tbody>
              {categoryData.map((cat, i) => {
                const pct = ((cat.value / totalCatValue) * 100).toFixed(1);
                return (
                  <tr key={i}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="at-bar-dot" style={{ backgroundColor: CATEGORY_COLORS[cat.name] || CORP_TEAL }} />
                        <span style={{ color: CORP_DARK, fontWeight: 500 }}>{cat.name}</span>
                      </div>
                    </td>
                    <td className="text-right font-mono font-bold" style={{ color: CORP_TEAL }}>
                      {formatCurrency(cat.value)}
                    </td>
                    <td className="text-right text-muted-foreground">{cat.items}</td>
                    <td className="text-right">
                      <span className={cat.zero > 0 ? "text-red-500 font-semibold" : "text-green-500"}>
                        {cat.zero}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="at-mini-track">
                          <div
                            className="at-mini-fill"
                            style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[cat.name] || "#a78bfa" }}
                          />
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

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <div className="at-footer">
        Principios Logísticos Aplicados — Ballou, Logística: Cadena de Suministro 5ta Ed. — Clasificación ABC, JIT, EOQ, Stock de Seguridad
      </div>
    </div>
  );
}
