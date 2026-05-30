/**
 * Consumo v2.0 — Análisis de Consumo Mensual con Vega-Lite
 * Gráficos declarativos interactivos (equivalente a Altair en Python)
 */
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Loader2, BarChart3, TrendingUp, TrendingDown,
  AlertTriangle, Package, Search, Zap, Clock, ShieldAlert,
} from "lucide-react";
import { useState, useMemo } from "react";
import { VegaChart, areaSpec, hbarSpec, barSpec } from "@/components/VegaChart";

function formatNumber(val: number) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(val);
}

function AlertIcon({ tipo }: { tipo: string }) {
  if (tipo === "RIESGO_DESABASTECIMIENTO") return <ShieldAlert className="h-4 w-4" style={{ color: "#DC2626" }} />;
  if (tipo === "DEMANDA_EN_AUMENTO") return <TrendingUp className="h-4 w-4" style={{ color: "#F97316" }} />;
  if (tipo === "SIN_ROTACION") return <Clock className="h-4 w-4" style={{ color: "#EAB308" }} />;
  if (tipo === "EN_DESCENSO") return <TrendingDown className="h-4 w-4" style={{ color: "#3B82F6" }} />;
  return <Package className="h-4 w-4" />;
}

function AlertLabel({ tipo }: { tipo: string }) {
  const labels: Record<string, string> = {
    RIESGO_DESABASTECIMIENTO: "RIESGO DESABASTECIMIENTO",
    DEMANDA_EN_AUMENTO: "DEMANDA EN AUMENTO",
    SIN_ROTACION: "SIN ROTACIÓN",
    EN_DESCENSO: "EN DESCENSO",
  };
  return <>{labels[tipo] || tipo}</>;
}

