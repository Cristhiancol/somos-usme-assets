import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, CheckCircle, XCircle, Clock, Cloud, Bell, Link, ShieldCheck, ShieldAlert, AlertTriangle } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";

const CORP_DARK = "#281C19";
const CORP_LIME = "#8CB32A";
const CORP_TEAL = "#009890";

export default function SyncPage() {
  const { data: lastSync, isLoading, refetch } = trpc.sync.lastSync.useQuery();
  const { data: tokenData } = trpc.sync.tokenStatus.useQuery();
  const [authLoading, setAuthLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: string; text: string } | null>(null);

  // Use a ref to track if we need to auto-sync after OAuth
  const pendingAutoSync = useRef(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Derive authorization status from tokenStatus query
  const tokenStatus = tokenData?.status ?? null;
  const gdriveAuthorized = tokenStatus === 'authorized';
  const gdriveRevoked = tokenStatus === 'revoked';

  // Handle OAuth callback result from URL params — only runs once on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gdrive_success") === "1") {
      setStatusMsg({ type: "success", text: "Google Drive autorizado correctamente. La sincronización automática está activa." });
      window.history.replaceState({}, "", "/sync");
      pendingAutoSync.current = true;
    } else if (params.get("gdrive_error")) {
      setStatusMsg({ type: "error", text: `Error al autorizar Google Drive: ${params.get("gdrive_error")}` });
      window.history.replaceState({}, "", "/sync");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  /**
   * SYNC síncrono directo
   * POST /api/sync-drive espera la respuesta completa (~10s)
   * Sin fire-and-forget ni polling — más simple y robusto
   */
  const triggerSync = useCallback(async () => {
    if (syncLoading) return;
    setSyncLoading(true);
    setStatusMsg({ type: "info", text: "Sincronizando con Google Drive..." });

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

      // Si la respuesta no es JSON (503/502 del load balancer), manejar
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        setSyncLoading(false);
        setStatusMsg({
          type: "error",
          text: "El servidor no está disponible. Espera 30 segundos e intenta de nuevo."
        });
        return;
      }

      const result = await response.json();
      setSyncLoading(false);

      if (result.success) {
        setStatusMsg({ type: "success", text: result.message || "Sincronización exitosa" });
        refetch();
      } else {
        const msg = result.message || "Error en sincronización";
        if (msg.includes("TOKEN_REVOKED") || msg.includes("expirado") || msg.includes("revocado") || msg.includes("invalid_grant")) {
          setStatusMsg({
            type: "error",
            text: "El token de Google Drive ha expirado. Haz clic en 'Re-autorizar' para reconectar tu cuenta de Google."
          });
        } else {
          setStatusMsg({ type: "error", text: msg });
        }
      }
    } catch (err: any) {
      setSyncLoading(false);
      if (err.name === 'AbortError') {
        setStatusMsg({ type: "info", text: "La sincronización está tardando más de lo esperado. Los datos se actualizarán automáticamente." });
      } else {
        setStatusMsg({ type: "error", text: "Error de conexión. Verifica tu internet e intenta de nuevo." });
      }
    }
  }, [syncLoading, refetch]);

  // Auto-sync after OAuth if needed
  useEffect(() => {
    if (pendingAutoSync.current && !syncLoading) {
      pendingAutoSync.current = false;
      const timer = setTimeout(() => {
        triggerSync();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [triggerSync, syncLoading]);

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
      const origin = encodeURIComponent(window.location.origin);
      const res = await fetch(`/api/gdrive/auth-url?origin=${origin}`);
      const { url } = await res.json();
      window.location.href = url;
    } catch (e) {
      setStatusMsg({ type: "error", text: "Error al obtener URL de autorización" });
      setAuthLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {statusMsg && (
        <div className={`p-3 rounded-lg border text-sm mb-4 flex items-start gap-2 ${
          statusMsg.type === "success" ? "bg-green-50 border-green-200 text-green-700" :
          statusMsg.type === "error" ? "bg-red-50 border-red-200 text-red-700" :
          "bg-blue-50 border-blue-200 text-blue-700"
        }`}>
          {statusMsg.type === "error" && <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
          {statusMsg.type === "success" && <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />}
          {statusMsg.type === "info" && <Loader2 className="h-4 w-4 shrink-0 mt-0.5 animate-spin" />}
          <span className="flex-1">{statusMsg.text}</span>
          <button onClick={() => setStatusMsg(null)} className="ml-2 opacity-60 hover:opacity-100 shrink-0">✕</button>
        </div>
      )}

      <div className="flex items-center gap-3">
        <RefreshCw className="h-6 w-6" style={{ color: CORP_TEAL }} />
        <h1 className="text-xl font-bold tracking-wide" style={{ color: CORP_DARK, fontFamily: "'Space Grotesk', sans-serif" }}>
          Sincronización &amp; Notificaciones
        </h1>
      </div>

      {/* Google Drive Token Revoked Banner */}
      {gdriveRevoked && (
        <Card className="p-5 rounded-xl border-2 border-red-300 bg-red-50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <ShieldAlert className="h-8 w-8 text-red-500 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-red-600 tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  TOKEN DE GOOGLE DRIVE EXPIRADO
                </h3>
                <p className="text-xs text-red-500/80 mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  El token de acceso fue revocado o expiró. La sincronización automática está detenida.
                  Haz clic en "Re-autorizar" para reconectar tu cuenta de Google y reactivar la sincronización.
                </p>
              </div>
            </div>
            <Button
              onClick={handleAuthorizeGDrive}
              disabled={authLoading}
              className="gap-2 shrink-0 text-white"
              style={{ backgroundColor: "#dc2626", fontFamily: "'Space Grotesk', sans-serif", fontSize: "11px" }}
            >
              <Link className={`h-4 w-4 ${authLoading ? 'animate-spin' : ''}`} />
              {authLoading ? 'CONECTANDO...' : 'RE-AUTORIZAR AHORA'}
            </Button>
          </div>
        </Card>
      )}

      {/* Google Drive Not Authorized Banner */}
      {tokenStatus === 'none' && (
        <Card className="p-5 rounded-xl border border-amber-300 bg-amber-50">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-3 flex-1">
              <ShieldAlert className="h-8 w-8 text-amber-500 shrink-0" />
              <div>
                <h3 className="text-sm font-bold text-amber-600 tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  GOOGLE DRIVE NO AUTORIZADO
                </h3>
                <p className="text-xs text-amber-600/70 mt-1" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                  Autoriza el acceso a Google Drive una sola vez para activar la sincronización automática cada 15 minutos.
                  El token se guarda de forma permanente y se renueva automáticamente.
                </p>
              </div>
            </div>
            <Button
              onClick={handleAuthorizeGDrive}
              disabled={authLoading}
              className="gap-2 shrink-0 text-white"
              style={{ backgroundColor: "#d97706", fontFamily: "'Space Grotesk', sans-serif", fontSize: "11px" }}
            >
              <Link className={`h-4 w-4 ${authLoading ? 'animate-spin' : ''}`} />
              {authLoading ? 'CONECTANDO...' : 'AUTORIZAR GOOGLE DRIVE'}
            </Button>
          </div>
        </Card>
      )}

      {/* Google Drive Connected Banner */}
      {gdriveAuthorized && (
        <Card className="p-4 rounded-xl border border-green-200 bg-green-50">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 shrink-0" style={{ color: CORP_LIME }} />
            <div className="flex-1">
              <span className="text-sm font-bold" style={{ color: CORP_LIME, fontFamily: "'Space Grotesk', sans-serif" }}>
                GOOGLE DRIVE CONECTADO
              </span>
              <p className="text-xs text-slate-500 mt-0.5" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Sincronización automática activa cada 15 minutos. El token se renueva automáticamente.
              </p>
            </div>
            <Button
              onClick={handleAuthorizeGDrive}
              disabled={authLoading}
              variant="outline"
              style={{ borderColor: CORP_LIME, color: CORP_LIME, fontFamily: "'Space Grotesk', sans-serif" }}
            >
              Re-autorizar
            </Button>
          </div>
        </Card>
      )}

      {/* Sync Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 rounded-xl bg-white border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <Cloud className="h-6 w-6" style={{ color: CORP_TEAL }} />
            <h2 className="text-sm font-bold tracking-wider" style={{ color: CORP_DARK, fontFamily: "'Space Grotesk', sans-serif" }}>
              GOOGLE DRIVE SYNC
            </h2>
          </div>
          <p className="text-sm text-slate-500 mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
            Sincroniza los datos del archivo <span className="font-semibold" style={{ color: CORP_DARK }}>DASBOARD SOMOS U - GESTOR 1.xlsx</span> desde Google Drive.
            La sincronización automática se ejecuta cada 15 minutos.
          </p>
          <div className="space-y-3 mb-6">
            {["Inventario completo (sin límite de referencias)", "Órdenes de compra pendientes", "Directorio de proveedores", "Auto-sync cada 15 minutos"].map((text) => (
              <div key={text} className="flex items-center gap-2 text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                <CheckCircle className="h-4 w-4" style={{ color: CORP_LIME }} />
                <span className="text-slate-600">{text}</span>
              </div>
            ))}
          </div>
          <Button
            onClick={triggerSync}
            disabled={syncLoading}
            className="w-full gap-2 text-white"
            style={{ backgroundColor: CORP_TEAL, fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <RefreshCw className={`h-4 w-4 transition-transform ${syncLoading ? 'animate-spin' : ''}`} />
            {syncLoading ? 'SINCRONIZANDO...' : 'SINCRONIZAR AHORA'}
          </Button>
        </Card>

        {/* Last Sync Info */}
        <Card className="p-6 rounded-xl bg-white border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-6 w-6 text-amber-500" />
            <h2 className="text-sm font-bold tracking-wider" style={{ color: CORP_DARK, fontFamily: "'Space Grotesk', sans-serif" }}>
              ÚLTIMA SINCRONIZACIÓN
            </h2>
          </div>
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: CORP_TEAL }} />
          ) : lastSync ? (
            <div className="space-y-4" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <div className="flex items-center gap-2">
                {lastSync.status === "success" ? (
                  <CheckCircle className="h-5 w-5" style={{ color: CORP_LIME }} />
                ) : (
                  <XCircle className="h-5 w-5 text-red-500" />
                )}
                <span className={`font-semibold ${lastSync.status === "success" ? "" : "text-red-500"}`} style={lastSync.status === "success" ? { color: CORP_LIME } : {}}>
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
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">
                  {lastSync.errorMessage.includes("TOKEN_REVOKED")
                    ? "Token de Google Drive expirado. Haz clic en 'Re-autorizar' arriba."
                    : lastSync.errorMessage}
                </div>
              )}
            </div>
          ) : (
            <p className="text-slate-400 text-sm">No hay registros de sincronización</p>
          )}
        </Card>
      </div>

      {/* Notifications Section */}
      <Card className="p-6 rounded-xl bg-white border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <Bell className="h-6 w-6" style={{ color: CORP_TEAL }} />
          <h2 className="text-sm font-bold tracking-wider" style={{ color: CORP_DARK, fontFamily: "'Space Grotesk', sans-serif" }}>
            NOTIFICACIONES
          </h2>
        </div>
        <p className="text-sm text-slate-500 mb-6" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Envía alertas sobre situaciones críticas del inventario y órdenes de compra.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={() => notifyDelayed.mutate()}
            disabled={notifyDelayed.isPending}
            className="bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100 gap-2 h-auto py-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <div className="text-left">
              <div className="font-bold text-sm">ÓRDENES CON RETRASO</div>
              <div className="text-xs opacity-70 mt-1">Notifica sobre órdenes pendientes vencidas</div>
            </div>
          </Button>
          <Button
            onClick={() => notifyCritical.mutate()}
            disabled={notifyCritical.isPending}
            className="bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 gap-2 h-auto py-4"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <div className="text-left">
              <div className="font-bold text-sm">STOCK CERO CRÍTICO</div>
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
    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
      <div className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</div>
      <div className="text-sm font-semibold mt-1" style={{ color: "#281C19" }}>{value}</div>
    </div>
  );
}
