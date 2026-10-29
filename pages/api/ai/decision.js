import pool from "../../../lib/db.js";
import { verifyToken } from "../../../lib/auth.js";
import { decideAction } from "../../../lib/decisionEngine.js"

export default async function handler(req, res) {
  try {
    verifyToken(req);

    const result = await pool.query(`
      SELECT
  c.id,
  c.name,
  COALESCE(MAX(i.interaction_date), CURRENT_DATE) AS last_contact,
  COUNT(i.id) AS interaction_count,
  COALESCE((CURRENT_DATE - MAX(i.interaction_date)), 0) AS days_since_last_contact,

  GREATEST(
    0,
    LEAST(
      100,
      COALESCE((CURRENT_DATE - MAX(i.interaction_date)), 0) * 4
      - COUNT(i.id) * 2
    )
  ) AS churn_score,

  (
    COUNT(i.id) * 2 +
    COALESCE((CURRENT_DATE - MAX(i.interaction_date)), 0)
  ) AS priority_score

FROM customers c
LEFT JOIN interactions i ON c.id = i.customer_id
GROUP BY c.id
      
    `);

    const enriched = result.rows.map(c => {
      const decision = decideAction(c);

      return {
        ...c,
        churn_score: Number(c.churn_score),
        priority_score: Number(c.priority_score),
        ai_level: decision.level,
        ai_action: decision.action,
        ai_reason: decision.reason
      };
    });

    res.status(200).json(enriched);

  } catch (err) {
    console.error("AI DECISION ERROR:", err);
    res.status(500).json({ error: err.message });
  }
}