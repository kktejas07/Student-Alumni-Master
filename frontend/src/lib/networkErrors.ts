/**
 * Friendly, accurate errors for failed API requests.
 *
 * Browsers report connectivity failures inconsistently:
 *   Chrome  → "Failed to fetch"
 *   Firefox → "NetworkError when attempting to fetch resource."
 *   Safari  → "Load failed"
 *   RN/Hermes → "Network request failed"
 * Surfacing those verbatim invites bug reports; surfacing the API base URL the
 * frontend actually tried makes local misconfigurations self-diagnosing.
 */

const NETWORK_FAILURE_PATTERN =
  /(failed to fetch|networkerror|network error|load failed|network request failed|connection refused|connection reset|connection closed|timed? ?out|aborted)/i;

export function looksLikeNetworkFailure(err: unknown): boolean {
  const message = err instanceof Error ? err.message || String(err) : String(err ?? '');
  return NETWORK_FAILURE_PATTERN.test(message);
}

/**
 * Convert a thrown fetch error into text that names where the request went.
 *
 * Non-network errors (e.g. the backend's own "Invalid email or password")
 * are returned unchanged so their real message is never masked.
 */
export function friendlyNetworkError(err: unknown, base = ''): string {
  if (looksLikeNetworkFailure(err)) {
    const where = base ? ` at ${base.replace(/\/+$/, '')}` : '';
    return (
      `Unable to reach the server${where}. ` +
      'Check that the backend is running on that port and try again.'
    );
  }
  if (err instanceof Error && err.message) {
    return err.message;
  }
  return 'Network error — please check your connection and try again.';
}
