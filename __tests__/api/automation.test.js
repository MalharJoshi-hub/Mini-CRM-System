import pool from "../../lib/db.js";
import { generateToken } from "../../lib/auth.js";
import pendingHandler from "../../pages/api/automation/pending-followups.js";
import testDbHandler from "../../pages/api/test-db.js";
import helloHandler from "../../pages/api/hello.js";
import { createMockRequest, createMockResponse } from "../fixtures/mockData.js";

describe("Automation & Diagnostic Endpoints (/api/automation/*, /api/test-db, /api/hello)", () => {
  let validToken;
  let querySpy;

  beforeAll(() => {
    validToken = generateToken({ id: 7, email: "automation@minicrm.io", role: "admin" });
  });

  beforeEach(() => {
    querySpy = jest.spyOn(pool, "query");
  });

  afterEach(() => {
    querySpy.mockRestore();
  });

  describe("GET /api/automation/pending-followups", () => {
    test("rejects non-GET HTTP methods with 405 Method Not Allowed", async () => {
      const req = createMockRequest({ method: "POST" });
      const res = createMockResponse();

      await pendingHandler(req, res);
      expect(res.statusCode).toBe(405);
      expect(res.data.message).toBe("Method not allowed");
    });

    test("rejects unauthenticated requests with 401", async () => {
      const req = createMockRequest({ method: "GET" });
      const res = createMockResponse();

      await pendingHandler(req, res);
      expect(res.statusCode).toBe(401);
    });

    test("returns pending followups list on valid authorization", async () => {
      const pendingRows = [
        { id: 1, name: "Pending Cust A", last_contact: "2026-10-01" },
        { id: 2, name: "Pending Cust B", last_contact: null },
      ];
      querySpy.mockResolvedValueOnce({ rows: pendingRows });

      const req = createMockRequest({ method: "GET", token: validToken });
      const res = createMockResponse();

      await pendingHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data).toHaveLength(2);
      expect(querySpy).toHaveBeenCalledWith(expect.stringContaining("INTERVAL '7 days'"));
    });

    test("handles database query failure with 401/error", async () => {
      querySpy.mockRejectedValueOnce(new Error("Query failed"));

      const req = createMockRequest({ method: "GET", token: validToken });
      const res = createMockResponse();

      await pendingHandler(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.data.error).toBe("Query failed");
    });
  });

  describe("GET /api/test-db", () => {
    test("executes SELECT NOW() diagnostic query and returns timestamp", async () => {
      const mockTime = { now: "2026-10-29T12:00:00Z" };
      querySpy.mockResolvedValueOnce({ rows: [mockTime] });

      const req = createMockRequest({ method: "GET" });
      const res = createMockResponse();

      await testDbHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data.time).toEqual(mockTime);
      expect(querySpy).toHaveBeenCalledWith("SELECT NOW()");
    });

    test("returns 500 when database is unreachable", async () => {
      querySpy.mockRejectedValueOnce(new Error("Connection refused"));

      const req = createMockRequest({ method: "GET" });
      const res = createMockResponse();

      await testDbHandler(req, res);
      expect(res.statusCode).toBe(500);
      expect(res.data.error).toBe("Connection refused");
    });
  });

  describe("GET /api/hello", () => {
    test("returns hello John Doe greeting payload", () => {
      const req = createMockRequest({ method: "GET" });
      const res = createMockResponse();

      helloHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data).toEqual({ name: "John Doe" });
    });
  });
});
