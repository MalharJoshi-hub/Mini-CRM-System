import {
  logEvent,
  getRecentAuditLogs,
  clearAuditLogs,
  LOG_LEVELS,
  memoryAuditStore,
} from "../../lib/auditLogger.js";

describe("Audit Logger Service Unit Tests", () => {
  beforeEach(() => {
    clearAuditLogs();
  });

  test("records an audit event and stores in memory buffer", async () => {
    const entry = await logEvent({
      action: "USER_LOGIN_SUCCESS",
      level: LOG_LEVELS.INFO,
      userId: 5,
      metadata: { ip: "127.0.0.1" },
    });

    expect(entry.id).toBe(1);
    expect(entry.action).toBe("USER_LOGIN_SUCCESS");
    expect(entry.userId).toBe(5);
    expect(entry.createdAt).toBeDefined();

    const logs = getRecentAuditLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("USER_LOGIN_SUCCESS");
  });

  test("filters audit logs by action type", async () => {
    await logEvent({ action: "CUSTOMER_CREATED", customerId: 10 });
    await logEvent({ action: "CUSTOMER_UPDATED", customerId: 10 });
    await logEvent({ action: "CUSTOMER_DELETED", customerId: 10 });

    const createdLogs = getRecentAuditLogs({ action: "CUSTOMER_CREATED" });
    expect(createdLogs).toHaveLength(1);
    expect(createdLogs[0].action).toBe("CUSTOMER_CREATED");
  });

  test("filters audit logs by severity level", async () => {
    await logEvent({ action: "NORMAL_ACCESS", level: LOG_LEVELS.INFO });
    await logEvent({ action: "TOKEN_TAMPER_DETECTED", level: LOG_LEVELS.SECURITY });
    await logEvent({ action: "DB_TIMEOUT", level: LOG_LEVELS.ERROR });

    const securityLogs = getRecentAuditLogs({ level: LOG_LEVELS.SECURITY });
    expect(securityLogs).toHaveLength(1);
    expect(securityLogs[0].action).toBe("TOKEN_TAMPER_DETECTED");

    const errorLogs = getRecentAuditLogs({ level: LOG_LEVELS.ERROR });
    expect(errorLogs).toHaveLength(1);
    expect(errorLogs[0].action).toBe("DB_TIMEOUT");
  });

  test("filters audit logs by customer ID", async () => {
    await logEvent({ action: "ACTION_A", customerId: 101 });
    await logEvent({ action: "ACTION_B", customerId: 202 });
    await logEvent({ action: "ACTION_C", customerId: 101 });

    const customer101Logs = getRecentAuditLogs({ customerId: 101 });
    expect(customer101Logs).toHaveLength(2);
  });

  test("respects retrieval limit option", async () => {
    for (let i = 1; i <= 20; i++) {
      await logEvent({ action: `EVENT_${i}` });
    }

    const limited = getRecentAuditLogs({ limit: 5 });
    expect(limited).toHaveLength(5);
    // Recent logs are presented in reverse chronological order
    expect(limited[0].action).toBe("EVENT_20");
  });

  test("clears audit logs cleanly", async () => {
    await logEvent({ action: "TEST_EVENT" });
    expect(memoryAuditStore.length).toBeGreaterThan(0);

    clearAuditLogs();
    expect(memoryAuditStore.length).toBe(0);
    expect(getRecentAuditLogs()).toHaveLength(0);
  });
});
