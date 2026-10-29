import pool from "../../../lib/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export default async function handler(req, res)
{
  if (req.method !== "POST") 
    {
        return res.status(405).json({ message: "Method not allowed" });
    }

  const { email, password } = req.body;

  try 
  {
    const result = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) 
    {
      return res.status(401).json({ message: "User not found" });
    }

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) 
    {
      return res.status(401).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}