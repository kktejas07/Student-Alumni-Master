/**
 * networkErrors contract tests — accurate connectivity messaging.
 *
 * Regression: the login screen used to show a generic "Unable to reach the
 * server" even when the configured backend port was wrong, so the real
 * problem (backend not running on that port) was hidden from developers.
 */

import { friendlyNetworkError, looksLikeNetworkFailure } from '../networkErrors';

const BASE = 'http://localhost:8000';

describe('friendlyNetworkError', () => {
  test('Chrome-style fetch failures name the API base the frontend tried', () => {
    const err = new TypeError('Failed to fetch');
    const msg = friendlyNetworkError(err, BASE);

    expect(msg).toContain(BASE);
    expect(msg).toContain('backend is running');
  });

  test('Safari/Firefox-style failures map to the same guidance', () => {
    expect(friendlyNetworkError(new TypeError('Load failed'), BASE)).toContain('backend is running');
    expect(
      friendlyNetworkError(new TypeError('NetworkError when attempting to fetch resource.'), BASE)
    ).toContain('backend is running');
    expect(friendlyNetworkError(new TypeError('Network request failed'), BASE)).toContain(
      'backend is running'
    );
  });

  test('http error objects are never masked — real backend messages pass through', () => {
    const err = new Error('Invalid email or password');
    expect(friendlyNetworkError(err, BASE)).toBe('Invalid email or password');
    expect(friendlyNetworkError(new Error('Too many failed login attempts.'), BASE)).toBe(
      'Too many failed login attempts.'
    );
  });

  test('thrown non-Error values fall back to a readable message', () => {
    expect(friendlyNetworkError(undefined, BASE)).toBe(
      'Network error — please check your connection and try again.'
    );
    expect(friendlyNetworkError('boom', BASE)).toBe('Network error — please check your connection and try again.');
  });

  test('works without a base (non-login callers)', () => {
    const msg = friendlyNetworkError(new TypeError('Failed to fetch'));
    expect(msg).toContain('backend is running');
    expect(msg).not.toContain(' at ');
  });

  test('looksLikeNetworkFailure distinguishes transport vs API errors', () => {
    expect(looksLikeNetworkFailure(new TypeError('Failed to fetch'))).toBe(true);
    expect(looksLikeNetworkFailure(new Error('12connect'))).toBe(false);
  });
});
