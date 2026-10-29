import pool from "../../lib/db.js";
import { verifyToken } from "../../lib/auth.js";
import registerHandler from "../../pages/api/auth/register.js";
import { createMockRequest, createMockResponse } from "../fixtures/mockData.js";

describe("Enhanced Registration & Token Auto-Issuance (/api/auth/register)", () => {
  let querySpy;

  beforeEach(() => {
    querySpy = jest.spyOn(pool, "query");
  });

  afterEach(() => {
    querySpy.mockRestore();
  });

  test("returns signed JWT token along with user payload on successful registration", async () => {
    const mockUser = { id: 42, name: "Jordan Lee", email: "jordan@startup.io", role: "agent" };
    querySpy.mockResolvedValueOnce({ rows: [mockUser] });

    const req = createMockRequest({
      method: "POST",
      body: { name: "Jordan Lee", email: "jordan@startup.io", password: "securePassword2026" },
    });
    const res = createMockResponse();

    await registerHandler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.data.id).toBe(42);
    expect(res.data.email).toBe("jordan@startup.io");
    expect(res.data.token).toBeDefined();

    // Verify token validity
    const claims = verifyToken({ headers: { authorization: `Bearer ${res.data.token}` } });
    expect(claims.userId).toBe(42);
    expect(claims.role).toBe("agent");
  });

  test("supports role assignment during user registration", async () => {
    const mockManager = { id: 99, name: "Manager User", email: "mgr@startup.io", role: "manager" };
    querySpy.mockResolvedValueOnce({ rows: [mockManager] });

    const req = createMockRequest({
      method: "POST",
      body: { name: "Manager User", email: "mgr@startup.io", password: "password123", role: "manager" },
    });
    const res = createMockResponse();

    await registerHandler(req, res);

    expect(res.statusCode).toBe(201);
    expect(res.data.role).toBe("manager");
    expect(res.data.token).toBeDefined();

    const claims = verifyToken({ headers: { authorization: `Bearer ${res.data.token}` } });
    expect(claims.role).toBe("manager");
  });

  test("handles database connection failure gracefully with 500 error", async () => {
    querySpy.mockRejectedValueOnce(new Error("Database pool timeout"));

    const req = createMockRequest({
      method: "POST",
      body: { name: "Fail User", email: "fail@startup.io", password: "password123" },
    });
    const res = createMockResponse();

    await registerHandler(req, res);

    expect(res.statusCode).toBe(500);
    expect(res.data.error).toBe("Database pool timeout");
  });
});
