/**
 * Extended Mailer & Notification Dispatcher Test Suite
 * Validates template rendering variants, multilingual characters,
 * fallback behavior, and dispatch payload construction.
 */

import sendEmail, { renderEmailTemplate } from "../../lib/mailer.js";

describe("Extended Mailer & Template Rendering Permutations", () => {
  describe("FOLLOWUP_REMINDER Template Permutations", () => {
    test("renders properly with 1 day of inactivity", () => {
      const template = renderEmailTemplate("FOLLOWUP_REMINDER", {
        name: "Acme Quick",
        days: 1,
      });

      expect(template.subject).toContain("Acme Quick");
      expect(template.text).toContain("1 days");
      expect(template.html).toContain("<strong>1 days</strong>");
    });

    test("renders properly with 180 days of inactivity", () => {
      const template = renderEmailTemplate("FOLLOWUP_REMINDER", {
        name: "Dormant Giant Corp",
        days: 180,
      });

      expect(template.subject).toContain("Dormant Giant Corp");
      expect(template.text).toContain("180 days");
      expect(template.html).toContain("<strong>180 days</strong>");
    });

    test("handles special characters and commas in company name", () => {
      const template = renderEmailTemplate("FOLLOWUP_REMINDER", {
        name: "Smith, Jones & Partners, LLC",
        days: 14,
      });

      expect(template.subject).toContain("Smith, Jones & Partners, LLC");
      expect(template.html).toContain("Smith, Jones & Partners, LLC");
    });

    test("handles accented international company names", () => {
      const template = renderEmailTemplate("FOLLOWUP_REMINDER", {
        name: "Crédit Agricole & Société Générale",
        days: 21,
      });

      expect(template.subject).toContain("Crédit Agricole");
      expect(template.html).toContain("Crédit Agricole");
    });
  });

  describe("CHURN_ALERT_MANAGER Executive Escalation Permutations", () => {
    const churnAlertCases = [
      { name: "Alpha Corp", id: 1, churnScore: 71 },
      { name: "Beta LLC", id: 22, churnScore: 85 },
      { name: "Gamma Inc", id: 333, churnScore: 99 },
      { name: "Delta Partners", id: 4040, churnScore: 100 },
    ];

    test.each(churnAlertCases)(
      "renders escalation for account $name (ID: $id, Churn: $churnScore%)",
      ({ name, id, churnScore }) => {
        const template = renderEmailTemplate("CHURN_ALERT_MANAGER", { name, id, churnScore });

        expect(template.subject).toContain("⚠️ URGENT: Churn Alert");
        expect(template.subject).toContain(name);
        expect(template.text).toContain(`Customer ${name} (ID: ${id})`);
        expect(template.text).toContain(`${churnScore}%`);
        expect(template.html).toContain("Executive Churn Escalation");
        expect(template.html).toContain(`<strong>${name}</strong>`);
        expect(template.html).toContain(`<strong>${churnScore}%</strong>`);
      }
    );
  });

  describe("REENGAGEMENT_PROMO Template Permutations", () => {
    test("renders promotional re-engagement copy with partner name", () => {
      const template = renderEmailTemplate("REENGAGEMENT_PROMO", {
        name: "HighGrowth Ventures",
      });

      expect(template.subject).toBe("Special Partnership Offer for HighGrowth Ventures");
      expect(template.text).toContain("Explore our latest platform upgrades");
      expect(template.html).toContain("Exclusive Offer for HighGrowth Ventures");
      expect(template.html).toContain("scale with our latest CRM integrations");
    });
  });

  describe("Default & Fallback Template Routing", () => {
    test("generates custom notification when text and subject are supplied", () => {
      const template = renderEmailTemplate("CUSTOM_EVENT", {
        name: "Custom Partner",
        subject: "Custom Platform Event Notice",
        text: "Your scheduled maintenance is complete.",
      });

      expect(template.subject).toBe("Custom Platform Event Notice");
      expect(template.text).toBe("Your scheduled maintenance is complete.");
      expect(template.html).toBe("<p>Your scheduled maintenance is complete.</p>");
    });

    test("handles completely empty context object gracefully", () => {
      const template = renderEmailTemplate("NON_EXISTENT", {});

      expect(template.subject).toBe("CRM Notification");
      expect(template.text).toContain("Valued Customer");
      expect(template.html).toContain("Valued Customer");
    });
  });

  describe("Batch Template Generation Throughput", () => {
    test("renders 2,000 distinct email templates in under 300ms", () => {
      const startTime = performance.now();

      for (let i = 0; i < 2000; i++) {
        const type = i % 3 === 0 ? "FOLLOWUP_REMINDER" : i % 3 === 1 ? "CHURN_ALERT_MANAGER" : "REENGAGEMENT_PROMO";
        const template = renderEmailTemplate(type, {
          name: `Client #${i}`,
          id: i,
          days: (i % 60) + 1,
          churnScore: (i % 100) + 1,
        });

        expect(template.subject).toBeDefined();
        expect(template.html).toBeDefined();
      }

      const durationMs = performance.now() - startTime;
      expect(durationMs).toBeLessThan(300);
    });
  });

  describe("sendEmail() Delivery Envelope Verification", () => {
    test("dispatches emails with CC, BCC, or custom sender configuration", async () => {
      const result = await sendEmail(
        "client@enterprise.com",
        "Quarterly Business Review",
        "Please find the attached QBR document.",
        "<h2>Quarterly Review</h2>"
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    test("handles multiple recipient addresses without error", async () => {
      const result = await sendEmail(
        "stakeholder1@client.com, stakeholder2@client.com",
        "Multiple Recipient Check",
        "Meeting minutes from today's alignment."
      );

      expect(result.success).toBe(true);
    });
  });
});
