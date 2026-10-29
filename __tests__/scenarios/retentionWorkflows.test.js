/**
 * Retention Workflows & Business Scenarios Test Suite
 * Simulates end-to-end commercial operations:
 * - Enterprise Account Win-Back Campaign
 * - Rapid Churn Spike Escalation
 * - Account Executive Transition & Multi-Touch Sequence
 */

import { decideAction, calculateChurnScore, calculatePriorityScore } from "../../lib/decisionEngine.js";
import { renderEmailTemplate } from "../../lib/mailer.js";
import { logEvent, getRecentAuditLogs, clearAuditLogs } from "../../lib/auditLogger.js";

describe("Commercial Retention & Customer Success Scenarios", () => {
  beforeEach(() => {
    clearAuditLogs();
  });

  describe("Scenario A: Fortune 500 Enterprise Win-Back Campaign", () => {
    test("detects dormant high-value client and executes targeted win-back", async () => {
      const enterpriseClient = {
        id: 501,
        name: "Global Aerospace Holdings",
        annualContractValue: 250000,
        days_since_last_contact: 65,
        interaction_count: 2,
      };

      // Inactivity penalty with high ACV
      const churn = calculateChurnScore(enterpriseClient.days_since_last_contact, enterpriseClient.interaction_count);
      const priority = calculatePriorityScore(
        enterpriseClient.days_since_last_contact,
        enterpriseClient.interaction_count,
        enterpriseClient.annualContractValue
      );

      // Churn: min(100, max(0, 65*4 - 2*2.5)) = 255 -> capped at 100
      expect(churn).toBe(100);
      // Priority: (2*2) + 65 + min(20, floor(250000/1000)) = 4 + 65 + 20 = 89
      expect(priority).toBe(89);

      const decision = decideAction({
        churn_score: churn,
        priority_score: priority,
        days_since_last_contact: enterpriseClient.days_since_last_contact,
      });

      expect(decision.level).toBe("CRITICAL");
      expect(decision.action).toBe("ESCALATE_MANAGER");

      // Executive Notification Rendered
      const alert = renderEmailTemplate("CHURN_ALERT_MANAGER", {
        name: enterpriseClient.name,
        id: enterpriseClient.id,
        churnScore: churn,
      });

      expect(alert.subject).toContain(enterpriseClient.name);
      expect(alert.html).toContain("Executive Churn Escalation");

      await logEvent({
        action: "WINBACK_CAMPAIGN_TRIGGERED",
        customerId: enterpriseClient.id,
        metadata: { acv: enterpriseClient.annualContractValue, priority },
      });

      const logs = getRecentAuditLogs({ action: "WINBACK_CAMPAIGN_TRIGGERED" });
      expect(logs).toHaveLength(1);
      expect(logs[0].metadata.acv).toBe(250000);
    });
  });

  describe("Scenario B: Churn Spike Rapid Response Sequence", () => {
    test("transitions customer state through multi-touchpoint retention", async () => {
      const client = {
        id: 602,
        name: "Apex Logistics Ltd",
        touchpoints: [],
      };

      // Week 1: Initial Inactivity (Day 15, 1 touchpoint)
      let churn = calculateChurnScore(15, 1); // 60 - 2.5 = 57.5 -> 58
      let priority = calculatePriorityScore(15, 1); // 2 + 15 = 17
      let decision = decideAction({ churn_score: churn, priority_score: priority, days_since_last_contact: 15 });

      expect(decision.level).toBe("MEDIUM");
      expect(decision.action).toBe("SEND_EMAIL");

      // Automated email dispatched
      client.touchpoints.push({ type: "email", date: "2026-10-15" });
      await logEvent({ action: "NURTURE_EMAIL_SENT", customerId: client.id });

      // Week 2: Silence continues (Day 25, now 2 touchpoints)
      churn = calculateChurnScore(25, 2); // 100 - 5 = 95
      priority = calculatePriorityScore(25, 2); // 4 + 25 = 29
      decision = decideAction({ churn_score: churn, priority_score: priority, days_since_last_contact: 25 });

      expect(decision.level).toBe("CRITICAL");
      expect(decision.action).toBe("ESCALATE_MANAGER");

      // Direct Outreach phone call executed
      client.touchpoints.push({ type: "call", date: "2026-10-25", notes: "Negotiated discount." });
      await logEvent({ action: "ESCALATION_CALL_COMPLETED", customerId: client.id });

      // Post-call state: Day 0, 3 lifetime touchpoints
      churn = calculateChurnScore(0, 3);
      priority = calculatePriorityScore(0, 3);
      decision = decideAction({ churn_score: churn, priority_score: priority, days_since_last_contact: 0 });

      expect(decision.level).toBe("SAFE");
      expect(decision.action).toBe("NO_ACTION");

      const allLogs = getRecentAuditLogs({ customerId: client.id });
      expect(allLogs).toHaveLength(2);
    });
  });

  describe("Scenario C: High-Volume SaaS Trial Account Scoring", () => {
    test("safely evaluates cohorts of 1,000 new trial signups", () => {
      const trialCohort = [];
      for (let i = 1; i <= 1000; i++) {
        trialCohort.push({
          id: 1000 + i,
          days_since_last_contact: i % 14,
          interaction_count: (i % 3) + 1,
        });
      }

      const scored = trialCohort.map((c) => {
        const churn = calculateChurnScore(c.days_since_last_contact, c.interaction_count);
        const priority = calculatePriorityScore(c.days_since_last_contact, c.interaction_count);
        return decideAction({ churn_score: churn, priority_score: priority, days_since_last_contact: c.days_since_last_contact });
      });

      expect(scored).toHaveLength(1000);
      const safeRatio = scored.filter((s) => s.level === "SAFE").length / 1000;
      expect(safeRatio).toBeGreaterThan(0.4);
    });
  });
});
