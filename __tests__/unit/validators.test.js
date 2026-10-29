import {
  isValidEmail,
  isValidPhone,
  sanitizeString,
  validateCustomerInput,
  validateInteractionInput,
  validateRegisterInput,
  validateLoginInput,
  validateFollowupActionInput,
} from "../../lib/validators.js";

describe("Validators & Input Sanitization Unit Tests", () => {
  describe("isValidEmail()", () => {
    test("accepts valid email formats", () => {
      expect(isValidEmail("user@example.com")).toBe(true);
      expect(isValidEmail("john.doe@company.co.uk")).toBe(true);
      expect(isValidEmail("sales+test@minicrm.io")).toBe(true);
    });

    test("rejects invalid email formats", () => {
      expect(isValidEmail("plainaddress")).toBe(false);
      expect(isValidEmail("@missingusername.com")).toBe(false);
      expect(isValidEmail("missingdomain@")).toBe(false);
      expect(isValidEmail("spaces in@domain.com")).toBe(false);
      expect(isValidEmail("")).toBe(false);
      expect(isValidEmail(null)).toBe(false);
      expect(isValidEmail(undefined)).toBe(false);
      expect(isValidEmail(12345)).toBe(false);
    });
  });

  describe("isValidPhone()", () => {
    test("accepts standard and international phone formats", () => {
      expect(isValidPhone("+1-555-123-4567")).toBe(true);
      expect(isValidPhone("5551234567")).toBe(true);
      expect(isValidPhone("+44 20 7946 0991")).toBe(true);
      expect(isValidPhone("(555) 234-5678")).toBe(true);
    });

    test("rejects invalid phone formats", () => {
      expect(isValidPhone("123")).toBe(false);
      expect(isValidPhone("letters-not-allowed")).toBe(false);
      expect(isValidPhone("")).toBe(false);
      expect(isValidPhone(null)).toBe(false);
    });
  });

  describe("sanitizeString()", () => {
    test("trims leading and trailing whitespace", () => {
      expect(sanitizeString("  trimmed string   ")).toBe("trimmed string");
    });

    test("strips potential HTML script tag brackets", () => {
      expect(sanitizeString("<script>alert('xss')</script>")).toBe("scriptalert('xss')/script");
      expect(sanitizeString("<b>Bold Name</b>")).toBe("bBold Name/b");
    });

    test("returns empty string for null, undefined, or non-string", () => {
      expect(sanitizeString(null)).toBe("");
      expect(sanitizeString(undefined)).toBe("");
      expect(sanitizeString(12345)).toBe("");
    });
  });

  describe("validateCustomerInput()", () => {
    test("passes valid customer object", () => {
      const valid = {
        name: "Acme Corporation",
        email: "contact@acme.com",
        phone: "+1-555-0100",
      };
      const res = validateCustomerInput(valid);
      expect(res.isValid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    test("fails when name is too short or missing", () => {
      const res = validateCustomerInput({ email: "valid@email.com", name: "A" });
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes("at least 2 characters"))).toBe(true);
    });

    test("fails when email is invalid", () => {
      const res = validateCustomerInput({ name: "Valid Name", email: "bad-email" });
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes("valid email"))).toBe(true);
    });

    test("fails when phone is provided but malformed", () => {
      const res = validateCustomerInput({
        name: "Valid Name",
        email: "valid@email.com",
        phone: "short",
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes("Phone number format"))).toBe(true);
    });

    test("handles non-object input safely", () => {
      const res = validateCustomerInput(null);
      expect(res.isValid).toBe(false);
      expect(res.errors).toHaveLength(1);
    });
  });

  describe("validateInteractionInput()", () => {
    test("passes valid interaction entry", () => {
      const valid = {
        customer_id: 1,
        notes: "Discussed contract terms and pricing structure.",
        interaction_date: "2026-10-29",
      };
      const res = validateInteractionInput(valid);
      expect(res.isValid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    test("fails when customer_id is missing or not a positive integer", () => {
      const res = validateInteractionInput({ customer_id: "invalid", notes: "Notes here" });
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes("customer_id"))).toBe(true);
    });

    test("fails when notes are too short", () => {
      const res = validateInteractionInput({ customer_id: 2, notes: "ok" });
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes("at least 3 characters"))).toBe(true);
    });

    test("validates interaction_date format if provided", () => {
      const res = validateInteractionInput({
        customer_id: 1,
        notes: "Valid notes here",
        interaction_date: "not-a-real-date",
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes("ISO date"))).toBe(true);
    });
  });

  describe("validateRegisterInput() & validateLoginInput()", () => {
    test("passes valid user registration data", () => {
      const res = validateRegisterInput({
        name: "Jane Doe",
        email: "jane@minicrm.io",
        password: "securePassword123!",
      });
      expect(res.isValid).toBe(true);
    });

    test("rejects password shorter than 6 characters during signup", () => {
      const res = validateRegisterInput({
        name: "Jane Doe",
        email: "jane@minicrm.io",
        password: "123",
      });
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes("at least 6 characters"))).toBe(true);
    });

    test("validates login inputs", () => {
      expect(validateLoginInput({ email: "user@test.com", password: "pwd" }).isValid).toBe(true);
      expect(validateLoginInput({ email: "bad", password: "pwd" }).isValid).toBe(false);
      expect(validateLoginInput({ email: "user@test.com" }).isValid).toBe(false);
    });
  });

  describe("validateFollowupActionInput()", () => {
    test("accepts supported action types", () => {
      expect(validateFollowupActionInput({ customer_id: 1, action: "CALL_CUSTOMER" }).isValid).toBe(true);
      expect(validateFollowupActionInput({ customer_id: 1, action: "EMAIL_CUSTOMER" }).isValid).toBe(true);
      expect(validateFollowupActionInput({ customer_id: 1, action: "ESCALATE_MANAGER" }).isValid).toBe(true);
      expect(validateFollowupActionInput({ customer_id: 1, action: "IGNORE" }).isValid).toBe(true);
    });

    test("rejects unknown action types", () => {
      const res = validateFollowupActionInput({ customer_id: 1, action: "UNKNOWN_ACTION" });
      expect(res.isValid).toBe(false);
      expect(res.errors.some((e) => e.includes("must be one of"))).toBe(true);
    });

    test("rejects invalid customer ID", () => {
      const res = validateFollowupActionInput({ customer_id: 0, action: "CALL_CUSTOMER" });
      expect(res.isValid).toBe(false);
    });
  });
});
