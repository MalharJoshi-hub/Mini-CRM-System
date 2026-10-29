import pool from "../../lib/db.js";
import { generateToken } from "../../lib/auth.js";
import actionHandler from "../../pages/api/followups/action.js";
import churnHandler from "../../pages/api/followups/churn.js";
import priorityHandler from "../../pages/api/followups/priority.js";
import { createMockRequest, createMockResponse } from "../fixtures/mockData.js";

describe("Follow-ups & Interventions API Endpoints (/api/followups/*)", () => {
  let validToken;
  let querySpy;

  beforeAll(() => {
    validToken = generateToken({ id: 3, email: "manager@minicrm.io", role: "manager" });
  });

  beforeEach(() => {
    querySpy = jest.spyOn(pool, "query");
  });

  afterEach(() => {
    querySpy.mockRestore();
  });

  describe("POST /api/followups/action", () => {
    test("rejects non-POST requests with 405 Method Not Allowed", async () => {
      const req = createMockRequest({ method: "GET", token: validToken });
      const res = createMockResponse();

      await actionHandler(req, res);
      expect(res.statusCode).toBe(405);
      expect(res.data.error).toBe("Method not allowed");
    });

    test("returns 400 Bad Request when customer_id or action is missing", async () => {
      const req = createMockRequest({
        method: "POST",
        token: validToken,
        body: { customer_id: null },
      });
      const res = createMockResponse();

      await actionHandler(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.data.error).toBe("Missing data");
    });

    test("logs call action note when action === 'CALL_CUSTOMER'", async () => {
      querySpy.mockResolvedValueOnce({ rowCount: 1 });

      const req = createMockRequest({
        method: "POST",
        token: validToken,
        body: { customer_id: 12, action: "CALL_CUSTOMER" },
      });
      const res = createMockResponse();

      await actionHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data.message).toBe("Action logged successfully");
      expect(querySpy).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO interactions"),
        [12, "AI Follow-up Call Done"]
      );
    });

    test("logs email action note when action === 'EMAIL_CUSTOMER'", async () => {
      querySpy.mockResolvedValueOnce({ rowCount: 1 });

      const req = createMockRequest({
        method: "POST",
        token: validToken,
        body: { customer_id: 14, action: "EMAIL_CUSTOMER" },
      });
      const res = createMockResponse();

      await actionHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(querySpy).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO interactions"),
        [14, "AI Follow-up Email Sent"]
      );
    });

    test("logs ignored note for other actions", async () => {
      querySpy.mockResolvedValueOnce({ rowCount: 1 });

      const req = createMockRequest({
        method: "POST",
        token: validToken,
        body: { customer_id: 15, action: "IGNORE" },
      });
      const res = createMockResponse();

      await actionHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(querySpy).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO interactions"),
        [15, "AI Follow-up Ignored"]
      );
    });

    test("handles database query rejection with 500", async () => {
      querySpy.mockRejectedValueOnce(new Error("Connection reset"));

      const req = createMockRequest({
        method: "POST",
        token: validToken,
        body: { customer_id: 1, action: "CALL_CUSTOMER" },
      });
      const res = createMockResponse();

      await actionHandler(req, res);
      expect(res.statusCode).toBe(500);
      expect(res.data.error).toBe("Connection reset");
    });
  });

  describe("GET /api/followups/churn", () => {
    test("returns enriched customers sorted by churn risk", async () => {
      const dbRows = [
        {
          id: 5,
          name: "At-Risk Account",
          last_contact: "2026-08-01",
          interaction_count: "1",
          days_since_last_contact: "89",
          priority_score: "91",
          churn_score: "85",
        },
        {
          id: 6,
          name: "Medium Risk Account",
          last_contact: "2026-09-15",
          interaction_count: "3",
          days_since_last_contact: "44",
          priority_score: "50",
          churn_score: "45",
        },
      ];
      querySpy.mockResolvedValueOnce({ rows: dbRows });

      const req = createMockRequest({ method: "GET", token: validToken });
      const res = createMockResponse();

      await churnHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data).toHaveLength(2);
      expect(res.data[0].ai_level).toBe("CRITICAL");
      expect(res.data[0].ai_action).toBe("ESCALATE_MANAGER");
      expect(res.data[1].ai_level).toBe("MEDIUM");
      expect(res.data[1].ai_action).toBe("SEND_EMAIL");
    });

    test("handles unauthenticated churn query with 500/auth error", async () => {
      const req = createMockRequest({ method: "GET" });
      const res = createMockResponse();

      await churnHandler(req, res);
      expect(res.statusCode).toBe(500);
      expect(res.data.error).toBeDefined();
    });
  });

  describe("GET /api/followups/priority", () => {
    test("returns priority queue rows from database", async () => {
      const priorityRows = [
        {
          id: 1,
          name: "Priority One",
          interaction_count: 5,
          days_since_last_contact: 20,
          priority_score: 30,
          action: "URGENT_CALL",
        },
        {
          id: 2,
          name: "Priority Two",
          interaction_count: 3,
          days_since_last_contact: 15,
          priority_score: 21,
          action: "CALL",
        },
      ];
      querySpy.mockResolvedValueOnce({ rows: priorityRows });

      const req = createMockRequest({ method: "GET", token: validToken });
      const res = createMockResponse();

      await priorityHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data).toHaveLength(2);
      expect(res.data[0].action).toBe("URGENT_CALL");
    });
  });
});
