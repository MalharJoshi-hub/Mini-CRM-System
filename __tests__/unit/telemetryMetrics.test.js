/**
 * Telemetry Metrics & Operational Monitoring Test Suite
 * Tests query duration calculation, telemetry logging flags, and latency tracking.
 */

import pool, { query, checkHealth } from "../../lib/db.js";

describe("Telemetry Metrics & Query Performance Tracking", () => {
  let querySpy;

  beforeEach(() => {
    querySpy = jest.spyOn(pool, "query");
  });

  afterEach(() => {
    querySpy.mockRestore();
  });

  test("calculates positive query duration across execution", async () => {
    querySpy.mockImplementation(async () => {
      // Simulate 5ms processing time
      await new Promise((resolve) => setTimeout(resolve, 5));
      return { rows: [{ id: 1 }], rowCount: 1 };
    });

    const start = Date.now();
    const result = await query("SELECT 1");
    const totalDuration = Date.now() - start;

    expect(result.rowCount).toBe(1);
    expect(totalDuration).toBeGreaterThanOrEqual(4);
  });

  test("health check returns positive latency measurement", async () => {
    querySpy.mockResolvedValueOnce({ rows: [{ health: 1 }] });

    const health = await checkHealth();
    expect(health.status).toBe("healthy");
    expect(typeof health.latencyMs).toBe("number");
    expect(health.latencyMs).toBeGreaterThanOrEqual(0);
  });

  test("respects DEBUG_SQL environment variable toggle", async () => {
    const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    process.env.DEBUG_SQL = "true";

    querySpy.mockResolvedValueOnce({ rows: [{ id: 1 }], rowCount: 1 });
    await query("SELECT NOW()");

    expect(consoleLogSpy).toHaveBeenCalledWith(
      "Executed query",
      expect.objectContaining({ text: "SELECT NOW()", rows: 1 })
    );

    delete process.env.DEBUG_SQL;
    consoleLogSpy.mockRestore();
  });
});
