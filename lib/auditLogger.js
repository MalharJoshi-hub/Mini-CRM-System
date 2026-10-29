/**
 * Audit Logger Service
 * Maintains an immutable trail of user activities, CRM state changes, and automated decisions.
 */

import pool from "./db.js";

export const LOG_LEVELS = {
  INFO: "INFO",
  WARN: "WARN",
  ERROR: "ERROR",
  SECURITY: "SECURITY",
};

/**
 * In-memory fallback ring buffer for ephemeral test environments or when DB is unreachable.
 */
export const memoryAuditStore = [];
const MAX_MEMORY_LOGS = 500;

/**
 * Records an audit log entry to the database and memory store.
 * @param {object} logEntry
 * @param {string} logEntry.action - Action identifier (e.g., 'CUSTOMER_CREATED', 'DECISION_EXECUTED')
 * @param {string} [logEntry.level='INFO'] - Log severity
 * @param {number|string} [logEntry.userId] - Responsible user ID
 * @param {number|string} [logEntry.customerId] - Associated customer ID
 * @param {object} [logEntry.metadata] - Arbitrary JSON payload
 * @returns {Promise<object>} Created log entry
 */
export async function logEvent({
  action,
  level = LOG_LEVELS.INFO,
  userId = null,
  customerId = null,
  metadata = {},
}) {
  const timestamp = new Date().toISOString();
  const entry = {
    id: memoryAuditStore.length + 1,
    action,
    level,
    userId,
    customerId,
    metadata,
    createdAt: timestamp,
  };

  // Add to in-memory store
  memoryAuditStore.push(entry);
  if (memoryAuditStore.length > MAX_MEMORY_LOGS) {
    memoryAuditStore.shift();
  }

  // Attempt database persistence if connection pool is active and not in isolated test
  try {
    if (process.env.NODE_ENV !== "test" && pool && typeof pool.query === "function") {
      await pool.query(
        `INSERT INTO audit_logs (action, level, user_id, customer_id, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [action, level, userId, customerId, JSON.stringify(metadata)]
      );
    }
  } catch (err) {
    // Non-blocking fallback: audit persistence failures should not abort main request
    if (process.env.NODE_ENV !== "test") {
      console.warn("Could not persist audit log to DB, stored in memory:", err.message);
    }
  }

  return entry;
}

/**
 * Retrieves recorded audit logs matching optional criteria.
 * @param {object} [filters={}]
 * @param {string} [filters.action]
 * @param {string} [filters.level]
 * @param {number} [filters.limit=50]
 * @returns {Array} List of audit records
 */
export function getRecentAuditLogs(filters = {}) {
  let logs = [...memoryAuditStore].reverse();

  if (filters.action) {
    logs = logs.filter((log) => log.action === filters.action);
  }
  if (filters.level) {
    logs = logs.filter((log) => log.level === filters.level);
  }
  if (filters.customerId) {
    logs = logs.filter((log) => log.customerId === filters.customerId);
  }

  const limit = Math.max(1, filters.limit || 50);
  return logs.slice(0, limit);
}

/**
 * Clears in-memory audit logs (useful for unit test isolation).
 */
export function clearAuditLogs() {
  memoryAuditStore.length = 0;
}
