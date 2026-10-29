import pool from "../../lib/db.js";
import { generateToken } from "../../lib/auth.js";
import meHandler from "../../pages/api/auth/me.js";
import adminUsersHandler from "../../pages/api/admin/users.js";
import adminAuditLogsHandler from "../../pages/api/admin/audit-logs.js";
import adminStatsHandler from "../../pages/api/admin/system-stats.js";
import { createMockRequest, createMockResponse } from "../fixtures/mockData.js";

describe("Role-Based Access Control & Admin Governance Matrix", () => {
  let adminToken;
  let managerToken;
  let agentToken;
  let querySpy;

  beforeAll(() => {
    adminToken = generateToken({ id: 1, email: "admin@minicrm.io", role: "admin" });
    managerToken = generateToken({ id: 2, email: "manager@minicrm.io", role: "manager" });
    agentToken = generateToken({ id: 3, email: "agent@minicrm.io", role: "agent" });
  });

  beforeEach(() => {
    querySpy = jest.spyOn(pool, "query");
  });

  afterEach(() => {
    querySpy.mockRestore();
  });

  describe("GET & POST /api/auth/me (User Profile & Evaluator Role Switcher)", () => {
    test("rejects unsupported HTTP methods with 405", async () => {
      const req = createMockRequest({ method: "DELETE", token: agentToken });
      const res = createMockResponse();

      await meHandler(req, res);
      expect(res.statusCode).toBe(405);
    });

    test("rejects unauthenticated request with 401", async () => {
      const req = createMockRequest({ method: "GET" });
      const res = createMockResponse();

      await meHandler(req, res);
      expect(res.statusCode).toBe(401);
    });

    test("retrieves current operator profile on valid token", async () => {
      const mockUser = { id: 3, name: "Agent Smith", email: "agent@minicrm.io", role: "agent", is_active: true };
      querySpy.mockResolvedValueOnce({ rows: [mockUser] });

      const req = createMockRequest({ method: "GET", token: agentToken });
      const res = createMockResponse();

      await meHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data.user.email).toBe("agent@minicrm.io");
    });

    test("switches evaluation role and returns fresh signed token on POST", async () => {
      const req = createMockRequest({
        method: "POST",
        token: agentToken,
        body: { role: "admin" },
      });
      const res = createMockResponse();

      await meHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data.user.role).toBe("admin");
      expect(res.data.token).toBeDefined();
    });
  });

  describe("GET & PUT /api/admin/users (Operator Management)", () => {
    test("denies access to non-admin roles with 403 Forbidden", async () => {
      const req = createMockRequest({ method: "GET", token: agentToken });
      const res = createMockResponse();

      await adminUsersHandler(req, res);
      expect(res.statusCode).toBe(403);
      expect(res.data.error).toContain("Forbidden");
    });

    test("allows admin to retrieve full operator list on GET", async () => {
      const mockOperators = [
        { id: 1, name: "Admin", email: "admin@minicrm.io", role: "admin", is_active: true },
        { id: 2, name: "Agent", email: "agent@minicrm.io", role: "agent", is_active: true },
      ];
      querySpy.mockResolvedValueOnce({ rows: mockOperators });

      const req = createMockRequest({ method: "GET", token: adminToken });
      const res = createMockResponse();

      await adminUsersHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data.users.length).toBe(2);
    });

    test("allows admin to update user role and active status on PUT", async () => {
      const updatedUser = { id: 2, name: "Agent", email: "agent@minicrm.io", role: "manager", is_active: true };
      querySpy.mockResolvedValueOnce({ rows: [updatedUser] });

      const req = createMockRequest({
        method: "PUT",
        token: adminToken,
        body: { userId: 2, role: "manager", is_active: true },
      });
      const res = createMockResponse();

      await adminUsersHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data.user.role).toBe("manager");
      expect(res.data.message).toContain("successfully updated");
    });

    test("rejects PUT without userId with 400", async () => {
      const req = createMockRequest({
        method: "PUT",
        token: adminToken,
        body: { role: "manager" },
      });
      const res = createMockResponse();

      await adminUsersHandler(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.data.error).toContain("Missing required parameter");
    });

    test("returns 404 when updating non-existent user", async () => {
      querySpy.mockResolvedValueOnce({ rows: [] });

      const req = createMockRequest({
        method: "PUT",
        token: adminToken,
        body: { userId: 9999, role: "admin" },
      });
      const res = createMockResponse();

      await adminUsersHandler(req, res);
      expect(res.statusCode).toBe(404);
      expect(res.data.error).toBe("User not found");
    });
  });

  describe("GET /api/admin/audit-logs", () => {
    test("rejects non-GET methods with 405", async () => {
      const req = createMockRequest({ method: "POST", token: adminToken });
      const res = createMockResponse();

      await adminAuditLogsHandler(req, res);
      expect(res.statusCode).toBe(405);
    });

    test("rejects unauthenticated requests with 401", async () => {
      const req = createMockRequest({ method: "GET" });
      const res = createMockResponse();

      await adminAuditLogsHandler(req, res);
      expect(res.statusCode).toBe(401);
    });

    test("denies access to non-admin roles with 403 Forbidden", async () => {
      const req = createMockRequest({ method: "GET", token: managerToken });
      const res = createMockResponse();

      await adminAuditLogsHandler(req, res);
      expect(res.statusCode).toBe(403);
    });

    test("allows admin to retrieve audit logs from database", async () => {
      const mockLogs = [
        { id: 1, action: "USER_LOGIN", level: "INFO", user_id: 1, created_at: new Date() },
      ];
      querySpy.mockResolvedValueOnce({ rows: mockLogs });

      const req = createMockRequest({ method: "GET", token: adminToken });
      const res = createMockResponse();

      await adminAuditLogsHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data.logs).toBeDefined();
    });

    test("falls back to in-memory audit logs when database query fails", async () => {
      querySpy.mockRejectedValueOnce(new Error("Database offline"));

      const req = createMockRequest({ method: "GET", token: adminToken });
      const res = createMockResponse();

      await adminAuditLogsHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.data.logs)).toBe(true);
    });
  });

  describe("GET /api/admin/system-stats", () => {
    test("rejects non-GET methods with 405", async () => {
      const req = createMockRequest({ method: "PUT", token: adminToken });
      const res = createMockResponse();

      await adminStatsHandler(req, res);
      expect(res.statusCode).toBe(405);
    });

    test("rejects unauthenticated requests with 401", async () => {
      const req = createMockRequest({ method: "GET" });
      const res = createMockResponse();

      await adminStatsHandler(req, res);
      expect(res.statusCode).toBe(401);
    });

    test("denies access to non-admin roles with 403 Forbidden", async () => {
      const req = createMockRequest({ method: "GET", token: agentToken });
      const res = createMockResponse();

      await adminStatsHandler(req, res);
      expect(res.statusCode).toBe(403);
    });

    test("allows admin to retrieve system health, telemetry, and record counts", async () => {
      // Mock count queries
      querySpy
        .mockResolvedValueOnce({ rows: [{ count: "3" }] }) // users
        .mockResolvedValueOnce({ rows: [{ count: "10" }] }) // customers
        .mockResolvedValueOnce({ rows: [{ count: "25" }] }) // interactions
        .mockResolvedValueOnce({ rows: [{ count: "4" }] }) // followups
        .mockResolvedValueOnce({ rows: [{ count: "50" }] }) // audit_logs
        .mockResolvedValueOnce({ rows: [{ now: new Date() }] }); // health check query

      const req = createMockRequest({ method: "GET", token: adminToken });
      const res = createMockResponse();

      await adminStatsHandler(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.data.counts).toBeDefined();
      expect(res.data.scheduler.status).toBe("ACTIVE");
      expect(res.data.roles.length).toBe(3);
    });
  });
});
