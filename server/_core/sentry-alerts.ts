/**
 * Sentry Alerts Configuration
 * 
 * This file documents the alert rules configured in Sentry for monitoring
 * the Somos Bogotá Usme Asset Tracker application.
 * 
 * Alert Rules:
 * 1. Production Errors - Immediate notification
 *    - Condition: error.level >= error
 *    - Environment: production
 *    - Action: Email to gestor.compras1@somos.co
 *    - Frequency: Immediate
 * 
 * 2. Sync Failures - Daily digest
 *    - Condition: tags.context = "AutoSync" AND error
 *    - Environment: production
 *    - Action: Email to gestor.compras1@somos.co
 *    - Frequency: Daily at 8:00 AM
 * 
 * 3. High Error Rate - Threshold alert
 *    - Condition: error rate > 5% in last 5 minutes
 *    - Environment: production
 *    - Action: Email to gestor.compras1@somos.co
 *    - Frequency: Immediate
 */

export const SENTRY_ALERT_CONFIG = {
  productionErrors: {
    name: "Production Errors",
    condition: "error.level >= error",
    environment: "production",
    actions: ["email:gestor.compras1@somos.co"],
    frequency: "immediate",
  },
  syncFailures: {
    name: "Sync Failures",
    condition: 'tags.context = "AutoSync" AND error',
    environment: "production",
    actions: ["email:gestor.compras1@somos.co"],
    frequency: "daily",
  },
  highErrorRate: {
    name: "High Error Rate",
    condition: "error_rate > 5% in last 5 minutes",
    environment: "production",
    actions: ["email:gestor.compras1@somos.co"],
    frequency: "immediate",
  },
};

/**
 * Manual Setup Instructions for Sentry Alerts:
 * 
 * 1. Go to https://sentry.io/organizations/your-org/alerts/
 * 2. Click "Create Alert Rule"
 * 3. For each rule in SENTRY_ALERT_CONFIG:
 *    - Set the condition
 *    - Select environment
 *    - Add email action
 *    - Set frequency
 * 4. Save and enable all rules
 * 
 * Note: These alerts will help catch production errors and sync failures
 * before they impact the supply chain management system.
 */
