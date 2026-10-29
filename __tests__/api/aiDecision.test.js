import pool from "../../lib/db.js";
import { generateToken } from "../../lib/auth.js";
import decisionHandler from "../../pages/api/ai/decision.js";
import { createMockRequest, createMockResponse } from "../fixtures/mockData.js";

describe("AI Decision API Endpoint (/api/ai/decision)", () => {
  let validToken;
  let querySpy;

  beforeAll(() => {
    validToken = generateToken({ id: 9, email: "ai-auditor@minicrm.io", role: "admin" });
  });

  beforeEach(() => {
    querySpy = jest.spyOn(pool, "query");
  });

  afterEach(() => {
    querySpy.mockRestore();
  });

  test("rejects unauthenticated requests with 500 / auth failure", async () => {
    const req = createMockRequest({ method: "GET" });
    const res = createMockResponse();

    await decisionHandler(req, res);
    expect(res.statusCode).toBe(500);
    expect(res.data.error).toBeDefined();
  });

  test("enriches database rows with AI decision engine levels, actions, and reasons", async () => {
    const rawSqlRows = [
      {
        id: 101,
        name: "High Churn Account",
        last_contact: "2026-08-01",
        interaction_count: 1,
        days_since_last_contact: 85,
        churn_score: "78",
        priority_score: "26",
      },
      {
        id: 102,
        name: "Moderate Churn Account",
        last_contact: "2026-09-20",
        interaction_count: 3,
        days_since_last_contact: 39,
        churn_score: "52",
        priority_score: "18",
      },
      {
        id: 103,
        name: "Safe Account",
        last_contact: "2026-10-25",
        interaction_count: 10,
        days_since_last_contact: 4,
        churn_score: "10",
        priority_score: "12",
      },
    ];
    querySpy.mockResolvedValueOnce({ rows: rawSqlRows });

    const req = createMockRequest({ method: "GET", token: validToken });
    const res = createMockResponse();

    await decisionHandler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.data).toHaveLength(3);

    // Verify first row (Critical Tier)
    const first = res.data[0];
    expect(first.id).toBe(101);
    expect(first.churn_score).toBe(78);
    expect(first.priority_score).toBe(26);
    expect(first.ai_level).toBe("CRITICAL");
    expect(first.ai_action).toBe("ESCALATE_MANAGER");
    expect(first.ai_reason).toBeDefined();

    // Verify second row (Medium Tier)
    const second = res.data[1];
    expect(second.id).toBe(102);
    expect(second.ai_level).toBe("MEDIUM");
    expect(second.ai_action).toBe("SEND_EMAIL");

    // Verify third row (Safe Tier)
    const third = res.data[2];
    expect(third.id).toBe(103);
    expect(third.ai_level).toBe("SAFE");
    expect(third.ai_action).toBe("NO_ACTION");
  });

  test("handles empty customer table without crashing", async () => {
    querySpy.mockResolvedValueOnce({ rows: [] });

    const req = createMockRequest({ method: "GET", token: validToken });
    const res = createMockResponse();

    await decisionHandler(req, res);
    expect(res.statusCode).toBe(200);
    expect(res.data).toEqual([]);
  });

  test("handles database query failure with 500 error response", async () => {
    querySpy.mockRejectedValueOnce(new Error("Database pool timeout"));

    const req = createMockRequest({ method: "GET", token: validToken });
    const res = createMockResponse();

    await decisionHandler(req, res);
    expect(res.statusCode).toBe(500);
    expect(res.data.error).toBe("Database pool timeout");
  });
});
