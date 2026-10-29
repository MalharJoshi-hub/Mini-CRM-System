/**
 * Input validation and sanitization helpers for CRM entities and API endpoints.
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?([0-9\s()\-./]){7,20}$/;

/**
 * Validates email format.
 * @param {string} email
 * @returns {boolean}
 */
export function isValidEmail(email) {
  if (typeof email !== "string") return false;
  const trimmed = email.trim();
  if (trimmed.includes("..") || trimmed.endsWith(".")) return false;
  return EMAIL_REGEX.test(trimmed);
}

/**
 * Validates standard phone format allowing international prefixes.
 * @param {string} phone
 * @returns {boolean}
 */
export function isValidPhone(phone) {
  if (typeof phone !== "string") return false;
  return PHONE_REGEX.test(phone.trim());
}

/**
 * Sanitizes input string by trimming and removing potential script injection tokens.
 * @param {string} str
 * @returns {string}
 */
export function sanitizeString(str) {
  if (typeof str !== "string") return "";
  return str.trim().replace(/[<>]/g, "");
}

/**
 * Validates customer registration or update payload.
 * @param {object} data - Customer payload
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateCustomerInput(data) {
  const errors = [];

  if (!data || typeof data !== "object") {
    return { isValid: false, errors: ["Customer payload must be a valid JSON object"] };
  }

  const name = sanitizeString(data.name);
  if (!name || name.length < 2) {
    errors.push("Customer name must contain at least 2 characters");
  }

  if (!data.email || !isValidEmail(data.email)) {
    errors.push("A valid email address is required");
  }

  if (data.phone && !isValidPhone(data.phone)) {
    errors.push("Phone number format is invalid");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates interaction logging payload.
 * @param {object} data - Interaction payload
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateInteractionInput(data) {
  const errors = [];

  if (!data || typeof data !== "object") {
    return { isValid: false, errors: ["Interaction payload must be an object"] };
  }

  const customerId = Number(data.customer_id);
  if (!customerId || customerId <= 0 || !Number.isInteger(customerId)) {
    errors.push("A valid integer customer_id is required");
  }

  const notes = sanitizeString(data.notes);
  if (!notes || notes.length < 3) {
    errors.push("Interaction notes must contain at least 3 characters");
  }

  if (data.interaction_date) {
    const parsedDate = new Date(data.interaction_date);
    if (isNaN(parsedDate.getTime())) {
      errors.push("Interaction date must be a valid ISO date");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates user signup payload.
 * @param {object} data - Signup payload
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateRegisterInput(data) {
  const errors = [];

  if (!data || typeof data !== "object") {
    return { isValid: false, errors: ["Registration payload is required"] };
  }

  const name = sanitizeString(data.name);
  if (!name || name.length < 2) {
    errors.push("Name must be at least 2 characters long");
  }

  if (!data.email || !isValidEmail(data.email)) {
    errors.push("A valid email is required for registration");
  }

  if (!data.password || typeof data.password !== "string" || data.password.length < 6) {
    errors.push("Password must be at least 6 characters long");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates user login payload.
 * @param {object} data - Login credentials
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateLoginInput(data) {
  const errors = [];

  if (!data || typeof data !== "object") {
    return { isValid: false, errors: ["Login credentials are required"] };
  }

  if (!data.email || !isValidEmail(data.email)) {
    errors.push("Valid email is required");
  }

  if (!data.password || typeof data.password !== "string") {
    errors.push("Password is required");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validates follow-up execution action.
 * @param {object} data - Follow-up action request
 * @returns {{ isValid: boolean, errors: string[] }}
 */
export function validateFollowupActionInput(data) {
  const errors = [];
  const validActions = ["CALL_CUSTOMER", "EMAIL_CUSTOMER", "ESCALATE_MANAGER", "IGNORE"];

  if (!data || typeof data !== "object") {
    return { isValid: false, errors: ["Payload required"] };
  }

  const customerId = Number(data.customer_id);
  if (!customerId || customerId <= 0) {
    errors.push("Valid customer_id is required");
  }

  if (!data.action || !validActions.includes(data.action)) {
    errors.push(`Action must be one of: ${validActions.join(", ")}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
