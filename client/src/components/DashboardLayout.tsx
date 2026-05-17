import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Boxes,
  LayoutDashboard,
  LogOut,
  PanelLeft,
  QrCode,
  RefreshCw,
  Search,
  Settings,
  ShoppingCart,
  Siren,
  TrendingUp,
  Truck,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { StockChatbot } from "./StockChatbot";
import { CommandPalette, CommandPaletteTrigger } from "./CommandPalette";

export const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/", description: "Resumen general del inventario" },
  { icon: BarChart3, label: "Analytics", path: "/analytics", description: "Análisis avanzado y tendencias" },
  { icon: Boxes, label: "Inventario", path: "/inventario", description: "Catálogo completo de referencias" },
  { icon: TrendingUp, label: "Top 20 Valor", path: "/top-valor", description: "Referencias de mayor valor" },
  { icon: AlertTriangle, label: "Stock Cero", path: "/stock-cero", description: "Referencias sin existencias" },
  { icon: ShoppingCart, label: "Órdenes", path: "/ordenes", description: "Órdenes de compra activas" },
  { icon: Siren, label: "Stock 0 + OC", path: "/stock-cero-oc", description: "Stock cero con orden activa" },
  { icon: Activity, label: "Consumo", path: "/consumo", description: "Histórico de consumo mensual" },
  { icon: QrCode, label: "QR Acceso", path: "/qr-acceso", description: "Códigos QR de referencias" },
  { icon: Truck, label: "Proveedores", path: "/proveedores", description: "Gestión de proveedores" },
  { icon: RefreshCw, label: "Sincronizar", path: "/sync", description: "Sincronización con Drive" },
  { icon: Settings, label: "Admin", path: "/admin", description: "Administración del sistema" },
];

