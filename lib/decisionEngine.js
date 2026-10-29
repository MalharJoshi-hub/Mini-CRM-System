/**
 * AI Decision Engine for CRM Customer Lifecycle & Churn Prediction
 * Evaluates customer behavioral metrics to prescribe automated interventions.
 */

export const DECISION_LEVELS = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
  SAFE: "SAFE",
};

export const RECOMMENDED_ACTIONS = {
  ESCALATE_MANAGER: "ESCALATE_MANAGER",
  CALL_CUSTOMER: "CALL_CUSTOMER",
  SEND_EMAIL: "SEND_EMAIL",
  SCHEDULE_REVIEW: "SCHEDULE_REVIEW",
  NO_ACTION: "NO_ACTION",
};

/**
 * Calculates algorithmic churn risk score between 0 and 100 based on inactivity and frequency.
 * @param {number} daysSinceLastContact - Days since customer's most recent interaction
 * @param {number} interactionCount - Total recorded historical interactions
 * @returns {number} Normalized churn risk score (0-100)
 */
export function calculateChurnScore(daysSinceLastContact, interactionCount) {
  const days = Math.max(0, Number(daysSinceLastContact) || 0);
  const interactions = Math.max(0, Number(interactionCount) || 0);

  // Inactivity accelerates churn risk; frequent historical interactions mitigate churn
  const baseInactivityRisk = days * 4.0;
  const loyaltyMitigation = interactions * 2.5;

  const rawScore = baseInactivityRisk - loyaltyMitigation;
  return Math.min(100, Math.max(0, Math.round(rawScore)));
}

/**
 * Calculates operational priority score for sales and support queuing.
 * @param {number} daysSinceLastContact - Inactivity duration
 * @param {number} interactionCount - Lifetime interactions
 * @param {number} [dealValue=0] - Monetary value weighting factor
 * @returns {number} Normalized priority score
 */
export function calculatePriorityScore(daysSinceLastContact, interactionCount, dealValue = 0) {
  const days = Math.max(0, Number(daysSinceLastContact) || 0);
  const interactions = Math.max(0, Number(interactionCount) || 0);
  const valueWeight = Math.min(20, Math.floor((Number(dealValue) || 0) / 1000));

  const score = interactions * 2 + days + valueWeight;
  return Math.max(0, Math.round(score));
}

/**
 * Determines engagement tier based on interaction frequency and recency.
 * @param {number} daysSinceLastContact - Days since contact
 * @param {number} interactionCount - Total interactions
 * @returns {string} Highly Engaged, Steady, Cooling Off, or Dormant
 */
export function getEngagementTier(daysSinceLastContact, interactionCount) {
  if (
    daysSinceLastContact === null ||
    daysSinceLastContact === undefined ||
    isNaN(Number(daysSinceLastContact))
  ) {
    return "Dormant";
  }

  const days = Number(daysSinceLastContact) || 0;
  const count = Number(interactionCount) || 0;

  if (count >= 5 && days <= 7) return "Highly Engaged";
  if (count >= 2 && days <= 21) return "Steady";
  if (days <= 45) return "Cooling Off";
  return "Dormant";
}

/**
 * Prescribes appropriate intervention action based on churn score, priority, and interaction history.
 * @param {object} customer - Customer object with churn_score, priority_score, and days_since_last_contact
 * @returns {{ level: string, action: string, reason: string, priorityScore: number, churnScore: number }}
 */
export function decideAction(customer) {
  if (!customer) {
    return {
      level: DECISION_LEVELS.SAFE,
      action: RECOMMENDED_ACTIONS.NO_ACTION,
      reason: "No customer data available",
      priorityScore: 0,
      churnScore: 0,
    };
  }

  const churn = Number(customer.churn_score) || 0;
  const priority = Number(customer.priority_score) || 0;
  const days = Number(customer.days_since_last_contact) || 0;

  // 🔴 TIER 1: HIGH RISK + HIGH PRIORITY → MANAGER ESCALATION
  if (churn > 70 && priority > 20) {
    return {
      level: DECISION_LEVELS.CRITICAL,
      action: RECOMMENDED_ACTIONS.ESCALATE_MANAGER,
      reason: `Critical churn risk (${churn}%) with high business priority (${priority}). Immediate executive intervention required.`,
      priorityScore: priority,
      churnScore: churn,
    };
  }

  // 🔴 TIER 2: HIGH CHURN → DIRECT OUTREACH CALL
  if (churn > 60) {
    return {
      level: DECISION_LEVELS.HIGH,
      action: RECOMMENDED_ACTIONS.CALL_CUSTOMER,
      reason: `Elevated churn risk (${churn}%) with ${days} days of inactivity. Dedicated representative phone call recommended.`,
      priorityScore: priority,
      churnScore: churn,
    };
  }

  // 🟡 TIER 3: MEDIUM CHURN → AUTOMATED EMAIL NURTURE
  if (churn > 40) {
    return {
      level: DECISION_LEVELS.MEDIUM,
      action: RECOMMENDED_ACTIONS.SEND_EMAIL,
      reason: `Moderate churn risk (${churn}%). Re-engagement email sequence recommended.`,
      priorityScore: priority,
      churnScore: churn,
    };
  }

  // 🔵 TIER 4: MODERATE STALENESS → SCHEDULED REVIEW
  if (days >= 30) {
    return {
      level: DECISION_LEVELS.LOW,
      action: RECOMMENDED_ACTIONS.SCHEDULE_REVIEW,
      reason: `Customer inactive for ${days} days. Periodic account check-in advised.`,
      priorityScore: priority,
      churnScore: churn,
    };
  }

  // 🟢 TIER 5: STABLE ACCOUNT → NO IMMEDIATE ACTION
  return {
    level: DECISION_LEVELS.SAFE,
    action: RECOMMENDED_ACTIONS.NO_ACTION,
    reason: "Customer account stable. Healthy engagement velocity.",
    priorityScore: priority,
    churnScore: churn,
  };
}