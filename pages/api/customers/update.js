import pool from "../../../lib/db";
import { verifyToken } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    verifyToken(req);

    const { id, name, email, phone } = req.body;

    const result = await pool.query(
      "UPDATE customers SET name=$1, email=$2, phone=$3 WHERE id=$4 RETURNING *",
      [name, email, phone, id]
    );

    res.status(200).json(result.rows[0]);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
}