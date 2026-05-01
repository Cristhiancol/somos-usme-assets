/**
 * Exports Router — Generación de reportes Excel
 * Usa la librería xlsx que ya está instalada en el proyecto
 */
import { protectedProcedure, router } from "../_core/trpc";
import { getInventory, getPurchaseOrders, getStockCeroConOC, getDashboardKPIs, getConsumoMensual, getTopConsumers } from "../db";
import * as XLSX from "xlsx";
import { serverLogger } from "../logger";

export const exportsRouter = router({
  /**
   * Genera reporte Excel del inventario completo
   */
  inventoryExcel: protectedProcedure.mutation(async () => {
    try {
      const { items } = await getInventory({ limit: 5000 });
      const kpis = await getDashboardKPIs();

      const wsData = items.map((i: any) => ({
        "Referencia": i.referencia ?? "",
        "Descripción": i.descripcion ?? "",
        "Parte Fabricante": i.parteFabricante ?? "",
        "Stock Actual": i.stockActual ?? 0,
        "Costo Unitario": i.costoUnitario ?? 0,
        "Valor Total": i.totalStock ?? 0,
        "Categoría": i.cuenta ?? "",
        "Clase ABC": i.claseAbc ?? "",
        "UM": i.umEmision ?? "",
        "Estado": i.estado ?? "",
        "Prioridad": i.prioridad ?? "",
        "Proveedor": i.proveedor ?? "",
        "Consumo Diario": i.consumoDiario ?? 0,
        "Lead Time (días)": i.leadTimeDias ?? 0,
        "Stock Seguridad": i.stockSeguridad ?? 0,
        "Punto Reorden": i.puntoReorden ?? 0,
        "Cantidad a Pedir": i.cantidadAPedir ?? 0,
        "Valor a Pedir": i.valorAPedir ?? 0,
        "Acción Requerida": i.accionRequerida ?? "",
      }));

      const wb = XLSX.utils.book_new();

      // Sheet 1: Inventario
      const ws = XLSX.utils.json_to_sheet(wsData);
      ws["!cols"] = [
        { wch: 12 }, { wch: 35 }, { wch: 15 }, { wch: 12 }, { wch: 15 },
        { wch: 15 }, { wch: 14 }, { wch: 8 }, { wch: 6 }, { wch: 18 },
        { wch: 12 }, { wch: 25 }, { wch: 13 }, { wch: 13 }, { wch: 13 },
        { wch: 13 }, { wch: 15 }, { wch: 15 }, { wch: 20 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, "Inventario");

      // Sheet 2: Resumen KPIs
      if (kpis) {
        const kpiData = [
          { "Métrica": "Total Referencias", "Valor": kpis.totalRefs ?? 0 },
          { "Métrica": "Valor Inventario (COP)", "Valor": kpis.totalValue ?? 0 },
          { "Métrica": "Stock Cero", "Valor": kpis.zeroStock ?? 0 },
          { "Métrica": "Con Stock", "Valor": kpis.withStock ?? 0 },
          { "Métrica": "Órdenes Pendientes", "Valor": kpis.totalPending ?? 0 },
          { "Métrica": "Órdenes Urgentes", "Valor": kpis.urgentOrders ?? 0 },
          { "Métrica": "Clase A", "Valor": kpis.classA ?? 0 },
          { "Métrica": "Clase B", "Valor": kpis.classB ?? 0 },
          { "Métrica": "Clase C", "Valor": kpis.classC ?? 0 },
          { "Métrica": "Fecha Reporte", "Valor": new Date().toLocaleString("es-CO") },
        ];
        const wsKpi = XLSX.utils.json_to_sheet(kpiData);
        wsKpi["!cols"] = [{ wch: 25 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, wsKpi, "KPIs");
      }

      const buffer = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      return {
        filename: `Inventario_Somos_Usme_${new Date().toISOString().slice(0, 10)}.xlsx`,
        data: buffer,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    } catch (e) {
      serverLogger.error("[Exports] Error generando Excel inventario:", e);
      throw e;
    }
  }),

  /**
   * Genera reporte Excel de órdenes de compra
   */
  ordersExcel: protectedProcedure.mutation(async () => {
    try {
      const orders = await getPurchaseOrders();

      const wsData = (orders as any[]).map((o: any) => ({
        "Orden Compra": o.ordenCompra ?? "",
        "Descripción": o.descripcion ?? "",
        "Referencia": o.mainsaver ?? "",
        "Parte Fabricante": o.parteFabricante ?? "",
        "Tipo": o.tipoReferencia ?? "NUEVO",
        "Qty Ordenada": o.qtyOrdenada ?? 0,
        "Qty Recibida": o.qtyRecibida ?? 0,
        "Qty Pendiente": o.qtyPendiente ?? 0,
        "% Cumplimiento": o.cumplimiento ?? 0,
        "Costo Unitario": o.costoUnitario ?? 0,
        "Valor Pendiente": o.valorPendiente ?? 0,
        "Proveedor": o.proveedor ?? "",
        "Comprador": o.comprador ?? "",
        "Estado": o.estado ?? "",
        "Prioridad": o.prioridad ?? "",
        "Días Retraso": o.diasRetraso ?? 0,
        "UM": o.um ?? "",
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(wsData);
      ws["!cols"] = [
        { wch: 12 }, { wch: 35 }, { wch: 14 }, { wch: 15 }, { wch: 10 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 15 },
        { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 18 },
        { wch: 12 }, { wch: 6 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, "Órdenes de Compra");

      const buffer = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      return {
        filename: `Ordenes_Somos_Usme_${new Date().toISOString().slice(0, 10)}.xlsx`,
        data: buffer,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    } catch (e) {
      serverLogger.error("[Exports] Error generando Excel órdenes:", e);
      throw e;
    }
  }),

  /**
   * Genera reporte Excel de Stock Cero con OC
   */
  stockCeroExcel: protectedProcedure.mutation(async () => {
    try {
      const items = await getStockCeroConOC();

      const wsData = (items as any[]).map((o: any) => ({
        "Referencia": o.referencia ?? "",
        "Descripción": o.descripcion ?? "",
        "Parte Fabricante": o.parteFabricante ?? "",
        "Orden Compra": o.ordenCompra ?? "",
        "Proveedor OC": o.proveedorOC ?? "",
        "Proveedor Inv.": o.proveedorInventario ?? "",
        "Qty Pendiente": o.qtyPendiente ?? 0,
        "Valor Pendiente": o.valorPendiente ?? 0,
        "Días Retraso": o.diasRetraso ?? 0,
        "Prioridad OC": o.prioridadOC ?? "",
        "Estado OC": o.estadoOC ?? "",
        "Tipo": o.tipoReferencia ?? "",
        "Clase ABC": o.claseAbc ?? "",
        "Categoría": o.cuenta ?? "",
        "Costo Unitario": o.costoUnitario ?? 0,
      }));

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(wsData);
      ws["!cols"] = [
        { wch: 14 }, { wch: 35 }, { wch: 15 }, { wch: 12 }, { wch: 25 },
        { wch: 25 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 18 },
        { wch: 18 }, { wch: 10 }, { wch: 8 }, { wch: 14 }, { wch: 15 },
      ];
      XLSX.utils.book_append_sheet(wb, ws, "Stock Cero con OC");

      const buffer = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      return {
        filename: `StockCero_OC_Somos_Usme_${new Date().toISOString().slice(0, 10)}.xlsx`,
        data: buffer,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    } catch (e) {
      serverLogger.error("[Exports] Error generando Excel stock cero:", e);
      throw e;
    }
  }),

  /**
   * Genera reporte Excel de consumo mensual
   */
  consumoExcel: protectedProcedure.mutation(async () => {
    try {
      const consumoData = await getConsumoMensual();
      const topData = await getTopConsumers(50);

      // Pivot: agrupar por referencia con meses como columnas
      const refMap: Record<string, any> = {};
      const allMeses = new Set<string>();

      for (const c of consumoData) {
        if (!refMap[c.referencia]) {
          refMap[c.referencia] = {
            Referencia: c.referencia,
            Fabricante: c.fabricante || "",
            Descripcion: c.descripcion || "",
          };
        }
        allMeses.add(c.mes);
        refMap[c.referencia][c.mes] = c.cantidad;
      }

      const mesesOrdenados = Array.from(allMeses).sort();
      const wsData = Object.values(refMap).map((row: any) => {
        const obj: any = {
          "Referencia": row.Referencia,
          "Fabricante": row.Fabricante,
          "Descripción": row.Descripcion,
        };
        for (const m of mesesOrdenados) {
          obj[m] = row[m] ?? 0;
        }
        return obj;
      });

      const wb = XLSX.utils.book_new();

      // Sheet 1: Consumo detallado
      const ws = XLSX.utils.json_to_sheet(wsData);
      XLSX.utils.book_append_sheet(wb, ws, "Consumo Mensual");

      // Sheet 2: Top consumidores
      const topSheet = XLSX.utils.json_to_sheet(
        (topData as any[]).map((t: any) => ({
          "Referencia": t.referencia,
          "Fabricante": t.fabricante || "",
          "Descripción": t.descripcion || "",
          "Total Consumido": Number(t.totalConsumo) || 0,
          "Promedio/Mes": Number(t.promedioMes).toFixed(1),
          "Meses Activos": Number(t.mesesConConsumo) || 0,
        }))
      );
      XLSX.utils.book_append_sheet(wb, topSheet, "Top Consumidores");

      const buffer = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      return {
        filename: `Consumo_Mensual_Somos_Usme_${new Date().toISOString().slice(0, 10)}.xlsx`,
        data: buffer,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    } catch (e) {
      serverLogger.error("[Exports] Error generando Excel consumo:", e);
      throw e;
    }
  }),
});
