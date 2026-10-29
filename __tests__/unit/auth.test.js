import jwt from "jsonwebtoken";
import {
  generateToken,
  verifyToken,
  hasRole,
  sanitizeUser,
} from "../../lib/auth.js";

describe("Authentication & Authorization Unit Tests (Layer 1)", () => {
  const mockUser = {
    id: 42,
    name: "Alex Agent",
    email: "alex@minicrm.io",
    role: "agent",
    password: "$2b$10$encryptedpasswordhashhere",
  };

  describe("generateToken()", () => {
    test("generates a valid signed JWT string containing user claims", () => {
      const token = generateToken(mockUser);
      expect(typeof token).toBe("string");

      const decoded = jwt.decode(token);
      expect(decoded.id).toBe(42);
      expect(decoded.name).toBe("Alex Agent");
      expect(decoded.email).toBe("alex@minicrm.io");
      expect(decoded.role).toBe("agent");
      expect(decoded.exp).toBeDefined();
    });

    test("defaults role to 'user' if not specified in user object", () => {
      const token = generateToken({ id: 10, email: "plain@user.com" });
      const decoded = jwt.decode(token);
      expect(decoded.role).toBe("user");
    });

    test("supports custom expiration durations", () => {
      const token = generateToken(mockUser, "1h");
      const decoded = jwt.decode(token);
      const validityPeriodSeconds = decoded.exp - decoded.iat;
      expect(validityPeriodSeconds).toBe(3600);
    });
  });

  describe("verifyToken()", () => {
    test("successfully verifies and returns decoded payload for valid token", () => {
      const token = generateToken(mockUser);
      const req = {
        headers: {
          authorization: `Bearer ${token}`,
        },
      };

      const verified = verifyToken(req);
      expect(verified.id).toBe(42);
      expect(verified.email).toBe("alex@minicrm.io");
    });

    test("throws descriptive error when authorization header is completely missing", () => {
      const req = { headers: {} };
      expect(() => verifyToken(req)).toThrow("No token provided");
    });

    test("throws error when req or req.headers is undefined", () => {
      expect(() => verifyToken({})).toThrow("No token provided");
    });

    test("throws error when authorization header is malformed (missing Bearer prefix)", () => {
      const req = {
        headers: {
          authorization: "Basic somecredentialshere",
        },
      };
      expect(() => verifyToken(req)).toThrow("Malformed authorization header");
    });

    test("throws error when authorization header has too many segments", () => {
      const req = {
        headers: {
          authorization: "Bearer token extra segments",
        },
      };
      expect(() => verifyToken(req)).toThrow("Malformed authorization header");
    });

    test("rejects token signed with an invalid or mismatched secret", () => {
      const invalidToken = jwt.sign(
        { id: 99, email: "hacker@evil.com" },
        "wrong-secret-key"
      );
      const req = {
        headers: {
          authorization: `Bearer ${invalidToken}`,
        },
      };

      expect(() => verifyToken(req)).toThrow();
    });

    test("rejects expired JWT token", () => {
      const expiredToken = jwt.sign(
        { id: 1, email: "test@domain.com" },
        process.env.JWT_SECRET || "supersecretkey",
        { expiresIn: "-10s" }
      );
      const req = {
        headers: {
          authorization: `Bearer ${expiredToken}`,
        },
      };

      expect(() => verifyToken(req)).toThrow();
    });
  });

  describe("hasRole() - Role-Based Access Control", () => {
    test("returns true when user has exact matching role", () => {
      expect(hasRole({ role: "agent" }, "agent")).toBe(true);
      expect(hasRole({ role: "manager" }, "manager")).toBe(true);
    });

    test("returns true if role is included in allowed role array", () => {
      expect(hasRole({ role: "agent" }, ["admin", "manager", "agent"])).toBe(true);
    });

    test("admin role always passes any role check", () => {
      expect(hasRole({ role: "admin" }, "agent")).toBe(true);
      expect(hasRole({ role: "admin" }, "finance")).toBe(true);
    });

    test("returns false when user lacks required role", () => {
      expect(hasRole({ role: "user" }, "admin")).toBe(false);
      expect(hasRole({ role: "agent" }, "admin")).toBe(false);
    });

    test("returns false for undefined or malformed user", () => {
      expect(hasRole(null, "admin")).toBe(false);
      expect(hasRole({}, "admin")).toBe(false);
    });
  });

  describe("sanitizeUser()", () => {
    test("removes password hash from user entity before public serialization", () => {
      const sanitized = sanitizeUser(mockUser);
      expect(sanitized.password).toBeUndefined();
      expect(sanitized.id).toBe(42);
      expect(sanitized.email).toBe("alex@minicrm.io");
    });

    test("returns null if passed null or undefined entity", () => {
      expect(sanitizeUser(null)).toBeNull();
      expect(sanitizeUser(undefined)).toBeNull();
    });

    test("leaves other properties untouched", () => {
      const user = { id: 1, name: "Test", metadata: { key: "value" } };
      expect(sanitizeUser(user)).toEqual(user);
    });
  });
});
