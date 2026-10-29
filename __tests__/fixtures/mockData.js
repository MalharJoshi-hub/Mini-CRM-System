/**
 * Test Fixtures & Mock Generators for CRM Test Suites
 */

export function createMockRequest(options = {}) {
  return {
    method: options.method || "GET",
    headers: {
      authorization: options.token ? `Bearer ${options.token}` : undefined,
      ...options.headers,
    },
    body: options.body || {},
    query: options.query || {},
    params: options.params || {},
  };
}

export function createMockResponse() {
  const res = {
    statusCode: 200,
    headers: {},
    data: null,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(payload) {
      res.data = payload;
      return res;
    },
    setHeader(key, val) {
      res.headers[key] = val;
      return res;
    },
    send(payload) {
      res.data = payload;
      return res;
    },
  };
  return res;
}

export const sampleCustomers = [
  {
    id: 1,
    name: "Acme Industrial Corp",
    email: "procurement@acme.com",
    phone: "+1-555-0101",
    company: "Acme Industrial",
    status: "active",
    days_since_last_contact: 5,
    interaction_count: 8,
    churn_score: 15,
    priority_score: 21,
  },
  {
    id: 2,
    name: "Beta Logistics Ltd",
    email: "contact@betalogistics.com",
    phone: "+1-555-0102",
    company: "Beta Logistics",
    status: "churn_risk",
    days_since_last_contact: 24,
    interaction_count: 3,
    churn_score: 68,
    priority_score: 30,
  },
  {
    id: 3,
    name: "Gamma Retail Systems",
    email: "support@gammaretail.io",
    phone: "+1-555-0103",
    company: "Gamma Retail",
    status: "active",
    days_since_last_contact: 45,
    interaction_count: 1,
    churn_score: 85,
    priority_score: 47,
  },
  {
    id: 4,
    name: "Delta Financial Group",
    email: "invest@deltafinancial.org",
    phone: "+1-555-0104",
    company: "Delta Financial",
    status: "lead",
    days_since_last_contact: 12,
    interaction_count: 2,
    churn_score: 44,
    priority_score: 16,
  },
  {
    id: 5,
    name: "Epsilon Media Partners",
    email: "ops@epsilonmedia.co",
    phone: "+1-555-0105",
    company: "Epsilon Media",
    status: "active",
    days_since_last_contact: 2,
    interaction_count: 15,
    churn_score: 0,
    priority_score: 32,
  },
];

export const sampleInteractions = [
  {
    id: 101,
    customer_id: 1,
    interaction_date: "2026-10-25",
    channel: "meeting",
    notes: "Quarterly review completed. Contract expansion discussed.",
  },
  {
    id: 102,
    customer_id: 2,
    interaction_date: "2026-10-05",
    channel: "call",
    notes: "Inquired regarding platform API rate limits.",
  },
  {
    id: 103,
    customer_id: 3,
    interaction_date: "2026-09-14",
    channel: "email",
    notes: "Follow-up email sent regarding renewal proposal.",
  },
];

export const sampleUsers = [
  {
    id: 1,
    name: "Admin Operator",
    email: "admin@minicrm.io",
    role: "admin",
  },
  {
    id: 2,
    name: "Sales Rep Jane",
    email: "jane@minicrm.io",
    role: "agent",
  },
];
