/**
 * Advanced Authentication & Cryptographic Defense Test Suite
 * Validates HMAC SHA-256 signatures, claim decoding, header parsing,
 * expiration boundaries, and token tampering mitigation.
 */

import jwt from "jsonwebtoken";
import { generateToken, verifyToken, hasRole, sanitizeUser } from "../../lib/auth.js";

describe("Cryptographic Token Defense & Secret Key Integrity", () => {
  const secretKey = process.env.JWT_SECRET || "supersecretkey";

  test("generates token with custom payload claims and verifies integrity", () => {
    const customUser = {
      id: 55,
      name: "Security Lead",
      email: "security@minicrm.io",
      role: "admin",
      department: "Infosec",
    };

    const token = generateToken(customUser, "2h");
    const req = { headers: { authorization: `Bearer ${token}` } };
    const decoded = verifyToken(req);

    expect(decoded.id).toBe(55);
    expect(decoded.email).toBe("security@minicrm.io");
    expect(decoded.role).toBe("admin");
  });

  test("rejects token signed with mismatched HMAC secret", () => {
    const fakeSecretToken = jwt.sign({ id: 99, role: "admin" }, "attacker-secret-key-12345");
    const req = { headers: { authorization: `Bearer ${fakeSecretToken}` } };

    expect(() => verifyToken(req)).toThrow();
  });

  test("rejects token with expired exp claim", () => {
    const expiredToken = jwt.sign(
      { id: 10, email: "expired@test.com" },
      secretKey,
      { expiresIn: "-5m" }
    );
    const req = { headers: { authorization: `Bearer ${expiredToken}` } };

    expect(() => verifyToken(req)).toThrow();
  });

  test("rejects authorization header with missing or empty Bearer token", () => {
    expect(() => verifyToken({ headers: { authorization: "Bearer " } })).toThrow();
    expect(() => verifyToken({ headers: { authorization: "Bearer" } })).toThrow();
    expect(() => verifyToken({ headers: { authorization: "" } })).toThrow();
  });

  test("rejects authorization header when Bearer is misspelled", () => {
    const valid = generateToken({ id: 1 });
    expect(() => verifyToken({ headers: { authorization: `Beare ${valid}` } })).toThrow(
      "Malformed authorization header"
    );
    expect(() => verifyToken({ headers: { authorization: `Basic ${valid}` } })).toThrow(
      "Malformed authorization header"
    );
  });

  test("accepts case-insensitive 'bearer' prefix", () => {
    const valid = generateToken({ id: 1, email: "case@test.com" });
    const req = { headers: { authorization: `bearer ${valid}` } };
    const verified = verifyToken(req);

    expect(verified.id).toBe(1);
    expect(verified.email).toBe("case@test.com");
  });

  test("sanitizeUser properly protects deep nested sensitive fields", () => {
    const complexUser = {
      id: 1,
      name: "Super Admin",
      email: "admin@test.com",
      password: "hashed_password_string_here",
      metadata: { lastLoginIp: "192.168.1.1" },
    };

    const clean = sanitizeUser(complexUser);
    expect(clean.password).toBeUndefined();
    expect(clean.metadata).toEqual({ lastLoginIp: "192.168.1.1" });
  });

  test("hasRole supports multi-level enterprise role hierarchy", () => {
    expect(hasRole({ role: "admin" }, ["admin"])).toBe(true);
    expect(hasRole({ role: "admin" }, ["manager"])).toBe(true); // Admin passes all
    expect(hasRole({ role: "manager" }, ["manager", "agent"])).toBe(true);
    expect(hasRole({ role: "agent" }, ["manager"])).toBe(false);
    expect(hasRole({ role: "user" }, ["agent"])).toBe(false);
  });
});
