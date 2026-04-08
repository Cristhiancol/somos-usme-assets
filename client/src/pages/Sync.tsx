import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, CheckCircle, XCircle, Clock, Cloud, Bell } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function SyncPage() {
  const { data: lastSync, isLoading, refetch } = trpc.sync.lastSync.useQuery();
  const syncMutation = trpc.sync.trigger.useMutation({
    onSuccess: (res: any) => {
      if (res.success) {
        toast.success(res.message || "Sincronización exitosa");
        refetch();
      } else {
        toast.error(res.message || "Error en sincronización");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const notifyDelayed = trpc.notifications.sendDelayedOrdersAlert.useMutation({
    onSuccess: (res) => {
      if (res.sent) toast.success(`Alerta enviada: ${res.count} órdenes con retraso`);
      else toast.info(res.message);
    },
  });

  const notifyCritical = trpc.notifications.sendCriticalStockAlert.useMutation({
    onSuccess: (res) => {
      if (res.sent) toast.success(`Alerta enviada: ${res.count} productos en stock cero`);
      else toast.info(res.message);
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <RefreshCw className="h-6 w-6 text-neon-green" />
        <h1 className="text-xl font-bold text-neon-cyan tracking-wider" style={{ fontFamily: "Orbitron" }}>
          SINCRONIZACIÓN & NOTIFICACIONES
        </h1>
      </div>

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
