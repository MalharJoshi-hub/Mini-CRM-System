import jwt from "jsonwebtoken";

const DEFAULT_SECRET = "supersecretkey";

/**
 * Extracts and verifies JWT bearer token from HTTP request headers.
 * @param {import('next').NextApiRequest} req - Inbound API request
 * @returns {object} Decoded JWT payload
 * @throws {Error} If header missing or token invalid
 */
export function verifyToken(req) {
  const authHeader = req.headers?.authorization;

  if (!authHeader) {
    throw new Error("No token provided");
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    throw new Error("Malformed authorization header");
  }

  const token = parts[1];
  const secret = process.env.JWT_SECRET || DEFAULT_SECRET;

  return jwt.verify(token, secret);
}

/**
 * Generates a signed JWT authentication token for a verified user.
 * @param {object} user - User object containing id, email, and role
 * @param {string} [expiresIn="24h"] - Expiry duration
 * @returns {string} Signed JWT token string
 */
export function generateToken(user, expiresIn = "24h") {
  const secret = process.env.JWT_SECRET || DEFAULT_SECRET;
  const payload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role || "user",
  };

  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Validates whether the authenticated user has the necessary role privilege.
 * @param {object} user - Decoded JWT user payload
 * @param {string|string[]} requiredRoles - Allowed role(s)
 * @returns {boolean} True if authorized
 */
export function hasRole(user, requiredRoles) {
  if (!user || !user.role) return false;
  const allowed = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  return allowed.includes(user.role) || user.role === "admin";
}

/**
 * Strips sensitive fields (such as hashed passwords) from a user entity.
 * @param {object} user - Raw database user record
 * @returns {object} Sanitized public user profile
 */
export function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}