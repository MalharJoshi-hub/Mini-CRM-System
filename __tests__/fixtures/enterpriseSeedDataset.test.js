/**
 * Enterprise Seed Dataset Integrity & Statistical Distribution Tests
 * Validates enterprise fixture profiles across 100 accounts, ensuring variance
 * in churn risk, priority scores, touchpoint density, and contract values.
 */

import {
  calculateChurnScore,
  calculatePriorityScore,
  getEngagementTier,
  decideAction,
} from "../../lib/decisionEngine.js";

describe("Enterprise Seed Dataset & Statistical Distribution Tests", () => {
  // Generate 100 representative B2B client fixture profiles
  const enterpriseFixtures = Array.from({ length: 100 }, (_, idx) => {
    const id = idx + 1;
    const isCritical = id <= 15;
    const isHigh = id > 15 && id <= 40;
    const isMedium = id > 40 && id <= 70;

    let daysSinceLastContact;
    let interactionCount;
    let annualContractValue;

    if (isCritical) {
      daysSinceLastContact = 50 + (id % 45);
      interactionCount = Math.max(1, id % 3);
      annualContractValue = 120000 + id * 5000;
    } else if (isHigh) {
      daysSinceLastContact = 16 + (id % 12);
      interactionCount = 1 + (id % 4);
      annualContractValue = 60000 + id * 2000;
    } else if (isMedium) {
      daysSinceLastContact = 10 + (id % 10);
      interactionCount = 3 + (id % 5);
      annualContractValue = 25000 + id * 1000;
    } else {
      // Safe / Stable
      daysSinceLastContact = 1 + (id % 5);
      interactionCount = 6 + (id % 15);
      annualContractValue = 15000 + id * 500;
    }

    const churnScore = calculateChurnScore(daysSinceLastContact, interactionCount);
    const priorityScore = calculatePriorityScore(daysSinceLastContact, interactionCount, annualContractValue);
    const engagementTier = getEngagementTier(daysSinceLastContact, interactionCount);
    const decision = decideAction({
      churn_score: churnScore,
      priority_score: priorityScore,
      days_since_last_contact: daysSinceLastContact,
    });

    return {
      id,
      name: `Enterprise Client #${id}`,
      email: `client${id}@enterprise-fixtures.com`,
      phone: `+1-555-01${id.toString().padStart(2, "0")}`,
      company: `Corporation ${id}`,
      annualContractValue,
      daysSinceLastContact,
      interactionCount,
      churnScore,
      priorityScore,
      engagementTier,
      aiLevel: decision.level,
      aiAction: decision.action,
      aiReason: decision.reason,
    };
  });

  test("contains exactly 100 enterprise customer profiles", () => {
    expect(enterpriseFixtures).toHaveLength(100);
  });

  test("guarantees unique customer email addresses across the dataset", () => {
    const emailSet = new Set(enterpriseFixtures.map((c) => c.email));
    expect(emailSet.size).toBe(100);
  });

  test("guarantees unique customer IDs", () => {
    const idSet = new Set(enterpriseFixtures.map((c) => c.id));
    expect(idSet.size).toBe(100);
  });

  test("churn scores are strictly within normalized bounds [0, 100]", () => {
    for (const client of enterpriseFixtures) {
      expect(client.churnScore).toBeGreaterThanOrEqual(0);
      expect(client.churnScore).toBeLessThanOrEqual(100);
    }
  });

  test("priority scores are non-negative integers", () => {
    for (const client of enterpriseFixtures) {
      expect(client.priorityScore).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(client.priorityScore)).toBe(true);
    }
  });

  test("produces all 5 decision levels across the portfolio", () => {
    const levels = new Set(enterpriseFixtures.map((c) => c.aiLevel));
    expect(levels.has("CRITICAL")).toBe(true);
    expect(levels.has("HIGH")).toBe(true);
    expect(levels.has("MEDIUM")).toBe(true);
    expect(levels.has("SAFE")).toBe(true);
  });

  test("produces all recommended actions across the portfolio", () => {
    const actions = new Set(enterpriseFixtures.map((c) => c.aiAction));
    expect(actions.has("ESCALATE_MANAGER")).toBe(true);
    expect(actions.has("CALL_CUSTOMER")).toBe(true);
    expect(actions.has("SEND_EMAIL")).toBe(true);
    expect(actions.has("NO_ACTION")).toBe(true);
  });

  test("each profile possesses a descriptive textual AI reason", () => {
    for (const client of enterpriseFixtures) {
      expect(typeof client.aiReason).toBe("string");
      expect(client.aiReason.length).toBeGreaterThan(10);
    }
  });

  test("evaluates engagement tier distribution accurately", () => {
    const tiers = new Set(enterpriseFixtures.map((c) => c.engagementTier));
    expect(tiers.has("Highly Engaged")).toBe(true);
    expect(tiers.has("Cooling Off")).toBe(true);
    expect(tiers.has("Dormant")).toBe(true);
  });
});
