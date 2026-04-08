import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Loader2, AlertTriangle } from "lucide-react";

export default function Top20ZeroPage() {
  const { data, isLoading } = trpc.dashboard.top20ZeroStock.useQuery();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-6 w-6 text-red-400 animate-pulse-neon" />
        <h1 className="text-xl font-bold text-red-400 tracking-wider" style={{ fontFamily: "Orbitron" }}>
          PRODUCTOS CRÍTICOS — STOCK CERO
        </h1>
      </div>
      <p className="text-sm text-muted-foreground" style={{ fontFamily: "Rajdhani" }}>
        Productos sin inventario con consumo activo — Riesgo de parada de flota — Ordenados por consumo anual
      </p>

      <Card className="cyber-card rounded-xl overflow-hidden cyber-glow-red">
        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-red-400" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ fontFamily: "Rajdhani" }}>
              <thead>
                <tr className="border-b border-red-500/20 bg-red-500/5">
                  <th className="text-center py-3 px-3 text-red-400 font-semibold text-xs">#</th>
                  <th className="text-left py-3 px-3 text-red-400 font-semibold text-xs">REFERENCIA</th>
                  <th className="text-left py-3 px-3 text-red-400 font-semibold text-xs">DESCRIPCIÓN</th>
                  <th className="text-left py-3 px-3 text-red-400 font-semibold text-xs">PROVEEDOR</th>
                  <th className="text-right py-3 px-3 text-red-400 font-semibold text-xs">CONSUMO ANUAL</th>
                  <th className="text-right py-3 px-3 text-red-400 font-semibold text-xs">CONSUMO DIARIO</th>
                  <th className="text-center py-3 px-3 text-red-400 font-semibold text-xs">ABC</th>
                  <th className="text-left py-3 px-3 text-red-400 font-semibold text-xs">CUENTA</th>
                </tr>
              </thead>
              <tbody>
                {(data || []).map((item, i) => {
                  const maxConsumo = data?.[0]?.consumoAnual || 1;
                  const pct = ((item.consumoAnual || 0) / maxConsumo) * 100;
                  return (
                    <tr key={i} className="border-b border-border/20 hover:bg-red-500/5 transition-colors">
                      <td className="py-3 px-3 text-center">
                        <span className={`font-black text-lg ${i < 3 ? "text-red-400 cyber-text-glow" : "text-muted-foreground"}`} style={{ fontFamily: "Orbitron" }}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-neon-cyan text-xs">{item.referencia}</td>
                      <td className="py-3 px-3 text-xs max-w-[200px]">{item.descripcion}</td>
                      <td className="py-3 px-3 text-xs text-muted-foreground max-w-[180px] truncate">{item.proveedor}</td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-mono text-red-400 font-bold text-xs">
                            {new Intl.NumberFormat("es-CO").format(item.consumoAnual || 0)}
                          </span>
                          <div className="w-20 h-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-red-500 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-orange-400 text-xs">
                        {(item.consumoDiario || 0).toFixed(1)}/día
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`font-bold text-xs ${item.claseAbc === "A" ? "text-neon-pink" : "text-neon-cyan"}`}>
                          {item.claseAbc}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-xs">{item.cuenta}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
