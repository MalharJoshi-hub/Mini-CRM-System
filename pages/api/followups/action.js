import pool from "../../../lib/db.js";
import { verifyToken } from "../../../lib/auth.js";

export default async function handler(req, res) {
  try {
    verifyToken(req);

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { customer_id, action } = req.body;

    if (!customer_id || !action) {
      return res.status(400).json({ error: "Missing data" });
    }

    let note = "";

    if (action === "CALL_CUSTOMER") {
      note = "AI Follow-up Call Done";
    } else if (action === "EMAIL_CUSTOMER") {
      note = "AI Follow-up Email Sent";
    } else {
      note = "AI Follow-up Ignored";
    }

    await pool.query(
      `
      INSERT INTO interactions (customer_id, interaction_date, notes)
      VALUES ($1, CURRENT_DATE, $2)
      `,
      [customer_id, note]
    );

    res.status(200).json({ message: "Action logged successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}