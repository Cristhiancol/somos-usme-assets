import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { inventoryItems, purchaseOrders } from "../../drizzle/schema";
import { invokeLLM } from "../_core/llm";
import { eq, and, desc, sql } from "drizzle-orm";
import { serverLogger } from "../logger";

/**
 * Predictions Router
 * Análisis predictivo de referencias en riesgo usando Google Gemini
 */

export const predictionsRouter = router({
  top40AtRisk: protectedProcedure.query(async ({ ctx }) => {
    try {
      // 1. Obtener todas las referencias clase A con su información actual
      const database = await getDb();
      if (!database) {
        return {
          success: false,
          error: "Base de datos no disponible",
          items: [],
        };
      }

      const classAItems = await database
        .select({
          id: inventoryItems.id,
          referencia: inventoryItems.referencia,
          descripcion: inventoryItems.descripcion,
          stockActual: inventoryItems.stockActual,
          minimo: inventoryItems.minimo,
          maximo: inventoryItems.maximo,
          claseAbc: inventoryItems.claseAbc,
          costoUnitario: inventoryItems.costoUnitario,
          consumoAnual: inventoryItems.consumoAnual,
          consumoDiario: inventoryItems.consumoDiario,
          leadTimeDias: inventoryItems.leadTimeDias,
          inventarioDias: inventoryItems.inventarioDias,
          estado: inventoryItems.estado,
          proveedor: inventoryItems.proveedor,
          rotacionAnno: inventoryItems.rotacionAnno,
        })
        .from(inventoryItems)
        .where(eq(inventoryItems.claseAbc, "A"))
        .orderBy(desc(inventoryItems.costoUnitario))
        .limit(100);

      if (classAItems.length === 0) {
        return {
          success: true,
          items: [],
          message: "No hay referencias clase A disponibles",
        };
      }

      // 2. Calcular métricas de riesgo para cada referencia
      const itemsWithRisk = classAItems.map((item: typeof classAItems[0]) => {
        const stock = item.stockActual ?? 0;
        const consumo = item.consumoDiario ?? 0;
        const max = item.maximo ?? 0;
        const stockCoverage = consumo && consumo > 0
          ? stock / consumo
          : 0; // días de cobertura
        const stockPercentage = max > 0 ? (stock / max) * 100 : 0;
        const riskScore =
          (100 - stockPercentage) * 0.6 + (30 - stockCoverage) * 0.4; // Score de riesgo 0-100

        return {
          ...item,
          stockCoverage: Math.round(stockCoverage * 10) / 10,
          stockPercentage: Math.round(stockPercentage),
          riskScore: Math.round(riskScore * 10) / 10,
          daysUntilStockout: Math.max(0, Math.ceil(stockCoverage)),
        };
      });

      // 3. Ordenar por riesgo y tomar top 40
      const top40 = itemsWithRisk
        .sort((a: any, b: any) => b.riskScore - a.riskScore)
        .slice(0, 40);

      // 4. Usar Google Gemini para análisis predictivo detallado
      const analysisPrompt = `
Analiza las siguientes 40 referencias clase A de inventario en mayor riesgo de desabastecimiento.
Para cada referencia, proporciona:
1. Nivel de urgencia (CRÍTICO/ALTO/MEDIO)
2. Días estimados hasta agotamiento
3. Recomendación de cantidad a comprar
4. Proveedor sugerido
5. Riesgo de impacto en operaciones

Datos:
${JSON.stringify(top40, null, 2)}

Responde en JSON con estructura:
{
  "predictions": [
    {
      "codigo": "string",
      "urgencia": "CRÍTICO|ALTO|MEDIO",
      "diasHastaAgotamiento": number,
      "cantidadRecomendada": number,
      "proveedorSugerido": "string",
      "riesgoImpacto": "ALTO|MEDIO|BAJO",
      "razon": "string breve"
    }
  ]
}
`;

      const geminResponse = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "Eres un experto en gestión de inventario y abastecimiento. Analiza referencias en riesgo y proporciona recomendaciones predictivas.",
          },
          {
            role: "user",
            content: analysisPrompt,
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "inventory_predictions",
            strict: true,
            schema: {
              type: "object",
              properties: {
                predictions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      codigo: { type: "string" },
                      urgencia: {
                        type: "string",
                        enum: ["CRÍTICO", "ALTO", "MEDIO"],
                      },
                      diasHastaAgotamiento: { type: "number" },
                      cantidadRecomendada: { type: "number" },
                      proveedorSugerido: { type: "string" },
                      riesgoImpacto: {
                        type: "string",
                        enum: ["ALTO", "MEDIO", "BAJO"],
                      },
                      razon: { type: "string" },
                    },
                    required: [
                      "codigo",
                      "urgencia",
                      "diasHastaAgotamiento",
                      "cantidadRecomendada",
                      "proveedorSugerido",
                      "riesgoImpacto",
                      "razon",
                    ],
                  },
                },
              },
              required: ["predictions"],
            },
          },
        },
      });

      // 5. Parsear respuesta de Gemini
      let predictions: any[] = [];
      try {
        const responseText =
          typeof geminResponse.choices[0].message.content === "string"
            ? geminResponse.choices[0].message.content
            : JSON.stringify(geminResponse.choices[0].message.content);
        const parsed = JSON.parse(responseText);
        predictions = parsed.predictions || [];
      } catch (e) {
        serverLogger.error("[Predictions] Error parsing Gemini response:", e);
        // Fallback: usar solo las métricas calculadas
        predictions = top40.map((item: any) => ({
          codigo: item.referencia,
          urgencia:
            item.riskScore > 70 ? "CRÍTICO" : item.riskScore > 40 ? "ALTO" : "MEDIO",
          diasHastaAgotamiento: item.daysUntilStockout,
          cantidadRecomendada: Math.ceil(item.maximo * 0.5),
          proveedorSugerido: item.proveedor || "No especificado",
          riesgoImpacto: item.riskScore > 70 ? "ALTO" : item.riskScore > 40 ? "MEDIO" : "BAJO",
          razon: `Stock: ${item.stockActual}/${item.maximo}, Cobertura: ${item.stockCoverage} días`,
        }));;
      }

      // 6. Combinar datos de inventario con predicciones de Gemini
      const enrichedResults = top40.map((item: typeof top40[0]) => {
        const prediction = predictions.find((p: any) => p.codigo === item.referencia);
        return {
          ...item,
          prediction: prediction || {
            codigo: item.referencia,
            urgencia: "MEDIO",
            diasHastaAgotamiento: item.daysUntilStockout,
            cantidadRecomendada: Math.ceil((item.maximo ?? 0) * 0.5),
            proveedorSugerido: item.proveedor || "No especificado",
            riesgoImpacto: "MEDIO",
            razon: "Análisis automático",
          },
        };
      });

      return {
        success: true,
        count: enrichedResults.length,
        timestamp: new Date(),
        items: enrichedResults,
        summary: {
          criticas: enrichedResults.filter((i: any) => i.prediction.urgencia === "CRÍTICO")
            .length,
          altas: enrichedResults.filter((i: any) => i.prediction.urgencia === "ALTO")
            .length,
          medias: enrichedResults.filter((i: any) => i.prediction.urgencia === "MEDIO")
            .length,
          totalValorEnRiesgo: enrichedResults.reduce(
            (sum: number, i: any) => sum + i.costoUnitario * i.stockActual,
            0
          ),
        },
      };
    } catch (error) {
      serverLogger.error("[Predictions] Error:", error);
      return {
        success: false,
        error: "Error desconocido",
        items: [],
      };
    }
  }),
});
