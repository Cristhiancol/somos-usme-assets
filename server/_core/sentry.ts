import * as Sentry from "@sentry/node";
import { serverLogger } from "../logger";

export function initSentryServer() {
  const dsn = process.env.SENTRY_DSN;

  if (!dsn) {
    serverLogger.warn("[Sentry Server] DSN not configured, error tracking disabled");
    return;
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: 1.0,
  });

  serverLogger.log("[Sentry Server] Initialized successfully");
}

export function captureException(error: unknown, context?: Record<string, any>) {
  if (process.env.SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
}

export function captureMessage(message: string, level: "info" | "warning" | "error" = "info") {
  if (process.env.SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  }
}
