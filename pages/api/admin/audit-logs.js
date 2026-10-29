import pool from "../../../lib/db";
import { verifyToken, hasRole } from "../../../lib/auth";
import { getRecentAuditLogs } from "../../../lib/auditLogger";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const caller = verifyToken(req);
    if (!hasRole(caller, "admin")) {
      return res.status(403).json({ error: "Forbidden: Administrator role required" });
    }

    try {
      if (pool && typeof pool.query === "function") {
        const result = await pool.query(
          "SELECT id, action, level, user_id, customer_id, metadata, created_at FROM audit_logs ORDER BY id DESC LIMIT 100"
        );
        return res.status(200).json({ logs: result.rows });
      }
    } catch (dbErr) {
      // Fallback to in-memory store if DB query fails or table is empty
    }

    const memoryLogs = getRecentAuditLogs({ limit: 100 });
    return res.status(200).json({ logs: memoryLogs });
  } catch (error) {
    return res.status(401).json({ error: error.message });
  }
}
