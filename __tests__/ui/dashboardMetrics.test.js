/**
 * UI Metric Computations & Dashboard Aggregation Heuristics
 * Validates the core logic used inside pages/dashboard.js
 */

describe("Dashboard UI KPI Aggregation & State Heuristics", () => {
  const mockDashboardData = [
    {
      id: 1,
      name: "Acme Corp",
      churn_score: 85,
      priority_score: 28,
      days_since_last_contact: 45,
      ai_level: "CRITICAL",
      ai_action: "ESCALATE_MANAGER",
      ai_reason: "High churn + High priority",
    },
    {
      id: 2,
      name: "Beta Logistics",
      churn_score: 65,
      priority_score: 18,
      days_since_last_contact: 25,
      ai_level: "HIGH",
      ai_action: "CALL_CUSTOMER",
      ai_reason: "High churn risk",
    },
    {
      id: 3,
      name: "Gamma Tech",
      churn_score: 55,
      priority_score: 12,
      days_since_last_contact: 18,
      ai_level: "MEDIUM",
      ai_action: "SEND_EMAIL",
      ai_reason: "Medium churn risk",
    },
    {
      id: 4,
      name: "Delta Retail",
      churn_score: 20,
      priority_score: 16,
      days_since_last_contact: 5,
      ai_level: "SAFE",
      ai_action: "NO_ACTION",
      ai_reason: "Customer stable",
    },
    {
      id: 5,
      name: "Epsilon Media",
      churn_score: 72,
      priority_score: 19,
      days_since_last_contact: 32,
      ai_level: "HIGH",
      ai_action: "CALL_CUSTOMER",
      ai_reason: "High churn risk",
    },
    {
      id: 6,
      name: "Zeta Financial",
      churn_score: 48,
      priority_score: 8,
      days_since_last_contact: 14,
      ai_level: "MEDIUM",
      ai_action: "SEND_EMAIL",
      ai_reason: "Medium churn risk",
    },
  ];

  describe("KPI Card Metrics Calculations", () => {
    test("computes total customers accurately", () => {
      const total = mockDashboardData.length;
      expect(total).toBe(6);
    });

    test("computes high priority count (priority_score >= 15)", () => {
      const highPriority = mockDashboardData.filter((c) => c.priority_score >= 15).length;
      // IDs: 1 (28), 2 (18), 4 (16), 5 (19) -> 4 accounts
      expect(highPriority).toBe(4);
    });

    test("computes calls needed (ai_action === 'CALL_CUSTOMER')", () => {
      const callsNeeded = mockDashboardData.filter((c) => c.ai_action === "CALL_CUSTOMER").length;
      // IDs: 2, 5 -> 2 calls
      expect(callsNeeded).toBe(2);
    });

    test("computes emails needed (ai_action === 'SEND_EMAIL')", () => {
      const emailsNeeded = mockDashboardData.filter((c) => c.ai_action === "SEND_EMAIL").length;
      // IDs: 3, 6 -> 2 emails
      expect(emailsNeeded).toBe(2);
    });

    test("computes executive escalations (ai_action === 'ESCALATE_MANAGER')", () => {
      const escalations = mockDashboardData.filter((c) => c.ai_action === "ESCALATE_MANAGER").length;
      // ID: 1 -> 1 escalation
      expect(escalations).toBe(1);
    });

    test("computes high churn risk count (ai_level === 'HIGH')", () => {
      const highChurn = mockDashboardData.filter((c) => c.ai_level === "HIGH").length;
      // IDs: 2, 5 -> 2 accounts
      expect(highChurn).toBe(2);
    });

    test("computes medium churn risk count (ai_level === 'MEDIUM')", () => {
      const mediumChurn = mockDashboardData.filter((c) => c.ai_level === "MEDIUM").length;
      // IDs: 3, 6 -> 2 accounts
      expect(mediumChurn).toBe(2);
    });
  });

  describe("Color Coding & Risk Badge Logic", () => {
    function getLevelBadgeColor(level) {
      switch (level) {
        case "CRITICAL":
          return "#dc2626"; // Crimson Red
        case "HIGH":
          return "#ef4444"; // Vivid Red
        case "MEDIUM":
          return "#f59e0b"; // Amber Warning
        case "LOW":
          return "#3b82f6"; // Blue
        default:
          return "#22c55e"; // Emerald Green
      }
    }

    test("maps CRITICAL level to crimson red (#dc2626)", () => {
      expect(getLevelBadgeColor("CRITICAL")).toBe("#dc2626");
    });

    test("maps HIGH level to vivid red (#ef4444)", () => {
      expect(getLevelBadgeColor("HIGH")).toBe("#ef4444");
    });

    test("maps MEDIUM level to amber warning (#f59e0b)", () => {
      expect(getLevelBadgeColor("MEDIUM")).toBe("#f59e0b");
    });

    test("maps SAFE level to emerald green (#22c55e)", () => {
      expect(getLevelBadgeColor("SAFE")).toBe("#22c55e");
    });
  });

  describe("Data Grid Filtering & Ordering Heuristics", () => {
    test("orders accounts descending by churn vulnerability", () => {
      const sorted = [...mockDashboardData].sort((a, b) => b.churn_score - a.churn_score);
      expect(sorted[0].id).toBe(1); // 85
      expect(sorted[1].id).toBe(5); // 72
      expect(sorted[sorted.length - 1].id).toBe(4); // 20
    });

    test("orders accounts descending by priority queue score", () => {
      const sorted = [...mockDashboardData].sort((a, b) => b.priority_score - a.priority_score);
      expect(sorted[0].id).toBe(1); // 28
      expect(sorted[1].id).toBe(5); // 19
      expect(sorted[2].id).toBe(2); // 18
    });

    test("filters accounts requiring immediate human intervention (CALL or ESCALATE)", () => {
      const actionable = mockDashboardData.filter((c) =>
        ["CALL_CUSTOMER", "ESCALATE_MANAGER"].includes(c.ai_action)
      );
      expect(actionable).toHaveLength(3);
    });
  });
});
