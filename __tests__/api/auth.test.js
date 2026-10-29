import bcrypt from "bcrypt";
import pool from "../../lib/db.js";
import { generateToken } from "../../lib/auth.js";
import registerHandler from "../../pages/api/auth/register.js";
import loginHandler from "../../pages/api/auth/login.js";
import protectedHandler from "../../pages/api/protected.js";
import { createMockRequest, createMockResponse } from "../fixtures/mockData.js";

describe("Authentication API Endpoints (/api/auth/* and /api/protected)", () => {
  let querySpy;

  beforeEach(() => {
    querySpy = jest.spyOn(pool, "query");
  });

  afterEach(() => {
    querySpy.mockRestore();
  });

  describe("POST /api/auth/register", () => {
    test("rejects non-POST methods with 405 Method Not Allowed", async () => {
      const req = createMockRequest({ method: "GET" });
      const res = createMockResponse();

      await registerHandler(req, res);
      expect(res.statusCode).toBe(405);
      expect(res.data.message).toBe("Method not allowed");
    });

    test("hashes password with bcrypt and inserts user record", async () => {
      const createdUser = { id: 1, name: "New User", email: "new@minicrm.io" };
      querySpy.mockResolvedValueOnce({ rows: [createdUser] });

      const req = createMockRequest({
        method: "POST",
        body: { name: "New User", email: "new@minicrm.io", password: "plainSecretPassword123" },
      });
      const res = createMockResponse();

      await registerHandler(req, res);
      expect(res.statusCode).toBe(201);
      expect(res.data.email).toBe("new@minicrm.io");
      expect(querySpy).toHaveBeenCalledWith(
        expect.stringContaining("INSERT INTO users"),
        expect.arrayContaining(["New User", "new@minicrm.io"])
      );

      // Verify that the third argument (password) is indeed a bcrypt hash and not plain text
      const passedHash = querySpy.mock.calls[0][1][2];
      expect(passedHash).not.toBe("plainSecretPassword123");
      const isMatch = await bcrypt.compare("plainSecretPassword123", passedHash);
      expect(isMatch).toBe(true);
    });

    test("handles database error during registration with 500", async () => {
      querySpy.mockRejectedValueOnce(new Error("duplicate key value violates unique constraint"));

      const req = createMockRequest({
        method: "POST",
        body: { name: "Duplicate", email: "dup@minicrm.io", password: "password123" },
      });
      const res = createMockResponse();

      await registerHandler(req, res);
      expect(res.statusCode).toBe(500);
      expect(res.data.error).toContain("duplicate key value");
    });
  });

  describe("POST /api/auth/login", () => {
    test("rejects non-POST methods with 405 Method Not Allowed", async () => {
      const req = createMockRequest({ method: "GET" });
      const res = createMockResponse();

      await loginHandler(req, res);
      expect(res.statusCode).toBe(405);
      expect(res.data.message).toBe("Method not allowed");
    });

    test("returns 401 when user email is not found in database", async () => {
      querySpy.mockResolvedValueOnce({ rows: [] });

      const req = createMockRequest({
        method: "POST",
        body: { email: "nonexistent@minicrm.io", password: "password123" },
      });
      const res = createMockResponse();

      await loginHandler(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.data.message).toBe("User not found");
    });

    test("returns 401 when password does not match bcrypt hash", async () => {
      const realHash = await bcrypt.hash("correctPassword", 10);
      querySpy.mockResolvedValueOnce({
        rows: [{ id: 10, email: "user@minicrm.io", password: realHash, role: "agent" }],
      });

      const req = createMockRequest({
        method: "POST",
        body: { email: "user@minicrm.io", password: "wrongPassword" },
      });
      const res = createMockResponse();

      await loginHandler(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.data.message).toBe("Invalid password");
    });

    test("authenticates successfully and issues signed JWT token on valid credentials", async () => {
      const realHash = await bcrypt.hash("correctPassword", 10);
      querySpy.mockResolvedValueOnce({
        rows: [{ id: 10, email: "user@minicrm.io", password: realHash, role: "agent" }],
      });

      const req = createMockRequest({
        method: "POST",
        body: { email: "user@minicrm.io", password: "correctPassword" },
      });
      const res = createMockResponse();

      await loginHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data.token).toBeDefined();
      expect(typeof res.data.token).toBe("string");
    });

    test("handles unexpected database failure during login with 500", async () => {
      querySpy.mockRejectedValueOnce(new Error("Connection timeout"));

      const req = createMockRequest({
        method: "POST",
        body: { email: "user@minicrm.io", password: "anyPassword" },
      });
      const res = createMockResponse();

      await loginHandler(req, res);
      expect(res.statusCode).toBe(500);
      expect(res.data.error).toBe("Connection timeout");
    });
  });

  describe("GET /api/protected", () => {
    test("rejects request without token with 401 Unauthorized", () => {
      const req = createMockRequest({ method: "GET" });
      const res = createMockResponse();

      protectedHandler(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.data.error).toBeDefined();
    });

    test("allows access when valid bearer token is provided", () => {
      const token = generateToken({ id: 5, email: "authorized@minicrm.io", role: "admin" });
      const req = createMockRequest({ method: "GET", token });
      const res = createMockResponse();

      protectedHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data.message).toBe("Protected route accessed");
      expect(res.data.user.id).toBe(5);
    });
  });
});
