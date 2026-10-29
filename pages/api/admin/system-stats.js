import pool, { checkHealth } from "../../../lib/db";
import { verifyToken, hasRole } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const caller = verifyToken(req);
    if (!hasRole(caller, "admin")) {
      return res.status(403).json({ error: "Forbidden: Administrator role required" });
    }

    let health = { healthy: false, latencyMs: 0 };
    try {
      health = await checkHealth();
    } catch (hErr) {
      health = { healthy: false, error: hErr.message };
    }

    let counts = { users: 0, customers: 0, interactions: 0, followups: 0, auditLogs: 0 };
    try {
      if (pool && typeof pool.query === "function") {
        const [u, c, i, f, a] = await Promise.all([
          pool.query("SELECT COUNT(*) FROM users"),
          pool.query("SELECT COUNT(*) FROM customers"),
          pool.query("SELECT COUNT(*) FROM interactions"),
          pool.query("SELECT COUNT(*) FROM followups"),
          pool.query("SELECT COUNT(*) FROM audit_logs").catch(() => ({ rows: [{ count: 0 }] })),
        ]);
        counts = {
          users: parseInt(u.rows[0].count, 10),
          customers: parseInt(c.rows[0].count, 10),
          interactions: parseInt(i.rows[0].count, 10),
          followups: parseInt(f.rows[0].count, 10),
          auditLogs: parseInt(a.rows[0].count, 10),
        };
      }
    } catch (countErr) {
      // In-memory or test fallback
    }

    return res.status(200).json({
      health,
      counts,
      scheduler: {
        status: "ACTIVE",
        interval: "Daily (Every 24 Hours)",
        targetActionQueue: "Dormant accounts uncontacted >7 days",
      },
      roles: [
        { key: "admin", label: "Administrator", description: "Full system governance, audit logs, and user roles" },
        { key: "manager", label: "Account Manager", description: "Portfolio churn risk, executive escalations, and retention" },
        { key: "agent", label: "Sales Agent", description: "Frontline lead capture, daily outreach tasks, and touchpoint logging" },
      ],
    });
  } catch (error) {
    return res.status(401).json({ error: error.message });
  }
}
