import pool from "../../../lib/db";
import { verifyToken, hasRole } from "../../../lib/auth";
import { logEvent, LOG_LEVELS } from "../../../lib/auditLogger";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const caller = verifyToken(req);
    if (!hasRole(caller, "admin")) {
      return res.status(403).json({ error: "Forbidden: Administrator role required" });
    }

    if (req.method === "GET") {
      const result = await pool.query(
        "SELECT id, name, email, role, is_active, created_at FROM users ORDER BY id ASC"
      );
      return res.status(200).json({ users: result.rows });
    }

    if (req.method === "PUT") {
      const { userId, role, is_active } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "Missing required parameter: userId" });
      }

      const result = await pool.query(
        `UPDATE users
         SET role = COALESCE($1, role),
             is_active = COALESCE($2, is_active),
             updated_at = NOW()
         WHERE id = $3
         RETURNING id, name, email, role, is_active, updated_at`,
        [role || null, is_active !== undefined ? is_active : null, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      await logEvent({
        action: "OPERATOR_ROLE_UPDATED",
        level: LOG_LEVELS.SECURITY,
        userId: caller.id || caller.userId,
        metadata: {
          targetUserId: userId,
          newRole: role,
          newActiveStatus: is_active,
        },
      });

      return res.status(200).json({
        message: "User successfully updated",
        user: result.rows[0],
      });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
