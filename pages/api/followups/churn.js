import pool from "../../../lib/db.js";
import { verifyToken } from "../../../lib/auth.js";
import { decideAction } from "../../../lib/decisionEngine.js";

export default async function handler(req, res) {
  try {
    verifyToken(req);

    const result = await pool.query(`
      SELECT 
        c.id,
        c.name,
        MAX(i.interaction_date) AS last_contact,
        COUNT(i.id) AS interaction_count,
        (CURRENT_DATE - MAX(i.interaction_date)) AS days_since_last_contact,

        (
          COUNT(i.id) * 2 +
          (CURRENT_DATE - MAX(i.interaction_date))
        ) AS priority_score,

        (
          (CURRENT_DATE - MAX(i.interaction_date)) * 2 +
          (10 - COUNT(i.id)) * 3
        ) AS churn_score

      FROM customers c
      LEFT JOIN interactions i ON c.id = i.customer_id
      GROUP BY c.id
      HAVING MAX(i.interaction_date) IS NOT NULL
      ORDER BY churn_score DESC
    `);

    const enriched = result.rows.map(c => {
      const decision = decideAction(c);

      return {
        ...c,
        churn_score: Number(c.churn_score),
        priority_score: Number(c.priority_score),
        days_since_last_contact: Number(c.days_since_last_contact),
        ai_level: decision.level,
        ai_action: decision.action,
        ai_reason: decision.reason
      };
    });

    res.status(200).json(enriched);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}