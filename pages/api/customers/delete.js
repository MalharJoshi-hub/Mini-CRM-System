import pool from "../../../lib/db";
import { verifyToken, hasRole } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const user = verifyToken(req);

    if (!hasRole(user, "admin")) {
      return res.status(403).json({ error: "Forbidden: Customer deletion requires administrator role" });
    }

    const { id } = req.body;

    await pool.query("DELETE FROM customers WHERE id=$1", [id]);

    res.status(200).json({ message: "Customer deleted successfully" });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
}