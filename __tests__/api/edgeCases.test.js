import pool from "../../lib/db.js";
import { generateToken } from "../../lib/auth.js";
import addCustomerHandler from "../../pages/api/customers/add.js";
import updateCustomerHandler from "../../pages/api/customers/update.js";
import addInteractionHandler from "../../pages/api/interactions/add.js";
import { createMockRequest, createMockResponse } from "../fixtures/mockData.js";

describe("API Edge Cases, Boundary Testing & Fault Tolerance", () => {
  let validToken;
  let querySpy;

  beforeAll(() => {
    validToken = generateToken({ id: 99, email: "qa@minicrm.io", role: "admin" });
  });

  beforeEach(() => {
    querySpy = jest.spyOn(pool, "query");
  });

  afterEach(() => {
    querySpy.mockRestore();
  });

  describe("Customer Creation Edge Cases", () => {
    test("handles international Unicode characters and accents in customer name", async () => {
      const unicodeCustomer = {
        name: "Société Générale d'Ingénierie & Müller GmbH 🚀",
        email: "contact@muller-ingenierie.eu",
        phone: "+33 1 42 68 55 00",
      };
      querySpy.mockResolvedValueOnce({ rows: [{ id: 101, ...unicodeCustomer }] });

      const req = createMockRequest({
        method: "POST",
        token: validToken,
        body: unicodeCustomer,
      });
      const res = createMockResponse();

      await addCustomerHandler(req, res);
      expect(res.statusCode).toBe(201);
      expect(res.data.name).toContain("Müller");
      expect(res.data.name).toContain("🚀");
    });

    test("handles maximum length strings without truncating or crashing", async () => {
      const longName = "A".repeat(140);
      const longEmail = "a".repeat(50) + "@enterprise-domain-test.com";

      querySpy.mockResolvedValueOnce({ rows: [{ id: 102, name: longName, email: longEmail }] });

      const req = createMockRequest({
        method: "POST",
        token: validToken,
        body: { name: longName, email: longEmail, phone: "+15551234" },
      });
      const res = createMockResponse();

      await addCustomerHandler(req, res);
      expect(res.statusCode).toBe(201);
      expect(res.data.name).toHaveLength(140);
    });

    test("handles null or undefined phone number gracefully", async () => {
      querySpy.mockResolvedValueOnce({
        rows: [{ id: 103, name: "No Phone Corp", email: "nophone@test.com", phone: null }],
      });

      const req = createMockRequest({
        method: "POST",
        token: validToken,
        body: { name: "No Phone Corp", email: "nophone@test.com", phone: null },
      });
      const res = createMockResponse();

      await addCustomerHandler(req, res);
      expect(res.statusCode).toBe(201);
      expect(res.data.phone).toBeNull();
    });
  });

  describe("Customer Update Edge Cases", () => {
    test("handles updating non-existent customer ID (0 rows affected)", async () => {
      querySpy.mockResolvedValueOnce({ rows: [] });

      const req = createMockRequest({
        method: "PUT",
        token: validToken,
        body: { id: 999999, name: "Ghost", email: "ghost@test.com" },
      });
      const res = createMockResponse();

      await updateCustomerHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data).toBeUndefined();
    });
  });

  describe("Interaction Logging Edge Cases", () => {
    test("handles multi-line text notes with special markdown characters", async () => {
      const multiLineNotes = `
# Executive Meeting Summary
- Discussed **Q4 deliverables**
- Client agreed to *Phase 2* expansion
- Next review: \`2026-11-15\`
      `.trim();

      querySpy.mockResolvedValueOnce({
        rows: [{ id: 50, customer_id: 1, notes: multiLineNotes }],
      });

      const req = createMockRequest({
        method: "POST",
        token: validToken,
        body: { customer_id: 1, interaction_date: "2026-10-29", notes: multiLineNotes },
      });
      const res = createMockResponse();

      await addInteractionHandler(req, res);
      expect(res.statusCode).toBe(201);
      expect(res.data.notes).toContain("Executive Meeting Summary");
      expect(res.data.notes).toContain("`2026-11-15`");
    });
  });
});
