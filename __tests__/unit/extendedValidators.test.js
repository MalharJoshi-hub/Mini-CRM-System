/**
 * Extended Validators & International Data Format Test Suite
 * Validates RFC-compliant email variants, global E.164 phone numbers,
 * boundaries, and input schema safety.
 */

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

describe("Extended Input Validators & RFC Data Conformance", () => {
  describe("Global & RFC-Compliant Email Parsing Matrix", () => {
    const validEmails = [
      "simple@example.com",
      "very.common@example.com",
      "disposable.style.email.with+symbol@example.com",
      "other.email-with-hyphen@example.com",
      "fully-qualified-domain@example.co.uk",
      "user.name+tag+sorting@example.com",
      "x@example.com",
      "example-indeed@strange-example.com",
      "admin@mailserver1.domain.org",
      "customer_support@domain.technology",
      "sales.lead@enterprise-subdomain.corp.internal.co",
      "engineering@cloud-native.systems",
      "procurement@defense-supplier.gov.uk",
      "first.last123@student.university.edu",
      "investor-relations@holding-group.finance",
      "press_office@global-media.press",
      "billing-department@energy-utility.solutions",
      "inquiries@non-profit-foundation.ngo",
      "founder@deeptech-ai.ventures",
      "client.service@banking-consortium.bank",
    ];

    test.each(validEmails)("validates compliant email: %s", (email) => {
      expect(isValidEmail(email)).toBe(true);
    });

    const invalidEmails = [
      "Abc.example.com",
      "A@b@c@example.com",
      "QA[at]example.com",
      "no-at-sign-here",
      "@missing-local-part.org",
      "missing-domain-part@",
      "trailing-dot@domain.",
      "spaces in local@domain.com",
      "local@domain with spaces.com",
      "user@.com",
      "user@domain..com",
      "",
      " ",
      null,
      undefined,
      12345,
      {},
      [],
    ];

    test.each(invalidEmails)("rejects non-compliant email: %s", (email) => {
      expect(isValidEmail(email)).toBe(false);
    });
  });

  describe("Global E.164 & Regional Phone Format Matrix", () => {
    const validPhones = [
      "+1-555-555-5555",
      "+1 (555) 555-5555",
      "+15555555555",
      "555-555-5555",
      "5555555555",
      "+44 20 7946 0919",
      "+44-20-7946-0919",
      "+49 30 123456",
      "+33 1 42 68 55 00",
      "+81 3 1234 5678",
      "+61 2 9876 5432",
      "+91 98765 43210",
      "+353 1 496 0123",
      "+41 22 767 61 11",
      "+31 20 525 9111",
      "+46 8 123 456 78",
      "+34 91 372 24 00",
      "+65 6789 0123",
      "+82 2 1234 5678",
      "+55 11 91234-5678",
    ];

    test.each(validPhones)("accepts global phone number: %s", (phone) => {
      expect(isValidPhone(phone)).toBe(true);
    });

    const invalidPhones = [
      "123",
      "phone-number",
      "call-me-maybe",
      "+1",
      "+1234",
      "555-CALL-NOW",
      "++1-555-123-4567",
      "1234567890123456789012345", // Exceeds standard length
      "---",
      "()",
      "",
      null,
      undefined,
      false,
      {},
    ];

    test.each(invalidPhones)("rejects invalid phone string: %s", (phone) => {
      expect(isValidPhone(phone)).toBe(false);
    });
  });

  describe("String Sanitization & Injection Stripping Matrix", () => {
    const sanitizationPairs = [
      ["  Simple WhiteSpace  ", "Simple WhiteSpace"],
      ["<script>alert(1)</script>", "scriptalert(1)/script"],
      ["Acme <Corporation>", "Acme Corporation"],
      ["<<<Nested>>Brackets>", "NestedBrackets"],
      ["No special characters here 123", "No special characters here 123"],
      ["Line1\nLine2\tTabbed", "Line1\nLine2\tTabbed"],
      ["", ""],
      ["    ", ""],
    ];

    test.each(sanitizationPairs)("sanitizes '%s' into '%s'", (input, expected) => {
      expect(sanitizeString(input)).toBe(expected);
    });
  });

  describe("Exhaustive Customer Input Validation Matrix", () => {
    test("detects multiple simultaneous validation failures in customer record", () => {
      const invalidPayload = {
        name: "A", // too short (<2)
        email: "not-an-email", // invalid
        phone: "short", // invalid phone
      };

      const result = validateCustomerInput(invalidPayload);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBe(3);
    });

    test("passes customer without optional phone number", () => {
      const payload = {
        name: "Digital Dynamics",
        email: "support@digitaldynamics.io",
      };

      const result = validateCustomerInput(payload);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test("handles non-string property values gracefully", () => {
      const weirdPayload = {
        name: 12345,
        email: ["array@email.com"],
        phone: { number: "5551234" },
      };

      const result = validateCustomerInput(weirdPayload);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Exhaustive Interaction Input Validation Matrix", () => {
    test("rejects interaction with negative or zero customer_id", () => {
      expect(validateInteractionInput({ customer_id: 0, notes: "Valid notes" }).isValid).toBe(false);
      expect(validateInteractionInput({ customer_id: -5, notes: "Valid notes" }).isValid).toBe(false);
    });

    test("rejects interaction with floating-point customer_id", () => {
      expect(validateInteractionInput({ customer_id: 3.14159, notes: "Valid notes" }).isValid).toBe(false);
    });

    test("accepts valid ISO date strings in interaction_date", () => {
      const dates = [
        "2026-10-29",
        "2026-10-29T12:00:00Z",
        "2026-01-01",
        "2025-12-31",
      ];

      for (const d of dates) {
        const res = validateInteractionInput({ customer_id: 1, notes: "Valid touchpoint notes", interaction_date: d });
        expect(res.isValid).toBe(true);
      }
    });

    test("rejects malformed date strings", () => {
      const badDates = ["tomorrow", "yesterday", "2026-99-99", "not-a-date"];
      for (const bad of badDates) {
        const res = validateInteractionInput({ customer_id: 1, notes: "Valid notes", interaction_date: bad });
        expect(res.isValid).toBe(false);
        expect(res.errors.some((e) => e.includes("ISO date"))).toBe(true);
      }
    });
  });

  describe("Exhaustive Follow-up Action Validation Matrix", () => {
    test("validates all supported actions cleanly", () => {
      const actions = ["CALL_CUSTOMER", "EMAIL_CUSTOMER", "ESCALATE_MANAGER", "IGNORE"];
      for (const action of actions) {
        expect(validateFollowupActionInput({ customer_id: 1, action }).isValid).toBe(true);
      }
    });

    test("rejects case-mismatched or whitespace-padded action names", () => {
      expect(validateFollowupActionInput({ customer_id: 1, action: "call_customer" }).isValid).toBe(false);
      expect(validateFollowupActionInput({ customer_id: 1, action: " CALL_CUSTOMER " }).isValid).toBe(false);
      expect(validateFollowupActionInput({ customer_id: 1, action: "ESCALATE" }).isValid).toBe(false);
    });
  });
});
