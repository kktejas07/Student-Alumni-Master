/**
 * AN1 — Analytics period toolbar + comparison card.
 * Covers the pure helpers (formatDelta / deltaKind / EMPTY_PERIOD shape) and
 * renders the toolbar + card to assert the overlay and the custom date flow.
 */
import { vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

// react-native-web's <Text> renders raw strings into host <div>s, which trips
// react-test-renderer's Text invariant under the node env. Mock the RN
// primitives with host stand-ins; <Text> is the only host tag that may
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
    StyleSheet: { create: (o: any) => o, flatten: (o: any) => o },
    Platform: { OS: 'web', select: (o: any) => o.web ?? o.default },
  };
});

vi.mock('../../applekit', () => ({
  Card: ({ children, style, ...rest }: any) => {
    const R = require('react');
    return R.createElement('card', { style, ...rest }, children);
  },
}));

vi.mock('expo-linear-gradient', () => ({
  __esModule: true,
  LinearGradient: 'LinearGradient',
}));

vi.mock('../../tokens', () => ({
  SAC: { muted: '#9A9AB0', dim: '#7E7E92', border: '#2C2A52', cardSolid: '#111118', text: '#F4F4FA' },
  FONTS: { bold: 'Outfit-Bold', med: 'Outfit-Medium', semi: 'Outfit-SemiBold' },
}));

import {
  PeriodToolbar, PeriodComparisonCard, formatDelta, deltaKind, EMPTY_PERIOD,
  type PeriodBlock,
} from '../AnalyticsPeriod';

// ── helpers ──────────────────────────────────────────────────────────────────

describe('formatDelta', () => {
  it('formats positive, negative and null deltas', () => {
    expect(formatDelta(10.5)).toBe('+10.5%');
    expect(formatDelta(-10.5)).toBe('-10.5%');
    expect(formatDelta(0)).toBe('0%');
    expect(formatDelta(null)).toBe('no prior data');
    expect(formatDelta(undefined)).toBe('no prior data');
  });
});

describe('deltaKind', () => {
  it('classifies success / danger / neutral', () => {
    expect(deltaKind(10)).toBe('success');
    expect(deltaKind(0)).toBe('success');
    expect(deltaKind(-1)).toBe('danger');
    expect(deltaKind(null)).toBe('neutral');
  });
});

describe('EMPTY_PERIOD', () => {
  it('has a complete shape so withDefaults never sees holes', () => {
    expect(EMPTY_PERIOD.range.key).toBe('30d');
    expect(EMPTY_PERIOD.current.daily).toEqual([]);
    expect(EMPTY_PERIOD.delta_pct).toEqual({
      signups: null, active_users: null, bookings: null, revenue: null,
    });
  });
});

// ── toolbar ──────────────────────────────────────────────────────────────────

function samplePeriod(): PeriodBlock {
  const daily = (n: number, base: number) =>
    Array.from({ length: n }, (_, i) => ({
      date: `2026-10-${String(i + 1).padStart(2, '0')}`,
      signups: i + 1, activity_events: (i + 1) * 3, revenue: (base + i) * 100,
    }));
  return {
    range: {
      key: '7d', label: 'Last 7 days',
      start: '2026-10-03T00:00:00+00:00', end: '2026-10-10T00:00:00+00:00',
      days: 7,
      previous_start: '2026-09-26T00:00:00+00:00', previous_end: '2026-10-03T00:00:00+00:00',
    },
    current: {
      signups: 28, active_users: 40, bookings: 12, revenue: 2800,
      revenue_by_source: [{ label: 'Mentor sessions', value: 2000 }],
      daily: daily(7, 10),
    },
    previous: {
      signups: 18, active_users: 30, bookings: 8, revenue: 1500,
      revenue_by_source: [],
      daily: daily(7, 4),
    },
    delta_pct: { signups: 55.6, active_users: 33.3, bookings: 50, revenue: 86.7 },
    previous_label: '2026-09-26 → 2026-10-02',
  };
}

describe('PeriodToolbar', () => {
  it('emits the preset range on pill tap', async () => {
    const onChange = vi.fn();
    await render(<PeriodToolbar range="30d" start="" end="" compare={false} onChange={onChange} />);
    fireEvent.press(screen.getByText('7D'));
    expect(onChange).toHaveBeenCalledWith({ range: '7d', start: '', end: '', compare: false });
  });

  it('toggles compare without changing the range', async () => {
    const onChange = vi.fn();
    await render(<PeriodToolbar range="90d" start="" end="" compare={false} onChange={onChange} />);
    fireEvent.press(screen.getByText('Compare previous period'));
    expect(onChange).toHaveBeenCalledWith({ range: '90d', start: '', end: '', compare: true });
  });

  it('custom flow: renders date inputs, then applies the drafted range', async () => {
    const onChange = vi.fn();
    await render(
      <PeriodToolbar range="custom" start="2026-10-01" end="2026-10-15" compare={false} onChange={onChange} />,
    );
    const inputs = screen.root.queryAll((n) => n.type === 'input');
    expect(inputs.length).toBe(2);
    fireEvent.press(screen.getByText('Apply range'));
    expect(onChange).toHaveBeenCalledWith({
      range: 'custom', start: '2026-10-01', end: '2026-10-15', compare: false,
    });
  });
});

// ── comparison card ──────────────────────────────────────────────────────────

describe('PeriodComparisonCard', () => {
  it('shows current vs previous totals and the delta chip', async () => {
    const p = samplePeriod();
    await render(<PeriodComparisonCard period={p} compare={false} metric="revenue" />);
    expect(screen.getAllByText('₹9,100').length).toBeGreaterThan(0); // current total
    expect(screen.getAllByText('₹4,900').length).toBeGreaterThan(0); // previous total
    expect(screen.getByText('Revenue · current')).toBeTruthy();
    expect(screen.getByText('Revenue · previous')).toBeTruthy();
    expect(screen.getByText('+86.7%')).toBeTruthy();
    expect(screen.getByText(/2026-09-26 → 2026-10-02/)).toBeTruthy();
  });

  it('shows the "Previous period" legend only when compare is on', async () => {
    await render(<PeriodComparisonCard period={samplePeriod()} compare={false} metric="signups" />);
    expect(screen.queryByText('Previous period')).toBeNull();
    await screen.rerender(<PeriodComparisonCard period={samplePeriod()} compare metric="signups" />);
    expect(screen.getByText('Previous period')).toBeTruthy();
  });
});
