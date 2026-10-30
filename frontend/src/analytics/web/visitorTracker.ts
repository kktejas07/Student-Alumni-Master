/**
 * frontend/src/analytics/web/visitorTracker.ts
 *
 * Client-side Visitor & Telemetry Engine.
 * Runs automatically for all visitors (unregistered guests & authenticated users).
 * Captures hardware fingerprinting, screen specs, CPU/RAM, WebGL GPU info,
 * network stats, UTM tags, referrer, navigation journey, and lead inference.
 */

import { Platform } from 'react-native';
import { getBaseUrl } from '@/src/lib/env';

const BASE_URL = getBaseUrl();
const VISITOR_ID_KEY = 'sa_visitor_uuid';
const SESSION_ID_KEY = 'sa_session_uuid';
const INFERRED_LEAD_KEY = 'sa_inferred_lead';

export interface HardwareSpecs {
  screen_resolution?: string;
  viewport?: string;
  color_depth?: number;
  pixel_ratio?: number;
  cpu_cores?: number;
  device_memory_gb?: number;
  gpu_renderer?: string;
  gpu_vendor?: string;
  touch_support?: boolean;
  connection_type?: string;
  downlink_mbps?: number;
  rtt_ms?: number;
  timezone?: string;
  language?: string;
  platform?: string;
}

export interface InferredLead {
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
}

let cachedVisitorId: string | null = null;
let cachedSessionId: string | null = null;
let cachedFingerprint: string | null = null;
let cachedHardware: HardwareSpecs | null = null;
let pageViewsCount = 1;
let clicksCount = 0;
let sessionStartTime = Date.now();
let heartbeatInterval: any = null;
let isInitialized = false;

// ── UUID generator ────────────────────────────────────────────────────────
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── Visitor ID (Persistent across sessions) ──────────────────────────────
export function getVisitorId(): string {
  if (cachedVisitorId) return cachedVisitorId;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(VISITOR_ID_KEY);
      if (stored) {
        cachedVisitorId = stored;
        return stored;
      }
      const newId = generateUUID();
      window.localStorage.setItem(VISITOR_ID_KEY, newId);
      cachedVisitorId = newId;
      return newId;
    } catch {}
  }
  cachedVisitorId = generateUUID();
  return cachedVisitorId;
}

// ── Session ID (Per browser session) ──────────────────────────────────────
export function getVisitorSessionId(): string {
  if (cachedSessionId) return cachedSessionId;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const stored = window.sessionStorage.getItem(SESSION_ID_KEY);
      if (stored) {
        cachedSessionId = stored;
        return stored;
      }
      const newId = generateUUID();
      window.sessionStorage.setItem(SESSION_ID_KEY, newId);
      cachedSessionId = newId;
      return newId;
    } catch {}
  }
  cachedSessionId = generateUUID();
  return cachedSessionId;
}

// ── WebGL GPU Renderer & Vendor Extraction ────────────────────────────────
function getGPUInfo(): { renderer: string; vendor: string } {
  if (typeof document === 'undefined') return { renderer: '', vendor: '' };
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return { renderer: '', vendor: '' };
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '';
      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '';
      return { vendor: String(vendor), renderer: String(renderer) };
    }
    return {
      vendor: gl.getParameter(gl.VENDOR) || '',
      renderer: gl.getParameter(gl.RENDERER) || '',
    };
  } catch {
    return { renderer: '', vendor: '' };
  }
}

// ── Canvas Fingerprint Generation ─────────────────────────────────────────
function getCanvasFingerprint(): string {
  if (typeof document === 'undefined') return 'canvas_na';
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'ctx_na';

    ctx.textBaseline = 'top';
    ctx.font = "14px 'Arial', 'Helvetica', sans-serif";
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('StudentAlumni.ai 1234', 2, 15);
    ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
    ctx.fillText('StudentAlumni.ai 1234', 4, 17);

    const dataUrl = canvas.toDataURL();
    // Fast hash
    let hash = 0;
    for (let i = 0; i < dataUrl.length; i++) {
      hash = (hash << 5) - hash + dataUrl.charCodeAt(i);
      hash |= 0;
    }
    return 'c_' + Math.abs(hash).toString(16);
  } catch {
    return 'c_fallback';
  }
}

// ── Hardware Fingerprint Hash ─────────────────────────────────────────────
export function getHardwareFingerprint(): string {
  if (cachedFingerprint) return cachedFingerprint;
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    cachedFingerprint = 'native_' + getVisitorId().slice(0, 8);
    return cachedFingerprint;
  }

  const canvasHash = getCanvasFingerprint();
  const gpu = getGPUInfo();
  const scr = `${window.screen?.width}x${window.screen?.height}x${window.screen?.colorDepth}`;
  const cores = navigator.hardwareConcurrency || 2;
  const mem = (navigator as any).deviceMemory || 4;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  const lang = navigator.language || '';

  const raw = `${canvasHash}|${gpu.vendor}|${gpu.renderer}|${scr}|${cores}|${mem}|${tz}|${lang}`;
  
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash << 5) - hash + raw.charCodeAt(i);
    hash |= 0;
  }

  const fp = 'fp_' + Math.abs(hash).toString(16) + '_' + canvasHash.slice(2, 6);
  cachedFingerprint = fp;
  return fp;
}

