/**
 * ExportButton v1.0 — Botón de exportación a Excel
 * Descarga archivos generados por el server
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { FileSpreadsheet, Loader2 } from "lucide-react";

interface ExportButtonProps {
  type: "inventory" | "orders" | "stockCero";
  label?: string;
  className?: string;
}

export function ExportButton({ type, label, className = "" }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const inventoryExport = trpc.exports.inventoryExcel.useMutation();
  const ordersExport = trpc.exports.ordersExcel.useMutation();
  const stockCeroExport = trpc.exports.stockCeroExcel.useMutation();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      let result: any;

      if (type === "inventory") {
        result = await inventoryExport.mutateAsync();
      } else if (type === "orders") {
        result = await ordersExport.mutateAsync();
      } else if (type === "stockCero") {
        result = await stockCeroExport.mutateAsync();
      }

      if (result?.data) {
        // Convert base64 to blob and download
        const byteCharacters = atob(result.data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: result.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      // Error handled silently
    } finally {
      setIsExporting(false);
    }
  };

  const defaultLabels: Record<string, string> = {
    inventory: "Exportar Inventario",
    orders: "Exportar Órdenes",
    stockCero: "Exportar Stock Cero",
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 ${className}`}
      style={{
        fontFamily: "'Space Grotesk', sans-serif",
        background: "rgba(0,152,144,0.1)",
        color: "#009890",
        border: "1px solid rgba(0,152,144,0.3)",
      }}
      onMouseEnter={(e) => {
        if (!isExporting) {
          e.currentTarget.style.background = "rgba(0,152,144,0.2)";
          e.currentTarget.style.boxShadow = "0 0 12px rgba(0,152,144,0.2)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(0,152,144,0.1)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {isExporting ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <FileSpreadsheet className="h-3.5 w-3.5" />
      )}
      {label || defaultLabels[type] || "Exportar Excel"}
    </button>
  );
}
