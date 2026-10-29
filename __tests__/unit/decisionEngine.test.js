import {
  decideAction,
  calculateChurnScore,
  calculatePriorityScore,
  getEngagementTier,
  DECISION_LEVELS,
  RECOMMENDED_ACTIONS,
} from "../../lib/decisionEngine.js";

describe("Decision Engine - Core Heuristics & Tier Classification", () => {
  describe("decideAction() - Action Matrix and Decision Levels", () => {
    test("prescribes ESCALATE_MANAGER when churn > 70 and priority > 20 (Critical Tier)", () => {
      const customer = {
        churn_score: 75,
        priority_score: 25,
        days_since_last_contact: 20,
      };
      const result = decideAction(customer);

      expect(result.level).toBe(DECISION_LEVELS.CRITICAL);
      expect(result.action).toBe(RECOMMENDED_ACTIONS.ESCALATE_MANAGER);
      expect(result.reason).toContain("Critical churn risk");
      expect(result.priorityScore).toBe(25);
      expect(result.churnScore).toBe(75);
    });

    test("prescribes CALL_CUSTOMER when churn > 60 and priority <= 20 (High Risk)", () => {
      const customer = {
        churn_score: 65,
        priority_score: 18,
        days_since_last_contact: 16,
      };
      const result = decideAction(customer);

      expect(result.level).toBe(DECISION_LEVELS.HIGH);
      expect(result.action).toBe(RECOMMENDED_ACTIONS.CALL_CUSTOMER);
      expect(result.reason).toContain("Elevated churn risk");
    });

    test("prescribes CALL_CUSTOMER even if churn > 70 if priority is below 20", () => {
      const customer = {
        churn_score: 85,
        priority_score: 15,
        days_since_last_contact: 22,
      };
      const result = decideAction(customer);

      expect(result.level).toBe(DECISION_LEVELS.HIGH);
      expect(result.action).toBe(RECOMMENDED_ACTIONS.CALL_CUSTOMER);
    });

    test("prescribes SEND_EMAIL when churn is between 41 and 60 (Medium Risk)", () => {
      const customer = {
        churn_score: 45,
        priority_score: 12,
        days_since_last_contact: 12,
      };
      const result = decideAction(customer);

      expect(result.level).toBe(DECISION_LEVELS.MEDIUM);
      expect(result.action).toBe(RECOMMENDED_ACTIONS.SEND_EMAIL);
      expect(result.reason).toContain("Moderate churn risk");
    });

    test("prescribes SEND_EMAIL at exact boundary churn = 60", () => {
      const customer = {
        churn_score: 60,
        priority_score: 10,
        days_since_last_contact: 15,
      };
      const result = decideAction(customer);

      expect(result.level).toBe(DECISION_LEVELS.MEDIUM);
      expect(result.action).toBe(RECOMMENDED_ACTIONS.SEND_EMAIL);
    });

    test("prescribes SCHEDULE_REVIEW when churn <= 40 but days inactive >= 30", () => {
      const customer = {
        churn_score: 35,
        priority_score: 14,
        days_since_last_contact: 35,
      };
      const result = decideAction(customer);

      expect(result.level).toBe(DECISION_LEVELS.LOW);
      expect(result.action).toBe(RECOMMENDED_ACTIONS.SCHEDULE_REVIEW);
      expect(result.reason).toContain("inactive for 35 days");
    });

    test("prescribes NO_ACTION when account is healthy and recent", () => {
      const customer = {
        churn_score: 20,
        priority_score: 8,
        days_since_last_contact: 4,
      };
      const result = decideAction(customer);

      expect(result.level).toBe(DECISION_LEVELS.SAFE);
      expect(result.action).toBe(RECOMMENDED_ACTIONS.NO_ACTION);
      expect(result.reason).toContain("stable");
    });

    test("handles null or undefined customer payload gracefully", () => {
      const resultNull = decideAction(null);
      expect(resultNull.level).toBe(DECISION_LEVELS.SAFE);
      expect(resultNull.action).toBe(RECOMMENDED_ACTIONS.NO_ACTION);

      const resultUndefined = decideAction(undefined);
      expect(resultUndefined.level).toBe(DECISION_LEVELS.SAFE);
      expect(resultUndefined.action).toBe(RECOMMENDED_ACTIONS.NO_ACTION);
    });

    test("handles non-numeric or string representations cleanly", () => {
      const customer = {
        churn_score: "75",
        priority_score: "22",
        days_since_last_contact: "18",
      };
      const result = decideAction(customer);

      expect(result.level).toBe(DECISION_LEVELS.CRITICAL);
      expect(result.action).toBe(RECOMMENDED_ACTIONS.ESCALATE_MANAGER);
      expect(result.churnScore).toBe(75);
    });

    test("handles missing properties with default fallbacks", () => {
      const customer = {};
      const result = decideAction(customer);

      expect(result.level).toBe(DECISION_LEVELS.SAFE);
      expect(result.action).toBe(RECOMMENDED_ACTIONS.NO_ACTION);
      expect(result.churnScore).toBe(0);
      expect(result.priorityScore).toBe(0);
    });
  });

  describe("calculateChurnScore() - Mathematical Modeling & Bounds", () => {
    test("calculates zero churn score for newly active high-touch customers", () => {
      const score = calculateChurnScore(0, 10);
      expect(score).toBe(0);
    });

    test("scales churn linearly with inactive days", () => {
      const score1 = calculateChurnScore(10, 0); // 10 * 4 = 40
      const score2 = calculateChurnScore(20, 0); // 20 * 4 = 80
      expect(score1).toBe(40);
      expect(score2).toBe(80);
    });

    test("caps maximum churn score at 100", () => {
      const score = calculateChurnScore(50, 0); // 50 * 4 = 200 -> capped at 100
      expect(score).toBe(100);
    });

    test("mitigates churn with interaction density", () => {
      const unmitigated = calculateChurnScore(20, 0); // 80
      const mitigated = calculateChurnScore(20, 8); // 80 - (8 * 2.5) = 80 - 20 = 60
      expect(unmitigated).toBe(80);
      expect(mitigated).toBe(60);
    });

    test("clamps negative churn calculations to 0", () => {
      const score = calculateChurnScore(2, 20); // 8 - 50 = -42 -> clamped to 0
      expect(score).toBe(0);
    });

    test("handles negative inputs safely by clamping to 0", () => {
      const score = calculateChurnScore(-10, -5);
      expect(score).toBe(0);
    });

    test("handles NaN, null, and undefined inputs", () => {
      expect(calculateChurnScore(null, null)).toBe(0);
      expect(calculateChurnScore(undefined, undefined)).toBe(0);
      expect(calculateChurnScore("invalid", "strings")).toBe(0);
    });
  });

  describe("calculatePriorityScore() - Queuing Heuristics", () => {
    test("calculates base priority from interactions and days", () => {
      // interactions * 2 + days = 5 * 2 + 10 = 20
      const score = calculatePriorityScore(10, 5);
      expect(score).toBe(20);
    });

    test("incorporates deal value weighting", () => {
      // 5 * 2 + 10 + floor(10000 / 1000) = 10 + 10 + 10 = 30
      const scoreWithValue = calculatePriorityScore(10, 5, 10000);
      expect(scoreWithValue).toBe(30);
    });

    test("caps deal value weighting factor at 20 points", () => {
      const score = calculatePriorityScore(0, 0, 500000);
      expect(score).toBe(20);
    });

    test("handles zero values and edge cases gracefully", () => {
      expect(calculatePriorityScore(0, 0, 0)).toBe(0);
      expect(calculatePriorityScore(null, undefined)).toBe(0);
    });
  });

  describe("getEngagementTier() - Account Segmentation", () => {
    test("classifies Highly Engaged accounts", () => {
      expect(getEngagementTier(3, 8)).toBe("Highly Engaged");
      expect(getEngagementTier(7, 5)).toBe("Highly Engaged");
    });

    test("classifies Steady accounts", () => {
      expect(getEngagementTier(14, 3)).toBe("Steady");
      expect(getEngagementTier(20, 2)).toBe("Steady");
    });

    test("classifies Cooling Off accounts", () => {
      expect(getEngagementTier(35, 1)).toBe("Cooling Off");
      expect(getEngagementTier(42, 4)).toBe("Cooling Off");
    });

    test("classifies Dormant accounts", () => {
      expect(getEngagementTier(60, 0)).toBe("Dormant");
      expect(getEngagementTier(90, 5)).toBe("Dormant");
    });

    test("handles missing or invalid inputs", () => {
      expect(getEngagementTier(null, null)).toBe("Dormant");
      expect(getEngagementTier("bad", "data")).toBe("Dormant");
    });
  });
});
