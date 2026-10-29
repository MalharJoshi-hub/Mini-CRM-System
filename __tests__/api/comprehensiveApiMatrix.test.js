/**
 * Comprehensive API Route Matrix & Contract Conformance Test Suite
 * Validates HTTP semantics, response formats, status codes, and error shielding
 * across all customer, interaction, auth, and follow-up endpoints.
 */

import pool from "../../lib/db.js";
import { generateToken } from "../../lib/auth.js";
import customerListHandler from "../../pages/api/customers/list.js";
import customerAddHandler from "../../pages/api/customers/add.js";
import customerUpdateHandler from "../../pages/api/customers/update.js";
import customerDeleteHandler from "../../pages/api/customers/delete.js";
import customerOverdueHandler from "../../pages/api/customers/overdue.js";
import interactionAddHandler from "../../pages/api/interactions/add.js";
import interactionListHandler from "../../pages/api/interactions/list.js";
import interactionCustomerHandler from "../../pages/api/interactions/customer.js";
import followupActionHandler from "../../pages/api/followups/action.js";
import followupChurnHandler from "../../pages/api/followups/churn.js";
import followupPriorityHandler from "../../pages/api/followups/priority.js";
import automationPendingHandler from "../../pages/api/automation/pending-followups.js";
import { createMockRequest, createMockResponse } from "../fixtures/mockData.js";

