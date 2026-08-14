/**
 * frontend/src/analytics/core/sanitize.ts
 *
 * PII Sanitizer & String Truncator.
 * Enforces zero PII leaving the device and string length limits.
 */

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const PHONE_REGEX = /(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{4}/g;
const ROLL_REGEX = /\b\d{2}[0-9A-Z]{2,4}[0-9A-Z]{4,6}\b/gi;
const CAPITALIZED_NAME_REGEX = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;

const DROPPED_LABEL_SUFFIXES = ['.avatar', '.name', '.profile-row'];

/**
 * Sanitize a string value by redacting PII patterns and truncating to max 100 chars.
 */
export function sanitizeString(val: string, isCardContext = false): string {
  if (!val) return val;
  let clean = val;

  // Redact email
  clean = clean.replace(EMAIL_REGEX, '[email]');

  // Redact phone
  clean = clean.replace(PHONE_REGEX, (match) => {
    // avoid matching small numbers
    return match.replace(/\D/g, '').length >= 10 ? '[phone]' : match;
  });

  // Redact roll number
  clean = clean.replace(ROLL_REGEX, '[roll]');

  // Redact capitalized full names in card contexts
  if (isCardContext) {
    clean = clean.replace(CAPITALIZED_NAME_REGEX, '[name]');
  }

  // Truncate to 100 chars max
  if (clean.length > 100) {
    clean = clean.slice(0, 100);
  }

  return clean;
}

/**
 * Sanitize event properties map.
 */
export function sanitizeProps(
  props: Record<string, any>,
  elementId?: string
): Record<string, any> {
  const clean: Record<string, any> = {};

  const shouldDropLabel =
    elementId && DROPPED_LABEL_SUFFIXES.some((suffix) => elementId.endsWith(suffix));

  const isCardContext = Boolean(
    elementId && (elementId.includes('.card.') || elementId.includes('.row.'))
  );

  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null) continue;

    if (key === 'element_label' && shouldDropLabel) {
      continue;
    }

    // Never send forbidden PII keys
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('password') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('token') ||
      lowerKey === 'email' ||
      lowerKey === 'phone' ||
      lowerKey === 'roll_number'
    ) {
      clean[key] = '[redacted]';
      continue;
    }

    if (typeof value === 'string') {
      clean[key] = sanitizeString(value, isCardContext);
    } else if (typeof value === 'object') {
      clean[key] = sanitizeString(JSON.stringify(value), isCardContext);
    } else {
      clean[key] = value;
    }
  }

  return clean;
}
