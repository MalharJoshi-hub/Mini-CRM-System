import sendEmail, { renderEmailTemplate } from "../../lib/mailer.js";

describe("Mailer & Email Templating Unit Tests", () => {
  describe("renderEmailTemplate()", () => {
    test("renders FOLLOWUP_REMINDER template with personalized name and inactivity days", () => {
      const template = renderEmailTemplate("FOLLOWUP_REMINDER", {
        name: "Acme Corp",
        days: 14,
      });

      expect(template.subject).toContain("Reconnecting with Acme Corp");
      expect(template.text).toContain("It has been 14 days");
      expect(template.html).toContain("<strong>14 days</strong>");
    });

    test("renders CHURN_ALERT_MANAGER template with risk score and customer details", () => {
      const template = renderEmailTemplate("CHURN_ALERT_MANAGER", {
        name: "Beta Ltd",
        id: 105,
        churnScore: 82,
      });

      expect(template.subject).toContain("URGENT: Churn Alert for Account Beta Ltd");
      expect(template.text).toContain("churn threshold (82%)");
      expect(template.html).toContain("<strong>82%</strong>");
    });

    test("renders REENGAGEMENT_PROMO template", () => {
      const template = renderEmailTemplate("REENGAGEMENT_PROMO", {
        name: "Gamma Co",
      });

      expect(template.subject).toContain("Special Partnership Offer for Gamma Co");
      expect(template.html).toContain("Exclusive Offer for Gamma Co");
    });

    test("falls back to default template for unknown template identifiers", () => {
      const template = renderEmailTemplate("UNKNOWN_TEMPLATE", {
        name: "Delta Inc",
        text: "Custom notification message text.",
      });

      expect(template.subject).toBe("CRM Notification");
      expect(template.text).toBe("Custom notification message text.");
      expect(template.html).toContain("Custom notification message text.");
    });

    test("uses default values when context variables are missing", () => {
      const template = renderEmailTemplate("FOLLOWUP_REMINDER", {});

      expect(template.subject).toContain("Valued Customer");
      expect(template.text).toContain("7 days");
    });
  });

  describe("sendEmail()", () => {
    test("throws error when recipient address is missing or empty", async () => {
      await expect(sendEmail("", "Subject", "Body")).rejects.toThrow(
        "Recipient email address is required"
      );
      await expect(sendEmail(null, "Subject", "Body")).rejects.toThrow(
        "Recipient email address is required"
      );
    });

    test("dispatches email successfully through json transport in test mode", async () => {
      const result = await sendEmail(
        "recipient@example.com",
        "Test Delivery",
        "This is an automated test notification."
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    test("supports optional HTML payload parameter", async () => {
      const result = await sendEmail(
        "recipient@example.com",
        "HTML Test",
        "Plain fallback",
        "<h1>Rich HTML Message</h1>"
      );

      expect(result.success).toBe(true);
    });
  });
});