describe("Comprehensive API Contract & HTTP Semantics Matrix", () => {
  let adminToken;
  let querySpy;

  beforeAll(() => {
    adminToken = generateToken({ id: 1, email: "superadmin@minicrm.io", role: "admin" });
  });

  beforeEach(() => {
    querySpy = jest.spyOn(pool, "query");
  });

  afterEach(() => {
    querySpy.mockRestore();
  });

  describe("HTTP Method Not Allowed (405) Matrix", () => {
    const endpointsWithAllowedMethods = [
      { name: "GET /api/customers/list", handler: customerListHandler, invalidMethods: ["POST", "PUT", "DELETE", "PATCH"] },
      { name: "POST /api/customers/add", handler: customerAddHandler, invalidMethods: ["GET", "PUT", "DELETE", "PATCH"] },
      { name: "PUT /api/customers/update", handler: customerUpdateHandler, invalidMethods: ["GET", "POST", "DELETE", "PATCH"] },
      { name: "DELETE /api/customers/delete", handler: customerDeleteHandler, invalidMethods: ["GET", "POST", "PUT", "PATCH"] },
      { name: "GET /api/interactions/list", handler: interactionListHandler, invalidMethods: ["POST", "PUT", "DELETE"] },
      { name: "POST /api/interactions/add", handler: interactionAddHandler, invalidMethods: ["GET", "PUT", "DELETE"] },
      { name: "POST /api/followups/action", handler: followupActionHandler, invalidMethods: ["GET", "PUT", "DELETE"] },
      { name: "GET /api/automation/pending-followups", handler: automationPendingHandler, invalidMethods: ["POST", "PUT", "DELETE"] },
    ];

    test.each(endpointsWithAllowedMethods)(
      "$name rejects invalid HTTP verbs with 405",
      async ({ handler, invalidMethods }) => {
        for (const method of invalidMethods) {
          const req = createMockRequest({ method, token: adminToken });
          const res = createMockResponse();

          await handler(req, res);
          expect(res.statusCode).toBe(405);
        }
      }
    );
  });

  describe("Protected Endpoint Authorization Shield Matrix", () => {
    const protectedHandlers = [
      { name: "customerListHandler", handler: customerListHandler, method: "GET" },
      { name: "customerAddHandler", handler: customerAddHandler, method: "POST" },
      { name: "customerUpdateHandler", handler: customerUpdateHandler, method: "PUT" },
      { name: "customerDeleteHandler", handler: customerDeleteHandler, method: "DELETE" },
      { name: "customerOverdueHandler", handler: customerOverdueHandler, method: "GET" },
      { name: "interactionListHandler", handler: interactionListHandler, method: "GET" },
      { name: "interactionAddHandler", handler: interactionAddHandler, method: "POST" },
      { name: "interactionCustomerHandler", handler: interactionCustomerHandler, method: "GET" },
      { name: "automationPendingHandler", handler: automationPendingHandler, method: "GET" },
    ];

    test.each(protectedHandlers)(
      "$name rejects missing authorization header with 401",
      async ({ handler, method }) => {
        const req = createMockRequest({ method }); // No token
        const res = createMockResponse();

        await handler(req, res);
        expect(res.statusCode).toBe(401);
      }
    );

    test.each(protectedHandlers)(
      "$name rejects invalid or corrupted Bearer tokens with 401",
      async ({ handler, method }) => {
        const req = createMockRequest({ method, token: "corrupted.token.signature" });
        const res = createMockResponse();

        await handler(req, res);
        expect(res.statusCode).toBe(401);
      }
    );
  });

  describe("Response Content-Type & JSON Payload Structure Integrity", () => {
    test("customerListHandler returns JSON array on successful query", async () => {
      querySpy.mockResolvedValueOnce({ rows: [{ id: 1, name: "Customer Alpha" }] });

      const req = createMockRequest({ method: "GET", token: adminToken });
      const res = createMockResponse();

      await customerListHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data[0].id).toBe(1);
    });

    test("followupChurnHandler returns enriched array with ai_level, ai_action, ai_reason", async () => {
      querySpy.mockResolvedValueOnce({
        rows: [
          {
            id: 2,
            name: "Beta Logistics",
            churn_score: "65",
            priority_score: "18",
            days_since_last_contact: "16",
          },
        ],
      });

      const req = createMockRequest({ method: "GET", token: adminToken });
      const res = createMockResponse();

      await followupChurnHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);

      const item = res.data[0];
      expect(item).toHaveProperty("churn_score");
      expect(item).toHaveProperty("priority_score");
      expect(item).toHaveProperty("ai_level");
      expect(item).toHaveProperty("ai_action");
      expect(item).toHaveProperty("ai_reason");
      expect(typeof item.churn_score).toBe("number");
      expect(typeof item.priority_score).toBe("number");
    });

    test("followupPriorityHandler returns priority queue sorted items", async () => {
      querySpy.mockResolvedValueOnce({
        rows: [
          { id: 10, name: "Urgent Lead", priority_score: 28, action: "URGENT_CALL" },
          { id: 11, name: "Call Lead", priority_score: 19, action: "CALL" },
        ],
      });

      const req = createMockRequest({ method: "GET", token: adminToken });
      const res = createMockResponse();

      await followupPriorityHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data).toHaveLength(2);
      expect(res.data[0].action).toBe("URGENT_CALL");
      expect(res.data[1].action).toBe("CALL");
    });
  });

  describe("API Error Shielding: Database Exception Containment", () => {
    test("customerUpdateHandler gracefully returns 401/error without crashing on DB error", async () => {
      querySpy.mockRejectedValueOnce(new Error("Deadlock detected"));

      const req = createMockRequest({
        method: "PUT",
        token: adminToken,
        body: { id: 1, name: "Deadlock Name", email: "deadlock@test.com", phone: "+1555" },
      });
      const res = createMockResponse();

      await customerUpdateHandler(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.data.error).toBe("Deadlock detected");
    });

    test("customerDeleteHandler gracefully returns 401/error on DB failure", async () => {
      querySpy.mockRejectedValueOnce(new Error("Foreign key cascade lock timeout"));

      const req = createMockRequest({
        method: "DELETE",
        token: adminToken,
        body: { id: 1 },
      });
      const res = createMockResponse();

      await customerDeleteHandler(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.data.error).toBe("Foreign key cascade lock timeout");
    });

    test("interactionAddHandler returns 401/error on DB failure", async () => {
      querySpy.mockRejectedValueOnce(new Error("Disk quota exceeded"));

      const req = createMockRequest({
        method: "POST",
        token: adminToken,
        body: { customer_id: 1, interaction_date: "2026-10-29", notes: "Note" },
      });
      const res = createMockResponse();

      await interactionAddHandler(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.data.error).toBe("Disk quota exceeded");
    });
  });
});
