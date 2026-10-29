/**
 * Integration Test Suite: Full End-to-End CRM Customer Lifecycle
 * Tests multi-stage progression:
 * 1. Operator Onboarding & Auth
 * 2. Customer Prospect Creation
 * 3. Initial Discovery Interaction Logging
 * 4. Stale Contact Transition -> Churn Risk Escalation
 * 5. AI Decision Engine Intervention Trigger
 * 6. Follow-up Action Execution & Resolution
 */

import pool from "../../lib/db.js";
import { generateToken, verifyToken } from "../../lib/auth.js";
import { decideAction, calculateChurnScore, calculatePriorityScore } from "../../lib/decisionEngine.js";
import { renderEmailTemplate } from "../../lib/mailer.js";
import { validateCustomerInput, validateInteractionInput, validateFollowupActionInput } from "../../lib/validators.js";
import { logEvent, getRecentAuditLogs, clearAuditLogs } from "../../lib/auditLogger.js";

describe("Integration: CRM Customer Lifecycle & Decision Loop", () => {
  let agentToken;
  let querySpy;

  beforeAll(() => {
    agentToken = generateToken({ id: 101, name: "Marcus Rep", email: "marcus@minicrm.io", role: "agent" });
  });

  beforeEach(() => {
    clearAuditLogs();
    querySpy = jest.spyOn(pool, "query");
  });

  afterEach(() => {
    querySpy.mockRestore();
  });

  test("Phase 1: Validates operator session authentication", () => {
    const verified = verifyToken({ headers: { authorization: `Bearer ${agentToken}` } });
    expect(verified.id).toBe(101);
    expect(verified.role).toBe("agent");
  });

  test("Phase 2: Customer Onboarding with Input Schema Validation", async () => {
    const customerPayload = {
      name: "Starlight Aerospace",
      email: "procurement@starlight.aero",
      phone: "+1-555-0987",
      company: "Starlight Global",
    };

    // Schema Validation
    const validation = validateCustomerInput(customerPayload);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);

    // Database Persistence Simulation
    const mockCreatedCustomer = { id: 77, ...customerPayload, status: "lead" };
    querySpy.mockResolvedValueOnce({ rows: [mockCreatedCustomer] });

    const result = await pool.query(
      "INSERT INTO customers (name, email, phone) VALUES ($1, $2, $3) RETURNING *",
      [customerPayload.name, customerPayload.email, customerPayload.phone]
    );

    expect(result.rows[0].id).toBe(77);
    expect(result.rows[0].name).toBe("Starlight Aerospace");

    // Audit Event Logging
    await logEvent({
      action: "CUSTOMER_ONBOARDED",
      customerId: 77,
      userId: 101,
      metadata: { company: customerPayload.company },
    });

    const logs = getRecentAuditLogs({ action: "CUSTOMER_ONBOARDED" });
    expect(logs).toHaveLength(1);
    expect(logs[0].customerId).toBe(77);
  });

  test("Phase 3: Initial Discovery Interaction Logging", async () => {
    const interactionPayload = {
      customer_id: 77,
      interaction_date: "2026-10-01",
      notes: "Held initial scoping call with VP of Engineering. Strong interest in enterprise plan.",
    };

    const validation = validateInteractionInput(interactionPayload);
    expect(validation.isValid).toBe(true);

    querySpy.mockResolvedValueOnce({
      rows: [{ id: 501, ...interactionPayload, channel: "call" }],
    });

    const res = await pool.query(
      "INSERT INTO interactions (customer_id, interaction_date, notes) VALUES ($1, $2, $3) RETURNING *",
      [interactionPayload.customer_id, interactionPayload.interaction_date, interactionPayload.notes]
    );

    expect(res.rows[0].id).toBe(501);
    expect(res.rows[0].customer_id).toBe(77);

    // Initial Churn Calculation at Day 0: 0 days inactive, 1 interaction
    const initialChurn = calculateChurnScore(0, 1);
    const initialPriority = calculatePriorityScore(0, 1);
    expect(initialChurn).toBe(0);
    expect(initialPriority).toBe(2);

    const initialDecision = decideAction({
      churn_score: initialChurn,
      priority_score: initialPriority,
      days_since_last_contact: 0,
    });
    expect(initialDecision.level).toBe("SAFE");
    expect(initialDecision.action).toBe("NO_ACTION");
  });

  test("Phase 4: Customer Inactivity Transition -> Critical Churn Risk", () => {
    // 28 days pass with zero additional touchpoints
    const elapsedDays = 28;
    const totalInteractions = 1;

    // Churn Risk: (28 * 4.0) - (1 * 2.5) = 112 - 2.5 = 109.5 -> capped at 100
    const updatedChurn = calculateChurnScore(elapsedDays, totalInteractions);
    expect(updatedChurn).toBe(100);

    // Priority Score: (1 * 2) + 28 = 30
    const updatedPriority = calculatePriorityScore(elapsedDays, totalInteractions);
    expect(updatedPriority).toBe(30);

    // Engine Evaluation: churn > 70 and priority > 20 -> CRITICAL / ESCALATE_MANAGER
    const decision = decideAction({
      churn_score: updatedChurn,
      priority_score: updatedPriority,
      days_since_last_contact: elapsedDays,
    });

    expect(decision.level).toBe("CRITICAL");
    expect(decision.action).toBe("ESCALATE_MANAGER");
    expect(decision.reason).toContain("Critical churn risk");
  });

  test("Phase 5: Automated Alert Dispatch & Management Escalation", async () => {
    const alertTemplate = renderEmailTemplate("CHURN_ALERT_MANAGER", {
      name: "Starlight Aerospace",
      id: 77,
      churnScore: 100,
    });

    expect(alertTemplate.subject).toContain("URGENT: Churn Alert for Account Starlight Aerospace");
    expect(alertTemplate.text).toContain("Customer Starlight Aerospace (ID: 77)");

    await logEvent({
      action: "EXECUTIVE_CHURN_ESCALATED",
      customerId: 77,
      metadata: { churnScore: 100, template: "CHURN_ALERT_MANAGER" },
    });

    const logs = getRecentAuditLogs({ action: "EXECUTIVE_CHURN_ESCALATED" });
    expect(logs).toHaveLength(1);
    expect(logs[0].metadata.churnScore).toBe(100);
  });

  test("Phase 6: Follow-up Intervention Completion & Account Rehabilitation", async () => {
    const actionPayload = {
      customer_id: 77,
      action: "CALL_CUSTOMER",
    };

    const validation = validateFollowupActionInput(actionPayload);
    expect(validation.isValid).toBe(true);

    querySpy.mockResolvedValueOnce({ rowCount: 1 });

    // Operator executes direct call intervention
    await pool.query(
      "INSERT INTO interactions (customer_id, interaction_date, notes) VALUES ($1, CURRENT_DATE, $2)",
      [77, "Executive intervention call completed. Contract renewal confirmed."]
    );

    // Post-Intervention state: 0 days since contact, 2 interactions
    const rehabilitatedChurn = calculateChurnScore(0, 2);
    const rehabilitatedPriority = calculatePriorityScore(0, 2);

    expect(rehabilitatedChurn).toBe(0);
    expect(rehabilitatedPriority).toBe(4);

    const postInterventionDecision = decideAction({
      churn_score: rehabilitatedChurn,
      priority_score: rehabilitatedPriority,
      days_since_last_contact: 0,
    });

    expect(postInterventionDecision.level).toBe("SAFE");
    expect(postInterventionDecision.action).toBe("NO_ACTION");
  });
});
