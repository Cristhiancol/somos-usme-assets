/**
 * Logger centralizado para el servidor Express/tRPC.
 *
 * Política:
 *   - `error` y `warn` SIEMPRE se imprimen (visibles en logs de producción para monitoreo).
 *   - `log`, `info`, `debug` solo en desarrollo (NODE_ENV !== 'production').
 *
 * Uso:
 *   import { serverLogger } from '../logger';
 *   serverLogger.log('[Sync] Descarga completada');
 *   serverLogger.error('[DB] Fallo conexión:', err);
 */

const isDev = process.env.NODE_ENV !== 'production';

export const serverLogger = {
  /** Información operacional — solo en desarrollo */
  log: (...args: unknown[]): void => {
    if (isDev) console.log(...args);
  },

  /** Información operacional — solo en desarrollo */
  info: (...args: unknown[]): void => {
    if (isDev) console.log('[INFO]', ...args);
  },

  /** Advertencias — SIEMPRE visibles (importantes para monitoreo) */
  warn: (...args: unknown[]): void => {
    console.warn(...args);
  },

  /** Errores críticos — SIEMPRE visibles (capturados por Sentry también) */
  error: (...args: unknown[]): void => {
    console.error(...args);
  },

  /** Debug detallado — solo en desarrollo */
  debug: (...args: unknown[]): void => {
    if (isDev) console.debug('[DEBUG]', ...args);
  },
} as const;

export type ServerLogger = typeof serverLogger;
