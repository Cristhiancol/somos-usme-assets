import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { StockChatbot } from "./StockChatbot";
import { CommandPalette, CommandPaletteTrigger } from "./CommandPalette";
import { NotificationCenter } from "./NotificationCenter";
import { LogOut, Bus, Zap, Menu, X, ShieldAlert, type LucideIcon } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";
import { useLocation } from "wouter";

// ── Mensajes de error OAuth ──────────────────────────────────────────────────
const AUTH_ERROR_MESSAGES: Record<string, string> = {
  NoAutorizado: "Tu correo no tiene acceso al sistema. Contacta al administrador para solicitar autorizaci\u00f3n.",
  UsuarioInactivo: "Tu cuenta est\u00e1 desactivada. Contacta al administrador para reactivarla.",
  ErrorServidor: "Error del servidor al verificar tu acceso. Intenta de nuevo en un momento.",
  SinEmail: "No se pudo obtener tu correo electr\u00f3nico. Intenta con otra cuenta.",
};

// ── Paleta Corporativa ──────────────────────────────────────────────
// Sidebar: #281C19 (fondo oscuro) con texto #f5f5f5
// Activo:  borde izquierdo #8CB32A, fondo #8CB32A/15, texto #8CB32A
// Hover:   fondo #009890/10, texto #009890
// ───────────────────────────────────────────────────────────────────

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export default function DashboardLayout({
  children,
  navItems = [],
  title = "SOMOS USME // JIT",
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

  // Detectar error OAuth en la URL (?error=NoAutorizado)
  const authError = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const errorKey = params.get("error");
    if (errorKey && AUTH_ERROR_MESSAGES[errorKey]) {
      // Limpiar la URL para no mostrar el error en recargas
      window.history.replaceState({}, "", window.location.pathname);
      return AUTH_ERROR_MESSAGES[errorKey];
    }
    return null;
  }, []);

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

  const activeMenuItem = navItems.find((item) => item.href === location);

  const showLoading = loading;
  const showLogin = !loading && !user;
  const showApp = !loading && !!user;

  return (
    <div className="flex min-h-screen bg-background" style={{ contain: "layout" }}>

      {/* ── LOADING ── */}
      {showLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4">
            <Bus className="h-10 w-10 animate-pulse" style={{ color: '#8CB32A' }} />
            <div className="text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#009890' }}>
              Cargando sistema...
            </div>
          </div>
        </div>
      )}

      {/* ── LOGIN ── */}
      {showLogin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center cyber-grid-bg" style={{ background: '#f8f9fa' }}>
          <div
            className="flex flex-col items-center gap-8 p-8 max-w-md w-full rounded-xl"
            style={{
              background: '#ffffff',
              border: '1px solid rgba(140,179,42,0.3)',
              boxShadow: '0 8px 40px rgba(40,28,25,0.12), 0 0 0 1px rgba(140,179,42,0.1)',
            }}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-3">
                <Bus className="h-10 w-10 animate-pulse-neon" style={{ color: '#8CB32A' }} />
                <Zap className="h-6 w-6" style={{ color: '#009890' }} />
              </div>
              <h1
                className="text-2xl font-bold tracking-wider"
                style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#281C19' }}
              >
                SOMOS USME
              </h1>
              <p className="text-sm text-center" style={{ color: '#6b7280' }}>
                Sistema Inteligente JIT — Control de Inventario y Abastecimiento
              </p>
              <p className="text-xs font-semibold" style={{ color: '#009890', fontFamily: "'Space Grotesk', sans-serif" }}>
                Gestión de Flota 260 Buses
              </p>
            </div>
            {/* ── Bloque de error OAuth ── */}
            {authError && (
              <div
                className="w-full flex items-start gap-3 rounded-lg p-3 text-sm"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#dc2626',
                }}
              >
                <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <button
              onClick={() => { window.location.href = getLoginUrl(); }}
              className="w-full h-11 rounded-lg font-bold tracking-wider transition-all"
              style={{
                fontFamily: "'Space Grotesk', sans-serif",
                background: '#281C19',
                color: '#ffffff',
                border: '1px solid #8CB32A',
                boxShadow: '0 0 12px rgba(140,179,42,0.3)',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(140,179,42,0.5)';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.boxShadow = '0 0 12px rgba(140,179,42,0.3)';
              }}
            >
              INICIAR SESIÓN
            </button>
          </div>
        </div>
      )}

      {/* ── MOBILE OVERLAY ── */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity duration-300 ${
          showApp && mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setMobileOpen(false)}
      />

      {/* ── DESKTOP SIDEBAR ── */}
      <div
        className="hidden md:flex md:flex-col md:w-[240px] md:shrink-0 md:sticky md:top-0 md:h-screen"
        style={{ visibility: showApp ? "visible" : "hidden" }}
      >
        <aside
          className="flex flex-col h-full"
          style={{ background: '#281C19', borderRight: '1px solid rgba(140,179,42,0.2)' }}
        >
          {/* Logo */}
          <div
            className="h-16 flex items-center gap-3 px-4 shrink-0"
            style={{ borderBottom: '1px solid rgba(140,179,42,0.2)' }}
          >
            <Bus className="h-5 w-5 shrink-0" style={{ color: '#8CB32A' }} />
            <span
              className="font-bold tracking-wider truncate text-xs"
              style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#8CB32A' }}
            >
              {title}
            </span>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto py-3 px-2">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => setLocation(item.href)}
                  className="w-full flex items-center gap-3 h-10 px-3 rounded-lg mb-1 transition-all text-left"
                  style={{
                    background: isActive ? 'rgba(140,179,42,0.15)' : 'transparent',
                    borderLeft: isActive ? '2px solid #8CB32A' : '2px solid transparent',
                    color: isActive ? '#8CB32A' : 'rgba(245,245,245,0.7)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,152,144,0.12)';
                      (e.currentTarget as HTMLButtonElement).style.color = '#009890';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
                      (e.currentTarget as HTMLButtonElement).style.color = 'rgba(245,245,245,0.7)';
                    }
                  }}
                >
                  <item.icon
                    className="h-4 w-4 shrink-0"
                    style={{ color: isActive ? '#8CB32A' : 'rgba(245,245,245,0.5)' }}
                  />
                  <span className="text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Search trigger */}
          <div className="px-2 pb-2">
            <CommandPaletteTrigger />
          </div>

          {/* User menu */}
          <div
            className="p-3 shrink-0 relative"
            style={{ borderTop: '1px solid rgba(140,179,42,0.2)' }}
            ref={userMenuRef}
          >
            {userMenuOpen && (
              <div
                className="absolute bottom-full left-3 right-3 mb-2 rounded-lg overflow-hidden"
                style={{
                  background: '#1a1210',
                  border: '1px solid rgba(140,179,42,0.3)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
                }}
              >
                <button
                  onClick={() => { setUserMenuOpen(false); logout(); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm transition-colors"
                  style={{ color: '#f87171' }}
                  onMouseEnter={(e) => { (e.currentTarget).style.background = 'rgba(239,68,68,0.1)'; }}
                  onMouseLeave={(e) => { (e.currentTarget).style.background = 'transparent'; }}
                >
                  <LogOut className="h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            )}
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors w-full text-left focus:outline-none"
              style={{ background: 'transparent' }}
              onMouseEnter={(e) => { (e.currentTarget).style.background = 'rgba(140,179,42,0.08)'; }}
              onMouseLeave={(e) => { (e.currentTarget).style.background = 'transparent'; }}
            >
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs"
                style={{ background: '#8CB32A', color: '#281C19' }}
              >
                {user?.name?.charAt(0).toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate leading-none" style={{ color: '#f5f5f5' }}>
                  {user?.name || "-"}
                </p>
                <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(140,179,42,0.7)', fontFamily: "'Space Grotesk', sans-serif" }}>
                  {user?.email || "Gestor"}
                </p>
              </div>
            </button>
          </div>
        </aside>
      </div>

      {/* ── MOBILE SIDEBAR ── */}
      <aside
        className={`fixed top-0 left-0 h-full w-[240px] z-50 flex flex-col transition-transform duration-300 md:hidden ${
          showApp && mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          visibility: showApp ? "visible" : "hidden",
          background: '#281C19',
          borderRight: '1px solid rgba(140,179,42,0.2)',
        }}
      >
        <div
          className="h-16 flex items-center gap-3 px-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(140,179,42,0.2)' }}
        >
          <Bus className="h-5 w-5 shrink-0" style={{ color: '#8CB32A' }} />
          <span
            className="font-bold tracking-wider truncate text-xs flex-1"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#8CB32A' }}
          >
            {title}
          </span>
          <button
            className="ml-auto h-8 w-8 flex items-center justify-center rounded-lg"
            style={{ color: '#8CB32A' }}
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {navItems.map((item) => {
            const isActive = location === item.href;
            return (
              <button
                key={item.href}
                onClick={() => { setLocation(item.href); setMobileOpen(false); }}
                className="w-full flex items-center gap-3 h-10 px-3 rounded-lg mb-1 transition-all text-left"
                style={{
                  background: isActive ? 'rgba(140,179,42,0.15)' : 'transparent',
                  borderLeft: isActive ? '2px solid #8CB32A' : '2px solid transparent',
                  color: isActive ? '#8CB32A' : 'rgba(245,245,245,0.7)',
                }}
              >
                <item.icon
                  className="h-4 w-4 shrink-0"
                  style={{ color: isActive ? '#8CB32A' : 'rgba(245,245,245,0.5)' }}
                />
                <span className="text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
        <div
          className="p-3 shrink-0"
          style={{ borderTop: '1px solid rgba(140,179,42,0.2)' }}
        >
          <button
            onClick={() => logout()}
            className="flex items-center gap-2 px-3 py-2.5 text-sm transition-colors w-full rounded-lg"
            style={{ color: '#f87171' }}
          >
            <LogOut className="h-4 w-4" />
            <span>Cerrar Sesión</span>
          </button>
          <div className="flex items-center gap-3 px-2 py-1.5 mt-1">
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs"
              style={{ background: '#8CB32A', color: '#281C19' }}
            >
              {user?.name?.charAt(0).toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate leading-none" style={{ color: '#f5f5f5' }}>
                {user?.name || "-"}
              </p>
              <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(140,179,42,0.7)', fontFamily: "'Space Grotesk', sans-serif" }}>
                {user?.email || "Gestor"}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div
        className="flex-1 flex flex-col min-w-0"
        style={{ visibility: showApp ? "visible" : "hidden" }}
      >
        {/* Mobile Header */}
        <header
          className="md:hidden flex items-center justify-between h-14 px-4 sticky top-0 z-30 backdrop-blur"
          style={{
            background: 'rgba(255,255,255,0.95)',
            borderBottom: '1px solid rgba(140,179,42,0.2)',
          }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="h-9 w-9 flex items-center justify-center rounded-lg"
            style={{ color: '#8CB32A' }}
          >
            <Menu className="h-5 w-5" />
          </button>
          <span
            className="text-sm font-bold"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#281C19' }}
          >
            {activeMenuItem?.label ?? "SOMOS USME"}
          </span>
          <NotificationCenter />
        </header>

        {/* Main */}
        <main className="flex-1 p-4 md:p-6 cyber-grid-bg min-h-screen">
          {children}
        </main>
      </div>

      {/* Chatbot Stock — disponible en todas las páginas del dashboard */}
      <StockChatbot />

      {/* Command Palette — búsqueda global Ctrl+K */}
      <CommandPalette />
    </div>
  );
}
