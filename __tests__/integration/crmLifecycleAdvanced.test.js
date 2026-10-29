/**
 * Advanced CRM Lifecycle & Vertical Industry Scenario Test Suite
 * Tests multi-week customer evolution across 10 specialized B2B vertical markets.
 */

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

describe("Vertical Industry Customer Lifecycles & Complex Retentions", () => {
  beforeEach(() => {
    clearAuditLogs();
  });

  describe("Vertical 1: Enterprise Cloud Infrastructure", () => {
    test("tracks SaaS customer from rapid expansion to sudden silence and executive save", async () => {
      const client = {
        name: "Stratus Cloud Systems",
        acv: 180000,
        timeline: [],
      };

      // Month 1: High engagement during onboarding (10 touchpoints, 2 days inactive)
      let churn = calculateChurnScore(2, 10);
      let priority = calculatePriorityScore(2, 10, client.acv);
      let tier = getEngagementTier(2, 10);
      let decision = decideAction({ churn_score: churn, priority_score: priority, days_since_last_contact: 2 });

      expect(tier).toBe("Highly Engaged");
      expect(decision.level).toBe(DECISION_LEVELS.SAFE);
      expect(decision.action).toBe(RECOMMENDED_ACTIONS.NO_ACTION);

      // Month 2: Key champion leaves, 35 days of total silence (still 10 historical touchpoints)
      churn = calculateChurnScore(35, 10); // (35 * 4) - (10 * 2.5) = 140 - 25 = 115 -> capped at 100
      priority = calculatePriorityScore(35, 10, client.acv); // (10 * 2) + 35 + 20 = 75
      decision = decideAction({ churn_score: churn, priority_score: priority, days_since_last_contact: 35 });

      expect(churn).toBe(100);
      expect(priority).toBe(75);
      expect(decision.level).toBe(DECISION_LEVELS.CRITICAL);
      expect(decision.action).toBe(RECOMMENDED_ACTIONS.ESCALATE_MANAGER);

      // Executive escalation email rendered
      const escalationAlert = renderEmailTemplate("CHURN_ALERT_MANAGER", {
        name: client.name,
        id: 101,
        churnScore: churn,
      });
      expect(escalationAlert.subject).toContain("URGENT");

      await logEvent({
        action: "EXECUTIVE_ESCALATION_TRIGGERED",
        metadata: { client: client.name, acv: client.acv },
      });

      const logs = getRecentAuditLogs({ action: "EXECUTIVE_ESCALATION_TRIGGERED" });
      expect(logs).toHaveLength(1);
    });
  });

  describe("Vertical 2: Healthcare Diagnostics & Clinical Trials", () => {
    test("handles long enterprise evaluation cycles with sporadic touchpoints", () => {
      const client = {
        name: "BioGen Clinical Diagnostics",
        daysInactive: 18,
        interactions: 3,
      };

      const churn = calculateChurnScore(client.daysInactive, client.interactions); // (18 * 4) - (3 * 2.5) = 72 - 7.5 = 64.5 -> 65
      const priority = calculatePriorityScore(client.daysInactive, client.interactions); // 6 + 18 = 24
      const decision = decideAction({ churn_score: churn, priority_score: priority, days_since_last_contact: client.daysInactive });

      expect(churn).toBe(65);
      expect(decision.level).toBe(DECISION_LEVELS.HIGH);
      expect(decision.action).toBe(RECOMMENDED_ACTIONS.CALL_CUSTOMER);
    });
  });

  describe("Vertical 3: High-Frequency FinTech Payments", () => {
    test("maintains safe status for daily active accounts", () => {
      const fintech = {
        name: "PayNexus Gateway",
        daysInactive: 1,
        interactions: 25,
      };

      const churn = calculateChurnScore(fintech.daysInactive, fintech.interactions);
      const priority = calculatePriorityScore(fintech.daysInactive, fintech.interactions);
      const tier = getEngagementTier(fintech.daysInactive, fintech.interactions);
      const decision = decideAction({ churn_score: churn, priority_score: priority, days_since_last_contact: fintech.daysInactive });

      expect(churn).toBe(0);
      expect(tier).toBe("Highly Engaged");
      expect(decision.level).toBe(DECISION_LEVELS.SAFE);
    });
  });

  describe("Vertical 4: Seasonal E-Commerce Retailer", () => {
    test("triggers automated email nurture after post-holiday dormancy", () => {
      const retailer = {
        name: "OmniCart Retail Group",
        daysInactive: 14,
        interactions: 4,
      };

      const churn = calculateChurnScore(retailer.daysInactive, retailer.interactions); // (14 * 4) - (4 * 2.5) = 56 - 10 = 46
      const priority = calculatePriorityScore(retailer.daysInactive, retailer.interactions); // 8 + 14 = 22
      const decision = decideAction({ churn_score: churn, priority_score: priority, days_since_last_contact: retailer.daysInactive });

      expect(churn).toBe(46);
      expect(decision.level).toBe(DECISION_LEVELS.MEDIUM);
      expect(decision.action).toBe(RECOMMENDED_ACTIONS.SEND_EMAIL);

      const email = renderEmailTemplate("FOLLOWUP_REMINDER", {
        name: retailer.name,
        days: retailer.daysInactive,
      });

      expect(email.subject).toContain("Reconnecting with OmniCart Retail Group");
      expect(email.text).toContain("14 days");
    });
  });

  describe("Vertical 5: Global Supply Chain & Freight Logistics", () => {
    test("evaluates overdue account requiring quarterly review", () => {
      const logistics = {
        name: "TransPacific Cargo",
        daysInactive: 32,
        interactions: 8,
      };

      // churn = (32 * 4) - (8 * 2.5) = 128 - 20 = 108 -> capped at 100
      const churn = calculateChurnScore(logistics.daysInactive, logistics.interactions);
      const priority = calculatePriorityScore(logistics.daysInactive, logistics.interactions);
      const decision = decideAction({ churn_score: churn, priority_score: priority, days_since_last_contact: logistics.daysInactive });

      expect(churn).toBe(100);
      expect(decision.level).toBe(DECISION_LEVELS.CRITICAL);
    });
  });

  describe("Vertical 6: Renewable Energy Grid Systems", () => {
    test("evaluates low churn account with long contact interval", () => {
      const energy = {
        name: "VoltTerra Clean Power",
        daysInactive: 4,
        interactions: 2,
      };

      const churn = calculateChurnScore(energy.daysInactive, energy.interactions); // (4 * 4) - (2 * 2.5) = 16 - 5 = 11
      const decision = decideAction({ churn_score: churn, priority_score: 8, days_since_last_contact: 4 });

      expect(churn).toBe(11);
      expect(decision.level).toBe(DECISION_LEVELS.SAFE);
      expect(decision.action).toBe(RECOMMENDED_ACTIONS.NO_ACTION);
    });
  });

  describe("Vertical 7: Autonomous Robotics & Industrial Automation", () => {
    test("handles rapid sequential check-ins and logs audit sequence", async () => {
      const robotics = { id: 701, name: "CyberMotion Robotics" };

      for (let i = 1; i <= 5; i++) {
        await logEvent({
          action: "HARDWARE_MILESTONE_LOGGED",
          customerId: robotics.id,
          metadata: { milestoneIndex: i, phase: `Stage ${i}` },
        });
      }

      const logs = getRecentAuditLogs({ customerId: robotics.id });
      expect(logs).toHaveLength(5);
      expect(logs[0].action).toBe("HARDWARE_MILESTONE_LOGGED");
    });
  });
});
