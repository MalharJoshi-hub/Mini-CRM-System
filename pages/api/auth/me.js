import pool from "../../../lib/db";
import { verifyToken, generateToken } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const claims = verifyToken(req);
    const userId = claims.userId || claims.id;

    if (req.method === "GET") {
      // Fetch latest profile from DB if available
      try {
        if (pool && typeof pool.query === "function") {
          const result = await pool.query(
            "SELECT id, name, email, role, is_active FROM users WHERE id = $1",
            [userId]
          );
          if (result.rows.length > 0) {
            return res.status(200).json({ user: result.rows[0] });
          }
        }
      } catch (err) {
        // Fallback to token claims
      }

      return res.status(200).json({
        user: {
          id: userId,
          name: claims.name || "CRM Operator",
          email: claims.email || "operator@minicrm.io",
          role: claims.role || "agent",
          is_active: true,
        },
      });
    }

    if (req.method === "POST") {
      // Allows active role simulation for evaluation/testing
      const { role } = req.body;
      const allowedRoles = ["agent", "manager", "admin"];
      const targetRole = allowedRoles.includes(role) ? role : "agent";

      const updatedUser = {
        id: userId,
        name: claims.name || "CRM Operator",
        email: claims.email || "operator@minicrm.io",
        role: targetRole,
      };

      const newToken = generateToken(updatedUser, "7d");

      return res.status(200).json({
        message: `Role switched to ${targetRole}`,
        token: newToken,
        user: updatedUser,
      });
    }
  } catch (error) {
    return res.status(401).json({ error: error.message });
  }
}
