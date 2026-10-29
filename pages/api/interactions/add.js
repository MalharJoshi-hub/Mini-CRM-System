import pool from "../../../lib/db";
import { verifyToken } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    verifyToken(req);

    const { customer_id, interaction_date, notes } = req.body;

    const result = await pool.query(
      "INSERT INTO interactions (customer_id, interaction_date, notes) VALUES ($1, $2, $3) RETURNING *",
      [customer_id, interaction_date, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
}