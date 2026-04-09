import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, CheckCircle, XCircle, Clock, Cloud, Bell, Link, ShieldCheck, ShieldAlert } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export default function SyncPage() {
  const [location] = useLocation();
  const { data: lastSync, isLoading, refetch } = trpc.sync.lastSync.useQuery();
  const [gdriveAuthorized, setGdriveAuthorized] = useState<boolean | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: string; text: string } | null>(null);

  // Check Google Drive authorization status on mount
  useEffect(() => {
    fetch("/api/gdrive/status")
      .then(r => r.json())
      .then(d => setGdriveAuthorized(d.authorized))
      .catch(() => setGdriveAuthorized(false));
  }, []);

  // Handle OAuth callback result from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gdrive_success") === "1") {
      setGdriveAuthorized(true);
      setStatusMsg({ type: "success", text: "✅ Google Drive autorizado correctamente. La sincronización automática está activa." });
      // Clean up URL
      window.history.replaceState({}, "", "/sync");
      // Trigger a sync immediately
      syncMutation.mutate();
    } else if (params.get("gdrive_error")) {
      setStatusMsg({ type: "error", text: `Error al autorizar Google Drive: ${params.get("gdrive_error")}` });
      window.history.replaceState({}, "", "/sync");
    }
  }, []);

  const syncMutation = trpc.sync.trigger.useMutation({
    onSuccess: (res: any) => {
      if (res.success) {
        setStatusMsg({ type: "success", text: res.message || "Sincronización exitosa" });
        refetch();
      } else {
        setStatusMsg({ type: "error", text: res.message || "Error en sincronización" });
      }
    },
    onError: (err) => setStatusMsg({ type: "error", text: err.message }),
  });

  const notifyDelayed = trpc.notifications.sendDelayedOrdersAlert.useMutation({
    onSuccess: (res) => {
      if (res.sent) setStatusMsg({ type: "success", text: `Alerta enviada: ${res.count} órdenes con retraso` });
      else setStatusMsg({ type: "info", text: res.message || "Sin órdenes con retraso" });
    },
  });

  const notifyCritical = trpc.notifications.sendCriticalStockAlert.useMutation({
    onSuccess: (res) => {
      if (res.sent) setStatusMsg({ type: "success", text: `Alerta enviada: ${res.count} productos en stock cero` });
      else setStatusMsg({ type: "info", text: res.message || "Sin productos en stock cero" });
    },
  });

  async function handleAuthorizeGDrive() {
    setAuthLoading(true);
    try {
      const res = await fetch("/api/gdrive/auth-url");
      const { url } = await res.json();
      // Redirect to Google OAuth
      window.location.href = url;
    } catch (e) {
      setStatusMsg({ type: "error", text: "Error al obtener URL de autorización" });
      setAuthLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {statusMsg && (
        <div className={`p-3 rounded-lg border text-sm mb-4 ${
          statusMsg.type === "success" ? "bg-green-500/10 border-green-500/30 text-green-400" :
          statusMsg.type === "error" ? "bg-red-500/10 border-red-500/30 text-red-400" :
          "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
        }`} style={{ fontFamily: "Rajdhani" }}>
          {statusMsg.text}
          <button onClick={() => setStatusMsg(null)} className="ml-2 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}
      <div className="flex items-center gap-3">
        <RefreshCw className="h-6 w-6 text-neon-green" />
        <h1 className="text-xl font-bold text-neon-cyan tracking-wider" style={{ fontFamily: "Orbitron" }}>
          SINCRONIZACIÓN & NOTIFICACIONES
        </h1>
      </div>

      {/* Google Drive Authorization Banner */}
      {gdriveAuthorized === false && (
        <Card className="cyber-card p-5 rounded-xl border border-orange-500/40 bg-orange-500/5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <ShieldAlert className="h-8 w-8 text-orange-400 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-orange-400 tracking-wider" style={{ fontFamily: "Orbitron" }}>
                  GOOGLE DRIVE NO AUTORIZADO
                </h3>
                <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: "Rajdhani" }}>
                  Autoriza el acceso a Google Drive una sola vez para activar la sincronización automática cada 15 minutos.
                  El token se guarda de forma permanente y se renueva automáticamente.
                </p>
              </div>
            </div>
            <Button
              onClick={handleAuthorizeGDrive}
              disabled={authLoading}
              className="bg-orange-500/20 border border-orange-500/40 text-orange-400 hover:bg-orange-500/30 gap-2 shrink-0"
              style={{ fontFamily: "Orbitron", fontSize: "11px" }}
            >
              {authLoading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> CONECTANDO...</>
              ) : (
                <><Link className="h-4 w-4" /> AUTORIZAR GOOGLE DRIVE</>
              )}
            </Button>
          </div>
        </Card>
      )}

      {gdriveAuthorized === true && (
        <Card className="cyber-card p-4 rounded-xl border border-green-500/30 bg-green-500/5">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-neon-green shrink-0" />
            <div className="flex-1">
              <span className="text-sm font-bold text-neon-green" style={{ fontFamily: "Orbitron" }}>
                GOOGLE DRIVE CONECTADO
              </span>
              <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "Rajdhani" }}>
                Sincronización automática activa cada 15 minutos. El token se renueva automáticamente.
              </p>
            </div>
            <Button
              onClick={handleAuthorizeGDrive}
              disabled={authLoading}
              variant="outline"
              size="sm"
              className="text-xs border-green-500/30 text-green-400 hover:bg-green-500/10 shrink-0"
              style={{ fontFamily: "Rajdhani" }}
            >
              Re-autorizar
            </Button>
          </div>
        </Card>
      )}

      {/* Sync Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="cyber-card p-6 rounded-xl cyber-glow-cyan">
          <div className="flex items-center gap-3 mb-4">
            <Cloud className="h-6 w-6 text-neon-cyan" />
            <h2 className="text-sm font-bold text-neon-cyan tracking-wider" style={{ fontFamily: "Orbitron" }}>
              GOOGLE DRIVE SYNC
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4" style={{ fontFamily: "Rajdhani" }}>
            Sincroniza los datos del archivo <span className="text-neon-pink font-semibold">DASBOARD SOMOS U - GESTOR 1.xlsx</span> desde Google Drive.
            La sincronización automática se ejecuta cada 15 minutos.
          </p>
          <div className="space-y-3 mb-6">
            <div className="flex items-center gap-2 text-sm" style={{ fontFamily: "Rajdhani" }}>
              <CheckCircle className="h-4 w-4 text-neon-green" />
              <span>Inventario completo (sin límite de referencias)</span>
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ fontFamily: "Rajdhani" }}>
              <CheckCircle className="h-4 w-4 text-neon-green" />
              <span>Órdenes de compra pendientes</span>
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ fontFamily: "Rajdhani" }}>
              <CheckCircle className="h-4 w-4 text-neon-green" />
              <span>Directorio de proveedores</span>
            </div>
            <div className="flex items-center gap-2 text-sm" style={{ fontFamily: "Rajdhani" }}>
              <CheckCircle className="h-4 w-4 text-neon-green" />
              <span>Auto-sync cada 15 minutos</span>
            </div>
          </div>
          <Button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="w-full bg-neon-cyan/20 border border-neon-cyan/40 text-neon-cyan hover:bg-neon-cyan/30 gap-2"
            style={{ fontFamily: "Orbitron" }}
          >
            {syncMutation.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> SINCRONIZANDO...</>
            ) : (
              <><RefreshCw className="h-4 w-4" /> SINCRONIZAR AHORA</>
            )}
          </Button>
        </Card>

        {/* Last Sync Info */}
        <Card className="cyber-card p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-6 w-6 text-neon-yellow" />
            <h2 className="text-sm font-bold text-neon-cyan tracking-wider" style={{ fontFamily: "Orbitron" }}>
              ÚLTIMA SINCRONIZACIÓN
            </h2>
          </div>
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-neon-pink" />
          ) : lastSync ? (
            <div className="space-y-4" style={{ fontFamily: "Rajdhani" }}>
              <div className="flex items-center gap-2">
                {lastSync.status === "success" ? (
                  <CheckCircle className="h-5 w-5 text-neon-green" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-400" />
                )}
                <span className={`font-semibold ${lastSync.status === "success" ? "text-neon-green" : "text-red-400"}`}>
                  {lastSync.status === "success" ? "Exitosa" : "Error"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <InfoBlock label="Tipo" value={lastSync.syncType || "—"} />
                <InfoBlock label="Fecha" value={new Date(lastSync.startedAt).toLocaleString("es-CO")} />
                <InfoBlock label="Referencias" value={String(lastSync.itemsProcessed || 0)} />
                <InfoBlock label="Órdenes" value={String(lastSync.ordersProcessed || 0)} />
                <InfoBlock label="Proveedores" value={String(lastSync.suppliersProcessed || 0)} />
              </div>
              {lastSync.errorMessage && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
                  {lastSync.errorMessage}
                </div>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No hay registros de sincronización</p>
          )}
        </Card>
      </div>

      {/* Notifications Section */}
      <Card className="cyber-card p-6 rounded-xl">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="h-6 w-6 text-neon-pink" />
          <h2 className="text-sm font-bold text-neon-cyan tracking-wider" style={{ fontFamily: "Orbitron" }}>
            NOTIFICACIONES
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6" style={{ fontFamily: "Rajdhani" }}>
          Envía alertas sobre situaciones críticas del inventario y órdenes de compra.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={() => notifyDelayed.mutate()}
            disabled={notifyDelayed.isPending}
            className="bg-orange-500/20 border border-orange-500/40 text-orange-400 hover:bg-orange-500/30 gap-2 h-auto py-4"
            style={{ fontFamily: "Rajdhani" }}
          >
            <div className="text-left">
              <div className="font-bold text-sm" style={{ fontFamily: "Orbitron" }}>ÓRDENES CON RETRASO</div>
              <div className="text-xs opacity-70 mt-1">Notifica sobre órdenes pendientes vencidas</div>
            </div>
          </Button>
          <Button
            onClick={() => notifyCritical.mutate()}
            disabled={notifyCritical.isPending}
            className="bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 gap-2 h-auto py-4"
            style={{ fontFamily: "Rajdhani" }}
          >
            <div className="text-left">
              <div className="font-bold text-sm" style={{ fontFamily: "Orbitron" }}>STOCK CERO CRÍTICO</div>
              <div className="text-xs opacity-70 mt-1">Alerta sobre productos sin stock con consumo activo</div>
            </div>
          </Button>
        </div>
      </Card>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-cyber-dark/50 rounded-lg p-3 border border-border/20">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-sm font-semibold text-foreground mt-1">{value}</div>
    </div>
  );
}
