/**
 * Integration: Automated Customer Retention Pipeline & Lifecycle Telemetry
 * Simulates a multi-quarter corporate lifecycle, testing transition between pipeline stages:
 * LEAD -> ENGAGED -> AT_RISK -> ESCALATED -> RECOVERED -> EXPANSION
 */

import pool from "../../lib/db.js";
import { generateToken } from "../../lib/auth.js";
import {
  decideAction,
  calculateChurnScore,
  calculatePriorityScore,
  getEngagementTier,
  DECISION_LEVELS,
  RECOMMENDED_ACTIONS,
} from "../../lib/decisionEngine.js";
import { renderEmailTemplate } from "../../lib/mailer.js";
import { logEvent, getRecentAuditLogs, clearAuditLogs } from "../../lib/auditLogger.js";

describe("Automated Retention Pipeline & Corporate Customer Telemetry", () => {
  let querySpy;

  beforeEach(() => {
    clearAuditLogs();
    querySpy = jest.spyOn(pool, "query");
  });

  afterEach(() => {
    querySpy.mockRestore();
  });

  describe("Multi-Stage Customer Retention Progression", () => {
    const customerEntity = {
      id: 301,
      name: "Vanguard Tech Infrastructure",
      email: "procure@vanguard-tech.net",
      annualValue: 240000,
    };

    test("Stage 1 (Onboarding): High engagement, zero churn risk", async () => {
      // Day 0: 5 initial interactions during deployment
      const days = 0;
      const count = 5;

      const churn = calculateChurnScore(days, count);
      const priority = calculatePriorityScore(days, count, customerEntity.annualValue);
      const tier = getEngagementTier(days, count);
      const decision = decideAction({ churn_score: churn, priority_score: priority, days_since_last_contact: days });

      expect(churn).toBe(0);
      expect(tier).toBe("Highly Engaged");
      expect(decision.level).toBe(DECISION_LEVELS.SAFE);
      expect(decision.action).toBe(RECOMMENDED_ACTIONS.NO_ACTION);

      await logEvent({
        action: "STAGE_1_ONBOARDING_COMPLETED",
        customerId: customerEntity.id,
        metadata: { churn, priority },
      });
    });

    test("Stage 2 (Operational Silence): 14 days without interaction, cooling off tier", async () => {
      const days = 14;
      const count = 5;

      // Churn: (14 * 4) - (5 * 2.5) = 56 - 12.5 = 43.5 -> 44
      const churn = calculateChurnScore(days, count);
      const priority = calculatePriorityScore(days, count, customerEntity.annualValue);
      const tier = getEngagementTier(days, count);
      const decision = decideAction({ churn_score: churn, priority_score: priority, days_since_last_contact: days });

      expect(churn).toBe(44);
      expect(tier).toBe("Steady");
      expect(decision.level).toBe(DECISION_LEVELS.MEDIUM);
      expect(decision.action).toBe(RECOMMENDED_ACTIONS.SEND_EMAIL);

      const reminder = renderEmailTemplate("FOLLOWUP_REMINDER", {
        name: customerEntity.name,
        days,
      });

      expect(reminder.subject).toContain(customerEntity.name);

      await logEvent({
        action: "STAGE_2_NURTURE_TRIGGERED",
        customerId: customerEntity.id,
        metadata: { churn, priority, days },
      });
    });

    test("Stage 3 (Breach of Churn Threshold): 25 days of silence escalates risk", async () => {
      const days = 25;
      const count = 5;

      // Churn: (25 * 4) - (5 * 2.5) = 100 - 12.5 = 87.5 -> 88
      // Priority: (5 * 2) + 25 + 20 = 55
      const churn = calculateChurnScore(days, count);
      const priority = calculatePriorityScore(days, count, customerEntity.annualValue);
      const decision = decideAction({ churn_score: churn, priority_score: priority, days_since_last_contact: days });

      expect(churn).toBe(88);
      expect(priority).toBe(55);
      expect(decision.level).toBe(DECISION_LEVELS.CRITICAL);
      expect(decision.action).toBe(RECOMMENDED_ACTIONS.ESCALATE_MANAGER);

      const escalation = renderEmailTemplate("CHURN_ALERT_MANAGER", {
        name: customerEntity.name,
        id: customerEntity.id,
        churnScore: churn,
      });

      expect(escalation.subject).toContain("URGENT: Churn Alert");

      await logEvent({
        action: "STAGE_3_ESCALATION_TRIGGERED",
        customerId: customerEntity.id,
        metadata: { churn, priority, days },
      });
    });

    test("Stage 4 (Intervention Action & Save): Direct outreach phone call restores stability", async () => {
      querySpy.mockResolvedValueOnce({ rowCount: 1 });

      // Account executive completes emergency intervention call
      await pool.query(
        "INSERT INTO interactions (customer_id, interaction_date, notes) VALUES ($1, CURRENT_DATE, $2)",
        [customerEntity.id, "Executive sponsor call completed. Enterprise contract renewed for 2 additional years."]
      );

      await logEvent({
        action: "STAGE_4_INTERVENTION_COMPLETED",
        customerId: customerEntity.id,
        metadata: { status: "resolved" },
      });

      // Post-call state: 0 days since contact, 6 interactions
      const newDays = 0;
      const newCount = 6;

      const churn = calculateChurnScore(newDays, newCount);
      const priority = calculatePriorityScore(newDays, newCount, customerEntity.annualValue);
      const decision = decideAction({ churn_score: churn, priority_score: priority, days_since_last_contact: newDays });

      expect(churn).toBe(0);
      expect(decision.level).toBe(DECISION_LEVELS.SAFE);
      expect(decision.action).toBe(RECOMMENDED_ACTIONS.NO_ACTION);
    });
  });

  describe("Portfolio Churn Rate Aggregation Heuristics", () => {
    test("computes portfolio-wide health index across 20 sample accounts", () => {
      const samplePortfolio = [
        { id: 1, churn: 10 },
        { id: 2, churn: 15 },
        { id: 3, churn: 75 },
        { id: 4, churn: 80 },
        { id: 5, churn: 20 },
        { id: 6, churn: 30 },
        { id: 7, churn: 65 },
        { id: 8, churn: 40 },
        { id: 9, churn: 5 },
        { id: 10, churn: 0 },
        { id: 11, churn: 85 },
        { id: 12, churn: 90 },
        { id: 13, churn: 12 },
        { id: 14, churn: 18 },
        { id: 15, churn: 55 },
        { id: 16, churn: 60 },
        { id: 17, churn: 22 },
        { id: 18, churn: 8 },
        { id: 19, churn: 70 },
        { id: 20, churn: 25 },
      ];

      const averageChurn = samplePortfolio.reduce((sum, c) => sum + c.churn, 0) / samplePortfolio.length;
      expect(averageChurn).toBe(39.25);

      const criticalRatio = samplePortfolio.filter((c) => c.churn >= 70).length / samplePortfolio.length;
      expect(criticalRatio).toBe(0.25); // 25% of accounts in critical danger
    });
  });
});
