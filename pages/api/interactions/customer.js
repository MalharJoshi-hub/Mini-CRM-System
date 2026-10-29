import pool from "../../../lib/db";
import { verifyToken } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    verifyToken(req);

    const customerId = req.query.id || req.query.customer_id;

    const result = await pool.query(
      "SELECT * FROM interactions WHERE customer_id = $1 ORDER BY interaction_date DESC",
      [customerId]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    res.status(401).json({ error: err.message });
  }
}