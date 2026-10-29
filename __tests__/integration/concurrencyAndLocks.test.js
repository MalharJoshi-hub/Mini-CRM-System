/**
 * Integration: Concurrency, Thread Safety & Race Condition Defenses
 * Validates system resilience under simulated concurrent API hits,
 * parallel token validations, and rapid state transitions.
 */

import pool from "../../lib/db.js";
import { generateToken, verifyToken } from "../../lib/auth.js";
import { calculateChurnScore, calculatePriorityScore, decideAction } from "../../lib/decisionEngine.js";
import { logEvent, getRecentAuditLogs, clearAuditLogs } from "../../lib/auditLogger.js";

describe("Concurrency, High-Parallelism & State Race Defenses", () => {
  let querySpy;

  beforeEach(() => {
    clearAuditLogs();
    querySpy = jest.spyOn(pool, "query");
  });

  afterEach(() => {
    querySpy.mockRestore();
  });

  describe("Simultaneous JWT Issuance & Verification Concurrency", () => {
    test("handles 100 concurrent token signatures and verifications without collision", async () => {
      const users = [];
      for (let i = 1; i <= 100; i++) {
        users.push({
          id: i,
          name: `Operator User #${i}`,
          email: `operator${i}@minicrm.io`,
          role: i % 10 === 0 ? "admin" : "agent",
        });
      }

      // Parallel signing
      const tokens = await Promise.all(
        users.map(async (u) => ({
          user: u,
          token: generateToken(u, "1h"),
        }))
      );

      expect(tokens).toHaveLength(100);

      // Parallel verification
      const verifiedUsers = await Promise.all(
        tokens.map(async ({ user, token }) => {
          const req = { headers: { authorization: `Bearer ${token}` } };
          const payload = verifyToken(req);
          return { original: user, verified: payload };
        })
      );

      for (const { original, verified } of verifiedUsers) {
        expect(verified.id).toBe(original.id);
        expect(verified.email).toBe(original.email);
        expect(verified.role).toBe(original.role);
      }
    });
  });

  describe("Parallel Interaction Ingestion & Race Mitigation", () => {
    test("simulates 50 parallel interactions logged for a single customer", async () => {
      const customerId = 42;
      querySpy.mockResolvedValue({ rowCount: 1 });

      const interactionPromises = [];

      for (let i = 1; i <= 50; i++) {
        interactionPromises.push(
          (async () => {
            await pool.query(
              "INSERT INTO interactions (customer_id, interaction_date, notes) VALUES ($1, CURRENT_DATE, $2)",
              [customerId, `Concurrent Touchpoint #${i}`]
            );
            return logEvent({
              action: "INTERACTION_LOGGED",
              customerId,
              metadata: { seq: i },
            });
          })()
        );
      }

      const results = await Promise.all(interactionPromises);
      expect(results).toHaveLength(50);
      expect(querySpy).toHaveBeenCalledTimes(50);

      const logs = getRecentAuditLogs({ customerId, limit: 100 });
      expect(logs).toHaveLength(50);
    });
  });

  describe("Concurrent Decision Calculation Under Fluctuating Metrics", () => {
    test("consistently outputs deterministic decisions under parallel matrix evaluation", async () => {
      const scenarios = [];

      for (let i = 0; i < 200; i++) {
        const churn = i % 100;
        const priority = (i * 2) % 40;
        const days = i % 60;
        scenarios.push({
          id: i,
          churn_score: churn,
          priority_score: priority,
          days_since_last_contact: days,
        });
      }

      const decisions = await Promise.all(
        scenarios.map(async (account) => decideAction(account))
      );

      expect(decisions).toHaveLength(200);

      // Verify that decisions match synchronous evaluation identically
      for (let i = 0; i < 200; i++) {
        const syncDecision = decideAction(scenarios[i]);
        expect(decisions[i]).toEqual(syncDecision);
      }
    });
  });

  describe("High-Frequency Audit Buffer Contention", () => {
    test("maintains memory buffer bounds under burst of 600 concurrent logs", async () => {
      const burstPromises = [];

      for (let i = 1; i <= 600; i++) {
        burstPromises.push(
          logEvent({
            action: `BURST_EVENT_${i}`,
            metadata: { iteration: i },
          })
        );
      }

      await Promise.all(burstPromises);

      // Buffer has MAX_MEMORY_LOGS = 500
      const recent = getRecentAuditLogs({ limit: 1000 });
      expect(recent.length).toBeLessThanOrEqual(500);
      expect(recent.length).toBe(500);
    });
  });
});