export default function ConsumoPage() {
  const { data: summary, isLoading: summaryLoading } = trpc.consumo.summary.useQuery();
  const { data: byMonth, isLoading: monthLoading } = trpc.consumo.byMonth.useQuery();
  const { data: topConsumers } = trpc.consumo.topConsumers.useQuery();
  const { data: alerts } = trpc.consumo.alerts.useQuery();
  const [searchRef, setSearchRef] = useState("");

  const { data: refData } = trpc.consumo.byRef.useQuery(
    { referencia: searchRef },
    { enabled: searchRef.length >= 4 }
  );

  // ── Specs Vega-Lite ──────────────────────────────────────────────────
  const monthChartSpec = useMemo(() => {
    const data = (byMonth || []).map((m) => ({
      label: String(m.mes),
      value: Number(m.totalConsumo) || 0,
    }));
    return areaSpec(data, {
      yLabel: "Unidades consumidas",
      height: 200,
      color: "#009890",
    });
  }, [byMonth]);

  const topBarSpec = useMemo(() => {
    const data = (topConsumers || []).slice(0, 15).map((tc) => ({
      label: tc.referencia,
      value: Number(tc.totalConsumo) || 0,
    }));
    return hbarSpec(data, {
      xLabel: "Total consumido",
      height: 340,
      color: "#8CB32A",
    });
  }, [topConsumers]);

  const refChartSpec = useMemo(() => {
    if (!refData || refData.length === 0) return null;
    const data = refData.map((d) => ({
      label: String(d.mes).substring(2).replace('-', '/'),
      value: d.cantidad,
      color: d.cantidad > 0 ? "#8CB32A" : "#DC2626",
    }));
    return barSpec(data, {
      title: `${refData[0]?.descripcion || searchRef} — Consumo mensual`,
      yLabel: "Unidades",
      height: 180,
      colorField: false,
    });
  }, [refData, searchRef]);

  // Alert type summary bar
  const alertCounts: Record<string, number> = {};
  (alerts || []).forEach((a) => { alertCounts[a.tipo] = (alertCounts[a.tipo] || 0) + 1; });

  const alertBarSpec = useMemo(() => {
    const labelMap: Record<string, string> = {
      RIESGO_DESABASTECIMIENTO: "Riesgo",
      DEMANDA_EN_AUMENTO: "↑ Aumento",
      SIN_ROTACION: "Sin rotación",
      EN_DESCENSO: "↓ Descenso",
    };
    const data = Object.entries(alertCounts).map(([tipo, count]) => ({
      label: labelMap[tipo] || tipo,
      value: count,
    }));
    return barSpec(data, {
      title: "Distribución de alertas",
      yLabel: "# referencias",
      height: 140,
      colorField: true,
    });
  }, [alertCounts]);

  if (summaryLoading || monthLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#8CB32A" }} />
          <span className="text-sm font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#009890" }}>
            CARGANDO CONSUMO...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6" style={{ color: "#009890" }} />
        <div>
          <h1 className="text-2xl font-black tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#281C19" }}>
            CONSUMO MENSUAL
          </h1>
          <p className="text-sm text-muted-foreground">
            Análisis declarativo de tendencias y alertas de abastecimiento — Vega-Lite
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Referencias", value: formatNumber(Number(summary?.totalRefs) || 0), sub: "Con datos de consumo", color: "#009890" },
          { label: "Total Consumido", value: formatNumber(Number(summary?.totalConsumo) || 0), sub: "Unidades acumuladas", color: "#8CB32A" },
          { label: "Meses", value: `${Number(summary?.meses) || 0}`, sub: `${summary?.mesMin || "—"} → ${summary?.mesMax || "—"}`, color: "#F97316" },
          { label: "Riesgo Desabast.", value: `${alertCounts["RIESGO_DESABASTECIMIENTO"] || 0}`, sub: "Comprar urgente", color: "#DC2626" },
          { label: "Sin Rotación", value: `${alertCounts["SIN_ROTACION"] || 0}`, sub: "Evaluar obsolescencia", color: "#EAB308" },
        ].map((kpi) => (
          <Card key={kpi.label} className="kpi-card-corp p-4 rounded-xl" style={{ borderLeft: `3px solid ${kpi.color}` }}>
            <div className="text-2xl font-black" style={{ fontFamily: "'Space Grotesk', sans-serif", color: kpi.color }}>
              {kpi.value}
            </div>
            <div className="text-xs font-semibold mt-1" style={{ color: "#281C19" }}>{kpi.label}</div>
            <div className="text-[10px]" style={{ color: "#6b7280" }}>{kpi.sub}</div>
          </Card>
        ))}
      </div>

      {/* Tendencia mensual — Vega-Lite Area Chart */}
      <Card className="cyber-card p-6 rounded-xl">
        <h2 className="text-sm font-bold mb-1 tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#281C19" }}>
          TENDENCIA DE CONSUMO POR MES
        </h2>
        <p className="text-[11px] text-muted-foreground mb-4">Unidades consumidas acumuladas — gráfico interactivo Vega-Lite</p>
        <VegaChart spec={monthChartSpec} style={{ width: "100%" }} />
      </Card>

      {/* Top Consumidores + Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 15 — Vega-Lite Horizontal Bar */}
        <Card className="cyber-card p-6 rounded-xl">
          <h2 className="text-sm font-bold mb-1 tracking-wider flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#281C19" }}>
            <Zap className="h-4 w-4" style={{ color: "#8CB32A" }} />
            TOP 15 MÁS CONSUMIDAS
          </h2>
          <p className="text-[11px] text-muted-foreground mb-3">Barras horizontales — pasar el cursor para ver detalle</p>
          <VegaChart spec={topBarSpec} style={{ width: "100%" }} />
        </Card>

        {/* Alertas */}
        <Card className="cyber-card p-6 rounded-xl">
          <h2 className="text-sm font-bold mb-1 tracking-wider flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#281C19" }}>
            <AlertTriangle className="h-4 w-4" style={{ color: "#DC2626" }} />
            ALERTAS DE ABASTECIMIENTO
          </h2>
          {/* Mini bar por tipo */}
          <VegaChart spec={alertBarSpec} style={{ width: "100%", marginBottom: 12 }} />
          {/* Listado detallado */}
          <div className="space-y-2 max-h-[260px] overflow-y-auto mt-2">
            {(alerts || []).length === 0 ? (
              <p className="text-sm text-center py-4 text-muted-foreground">Sin alertas — todo estable ✓</p>
            ) : (
              (alerts || []).slice(0, 20).map((a, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 py-2 px-3 rounded-lg transition-colors hover:bg-gray-50"
                  style={{ borderLeft: `3px solid ${a.color}` }}
                >
                  <AlertIcon tipo={a.tipo} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold" style={{ color: "#009890" }}>{a.referencia}</span>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ background: `${a.color}15`, color: a.color, border: `1px solid ${a.color}30` }}
                      >
                        <AlertLabel tipo={a.tipo} />
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{a.descripcion || "—"}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: a.color }}>{a.mensaje}</p>
                  </div>
                  <span className="text-xs font-mono font-bold whitespace-nowrap" style={{ color: "#281C19" }}>
                    stk: {a.stockActual}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Búsqueda por referencia — Vega-Lite Bar */}
      <Card className="cyber-card p-6 rounded-xl">
        <h2 className="text-sm font-bold mb-4 tracking-wider flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#281C19" }}>
          <Search className="h-4 w-4" style={{ color: "#009890" }} />
          CONSULTAR CONSUMO POR REFERENCIA
        </h2>
        <div className="flex gap-3 items-center mb-4">
          <Input
            placeholder="Ingresa referencia (ej: 12330007-R)..."
            value={searchRef}
            onChange={(e) => setSearchRef(e.target.value.trim())}
            className="max-w-xs bg-white border-[#009890]/20 focus:border-[#009890]/50"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          />
          {searchRef.length > 0 && searchRef.length < 4 && (
            <span className="text-xs text-muted-foreground">Mínimo 4 caracteres</span>
          )}
        </div>
        {refData && refData.length > 0 && refChartSpec && (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div>
                <p className="text-xs font-bold" style={{ color: "#281C19" }}>
                  {refData[0].descripcion || searchRef}
                </p>
                {refData[0].fabricante && (
                  <p className="text-[10px]" style={{ color: "#6B7280" }}>PF: {refData[0].fabricante}</p>
                )}
              </div>
              <div className="ml-auto flex gap-4 text-xs">
                <span className="font-mono">
                  <span style={{ color: "#6B7280" }}>Total: </span>
                  <strong style={{ color: "#281C19" }}>
                    {formatNumber(refData.reduce((s, d) => s + d.cantidad, 0))}
                  </strong>
                </span>
                <span className="font-mono">
                  <span style={{ color: "#6B7280" }}>Prom/mes: </span>
                  <strong style={{ color: "#009890" }}>
                    {(refData.filter(d => d.cantidad > 0).reduce((s, d) => s + d.cantidad, 0) /
                      Math.max(refData.filter(d => d.cantidad > 0).length, 1)).toFixed(1)}
                  </strong>
                </span>
              </div>
            </div>
            <VegaChart spec={refChartSpec} style={{ width: "100%" }} />
          </div>
        )}
        {refData && refData.length === 0 && searchRef.length >= 4 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No se encontró consumo para "{searchRef}"
          </p>
        )}
      </Card>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground py-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Consumo v2.0 — Vega-Lite · Datos sincronizados desde "Consumo general mensual" (Google Drive)
      </div>
    </div>
  );
}
