import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { LogOut, Bus, Zap, Menu, X, type LucideIcon } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export default function DashboardLayout({
  children,
  navItems = [],
  title = "SOMOS USME // JIT SYSTEM",
}: {
  children: React.ReactNode;
  navItems?: NavItem[];
  title?: string;
}) {
  const { loading, user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [userMenuOpen]);

  // Stable root wrapper — always rendered to avoid React insertBefore errors
  // caused by swapping entire trees (skeleton → login → app)
  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background cyber-grid-bg">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full cyber-card rounded-xl">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <Bus className="h-10 w-10 text-neon-pink animate-pulse-neon" />
              <Zap className="h-6 w-6 text-neon-cyan" />
            </div>
            <h1 className="text-2xl font-bold tracking-wider text-neon-cyan" style={{ fontFamily: 'Orbitron' }}>
              SOMOS USME
            </h1>
            <p className="text-sm text-muted-foreground text-center">
              Sistema Inteligente JIT - Control de Inventario y Abastecimiento
            </p>
            <p className="text-xs text-neon-pink/60">
              Gestión de Flota 260 Buses
            </p>
          </div>
          <button
            onClick={() => { window.location.href = getLoginUrl(); }}
            className="w-full h-11 rounded-lg bg-neon-pink/20 border border-neon-pink/50 text-neon-pink hover:bg-neon-pink/30 hover:shadow-[0_0_20px_oklch(0.7_0.25_350/0.3)] transition-all font-bold tracking-wider"
            style={{ fontFamily: 'Orbitron' }}
          >
            INICIAR SESIÓN
          </button>
        </div>
      </div>
    );
  }

  const activeMenuItem = navItems.find((item) => item.href === location);

  return (
    // Use a single stable wrapper — no position changes between renders
    <div className="flex min-h-screen bg-background">
      {/* Mobile overlay — always in DOM, visibility via opacity/pointer-events */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity duration-300 ${mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={() => setMobileOpen(false)}
      />

      {/* Sidebar — fixed on mobile, sticky on desktop. 
          IMPORTANT: We use a wrapper div that is always sticky on desktop 
          and the inner aside is fixed on mobile. This avoids position 
          changes that can cause React's insertBefore errors. */}
      <div className="hidden md:flex md:flex-col md:w-[260px] md:shrink-0 md:sticky md:top-0 md:h-screen">
        <aside className="flex flex-col h-full bg-background border-r border-neon-pink/10">
          {/* Sidebar Header */}
          <div className="h-16 flex items-center gap-3 px-4 border-b border-neon-pink/10 shrink-0">
            <Bus className="h-5 w-5 text-neon-cyan shrink-0" />
            <span
              className="font-bold tracking-wider text-neon-cyan truncate text-xs"
              style={{ fontFamily: "Orbitron" }}
            >
              {title}
            </span>
          </div>
          {/* Nav Items */}
          <nav className="flex-1 overflow-y-auto py-2 px-2">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => setLocation(item.href)}
                  className={`w-full flex items-center gap-3 h-10 px-3 rounded-lg mb-1 transition-all text-left ${
                    isActive
                      ? "bg-neon-pink/10 text-neon-pink border-l-2 border-neon-pink"
                      : "hover:bg-neon-cyan/5 hover:text-neon-cyan text-muted-foreground"
                  }`}
                >
                  <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-neon-pink" : "text-muted-foreground"}`} />
                  <span className="text-sm" style={{ fontFamily: "Rajdhani", fontWeight: 500 }}>{item.label}</span>
                </button>
              );
            })}
          </nav>
          {/* User Footer */}
          <div className="p-3 border-t border-neon-pink/10 shrink-0 relative" ref={userMenuRef}>
            {userMenuOpen && (
              <div className="absolute bottom-full left-3 right-3 mb-2 rounded-lg border border-neon-pink/20 bg-background shadow-lg shadow-neon-pink/10 overflow-hidden">
                <button
                  onClick={() => { setUserMenuOpen(false); logout(); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            )}
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-neon-pink/10 transition-colors w-full text-left focus:outline-none"
            >
              <div className="h-9 w-9 rounded-full border border-neon-cyan/30 bg-neon-cyan/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-medium text-neon-cyan">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate leading-none text-foreground">
                  {user?.name || "-"}
                </p>
                <p className="text-xs text-neon-pink/60 truncate mt-1">
                  {user?.email || "Gestor"}
                </p>
              </div>
            </button>
          </div>
        </aside>
      </div>

      {/* Mobile Sidebar — separate element, only shown on mobile via fixed positioning */}
      <aside
        className={`fixed top-0 left-0 h-full w-[260px] bg-background border-r border-neon-pink/10 z-50 flex flex-col transition-transform duration-300 md:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-neon-pink/10 shrink-0">
          <Bus className="h-5 w-5 text-neon-cyan shrink-0" />
          <span
            className="font-bold tracking-wider text-neon-cyan truncate text-xs"
            style={{ fontFamily: "Orbitron" }}
          >
            {title}
          </span>
          <button
            className="ml-auto h-8 w-8 flex items-center justify-center hover:bg-neon-pink/10 rounded-lg"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-4 w-4 text-neon-pink" />
          </button>
        </div>
        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-2 px-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <button
                key={item.href}
                onClick={() => {
                  setLocation(item.href);
                  setMobileOpen(false);
                }}
                className={`w-full flex items-center gap-3 h-10 px-3 rounded-lg mb-1 transition-all text-left ${
                  isActive
                    ? "bg-neon-pink/10 text-neon-pink border-l-2 border-neon-pink"
                    : "hover:bg-neon-cyan/5 hover:text-neon-cyan text-muted-foreground"
                }`}
              >
                <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-neon-pink" : "text-muted-foreground"}`} />
                <span className="text-sm" style={{ fontFamily: "Rajdhani", fontWeight: 500 }}>{item.label}</span>
              </button>
            );
          })}
        </nav>
        {/* User Footer */}
        <div className="p-3 border-t border-neon-pink/10 shrink-0">
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors w-full rounded-lg"
          >
            <LogOut className="h-4 w-4" />
            <span>Cerrar Sesión</span>
          </button>
          <div className="flex items-center gap-3 px-1 py-1 mt-1">
            <div className="h-9 w-9 rounded-full border border-neon-cyan/30 bg-neon-cyan/10 flex items-center justify-center shrink-0">
              <span className="text-xs font-medium text-neon-cyan">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate leading-none text-foreground">
                {user?.name || "-"}
              </p>
              <p className="text-xs text-neon-pink/60 truncate mt-1">
                {user?.email || "Gestor"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-neon-pink/10 bg-background/95 backdrop-blur sticky top-0 z-30">
          <button
            onClick={() => setMobileOpen(true)}
            className="h-9 w-9 flex items-center justify-center hover:bg-neon-pink/10 rounded-lg"
          >
            <Menu className="h-5 w-5 text-neon-pink" />
          </button>
          <span className="text-neon-cyan text-sm font-bold" style={{ fontFamily: "Orbitron" }}>
            {activeMenuItem?.label ?? "SOMOS USME"}
          </span>
          <div className="w-9" />
        </header>
        <main className="flex-1 p-4 md:p-6 cyber-grid-bg min-h-screen">{children}</main>
      </div>
    </div>
  );
}
