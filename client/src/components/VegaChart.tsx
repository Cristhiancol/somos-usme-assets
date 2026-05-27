/**
 * VegaChart — Wrapper React para Vega-Lite (equivalente a Altair para JS)
 * Renderiza especificaciones declarativas Vega-Lite en gráficos interactivos.
 * Compatible con el tema corporativo Somos Usme (paleta #281C19/#8CB32A/#009890).
 */
import { useEffect, useRef, useState } from "react";
import embed, { type EmbedOptions } from "vega-embed";
import type { TopLevelSpec } from "vega-lite";

// ── Paleta corporativa Somos Usme ──────────────────────────────────────
export const CORP_COLORS = {
  dark: "#281C19",
  green: "#8CB32A",
  teal: "#009890",
  red: "#E53E3E",
  amber: "#D97706",
  blue: "#2563EB",
  purple: "#7C3AED",
  gray: "#6B7280",
  bg: "#F9FAFB",
  cardBg: "#FFFFFF",
  border: "#E5E7EB",
};

// Esquema de colores corporativo para Vega-Lite
export const CORP_SCHEME = [
  CORP_COLORS.teal,
  CORP_COLORS.green,
  CORP_COLORS.dark,
  CORP_COLORS.amber,
  CORP_COLORS.red,
  CORP_COLORS.blue,
  CORP_COLORS.purple,
];

// ── Opciones base de embed Vega-Lite ───────────────────────────────────
const BASE_EMBED_OPTIONS: EmbedOptions = {
  actions: false, // sin botones de exportar/editar
  renderer: "svg",
};

interface VegaChartProps {
  spec: TopLevelSpec;
  className?: string;
  style?: React.CSSProperties;
}

export function VegaChart({ spec, className = "", style }: VegaChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let view: any;

    // Aplicar fondo transparente por defecto
    const enrichedSpec: TopLevelSpec = {
      background: "transparent",
      config: {
        font: "'Space Grotesk', sans-serif",
        axis: {
          labelColor: CORP_COLORS.dark,
          titleColor: CORP_COLORS.dark,
          gridColor: "#E5E7EB",
          gridOpacity: 0.6,
          domainColor: CORP_COLORS.border,
          tickColor: CORP_COLORS.border,
          labelFontSize: 11,
          titleFontSize: 12,
          titleFontWeight: 600,
        },
        legend: {
          labelColor: CORP_COLORS.dark,
          titleColor: CORP_COLORS.dark,
          labelFontSize: 11,
        },
        title: {
          color: CORP_COLORS.dark,
          fontSize: 13,
          fontWeight: 700,
          font: "'Space Grotesk', sans-serif",
        },
        view: { stroke: "transparent" },
        ...((spec as any).config || {}),
      },
      ...spec,
    };

    embed(containerRef.current, enrichedSpec, BASE_EMBED_OPTIONS)
      .then((result) => {
        view = result.view;
        setError(null);
      })
      .catch((err) => {
        setError(err.message ?? "Error renderizando gráfico");
      });

    return () => {
      if (view) view.finalize();
    };
  }, [spec]);

  if (error) {
    return (
      <div
        className={`flex items-center justify-center text-red-500 text-xs p-4 ${className}`}
        style={style}
      >
        ⚠ {error}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`vega-chart-container w-full h-full flex justify-center ${className}`}
      style={{ overflow: "hidden", minHeight: (spec as any).height || 200, ...style }}
    />
  );
}

// ── Helpers para crear specs Vega-Lite comunes ─────────────────────────

/** Gráfico de barras vertical */
export function barSpec(
  data: { label: string; value: number; color?: string }[],
  options: {
    title?: string;
    xLabel?: string;
    yLabel?: string;
    width?: number;
    height?: number;
    colorField?: boolean;
    format?: string;
  } = {}
): TopLevelSpec {
  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: options.width ?? "container",
    height: options.height ?? 200,
    title: options.title,
    data: { values: data },
    mark: {
      type: "bar",
      cornerRadiusTopLeft: 4,
      cornerRadiusTopRight: 4,
      tooltip: true,
    },
    encoding: {
      x: {
        field: "label",
        type: "nominal",
        axis: { labelAngle: -30, title: options.xLabel ?? null, labelLimit: 120 },
        sort: null,
      },
      y: {
        field: "value",
        type: "quantitative",
        axis: {
          title: options.yLabel ?? null,
          format: options.format ?? ",",
          labelExpr: options.format === "$,.0f"
            ? "'$' + format(datum.value / 1e9, '.2f') + 'B'"
            : undefined,
        },
      },
      color: options.colorField
        ? {
            field: "label",
            type: "nominal",
            scale: { range: CORP_SCHEME },
            legend: null,
          }
        : { value: CORP_COLORS.teal },
      tooltip: [
        { field: "label", title: options.xLabel ?? "Categoría" },
        {
          field: "value",
          title: options.yLabel ?? "Valor",
          format: options.format ?? ",",
        },
      ],
    },
  } as TopLevelSpec;
}

