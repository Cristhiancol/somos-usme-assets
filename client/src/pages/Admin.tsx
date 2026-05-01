/**
 * Admin v1.0 — Panel de Administración
 * Gestión de usuarios, roles, y auditoría de accesos
 * Solo visible para usuarios con role === 'admin'
 */
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Loader2, Shield, Users, UserCheck, UserX, Eye, Clock, ShieldAlert, LogOut, LogIn } from "lucide-react";
import { useState } from "react";

export default function Admin() {
  const { data: users, isLoading: usersLoading, refetch: refetchUsers } = trpc.admin.users.useQuery();
  const { data: audit, isLoading: auditLoading } = trpc.admin.audit.useQuery({ limit: 50 });
  const toggleMutation = trpc.admin.toggleUser.useMutation({ onSuccess: () => refetchUsers() });
  const [activeTab, setActiveTab] = useState<"users" | "audit">("users");

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: '#8CB32A' }} />
          <span className="text-sm font-semibold" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#009890' }}>CARGANDO ADMINISTRACIÓN...</span>
        </div>
      </div>
    );
  }

  const usersArray = Array.isArray(users) ? users : [];
  const auditArray = Array.isArray(audit) ? audit : [];

  const EVENTO_ICONS: Record<string, any> = {
    LOGIN_EXITOSO: LogIn,
    LOGIN_RECHAZADO: ShieldAlert,
    LOGOUT: LogOut,
    ACCESO_DENEGADO: Shield,
  };

  const EVENTO_COLORS: Record<string, string> = {
    LOGIN_EXITOSO: "#22C55E",
    LOGIN_RECHAZADO: "#EF4444",
    LOGOUT: "#6B7280",
    ACCESO_DENEGADO: "#F97316",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="h-6 w-6" style={{ color: '#009890' }} />
        <div>
          <h1 className="text-2xl font-black tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#281C19' }}>
            ADMINISTRACIÓN
          </h1>
          <p className="text-sm text-muted-foreground">Gestión de usuarios y auditoría de accesos</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#F3F4F6' }}>
        {([
          { key: "users" as const, label: "Usuarios", icon: Users },
          { key: "audit" as const, label: "Auditoría", icon: Eye },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all flex-1"
            style={{
              fontFamily: "'Space Grotesk', sans-serif",
              background: activeTab === tab.key ? "#FFFFFF" : "transparent",
              color: activeTab === tab.key ? "#281C19" : "#6B7280",
              boxShadow: activeTab === tab.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
            }}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Users Tab */}
      {activeTab === "users" && (
        <Card className="cyber-card p-6 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold tracking-wider" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#281C19' }}>
              USUARIOS REGISTRADOS ({usersArray.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              <thead>
                <tr className="table-header-corp border-b" style={{ borderColor: 'rgba(0,152,144,0.2)' }}>
                  <th className="text-left py-3 px-3 font-semibold">Usuario</th>
                  <th className="text-left py-3 px-3 font-semibold">Email</th>
                  <th className="text-center py-3 px-3 font-semibold">Rol</th>
                  <th className="text-center py-3 px-3 font-semibold">Estado</th>
                  <th className="text-right py-3 px-3 font-semibold">Último Acceso</th>
                  <th className="text-center py-3 px-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usersArray.map((user: any) => {
                  const isActive = user.activo === 1;
                  return (
                    <tr key={user.id} className="border-b transition-colors hover:bg-lime-50" style={{ borderColor: 'rgba(140,179,42,0.12)' }}>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: isActive ? '#8CB32A' : '#E5E7EB', color: isActive ? '#281C19' : '#9CA3AF' }}
                          >
                            {(user.name || "?").charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium" style={{ color: '#281C19' }}>{user.name || "Sin nombre"}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-xs font-mono" style={{ color: '#6B7280' }}>
                        {user.email || "—"}
                      </td>
                      <td className="text-center py-2.5 px-3">
                        <span
                          className="text-[10px] px-2 py-1 rounded-full font-semibold"
                          style={{
                            background: user.role === "admin" ? "rgba(0,152,144,0.1)" : "rgba(107,114,128,0.1)",
                            color: user.role === "admin" ? "#009890" : "#6B7280",
                            border: `1px solid ${user.role === "admin" ? "rgba(0,152,144,0.3)" : "rgba(107,114,128,0.2)"}`,
                          }}
                        >
                          {user.role === "admin" ? "ADMIN" : "USUARIO"}
                        </span>
                      </td>
                      <td className="text-center py-2.5 px-3">
                        <span
                          className="text-[10px] px-2 py-1 rounded-full font-semibold"
                          style={{
                            background: isActive ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                            color: isActive ? "#22C55E" : "#EF4444",
                            border: `1px solid ${isActive ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                          }}
                        >
                          {isActive ? "ACTIVO" : "INACTIVO"}
                        </span>
                      </td>
                      <td className="text-right py-2.5 px-3 text-xs" style={{ color: '#6B7280' }}>
                        {user.lastSignedIn ? new Date(user.lastSignedIn).toLocaleString("es-CO") : "—"}
                      </td>
                      <td className="text-center py-2.5 px-3">
                        <button
                          onClick={() => toggleMutation.mutate({ userId: user.id, activo: isActive ? 0 : 1 })}
                          disabled={toggleMutation.isPending}
                          className="text-xs px-2.5 py-1.5 rounded-lg transition-all font-medium"
                          style={{
                            background: isActive ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)",
                            color: isActive ? "#EF4444" : "#22C55E",
                            border: `1px solid ${isActive ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
                          }}
                        >
                          {isActive ? "Desactivar" : "Activar"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Audit Tab */}
      {activeTab === "audit" && (
        <Card className="cyber-card p-6 rounded-xl overflow-hidden">
          <h2 className="text-sm font-bold tracking-wider mb-4" style={{ fontFamily: "'Space Grotesk', sans-serif", color: '#281C19' }}>
            LOG DE AUDITORÍA (últimos 50 registros)
          </h2>
          {auditLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: '#009890' }} />
            </div>
          ) : (
            <div className="space-y-2">
              {auditArray.length === 0 ? (
                <p className="text-sm text-center py-8 text-muted-foreground">No hay registros de auditoría</p>
              ) : (
                auditArray.map((entry: any) => {
                  const EventIcon = EVENTO_ICONS[entry.evento] || Shield;
                  const eventColor = EVENTO_COLORS[entry.evento] || "#6B7280";
                  return (
                    <div
                      key={entry.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-gray-50"
                      style={{ border: "1px solid #F3F4F6" }}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${eventColor}15` }}
                      >
                        <EventIcon className="h-4 w-4" style={{ color: eventColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                            style={{ background: `${eventColor}15`, color: eventColor, border: `1px solid ${eventColor}30` }}
                          >
                            {entry.evento}
                          </span>
                          <span className="text-xs font-medium" style={{ color: '#281C19' }}>{entry.email}</span>
                        </div>
                        {entry.detalle && (
                          <p className="text-[10px] mt-0.5 truncate" style={{ color: '#9CA3AF' }}>{entry.detalle}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px]" style={{ color: '#9CA3AF' }}>
                          {new Date(entry.createdAt).toLocaleString("es-CO")}
                        </p>
                        {entry.ip && (
                          <p className="text-[10px] font-mono" style={{ color: '#D1D5DB' }}>{entry.ip}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