// ── Full Hardware Specs Collector ─────────────────────────────────────────
export function getHardwareSpecs(): HardwareSpecs {
  if (cachedHardware) return cachedHardware;
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return { platform: Platform.OS };
  }

  const gpu = getGPUInfo();
  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;

  const specs: HardwareSpecs = {
    screen_resolution: window.screen ? `${window.screen.width}x${window.screen.height}` : undefined,
    viewport: `${window.innerWidth}x${window.innerHeight}`,
    color_depth: window.screen?.colorDepth,
    pixel_ratio: window.devicePixelRatio,
    cpu_cores: navigator.hardwareConcurrency,
    device_memory_gb: (navigator as any).deviceMemory,
    gpu_renderer: gpu.renderer,
    gpu_vendor: gpu.vendor,
    touch_support: 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0,
    connection_type: conn?.effectiveType || conn?.type,
    downlink_mbps: conn?.downlink,
    rtt_ms: conn?.rtt,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    platform: navigator.platform,
  };

  cachedHardware = specs;
  return specs;
}

// ── UTM & Campaign Parameter Parser ───────────────────────────────────────
function getUTMParams(): {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  term?: string;
} {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return {};
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      source: params.get('utm_source') || undefined,
      medium: params.get('utm_medium') || undefined,
      campaign: params.get('utm_campaign') || undefined,
      content: params.get('utm_content') || undefined,
      term: params.get('utm_term') || undefined,
    };
  } catch {
    return {};
  }
}

// ── Module Inference from Pathname ─────────────────────────────────────────
export function inferModuleFromPath(path: string): string {
  const p = (path || '').toLowerCase().trim();
  if (p === '/' || p === '/welcome' || p === '/landing' || p.startsWith('/welcome') || p.startsWith('/about')) {
    return 'landing';
  }
  if (p.startsWith('/login') || p.startsWith('/register') || p.startsWith('/auth') || p.startsWith('/onboarding')) {
    return 'auth';
  }
  if (p.startsWith('/tickets') || p.includes('/tickets')) {
    return 'tickets';
  }
  if (p.startsWith('/workshops') || p.startsWith('/workshop')) {
    return 'workshops';
  }
  if (p.startsWith('/coupons') || p.includes('/coupons')) {
    return 'coupons';
  }
  if (p.startsWith('/teams')) {
    return 'teams';
  }
  if (p.startsWith('/certificates') || p.startsWith('/verify')) {
    return 'certificates';
  }
  if (p.startsWith('/courses') || p.startsWith('/skills')) {
    return 'courses';
  }
  if (p.startsWith('/events') || p.startsWith('/hackathon') || p.startsWith('/webinar')) {
    return 'events';
  }
  if (p.startsWith('/deals') || p.startsWith('/perks') || p.startsWith('/discount')) {
    return 'deals';
  }
  if (p.startsWith('/mentors') || p.startsWith('/mentor-ai') || p.startsWith('/ai-studio')) {
    return 'mentorship';
  }
  if (p.startsWith('/college') || p.startsWith('/campus') || p.startsWith('/university')) {
    return 'college';
  }
  if (p.startsWith('/talent') || p.startsWith('/jobs') || p.startsWith('/career')) {
    return 'talent';
  }
  if (p.startsWith('/bgv') || p.startsWith('/verification') || p.startsWith('/accounts')) {
    return 'bgv';
  }
  if (p.startsWith('/echo') || p.startsWith('/showcase')) {
    return 'echo';
  }
  if (p.startsWith('/newsletter') || p.startsWith('/article') || p.startsWith('/blog')) {
    return 'newsletter';
  }
  if (p.startsWith('/admin') || p.startsWith('/portal')) {
    return 'admin';
  }
  return 'general';
}

// ── Inferred Lead Storage ──────────────────────────────────────────────────
export function getStoredInferredLead(): InferredLead {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(INFERRED_LEAD_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
  }
  return {};
}

export function saveInferredLead(lead: InferredLead) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const current = getStoredInferredLead();
      const updated = { ...current, ...lead };
      window.localStorage.setItem(INFERRED_LEAD_KEY, JSON.stringify(updated));
    } catch {}
  }
}

