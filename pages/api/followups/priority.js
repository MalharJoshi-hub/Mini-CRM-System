import pool from "../../../lib/db.js";
import { verifyToken } from "../../../lib/auth.js";

export default async function handler(req, res) {
  try {
    verifyToken(req);

    const result = await pool.query(`
      SELECT 
  c.id,
  c.name,

  COALESCE(MAX(i.interaction_date), CURRENT_DATE) AS last_contact,

  COUNT(i.id) AS interaction_count,

  (CURRENT_DATE - COALESCE(MAX(i.interaction_date), CURRENT_DATE))
  AS days_since_last_contact,

  (
    COUNT(i.id) * 2 +
    (CURRENT_DATE - COALESCE(MAX(i.interaction_date), CURRENT_DATE))
  ) AS priority_score,

  CASE
    WHEN (
        COUNT(i.id) * 2 +
        (CURRENT_DATE - COALESCE(MAX(i.interaction_date), CURRENT_DATE))
    ) >= 25 THEN 'URGENT_CALL'

    WHEN (
        COUNT(i.id) * 2 +
        (CURRENT_DATE - COALESCE(MAX(i.interaction_date), CURRENT_DATE))
    ) >= 18 THEN 'CALL'

    WHEN (
        COUNT(i.id) * 2 +
        (CURRENT_DATE - COALESCE(MAX(i.interaction_date), CURRENT_DATE))
    ) >= 12 THEN 'EMAIL_OFFER'

    WHEN (
        COUNT(i.id) * 2 +
        (CURRENT_DATE - COALESCE(MAX(i.interaction_date), CURRENT_DATE))
    ) >= 7 THEN 'EMAIL_REMINDER'

    ELSE 'SAFE'
  END AS action

FROM customers c
LEFT JOIN interactions i ON c.id = i.customer_id
GROUP BY c.id
ORDER BY priority_score DESC
    `);

    res.status(200).json(result.rows);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}