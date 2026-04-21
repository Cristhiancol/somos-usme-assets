import * as Sentry from "@sentry/react";
import { logger } from "@/lib/logger";

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn) {
    logger.warn("[Sentry] DSN not configured, error tracking disabled");
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 1.0,
  });

  logger.log("[Sentry] Initialized successfully");
}
