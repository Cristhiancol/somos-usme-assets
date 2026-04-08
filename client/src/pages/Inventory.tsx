import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Package, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";

const CUENTAS = ["PLATAFORMA", "CAJA", "CARROCERIA", "COMBUSTIBLE", "COMUNICACIONES", "ELECTRICIDAD", "LLANTAS", "LUBRICANTES"];
const CLASES = ["A", "B", "C"];
const ESTADOS = ["CRITICO", "REORDEN", "PRECAUCION", "OPTIMO", "EXCESO"];

function formatCurrency(val: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val);
}

function getEstadoBadge(estado: string | null) {
  if (!estado) return null;
  const map: Record<string, string> = {
    CRITICO: "bg-red-500/20 text-red-400 border-red-500/30",
    REORDEN: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    PRECAUCION: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    OPTIMO: "bg-green-500/20 text-green-400 border-green-500/30",
    EXCESO: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };
  return <Badge variant="outline" className={`text-[10px] ${map[estado] || ""}`}>{estado}</Badge>;
}

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [cuenta, setCuenta] = useState<string>("");
  const [claseAbc, setClaseAbc] = useState<string>("");
  const [estado, setEstado] = useState<string>("");
  const [page, setPage] = useState(1);
  const limit = 50;

  const input = useMemo(() => ({
    search: search || undefined,
    cuenta: cuenta || undefined,
    claseAbc: claseAbc || undefined,
    estado: estado || undefined,
    page,
    limit,
  }), [search, cuenta, claseAbc, estado, page]);

  const { data, isLoading } = trpc.inventory.list.useQuery(input);

  const totalPages = Math.ceil((data?.total || 0) / limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Package className="h-6 w-6 text-neon-cyan" />
        <h1 className="text-xl font-bold text-neon-cyan tracking-wider" style={{ fontFamily: "Orbitron" }}>
          INVENTARIO COMPLETO
        </h1>
        <span className="text-xs text-muted-foreground ml-2" style={{ fontFamily: "Rajdhani" }}>
          {data?.total ?? "..."} referencias
        </span>
      </div>

      {/* Filters */}
      <Card className="cyber-card p-4 rounded-xl">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar referencia, descripción, proveedor..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 bg-cyber-dark border-neon-pink/20 focus:border-neon-pink/50"
              style={{ fontFamily: "Rajdhani" }}
            />
          </div>
          <Select value={cuenta} onValueChange={(v) => { setCuenta(v === "ALL" ? "" : v); setPage(1); }}>
            <SelectTrigger className="bg-cyber-dark border-neon-pink/20"><SelectValue placeholder="Categoría" /></SelectTrigger>
            <SelectContent className="cyber-card">
              <SelectItem value="ALL">Todas</SelectItem>
              {CUENTAS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={claseAbc} onValueChange={(v) => { setClaseAbc(v === "ALL" ? "" : v); setPage(1); }}>
            <SelectTrigger className="bg-cyber-dark border-neon-pink/20"><SelectValue placeholder="Clase ABC" /></SelectTrigger>
            <SelectContent className="cyber-card">
              <SelectItem value="ALL">Todas</SelectItem>
              {CLASES.map(c => <SelectItem key={c} value={c}>Clase {c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={estado} onValueChange={(v) => { setEstado(v === "ALL" ? "" : v); setPage(1); }}>
            <SelectTrigger className="bg-cyber-dark border-neon-pink/20"><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent className="cyber-card">
              <SelectItem value="ALL">Todos</SelectItem>
              {ESTADOS.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Table */}
      <Card className="cyber-card rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-neon-pink" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ fontFamily: "Rajdhani" }}>
              <thead>
                <tr className="border-b border-neon-pink/20 bg-neon-pink/5">
                  <th className="text-left py-3 px-3 text-neon-pink font-semibold text-xs">REF</th>
                  <th className="text-left py-3 px-3 text-neon-pink font-semibold text-xs">DESCRIPCIÓN</th>
                  <th className="text-left py-3 px-3 text-neon-pink font-semibold text-xs">CUENTA</th>
                  <th className="text-right py-3 px-3 text-neon-pink font-semibold text-xs">STOCK</th>
                  <th className="text-right py-3 px-3 text-neon-pink font-semibold text-xs">COSTO UNIT.</th>
                  <th className="text-right py-3 px-3 text-neon-pink font-semibold text-xs">VALOR TOTAL</th>
                  <th className="text-center py-3 px-3 text-neon-pink font-semibold text-xs">ABC</th>
                  <th className="text-center py-3 px-3 text-neon-pink font-semibold text-xs">ESTADO</th>
                  <th className="text-left py-3 px-3 text-neon-pink font-semibold text-xs">PROVEEDOR</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items || []).map((item, i) => (
                  <tr key={item.id} className={`border-b border-border/20 hover:bg-neon-cyan/5 transition-colors ${item.stockActual === 0 ? "bg-red-500/5" : ""}`}>
                    <td className="py-2 px-3 font-mono text-neon-cyan text-xs">{item.referencia}</td>
                    <td className="py-2 px-3 text-xs max-w-[200px] truncate">{item.descripcion}</td>
                    <td className="py-2 px-3 text-xs">{item.cuenta}</td>
                    <td className={`py-2 px-3 text-right font-mono text-xs ${item.stockActual === 0 ? "text-red-400 font-bold" : "text-neon-green"}`}>
                      {item.stockActual?.toFixed(0)}
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-xs">{formatCurrency(item.costoUnitario || 0)}</td>
                    <td className="py-2 px-3 text-right font-mono text-xs text-neon-cyan">{formatCurrency(item.totalStock || 0)}</td>
                    <td className="py-2 px-3 text-center">
                      <span className={`text-xs font-bold ${item.claseAbc === "A" ? "text-neon-pink" : item.claseAbc === "B" ? "text-neon-cyan" : "text-neon-purple"}`}>
                        {item.claseAbc}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">{getEstadoBadge(item.estado)}</td>
                    <td className="py-2 px-3 text-xs max-w-[150px] truncate text-muted-foreground">{item.proveedor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-neon-pink/10">
          <span className="text-xs text-muted-foreground" style={{ fontFamily: "Rajdhani" }}>
            Página {page} de {totalPages} — {data?.total || 0} referencias
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="border-neon-pink/20 hover:bg-neon-pink/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="border-neon-pink/20 hover:bg-neon-pink/10"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
