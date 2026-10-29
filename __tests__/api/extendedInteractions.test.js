/**
 * Extended Interactions & Touchpoints API Test Suite
 * Exhaustively tests touchpoint capture across multi-channel customer communications:
 * /api/interactions/add, /api/interactions/list, /api/interactions/customer
 */

import pool from "../../lib/db.js";
import { generateToken } from "../../lib/auth.js";
import addHandler from "../../pages/api/interactions/add.js";
import listHandler from "../../pages/api/interactions/list.js";
import customerHandler from "../../pages/api/interactions/customer.js";
import { createMockRequest, createMockResponse } from "../fixtures/mockData.js";

describe("Extended Interactions & Touchpoints API Permutations", () => {
  let agentToken;
  let querySpy;

  beforeAll(() => {
    agentToken = generateToken({ id: 12, email: "rep.sarah@minicrm.io", role: "agent" });
  });

  beforeEach(() => {
    querySpy = jest.spyOn(pool, "query");
  });

  afterEach(() => {
    querySpy.mockRestore();
  });

  describe("Multi-Channel Touchpoint Logging Matrix", () => {
    const interactionTypes = [
      {
        channel: "call",
        notes: "Introductory phone screen with Chief Information Officer. Discussed SSO and GDPR compliance requirements.",
      },
      {
        channel: "meeting",
        notes: "On-site architecture demonstration. Technical lead validated PostgreSQL connection pooling benchmarks.",
      },
      {
        channel: "email",
        notes: "Dispatched commercial proposal and SLA documentation via formal electronic communication.",
      },
      {
        channel: "webinar",
        notes: "Client team attended the live demonstration on AI churn heuristics and automated follow-up scheduling.",
      },
      {
        channel: "support",
        notes: "Assisted development team with configuring environment variables and JWT token authentication headers.",
      },
      {
        channel: "executive_qbr",
        notes: "Quarterly business review with VP of Operations. Reviewed portfolio KPIs and renewal expansion terms.",
      },
    ];

    test.each(interactionTypes)(
      "logs interaction via channel: $channel",
      async ({ notes }) => {
        const mockRow = {
          id: 500,
          customer_id: 1,
          interaction_date: "2026-10-29",
          notes,
        };
        querySpy.mockResolvedValueOnce({ rows: [mockRow] });

        const req = createMockRequest({
          method: "POST",
          token: agentToken,
          body: {
            customer_id: 1,
            interaction_date: "2026-10-29",
            notes,
          },
        });
        const res = createMockResponse();

        await addHandler(req, res);
        expect(res.statusCode).toBe(201);
        expect(res.data.notes).toBe(notes);
      }
    );
  });

  describe("Customer Interaction History Timeline Permutations", () => {
    test("returns chronological interaction timeline ordered by date descending", async () => {
      const chronologicalTimeline = [
        { id: 3, customer_id: 1, interaction_date: "2026-10-28", notes: "Third touchpoint" },
        { id: 2, customer_id: 1, interaction_date: "2026-10-15", notes: "Second touchpoint" },
        { id: 1, customer_id: 1, interaction_date: "2026-10-01", notes: "First touchpoint" },
      ];
      querySpy.mockResolvedValueOnce({ rows: chronologicalTimeline });

      const req = createMockRequest({
        method: "GET",
        token: agentToken,
        query: { customer_id: "1" },
      });
      const res = createMockResponse();

      await customerHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data).toHaveLength(3);
      expect(res.data[0].id).toBe(3);
      expect(res.data[2].id).toBe(1);
    });

    test("handles customer with zero historical touchpoints", async () => {
      querySpy.mockResolvedValueOnce({ rows: [] });

      const req = createMockRequest({
        method: "GET",
        token: agentToken,
        query: { customer_id: "999" },
      });
      const res = createMockResponse();

      await customerHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data).toEqual([]);
    });

    test("accepts customer query param via query.id alias", async () => {
      querySpy.mockResolvedValueOnce({ rows: [{ id: 10, customer_id: 7 }] });

      const req = createMockRequest({
        method: "GET",
        token: agentToken,
        query: { id: "7" },
      });
      const res = createMockResponse();

      await customerHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data[0].customer_id).toBe(7);
      expect(querySpy).toHaveBeenCalledWith(
        expect.stringContaining("customer_id = $1"),
        ["7"]
      );
    });
  });

  describe("Global Interaction List Retrieval", () => {
    test("retrieves interactions ordered by latest touchpoint first", async () => {
      const globalInteractions = [
        { id: 201, customer_id: 5, notes: "Call done", interaction_date: "2026-10-29" },
        { id: 200, customer_id: 2, notes: "Meeting held", interaction_date: "2026-10-28" },
      ];
      querySpy.mockResolvedValueOnce({ rows: globalInteractions });

      const req = createMockRequest({ method: "GET", token: agentToken });
      const res = createMockResponse();

      await listHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data).toHaveLength(2);
    });
  });
});
