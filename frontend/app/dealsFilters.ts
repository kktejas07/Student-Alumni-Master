// @ts-nocheck
/**
 * dealsFilters — pure, data-level logic for the /deals page (D2).
 *
 * Extracted so Jest can unit-test deal-type tabs, auto-populated
 * categories and the bank-card filter without mounting the UI.
 * All functions are pure: (deals, input) → output.
 */

export type DealType =
  | 'student_exclusive'
  | 'coupon'
  | 'cashback'
  | 'bank_offer'
  | 'first_order'
  | 'flash_sale'
  | 'referral'
  | 'freebie'
  | 'community';

export type Deal = {
  deal_id: string;
  brand: string;
  provider?: string;
  title: string;
  category?: string;
  description?: string;
  price_inr: number;
  price_unit?: string;
  price_label?: string;
  original_inr?: number;
  original_label?: string;
  discount_pct?: number;
  discount_label?: string;
  absolute_savings_inr?: number;
  affiliate_url?: string;
  code?: string;
  logo_url?: string;
  accent?: string;
  student_only?: boolean;
  auto_apply?: boolean;
  country?: 'IN' | 'GLOBAL' | string;
  available_globally?: boolean;
  source?: string;
  tags?: string[];
  // D1 aggregator schema (optional until the bot's data lands)
  deal_type?: DealType | string;
  bank_name?: string;
  card_type?: string;
  code_verified?: boolean;
  success_rate?: number;
};

// ─── Deal-type tabs ────────────────────────────────────────────────────
export const DEAL_TYPE_TABS: { id: DealType | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'student_exclusive', label: 'Student' },
  { id: 'coupon', label: 'Coupons' },
  { id: 'cashback', label: 'Cashback' },
  { id: 'bank_offer', label: 'Bank Offers' },
  { id: 'first_order', label: 'First Order' },
  { id: 'flash_sale', label: 'Flash Sales' },
  { id: 'community', label: 'Community' },
];

export const DEAL_TYPE_META: Record<string, { label: string; bg: string; fg: string }> = {
  student_exclusive: { label: 'Student', bg: '#F3EEFF', fg: '#5B21B6' },
  coupon: { label: 'Coupon', bg: '#FFEDD5', fg: '#C2410C' },
  cashback: { label: 'Cashback', bg: '#D1FAE5', fg: '#065F46' },
  bank_offer: { label: 'Bank Offer', bg: '#DBEAFE', fg: '#1D4ED8' },
  first_order: { label: 'First Order', bg: '#FCE7F3', fg: '#BE185D' },
  flash_sale: { label: 'Flash Sale', bg: '#FEE2E2', fg: '#B91C1C' },
  referral: { label: 'Referral', bg: '#EDE9FE', fg: '#5B21B6' },
  freebie: { label: 'Freebie', bg: '#ECFDF5', fg: '#047857' },
  community: { label: 'Community', bg: '#F1F5F9', fg: '#334155' },
};

const CASHBACK_RE = /cashback|cash back|get .*% ?back|earn .*% ?back/i;
const FIRST_ORDER_RE = /first (order|time|purchase|buy|deal)|new (user|customer)|first time/i;
const FLASH_RE = /flash sale|flash (deal|offer)|lightning deal|limited.{0,16}(sale|offer)|ends in|hurry/i;
const COMMUNITY_SOURCE_RE = /reddit|desidime|community|crowd/i;

/**
 * Resolve a deal's type. Prefers an explicit `deal_type` field (D1 schema);
 * otherwise infers from available signals so the tabs work today.
 */
export function inferDealType(d: Deal): DealType {
  if (d.deal_type && typeof d.deal_type === 'string' && (d.deal_type in DEAL_TYPE_META)) {
    return d.deal_type as DealType;
  }
  if (d.bank_name || /bank/i.test(d.source || '') || /^(hdfc|icici|sbi|axis|kotak)/i.test(d.brand || '')) {
    return 'bank_offer';
  }
  const t = `${d.title || ''} ${d.description || ''}`;
  if (CASHBACK_RE.test(t)) return 'cashback';
  if (FIRST_ORDER_RE.test(t)) return 'first_order';
  if (FLASH_RE.test(t)) return 'flash_sale';
  if (COMMUNITY_SOURCE_RE.test(d.source || '') || d.source === 'community') return 'community';
  if ((d.price_inr ?? 0) === 0) return 'freebie';
  if (d.student_only) return 'student_exclusive';
  return 'coupon';
}

export function filterDealsByType(deals: Deal[], type: DealType | 'all'): Deal[] {
  if (type === 'all') return deals;
  if (type === 'student_exclusive') return deals.filter((d) => d.student_only);
  return deals.filter((d) => inferDealType(d) === type);
}

