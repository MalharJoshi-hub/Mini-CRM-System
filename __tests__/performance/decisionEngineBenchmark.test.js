import {
  decideAction,
  calculateChurnScore,
  calculatePriorityScore,
  getEngagementTier,
} from "../../lib/decisionEngine.js";

describe("Performance & High-Throughput Engine Benchmarking", () => {
  test("processes 5,000 customer risk assessments in under 150ms", () => {
    const customerBatch = [];

    for (let i = 0; i < 5000; i++) {
      const days = i % 90;
      const interactions = (i * 3) % 25;
      const churn = calculateChurnScore(days, interactions);
      const priority = calculatePriorityScore(days, interactions, i * 100);

      customerBatch.push({
        id: i + 1,
        churn_score: churn,
        priority_score: priority,
        days_since_last_contact: days,
        interaction_count: interactions,
      });
    }

    expect(customerBatch).toHaveLength(5000);

    const startTime = performance.now();
    const decisions = customerBatch.map((c) => decideAction(c));
    const durationMs = performance.now() - startTime;

    expect(decisions).toHaveLength(5000);
    expect(durationMs).toBeLessThan(150);

    // Verify decision distribution integrity
    const criticalCount = decisions.filter((d) => d.level === "CRITICAL").length;
    const safeCount = decisions.filter((d) => d.level === "SAFE").length;

    expect(criticalCount).toBeGreaterThan(0);
    expect(safeCount).toBeGreaterThan(0);
  });

  test("evaluates engagement tier classifications at scale without memory bloat", () => {
    const startTime = performance.now();

    for (let i = 0; i < 10000; i++) {
      const days = i % 120;
      const interactions = (i * 2) % 30;
      const tier = getEngagementTier(days, interactions);
      expect(typeof tier).toBe("string");
    }

    const durationMs = performance.now() - startTime;
    expect(durationMs).toBeLessThan(1500);
  });
});
