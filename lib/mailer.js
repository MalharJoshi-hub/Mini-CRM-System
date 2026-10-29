import nodemailer from "nodemailer";

/**
 * Creates email transport based on active environment variables.
 */
function createTransport() {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    return nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE || "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Fallback to JSON test transport when live credentials are not present
  return nodemailer.createTransport({
    jsonTransport: true,
  });
}

const transporter = createTransport();

/**
 * Generates email content templates for CRM communications.
 * @param {string} templateName - Template identifier
 * @param {object} context - Template variables
 * @returns {{ subject: string, text: string, html: string }}
 */
export function renderEmailTemplate(templateName, context = {}) {
  const customerName = context.name || "Valued Customer";
  const days = context.days || 7;

  switch (templateName) {
    case "FOLLOWUP_REMINDER":
      return {
        subject: `Reconnecting with ${customerName} - Account Check-in`,
        text: `Hello ${customerName},\n\nIt has been ${days} days since our last interaction. We would love to touch base and ensure your operations are running smoothly.\n\nBest regards,\nCRM Success Team`,
        html: `<h2>Hello ${customerName},</h2><p>It has been <strong>${days} days</strong> since our last interaction. We would love to touch base and ensure your operations are running smoothly.</p><p>Best regards,<br/><strong>CRM Success Team</strong></p>`,
      };

    case "CHURN_ALERT_MANAGER":
      return {
        subject: `⚠️ URGENT: Churn Alert for Account ${customerName}`,
        text: `Attention Management,\n\nCustomer ${customerName} (ID: ${context.id}) has breached high churn threshold (${context.churnScore}%). Immediate review recommended.\n\nAutomated CRM Decision Engine`,
        html: `<h3>⚠️ Executive Churn Escalation</h3><p>Customer <strong>${customerName}</strong> (ID: ${context.id}) has recorded a churn risk of <strong>${context.churnScore}%</strong>.</p><p>Please assign an executive account manager immediately.</p>`,
      };

    case "REENGAGEMENT_PROMO":
      return {
        subject: `Special Partnership Offer for ${customerName}`,
        text: `Hello ${customerName},\n\nWe value your partnership. Explore our latest platform upgrades and exclusive quarterly offerings.\n\nWarmly,\nCustomer Success`,
        html: `<h2>Exclusive Offer for ${customerName}</h2><p>We value your partnership and want to help your business scale with our latest CRM integrations.</p>`,
      };

    default:
      return {
        subject: context.subject || "CRM Notification",
        text: context.text || `Hello ${customerName}, here is an update regarding your account.`,
        html: `<p>${context.text || `Hello ${customerName}, here is an update regarding your account.`}</p>`,
      };
  }
}

/**
 * Dispatches an email notification to a recipient.
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject line
 * @param {string} text - Plain text body
 * @param {string} [html] - Optional HTML body
 * @returns {Promise<object>} Nodemailer send result
 */
export default async function sendEmail(to, subject, text, html) {
  if (!to) {
    throw new Error("Recipient email address is required");
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || "crm-system@domain.local",
    to,
    subject,
    text,
    ...(html ? { html } : {}),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Failed to deliver email:", { to, subject, error: error.message });
    throw error;
  }
}