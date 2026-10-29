import pool from "../../lib/db.js";
import { generateToken } from "../../lib/auth.js";
import addHandler from "../../pages/api/interactions/add.js";
import listHandler from "../../pages/api/interactions/list.js";
import customerHandler from "../../pages/api/interactions/customer.js";
import { createMockRequest, createMockResponse, sampleInteractions } from "../fixtures/mockData.js";

describe("Interactions API Endpoints (/api/interactions/*)", () => {
  let validToken;
  let querySpy;

  beforeAll(() => {
    validToken = generateToken({ id: 2, email: "rep@minicrm.io", role: "agent" });
  });

  beforeEach(() => {
    querySpy = jest.spyOn(pool, "query");
  });

  afterEach(() => {
    querySpy.mockRestore();
  });

  describe("POST /api/interactions/add", () => {
    test("rejects non-POST methods with 405 Method Not Allowed", async () => {
      const req = createMockRequest({ method: "GET" });
      const res = createMockResponse();

      await addHandler(req, res);
      expect(res.statusCode).toBe(405);
      expect(res.data.message).toBe("Method not allowed");
    });

    test("rejects unauthenticated requests with 401", async () => {
      const req = createMockRequest({
        method: "POST",
        body: { customer_id: 1, notes: "Logged call" },
      });
      const res = createMockResponse();

      await addHandler(req, res);
      expect(res.statusCode).toBe(401);
    });

    test("successfully inserts interaction touchpoint and returns 201 Created", async () => {
      const inserted = {
        id: 50,
        customer_id: 1,
        interaction_date: "2026-10-29",
        notes: "Introductory discovery discussion.",
      };
      querySpy.mockResolvedValueOnce({ rows: [inserted] });

      const req = createMockRequest({
        method: "POST",
        token: validToken,
        body: {
          customer_id: 1,
          interaction_date: "2026-10-29",
          notes: "Introductory discovery discussion.",
        },
      });
      const res = createMockResponse();

      await addHandler(req, res);
      expect(res.statusCode).toBe(201);
      expect(res.data.id).toBe(50);
      expect(res.data.notes).toBe("Introductory discovery discussion.");
      expect(querySpy).toHaveBeenCalledWith(
        "INSERT INTO interactions (customer_id, interaction_date, notes) VALUES ($1, $2, $3) RETURNING *",
        [1, "2026-10-29", "Introductory discovery discussion."]
      );
    });

    test("returns 401 on database query error", async () => {
      querySpy.mockRejectedValueOnce(new Error("Foreign key violation"));

      const req = createMockRequest({
        method: "POST",
        token: validToken,
        body: { customer_id: 999, interaction_date: "2026-10-29", notes: "Note" },
      });
      const res = createMockResponse();

      await addHandler(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.data.error).toBe("Foreign key violation");
    });
  });

  describe("GET /api/interactions/list", () => {
    test("rejects non-GET methods", async () => {
      const req = createMockRequest({ method: "POST" });
      const res = createMockResponse();

      await listHandler(req, res);
      expect(res.statusCode).toBe(405);
    });

    test("retrieves full interactions list on valid authorization", async () => {
      querySpy.mockResolvedValueOnce({ rows: sampleInteractions });

      const req = createMockRequest({ method: "GET", token: validToken });
      const res = createMockResponse();

      await listHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data).toHaveLength(sampleInteractions.length);
    });
  });

  describe("GET /api/interactions/customer", () => {
    test("rejects unauthenticated requests", async () => {
      const req = createMockRequest({ method: "GET" });
      const res = createMockResponse();

      await customerHandler(req, res);
      expect(res.statusCode).toBe(401);
    });

    test("fetches interactions filtered for a specific customer ID", async () => {
      const customerSpecific = [sampleInteractions[0]];
      querySpy.mockResolvedValueOnce({ rows: customerSpecific });

      const req = createMockRequest({
        method: "GET",
        token: validToken,
        query: { customer_id: "1" },
      });
      const res = createMockResponse();

      await customerHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data).toHaveLength(1);
      expect(res.data[0].customer_id).toBe(1);
    });
  });
});
