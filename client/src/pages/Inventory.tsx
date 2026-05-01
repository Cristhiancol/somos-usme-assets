import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Package, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { useState, useMemo } from "react";
import { BusTransmilenio } from "@/components/BusTransmilenio";
import { ExportButton } from "@/components/ExportButton";

const CUENTAS = ["PLATAFORMA", "CAJA", "CARROCERIA", "COMBUSTIBLE", "COMUNICACIONES", "ELECTRICIDAD", "LLANTAS", "LUBRICANTES"];
const CLASES = ["A", "B", "C"];
const ESTADOS = ["CRITICO", "REORDEN INMEDIATO", "PRECAUCION", "OPTIMO", "EXCESO"];

function formatCurrency(val: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(val);
}

/* ═══ Badge de Estado con colores corporativos ═══ */
function EstadoBadge({ estado }: { estado: string | null }) {
  if (!estado) return null;
  const map: Record<string, { bg: string; text: string; border: string; pulse?: boolean }> = {
    CRITICO: { bg: "bg-red-600/15", text: "text-red-700", border: "border-red-500/40" },
    "REORDEN INMEDIATO": { bg: "bg-amber-500/15", text: "text-amber-700", border: "border-amber-500/40", pulse: true },
    PRECAUCION: { bg: "bg-yellow-500/15", text: "text-yellow-700", border: "border-yellow-500/40" },
    OPTIMO: { bg: "bg-emerald-500/15", text: "text-emerald-700", border: "border-emerald-500/40" },
    EXCESO: { bg: "bg-blue-500/15", text: "text-blue-700", border: "border-blue-500/40" },
  };
  const s = map[estado] || { bg: "bg-gray-500/15", text: "text-gray-600", border: "border-gray-400/40" };
  return (
    <Badge
      variant="outline"
      className={`text-[10px] font-semibold tracking-wide ${s.bg} ${s.text} ${s.border} ${s.pulse ? "badge-pulse-critical" : ""}`}
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      {estado}
    </Badge>
  );
}

/* ═══ Badge de Acción Requerida ═══ */
function AccionBadge({ accion }: { accion: string | null }) {
  if (!accion) return <span className="text-xs text-gray-400">—</span>;
  const upper = accion.toUpperCase();
  let cls = "bg-gray-100 text-gray-600 border-gray-300/50";
  if (upper.includes("PEDIR INMEDIATAMENTE")) {
    cls = "bg-red-600/15 text-red-700 border-red-500/40 badge-pulse-critical";
  } else if (upper.includes("PEDIR")) {
    cls = "bg-amber-500/15 text-amber-700 border-amber-500/40";
  } else if (upper.includes("NO PEDIR") || upper.includes("EXCESO")) {
    cls = "bg-blue-500/15 text-blue-700 border-blue-500/40";
  } else if (upper.includes("REVISAR")) {
    cls = "bg-yellow-500/15 text-yellow-700 border-yellow-500/40";
  }
  return (
    <Badge variant="outline" className={`text-[9px] font-semibold ${cls}`} style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
      {accion}
    </Badge>
  );
}

