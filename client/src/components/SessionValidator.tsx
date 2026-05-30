import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { X } from "lucide-react";
import { useLocation } from "wouter";

export function SessionValidator() {
  const [, setLocation] = useLocation();
  
  // Verificar sesión cada 5 minutos
  const { data: validation } = trpc.auth.validateSession.useQuery(
    undefined,
    { 
      refetchInterval: 5 * 60 * 1000,  // 5 minutos
      retry: 1,
    }
  );

  // Si la sesión es inválida, mostrar banner
  if (validation && !validation.valid) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-red-100 border-b-2 border-red-600 px-4 py-3 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="text-red-700 font-bold text-lg">⚠️</div>
            <div>
              <p className="font-semibold text-red-800">
                {validation.reason === "user_inactive" && "Usuario inactivo"}
                {validation.reason === "user_deleted" && "Usuario eliminado"}
                {validation.reason === "no_session" && "Sesión expirada"}
              </p>
              <p className="text-sm text-red-700">
                Por favor reinicia sesión para continuar.
              </p>
            </div>
          </div>
          <button
            onClick={() => setLocation("/login")}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md transition-colors"
          >
            Reiniciar Sesión
          </button>
          <button
            onClick={() => window.location.reload()}
            className="p-2 hover:bg-red-200 rounded-md transition-colors"
          >
            <X className="h-5 w-5 text-red-700" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
