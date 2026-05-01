/**
 * CommandPalette v1.0 — Búsqueda Global (Ctrl+K)
 * Busca en: Referencias, Órdenes, Proveedores, Páginas
 * Estilo Spotlight/VS Code con Fuse.js para fuzzy search
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { Search, Package, ShoppingCart, Users, LayoutDashboard, FileText, ArrowRight, Command, Activity, Shield, BarChart3 } from "lucide-react";
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
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();

  // Keyboard shortcut: Ctrl+K / ⌘K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
        setQuery("");
        setSelectedIndex(0);
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

  // Build search items from pages
  const searchItems: SearchItem[] = PAGES;

  // Fuzzy search
  const fuse = new Fuse(searchItems, {
    keys: [
      { name: "label", weight: 0.5 },
      { name: "keywords", weight: 0.3 },
      { name: "sublabel", weight: 0.2 },
    ],
    threshold: 0.4,
    includeScore: true,
  });

  const results = query.trim()
    ? fuse.search(query).slice(0, 10).map((r) => r.item)
    : searchItems.slice(0, 8);

  // Handle selection
  const handleSelect = useCallback((item: SearchItem) => {
    setIsOpen(false);
    setQuery("");
    setLocation(item.href);
  }, [setLocation]);

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

  const iconMap: Record<string, any> = {
    page: LayoutDashboard,
    reference: Package,
    order: ShoppingCart,
    supplier: Users,
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-start justify-center pt-[15vh]"
      onClick={() => setIsOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg mx-4 rounded-2xl overflow-hidden"
        style={{
          background: "#FFFFFF",
          boxShadow: "0 25px 100px rgba(0,0,0,0.25), 0 0 0 1px rgba(140,179,42,0.2)",
          animation: "commandPaletteIn 0.15s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid #E5E7EB" }}>
          <Search className="h-5 w-5 shrink-0" style={{ color: "#9CA3AF" }} />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar páginas, referencias, órdenes..."
            className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#1C1C1E" }}
          />
          <kbd
            className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono"
            style={{ background: "#F3F4F6", color: "#9CA3AF", border: "1px solid #E5E7EB" }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-y-auto py-2">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No se encontraron resultados para "{query}"
            </div>
          ) : (
            results.map((item, idx) => {
              const ItemIcon = item.icon || iconMap[item.type] || Package;
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={`${item.type}-${item.href}-${idx}`}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                  style={{
                    background: isSelected ? "rgba(140,179,42,0.08)" : "transparent",
                    fontFamily: "'Space Grotesk', sans-serif",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: item.type === "page" ? "rgba(0,152,144,0.1)" : "rgba(140,179,42,0.1)",
                    }}
                  >
                    <ItemIcon
                      className="h-4 w-4"
                      style={{
                        color: item.type === "page" ? "#009890" : "#8CB32A",
                      }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#1C1C1E" }}>
                      {item.label}
                    </p>
                    {item.sublabel && (
                      <p className="text-xs truncate" style={{ color: "#9CA3AF" }}>
                        {item.sublabel}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "#F3F4F6", color: "#9CA3AF" }}>
                    {item.type === "page" ? "Página" : item.type === "reference" ? "Referencia" : item.type === "order" ? "OC" : "Proveedor"}
                  </span>
                  {isSelected && <ArrowRight className="h-3 w-3 shrink-0" style={{ color: "#8CB32A" }} />}
                </button>
              );
            })
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
