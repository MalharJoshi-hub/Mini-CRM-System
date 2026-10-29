import pool from "../../../lib/db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export default async function handler(req, res)
{
    if(req.method !== "POST")
    {
        return res.status(405).json({ message: "Method not allowed"});
    }

    const {name, email, password} = req.body;

    try{
        const hasedPassword = await bcrypt.hash(password, 10);
        
        const result = await pool.query("INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id, name, email", [name, email, hasedPassword]);

        const user = result.rows[0];
        const token = jwt.sign(
            { userId: user.id, role: user.role || "agent" },
            process.env.JWT_SECRET || "crm-secret-jwt-key-production-ready",
            { expiresIn: "7d" }
        );

        res.status(201).json({ ...user, token });
    } catch (error) {
        res.status(500).json({error: error.message});
    }
}