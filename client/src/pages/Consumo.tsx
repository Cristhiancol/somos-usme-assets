/**
 * Consumo v1.0 — Análisis de Consumo Mensual
 * Vista de tendencias, top consumidores y alertas de abastecimiento
 */
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, BarChart3, TrendingUp, TrendingDown, AlertTriangle, Package, Search, Zap, Clock, ShieldAlert } from "lucide-react";
import { useState } from "react";

function formatNumber(val: number) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(val);
}

// Icono de alerta por tipo
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

  if (summaryLoading || monthLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#8CB32A' }} />
          <span className="text-sm font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#009890' }}>CARGANDO CONSUMO...</span>
        </div>
      </div>
    );
  }

  const maxMonthly = Math.max(...(byMonth || []).map(m => Number(m.totalConsumo) || 0), 1);

  // Count alerts by type
  const alertCounts: Record<string, number> = {};
  (alerts || []).forEach(a => { alertCounts[a.tipo] = (alertCounts[a.tipo] || 0) + 1; });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart3 className="h-6 w-6" style={{ color: '#009890' }} />
        <div>
          <h1 className="text-2xl font-black tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#281C19' }}>
            CONSUMO MENSUAL
          </h1>
          <p className="text-sm text-muted-foreground">Análisis de tendencias y alertas de abastecimiento</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="kpi-card-corp p-4 rounded-xl" style={{ borderLeft: '3px solid #009890' }}>
          <div className="text-2xl font-black" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#009890' }}>
            {formatNumber(Number(summary?.totalRefs) || 0)}
          </div>
          <div className="text-xs font-semibold mt-1" style={{ color: '#281C19' }}>Referencias</div>
          <div className="text-[10px]" style={{ color: '#6b7280' }}>Con datos de consumo</div>
        </Card>
        <Card className="kpi-card-corp p-4 rounded-xl" style={{ borderLeft: '3px solid #8CB32A' }}>
          <div className="text-2xl font-black" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#8CB32A' }}>
            {formatNumber(Number(summary?.totalConsumo) || 0)}
          </div>
          <div className="text-xs font-semibold mt-1" style={{ color: '#281C19' }}>Total Consumido</div>
          <div className="text-[10px]" style={{ color: '#6b7280' }}>Unidades acumuladas</div>
        </Card>
        <Card className="kpi-card-corp p-4 rounded-xl" style={{ borderLeft: '3px solid #F97316' }}>
          <div className="text-2xl font-black" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#F97316' }}>
            {Number(summary?.meses) || 0}
          </div>
          <div className="text-xs font-semibold mt-1" style={{ color: '#281C19' }}>Meses</div>
          <div className="text-[10px]" style={{ color: '#6b7280' }}>{summary?.mesMin || "—"} → {summary?.mesMax || "—"}</div>
        </Card>
        <Card className="kpi-card-corp p-4 rounded-xl" style={{ borderLeft: '3px solid #DC2626' }}>
          <div className="text-2xl font-black" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#DC2626' }}>
            {alertCounts["RIESGO_DESABASTECIMIENTO"] || 0}
          </div>
          <div className="text-xs font-semibold mt-1" style={{ color: '#281C19' }}>Riesgo Desabast.</div>
          <div className="text-[10px]" style={{ color: '#6b7280' }}>Comprar urgente</div>
        </Card>
        <Card className="kpi-card-corp p-4 rounded-xl" style={{ borderLeft: '3px solid #EAB308' }}>
          <div className="text-2xl font-black" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#EAB308' }}>
            {alertCounts["SIN_ROTACION"] || 0}
          </div>
          <div className="text-xs font-semibold mt-1" style={{ color: '#281C19' }}>Sin Rotación</div>
          <div className="text-[10px]" style={{ color: '#6b7280' }}>Evaluar obsolescencia</div>
        </Card>
      </div>

      {/* Consumo por Mes — Barras */}
      <Card className="cyber-card p-6 rounded-xl">
        <h2 className="text-sm font-bold mb-4 tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#281C19' }}>
          CONSUMO TOTAL POR MES
        </h2>
        <div className="flex items-end gap-2" style={{ height: 180 }}>
          {(byMonth || []).map((m, i) => {
            const pct = (Number(m.totalConsumo) / maxMonthly) * 100;
            const label = String(m.mes).slice(5); // "04", "05"...
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-mono font-bold" style={{ color: '#009890' }}>
                  {formatNumber(Number(m.totalConsumo))}
                </span>
                <div
                  className="w-full rounded-t-md transition-all duration-700"
                  style={{
                    height: `${Math.max(pct, 2)}%`,
                    background: `linear-gradient(180deg, #8CB32A, #009890)`,
                    minHeight: 4,
                  }}
                />
                <span className="text-[10px] font-mono" style={{ color: '#6B7280' }}>{label}</span>
                <span className="text-[9px]" style={{ color: '#9CA3AF' }}>
                  {Number(m.refsActivas)} refs
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Alertas + Top Consumidores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas de Abastecimiento */}
        <Card className="cyber-card p-6 rounded-xl">
          <h2 className="text-sm font-bold mb-4 tracking-wider flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#281C19' }}>
            <AlertTriangle className="h-4 w-4" style={{ color: '#DC2626' }} />
            ALERTAS DE ABASTECIMIENTO
          </h2>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {(alerts || []).length === 0 ? (
              <p className="text-sm text-center py-8 text-muted-foreground">Sin alertas — todo estable ✓</p>
            ) : (
              (alerts || []).slice(0, 25).map((a, i) => (
                <div key={i} className="flex items-start gap-3 py-2 px-3 rounded-lg transition-colors hover:bg-gray-50"
                  style={{ borderLeft: `3px solid ${a.color}` }}
                >
                  <AlertIcon tipo={a.tipo} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold" style={{ color: '#009890' }}>{a.referencia}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                        style={{ background: `${a.color}15`, color: a.color, border: `1px solid ${a.color}30` }}
                      >
                        <AlertLabel tipo={a.tipo} />
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground truncate">{a.descripcion || "—"}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: a.color }}>{a.mensaje}</p>
                  </div>
                  <span className="text-xs font-mono font-bold whitespace-nowrap" style={{ color: '#281C19' }}>
                    stk: {a.stockActual}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Top 20 Más Consumidas */}
        <Card className="cyber-card p-6 rounded-xl">
          <h2 className="text-sm font-bold mb-4 tracking-wider flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#281C19' }}>
            <Zap className="h-4 w-4" style={{ color: '#8CB32A' }} />
            TOP 20 MÁS CONSUMIDAS
          </h2>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {(topConsumers || []).map((tc, i) => {
              const maxTC = Number((topConsumers || [])[0]?.totalConsumo) || 1;
              const pct = (Number(tc.totalConsumo) / maxTC) * 100;
              return (
                <div key={i} className="flex items-center gap-3 py-1.5 px-2 rounded-md hover:bg-gray-50 transition-colors">
                  <span className="text-[10px] font-bold w-5 text-center" style={{ color: '#9CA3AF' }}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold" style={{ color: '#009890' }}>{tc.referencia}</span>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">{tc.descripcion || ""}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden mt-1" style={{ background: '#F3F4F6' }}>
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #8CB32A, #009890)' }} />
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold" style={{ color: '#281C19' }}>
                      {formatNumber(Number(tc.totalConsumo))}
                    </span>
                    <div className="text-[9px] text-muted-foreground">{Number(tc.promedioMes).toFixed(0)}/mes</div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Búsqueda por referencia */}
      <Card className="cyber-card p-6 rounded-xl">
        <h2 className="text-sm font-bold mb-4 tracking-wider flex items-center gap-2" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#281C19' }}>
          <Search className="h-4 w-4" style={{ color: '#009890' }} />
          CONSULTAR CONSUMO POR REFERENCIA
        </h2>
        <div className="flex gap-3 items-center mb-4">
          <Input
            placeholder="Ingresa referencia (ej: 2220200)..."
            value={searchRef}
            onChange={(e) => setSearchRef(e.target.value.trim())}
            className="max-w-xs bg-white border-[#009890]/20 focus:border-[#009890]/50"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          />
          {searchRef.length > 0 && searchRef.length < 4 && (
            <span className="text-xs text-muted-foreground">Mínimo 4 caracteres</span>
          )}
        </div>
        {refData && refData.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2" style={{ color: '#281C19' }}>
              {refData[0].descripcion || searchRef} — {refData[0].fabricante ? `PF: ${refData[0].fabricante}` : ""}
            </p>
            <div className="flex items-end gap-2" style={{ height: 120 }}>
              {refData.map((d, i) => {
                const maxQ = Math.max(...refData.map(r => r.cantidad), 1);
                const pct = (d.cantidad / maxQ) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-mono font-bold" style={{ color: d.cantidad > 0 ? '#8CB32A' : '#DC2626' }}>
                      {d.cantidad > 0 ? formatNumber(d.cantidad) : "0"}
                    </span>
                    <div
                      className="w-full rounded-t-md"
                      style={{
                        height: `${Math.max(pct, 2)}%`,
                        background: d.cantidad > 0 ? '#8CB32A' : '#FEE2E2',
                        minHeight: 2,
                      }}
                    />
                    <span className="text-[9px] font-mono" style={{ color: '#6B7280' }}>{String(d.mes).slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {refData && refData.length === 0 && searchRef.length >= 4 && (
          <p className="text-sm text-muted-foreground text-center py-4">No se encontró consumo para "{searchRef}"</p>
        )}
      </Card>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground py-2" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Consumo — Datos sincronizados desde "Consumo general mensual" (Google Drive)
      </div>
    </div>
  );
}
