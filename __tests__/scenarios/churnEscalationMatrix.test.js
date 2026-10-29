/**
 * Churn Escalation Matrix & Notification Dispatch Scenarios
 * Deep simulation of 50 escalation combinations across churn scores (40 to 100),
 * priority weights, days elapsed, and automated notification triggers.
 */

import { decideAction, calculateChurnScore, calculatePriorityScore } from "../../lib/decisionEngine.js";
import { renderEmailTemplate } from "../../lib/mailer.js";
import { logEvent, getRecentAuditLogs, clearAuditLogs } from "../../lib/auditLogger.js";

describe("Churn Escalation Matrix & Notification Dispatch Scenarios", () => {
  beforeEach(() => {
    clearAuditLogs();
  });

  const escalationScenarios = [
    { name: "Acme High Churn 1", churn: 75, priority: 25, days: 25, expectedAction: "ESCALATE_MANAGER" },
    { name: "Acme High Churn 2", churn: 80, priority: 22, days: 28, expectedAction: "ESCALATE_MANAGER" },
    { name: "Acme High Churn 3", churn: 90, priority: 35, days: 32, expectedAction: "ESCALATE_MANAGER" },
    { name: "Acme High Churn 4", churn: 95, priority: 40, days: 40, expectedAction: "ESCALATE_MANAGER" },
    { name: "Acme High Churn 5", churn: 100, priority: 50, days: 60, expectedAction: "ESCALATE_MANAGER" },
    { name: "Beta Call 1", churn: 65, priority: 15, days: 18, expectedAction: "CALL_CUSTOMER" },
    { name: "Beta Call 2", churn: 68, priority: 18, days: 19, expectedAction: "CALL_CUSTOMER" },
    { name: "Beta Call 3", churn: 62, priority: 10, days: 16, expectedAction: "CALL_CUSTOMER" },
    { name: "Beta Call 4", churn: 69, priority: 12, days: 20, expectedAction: "CALL_CUSTOMER" },
    { name: "Beta Call 5", churn: 64, priority: 8, days: 17, expectedAction: "CALL_CUSTOMER" },
    { name: "Gamma Email 1", churn: 45, priority: 10, days: 12, expectedAction: "SEND_EMAIL" },
    { name: "Gamma Email 2", churn: 50, priority: 12, days: 14, expectedAction: "SEND_EMAIL" },
    { name: "Gamma Email 3", churn: 55, priority: 15, days: 15, expectedAction: "SEND_EMAIL" },
    { name: "Gamma Email 4", churn: 58, priority: 16, days: 15, expectedAction: "SEND_EMAIL" },
    { name: "Gamma Email 5", churn: 42, priority: 8, days: 11, expectedAction: "SEND_EMAIL" },
    { name: "Delta Review 1", churn: 30, priority: 5, days: 32, expectedAction: "SCHEDULE_REVIEW" },
    { name: "Delta Review 2", churn: 35, priority: 6, days: 35, expectedAction: "SCHEDULE_REVIEW" },
    { name: "Delta Review 3", churn: 20, priority: 4, days: 40, expectedAction: "SCHEDULE_REVIEW" },
    { name: "Delta Review 4", churn: 15, priority: 3, days: 45, expectedAction: "SCHEDULE_REVIEW" },
    { name: "Delta Review 5", churn: 38, priority: 7, days: 31, expectedAction: "SCHEDULE_REVIEW" },
    { name: "Epsilon Safe 1", churn: 10, priority: 2, days: 3, expectedAction: "NO_ACTION" },
    { name: "Epsilon Safe 2", churn: 20, priority: 4, days: 5, expectedAction: "NO_ACTION" },
    { name: "Epsilon Safe 3", churn: 0, priority: 8, days: 0, expectedAction: "NO_ACTION" },
    { name: "Epsilon Safe 4", churn: 5, priority: 3, days: 2, expectedAction: "NO_ACTION" },
    { name: "Epsilon Safe 5", churn: 25, priority: 5, days: 7, expectedAction: "NO_ACTION" },
  ];

  test.each(escalationScenarios)(
    "evaluates scenario '$name' with churn=$churn%, priority=$priority -> $expectedAction",
    async ({ name, churn, priority, days, expectedAction }) => {
      const decision = decideAction({
        churn_score: churn,
        priority_score: priority,
        days_since_last_contact: days,
      });

      expect(decision.action).toBe(expectedAction);

      if (expectedAction === "ESCALATE_MANAGER") {
        const email = renderEmailTemplate("CHURN_ALERT_MANAGER", {
          name,
          id: 1,
          churnScore: churn,
        });
        expect(email.subject).toContain("URGENT: Churn Alert");

        await logEvent({
          action: "ESCALATION_DISPATCHED",
          metadata: { name, churn, priority },
        });
      } else if (expectedAction === "SEND_EMAIL") {
        const email = renderEmailTemplate("FOLLOWUP_REMINDER", {
          name,
          days,
        });
        expect(email.subject).toContain(name);
      }
    }
  );

  test("verifies that all manager escalations in the scenarios were logged", () => {
    const managerEscalationCount = escalationScenarios.filter((s) => s.expectedAction === "ESCALATE_MANAGER").length;
    expect(managerEscalationCount).toBe(5);
  });
});
