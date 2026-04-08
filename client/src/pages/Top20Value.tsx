import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Loader2, TrendingUp } from "lucide-react";

function formatCurrency(val: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val);
}

export default function Top20ValuePage() {
  const { data, isLoading } = trpc.dashboard.top20Value.useQuery();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="h-6 w-6 text-neon-pink" />
        <h1 className="text-xl font-bold text-neon-cyan tracking-wider" style={{ fontFamily: "Orbitron" }}>
          TOP 20 — MAYOR VALOR EN INVENTARIO
        </h1>
      </div>
      <p className="text-sm text-muted-foreground" style={{ fontFamily: "Rajdhani" }}>
        Clasificación automática por valor (Stock x Costo) — Productos de alto impacto financiero
      </p>

      <Card className="cyber-card rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-neon-pink" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ fontFamily: "Rajdhani" }}>
              <thead>
                <tr className="border-b border-neon-pink/20 bg-neon-pink/5">
                  <th className="text-center py-3 px-3 text-neon-pink font-semibold text-xs">#</th>
                  <th className="text-left py-3 px-3 text-neon-pink font-semibold text-xs">REFERENCIA</th>
                  <th className="text-left py-3 px-3 text-neon-pink font-semibold text-xs">DESCRIPCIÓN</th>
                  <th className="text-left py-3 px-3 text-neon-pink font-semibold text-xs">PROVEEDOR</th>
                  <th className="text-right py-3 px-3 text-neon-pink font-semibold text-xs">STOCK</th>
                  <th className="text-right py-3 px-3 text-neon-pink font-semibold text-xs">COSTO UNIT.</th>
                  <th className="text-right py-3 px-3 text-neon-pink font-semibold text-xs">VALOR TOTAL</th>
                  <th className="text-center py-3 px-3 text-neon-pink font-semibold text-xs">ABC</th>
                  <th className="text-left py-3 px-3 text-neon-pink font-semibold text-xs">CUENTA</th>
                </tr>
              </thead>
              <tbody>
                {(data || []).map((item, i) => {
                  const maxVal = data?.[0]?.totalStock || 1;
                  const pct = ((item.totalStock || 0) / maxVal) * 100;
                  return (
                    <tr key={i} className="border-b border-border/20 hover:bg-neon-cyan/5 transition-colors relative">
                      <td className="py-3 px-3 text-center">
                        <span className={`font-black text-lg ${i < 3 ? "text-neon-pink cyber-text-glow" : "text-muted-foreground"}`} style={{ fontFamily: "Orbitron" }}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-neon-cyan text-xs">{item.referencia}</td>
                      <td className="py-3 px-3 text-xs max-w-[200px]">{item.descripcion}</td>
                      <td className="py-3 px-3 text-xs text-muted-foreground max-w-[180px] truncate">{item.proveedor}</td>
                      <td className="py-3 px-3 text-right font-mono text-neon-green text-xs">{item.stockActual?.toFixed(0)}</td>
                      <td className="py-3 px-3 text-right font-mono text-xs">{formatCurrency(item.costoUnitario || 0)}</td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-mono text-neon-cyan font-bold text-xs">{formatCurrency(item.totalStock || 0)}</span>
                          <div className="w-20 h-1 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-neon-pink rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`font-bold text-xs ${item.claseAbc === "A" ? "text-neon-pink" : item.claseAbc === "B" ? "text-neon-cyan" : "text-neon-purple"}`}>
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
