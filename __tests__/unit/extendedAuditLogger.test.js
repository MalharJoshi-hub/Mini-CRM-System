/**
 * Extended Audit Logger & Security Event Trail Test Suite
 * Tests high-capacity audit logging, event level categorization,
 * metadata payload validation, and compliance retention.
 */

import {
  logEvent,
  getRecentAuditLogs,
  clearAuditLogs,
  LOG_LEVELS,
  memoryAuditStore,
} from "../../lib/auditLogger.js";

describe("Extended Audit Logger & Enterprise Compliance Event Trail", () => {
  beforeEach(() => {
    clearAuditLogs();
  });

  describe("Event Level Categorization & Security Severity", () => {
    test("logs security alert event with customer and metadata context", async () => {
      const entry = await logEvent({
        action: "SUSPICIOUS_ACCESS_ATTEMPT",
        level: LOG_LEVELS.SECURITY,
        userId: 99,
        customerId: 105,
        metadata: {
          ipAddress: "198.51.100.42",
          userAgent: "Mozilla/5.0 Security Scanner",
          reason: "Rate limit threshold breached",
        },
      });

      expect(entry.action).toBe("SUSPICIOUS_ACCESS_ATTEMPT");
      expect(entry.level).toBe(LOG_LEVELS.SECURITY);
      expect(entry.userId).toBe(99);
      expect(entry.customerId).toBe(105);
      expect(entry.metadata.ipAddress).toBe("198.51.100.42");

      const securityLogs = getRecentAuditLogs({ level: LOG_LEVELS.SECURITY });
      expect(securityLogs).toHaveLength(1);
      expect(securityLogs[0].action).toBe("SUSPICIOUS_ACCESS_ATTEMPT");
    });

    test("logs error level event when external subsystem fails", async () => {
      await logEvent({
        action: "SMTP_TRANSPORT_FAILURE",
        level: LOG_LEVELS.ERROR,
        customerId: 201,
        metadata: {
          errorCode: "ECONNREFUSED",
          gateway: "smtp.mailprovider.com",
        },
      });

      const errorLogs = getRecentAuditLogs({ level: LOG_LEVELS.ERROR });
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].metadata.errorCode).toBe("ECONNREFUSED");
    });

    test("logs warning level event for near-limit inactivity", async () => {
      await logEvent({
        action: "INACTIVITY_WARNING_TRIGGERED",
        level: LOG_LEVELS.WARN,
        customerId: 305,
        metadata: { daysInactive: 6 },
      });

      const warnLogs = getRecentAuditLogs({ level: LOG_LEVELS.WARN });
      expect(warnLogs).toHaveLength(1);
      expect(warnLogs[0].metadata.daysInactive).toBe(6);
    });
  });

  describe("Multi-Parameter Audit Filter Permutations", () => {
    beforeEach(async () => {
      await logEvent({ action: "USER_SIGNIN", level: LOG_LEVELS.INFO, userId: 1, customerId: null });
      await logEvent({ action: "CUSTOMER_UPDATE", level: LOG_LEVELS.INFO, userId: 1, customerId: 10 });
      await logEvent({ action: "CUSTOMER_UPDATE", level: LOG_LEVELS.INFO, userId: 2, customerId: 20 });
      await logEvent({ action: "CHURN_ESCALATION", level: LOG_LEVELS.WARN, userId: 2, customerId: 10 });
      await logEvent({ action: "TOKEN_EXPIRED", level: LOG_LEVELS.SECURITY, userId: 3, customerId: null });
    });

    test("filters simultaneously by action and level", () => {
      const results = getRecentAuditLogs({ action: "CHURN_ESCALATION", level: LOG_LEVELS.WARN });
      expect(results).toHaveLength(1);
      expect(results[0].customerId).toBe(10);
    });

    test("filters logs associated with customer 10", () => {
      const results = getRecentAuditLogs({ customerId: 10 });
      expect(results).toHaveLength(2);
      expect(results.some((l) => l.action === "CUSTOMER_UPDATE")).toBe(true);
      expect(results.some((l) => l.action === "CHURN_ESCALATION")).toBe(true);
    });

    test("returns empty array when filter criteria match zero entries", () => {
      const results = getRecentAuditLogs({ action: "NON_EXISTENT_ACTION" });
      expect(results).toEqual([]);
    });
  });

  describe("Chronological Ordering & Immutability", () => {
    test("guarantees newest entries are indexed first in getRecentAuditLogs", async () => {
      for (let i = 1; i <= 5; i++) {
        await logEvent({ action: `EVENT_ORDER_${i}` });
      }

      const logs = getRecentAuditLogs();
      expect(logs[0].action).toBe("EVENT_ORDER_5");
      expect(logs[4].action).toBe("EVENT_ORDER_1");
    });
  });
});
