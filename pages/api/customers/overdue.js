import pool from "../../../lib/db";
import { verifyToken } from "../../../lib/auth";

export default async function handler(req, res) {
  try {
    verifyToken(req);

    const result = await pool.query(`
      SELECT 
        c.id,
        c.name,
        MAX(i.interaction_date) AS last_contact
      FROM customers c
      LEFT JOIN interactions i 
        ON c.id = i.customer_id
      GROUP BY c.id
      HAVING 
        MAX(i.interaction_date) < CURRENT_DATE - INTERVAL '7 days'
        OR MAX(i.interaction_date) IS NULL
      ORDER BY last_contact ASC
    `);

    res.status(200).json(result.rows);

  } catch (err) {
    res.status(401).json({ error: err.message });
  }
}