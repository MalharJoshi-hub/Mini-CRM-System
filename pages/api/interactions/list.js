import pool from "../../../lib/db";
import { verifyToken } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    verifyToken(req);

    const { customer_id } = req.query;

    const result = await pool.query(
      "SELECT * FROM interactions WHERE customer_id = $1 ORDER BY interaction_date DESC",
      [customer_id]
    );

    res.status(200).json(result.rows);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
}