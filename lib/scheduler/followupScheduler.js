import cron from "node-cron";
import pool from "../db.js";
import sendEmail, { renderEmailTemplate } from "../mailer.js";
import { logEvent } from "../auditLogger.js";

/**
 * Executes a single sweep of the customer database to identify overdue contacts
 * and trigger automated re-engagement follow-up emails.
 * @returns {Promise<{ processedCount: number, errors: string[] }>}
 */
export async function runFollowupCheck() {
  const errors = [];
  let processedCount = 0;

  try {
    const result = await pool.query(`
      SELECT c.id, c.name, c.email,
             COALESCE(MAX(i.interaction_date), CURRENT_DATE - INTERVAL '30 days') AS last_contact,
             COALESCE((CURRENT_DATE - MAX(i.interaction_date)), 30) AS days_since_last_contact
      FROM customers c
      LEFT JOIN interactions i ON c.id = i.customer_id
      GROUP BY c.id
      HAVING MAX(i.interaction_date) < CURRENT_DATE - INTERVAL '7 days'
         OR MAX(i.interaction_date) IS NULL
    `);

    for (const customer of result.rows) {
      try {
        const template = renderEmailTemplate("FOLLOWUP_REMINDER", {
          name: customer.name,
          days: customer.days_since_last_contact,
        });

        await sendEmail(customer.email, template.subject, template.text, template.html);
        processedCount++;

        await logEvent({
          action: "AUTOMATED_FOLLOWUP_SENT",
          customerId: customer.id,
          metadata: { email: customer.email, daysInactive: customer.days_since_last_contact },
        });
      } catch (err) {
        errors.push(`Customer ${customer.id}: ${err.message}`);
      }
    }

    return { processedCount, errors };
  } catch (error) {
    console.error("Scheduler database sweep failed:", error.message);
    throw error;
  }
}

/**
 * Initializes cron schedule. Defaults to running every minute or per CRON_SCHEDULE env var.
 * @param {string} [cronExpression]
 * @returns {import('node-cron').ScheduledTask}
 */
export function initScheduler(cronExpression = process.env.CRON_SCHEDULE || "* * * * *") {
  console.log(`Starting follow-up scheduler with pattern: ${cronExpression}`);
  return cron.schedule(cronExpression, async () => {
    console.log("Executing scheduled follow-up check...");
    try {
      const summary = await runFollowupCheck();
      console.log(`Scheduler run complete. Processed: ${summary.processedCount}, Errors: ${summary.errors.length}`);
    } catch (err) {
      console.error("Scheduler job error:", err.message);
    }
  });
}

export default initScheduler;