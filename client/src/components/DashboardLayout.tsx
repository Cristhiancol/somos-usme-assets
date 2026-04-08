import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import { LogOut, PanelLeft, Bus, Zap, type LucideIcon } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

export default function DashboardLayout({
  children,
  navItems,
  title,
}: {
  children: React.ReactNode;
  navItems?: NavItem[];
  title?: string;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

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
          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            size="lg"
            className="w-full bg-neon-pink/20 border border-neon-pink/50 text-neon-pink hover:bg-neon-pink/30 hover:shadow-[0_0_20px_oklch(0.7_0.25_350/0.3)] transition-all"
            style={{ fontFamily: 'Orbitron' }}
          >
            INICIAR SESIÓN
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
      <DashboardLayoutContent
        setSidebarWidth={setSidebarWidth}
        navItems={navItems}
        title={title}
      >
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
  navItems?: NavItem[];
  title?: string;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
  navItems = [],
  title = "SOMOS USME",
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = navItems.find((item) => item.href === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r border-neon-pink/10" disableTransition={isResizing}>
          <SidebarHeader className="h-16 justify-center border-b border-neon-pink/10">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-neon-pink/10 rounded-lg transition-colors focus:outline-none shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-neon-pink" />
              </button>
              {!isCollapsed && (
                <div className="flex items-center gap-2 min-w-0">
                  <Bus className="h-5 w-5 text-neon-cyan shrink-0" />
                  <span
                    className="font-bold tracking-wider text-neon-cyan truncate text-xs"
                    style={{ fontFamily: "Orbitron" }}
                  >
                    {title}
                  </span>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 py-2">
            <SidebarMenu className="px-2 py-1 gap-1">
              {navItems.map((item) => {
                const isActive = location === item.href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.href)}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal ${
                        isActive
                          ? "bg-neon-pink/10 text-neon-pink border-l-2 border-neon-pink"
                          : "hover:bg-neon-cyan/5 hover:text-neon-cyan"
                      }`}
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? "text-neon-pink" : "text-muted-foreground"}`} />
                      <span style={{ fontFamily: "Rajdhani", fontWeight: 500 }}>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-neon-pink/10">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-neon-pink/10 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none">
                  <Avatar className="h-9 w-9 border border-neon-cyan/30 shrink-0">
                    <AvatarFallback className="text-xs font-medium bg-neon-cyan/10 text-neon-cyan">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none text-foreground">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-neon-pink/60 truncate mt-1">
                      {user?.email || "Gestor"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 cyber-card">
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-neon-red focus:text-neon-red">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Cerrar Sesión</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-neon-pink/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b border-neon-pink/10 h-14 items-center justify-between bg-background/95 px-2 backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg" />
              <span className="text-neon-cyan text-sm font-bold" style={{ fontFamily: "Orbitron" }}>
                {activeMenuItem?.label ?? "SOMOS USME"}
              </span>
            </div>
          </div>
        )}
        <main className="flex-1 p-4 md:p-6 cyber-grid-bg min-h-screen">{children}</main>
      </SidebarInset>
    </>
  );
}
