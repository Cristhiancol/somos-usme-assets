import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useState, useMemo } from "react";

function getPrioridadColor(prioridad: string | null) {
  const p = (prioridad || "").toUpperCase();
  if (p === "CRITICO") return "bg-red-600 text-white border-red-700";
  if (p === "REORDEN INMEDIATO") return "bg-orange-500 text-white border-orange-600";
  if (p === "PRECAUCION") return "bg-yellow-500 text-black border-yellow-600";
  if (p === "OPTIMO") return "bg-green-600 text-white border-green-700";
  if (p === "EXCESO") return "bg-blue-500 text-white border-blue-600";
  return "bg-gray-500 text-white border-gray-600";
}

function getPrioridadLabel(prioridad: string | null) {
  const p = (prioridad || "").toUpperCase();
  if (p === "CRITICO") return "🔴 CRÍTICO";
  if (p === "REORDEN INMEDIATO") return "🟠 REORDEN INMEDIATO";
  if (p === "PRECAUCION") return "🟡 PRECAUCIÓN";
  if (p === "OPTIMO") return "🟢 ÓPTIMO";
  if (p === "EXCESO") return "🔵 EXCESO";
  return prioridad || "—";
}

function formatCurrency(val: number | null) {
  if (!val) return "$0";
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val);
}

