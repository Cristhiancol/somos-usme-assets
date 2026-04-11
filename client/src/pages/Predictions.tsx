import { useEffect, useState } from "react";
import { trpc } from "../lib/trpc";
import { AlertTriangle, TrendingDown, Package, DollarSign, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Dashboard de Predicción
 * Muestra las 40 referencias clase A en mayor riesgo de desabastecimiento
 * con análisis predictivo de Google Gemini
 */

export function Predictions() {
  const { data, isLoading, error } = trpc.predictions.top40AtRisk.useQuery();
  const [sortBy, setSortBy] = useState<"urgencia" | "dias" | "valor">("urgencia");

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="bg-red-50 border-red-200 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="text-red-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900">Error al cargar predicciones</h3>
              <p className="text-sm text-red-700">{error.message}</p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (!data || !data.success) {
    return (
      <div className="p-6">
        <Card className="bg-yellow-50 border-yellow-200 p-4">
          <p className="text-yellow-800">No hay datos disponibles para mostrar predicciones</p>
        </Card>
      </div>
    );
  }

  // Ordenar items según el criterio seleccionado
  const sortedItems = [...data.items].sort((a, b) => {
    switch (sortBy) {
      case "urgencia":
        const urgenciaOrder = { "CRÍTICO": 0, "ALTO": 1, "MEDIO": 2 };
        return (
          (urgenciaOrder[a.prediction.urgencia as keyof typeof urgenciaOrder] ?? 3) -
          (urgenciaOrder[b.prediction.urgencia as keyof typeof urgenciaOrder] ?? 3)
        );
      case "dias":
        return a.prediction.diasHastaAgotamiento - b.prediction.diasHastaAgotamiento;
      case "valor":
        return (b.costoUnitario ?? 0) * (b.stockActual ?? 0) - (a.costoUnitario ?? 0) * (a.stockActual ?? 0);
      default:
        return 0;
    }
  });

  const getUrgenciaColor = (urgencia: string) => {
    switch (urgencia) {
      case "CRÍTICO":
        return "bg-red-100 text-red-800 border-red-300";
      case "ALTO":
        return "bg-orange-100 text-orange-800 border-orange-300";
      case "MEDIO":
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
      default:
        return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getImpactoIcon = (impacto: string) => {
    switch (impacto) {
      case "ALTO":
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case "MEDIO":
        return <TrendingDown className="w-4 h-4 text-orange-600" />;
      default:
        return <Package className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-cyan-400">Dashboard de Predicción</h1>
        <p className="text-gray-400">Análisis predictivo de 40 referencias clase A en mayor riesgo</p>
      </div>

      {/* KPIs Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-red-900/20 to-red-900/5 border-red-500/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Críticas</p>
              <p className="text-2xl font-bold text-red-400">{data.summary?.criticas ?? 0}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-600 opacity-50" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-orange-900/20 to-orange-900/5 border-orange-500/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Altas</p>
              <p className="text-2xl font-bold text-orange-400">{data.summary?.altas ?? 0}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-orange-600 opacity-50" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-900/20 to-yellow-900/5 border-yellow-500/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Medias</p>
              <p className="text-2xl font-bold text-yellow-400">{data.summary?.medias ?? 0}</p>
            </div>
            <Package className="w-8 h-8 text-yellow-600 opacity-50" />
          </div>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-900/20 to-cyan-900/5 border-cyan-500/30 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Valor en Riesgo</p>
              <p className="text-xl font-bold text-cyan-400">
                ${((data.summary?.totalValorEnRiesgo ?? 0) / 1000000).toFixed(1)}M
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-cyan-600 opacity-50" />
          </div>
        </Card>
      </div>

      {/* Sorting Controls */}
      <div className="flex gap-2">
        <button
          onClick={() => setSortBy("urgencia")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            sortBy === "urgencia"
              ? "bg-cyan-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          Por Urgencia
        </button>
        <button
          onClick={() => setSortBy("dias")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            sortBy === "dias"
              ? "bg-cyan-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          Por Días
        </button>
        <button
          onClick={() => setSortBy("valor")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            sortBy === "valor"
              ? "bg-cyan-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          Por Valor
        </button>
      </div>

      {/* Items Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Referencia</th>
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Descripción</th>
              <th className="text-center py-3 px-4 text-gray-400 font-semibold">Stock</th>
              <th className="text-center py-3 px-4 text-gray-400 font-semibold">Urgencia</th>
              <th className="text-center py-3 px-4 text-gray-400 font-semibold">Días</th>
              <th className="text-center py-3 px-4 text-gray-400 font-semibold">Comprar</th>
              <th className="text-left py-3 px-4 text-gray-400 font-semibold">Proveedor</th>
              <th className="text-center py-3 px-4 text-gray-400 font-semibold">Impacto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {sortedItems.map((item, idx) => (
              <tr key={`${item.referencia}-${idx}`} className="hover:bg-gray-900/50 transition-colors">
                <td className="py-3 px-4 font-mono text-cyan-400">{item.referencia}</td>
                <td className="py-3 px-4 text-gray-300 max-w-xs truncate">{item.descripcion}</td>
                <td className="py-3 px-4 text-center">
                  <span className="text-gray-300">{Math.round(item.stockActual ?? 0)}</span>
                  <span className="text-gray-500 text-xs ml-1">/ {Math.round(item.maximo ?? 0)}</span>
                </td>
                <td className="py-3 px-4 text-center">
                  <Badge className={`${getUrgenciaColor(item.prediction.urgencia)} border`}>
                    {item.prediction.urgencia}
                  </Badge>
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3 text-gray-500" />
                    <span className="font-semibold text-yellow-400">
                      {item.prediction.diasHastaAgotamiento}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-center font-semibold text-cyan-400">
                  {Math.round(item.prediction.cantidadRecomendada)}
                </td>
                <td className="py-3 px-4 text-gray-300 text-xs max-w-xs truncate">
                  {item.prediction.proveedorSugerido}
                </td>
                <td className="py-3 px-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {getImpactoIcon(item.prediction.riesgoImpacto)}
                    <span className="text-xs text-gray-400">{item.prediction.riesgoImpacto}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 text-sm text-gray-400">
        <p>
          Última actualización: {new Date(data.timestamp ?? new Date()).toLocaleString("es-CO")} • Total de referencias
          analizadas: {data.count}
        </p>
      </div>
    </div>
  );
}
