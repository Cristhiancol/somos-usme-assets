/**
 * CommandPalette v2.0 — Búsqueda Inteligente Global (Ctrl+K)
 * Busca en: Páginas, Referencias de Inventario, Órdenes de Compra, Proveedores
 * Estilo Spotlight/VS Code con Fuse.js para fuzzy search
 * Historial de búsquedas recientes (localStorage)
 * Búsqueda en tiempo real contra la API (debounced)
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Search,
  Package,
  ShoppingCart,
  Users,
  LayoutDashboard,
  FileText,
  ArrowRight,
  Command,
  Activity,
  Shield,
  BarChart3,
  QrCode,
  Clock,
  X,
  Sparkles,
} from "lucide-react";
import Fuse from "fuse.js";

// ── Pages para búsqueda rápida ──────────────────────────────────────────────
const PAGES = [
  { type: "page" as const, label: "Dashboard", href: "/", icon: LayoutDashboard, keywords: "inicio home kpis" },
  { type: "page" as const, label: "Analytics", href: "/analytics", icon: Activity, keywords: "tendencias gráficos analytics análisis" },
  { type: "page" as const, label: "Inventario", href: "/inventario", icon: Package, keywords: "stock referencias items" },
  { type: "page" as const, label: "Top 20 Valor", href: "/top-valor", icon: FileText, keywords: "costosas mayor valor" },
  { type: "page" as const, label: "Stock Cero", href: "/stock-cero", icon: FileText, keywords: "cero agotadas sin stock" },
  { type: "page" as const, label: "Órdenes", href: "/ordenes", icon: ShoppingCart, keywords: "compras OC pendientes" },
  { type: "page" as const, label: "Stock 0 + OC", href: "/stock-cero-oc", icon: FileText, keywords: "cero pendiente oc activa" },
  { type: "page" as const, label: "Consumo", href: "/consumo", icon: BarChart3, keywords: "consumo mensual tendencias demanda abastecimiento" },
  { type: "page" as const, label: "QR Acceso", href: "/qr-acceso", icon: QrCode, keywords: "qr código escanear acceso" },
  { type: "page" as const, label: "Proveedores", href: "/proveedores", icon: Users, keywords: "supplier nit contacto" },
  { type: "page" as const, label: "Sincronizar", href: "/sync", icon: FileText, keywords: "sync google drive" },
  { type: "page" as const, label: "Administración", href: "/admin", icon: Shield, keywords: "usuarios roles admin auditoría" },
];

interface SearchItem {
  type: "page" | "reference" | "order" | "supplier";
  label: string;
  sublabel?: string;
  href: string;
  keywords: string;
  icon: any;
  extra?: string;
}

// ── localStorage helpers for search history ──
const HISTORY_KEY = "jit-search-history";
const MAX_HISTORY = 8;

function loadHistory(): string[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(query: string) {
  try {
    const history = loadHistory().filter((h) => h !== query);
    history.unshift(query);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch { /* ignore */ }
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();

  // ── Fetch real data from API ──
  const { data: inventoryData } = trpc.inventory.list.useQuery(
    { search: query, limit: 8 },
    { enabled: isOpen && query.length >= 2 }
  );
  const { data: ordersData } = trpc.orders.list.useQuery(
    { search: query },
    { enabled: isOpen && query.length >= 2 }
  );
  const { data: suppliersData } = trpc.suppliers.list.useQuery(
    undefined,
    { enabled: isOpen }
  );

  // Keyboard shortcut: Ctrl+K / ⌘K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
        setQuery("");
        setSelectedIndex(0);
        setHistory(loadHistory());
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build search items from pages + real data
  const searchItems: SearchItem[] = useMemo(() => {
    const items: SearchItem[] = [...PAGES];

    // Add inventory references
    if (inventoryData?.items) {
      for (const item of inventoryData.items.slice(0, 6)) {
        const stockStatus = (item.stockActual ?? 0) === 0 ? "🔴 Sin stock" : `✅ Stock: ${item.stockActual}`;
        items.push({
          type: "reference",
          label: `${item.referencia} — ${item.descripcion?.slice(0, 40) || ""}`,
          sublabel: `${stockStatus} | ${item.proveedor || "N/A"} | ${item.claseAbc || ""}`,
          href: `/inventario?search=${encodeURIComponent(item.referencia ?? "")}`,
          keywords: `${item.referencia} ${item.descripcion} ${item.proveedor} ${item.parteFabricante}`,
          icon: Package,
          extra: `$${Number(item.costoUnitario ?? 0).toLocaleString("es-CO")} COP`,
        });
      }
    }

    // Add purchase orders
    if (ordersData && Array.isArray(ordersData)) {
      const uniqueOCs = new Map<string, typeof ordersData[0]>();
      for (const o of ordersData.slice(0, 10)) {
        if (o.ordenCompra && !uniqueOCs.has(o.ordenCompra)) {
          uniqueOCs.set(o.ordenCompra, o);
        }
      }
      for (const [, o] of Array.from(uniqueOCs).slice(0, 6)) {
        const retraso = (o.diasRetraso ?? 0) > 0 ? `⏳ ${o.diasRetraso}d retraso` : "✅ A tiempo";
        items.push({
          type: "order",
          label: `OC ${o.ordenCompra} — ${o.descripcion?.slice(0, 40) || ""}`,
          sublabel: `${o.estado} | ${retraso} | ${o.proveedor || "N/A"}`,
          href: `/ordenes?search=${encodeURIComponent(o.ordenCompra ?? "")}`,
          keywords: `${o.ordenCompra} ${o.descripcion} ${o.proveedor} ${o.mainsaver}`,
          icon: ShoppingCart,
          extra: o.estado ?? "",
        });
      }
    }

    // Add suppliers (fuzzy filter)
    if (suppliersData && query.length >= 2) {
      const supplierFuse = new Fuse(suppliersData as any[], {
        keys: ["nombre", "nit", "email"],
        threshold: 0.4,
      });
      const supplierResults = supplierFuse.search(query).slice(0, 4);
      for (const r of supplierResults) {
        const s = r.item as any;
        items.push({
          type: "supplier",
          label: s.nombre ?? "Proveedor",
          sublabel: `NIT: ${s.nit ?? "N/A"} | ${s.email ?? ""}`,
          href: `/proveedores`,
          keywords: `${s.nombre} ${s.nit} ${s.email}`,
          icon: Users,
        });
      }
    }

    return items;
  }, [inventoryData, ordersData, suppliersData, query]);

  // Fuzzy search
  const fuse = useMemo(
    () =>
      new Fuse(searchItems, {
        keys: [
          { name: "label", weight: 0.5 },
          { name: "keywords", weight: 0.3 },
          { name: "sublabel", weight: 0.2 },
        ],
        threshold: 0.4,
        includeScore: true,
      }),
    [searchItems]
  );

  const results = query.trim()
    ? fuse.search(query).slice(0, 12).map((r) => r.item)
    : searchItems.filter((i) => i.type === "page").slice(0, 8);

  // Handle selection
  const handleSelect = useCallback(
    (item: SearchItem) => {
      if (query.trim()) {
        saveHistory(query.trim());
      }
      setIsOpen(false);
      setQuery("");
      setLocation(item.href);
    },
    [setLocation, query]
  );

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[selectedIndex]) {
        handleSelect(results[selectedIndex]);
      }
    }
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!isOpen) return null;

  const typeLabels: Record<string, string> = {
    page: "Página",
    reference: "Referencia",
    order: "OC",
    supplier: "Proveedor",
  };

  const typeColors: Record<string, { bg: string; text: string; iconColor: string }> = {
    page: { bg: "rgba(0,152,144,0.1)", text: "#009890", iconColor: "#009890" },
    reference: { bg: "rgba(140,179,42,0.1)", text: "#8CB32A", iconColor: "#8CB32A" },
    order: { bg: "rgba(234,88,12,0.1)", text: "#ea580c", iconColor: "#ea580c" },
    supplier: { bg: "rgba(124,58,237,0.1)", text: "#7c3aed", iconColor: "#7c3aed" },
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center pt-[12vh]"
      onClick={() => setIsOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl mx-4 rounded-2xl overflow-hidden"
        style={{
          background: "#FFFFFF",
          boxShadow: "0 25px 100px rgba(0,0,0,0.25), 0 0 0 1px rgba(140,179,42,0.2)",
          animation: "commandPaletteIn 0.15s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid #E5E7EB" }}>
          <Search className="h-5 w-5 shrink-0" style={{ color: "#8CB32A" }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar referencias, órdenes, proveedores, páginas..."
            className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#1C1C1E" }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100"
            >
              <X className="h-3 w-3" style={{ color: "#9CA3AF" }} />
            </button>
          )}
          <kbd
            className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono"
            style={{ background: "#F3F4F6", color: "#9CA3AF", border: "1px solid #E5E7EB" }}
          >
            ESC
          </kbd>
        </div>

        {/* Search history (when no query) */}
        {!query.trim() && history.length > 0 && (
          <div className="px-4 pt-2 pb-1" style={{ borderBottom: "1px solid #F3F4F6" }}>
            <span className="text-[10px] font-semibold tracking-wide" style={{ color: "#9CA3AF", fontFamily: "'Space Grotesk', sans-serif" }}>
              BÚSQUEDAS RECIENTES
            </span>
            <div className="flex flex-wrap gap-1.5 mt-1.5 mb-1">
              {history.map((h, i) => (
                <button
                  key={i}
                  onClick={() => setQuery(h)}
                  className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] transition-colors hover:bg-gray-50"
                  style={{
                    border: "1px solid #E5E7EB",
                    color: "#6B7280",
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  <Clock className="h-2.5 w-2.5" />
                  {h}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active search indicator */}
        {query.length >= 2 && (
          <div className="px-4 py-1.5 flex items-center gap-2" style={{ background: "rgba(140,179,42,0.04)", borderBottom: "1px solid #F3F4F6" }}>
            <Sparkles className="h-3 w-3" style={{ color: "#8CB32A" }} />
            <span className="text-[10px]" style={{ color: "#8CB32A", fontFamily: "'Space Grotesk', sans-serif" }}>
              Buscando en inventario, órdenes y proveedores...
            </span>
          </div>
        )}

        {/* Results */}
        <div className="max-h-[380px] overflow-y-auto py-2">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No se encontraron resultados para "{query}"
            </div>
          ) : (
            <>
              {/* Group results by type */}
              {(["page", "reference", "order", "supplier"] as const).map((type) => {
                const typeResults = results.filter((r) => r.type === type);
                if (typeResults.length === 0) return null;
                return (
                  <div key={type}>
                    <div className="px-4 py-1">
                      <span
                        className="text-[10px] font-semibold tracking-wide"
                        style={{ color: typeColors[type].text, fontFamily: "'Space Grotesk', sans-serif" }}
                      >
                        {type === "page" ? "📄 PÁGINAS" : type === "reference" ? "📦 REFERENCIAS" : type === "order" ? "🛒 ÓRDENES" : "👤 PROVEEDORES"}
                      </span>
                    </div>
                    {typeResults.map((item, idx) => {
                      const globalIdx = results.indexOf(item);
                      const isSelected = globalIdx === selectedIndex;
                      const ItemIcon = item.icon;
                      const colors = typeColors[item.type];
                      return (
                        <button
                          key={`${item.type}-${item.href}-${idx}`}
                          onClick={() => handleSelect(item)}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                          style={{
                            background: isSelected ? "rgba(140,179,42,0.08)" : "transparent",
                            fontFamily: "'Space Grotesk', sans-serif",
                          }}
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: colors.bg }}
                          >
                            <ItemIcon className="h-4 w-4" style={{ color: colors.iconColor }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: "#1C1C1E" }}>
                              {item.label}
                            </p>
                            {item.sublabel && (
                              <p className="text-[11px] truncate" style={{ color: "#9CA3AF" }}>
                                {item.sublabel}
                              </p>
                            )}
                          </div>
                          {item.extra && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0"
                              style={{ background: colors.bg, color: colors.text }}
                            >
                              {item.extra}
                            </span>
                          )}
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded shrink-0"
                            style={{ background: "#F3F4F6", color: "#9CA3AF" }}
                          >
                            {typeLabels[item.type]}
                          </span>
                          {isSelected && <ArrowRight className="h-3 w-3 shrink-0" style={{ color: "#8CB32A" }} />}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2 text-[10px]"
          style={{ borderTop: "1px solid #E5E7EB", color: "#9CA3AF" }}
        >
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded font-mono" style={{ background: "#F3F4F6", border: "1px solid #E5E7EB" }}>↑↓</kbd>
              Navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 rounded font-mono" style={{ background: "#F3F4F6", border: "1px solid #E5E7EB" }}>↵</kbd>
              Abrir
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Command className="h-3 w-3" />K para buscar
          </span>
        </div>
      </div>

      <style>{`
        @keyframes commandPaletteIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>,
    document.body
  );
}

// ── Trigger button for mobile/sidebar ────────────────────────────────────────
export function CommandPaletteTrigger() {
  const handleClick = () => {
    // Dispatch Ctrl+K programmatically
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }));
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg transition-all text-left"
      style={{
        background: "rgba(140,179,42,0.08)",
        border: "1px solid rgba(140,179,42,0.2)",
        color: "rgba(245,245,245,0.6)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(140,179,42,0.15)";
        e.currentTarget.style.borderColor = "rgba(140,179,42,0.4)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(140,179,42,0.08)";
        e.currentTarget.style.borderColor = "rgba(140,179,42,0.2)";
      }}
    >
      <Search className="h-3.5 w-3.5" style={{ color: "rgba(245,245,245,0.5)" }} />
      <span className="text-xs flex-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
        Buscar...
      </span>
      <kbd
        className="text-[10px] px-1.5 py-0.5 rounded font-mono"
        style={{ background: "rgba(255,255,255,0.08)", color: "rgba(245,245,245,0.4)" }}
      >
        ⌘K
      </kbd>
    </button>
  );
}
