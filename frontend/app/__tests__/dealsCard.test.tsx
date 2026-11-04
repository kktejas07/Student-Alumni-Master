/**
 * D2 — /deals card rendering (DealCard from app/deals.tsx).
 * Uses @testing-library/react-native + react-native-web under the node env.
 */
import { render } from '@testing-library/react-native';
import React from 'react';

// react-native-web's <Text> renders raw strings into host <div>s, which
// trips react-test-renderer's Text invariant under the node env. Mock the
// RN primitives with host stand-ins; <Text> is the only host tag that may
// contain raw strings.
jest.mock('react-native', () => {
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
    Image: () => R.createElement('image'),
    StyleSheet: { create: (o: any) => o, flatten: (o: any) => o },
    Modal: ({ children }: any) => (children ? R.createElement('modal', null, children) : null),
    Platform: { OS: 'web' },
    Linking: { openURL: jest.fn() },
    useWindowDimensions: () => ({ width: 1280, height: 800, scale: 1, fontScale: 1 }),
  };
});

jest.mock('@expo/vector-icons', () => ({
  __esModule: true,
  MaterialCommunityIcons: () => null,
}));

jest.mock('@/src/models/services/api', () => ({
  request: jest.fn(),
  resolveImageUrl: (u?: string) => u || '',
}));

jest.mock('@/src/viewmodels/stores/authStore', () => ({
  useAuthStore: jest.fn((sel?: any) =>
    sel ? sel({ user: null, initialized: true }) : { user: null, initialized: true },
  ),
}));

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn() }) }));

jest.mock('@/src/views/web/FeaturePageShell', () => ({
  __esModule: true,
  default: ({ children, title, rightSlot }: any) => <>{children}</>,
  EmbeddedShellContext: { Provider: ({ children }: any) => <>{children}</> },
}));

jest.mock('@/src/theme/ThemeContext', () => ({
  ForceLightTheme: ({ children }: any) => <>{children}</>,
  useTheme: () => ({ theme: {}, mode: 'light', setMode: () => {}, isDark: false }),
}));

import { DealCard } from '../deals';

const deal = {
  deal_id: '1',
  brand: 'Zomato',
  title: '40% off on your order',
  description: 'Valid on orders above ₹199',
  price_inr: 0,
  price_label: 'Free',
  original_inr: 599,
  original_label: '₹599',
  discount_pct: 40,
  code: 'ZOM40',
  tags: ['HOT', 'STUDENT_VERIFIED', 'TRENDING', 'INSTANT', 'NEW', 'INDIA_EXCLUSIVE', 'BEST_VALUE'],
  student_only: true,
  logo_url: '',
};

describe('DealCard', () => {
  it('renders brand, title, description and the price row', async () => {
    const { getByText } = await render(<DealCard d={deal} onClaim={jest.fn()} />);
    expect(getByText('ZOMATO')).toBeTruthy();
    expect(getByText('40% off on your order')).toBeTruthy();
    expect(getByText('Valid on orders above ₹199')).toBeTruthy();
    expect(getByText('Free')).toBeTruthy();
    expect(getByText('₹599')).toBeTruthy();
    expect(getByText('40% off')).toBeTruthy();
  });

  it('shows the inferred deal-type badge (freebie) and a verified badge', async () => {
    const { getByText } = await render(<DealCard d={deal} onClaim={jest.fn()} />);
    expect(getByText('Freebie')).toBeTruthy();
    expect(getByText('Verified')).toBeTruthy();
  });

  it('caps visible tags at 3 and shows the overflow count', async () => {
    const { getByText } = await render(<DealCard d={deal} onClaim={jest.fn()} />);
    expect(getByText('Trending')).toBeTruthy();
    expect(getByText('+2')).toBeTruthy();
  });

  it('falls back to a coloured initial when there is no logo', async () => {
    const { getByText } = await render(<DealCard d={deal} onClaim={jest.fn()} />);
    expect(getByText('Z')).toBeTruthy();
  });

  it('Claim Deal triggers onClaim with the deal', async () => {
    const onClaim = jest.fn();
    const { container } = await render(<DealCard d={deal} onClaim={onClaim} />);

    // Host tree: the pressable's onPress fires onClaim with the deal.
    let cta: any = null;
    const walkKids = (n: any) => {
      if (!n || cta) return;
      if (n.type === 'pressable') { cta = n; return; }
      (n.children || []).forEach(walkKids);
    };
    const json = (container as any).toJSON();
    walkKids(Array.isArray(json) ? json[0] : json);
    expect(cta?.props?.onPress).toBeInstanceOf(Function);
    cta.props.onPress();
    expect(onClaim).toHaveBeenCalledWith(deal);
  });

  it('bank offers get the Bank Offer type badge', async () => {
    const { getByText } = await render(
      <DealCard
        d={{ ...deal, deal_id: '2', brand: 'HDFC Regalia', bank_name: 'HDFC', price_inr: 499, price_label: '₹499', student_only: false, code: undefined }}
        onClaim={jest.fn()}
      />,
    );
    expect(getByText('Bank Offer')).toBeTruthy();
  });
});
