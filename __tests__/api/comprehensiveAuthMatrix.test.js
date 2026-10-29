/**
 * Comprehensive Authentication & Authorization Matrix
 * Exhaustively validates registration, password hashing, token generation,
 * claim verification, and role hierarchy enforcement.
 */

import bcrypt from "bcrypt";
import pool from "../../lib/db.js";
import { generateToken, verifyToken, hasRole, sanitizeUser } from "../../lib/auth.js";
import registerHandler from "../../pages/api/auth/register.js";
import loginHandler from "../../pages/api/auth/login.js";
import protectedHandler from "../../pages/api/protected.js";
import { createMockRequest, createMockResponse } from "../fixtures/mockData.js";

describe("Comprehensive Auth & RBAC Security Matrix", () => {
  let querySpy;

  beforeEach(() => {
    querySpy = jest.spyOn(pool, "query");
  });

  afterEach(() => {
    querySpy.mockRestore();
  });

  describe("Operator Registration Edge Cases & Hashing Verification", () => {
    const passwordPermutations = [
      "SimplePassword123",
      "P@$$w0rd_With_Specials!#%&*",
      "VeryLongComplexPassphraseThatExceedsThirtyCharactersEasily2026",
      "Pass with spaces in the middle 99",
      "123456", // Minimum acceptable length (6 chars)
      "ÜnicødeP@sswørd123",
    ];

    test.each(passwordPermutations)(
      "successfully hashes and stores user with password '%s'",
      async (password) => {
        const mockCreated = { id: 10, name: "Operator", email: `user${Date.now()}@test.io` };
        querySpy.mockResolvedValueOnce({ rows: [mockCreated] });

        const req = createMockRequest({
          method: "POST",
          body: {
            name: "Operator",
            email: mockCreated.email,
            password,
          },
        });
        const res = createMockResponse();

        await registerHandler(req, res);
        expect(res.statusCode).toBe(201);
        expect(res.data.id).toBe(10);

        const storedHash = querySpy.mock.calls[0][1][2];
        const match = await bcrypt.compare(password, storedHash);
        expect(match).toBe(true);
      }
    );
  });

  describe("Token Claim & Role Isolation Matrix", () => {
    const roles = ["admin", "manager", "agent", "analyst", "user", "guest"];

    test.each(roles)("generates and verifies claims for role '%s'", (role) => {
      const user = { id: 100, name: "Role User", email: `${role}@minicrm.io`, role };
      const token = generateToken(user);
      const req = { headers: { authorization: `Bearer ${token}` } };
      const claims = verifyToken(req);

      expect(claims.id).toBe(100);
      expect(claims.role).toBe(role);
      expect(claims.email).toBe(`${role}@minicrm.io`);
    });

    test("enforces admin supremacy: admin passes any required role check", () => {
      const admin = { id: 1, role: "admin" };
      for (const role of roles) {
        expect(hasRole(admin, role)).toBe(true);
      }
    });

    test("enforces non-admin restriction: basic agent fails admin check", () => {
      const agent = { id: 2, role: "agent" };
      expect(hasRole(agent, "admin")).toBe(false);
      expect(hasRole(agent, ["admin", "superadmin"])).toBe(false);
    });

    test("enforces exact matching for custom roles", () => {
      const analyst = { id: 3, role: "analyst" };
      expect(hasRole(analyst, "analyst")).toBe(true);
      expect(hasRole(analyst, "agent")).toBe(false);
    });
  });

  describe("Protected Route Gatekeeping", () => {
    test("allows authorized access for any valid token regardless of user role", () => {
      const token = generateToken({ id: 50, email: "agent50@minicrm.io", role: "agent" });
      const req = createMockRequest({ method: "GET", token });
      const res = createMockResponse();

      protectedHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data.message).toBe("Protected route accessed");
      expect(res.data.user.id).toBe(50);
    });

    test("rejects access when token is expired", () => {
      const expiredToken = generateToken({ id: 50 }, "-1s");
      const req = createMockRequest({ method: "GET", token: expiredToken });
      const res = createMockResponse();

      protectedHandler(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.data.error).toBeDefined();
    });
  });
});
