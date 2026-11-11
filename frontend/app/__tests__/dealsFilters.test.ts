/**
 * D2 — /deals filter logic (dealsFilters.ts).
 * Pure data-level tests: deal-type tabs, auto-categories, bank card filter,
 * search. No UI mounting required.
 */
import {
  DEAL_TYPE_TABS,
  DEAL_TYPE_META,
  BANK_CARDS,
  Deal,
  inferDealType,
  filterDealsByType,
  buildAutoCategories,
  categoryLabel,
  filterBankOffers,
  dealMatchesCard,
  banksForDeal,
  filterDealsSearch,
} from '../dealsFilters';

const base: Deal = { deal_id: 'x', brand: 'Brand', title: 'T', price_inr: 100 };
const d = (o: Partial<Deal>): Deal => ({ ...base, ...o });

describe('DEAL_TYPE_TABS', () => {
  it('exposes the 8 tabs in spec order', () => {
    expect(DEAL_TYPE_TABS.map((t) => t.id)).toEqual([
      'all', 'student_exclusive', 'coupon', 'cashback',
      'bank_offer', 'first_order', 'flash_sale', 'community',
    ]);
  });

  it('uses the spec labels', () => {
    expect(DEAL_TYPE_TABS.map((t) => t.label)).toEqual([
      'All', 'Student', 'Coupons', 'Cashback',
      'Bank Offers', 'First Order', 'Flash Sales', 'Community',
    ]);
  });

  it('every tab id has badge metadata', () => {
    DEAL_TYPE_TABS.forEach((t) => {
      if (t.id !== 'all') expect(DEAL_TYPE_META[t.id]).toBeDefined();
    });
  });
});

describe('inferDealType', () => {
  it('prefers an explicit deal_type field (D1 schema)', () => {
    expect(inferDealType(d({ deal_type: 'cashback', brand: 'HDFC Cashback Offer', bank_name: 'HDFC' })))
      .toBe('cashback');
  });

  it('classifies a bank offer via bank_name', () => {
    expect(inferDealType(d({ bank_name: 'ICICI', title: '10% off at Swiggy' })))
      .toBe('bank_offer');
  });

  it('classifies a bank offer via brand prefix', () => {
    expect(inferDealType(d({ brand: 'HDFC DigiMaestro', title: 'Flat 500 off' })))
      .toBe('bank_offer');
  });

  it('classifies cashback from title/description keywords', () => {
    expect(inferDealType(d({ title: 'Get 5% cashback on every order' })))
      .toBe('cashback');
  });

  it('classifies first-order deals', () => {
    expect(inferDealType(d({ title: 'First order: 50% off your first purchase' })))
      .toBe('first_order');
  });

  it('classifies flash sales', () => {
    expect(inferDealType(d({ title: 'Flash Sale: 20% off, ends in 3 hours' })))
      .toBe('flash_sale');
  });

  it('classifies community-sourced deals', () => {
    expect(inferDealType(d({ source: 'redditPack', title: 'Verified on r/StudentDeals' })))
      .toBe('community');
  });

  it('classifies zero-price deals as freebies', () => {
    expect(inferDealType(d({ price_inr: 0, title: 'Free month of Prime' })))
      .toBe('freebie');
  });

  it('classifies student-only paid deals as student exclusive', () => {
    expect(inferDealType(d({ price_inr: 499, student_only: true })))
      .toBe('student_exclusive');
  });

  it('falls back to coupon', () => {
    expect(inferDealType(d({ title: 'Use code STUDY20 for 20% off', code: 'STUDY20' })))
      .toBe('coupon');
  });
});

describe('filterDealsByType', () => {
  const deals = [
    d({ deal_id: '1', brand: 'Netflix', price_inr: 149, student_only: true, code: 'STUDENT' }),
    d({ deal_id: '2', brand: 'ICICI Amazon Pay', title: '10% off', bank_name: 'ICICI' }),
    d({ deal_id: '3', title: 'Get 5% cashback on UPI', price_inr: 0 }),
    d({ deal_id: '4', source: 'redditPack', title: 'Found on r/deals' }),
  ];

  it('"all" passes everything through', () => {
    expect(filterDealsByType(deals, 'all')).toHaveLength(4);
  });

  it('student_exclusive filters on the student_only flag', () => {
    expect(filterDealsByType(deals, 'student_exclusive').map((x) => x.deal_id))
      .toEqual(['1']);
  });

  it('bank_offer keeps only bank-signal deals', () => {
    expect(filterDealsByType(deals, 'bank_offer').map((x) => x.deal_id))
      .toEqual(['2']);
  });

  it('cashback / community / flash_sale each isolate their deals', () => {
    expect(filterDealsByType(deals, 'cashback').map((x) => x.deal_id)).toEqual(['3']);
    expect(filterDealsByType(deals, 'community').map((x) => x.deal_id)).toEqual(['4']);
    expect(filterDealsByType(deals, 'flash_sale')).toHaveLength(0);
  });
});

