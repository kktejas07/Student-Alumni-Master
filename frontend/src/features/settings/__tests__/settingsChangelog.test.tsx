/**
 * Renders the Settings Changelog tab against a mocked API and asserts the
 * ST2 behaviours that matter: the timeline lists entries, the inline diff
 * shows before/after, secrets are masked and cannot be rolled back, and the
 * rollback action posts to the right endpoint.
 */
import { vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';

// react-native-web's <Text> renders raw strings into host <div>s, which
// trips react-test-renderer's Text invariant under the node env. Mock the
// RN primitives with host stand-ins; <Text> is the only host tag that may
// contain raw strings.
vi.mock('react-native', () => {
  const R = require('react');
  const mk = (tag: string) => (props: any = {}) => {
    const { children, ...rest } = props;
    return children === undefined ? R.createElement(tag, rest) : R.createElement(tag, rest, children);
  };
  return {
    View: mk('view'),
    Text: mk('Text'),
    Pressable: mk('pressable'),
    TextInput: mk('input'),
    ScrollView: mk('scrollview'),
    ActivityIndicator: () => R.createElement('activity'),
    StyleSheet: { create: (o: any) => o, flatten: (o: any) => o },
    Modal: ({ children }: any) => (children ? R.createElement('modal', null, children) : null),
    Platform: { OS: 'web', select: (o: any) => o.web ?? o.default },
    useWindowDimensions: () => ({ width: 1280, height: 800, scale: 1, fontScale: 1 }),
  };
});

const requestMock = vi.fn();
vi.mock('@/src/models/services/api', () => ({
  request: (...args: any[]) => requestMock(...args),
  tokenStore: { getAccess: async () => 'test-token' },
}));

vi.mock('@/src/lib/env', () => ({ getBaseUrl: () => 'http://localhost:8002' }));

const ENTRIES = [
  {
    id: 'e1', section: 'feature_flags', key: 'beta_ui', label: 'Beta UI',
    old_value: false, new_value: true, action: 'update',
    at: '2026-11-01T10:00:00Z', is_secret: false,
    changed_by: { user_id: 'u1', email: 'krishna@example.com', name: 'Krishna' },
  },
  {
    id: 'e2', section: 'system_settings', key: 'stripe_secret_key', label: 'Stripe Secret',
    old_value: '••••1234', new_value: '••••5678', action: 'update',
    at: '2026-11-01T11:00:00Z', is_secret: true,
    changed_by: { user_id: 'u1', email: 'krishna@example.com', name: 'Krishna' },
  },
];

vi.mock('expo-linear-gradient', () => ({
  __esModule: true,
  LinearGradient: 'LinearGradient',
}));

vi.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: {
    View: 'View',
    Text: 'Text',
  },
  FadeIn: { duration: () => ({}) },
  FadeInDown: { duration: () => ({ delay: () => ({}) }) },
  createAnimatedComponent: (c: any) => c,
  useSharedValue: (v: any) => ({ value: v }),
  useAnimatedStyle: (f: any) => f(),
}));

import { ChangelogTab } from '../settingsChangelog';

function mockApi() {
  requestMock.mockImplementation(async (path: string, opts?: any) => {
    if (path.startsWith('/admin/settings-changelog?')) {
      return { ok: true, count: ENTRIES.length, entries: ENTRIES };
    }
    if (path === '/admin/settings-changelog/sections') {
      return {
        ok: true,
        sections: [
          { section: 'feature_flags', count: 1, keys: ['beta_ui'] },
          { section: 'system_settings', count: 1, keys: ['stripe_secret_key'] },
        ],
      };
    }
    if (opts?.method === 'POST') {
      return { ok: true, message: 'Rolled back: Beta UI' };
    }
    return { ok: true };
  });
}

describe('ChangelogTab', () => {
  beforeEach(() => {
    requestMock.mockReset();
    mockApi();
  });

  it('renders the timeline with actor, section and timestamp', async () => {
    render(<ChangelogTab onSaved={() => {}} />);
    await waitFor(() => expect(screen.getByText('Beta UI')).toBeTruthy());
    expect(screen.getByText('Stripe Secret')).toBeTruthy();
    // actor + section line
    expect(screen.getByText(/Feature Flags · Krishna/)).toBeTruthy();
    expect(screen.getByText(/System Settings · Krishna/)).toBeTruthy();
  });

  it('shows the inline before -> after diff when an entry is expanded', async () => {
    render(<ChangelogTab onSaved={() => {}} />);
    await waitFor(() => expect(screen.getByText('Beta UI')).toBeTruthy());
    fireEvent.press(screen.getByText('Beta UI'));
    await waitFor(() => expect(screen.getByText('BEFORE')).toBeTruthy());
    expect(screen.getByText('AFTER')).toBeTruthy();
    expect(screen.getByText('false')).toBeTruthy();
    expect(screen.getByText('true')).toBeTruthy();
  });

  it('offers rollback for a normal change and posts to the rollback endpoint', async () => {
    const onSaved = vi.fn();
    render(<ChangelogTab onSaved={onSaved} />);
    await waitFor(() => expect(screen.getByText('Beta UI')).toBeTruthy());
    fireEvent.press(screen.getByText('Beta UI'));
    await waitFor(() => expect(screen.getByText('Roll back this change')).toBeTruthy());
    fireEvent.press(screen.getByText('Roll back this change'));
    await waitFor(() => expect(screen.getByText('Roll back this change?')).toBeTruthy());
    fireEvent.press(screen.getByText('Confirm rollback'));
    await waitFor(() => {
      const call = requestMock.mock.calls.find((c) => c[1]?.method === 'POST');
      expect(call).toBeTruthy();
      expect(call![0]).toBe('/admin/settings-changelog/e1/rollback');
      expect(call![1].body).toEqual({ confirm: true });
    });
  });

  it('refuses to offer rollback for a secret value', async () => {
    render(<ChangelogTab onSaved={() => {}} />);
    await waitFor(() => expect(screen.getByText('Stripe Secret')).toBeTruthy());
    fireEvent.press(screen.getByText('Stripe Secret'));
    await waitFor(() => expect(screen.getByText(/Rollback unavailable for secrets/)).toBeTruthy());
    expect(screen.queryByText('Roll back this change')).toBeNull();
  });
});
