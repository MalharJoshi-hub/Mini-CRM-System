import cron from "node-cron";
import pool from "../../lib/db.js";
import sendEmail from "../../lib/mailer.js";
import { runFollowupCheck, initScheduler } from "../../lib/scheduler/followupScheduler.js";
import { clearAuditLogs, getRecentAuditLogs } from "../../lib/auditLogger.js";

jest.mock("../../lib/mailer.js", () => {
  return {
    __esModule: true,
    default: jest.fn().mockResolvedValue({ success: true, messageId: "mock-msg-123" }),
    renderEmailTemplate: jest.requireActual("../../lib/mailer.js").renderEmailTemplate,
  };
});

describe("Automation Scheduler Unit Tests (Layer 3)", () => {
  let querySpy;

  beforeEach(() => {
    clearAuditLogs();
    querySpy = jest.spyOn(pool, "query");
    jest.clearAllMocks();
  });

  afterEach(() => {
    querySpy.mockRestore();
  });

  describe("runFollowupCheck() - Inactivity Sweeper", () => {
    test("processes stale accounts and dispatches automated reminder emails", async () => {
      const mockStaleCustomers = [
        {
          id: 101,
          name: "Stale Account Alpha",
          email: "alpha@stale.com",
          last_contact: "2026-09-01",
          days_since_last_contact: 58,
        },
        {
          id: 102,
          name: "Stale Account Beta",
          email: "beta@stale.com",
          last_contact: "2026-10-10",
          days_since_last_contact: 19,
        },
      ];
      querySpy.mockResolvedValueOnce({ rows: mockStaleCustomers });

      const summary = await runFollowupCheck();

      expect(summary.processedCount).toBe(2);
      expect(summary.errors).toHaveLength(0);
      expect(sendEmail).toHaveBeenCalledTimes(2);

      // Verify email parameters for first customer
      expect(sendEmail).toHaveBeenCalledWith(
        "alpha@stale.com",
        expect.stringContaining("Reconnecting with Stale Account Alpha"),
        expect.stringContaining("58 days"),
        expect.stringContaining("58 days")
      );

      // Verify audit logs were generated
      const auditLogs = getRecentAuditLogs({ action: "AUTOMATED_FOLLOWUP_SENT" });
      expect(auditLogs).toHaveLength(2);
      expect(auditLogs.some((l) => l.customerId === 101)).toBe(true);
      expect(auditLogs.some((l) => l.customerId === 102)).toBe(true);
    });

    test("handles empty sweep when no customers are overdue", async () => {
      querySpy.mockResolvedValueOnce({ rows: [] });

      const summary = await runFollowupCheck();

      expect(summary.processedCount).toBe(0);
      expect(summary.errors).toHaveLength(0);
      expect(sendEmail).not.toHaveBeenCalled();
    });

    test("continues sweep when email delivery fails for a single customer", async () => {
      const mockCustomers = [
        { id: 1, name: "Failed Delivery", email: "fail@test.com", days_since_last_contact: 20 },
        { id: 2, name: "Success Delivery", email: "pass@test.com", days_since_last_contact: 15 },
      ];
      querySpy.mockResolvedValueOnce({ rows: mockCustomers });

      sendEmail
        .mockRejectedValueOnce(new Error("SMTP server rejected recipient"))
        .mockResolvedValueOnce({ success: true, messageId: "msg-2" });

      const summary = await runFollowupCheck();

      expect(summary.processedCount).toBe(1);
      expect(summary.errors).toHaveLength(1);
      expect(summary.errors[0]).toContain("Customer 1: SMTP server rejected recipient");
    });

    test("re-throws error when database query fails completely", async () => {
      querySpy.mockRejectedValueOnce(new Error("Connection terminated unexpectedly"));

      await expect(runFollowupCheck()).rejects.toThrow("Connection terminated unexpectedly");
    });
  });

  describe("initScheduler() - Cron Registration", () => {
    test("registers scheduled task with node-cron", () => {
      const scheduleSpy = jest.spyOn(cron, "schedule").mockReturnValue({
        stop: jest.fn(),
      });

      const task = initScheduler("0 * * * *");
      expect(scheduleSpy).toHaveBeenCalledWith("0 * * * *", expect.any(Function));
      expect(task).toBeDefined();

      scheduleSpy.mockRestore();
    });
  });
});
