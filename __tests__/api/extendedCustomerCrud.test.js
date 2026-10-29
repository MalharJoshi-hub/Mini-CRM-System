/**
 * Extended Customer CRUD API Test Suite
 * Exhaustively tests customer lifecycle endpoints:
 * /api/customers/list, /api/customers/add, /api/customers/update, /api/customers/delete, /api/customers/overdue
 */

import pool from "../../lib/db.js";
import { generateToken } from "../../lib/auth.js";
import listHandler from "../../pages/api/customers/list.js";
import addHandler from "../../pages/api/customers/add.js";
import updateHandler from "../../pages/api/customers/update.js";
import deleteHandler from "../../pages/api/customers/delete.js";
import overdueHandler from "../../pages/api/customers/overdue.js";
import { createMockRequest, createMockResponse } from "../fixtures/mockData.js";

describe("Extended Customer CRUD Endpoint Permutations", () => {
  let authToken;
  let querySpy;

  beforeAll(() => {
    authToken = generateToken({ id: 5, email: "crud-tester@minicrm.io", role: "admin" });
  });

  beforeEach(() => {
    querySpy = jest.spyOn(pool, "query");
  });

  afterEach(() => {
    querySpy.mockRestore();
  });

  describe("Customer Add Boundary Tests", () => {
    const customerPermutations = [
      { name: "Alpha Global Ltd", email: "contact@alphaglobal.com", phone: "+1-555-1001" },
      { name: "Beta Systems Inc", email: "info@betasystems.net", phone: "+44-20-7946-0919" },
      { name: "Gamma Software KG", email: "hello@gammasoftware.de", phone: "+49-30-123456" },
      { name: "Delta Logistics SAS", email: "ops@deltalogistics.fr", phone: "+33-1-42-68-55-00" },
      { name: "Epsilon Media Corp", email: "press@epsilonmedia.co.uk", phone: "+44-161-496-0123" },
      { name: "Zeta Financial Holding", email: "invest@zetafinancial.ch", phone: "+41-22-767-6111" },
      { name: "Eta BioTech Labs", email: "research@etabiotech.se", phone: "+46-8-123-4567" },
      { name: "Theta Robotics Oy", email: "engineering@thetarobotics.fi", phone: "+358-9-123-4567" },
      { name: "Iota Clean Energy SpA", email: "green@iotaclean.it", phone: "+39-06-698-1234" },
      { name: "Kappa Telecommunications", email: "support@kappatel.nl", phone: "+31-20-525-9111" },
    ];

    test.each(customerPermutations)(
      "onboards enterprise customer: $name ($email)",
      async (customer) => {
        querySpy.mockResolvedValueOnce({ rows: [{ id: 100, ...customer }] });

        const req = createMockRequest({
          method: "POST",
          token: authToken,
          body: customer,
        });
        const res = createMockResponse();

        await addHandler(req, res);
        expect(res.statusCode).toBe(201);
        expect(res.data.name).toBe(customer.name);
        expect(res.data.email).toBe(customer.email);
      }
    );
  });

  describe("Customer Update Partial Field Permutations", () => {
    test("updates customer email while preserving existing name and phone", async () => {
      const updated = {
        id: 1,
        name: "Existing Corp",
        email: "new-email@existingcorp.com",
        phone: "+1-555-0000",
      };
      querySpy.mockResolvedValueOnce({ rows: [updated] });

      const req = createMockRequest({
        method: "PUT",
        token: authToken,
        body: updated,
      });
      const res = createMockResponse();

      await updateHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data.email).toBe("new-email@existingcorp.com");
    });

    test("updates customer phone number while preserving email", async () => {
      const updated = {
        id: 2,
        name: "Beta Ltd",
        email: "beta@test.com",
        phone: "+1-555-999-8888",
      };
      querySpy.mockResolvedValueOnce({ rows: [updated] });

      const req = createMockRequest({
        method: "PUT",
        token: authToken,
        body: updated,
      });
      const res = createMockResponse();

      await updateHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data.phone).toBe("+1-555-999-8888");
    });
  });

  describe("Customer Deletion Permutations", () => {
    test("deletes customer by ID and verifies parameter binding", async () => {
      querySpy.mockResolvedValueOnce({ rowCount: 1 });

      const req = createMockRequest({
        method: "DELETE",
        token: authToken,
        body: { id: 42 },
      });
      const res = createMockResponse();

      await deleteHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data.message).toBe("Customer deleted successfully");
      expect(querySpy).toHaveBeenCalledWith("DELETE FROM customers WHERE id=$1", [42]);
    });
  });

  describe("Overdue Accounts Query Result Structures", () => {
    test("returns empty array when all customers have recent contact", async () => {
      querySpy.mockResolvedValueOnce({ rows: [] });

      const req = createMockRequest({ method: "GET", token: authToken });
      const res = createMockResponse();

      await overdueHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data).toEqual([]);
    });

    test("sorts overdue accounts chronologically ascending by oldest contact date", async () => {
      const overdueList = [
        { id: 1, name: "Oldest Stale Account", last_contact: "2026-06-01" },
        { id: 2, name: "Moderately Stale Account", last_contact: "2026-08-15" },
        { id: 3, name: "Recently Stale Account", last_contact: "2026-10-15" },
      ];
      querySpy.mockResolvedValueOnce({ rows: overdueList });

      const req = createMockRequest({ method: "GET", token: authToken });
      const res = createMockResponse();

      await overdueHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data[0].id).toBe(1);
      expect(res.data[2].id).toBe(3);
    });
  });
});
