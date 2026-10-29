import jwt from "jsonwebtoken";
import { verifyToken, hasRole, sanitizeUser } from "../../lib/auth.js";
import { sanitizeString, validateCustomerInput } from "../../lib/validators.js";

describe("Security Audit & Vulnerability Defense Test Suite", () => {
  const secretKey = process.env.JWT_SECRET || "supersecretkey";

  describe("Cryptographic Token Defense & Tamper Resistance", () => {
    test("rejects tokens with forged signature payload", () => {
      const legitToken = jwt.sign({ id: 1, role: "agent" }, secretKey);
      const parts = legitToken.split(".");

      // Modify payload part
      const forgedPayload = Buffer.from(JSON.stringify({ id: 1, role: "admin" })).toString("base64url");
      const tamperedToken = `${parts[0]}.${forgedPayload}.${parts[2]}`;

      const req = { headers: { authorization: `Bearer ${tamperedToken}` } };
      expect(() => verifyToken(req)).toThrow();
    });

    test("rejects tokens crafted with 'none' algorithm bypass attempt", () => {
      const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
      const payload = Buffer.from(JSON.stringify({ id: 999, role: "admin" })).toString("base64url");
      const insecureToken = `${header}.${payload}.`;

      const req = { headers: { authorization: `Bearer ${insecureToken}` } };
      expect(() => verifyToken(req)).toThrow();
    });

    test("rejects tokens signed with unauthorized keys", () => {
      const unauthorizedSecretToken = jwt.sign({ id: 1 }, "unauthorized_foreign_secret_key");
      const req = { headers: { authorization: `Bearer ${unauthorizedSecretToken}` } };
      expect(() => verifyToken(req)).toThrow();
    });
  });

  describe("Role Privilege & Authorization Escalation Defense", () => {
    test("denies standard agent access to administrator-only operations", () => {
      const agentUser = { id: 12, name: "Agent Bob", role: "agent" };
      expect(hasRole(agentUser, "admin")).toBe(false);
      expect(hasRole(agentUser, ["admin", "superadmin"])).toBe(false);
    });

    test("denies unprivileged user access to agent queue operations", () => {
      const basicUser = { id: 30, name: "Customer Portal User", role: "user" };
      expect(hasRole(basicUser, "agent")).toBe(false);
      expect(hasRole(basicUser, "manager")).toBe(false);
    });

    test("prevents role escalation via prototype pollution or empty payload", () => {
      expect(hasRole({}, "admin")).toBe(false);
      expect(hasRole({ role: null }, "admin")).toBe(false);
      expect(hasRole({ role: "__proto__" }, "admin")).toBe(false);
    });
  });

  describe("Sensitive Credential Exposure & Leakage Prevention", () => {
    test("strips hashed passwords, salts, and secret credentials from output objects", () => {
      const rawDbUser = {
        id: 7,
        name: "Admin User",
        email: "admin@minicrm.io",
        password: "$2b$10$e8wFqFkX8GzK91k2hP6JbO3n9uV8r1kLm0zQw9eR8tY7uI6oP5a",
        role: "admin",
        internal_salt: "randomsalt123",
      };

      const sanitized = sanitizeUser(rawDbUser);
      expect(sanitized.password).toBeUndefined();
      expect(sanitized.email).toBe("admin@minicrm.io");
      expect(JSON.stringify(sanitized)).not.toContain("$2b$10$");
    });
  });

  describe("Cross-Site Scripting (XSS) Sanitization Defense", () => {
    test("sanitizes HTML tags and script execution tokens from customer input", () => {
      const dirtyName = "<script>document.cookie='stolen'</script>Acme Corp";
      const clean = sanitizeString(dirtyName);

      expect(clean).not.toContain("<script>");
      expect(clean).not.toContain("</script>");
      expect(clean).toContain("Acme Corp");
    });

    test("sanitizes nested and malformed tag injections", () => {
      const complexXss = "<<SCRIPT>alert('pwned')//<</SCRIPT>";
      const clean = sanitizeString(complexXss);

      expect(clean).not.toContain("<");
      expect(clean).not.toContain(">");
    });

    test("validates customer input and rejects malformed email attack vectors", () => {
      const maliciousCustomer = {
        name: "Malicious Actor",
        email: 'attacker" onclick="alert(1)"@evil.com',
        phone: "+1-555-0199",
      };

      const result = validateCustomerInput(maliciousCustomer);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.includes("valid email"))).toBe(true);
    });
  });
});
