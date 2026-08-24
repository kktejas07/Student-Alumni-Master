/**
 * Unit tests for PII Sanitizer & Truncation logic.
 */

import { sanitizeProps, sanitizeString } from '../../src/analytics/core/sanitize';

describe('Analytics PII Sanitizer', () => {
  it('redacts email addresses', () => {
    const raw = 'Contact user at john.doe@example.com for info';
    expect(sanitizeString(raw)).toBe('Contact user at [email] for info');
  });

  it('redacts phone numbers', () => {
    const raw = 'Call +91 9876543210 immediately';
    expect(sanitizeString(raw)).toBe('Call [phone] immediately');
  });

  it('redacts student roll numbers', () => {
    const raw = 'Student roll is 24071A12K3 in section B';
    expect(sanitizeString(raw)).toBe('Student roll is [roll] in section B');
  });

  it('redacts full names in card contexts', () => {
    const raw = 'Card for John Doe';
    expect(sanitizeString(raw, true)).toBe('Card for [name]');
  });

  it('truncates strings over 100 characters', () => {
    const longString = 'a'.repeat(120);
    expect(sanitizeString(longString)).toHaveLength(100);
  });

  it('drops element_label for avatar or name suffixes', () => {
    const props = {
      element_label: 'John Doe',
      custom_prop: 'safe',
    };
    const sanitized = sanitizeProps(props, 'sa.student.dashboard.avatar');
    expect(sanitized.element_label).toBeUndefined();
    expect(sanitized.custom_prop).toBe('safe');
  });
});
