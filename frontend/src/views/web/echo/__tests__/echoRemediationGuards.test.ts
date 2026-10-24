/**
 * Phase-1 remediation regression guards (source-level locks).
 *
 * These complement the behaviour tests in prizePool.test.ts and the backend
 * API suites. They assert, at the source level, that hardcoded cross-event
 * fallbacks stay removed — the exact content that wrongly leaked HackWave /
 * VNR branding onto other events. If any of those literals reappear in the
 * render paths, these tests fail.
 *
 * Note: full component-mount tests for these two large files pull heavy
 * layout/graph/CSS dependencies into the jest node environment, so the
 * guards inspect the render-source directly (documented trade-off).
 */
import fs from 'fs';
import path from 'path';

const FRONTEND_ROOT = path.resolve(__dirname, '../../../..', '..'); // frontend/
const read = (rel: string) => fs.readFileSync(path.join(FRONTEND_ROOT, rel), 'utf8');

const ECHO_EVENTS = 'src/views/web/echo/EchoEventsPage.tsx';
const SHOWCASE = 'src/views/web/portals/student/views/EchoShowcaseView.tsx';
const EVENT_ROUTE = 'app/echo/[slug]/[event]/index.tsx';

describe('EchoEventsPage — no cross-event hardcoded fallbacks', () => {
  const src = () => read(ECHO_EVENTS);

  it('normalises prize_pool through the safe helper (no raw object child)', () => {
    const s = src();
    // The pill must render the normalised text, never the stored value.
    expect(s).toContain('prizePoolDisplayText(activeEvent?.prize_pool)');
    expect(s).not.toMatch(/\{activeEvent\.prize_pool\}/);
    // The dict-safe prize section stays intact (string + object handling).
    expect(s).toContain("activeEvent.prize_pool.total || typeof activeEvent.prize_pool === 'string'");
  });

  it('has no hardcoded HackWave vertical/category arrays in the render path', () => {
    const s = src();
    expect(s).not.toContain('Build by Sunset');            // verticals fallback array
    expect(s).not.toContain('Voices That Build');          // verticals fallback array
    expect(s).not.toContain("'AI That Solves a Real Problem'"); // registration track fallback
    expect(s).not.toContain("'Beyond the Chatbot'");       // registration track fallback
  });

  it('renders the verticals section only from the event categories', () => {
    const s = src();
    expect(s).toContain('verticalItems.map((vert: any, vidx: number)');
    expect(s).toContain('if (verticalItems.length === 0) return null');
  });

  it('uses only the event categories in the registration track select', () => {
    const s = src();
    expect(s).toMatch(/\(\(activeEvent\.categories && activeEvent\.categories\.length > 0\) \? activeEvent\.categories : \[\]\)\.map/);
  });

  it('does not fall back to the HackWave poster in Razorpay checkout', () => {
    const s = src();
    expect(s).not.toContain("|| '/images/hackwave/hackwave_main_poster.png'");
  });

  it('conclave renders only configured sessions (no HackWave session fallback)', () => {
    const s = src();
    expect(s).not.toContain("'Global security trends'");
    expect(s).toContain('const sessions = conclave.sessions?.length ? conclave.sessions : [];');
  });
});

describe('EchoShowcaseView — no VNR-branded sponsor / fake download fallbacks', () => {
  const src = () => read(SHOWCASE);

  it('has no hardcoded sponsor fallback cards', () => {
    const s = src();
    expect(s).not.toContain('VNR VJIET Alumni Assoc.');
    expect(s).not.toContain("'Deloitte'");
    expect(s).not.toContain('Garuda Vigilance');
    // Real sponsors render straight from the record.
    expect(s).toContain('data.sponsors.map((sp: any, i: number) =>');
  });

  it('hides the sponsors section when the event has none', () => {
    const s = src();
    expect(s).toMatch(/showSection\('sponsors'\) && data\?\.sponsors && data\.sponsors\.length > 0/);
  });

  it('has no fake "#" download rows', () => {
    const s = src();
    expect(s).not.toContain("file_url: '#'");
    expect(s).not.toContain('Hackathon Rulebook & Guidelines');
    expect(s).toContain('data.downloads.map((dl: any, i: number) =>');
  });

  it('only offers a download action for real files and hides empty sections', () => {
    const s = src();
    expect(s).toMatch(/\{\(dl\.file_url && dl\.file_url !== '#'\) \? \(/);
    expect(s).toMatch(/showSection\('downloads'\) && data\?\.downloads && data\.downloads\.length > 0/);
  });
});

describe('Echo deep-link route — no event defaulting', () => {
  it('never falls back to SNIST for a missing slug', () => {
    const s = read(EVENT_ROUTE);
    expect(s).not.toContain("|| 'snist'");
    expect(s).toContain("slug ? 'detail' : 'list'");
  });

  it('null initialSlug stays absent-safe in EchoEventsPage', () => {
    const s = read(ECHO_EVENTS);
    // Graceful not-found rendering exists for a missing activeEvent.
    expect(s).toContain('notFound || (!loading && !activeEvent) ? (');
  });
});
