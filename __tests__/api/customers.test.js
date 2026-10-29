import pool from "../../lib/db.js";
import { generateToken } from "../../lib/auth.js";
import listHandler from "../../pages/api/customers/list.js";
import addHandler from "../../pages/api/customers/add.js";
import updateHandler from "../../pages/api/customers/update.js";
import deleteHandler from "../../pages/api/customers/delete.js";
import overdueHandler from "../../pages/api/customers/overdue.js";
import { createMockRequest, createMockResponse, sampleCustomers } from "../fixtures/mockData.js";

describe("Customers API Endpoints (/api/customers/*)", () => {
  let validToken;
  let querySpy;

  beforeAll(() => {
    validToken = generateToken({ id: 1, email: "admin@minicrm.io", role: "admin" });
  });

  beforeEach(() => {
    querySpy = jest.spyOn(pool, "query");
  });

  afterEach(() => {
    querySpy.mockRestore();
  });

  describe("GET /api/customers/list", () => {
    test("rejects non-GET HTTP methods with 405 Method Not Allowed", async () => {
      const req = createMockRequest({ method: "POST" });
      const res = createMockResponse();

      await listHandler(req, res);
      expect(res.statusCode).toBe(405);
      expect(res.data.message).toBe("Method not allowed");
    });

    test("rejects unauthenticated requests with 401 Unauthorized", async () => {
      const req = createMockRequest({ method: "GET" });
      const res = createMockResponse();

      await listHandler(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.data.error).toBeDefined();
    });

    test("returns customer list ordered by ID desc on valid token", async () => {
      querySpy.mockResolvedValueOnce({ rows: sampleCustomers });

      const req = createMockRequest({ method: "GET", token: validToken });
      const res = createMockResponse();

      await listHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data).toHaveLength(sampleCustomers.length);
      expect(querySpy).toHaveBeenCalledWith("SELECT * FROM customers ORDER BY id DESC");
    });

    test("handles database query failure with 401/error response", async () => {
      querySpy.mockRejectedValueOnce(new Error("Database connection lost"));

      const req = createMockRequest({ method: "GET", token: validToken });
      const res = createMockResponse();

      await listHandler(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.data.error).toBe("Database connection lost");
    });
  });

  describe("POST /api/customers/add", () => {
    test("rejects non-POST HTTP methods with 405", async () => {
      const req = createMockRequest({ method: "GET" });
      const res = createMockResponse();

      await addHandler(req, res);
      expect(res.statusCode).toBe(405);
    });

    test("rejects unauthenticated insertion requests", async () => {
      const req = createMockRequest({
        method: "POST",
        body: { name: "New Client", email: "client@test.com", phone: "+15551234" },
      });
      const res = createMockResponse();

      await addHandler(req, res);
      expect(res.statusCode).toBe(401);
    });

    test("creates new customer record and returns 201 Created", async () => {
      const newCustomer = {
        id: 99,
        name: "Zenith Corp",
        email: "zenith@test.com",
        phone: "+1-555-9999",
      };
      querySpy.mockResolvedValueOnce({ rows: [newCustomer] });

      const req = createMockRequest({
        method: "POST",
        token: validToken,
        body: { name: "Zenith Corp", email: "zenith@test.com", phone: "+1-555-9999" },
      });
      const res = createMockResponse();

      await addHandler(req, res);
      expect(res.statusCode).toBe(201);
      expect(res.data.id).toBe(99);
      expect(res.data.name).toBe("Zenith Corp");
      expect(querySpy).toHaveBeenCalledWith(
        "INSERT INTO customers (name, email, phone) VALUES ($1, $2, $3) RETURNING *",
        ["Zenith Corp", "zenith@test.com", "+1-555-9999"]
      );
    });

    test("returns 401 when database query fails", async () => {
      querySpy.mockRejectedValueOnce(new Error("Unique constraint violation"));

      const req = createMockRequest({
        method: "POST",
        token: validToken,
        body: { name: "Dup", email: "dup@test.com", phone: "123" },
      });
      const res = createMockResponse();

      await addHandler(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.data.error).toBe("Unique constraint violation");
    });
  });

  describe("PUT /api/customers/update", () => {
    test("rejects non-PUT methods", async () => {
      const req = createMockRequest({ method: "POST" });
      const res = createMockResponse();

      await updateHandler(req, res);
      expect(res.statusCode).toBe(405);
    });

    test("updates customer record and returns 200 OK", async () => {
      const updatedCustomer = {
        id: 1,
        name: "Acme International",
        email: "contact@acme.com",
        phone: "+1-555-0101",
      };
      querySpy.mockResolvedValueOnce({ rows: [updatedCustomer] });

      const req = createMockRequest({
        method: "PUT",
        token: validToken,
        body: { id: 1, name: "Acme International", email: "contact@acme.com", phone: "+1-555-0101" },
      });
      const res = createMockResponse();

      await updateHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data.name).toBe("Acme International");
    });
  });

  describe("DELETE /api/customers/delete", () => {
    test("rejects non-DELETE methods", async () => {
      const req = createMockRequest({ method: "GET" });
      const res = createMockResponse();

      await deleteHandler(req, res);
      expect(res.statusCode).toBe(405);
    });

    test("deletes customer record and returns confirmation message", async () => {
      querySpy.mockResolvedValueOnce({ rowCount: 1 });

      const req = createMockRequest({
        method: "DELETE",
        token: validToken,
        body: { id: 5 },
      });
      const res = createMockResponse();

      await deleteHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data.message).toBe("Customer deleted successfully");
      expect(querySpy).toHaveBeenCalledWith("DELETE FROM customers WHERE id=$1", [5]);
    });

    test("denies deletion request from non-admin agent with 403 Forbidden", async () => {
      const agentToken = generateToken({ id: 99, email: "agent@minicrm.io", role: "agent" });
      const req = createMockRequest({
        method: "DELETE",
        token: agentToken,
        body: { id: 5 },
      });
      const res = createMockResponse();

      await deleteHandler(req, res);
      expect(res.statusCode).toBe(403);
      expect(res.data.error).toContain("Forbidden");
    });
  });

  describe("GET /api/customers/overdue", () => {
    test("retrieves overdue customers uncontacted >7 days", async () => {
      const overdueSample = [
        { id: 2, name: "Beta Logistics Ltd", last_contact: "2026-10-05" },
        { id: 3, name: "Gamma Retail Systems", last_contact: "2026-09-14" },
      ];
      querySpy.mockResolvedValueOnce({ rows: overdueSample });

      const req = createMockRequest({ method: "GET", token: validToken });
      const res = createMockResponse();

      await overdueHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data).toHaveLength(2);
      expect(res.data[0].id).toBe(2);
    });

    test("handles unauthenticated overdue query", async () => {
      const req = createMockRequest({ method: "GET" });
      const res = createMockResponse();

      await overdueHandler(req, res);
      expect(res.statusCode).toBe(401);
    });
  });
});