/** Gráfico de líneas con área */
export function areaSpec(
  data: { label: string; value: number }[],
  options: {
    title?: string;
    yLabel?: string;
    width?: number;
    height?: number;
    color?: string;
  } = {}
): TopLevelSpec {
  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: options.width ?? "container",
    height: options.height ?? 180,
    title: options.title,
    data: { values: data },
    layer: [
      {
        mark: { type: "area", opacity: 0.15, color: options.color ?? CORP_COLORS.teal },
        encoding: {
          x: { field: "label", type: "ordinal", axis: { labelAngle: -30, title: null } },
          y: { field: "value", type: "quantitative", axis: { title: options.yLabel ?? null } },
        },
      },
      {
        mark: {
          type: "line",
          point: { size: 60, filled: true },
          strokeWidth: 2.5,
          color: options.color ?? CORP_COLORS.teal,
          tooltip: true,
        },
        encoding: {
          x: { field: "label", type: "ordinal" },
          y: { field: "value", type: "quantitative" },
          tooltip: [
            { field: "label", title: "Mes" },
            { field: "value", title: options.yLabel ?? "Valor", format: "," },
          ],
        },
      },
    ],
  } as TopLevelSpec;
}


/** Gráfico de torta / dona */
export function pieSpec(
  data: { label: string; value: number }[],
  options: {
    title?: string;
    width?: number;
    height?: number;
    innerRadius?: number;
  } = {}
): TopLevelSpec {
  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: options.width ?? 200,
    height: options.height ?? 200,
    title: options.title,
    data: { values: data },
    mark: {
      type: "arc",
      innerRadius: options.innerRadius ?? 55,
      tooltip: true,
    },
    encoding: {
      theta: { field: "value", type: "quantitative" },
      color: {
        field: "label",
        type: "nominal",
        scale: { range: CORP_SCHEME },
        legend: { orient: "right", title: null },
      },
      tooltip: [
        { field: "label", title: "Categoría" },
        { field: "value", title: "Valor", format: "," },
      ],
    },
  } as TopLevelSpec;
}

/** Heatmap de consumo mensual por referencia */
export function heatmapSpec(
  data: { referencia: string; mes: string; cantidad: number }[],
  options: { title?: string; width?: number; height?: number } = {}
): TopLevelSpec {
  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: options.width ?? "container",
    height: options.height ?? 300,
    title: options.title,
    data: { values: data },
    mark: { type: "rect", tooltip: true },
    encoding: {
      x: {
        field: "mes",
        type: "ordinal",
        axis: { labelAngle: -30, title: "Mes" },
      },
      y: {
        field: "referencia",
        type: "nominal",
        axis: { title: "Referencia", labelLimit: 100 },
      },
      color: {
        field: "cantidad",
        type: "quantitative",
        scale: {
          scheme: "tealblues",
          zero: true,
        },
        legend: { title: "Unidades" },
      },
      tooltip: [
        { field: "referencia", title: "Referencia" },
        { field: "mes", title: "Mes" },
        { field: "cantidad", title: "Consumo", format: "," },
      ],
    },
  } as TopLevelSpec;
}

/** Gráfico de barras horizontal (ranking) */
export function hbarSpec(
  data: { label: string; value: number }[],
  options: {
    title?: string;
    xLabel?: string;
    width?: number;
    height?: number;
    format?: string;
    color?: string;
  } = {}
): TopLevelSpec {
  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: options.width ?? "container",
    height: options.height ?? 300,
    title: options.title,
    data: { values: data },
    mark: {
      type: "bar",
      cornerRadiusTopRight: 4,
      cornerRadiusBottomRight: 4,
      tooltip: true,
    },
    encoding: {
      y: {
        field: "label",
        type: "nominal",
        sort: "-x",
        axis: { title: null, labelLimit: 140 },
      },
      x: {
        field: "value",
        type: "quantitative",
        axis: { title: options.xLabel ?? null, format: options.format ?? "," },
      },
      color: { value: options.color ?? CORP_COLORS.green },
      tooltip: [
        { field: "label", title: "Referencia" },
        { field: "value", title: options.xLabel ?? "Valor", format: options.format ?? "," },
      ],
    },
  } as TopLevelSpec;
}

/** Bullet / progress bar para gauge de salud */
export function bulletSpec(
  value: number,
  max: number,
  options: { title?: string; width?: number; color?: string } = {}
): TopLevelSpec {
  const pct = Math.min(100, Math.round((value / max) * 100));
  const color =
    pct >= 70 ? CORP_COLORS.green : pct >= 40 ? CORP_COLORS.amber : CORP_COLORS.red;
  return {
    $schema: "https://vega.github.io/schema/vega-lite/v5.json",
    width: options.width ?? "container",
    height: 40,
    title: options.title,
    data: { values: [{ label: "valor", value: pct }] },
    layer: [
      {
        data: { values: [{ label: "fondo", value: 100 }] },
        mark: { type: "bar", color: "#E5E7EB", cornerRadius: 6, height: 16 },
        encoding: {
          x: { field: "value", type: "quantitative", scale: { domain: [0, 100] }, axis: null },
        },
      },
      {
        mark: { type: "bar", color: options.color ?? color, cornerRadius: 6, height: 16, tooltip: true },
        encoding: {
          x: { field: "value", type: "quantitative", scale: { domain: [0, 100] }, axis: null },
          tooltip: [{ field: "value", title: "Salud (%)", format: ".0f" }],
        },
      },
    ],
    resolve: { scale: { x: "shared" } },
  } as TopLevelSpec;
}