/* ═══ Loading Skeleton ═══ */
function TableSkeleton() {
  return (
    <div className="space-y-0">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3 border-b border-gray-100 animate-pulse">
          <div className="h-3 w-16 bg-gray-200 rounded" />
          <div className="h-3 w-40 bg-gray-200 rounded flex-1" />
          <div className="h-3 w-20 bg-gray-200 rounded" />
          <div className="h-3 w-14 bg-gray-200 rounded" />
          <div className="h-3 w-20 bg-gray-200 rounded" />
          <div className="h-3 w-24 bg-gray-200 rounded" />
          <div className="h-5 w-12 bg-gray-200 rounded-full" />
          <div className="h-5 w-16 bg-gray-200 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/* ═══ Expand Row — Detalle de referencia ═══ */
function ExpandRow({ item }: { item: any }) {
  return (
    <tr>
      <td colSpan={9} className="bg-[#281C19]/[0.03] border-b border-[#281C19]/10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 text-xs">
          {/* Parte Fabricante */}
          <div>
            <span className="text-gray-500 block mb-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>PARTE FABRICANTE</span>
            <span className="font-mono text-[#009890] font-semibold text-sm">
              {item.parteFabricante || "—"}
            </span>
          </div>
          {/* Acción Requerida */}
          <div>
            <span className="text-gray-500 block mb-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>ACCIÓN REQUERIDA</span>
            <AccionBadge accion={item.accionRequerida} />
          </div>
          {/* Cantidad a Pedir */}
          <div>
            <span className="text-gray-500 block mb-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>CANTIDAD A PEDIR</span>
            <span className={`font-mono font-bold text-sm ${(item.cantidadAPedir || 0) > 0 ? "text-red-600" : "text-gray-400"}`}>
              {(item.cantidadAPedir || 0) > 0 ? item.cantidadAPedir.toFixed(0) : "—"}
            </span>
          </div>
          {/* Valor a Pedir */}
          <div>
            <span className="text-gray-500 block mb-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>VALOR A PEDIR</span>
            <span className={`font-mono font-bold text-sm ${(item.valorAPedir || 0) > 0 ? "text-[#009890]" : "text-gray-400"}`}>
              {(item.valorAPedir || 0) > 0 ? formatCurrency(item.valorAPedir) : "—"}
            </span>
          </div>
          {/* Punto Reorden */}
          <div>
            <span className="text-gray-500 block mb-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>PUNTO REORDEN</span>
            <span className="font-mono text-[#281C19] text-sm">{item.puntoReorden || "—"}</span>
          </div>
          {/* Stock Seguridad */}
          <div>
            <span className="text-gray-500 block mb-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>STOCK SEGURIDAD</span>
            <span className="font-mono text-[#281C19] text-sm">{item.stockSeguridad || "—"}</span>
          </div>
          {/* Lead Time */}
          <div>
            <span className="text-gray-500 block mb-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>LEAD TIME</span>
            <span className="font-mono text-[#281C19] text-sm">{item.leadTimeDias ? `${item.leadTimeDias}d` : "—"}</span>
          </div>
          {/* Inventario Días */}
          <div>
            <span className="text-gray-500 block mb-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>INVENTARIO (DÍAS)</span>
            <span className="font-mono text-[#281C19] text-sm">{item.inventarioDias ? `${Math.round(item.inventarioDias)}d` : "—"}</span>
          </div>
        </div>
      </td>
    </tr>
  );
}

/* ═══ Select corporativo ═══ */
function CyberSelect({ value, onChange, placeholder, options }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-full rounded-md border border-[#009890]/30 bg-white px-3 py-1 text-sm text-[#281C19] shadow-xs outline-none focus:border-[#009890]/60 focus:ring-1 focus:ring-[#009890]/30 appearance-none cursor-pointer"
      style={{ fontFamily: "'Space Grotesk', sans-serif", backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23009890' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [cuenta, setCuenta] = useState<string>("");
  const [claseAbc, setClaseAbc] = useState<string>("");
  const [estado, setEstado] = useState<string>("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
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
      {/* Header */}
      <div className="flex items-center gap-3">
        <Package className="h-6 w-6 text-[#009890]" />
        <h1 className="text-xl font-bold text-[#281C19] tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          INVENTARIO COMPLETO
        </h1>
        <BusTransmilenio />
        <span className="text-xs text-gray-500 ml-auto font-mono">
          {data?.total ?? "..."} referencias
        </span>
        <ExportButton type="inventory" label="Excel" />
      </div>

      {/* Filters */}
      <Card className="p-4 rounded-xl border border-[#009890]/15 shadow-sm bg-white">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar referencia, descripción, proveedor..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 bg-white border-[#009890]/20 focus:border-[#009890]/50 text-[#281C19]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            />
          </div>
          <CyberSelect
            value={cuenta}
            onChange={(v) => { setCuenta(v); setPage(1); }}
            placeholder="Todas las categorías"
            options={CUENTAS.map(c => ({ value: c, label: c }))}
          />
          <CyberSelect
            value={claseAbc}
            onChange={(v) => { setClaseAbc(v); setPage(1); }}
            placeholder="Todas las clases"
            options={CLASES.map(c => ({ value: c, label: `Clase ${c}` }))}
          />
          <CyberSelect
            value={estado}
            onChange={(v) => { setEstado(v); setPage(1); }}
            placeholder="Todos los estados"
            options={ESTADOS.map(e => ({ value: e, label: e }))}
          />
        </div>
      </Card>

      {/* Table */}
      <Card className="rounded-xl overflow-hidden border border-[#009890]/10 shadow-sm bg-white">
        {isLoading ? (
          <TableSkeleton />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <thead>
                <tr className="border-b border-[#009890]/20 bg-[#009890]/[0.06]">
                  <th className="w-8 py-3 px-2"></th>
                  <th className="text-left py-3 px-3 text-[#009890] font-semibold text-xs tracking-wide">REF</th>
                  <th className="text-left py-3 px-3 text-[#009890] font-semibold text-xs tracking-wide">DESCRIPCIÓN</th>
                  <th className="text-left py-3 px-3 text-[#009890] font-semibold text-xs tracking-wide">CUENTA</th>
                  <th className="text-right py-3 px-3 text-[#009890] font-semibold text-xs tracking-wide">STOCK</th>
                  <th className="text-right py-3 px-3 text-[#009890] font-semibold text-xs tracking-wide">VALOR TOTAL</th>
                  <th className="text-center py-3 px-3 text-[#009890] font-semibold text-xs tracking-wide">ABC</th>
                  <th className="text-center py-3 px-3 text-[#009890] font-semibold text-xs tracking-wide">ESTADO</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items || []).map((item) => {
                  const isExpanded = expandedId === item.id;
                  return (
                    <>{/* Fragment key on outer element */}
                      <tr
                        key={item.id}
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className={`border-b border-gray-100 cursor-pointer transition-colors hover:bg-[#8CB32A]/[0.06] ${item.stockActual === 0 ? "bg-red-50/60" : ""} ${isExpanded ? "bg-[#009890]/[0.04]" : ""}`}
                      >
                        <td className="py-2 px-2 text-center">
                          {isExpanded
                            ? <ChevronUp className="h-3.5 w-3.5 text-[#009890] mx-auto" />
                            : <ChevronDown className="h-3.5 w-3.5 text-gray-400 mx-auto" />
                          }
                        </td>
                        <td className="py-2 px-3 font-mono text-[#009890] text-xs font-semibold">{item.referencia}</td>
                        <td className="py-2 px-3 text-xs text-[#281C19] max-w-[220px] truncate">{item.descripcion}</td>
                        <td className="py-2 px-3 text-xs text-gray-600">{item.cuenta}</td>
                        <td className={`py-2 px-3 text-right font-mono text-xs font-bold ${item.stockActual === 0 ? "text-red-600" : "text-[#281C19]"}`}>
                          {item.stockActual?.toFixed(0)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-xs text-[#281C19]">{formatCurrency(item.totalStock || 0)}</td>
                        <td className="py-2 px-3 text-center">
                          <span className={`text-xs font-bold ${item.claseAbc === "A" ? "text-red-600" : item.claseAbc === "B" ? "text-[#009890]" : "text-gray-500"}`}>
                            {item.claseAbc}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-center"><EstadoBadge estado={item.estado} /></td>
                      </tr>
                      {isExpanded && <ExpandRow key={`expand-${item.id}`} item={item} />}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#009890]/10 bg-gray-50/50">
          <span className="text-xs text-gray-500" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Página {page} de {totalPages} — {data?.total || 0} referencias
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="border-[#009890]/20 hover:bg-[#009890]/10 text-[#281C19]">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="border-[#009890]/20 hover:bg-[#009890]/10 text-[#281C19]">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
