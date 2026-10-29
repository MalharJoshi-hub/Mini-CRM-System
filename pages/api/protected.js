import { verifyToken } from "../../lib/auth";

export default function handler(req, res) {
  try {
    const user = verifyToken(req);

    res.status(200).json({
      message: "Protected route accessed",
      user,
    });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
}