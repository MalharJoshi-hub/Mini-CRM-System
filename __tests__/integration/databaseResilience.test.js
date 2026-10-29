import pool, { query, checkHealth } from "../../lib/db.js";

describe("Database Resilience, Transactions & Pool Integrity", () => {
  let querySpy;

  beforeEach(() => {
    querySpy = jest.spyOn(pool, "query");
  });

  afterEach(() => {
    querySpy.mockRestore();
  });

  describe("query() wrapper telemetry and error wrapping", () => {
    test("successfully forwards query parameters and returns query results", async () => {
      const mockResult = { rows: [{ id: 1, name: "Customer One" }], rowCount: 1 };
      querySpy.mockResolvedValueOnce(mockResult);

      const res = await query("SELECT * FROM customers WHERE id = $1", [1]);
      expect(res.rows[0].name).toBe("Customer One");
      expect(querySpy).toHaveBeenCalledWith("SELECT * FROM customers WHERE id = $1", [1]);
    });

    test("wraps and rethrows database query exceptions with diagnostics", async () => {
      querySpy.mockRejectedValueOnce(new Error("FATAL: terminating connection due to administrator command"));

      await expect(query("SELECT * FROM broken_table")).rejects.toThrow("terminating connection");
    });
  });

  describe("checkHealth() diagnostic monitor", () => {
    test("reports healthy status and positive latency metric", async () => {
      querySpy.mockResolvedValueOnce({ rows: [{ health: 1 }] });

      const health = await checkHealth();
      expect(health.status).toBe("healthy");
      expect(typeof health.latencyMs).toBe("number");
      expect(health.latencyMs).toBeGreaterThanOrEqual(0);
    });

    test("propagates error when health check fails", async () => {
      querySpy.mockRejectedValueOnce(new Error("Database offline"));

      await expect(checkHealth()).rejects.toThrow("Database offline");
    });
  });

  describe("SQL Injection Resistance & Safe Parameterization", () => {
    test("safely escapes standard SQL injection payloads via parameters", async () => {
      const maliciousPayload = "' OR '1'='1";
      querySpy.mockResolvedValueOnce({ rows: [] });

      await query("SELECT * FROM customers WHERE email = $1", [maliciousPayload]);
      expect(querySpy).toHaveBeenCalledWith(
        "SELECT * FROM customers WHERE email = $1",
        ["' OR '1'='1"]
      );
    });

    test("safely handles stacked query injection attempts", async () => {
      const stackedQueryPayload = "test@company.com'; DROP TABLE customers; --";
      querySpy.mockResolvedValueOnce({ rows: [] });

      await query("SELECT * FROM users WHERE email = $1", [stackedQueryPayload]);
      expect(querySpy).toHaveBeenCalledWith(
        "SELECT * FROM users WHERE email = $1",
        [stackedQueryPayload]
      );
    });

    test("safely handles blind boolean injection strings", async () => {
      const booleanPayload = "1 UNION SELECT username, password FROM users--";
      querySpy.mockResolvedValueOnce({ rows: [] });

      await query("SELECT * FROM customers WHERE id = $1", [booleanPayload]);
      expect(querySpy).toHaveBeenCalledWith(
        "SELECT * FROM customers WHERE id = $1",
        [booleanPayload]
      );
    });
  });

  describe("Simulated Transaction Lifecycle", () => {
    test("executes BEGIN -> COMMIT sequence for batch operations", async () => {
      querySpy
        .mockResolvedValueOnce({ command: "BEGIN" })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockResolvedValueOnce({ command: "COMMIT" });

      await pool.query("BEGIN");
      await pool.query("INSERT INTO customers (name, email) VALUES ($1, $2)", ["Client A", "a@test.com"]);
      await pool.query("INSERT INTO audit_logs (action) VALUES ($1)", ["CLIENT_CREATED"]);
      await pool.query("COMMIT");

      expect(querySpy).toHaveBeenCalledTimes(4);
      expect(querySpy.mock.calls[0][0]).toBe("BEGIN");
      expect(querySpy.mock.calls[3][0]).toBe("COMMIT");
    });

    test("executes ROLLBACK when intermediate operation fails", async () => {
      querySpy
        .mockResolvedValueOnce({ command: "BEGIN" })
        .mockResolvedValueOnce({ rowCount: 1 })
        .mockRejectedValueOnce(new Error("Constraint violation"))
        .mockResolvedValueOnce({ command: "ROLLBACK" });

      let transactionFailed = false;

      try {
        await pool.query("BEGIN");
        await pool.query("INSERT INTO customers (name, email) VALUES ($1, $2)", ["Client B", "b@test.com"]);
        await pool.query("INSERT INTO interactions (customer_id) VALUES ($1)", [99999]); // Invalid FK
        await pool.query("COMMIT");
      } catch (err) {
        transactionFailed = true;
        await pool.query("ROLLBACK");
      }

      expect(transactionFailed).toBe(true);
      expect(querySpy).toHaveBeenCalledWith("ROLLBACK");
    });
  });
});
