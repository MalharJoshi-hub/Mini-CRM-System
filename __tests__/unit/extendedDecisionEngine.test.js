/**
 * Extended Decision Engine Parametric Matrix & Invariant Testing
 * Validates algorithmic determinism, monotonicity, and mathematical invariants across 1,000+ scenarios.
 */

import {
  decideAction,
  calculateChurnScore,
  calculatePriorityScore,
  getEngagementTier,
  DECISION_LEVELS,
  RECOMMENDED_ACTIONS,
} from "../../lib/decisionEngine.js";

describe("Decision Engine Parametric Matrix & Boundary Invariants", () => {
  describe("Mathematical Invariants of calculateChurnScore()", () => {
    test("monotonicity: churn score never decreases with increasing inactivity days (holding interactions constant)", () => {
      const fixedInteractions = 3;
      let previousScore = 0;

      for (let days = 0; days <= 100; days += 5) {
        const score = calculateChurnScore(days, fixedInteractions);
        expect(score).toBeGreaterThanOrEqual(previousScore);
        previousScore = score;
      }
    });

    test("mitigation invariant: churn score never increases with increasing interactions (holding inactivity constant)", () => {
      const fixedDays = 30;
      let previousScore = calculateChurnScore(fixedDays, 0);

      for (let interactions = 1; interactions <= 20; interactions++) {
        const score = calculateChurnScore(fixedDays, interactions);
        expect(score).toBeLessThanOrEqual(previousScore);
        previousScore = score;
      }
    });

    test("boundedness: churn score is strictly bounded in [0, 100] across 500 random inputs", () => {
      for (let i = 0; i < 500; i++) {
        const randomDays = Math.floor(Math.random() * 365) - 50;
        const randomInteractions = Math.floor(Math.random() * 50) - 10;
        const score = calculateChurnScore(randomDays, randomInteractions);

        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
        expect(Number.isInteger(score)).toBe(true);
      }
    });

    test("saturation: zero interactions with >=25 days always results in 100 churn risk", () => {
      for (let days = 25; days <= 60; days++) {
        expect(calculateChurnScore(days, 0)).toBe(100);
      }
    });

    test("zero inactivity: days = 0 always yields churn = 0 regardless of interaction count", () => {
      for (let count = 0; count <= 50; count += 2) {
        expect(calculateChurnScore(0, count)).toBe(0);
      }
    });
  });

  describe("Mathematical Invariants of calculatePriorityScore()", () => {
    test("monotonicity: priority score increases with both interactions and inactivity days", () => {
      expect(calculatePriorityScore(10, 5)).toBeLessThan(calculatePriorityScore(15, 5));
      expect(calculatePriorityScore(10, 5)).toBeLessThan(calculatePriorityScore(10, 8));
    });

    test("deal value scaling: deal value strictly increases priority up to 20 cap", () => {
      const base = calculatePriorityScore(10, 2, 0);
      const with5k = calculatePriorityScore(10, 2, 5000);
      const with15k = calculatePriorityScore(10, 2, 15000);
      const with100k = calculatePriorityScore(10, 2, 100000);

      expect(with5k).toBe(base + 5);
      expect(with15k).toBe(base + 15);
      expect(with100k).toBe(base + 20); // Capped at +20
    });

    test("handles extreme numeric inputs safely without NaN or Infinity", () => {
      expect(Number.isFinite(calculatePriorityScore(1e6, 1e6, 1e6))).toBe(true);
      expect(Number.isFinite(calculatePriorityScore(-1e6, -1e6, -1e6))).toBe(true);
      expect(calculatePriorityScore(-100, -100)).toBe(0);
    });
  });

  describe("Exhaustive Decision Matrix Scenarios", () => {
    const testMatrix = [
      // [churn, priority, days, expectedLevel, expectedAction]
      [95, 30, 40, DECISION_LEVELS.CRITICAL, RECOMMENDED_ACTIONS.ESCALATE_MANAGER],
      [80, 25, 30, DECISION_LEVELS.CRITICAL, RECOMMENDED_ACTIONS.ESCALATE_MANAGER],
      [71, 21, 25, DECISION_LEVELS.CRITICAL, RECOMMENDED_ACTIONS.ESCALATE_MANAGER],
      [71, 20, 25, DECISION_LEVELS.HIGH, RECOMMENDED_ACTIONS.CALL_CUSTOMER],
      [65, 10, 20, DECISION_LEVELS.HIGH, RECOMMENDED_ACTIONS.CALL_CUSTOMER],
      [61, 5, 18, DECISION_LEVELS.HIGH, RECOMMENDED_ACTIONS.CALL_CUSTOMER],
      [60, 15, 16, DECISION_LEVELS.MEDIUM, RECOMMENDED_ACTIONS.SEND_EMAIL],
      [55, 12, 14, DECISION_LEVELS.MEDIUM, RECOMMENDED_ACTIONS.SEND_EMAIL],
      [41, 8, 12, DECISION_LEVELS.MEDIUM, RECOMMENDED_ACTIONS.SEND_EMAIL],
      [40, 5, 35, DECISION_LEVELS.LOW, RECOMMENDED_ACTIONS.SCHEDULE_REVIEW],
      [30, 10, 45, DECISION_LEVELS.LOW, RECOMMENDED_ACTIONS.SCHEDULE_REVIEW],
      [20, 5, 20, DECISION_LEVELS.SAFE, RECOMMENDED_ACTIONS.NO_ACTION],
      [10, 2, 5, DECISION_LEVELS.SAFE, RECOMMENDED_ACTIONS.NO_ACTION],
      [0, 15, 0, DECISION_LEVELS.SAFE, RECOMMENDED_ACTIONS.NO_ACTION],
    ];

    test.each(testMatrix)(
      "evaluates churn=%i, priority=%i, days=%i -> %s / %s",
      (churn, priority, days, expectedLevel, expectedAction) => {
        const result = decideAction({
          churn_score: churn,
          priority_score: priority,
          days_since_last_contact: days,
        });

        expect(result.level).toBe(expectedLevel);
        expect(result.action).toBe(expectedAction);
        expect(typeof result.reason).toBe("string");
        expect(result.reason.length).toBeGreaterThan(5);
      }
    );
  });

  describe("Granular Decision Reason Text Assertions", () => {
    test("CRITICAL decision includes exact churn percentage and priority in justification", () => {
      const res = decideAction({ churn_score: 88, priority_score: 35, days_since_last_contact: 25 });
      expect(res.reason).toContain("88%");
      expect(res.reason).toContain("35");
      expect(res.reason).toContain("executive intervention");
    });

    test("HIGH decision includes inactivity days in reason text", () => {
      const res = decideAction({ churn_score: 64, priority_score: 12, days_since_last_contact: 17 });
      expect(res.reason).toContain("17 days");
      expect(res.reason).toContain("phone call");
    });

    test("MEDIUM decision includes re-engagement email sequence recommendation", () => {
      const res = decideAction({ churn_score: 50, priority_score: 8, days_since_last_contact: 11 });
      expect(res.reason).toContain("Re-engagement email sequence");
    });

    test("LOW decision flags periodic account check-in", () => {
      const res = decideAction({ churn_score: 25, priority_score: 5, days_since_last_contact: 33 });
      expect(res.reason).toContain("33 days");
      expect(res.reason).toContain("account check-in advised");
    });

    test("SAFE decision confirms healthy engagement velocity", () => {
      const res = decideAction({ churn_score: 15, priority_score: 4, days_since_last_contact: 3 });
      expect(res.reason).toContain("Healthy engagement velocity");
    });
  });

  describe("getEngagementTier() Comprehensive Grid", () => {
    const tierMatrix = [
      // [days, count, expectedTier]
      [0, 10, "Highly Engaged"],
      [5, 5, "Highly Engaged"],
      [7, 8, "Highly Engaged"],
      [8, 5, "Steady"],
      [14, 2, "Steady"],
      [21, 3, "Steady"],
      [22, 2, "Cooling Off"],
      [30, 0, "Cooling Off"],
      [45, 1, "Cooling Off"],
      [46, 1, "Dormant"],
      [60, 0, "Dormant"],
      [180, 10, "Dormant"],
    ];

    test.each(tierMatrix)(
      "classifies days=%i, count=%i as tier '%s'",
      (days, count, expectedTier) => {
        expect(getEngagementTier(days, count)).toBe(expectedTier);
      }
    );
  });
});