function formatRelativeDate(date: Date | string | null | undefined): string {
  if (!date) return "\u2014";
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "hace instantes";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-[#8CB32A]/5">
        <div className="flex flex-col items-center gap-8 p-10 max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200/60">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#8CB32A] to-[#6d8c1f] text-[#281C19] flex items-center justify-center font-bold text-lg shadow-lg">AT</div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight">Asset Tracker</span>
              <span className="text-xs text-muted-foreground">Somos Bogotá Usme</span>
            </div>
          </div>
          <div className="flex flex-col items-center gap-3 text-center">
            <h1 className="text-xl font-semibold tracking-tight">Inicia sesión para continuar</h1>
            <p className="text-sm text-muted-foreground max-w-sm">
              El acceso a este panel requiere autenticación. Continúa para iniciar el flujo de acceso.
            </p>
          </div>
          <Button onClick={() => (window.location.href = getLoginUrl())} size="lg" className="w-full">
            Iniciar sesión
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": "260px" } as React.CSSProperties}>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SidebarProvider>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [searchOpen, setSearchOpen] = useState(false);

  const { data: lastSyncData } = trpc.dashboard.lastSync.useQuery(undefined, {
    refetchInterval: 60_000,
  });
  const { data: kpis } = trpc.dashboard.kpis.useQuery();

  // Sync fire-and-forget + polling — evita 503 en producción Cloud Run
  const [syncPending, setSyncPending] = useState(false);
  const syncPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => { if (syncPollingRef.current) clearInterval(syncPollingRef.current); };
  }, []);

  const handleSync = async () => {
    if (syncPending) return;
    setSyncPending(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120_000); // 2 min timeout

      const response = await fetch('/api/sync-drive', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const ct = response.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        toast.error("Servidor no disponible", { description: "Espera 30 segundos e intenta de nuevo" });
        setSyncPending(false);
        return;
      }

      const result = await response.json();
      setSyncPending(false);

      if (result.success) {
        toast.success("Sincronización completada", { description: result.message });
      } else {
        toast.error("Error en sincronización", { description: result.message || "Error desconocido" });
      }
    } catch (err: any) {
      setSyncPending(false);
      if (err.name === 'AbortError') {
        toast.info("Sync en progreso", { description: "Los datos se actualizarán automáticamente" });
      } else {
        toast.error("Error de conexión", { description: "Verifica tu internet e intenta de nuevo" });
      }
    }
  };

  // Shortcut ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const activeItem = navItems.find((item) => item.path === location) ?? navItems[0];

  const initials = (user?.name ?? "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-slate-200/70">
        <SidebarHeader className="h-16 justify-center border-b border-slate-200/70">
          <div className="flex items-center gap-2.5 px-2 w-full">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-[#8CB32A] to-[#6d8c1f] text-[#281C19] flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
              AT
            </div>
            <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
              <span className="font-semibold text-sm tracking-tight truncate">Asset Tracker</span>
              <span className="text-[11px] text-muted-foreground truncate">Somos Bogotá Usme</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="gap-0 px-2 py-3">
          <button
            onClick={() => setSearchOpen(true)}
            className="mb-3 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white hover:border-slate-300 transition-colors px-3 py-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="flex-1 text-left">Buscar referencia...</span>
            <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
              ⌘K
            </kbd>
          </button>

          <SidebarMenu>
            {navItems.map((item) => {
              const isActive = location === item.path;
              const Icon = item.icon;
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    isActive={isActive}
                    onClick={() => setLocation(item.path)}
                    tooltip={item.label}
                    className={`h-9 text-sm font-normal transition-colors ${
                      isActive ? "bg-[#8CB32A]/10 text-[#8CB32A] hover:bg-[#8CB32A]/10 hover:text-[#8CB32A] font-medium" : ""
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "text-[#8CB32A]" : "text-slate-500"}`} />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="border-t border-slate-200/70 p-3 gap-2">
          <div className="flex items-center justify-between px-1 group-data-[collapsible=icon]:hidden">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Última sync</span>
              <span className="text-xs text-slate-700 font-medium">
                {formatRelativeDate(lastSyncData?.completedAt ?? lastSyncData?.startedAt)}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-2 text-xs gap-1 bg-white"
              onClick={handleSync}
              disabled={syncPending}
            >
              <RefreshCw className={`h-3 w-3 ${syncPending ? "animate-spin" : ""}`} />
              Sync
            </Button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-slate-100 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8CB32A]/50">
                <Avatar className="h-8 w-8 border border-slate-200 shrink-0">
                  <AvatarFallback className="text-[11px] font-semibold bg-[#8CB32A]/20 text-[#281C19]">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                  <p className="text-sm font-medium truncate leading-tight">{user?.name || "Usuario"}</p>
                  <p className="text-[11px] text-muted-foreground truncate mt-0.5">{user?.email || "\u2014"}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5 border-b">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
              </div>
              <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Cerrar sesión</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-slate-50/50">
        <header className="flex h-14 items-center justify-between border-b border-slate-200/70 bg-white/80 backdrop-blur px-4 sm:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {isMobile && <SidebarTrigger className="h-8 w-8" />}
            {!isMobile && (
              <button
                onClick={() => {
                  const trigger = document.querySelector("[data-sidebar='trigger']") as HTMLButtonElement | null;
                  trigger?.click();
                }}
                className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-slate-100 transition-colors"
                aria-label="Alternar sidebar"
              >
                <PanelLeft className="h-4 w-4 text-slate-500" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <activeItem.icon className="h-4 w-4 text-[#009890]" />
              <h1 className="text-sm font-semibold tracking-tight text-slate-900">{activeItem.label}</h1>
              <span className="hidden sm:inline text-xs text-muted-foreground">/ {activeItem.description}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {kpis && kpis.zeroStock > 0 && (
              <Badge variant="outline" className="hidden sm:flex bg-red-50 text-red-700 border-red-200 font-medium">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {kpis.zeroStock} stock cero
              </Badge>
            )}
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-2 rounded-md border border-slate-200 bg-white hover:bg-slate-50 transition-colors px-2.5 py-1.5 text-xs text-muted-foreground"
            >
              <Search className="h-3 w-3" />
              <span>Buscar...</span>
              <kbd className="rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 text-[10px] font-mono">⌘K</kbd>
            </button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs bg-white"
              onClick={handleSync}
              disabled={syncPending}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncPending ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">{syncPending ? "Sincronizando..." : "Sincronizar"}</span>
            </Button>
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </SidebarInset>

      {/* Chatbot Stock — disponible en todas las páginas */}
      <StockChatbot />

      {/* Command Palette — búsqueda global Ctrl+K */}
      <CommandPalette />
    </>
  );
}
