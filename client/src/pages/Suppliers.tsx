import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Users, Search } from "lucide-react";
import { useState } from "react";

export default function SuppliersPage() {
  const { data, isLoading } = trpc.suppliers.list.useQuery();
  const [search, setSearch] = useState("");

  const filtered = (data || []).filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.nombre?.toLowerCase().includes(q)) || s.nit.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-neon-purple" />
        <h1 className="text-xl font-bold text-neon-cyan tracking-wider" style={{ fontFamily: "Orbitron" }}>
          PROVEEDORES
        </h1>
        <span className="text-xs text-muted-foreground" style={{ fontFamily: "Rajdhani" }}>
          {data?.length ?? "..."} registrados
        </span>
      </div>

      <Card className="cyber-card p-4 rounded-xl">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por NIT o nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-cyber-dark border-neon-pink/20"
            style={{ fontFamily: "Rajdhani" }}
          />
        </div>
      </Card>

      <Card className="cyber-card rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-neon-pink" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ fontFamily: "Rajdhani" }}>
              <thead>
                <tr className="border-b border-neon-pink/20 bg-neon-pink/5">
                  <th className="text-center py-3 px-3 text-neon-pink font-semibold text-xs">#</th>
                  <th className="text-left py-3 px-3 text-neon-pink font-semibold text-xs">NIT</th>
                  <th className="text-left py-3 px-3 text-neon-pink font-semibold text-xs">NOMBRE</th>
                  <th className="text-left py-3 px-3 text-neon-pink font-semibold text-xs">TIPO IMPUESTO</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => (
                  <tr key={s.id} className="border-b border-border/20 hover:bg-neon-cyan/5 transition-colors">
                    <td className="py-2.5 px-3 text-center text-muted-foreground text-xs">{i + 1}</td>
                    <td className="py-2.5 px-3 font-mono text-neon-cyan text-xs">{s.nit}</td>
                    <td className="py-2.5 px-3 text-xs">{s.nombre}</td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground">{s.tipoImpuesto || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
