/**
 * NotificationCenter v1.0 — Centro de Notificaciones In-App
 * Campanita en el header con panel desplegable
 * Muestra alertas de stock, sincronización, y OC
 */
import { useState, useEffect, useRef } from "react";
import { Bell, Package, RefreshCw, AlertTriangle, ShoppingCart, X, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";

// ── Tipos ────────────────────────────────────────────────────────────────────
interface AppNotification {
  id: string;
  type: "stock_cero" | "sync" | "orden_retrasada" | "stock_critico" | "info";
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  severity: "critical" | "warning" | "info" | "success";
}

// ── Storage helpers ──────────────────────────────────────────────────────────
const NOTIF_KEY = "somos-notifications";
const MAX_NOTIFICATIONS = 30;

function loadNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveNotifications(notifs: AppNotification[]) {
  try {
    localStorage.setItem(NOTIF_KEY, JSON.stringify(notifs.slice(0, MAX_NOTIFICATIONS)));
  } catch { /* ignore */ }
}

// ── Icon map ─────────────────────────────────────────────────────────────────
const ICON_MAP = {
  stock_cero: AlertTriangle,
  sync: RefreshCw,
  orden_retrasada: ShoppingCart,
  stock_critico: Package,
  info: Bell,
};

const SEVERITY_COLORS = {
  critical: { bg: "#FEE2E2", border: "#EF4444", icon: "#DC2626", dot: "#EF4444" },
  warning: { bg: "#FFF7ED", border: "#F97316", icon: "#EA580C", dot: "#F97316" },
  info: { bg: "#EFF6FF", border: "#3B82F6", icon: "#2563EB", dot: "#3B82F6" },
  success: { bg: "#F0FDF4", border: "#22C55E", icon: "#16A34A", dot: "#22C55E" },
};

// ── Componente principal ─────────────────────────────────────────────────────
export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => loadNotifications());
  const panelRef = useRef<HTMLDivElement>(null);

  // Generate notifications from real data
  const { data: kpis } = trpc.dashboard.kpis.useQuery(undefined, { staleTime: 60000 });
  const { data: lastSync } = trpc.dashboard.lastSync.useQuery(undefined, { staleTime: 60000 });

  // Auto-generate notifications from KPIs
  useEffect(() => {
    if (!kpis) return;

    const newNotifs: AppNotification[] = [];
    const existingIds = new Set(notifications.map(n => n.id));

    // Stock cero alert
    const zeroStock = Number(kpis.zeroStock) || 0;
    if (zeroStock > 0) {
      const id = `stock-cero-${new Date().toISOString().slice(0, 10)}`;
      if (!existingIds.has(id)) {
        newNotifs.push({
          id,
          type: "stock_cero",
          title: `${zeroStock} referencias sin stock`,
          message: `Se detectaron ${zeroStock} referencias con stock cero. Riesgo de parada de flota.`,
          timestamp: Date.now(),
          read: false,
          severity: zeroStock > 500 ? "critical" : "warning",
        });
      }
    }

    // Urgent orders alert
    const urgentOrders = Number(kpis.urgentOrders) || 0;
    if (urgentOrders > 0) {
      const id = `urgent-orders-${new Date().toISOString().slice(0, 10)}`;
      if (!existingIds.has(id)) {
        newNotifs.push({
          id,
          type: "orden_retrasada",
          title: `${urgentOrders} órdenes urgentes`,
          message: `Hay ${urgentOrders} órdenes con prioridad CRITICO o REORDEN INMEDIATO pendientes.`,
          timestamp: Date.now(),
          read: false,
          severity: urgentOrders > 50 ? "critical" : "warning",
        });
      }
    }

    // Sync notification
    if (lastSync) {
      const syncId = `sync-${lastSync.id}`;
      if (!existingIds.has(syncId)) {
        newNotifs.push({
          id: syncId,
          type: "sync",
          title: "Sincronización completada",
          message: `${lastSync.itemsProcessed ?? 0} refs, ${lastSync.ordersProcessed ?? 0} OC, ${lastSync.suppliersProcessed ?? 0} proveedores procesados.`,
          timestamp: new Date(lastSync.startedAt).getTime(),
          read: false,
          severity: lastSync.status === "success" ? "success" : "warning",
        });
      }
    }

    if (newNotifs.length > 0) {
      const updated = [...newNotifs, ...notifications].slice(0, MAX_NOTIFICATIONS);
      setNotifications(updated);
      saveNotifications(updated);
    }
  }, [kpis, lastSync]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [isOpen]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    saveNotifications(updated);
  };

  const markAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    saveNotifications(updated);
  };

  const clearAll = () => {
    setNotifications([]);
    saveNotifications([]);
  };

  const formatTimeAgo = (ts: number): string => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Ahora";
    if (mins < 60) return `Hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Hace ${days}d`;
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg transition-colors"
        style={{ color: "#8CB32A" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(140,179,42,0.1)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1"
            style={{ background: "#EF4444", animation: "notifBadgePulse 2s ease-in-out infinite" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-32px)] rounded-xl overflow-hidden"
          style={{
            background: "#FFFFFF",
            boxShadow: "0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(140,179,42,0.1)",
            animation: "notifSlideIn 0.15s ease-out",
            zIndex: 9999,
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid #E5E7EB" }}
          >
            <h3 className="text-sm font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#1C1C1E" }}>
              Notificaciones
              {unreadCount > 0 && (
                <span className="ml-2 text-xs font-normal" style={{ color: "#9CA3AF" }}>
                  {unreadCount} sin leer
                </span>
              )}
            </h3>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[10px] px-2 py-1 rounded transition-colors"
                  style={{ color: "#8CB32A" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(140,179,42,0.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  Marcar leídas
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-[10px] px-2 py-1 rounded transition-colors"
                  style={{ color: "#9CA3AF" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#F3F4F6"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: "thin" }}>
            {notifications.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Bell className="h-8 w-8 mx-auto mb-2" style={{ color: "#E5E7EB" }} />
                <p className="text-sm" style={{ color: "#9CA3AF" }}>No hay notificaciones</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const Icon = ICON_MAP[notif.type] || Bell;
                const colors = SEVERITY_COLORS[notif.severity];
                return (
                  <div
                    key={notif.id}
                    className="flex gap-3 px-4 py-3 transition-colors cursor-pointer"
                    style={{
                      background: notif.read ? "transparent" : "rgba(140,179,42,0.04)",
                      borderBottom: "1px solid #F3F4F6",
                    }}
                    onClick={() => markAsRead(notif.id)}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#F9FAFB"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = notif.read ? "transparent" : "rgba(140,179,42,0.04)"; }}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: colors.bg }}
                    >
                      <Icon className="h-4 w-4" style={{ color: colors.icon }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium truncate" style={{ color: "#1C1C1E", fontFamily: "'Space Grotesk', sans-serif" }}>
                          {notif.title}
                        </p>
                        {!notif.read && (
                          <span
                            className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                            style={{ background: colors.dot }}
                          />
                        )}
                      </div>
                      <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "#6B7280" }}>
                        {notif.message}
                      </p>
                      <p className="text-[10px] mt-1" style={{ color: "#9CA3AF" }}>
                        {formatTimeAgo(notif.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes notifSlideIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes notifBadgePulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
