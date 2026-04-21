/**
 * Logger centralizado para el frontend.
 *
 * En DESARROLLO: imprime todos los mensajes en consola con prefijo.
 * En PRODUCCIÓN: completamente silencioso (Vite esbuild.drop también elimina
 *   los console.* del bundle, pero este guard es la segunda línea de defensa).
 *
 * Uso:
 *   import { logger } from '@/lib/logger';
 *   logger.log('Datos cargados:', data);
 *   logger.error('Error crítico:', err);
 */

const isDev = import.meta.env.DEV;

export const logger = {
  /** Información general — silencioso en producción */
  log: (...args: unknown[]): void => {
    if (isDev) console.log('[LOG]', ...args);
  },

  /** Advertencias — silencioso en producción */
  warn: (...args: unknown[]): void => {
    if (isDev) console.warn('[WARN]', ...args);
  },

  /** Errores de UI — silencioso en producción (Sentry los captura) */
  error: (...args: unknown[]): void => {
    if (isDev) console.error('[ERROR]', ...args);
  },

  /** Debug detallado — silencioso en producción */
  debug: (...args: unknown[]): void => {
    if (isDev) console.debug('[DEBUG]', ...args);
  },
} as const;

export type Logger = typeof logger;
