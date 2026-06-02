import * as Sentry from '@sentry/node';
import { serverLogger } from './logger';

interface SyncMetrics {
  startTime: number;
  endTime?: number;
  itemsProcessed: number;
  ordersProcessed: number;
  suppliersProcessed: number;
  errorsCount: number;
  durationMs?: number;
  status: 'running' | 'success' | 'error';
}

const activeSyncs = new Map<string, SyncMetrics>();

export function startSyncMonitoring(syncId: string): void {
  activeSyncs.set(syncId, {
    startTime: Date.now(),
    itemsProcessed: 0,
    ordersProcessed: 0,
    suppliersProcessed: 0,
    errorsCount: 0,
    status: 'running',
  });
  
  // Alerta si sync tarda >20s
  setTimeout(() => {
    const sync = activeSyncs.get(syncId);
    if (sync && sync.status === 'running') {
      serverLogger.warn(`[Monitoring] Sync ${syncId} exceeded 20s, still running...`);
      Sentry.captureException(new Error('Sync timeout warning'), {
        tags: { context: 'Performance' },
        extra: { syncDuration: Date.now() - sync.startTime },
      });
    }
  }, 20000);
}

export function recordSyncCompletion(syncId: string, metrics: Partial<SyncMetrics>): void {
  const sync = activeSyncs.get(syncId);
  if (!sync) return;
  
  const durationMs = Date.now() - sync.startTime;
  const itemsPerSecond = (metrics.itemsProcessed || 0) / (durationMs / 1000);
  
  // Enviar métricas a Sentry
  Sentry.captureMessage(`Sync completed: ${durationMs}ms`, {
    level: 'info',
    tags: { context: 'Performance' },
    extra: {
      durationMs,
      itemsPerSecond: itemsPerSecond.toFixed(2),
      itemsProcessed: metrics.itemsProcessed,
      ordersProcessed: metrics.ordersProcessed,
      suppliersProcessed: metrics.suppliersProcessed,
      status: metrics.status,
    }
  });
  
  serverLogger.log(`[Monitoring] Sync metrics:`, {
    durationMs,
    itemsPerSecond: itemsPerSecond.toFixed(2),
    ...metrics,
  });
  
  activeSyncs.delete(syncId);
}

// Detectar syncs muertos
setInterval(() => {
  const now = Date.now();
  for (const [id, sync] of Array.from(activeSyncs.entries())) {
    if (now - sync.startTime > 60000) {  // 60 segundos = deadlock
      serverLogger.error(`[Monitoring] Deadlock detected: Sync ${id} running for ${(now - sync.startTime) / 1000}s`);
      Sentry.captureException(new Error('Sync deadlock detected'), {
        tags: { context: 'Performance' },
        extra: {
          syncId: id,
          durationMs: now - sync.startTime,
        }
      });
      activeSyncs.delete(id);
    }
  }
}, 5000);
