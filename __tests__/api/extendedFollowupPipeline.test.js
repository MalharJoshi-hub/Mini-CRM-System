/**
 * Extended Follow-ups & Interventions API Pipeline Test Suite
 * Exhaustively validates action routing, priority sorting, churn risk calculations,
 * and database query assertions for /api/followups/* endpoints.
 */

import pool from "../../lib/db.js";
import { generateToken } from "../../lib/auth.js";
import actionHandler from "../../pages/api/followups/action.js";
import churnHandler from "../../pages/api/followups/churn.js";
import priorityHandler from "../../pages/api/followups/priority.js";
import { createMockRequest, createMockResponse } from "../fixtures/mockData.js";

describe("Extended Follow-up Action & Churn Endpoints Matrix", () => {
  let agentToken;
  let querySpy;

  beforeAll(() => {
    agentToken = generateToken({ id: 88, email: "agent.dave@minicrm.io", role: "agent" });
  });

  beforeEach(() => {
    querySpy = jest.spyOn(pool, "query");
  });

  afterEach(() => {
    querySpy.mockRestore();
  });

  describe("Follow-up Action Note Dispatching Permutations", () => {
    test("logs call action note with exact text 'AI Follow-up Call Done'", async () => {
      querySpy.mockResolvedValueOnce({ rowCount: 1 });

      const req = createMockRequest({
        method: "POST",
        token: agentToken,
        body: { customer_id: 10, action: "CALL_CUSTOMER" },
      });
      const res = createMockResponse();

      await actionHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data.message).toBe("Action logged successfully");
      expect(querySpy).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO interactions"),
        [10, "AI Follow-up Call Done"]
      );
    });

    test("logs email action note with exact text 'AI Follow-up Email Sent'", async () => {
      querySpy.mockResolvedValueOnce({ rowCount: 1 });

      const req = createMockRequest({
        method: "POST",
        token: agentToken,
        body: { customer_id: 20, action: "EMAIL_CUSTOMER" },
      });
      const res = createMockResponse();

      await actionHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(querySpy).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO interactions"),
        [20, "AI Follow-up Email Sent"]
      );
    });

    test("logs ignored action note with exact text 'AI Follow-up Ignored'", async () => {
      querySpy.mockResolvedValueOnce({ rowCount: 1 });

      const req = createMockRequest({
        method: "POST",
        token: agentToken,
        body: { customer_id: 30, action: "DISMISS" },
      });
      const res = createMockResponse();

      await actionHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(querySpy).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO interactions"),
        [30, "AI Follow-up Ignored"]
      );
    });
  });

  describe("Churn Endpoint Ranking & Decision Enrichment", () => {
    test("processes 10 distinct customer rows and returns correctly enriched records", async () => {
      const mockRawRows = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        name: `Customer #${i + 1}`,
        last_contact: "2026-10-01",
        interaction_count: (i % 3) + 1,
        days_since_last_contact: 20 + i,
        priority_score: 20 + i * 2,
        churn_score: 50 + i * 4,
      }));

      querySpy.mockResolvedValueOnce({ rows: mockRawRows });

      const req = createMockRequest({ method: "GET", token: agentToken });
      const res = createMockResponse();

      await churnHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data).toHaveLength(10);

      // Verify that every single row was properly enriched with decision engine fields
      for (const item of res.data) {
        expect(item).toHaveProperty("ai_level");
        expect(item).toHaveProperty("ai_action");
        expect(item).toHaveProperty("ai_reason");
        expect(typeof item.churn_score).toBe("number");
        expect(typeof item.priority_score).toBe("number");
      }
    });
  });

  describe("Priority Queue Endpoint Sorting & Tagging", () => {
    test("verifies priority action tags from database SQL query", async () => {
      const prioritySample = [
        { id: 1, name: "Lead 1", priority_score: 28, action: "URGENT_CALL" },
        { id: 2, name: "Lead 2", priority_score: 20, action: "CALL" },
        { id: 3, name: "Lead 3", priority_score: 14, action: "EMAIL_OFFER" },
        { id: 4, name: "Lead 4", priority_score: 8, action: "EMAIL_REMINDER" },
        { id: 5, name: "Lead 5", priority_score: 2, action: "SAFE" },
      ];
      querySpy.mockResolvedValueOnce({ rows: prioritySample });

      const req = createMockRequest({ method: "GET", token: agentToken });
      const res = createMockResponse();

      await priorityHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data).toHaveLength(5);
      expect(res.data[0].action).toBe("URGENT_CALL");
      expect(res.data[1].action).toBe("CALL");
      expect(res.data[2].action).toBe("EMAIL_OFFER");
      expect(res.data[3].action).toBe("EMAIL_REMINDER");
      expect(res.data[4].action).toBe("SAFE");
    });
  });
});