// ── Send Heartbeat to Backend ──────────────────────────────────────────────
export async function sendVisitorHeartbeat(extra?: {
  current_path?: string;
  module?: string;
  user_id?: string;
  user_role?: string;
}): Promise<void> {
  if (typeof window === 'undefined') return;

  const path = extra?.current_path || window.location.pathname || '/';
  const utm = getUTMParams();
  const lead = getStoredInferredLead();
  const duration = Math.round((Date.now() - sessionStartTime) / 1000);

  const payload = {
    session_id: getVisitorSessionId(),
    visitor_id: getVisitorId(),
    device_fingerprint: getHardwareFingerprint(),
    current_path: path,
    current_module: extra?.module || inferModuleFromPath(path),
    referrer: typeof document !== 'undefined' ? document.referrer : '',
    landing_page: path,
    utm_source: utm.source,
    utm_medium: utm.medium,
    utm_campaign: utm.campaign,
    utm_content: utm.content,
    utm_term: utm.term,
    duration_seconds: duration,
    page_views_count: pageViewsCount,
    clicks_count: clicksCount,
    inferred_name: lead.name,
    inferred_email: lead.email,
    inferred_phone: lead.phone,
    user_id: extra?.user_id,
    user_role: extra?.user_role || (extra?.user_id ? 'registered' : 'guest'),
    hardware: getHardwareSpecs(),
  };

  try {
    await fetch(`${BASE_URL}/api/analytics/visitor/heartbeat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Gracefully handle network drops
  }
}

// ── Log Fine-Grained Visitor Event ────────────────────────────────────────
export async function trackVisitorEvent(
  eventType: 'page_view' | 'click' | 'scroll' | 'lead_submit' | 'form_focus' | string,
  data?: {
    path?: string;
    module?: string;
    element_id?: string;
    element_text?: string;
    target_url?: string;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  if (typeof window === 'undefined') return;

  if (eventType === 'page_view') {
    pageViewsCount += 1;
  } else if (eventType === 'click') {
    clicksCount += 1;
  }

  const currentPath = data?.path || window.location.pathname || '/';

  const payload = {
    session_id: getVisitorSessionId(),
    visitor_id: getVisitorId(),
    event_type: eventType,
    module: data?.module || inferModuleFromPath(currentPath),
    path: currentPath,
    element_id: data?.element_id,
    element_text: data?.element_text,
    target_url: data?.target_url,
    metadata: data?.metadata || {},
  };

  try {
    await fetch(`${BASE_URL}/api/analytics/visitor/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {}
}

// ── Identify Visitor (Attach Name / Email) ────────────────────────────────
export async function identifyVisitor(lead: InferredLead): Promise<void> {
  saveInferredLead(lead);

  const payload = {
    visitor_id: getVisitorId(),
    session_id: getVisitorSessionId(),
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    role: lead.role,
  };

  try {
    await fetch(`${BASE_URL}/api/analytics/visitor/identify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    // Send immediate heartbeat update
    sendVisitorHeartbeat();
  } catch {}
}

// ── Initialize Automatic Visitor Telemetry ────────────────────────────────
export function initVisitorTracking(): void {
  if (isInitialized || Platform.OS !== 'web' || typeof window === 'undefined') return;
  isInitialized = true;

  // 1. Initial Heartbeat
  sendVisitorHeartbeat();

  // 2. Periodic Heartbeat (every 25 seconds)
  if (heartbeatInterval) clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => {
    sendVisitorHeartbeat();
  }, 25_000);

  // 3. Page visibility listener
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        sendVisitorHeartbeat();
      }
    });
  }

  // 4. Global click listener for visitor click streams
  if (typeof window !== 'undefined') {
    window.addEventListener('click', (e) => {
      try {
        const target = e.target as HTMLElement | null;
        if (!target) return;
        const clickable = target.closest('button, a, [role="button"], input[type="submit"]') as HTMLElement | null;
        if (clickable) {
          const elementText = (clickable.innerText || clickable.getAttribute('aria-label') || clickable.getAttribute('title') || '').slice(0, 100);
          const elementId = clickable.id || clickable.getAttribute('data-testid') || clickable.getAttribute('name');
          const targetUrl = (clickable as HTMLAnchorElement).href;

          trackVisitorEvent('click', {
            element_id: elementId || undefined,
            element_text: elementText || undefined,
            target_url: targetUrl || undefined,
          });
        }
      } catch {}
    }, true);

    // 5. Global form interaction listener for inferring visitor names/emails on guest lead forms
    window.addEventListener('change', (e) => {
      try {
        const target = e.target as HTMLInputElement | null;
        if (!target || !target.value) return;

        const val = target.value.trim();
        const type = (target.type || '').toLowerCase();
        const name = (target.name || target.id || '').toLowerCase();

        if (type === 'email' || name.includes('email')) {
          if (val.includes('@') && val.includes('.')) {
            identifyVisitor({ email: val });
          }
        } else if (name.includes('name') && !name.includes('username') && val.length >= 2) {
          identifyVisitor({ name: val });
        } else if (type === 'tel' || name.includes('phone') || name.includes('mobile')) {
          if (val.length >= 7) {
            identifyVisitor({ phone: val });
          }
        }
      } catch {}
    }, true);
  }
}

export default {
  init: initVisitorTracking,
  sendHeartbeat: sendVisitorHeartbeat,
  trackEvent: trackVisitorEvent,
  identify: identifyVisitor,
  getVisitorId,
  getSessionId: getVisitorSessionId,
  getHardwareSpecs,
  getHardwareFingerprint,
};
