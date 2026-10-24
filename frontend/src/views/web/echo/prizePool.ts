/**
 * prizePool — safe display normalisation for the ECHO showcase `prize_pool` field.
 *
 * CMS records store this field in two shapes:
 *   • a plain string, e.g. "₹35,000 prize pool" (older records, e.g. CBIT)
 *   • an object, e.g. { total: "₹17,50,000+", grand_pool: "₹2,00,000", tracks: "₹50,000" } (SNIST / VNR)
 *
 * The public event detail page renders this value as a React text child.
 * React throws an unrecoverable "Objects are not valid as a React child"
 * error when given an object, so every text-child render must go through
 * this normaliser. It always returns a string (possibly empty).
 */
export function prizePoolDisplayText(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const total = (value as { total?: unknown }).total;
    if (typeof total === 'string') return total.trim();
    if (typeof total === 'number') return String(total);
  }
  return '';
}
