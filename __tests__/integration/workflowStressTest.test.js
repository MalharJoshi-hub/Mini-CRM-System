/**
 * Integration: High-Volume CRM Workflow Stress & Portfolio Simulation
 * Simulates portfolio lifecycle for an enterprise instance with dozens of accounts,
 * executing churn sweeps, interaction ingestion, and automated intervention dispatching.
 */

import pool from "../../lib/db.js";
import { generateToken } from "../../lib/auth.js";
import { decideAction, calculateChurnScore, calculatePriorityScore, getEngagementTier } from "../../lib/decisionEngine.js";
import { renderEmailTemplate } from "../../lib/mailer.js";
import { logEvent, getRecentAuditLogs, clearAuditLogs } from "../../lib/auditLogger.js";

describe("Workflow Stress & Scaled Portfolio Retention Simulation", () => {
  let querySpy;
  let adminToken;

  beforeAll(() => {
    adminToken = generateToken({ id: 99, email: "director@minicrm.io", role: "admin" });
  });

  beforeEach(() => {
    clearAuditLogs();
    querySpy = jest.spyOn(pool, "query");
  });

  afterEach(() => {
    querySpy.mockRestore();
  });

  test("Simulates 50 distinct enterprise customer scenarios across all churn spectrums", async () => {
    const portfolio = [];

    // Generate 50 realistic accounts across tiers
    for (let i = 1; i <= 50; i++) {
      let daysInactive;
      let interactions;

      if (i <= 10) {
        // High Risk / Critical Accounts
        daysInactive = 35 + (i * 3);
        interactions = Math.max(1, (i % 3));
      } else if (i <= 25) {
        // High Churn / Outreach Needed
        daysInactive = 16;
        interactions = 1;
      } else if (i <= 40) {
        // Medium Risk / Email Nurture
        daysInactive = 10 + (i % 10);
        interactions = 4 + (i % 5);
      } else {
        // Safe / Active Accounts
        daysInactive = 1 + (i % 5);
        interactions = 8 + (i % 10);
      }

      const churn = calculateChurnScore(daysInactive, interactions);
      const priority = calculatePriorityScore(daysInactive, interactions, i * 5000);
      const tier = getEngagementTier(daysInactive, interactions);

      portfolio.push({
        id: i,
        name: `Enterprise Account #${i}`,
        email: `contact${i}@enterprise-portfolio.io`,
        days_since_last_contact: daysInactive,
        interaction_count: interactions,
        churn_score: churn,
        priority_score: priority,
        engagement_tier: tier,
      });
    }

    expect(portfolio).toHaveLength(50);

    // Run decision engine across all 50 accounts
    const enriched = portfolio.map((account) => {
      const decision = decideAction(account);
      return {
        ...account,
        ai_level: decision.level,
        ai_action: decision.action,
        ai_reason: decision.reason,
      };
    });

    // Verify presence of all intervention levels
    const levels = new Set(enriched.map((a) => a.ai_level));
    expect(levels.has("CRITICAL")).toBe(true);
    expect(levels.has("HIGH")).toBe(true);
    expect(levels.has("MEDIUM")).toBe(true);
    expect(levels.has("SAFE")).toBe(true);

    // Identify critical accounts and generate escalation alerts
    const criticalAccounts = enriched.filter((a) => a.ai_level === "CRITICAL");
    expect(criticalAccounts.length).toBeGreaterThanOrEqual(5);

    for (const critical of criticalAccounts) {
      const template = renderEmailTemplate("CHURN_ALERT_MANAGER", {
        name: critical.name,
        id: critical.id,
        churnScore: critical.churn_score,
      });

      expect(template.subject).toContain("URGENT: Churn Alert");

      await logEvent({
        action: "CRITICAL_CHURN_DETECTED",
        customerId: critical.id,
        metadata: {
          churnScore: critical.churn_score,
          priorityScore: critical.priority_score,
          daysInactive: critical.days_since_last_contact,
        },
      });
    }

    const recordedEscalations = getRecentAuditLogs({ action: "CRITICAL_CHURN_DETECTED", limit: 100 });
    expect(recordedEscalations.length).toBe(criticalAccounts.length);
  });

  test("Simulates rapid touchpoint logging and immediate churn rehabilitation", async () => {
    // Customer starts in high churn
    const account = {
      id: 88,
      name: "Summit Energy Partners",
      days_since_last_contact: 16,
      interaction_count: 1,
    };

    let churn = calculateChurnScore(account.days_since_last_contact, account.interaction_count);
    let priority = calculatePriorityScore(account.days_since_last_contact, account.interaction_count);
    let decision = decideAction({ churn_score: churn, priority_score: priority, days_since_last_contact: account.days_since_last_contact });

    expect(decision.level).toBe("HIGH");
    expect(decision.action).toBe("CALL_CUSTOMER");

    // Sales representative executes phone call
    querySpy.mockResolvedValueOnce({ rowCount: 1 });
    await pool.query(
      "INSERT INTO interactions (customer_id, interaction_date, notes) VALUES ($1, CURRENT_DATE, $2)",
      [account.id, "Follow-up call completed. Client requested invoice adjustment."]
    );

    await logEvent({
      action: "CALL_ACTION_COMPLETED",
      customerId: account.id,
      metadata: { previousChurn: churn },
    });

    // Account state refreshes: now 0 days since contact, 3 lifetime interactions
    account.days_since_last_contact = 0;
    account.interaction_count = 3;

    churn = calculateChurnScore(account.days_since_last_contact, account.interaction_count);
    priority = calculatePriorityScore(account.days_since_last_contact, account.interaction_count);
    decision = decideAction({ churn_score: churn, priority_score: priority, days_since_last_contact: 0 });

    expect(churn).toBe(0);
    expect(decision.level).toBe("SAFE");
    expect(decision.action).toBe("NO_ACTION");

    const callAudit = getRecentAuditLogs({ action: "CALL_ACTION_COMPLETED" });
    expect(callAudit).toHaveLength(1);
    expect(callAudit[0].customerId).toBe(88);
  });
});
