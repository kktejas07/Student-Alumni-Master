/**
 * ECHO public card guards (source-level locks).
 *
 * Pins the public /echo card contract of the current main-line code:
 *
 * 1. Status derivation precedence — the card status is DATA-DRIVEN, in this
 *    exact order: registration.enabled === false → 'CLOSED', else the stored
 *    `event_status_badge`, else `status`, else 'UPCOMING'. No date-based
 *    recomputation, no hardcoded per-event statuses, no reading of a
 *    `display_state` lifecycle field (this codebase version has none — the
 *    backend serializer is pass-through, verified in
 *    backend/tests/test_echo_public_surface.py).
 * 2. Card image fallback — a poster that fails to load falls back to the same
 *    deliberate no-image state (gradient + event title); the card never swaps
 *    in an unrelated image.
 * 3. Card image URLs go through resolveImageUrl (normalization centralized).
 *
 * Same trade-off as echoRemediationGuards.test.ts: full component mounts of
 * EchoEventsPage pull heavy layout dependencies into the node environment, so
 * these guards inspect the render source directly.
 */
import fs from 'fs';
import path from 'path';

const FRONTEND_ROOT = path.resolve(__dirname, '../../../..', '..'); // frontend/
const read = (rel: string) => fs.readFileSync(path.join(FRONTEND_ROOT, rel), 'utf8');

const ECHO_EVENTS = 'src/features/echo/echoEventsPage.tsx';
const API = 'src/models/services/api.ts';

describe('ECHO card status derivation (data-driven, no hardcoded states)', () => {
  const src = () => read(ECHO_EVENTS);

  it('derives status as registration-gate first, then stored badge, then UPCOMING', () => {
    const s = src();
    const expected =
      "item.registration?.enabled === false ? 'CLOSED' : (item.event_status_badge || item.status || 'UPCOMING').toUpperCase()";
    // Present in BOTH canonical mappings (list merge + detail canonical).
    const count = s.split(expected).length - 1;
    expect(count).toBeGreaterThanOrEqual(2);
  });

  it('does not read a display_state lifecycle field', () => {
    const s = src();
    expect(s).not.toContain('display_state');
  });

  it('does not hardcode any live event title as a status source', () => {
    const s = src();
    for (const literal of ['Hack Wave 3.0', 'HackWave 3.0 (2026)', 'CBIT ECHO 2026', 'VNR ECHO 2026']) {
      expect(s).not.toContain(`'${literal}'`);
      expect(s).not.toContain(`"${literal}"`);
    }
  });
});

describe('ECHO card image fallback (deliberate, consistent)', () => {
  const src = () => read(ECHO_EVENTS);

  it('renders card posters through EventCardBanner with an onError fallback', () => {
    const s = src();
    expect(s).toContain('function EventCardBanner(');
    expect(s).toContain('onError={() => setFailed(true)}');
    // Failure reuses the exact no-image state: gradient + event title.
    expect(s).toContain('hasImage ? \'var(--panel2)\'');
  });

  it('normalizes the card poster URL through resolveImageUrl', () => {
    const s = src();
    expect(s).toContain('poster={ev.poster_banner ? resolveImageUrl(ev.poster_banner) : \'\'}');
  });

  it('never fabricates a replacement image URL on failure', () => {
    const s = src();
    // The fallback branch renders the title text only — no image src, no
    // external placeholder host.
    expect(s).not.toContain('picsum.photos');
    expect(s).not.toContain('placehold.co');
    expect(s).not.toContain('via.placeholder');
  });
});

describe('resolveImageUrl routing (backend mount vs frontend-bundled assets)', () => {
  const src = () => read(API);

  it('routes only /uploads/ to the API origin', () => {
    const s = src();
    expect(s).toContain("const BACKEND_STATIC_PREFIX = '/uploads/';");
    expect(s).toContain('cleanUrl.startsWith(BACKEND_STATIC_PREFIX)');
  });

  it('no longer blanket-prefixes every root-relative path with BASE_URL', () => {
    const s = src();
    // The pre-fix unconditional two-line form must be gone.
    const unconditional =
      "const cleanUrl = url.startsWith('/') ? url : `/${url}`;\n  return `${BASE_URL}${cleanUrl}`;";
    expect(s).not.toContain(unconditional);
  });
});