export default function StockCeroConOC() {
  const { data, isLoading } = trpc.inventory.stockCeroConOC.useQuery();
  const [search, setSearch] = useState("");
  const [filterPrioridad, setFilterPrioridad] = useState<string>("TODAS");

  const prioridades = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.map(r => (r.prioridadOC || "").toUpperCase()));
    return ["TODAS", ...Array.from(set).sort()];
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter(r => {
      const matchSearch =
        !search ||
        (r.referencia || "").toLowerCase().includes(search.toLowerCase()) ||
        (r.descripcion || "").toLowerCase().includes(search.toLowerCase()) ||
        (r.proveedorOC || "").toLowerCase().includes(search.toLowerCase()) ||
        (r.ordenCompra || "").toLowerCase().includes(search.toLowerCase());
      const matchPrioridad =
        filterPrioridad === "TODAS" ||
        (r.prioridadOC || "").toUpperCase() === filterPrioridad;
      return matchSearch && matchPrioridad;
    });
  }, [data, search, filterPrioridad]);

  const criticos = useMemo(() => filtered.filter(r => (r.prioridadOC || "").toUpperCase() === "CRITICO").length, [filtered]);
  const reordenInmediato = useMemo(() => filtered.filter(r => (r.prioridadOC || "").toUpperCase() === "REORDEN INMEDIATO").length, [filtered]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">⚠️</span>
          <h1 className="text-2xl font-bold text-orange-400 font-mono tracking-wide">
            STOCK CERO — OC ACTIVA
          </h1>
        </div>
        <p className="text-gray-400 text-sm">
          Referencias sin stock que tienen una Orden de Compra pendiente. Estas son las que debes presionar al proveedor.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gray-900 border border-red-800">
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-gray-400 font-mono mb-1">TOTAL AFECTADAS</div>
            <div className="text-3xl font-bold text-red-400 font-mono">
              {isLoading ? "..." : (data?.length ?? 0)}
            </div>
            <div className="text-xs text-gray-500 mt-1">refs con stock=0 + OC activa</div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border border-red-700">
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-gray-400 font-mono mb-1">🔴 CRÍTICO</div>
            <div className="text-3xl font-bold text-red-500 font-mono">{criticos}</div>
            <div className="text-xs text-gray-500 mt-1">acción inmediata</div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border border-orange-700">
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-gray-400 font-mono mb-1">🟠 REORDEN INMEDIATO</div>
            <div className="text-3xl font-bold text-orange-400 font-mono">{reordenInmediato}</div>
            <div className="text-xs text-gray-500 mt-1">presionar proveedor</div>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border border-yellow-700">
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-gray-400 font-mono mb-1">VALOR PENDIENTE</div>
            <div className="text-2xl font-bold text-yellow-400 font-mono">
              {isLoading ? "..." : formatCurrency(filtered.reduce((s, r) => s + (r.valorPendiente || 0), 0))}
            </div>
            <div className="text-xs text-gray-500 mt-1">en órdenes activas</div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-3 mb-5">
        <Input
          placeholder="Buscar por referencia, descripción, proveedor u OC..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-500 font-mono text-sm max-w-md"
        />
        <div className="flex gap-2 flex-wrap">
          {prioridades.map(p => (
            <button
              key={p}
              onClick={() => setFilterPrioridad(p)}
              className={`px-3 py-1.5 rounded text-xs font-mono font-bold border transition-all ${
                filterPrioridad === p
                  ? "bg-cyan-600 border-cyan-400 text-white"
                  : "bg-gray-800 border-gray-600 text-gray-300 hover:border-cyan-600"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      {isLoading ? (
        <div className="text-center py-20 text-cyan-400 font-mono animate-pulse">
          Cargando datos del cruce inventario × órdenes...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500 font-mono">
          No se encontraron referencias con los filtros aplicados.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-800">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="bg-gray-900 border-b border-gray-700">
                <th className="text-left px-3 py-3 text-cyan-400 font-bold">PRIORIDAD OC</th>
                <th className="text-left px-3 py-3 text-cyan-400 font-bold">REFERENCIA</th>
                <th className="text-left px-3 py-3 text-cyan-400 font-bold">DESCRIPCIÓN</th>
                <th className="text-left px-3 py-3 text-cyan-400 font-bold">OC</th>
                <th className="text-left px-3 py-3 text-cyan-400 font-bold">PROVEEDOR</th>
                <th className="text-right px-3 py-3 text-cyan-400 font-bold">DÍAS RETRASO</th>
                <th className="text-right px-3 py-3 text-cyan-400 font-bold">QTY PEND.</th>
                <th className="text-right px-3 py-3 text-cyan-400 font-bold">VALOR PEND.</th>
                <th className="text-left px-3 py-3 text-cyan-400 font-bold">ESTADO OC</th>
                <th className="text-left px-3 py-3 text-cyan-400 font-bold">COMPRADOR</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const diasRetraso = r.diasRetraso ?? 0;
                const rowBg = i % 2 === 0 ? "bg-gray-950" : "bg-gray-900";
                const retrasoColor =
                  diasRetraso > 90 ? "text-red-400 font-bold" :
                  diasRetraso > 30 ? "text-orange-400 font-bold" :
                  diasRetraso > 0 ? "text-yellow-400" : "text-gray-400";
                return (
                  <tr
                    key={`${r.referencia}-${r.ordenCompra}-${i}`}
                    className={`${rowBg} border-b border-gray-800 hover:bg-gray-800 transition-colors`}
                  >
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getPrioridadColor(r.prioridadOC)}`}>
                        {getPrioridadLabel(r.prioridadOC)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-cyan-300 font-bold">{r.referencia}</td>
                    <td className="px-3 py-2 text-gray-200 max-w-[200px] truncate" title={r.descripcion ?? ""}>
                      {r.descripcion}
                    </td>
                    <td className="px-3 py-2 text-yellow-300">{r.ordenCompra}</td>
                    <td className="px-3 py-2 text-gray-300 max-w-[160px] truncate" title={r.proveedorOC ?? ""}>
                      {r.proveedorOC}
                    </td>
                    <td className={`px-3 py-2 text-right ${retrasoColor}`}>
                      {diasRetraso > 0 ? `${diasRetraso}d` : "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-300">
                      {r.qtyPendiente?.toLocaleString("es-CO") ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right text-green-400">
                      {formatCurrency(r.valorPendiente)}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        (r.estadoOC || "").toUpperCase() === "CASI COMPLETO"
                          ? "bg-blue-900 text-blue-300 border border-blue-700"
                          : "bg-orange-900 text-orange-300 border border-orange-700"
                      }`}>
                        {r.estadoOC || "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-400">{r.comprador}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 text-xs text-gray-600 font-mono text-right">
        Mostrando {filtered.length} de {data?.length ?? 0} referencias | Cruce: inventario × órdenes de compra activas
      </div>
    </div>
  );
}