describe('buildAutoCategories', () => {
  it('is auto-populated from the deal set — unknown categories appear, absent ones do not', () => {
    const deals = [
      d({ deal_id: '1', category: 'tech' }),
      d({ deal_id: '2', category: 'tech' }),
      d({ deal_id: '3', category: 'food' }),
      d({ deal_id: '4' }),
    ];
    const cats = buildAutoCategories(deals);
    expect(cats.map((c) => c.id)).toEqual(['all', 'tech', 'food', 'other']);
    expect(cats[0]).toEqual({ id: 'all', label: 'All', count: 4 });
    expect(cats.find((c) => c.id === 'tech')!.count).toBe(2);
    expect(cats.find((c) => c.id === 'food')!.count).toBe(1);
    expect(cats.find((c) => c.id === 'other')!.count).toBe(1);
    expect(cats.find((c) => c.id === 'streaming')).toBeUndefined();
  });

  it('returns just the All chip for an empty set', () => {
    expect(buildAutoCategories([])).toEqual([{ id: 'all', label: 'All', count: 0 }]);
  });

  it('keeps known categories in stable order before unknowns', () => {
    const deals = [
      d({ deal_id: '1', category: 'gaming' }),
      d({ deal_id: '2', category: 'tech' }),
      d({ deal_id: '3', category: 'totally_new_category' }),
    ];
    expect(buildAutoCategories(deals).map((c) => c.id))
      .toEqual(['all', 'tech', 'gaming', 'totally_new_category']);
  });

  it('capitalizes labels', () => {
    expect(categoryLabel('exam_prep')).toBe('Exam Prep');
    expect(categoryLabel('all')).toBe('All');
  });
});

describe('bank card filter', () => {
  const deals = [
    d({ deal_id: '1', brand: 'HDFC Cashback', bank_name: 'HDFC', card_type: 'Millennia', title: '10% off' }),
    d({ deal_id: '2', brand: 'ICICI SavaOne', bank_name: 'ICICI', card_type: 'SavaOne', title: '₹50 off' }),
    d({ deal_id: '3', title: 'Use code STUDY20', code: 'STUDY20' }),
  ];

  it('offers 22 cards grouped across 5 banks', () => {
    expect(BANK_CARDS).toHaveLength(22);
    expect(new Set(BANK_CARDS.map((c) => c.bank)).size).toBe(5);
  });

  it('with no cards selected, shows all bank offers', () => {
    expect(filterBankOffers(deals, []).map((x) => x.deal_id)).toEqual(['1', '2']);
  });

  it('filters to deals matching a selected card', () => {
    const c = BANK_CARDS.find((x) => x.bank === 'HDFC' && x.name === 'Millennia')!;
    expect(filterBankOffers(deals, [c]).map((x) => x.deal_id)).toEqual(['1']);
  });

  it('match is case-insensitive over bank/card/brand fields', () => {
    expect(dealMatchesCard(
      d({ brand: 'hdfc adyma 2x reward' }),
      { bank: 'HDFC', name: 'Adyma' },
    )).toBe(true);
  });

  it('banksForDeal normalizes the explicit bank_name', () => {
    expect(banksForDeal(d({ bank_name: 'icici savaone' }))).toBe('ICICI SAVAONE');
  });

  it('clearing the selection restores all bank offers', () => {
    const picked = filterBankOffers(deals, [BANK_CARDS[0]]);
    expect(picked.map((x) => x.deal_id)).toEqual(['1']);
    expect(filterBankOffers(deals, []).map((x) => x.deal_id)).toEqual(['1', '2']);
  });
});

describe('filterDealsSearch', () => {
  const deals = [
    d({ deal_id: '1', brand: 'Swiggy', title: '40% off', code: 'STUDENT40' }),
    d({ deal_id: '2', brand: 'Zomato', title: 'First order free' }),
  ];

  it('matches brand, title, code case-insensitively', () => {
    expect(filterDealsSearch(deals, 'swiggy').map((x) => x.deal_id)).toEqual(['1']);
    expect(filterDealsSearch(deals, 'STUDENT40').map((x) => x.deal_id)).toEqual(['1']);
    expect(filterDealsSearch(deals, 'first order').map((x) => x.deal_id)).toEqual(['2']);
  });

  it('empty query passes everything through', () => {
    expect(filterDealsSearch(deals, '')).toHaveLength(2);
    expect(filterDealsSearch(deals, '   ')).toHaveLength(2);
  });

  it('no match → empty', () => {
    expect(filterDealsSearch(deals, 'nonexistent')).toHaveLength(0);
  });
});