// ─── Auto-populated category chips ─────────────────────────────────────
const KNOWN_CATEGORY_RANK: Record<string, number> = {
  tech: 1, food: 2, learning: 3, entertainment: 4, fashion: 5,
  grocery: 6, insurance: 7, transport: 8, travel: 9,
  electronics: 10, flights: 11, buses: 12, trains: 13, rides: 14,
  hotels: 15, streaming: 16, health: 17, ecommerce: 18,
  dating: 19, finance: 20, beauty: 21, home: 22, exam_prep: 23,
  gaming: 24, other: 99,
};

export function categoryLabel(id: string): string {
  if (id === 'all') return 'All';
  return id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

/**
 * Category chips are AUTO-POPULATED from the current deal set —
 * nothing is hardcoded. Known categories keep a stable order;
 * unknown ones (e.g. new aggregator categories) sort after them.
 */
export function buildAutoCategories(deals: Deal[]): { id: string; label: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const d of deals) {
    const c = (d.category || 'other').trim() || 'other';
    counts[c] = (counts[c] || 0) + 1;
  }
  const ids = Object.keys(counts).sort((a, b) => {
    const ra = KNOWN_CATEGORY_RANK[a] ?? 50;
    const rb = KNOWN_CATEGORY_RANK[b] ?? 50;
    if (ra !== rb) return ra - rb;
    if (a === 'other') return -1;
    if (b === 'other') return 1;
    return a.localeCompare(b);
  });
  return [{ id: 'all', label: 'All', count: deals.length },
    ...ids.map((id) => ({ id, label: categoryLabel(id), count: counts[id] }))];
}

// ─── Bank card filter (Bank Offers tab) ────────────────────────────────
export type BankCardOption = { bank: string; name: string };

export const BANK_CARDS: BankCardOption[] = [
  { bank: 'HDFC', name: 'Millennia' },
  { bank: 'HDFC', name: 'Regalia' },
  { bank: 'HDFC', name: 'Platinum' },
  { bank: 'HDFC', name: 'Gold' },
  { bank: 'HDFC', name: 'DigiMaestro' },
  { bank: 'HDFC', name: 'Adyma' },
  { bank: 'ICICI', name: 'SavaOne' },
  { bank: 'ICICI', name: 'Infinite' },
  { bank: 'ICICI', name: 'Platinum' },
  { bank: 'ICICI', name: 'PTP' },
  { bank: 'ICICI', name: 'Amazon Pay' },
  { bank: 'SBI', name: 'SimplyCLICK' },
  { bank: 'SBI', name: 'Cashback' },
  { bank: 'SBI', name: 'Yono' },
  { bank: 'Axis', name: 'Zen' },
  { bank: 'Axis', name: 'Magnus' },
  { bank: 'Axis', name: 'Jet' },
  { bank: 'Axis', name: 'DigiCash' },
  { bank: 'Kotak', name: '811' },
  { bank: 'Kotak', name: 'Emeralda' },
  { bank: 'Kotak', name: 'Platinum' },
  { bank: 'Kotak', name: 'SAE' },
];

export function banksForDeal(d: Deal): string {
  if (d.bank_name) return d.bank_name.toUpperCase().replace(/\s+/g, ' ');
  const m = /^((?:hdfc|icici|sbi|axis|kotak)[^,]*?)\s*(?:\S.*)$/i.exec(d.brand || '');
  return m ? m[1].toUpperCase() : '';
}

/** A bank offer matches a card when bank + card name appear in its fields. */
export function dealMatchesCard(d: Deal, card: BankCardOption): boolean {
  const hay = `${d.bank_name || ''} ${d.card_type || ''} ${d.brand || ''}`.toUpperCase();
  const cardName = card.name.toUpperCase().replace(/'/g, '');
  const hayNorm = hay.replace(/'/g, '');
  if (cardName && hayNorm.includes(cardName)) return true;
  if (cardName.split(' ').length > 1) {
    return cardName.split(' ').every((w) => hayNorm.includes(w));
  }
  return hayNorm.includes(card.bank.toUpperCase());
}

export function filterBankOffers(deals: Deal[], cards: BankCardOption[]): Deal[] {
  const bankDeals = deals.filter((d) => inferDealType(d) === 'bank_offer');
  if (!cards.length) return bankDeals;
  return bankDeals.filter((d) => cards.some((c) => dealMatchesCard(d, c)));
}

// ─── Search ────────────────────────────────────────────────────────────
export function filterDealsSearch(deals: Deal[], q: string): Deal[] {
  const s = (q || '').trim().toLowerCase();
  if (!s) return deals;
  return deals.filter((d) =>
    [d.brand, d.title, d.description, d.code, d.provider].some(
      (v) => typeof v === 'string' && v.toLowerCase().includes(s),
    ),
  );
}
