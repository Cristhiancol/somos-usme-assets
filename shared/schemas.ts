/**
 * Schemas de Validación Compartidos — Zod
 * Equivalente a Cerberus pero para TypeScript/tRPC
 * Se usan tanto en frontend (formularios) como en backend (tRPC procedures)
 */
import { z } from "zod";

// ── Validación de Orden de Compra ─────────────────────────────────────────────
export const ordenCompraSchema = z.object({
  ordenCompra: z
    .string()
    .min(3, "Mínimo 3 caracteres")
    .max(20, "Máximo 20 caracteres")
    .regex(/^[A-Z0-9\-]+$/i, "Solo letras, números y guiones"),
  descripcion: z
    .string()
    .min(3, "Mínimo 3 caracteres")
    .max(500, "Máximo 500 caracteres")
    .trim(),
  estado: z.enum(
    ["PENDIENTE", "CASI COMPLETO", "VENCIDO", "RECIBIDO", "RECIBIDO PARCIAL"],
    { error: "Estado inválido" }
  ),
  prioridad: z
    .enum(["CRITICO", "REORDEN INMEDIATO", "PRECAUCION", "OPTIMO", "EXCESO"])
    .optional()
    .nullable(),
  proveedor: z.string().min(2, "Proveedor requerido").optional().nullable(),
  valorPendiente: z.number().min(0, "Valor debe ser positivo").optional().nullable(),
  diasRetraso: z.number().int().min(0).optional().nullable(),
  fechaPromesa: z.coerce.date().optional().nullable(),
  fechaRequerida: z.coerce.date().optional().nullable(),
  qtyOrdenada: z.number().min(0, "Cantidad debe ser positiva").optional().nullable(),
  qtyRecibida: z.number().min(0).optional().nullable(),
  qtyPendiente: z.number().min(0).optional().nullable(),
});

// ── Validación de Referencia de Inventario ────────────────────────────────────
export const referenciaSchema = z.object({
  referencia: z
    .string()
    .min(3, "Mínimo 3 caracteres")
    .max(30, "Máximo 30 caracteres")
    .regex(/^[A-Z0-9\-]+$/i, "Solo letras, números y guiones"),
  descripcion: z
    .string()
    .min(3, "Mínimo 3 caracteres")
    .max(500, "Máximo 500 caracteres")
    .trim(),
  stockActual: z.number().int().min(0, "Stock no puede ser negativo"),
  costoUnitario: z.number().min(0, "Costo debe ser positivo"),
  claseAbc: z.enum(["A", "B", "C"]).optional().nullable(),
  estado: z
    .enum(["CRITICO", "REORDEN", "PRECAUCION", "OPTIMO", "EXCESO"])
    .optional()
    .nullable(),
  proveedor: z.string().optional().nullable(),
  cuenta: z.string().optional().nullable(),
});

// ── Validación de Búsqueda ────────────────────────────────────────────────────
export const busquedaSchema = z.object({
  query: z
    .string()
    .min(2, "Mínimo 2 caracteres para buscar")
    .max(100, "Máximo 100 caracteres")
    .trim(),
});

// ── Validación de Filtros de Órdenes ──────────────────────────────────────────
export const filtrosOrdenSchema = z.object({
  estado: z.string().optional(),
  prioridad: z.string().optional(),
  search: z.string().max(100).optional(),
  tipoReferencia: z.enum(["TODOS", "NUEVO", "REPARADO", "SERVICIO"]).optional(),
});

// ── Validación de Filtros de Inventario ───────────────────────────────────────
export const filtrosInventarioSchema = z.object({
  cuenta: z.string().optional(),
  claseAbc: z.string().optional(),
  estado: z.string().optional(),
  search: z.string().max(100).optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(200).optional(),
});

// ── Validación de Monto/Valor ─────────────────────────────────────────────────
export const montoSchema = z
  .number()
  .min(0, "El monto debe ser positivo")
  .max(999_999_999_999, "Monto excede el límite");

// ── Validación de Fecha ───────────────────────────────────────────────────────
export const fechaEntregaSchema = z.coerce
  .date()
  .refine(
    (d) => d >= new Date("2020-01-01"),
    "La fecha debe ser posterior a 2020"
  );

// ── Export types ──────────────────────────────────────────────────────────────
export type OrdenCompra = z.infer<typeof ordenCompraSchema>;
export type Referencia = z.infer<typeof referenciaSchema>;
export type Busqueda = z.infer<typeof busquedaSchema>;
export type FiltrosOrden = z.infer<typeof filtrosOrdenSchema>;
export type FiltrosInventario = z.infer<typeof filtrosInventarioSchema>;
