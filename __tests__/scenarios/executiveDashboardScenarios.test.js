/**
 * Executive Dashboard Scenarios & Portfolio ARR Risk Analytics Test Suite
 * Tests financial risk modeling, ARR at risk calculations, morning briefing metrics,
 * and workload balancing across account managers.
 */

import {
  decideAction,
  calculateChurnScore,
  calculatePriorityScore,
  getEngagementTier,
  DECISION_LEVELS,
  RECOMMENDED_ACTIONS,
} from "../../lib/decisionEngine.js";

describe("Executive Dashboard Analytics & Financial Risk Scenarios", () => {
  const corporatePortfolio = [
    { id: 1, name: "Global MegaCorp", arr: 500000, days: 38, count: 2 },
    { id: 2, name: "FinTech Prime", arr: 250000, days: 12, count: 6 },
    { id: 3, name: "SaaS Rocket Ltd", arr: 180000, days: 28, count: 3 },
    { id: 4, name: "Retail Dynamics", arr: 90000, days: 5, count: 12 },
    { id: 5, name: "BioPharma Core", arr: 320000, days: 45, count: 1 },
    { id: 6, name: "AeroTech Defense", arr: 420000, days: 2, count: 15 },
    { id: 7, name: "Logistics Hub", arr: 140000, days: 22, count: 4 },
    { id: 8, name: "CleanEnergy Grid", arr: 210000, days: 16, count: 2 },
    { id: 9, name: "MediaStream Net", arr: 80000, days: 8, count: 5 },
    { id: 10, name: "CyberSecurity IO", arr: 350000, days: 3, count: 9 },
  ];

  test("computes total portfolio ARR ($2.54M)", () => {
    const totalArr = corporatePortfolio.reduce((acc, c) => acc + c.arr, 0);
    expect(totalArr).toBe(2540000);
  });

  test("calculates ARR At-Risk for CRITICAL and HIGH churn tier accounts", () => {
    const analyzed = corporatePortfolio.map((account) => {
      const churn = calculateChurnScore(account.days, account.count);
      const priority = calculatePriorityScore(account.days, account.count, account.arr);
      const decision = decideAction({ churn_score: churn, priority_score: priority, days_since_last_contact: account.days });

      return {
        ...account,
        churn,
        priority,
        level: decision.level,
        action: decision.action,
      };
    });

    const atRiskAccounts = analyzed.filter((a) =>
      [DECISION_LEVELS.CRITICAL, DECISION_LEVELS.HIGH].includes(a.level)
    );

    expect(atRiskAccounts.length).toBeGreaterThanOrEqual(3);

    const atRiskArr = atRiskAccounts.reduce((acc, a) => acc + a.arr, 0);
    expect(atRiskArr).toBeGreaterThan(500000); // At least half a million ARR in jeopardy

    // Verify critical accounts include Global MegaCorp and BioPharma Core
    expect(atRiskAccounts.some((a) => a.name === "Global MegaCorp")).toBe(true);
    expect(atRiskAccounts.some((a) => a.name === "BioPharma Core")).toBe(true);
  });

  test("generates morning executive action queue ordered by highest risk ARR", () => {
    const scored = corporatePortfolio.map((account) => {
      const churn = calculateChurnScore(account.days, account.count);
      const priority = calculatePriorityScore(account.days, account.count, account.arr);
      const decision = decideAction({ churn_score: churn, priority_score: priority, days_since_last_contact: account.days });
      return {
        ...account,
        churn,
        priority,
        action: decision.action,
        level: decision.level,
      };
    });

    // Filter to immediate human action required: CALL or ESCALATE
    const morningCallList = scored
      .filter((a) => ["CALL_CUSTOMER", "ESCALATE_MANAGER"].includes(a.action))
      .sort((a, b) => b.arr - a.arr); // Highest dollar exposure first

    expect(morningCallList.length).toBeGreaterThan(0);
    // Highest ARR account in danger should be first in the morning call queue
    expect(morningCallList[0].name).toBe("Global MegaCorp");
    expect(morningCallList[0].arr).toBe(500000);
  });

  describe("Account Manager Workload Balancing Heuristics", () => {
    test("distributes high-risk intervention accounts evenly across 3 operational agents", () => {
      const agents = [
        { id: 1, name: "Agent Alice", queue: [] },
        { id: 2, name: "Agent Bob", queue: [] },
        { id: 3, name: "Agent Charlie", queue: [] },
      ];

      // Round-robin distribution of 9 mock action items
      for (let i = 0; i < 9; i++) {
        const agentIndex = i % agents.length;
        agents[agentIndex].queue.push({ taskId: i + 1, customerId: 100 + i });
      }

      expect(agents[0].queue).toHaveLength(3);
      expect(agents[1].queue).toHaveLength(3);
      expect(agents[2].queue).toHaveLength(3);
    });
  });
});
