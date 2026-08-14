import { getBaseUrl } from '@/src/lib/env';
/**
 * MODEL LAYER - API Service
 * All HTTP communication is centralised here. No UI / state logic.
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BASE_URL = getBaseUrl();

const TOKEN_KEY = 'scd_access_token';
const REFRESH_KEY = 'scd_refresh_token';

// ----- Token storage (SecureStore on native, in-memory + localStorage on web) -----
async function setItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    try {
      window.localStorage.setItem(key, value);
    } catch {}
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return await SecureStore.getItemAsync(key);
}

async function deleteItem(key: string) {
  if (Platform.OS === 'web') {
    try {
      window.localStorage.removeItem(key);
    } catch {}
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export const tokenStore = {
  getAccess: () => getItem(TOKEN_KEY),
  getRefresh: () => getItem(REFRESH_KEY),
  setTokens: async (access: string, refresh: string) => {
    await setItem(TOKEN_KEY, access);
    await setItem(REFRESH_KEY, refresh);
  },
  clear: async () => {
    await deleteItem(TOKEN_KEY);
    await deleteItem(REFRESH_KEY);
  },
};

// ----- HTTP wrapper -----

// Single-flight lock: concurrent 401s all wait on one in-flight refresh.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const refreshToken = await tokenStore.getRefresh();
    if (!refreshToken) return null;
    try {
      const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.access_token) return null;
      await tokenStore.setTokens(data.access_token, refreshToken);
      return data.access_token;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

export async function request<T>(
  path: string,
  options: { method?: string; body?: any; auth?: boolean } = {},
): Promise<T> {
  const { method = 'GET', body, auth = true } = options;
  const t0 = typeof Date !== 'undefined' ? Date.now() : 0;
  const fullUrl = `${BASE_URL}/api${path}`;

  // eslint-disable-next-line no-console
  console.log(`👉 [API REQ] ${method} ${fullUrl}`);

  // Token-readiness retry: AsyncStorage may not have surfaced the saved
  // token on first paint after navigation/page reload. Wait briefly so
  // the first call doesn't 401 just because the token is still loading.
  let token: string | null = null;
  if (auth) {
    token = await tokenStore.getAccess();
    if (!token && Platform.OS !== 'web') {
      // Short backoff, up to ~900 ms total (only on native)
      for (const ms of [120, 220, 280, 280]) {
        await new Promise((r) => setTimeout(r, ms));
        token = await tokenStore.getAccess();
        if (token) break;
      }
    }
  }

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const headers: Record<string, string> = {};
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth && token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(fullUrl, {
      method,
      headers,
      body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
    });

    const duration = t0 ? Date.now() - t0 : 0;

    const text = await res.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    // On 401, exchange the refresh token for a fresh access token and retry once.
    if (res.status === 401 && auth) {
      const fresh = await refreshAccessToken();
      if (fresh) {
        const r2 = await fetch(fullUrl, {
          method,
          headers: { ...headers, Authorization: `Bearer ${fresh}` },
          body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
        });
        const t = await r2.text();
        let d: any;
        try { d = t ? JSON.parse(t) : {}; } catch { d = { raw: t }; }
        if (r2.ok) {
          // eslint-disable-next-line no-console
          console.log(`👈 [API RES] ${r2.status} OK (${Date.now() - t0}ms) ${method} ${fullUrl}`);
          return d as T;
        }
        const detail2 = d?.detail;
        const msg2 = typeof detail2 === 'string'
          ? detail2
          : detail2?.msg || `Request failed (${r2.status})`;
        throw new Error(msg2);
      }
    }

    if (!res.ok) {
      const detail = data?.detail;
      const msg =
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map((d: any) => d?.msg || JSON.stringify(d)).join(' ')
            : detail?.msg || `Request failed (${res.status})`;
      // eslint-disable-next-line no-console
      console.warn(`⚠️ [API WARN] ${res.status} (${duration}ms) ${method} ${fullUrl} - ${msg}`);
      throw new Error(msg);
    }

    // eslint-disable-next-line no-console
    console.log(`👈 [API RES] ${res.status} OK (${duration}ms) ${method} ${fullUrl}`);
    return data as T;
  } catch (err: any) {
    const duration = t0 ? Date.now() - t0 : 0;
    // eslint-disable-next-line no-console
    console.error(`💥 [API ERR] (${duration}ms) ${method} ${fullUrl}`, err?.message || err);
    throw err;
  }
}

export const api = {
  // Auth
  register: (payload: {
    email: string;
    password: string;
    full_name: string;
    role: string;
    phone?: string;
  }) => request<any>('/auth/register', { method: 'POST', body: payload, auth: false }),

  login: (email: string, password: string) =>
    request<any>('/auth/login', { method: 'POST', body: { email, password }, auth: false }),

  // OAuth — Option C: backend uses MOCK verification (passes email/full_name in body)
  // Switch to real provider tokens by populating id_token/access_token instead.
  oauthGoogle: (payload: { email: string; full_name: string; picture?: string; role?: string }) =>
    request<any>('/auth/google', { method: 'POST', body: payload, auth: false }),

  oauthLinkedIn: (payload: { email: string; full_name: string; picture?: string; role?: string }) =>
    request<any>('/auth/linkedin', { method: 'POST', body: payload, auth: false }),

  me: () => request<any>('/auth/me'),

  // 2FA — TOTP-based
  twoFASetup: () =>
    request<{ secret: string; otpauth_uri: string; qr_code_base64: string }>(
      '/auth/2fa/setup', { method: 'POST', body: {} }),

  twoFAEnable: (code: string) =>
    request<{ enabled: boolean; backup_codes: string[] }>(
      '/auth/2fa/enable', { method: 'POST', body: { code } }),

  twoFAVerify: (challenge_id: string, code: string) =>
    request<any>('/auth/2fa/verify', { method: 'POST', body: { challenge_id, code }, auth: false }),

  twoFADisable: (password: string, code: string) =>
    request<{ disabled: boolean }>('/auth/2fa/disable', { method: 'POST', body: { password, code } }),

  twoFARegenerateBackupCodes: (code: string) =>
    request<{ enabled: boolean; backup_codes: string[] }>(
      '/auth/2fa/regenerate-backup-codes', { method: 'POST', body: { code } }),

  // Onboarding
  completeOnboarding: (payload: any) =>
    request<any>('/users/onboarding', { method: 'POST', body: payload }),

  updateProfile: (payload: any) =>
    request<any>('/users/me', { method: 'PUT', body: payload }),

  getPublicProfile: (userId: string) =>
    request<any>(`/users/${userId}/public-profile`),

  // AI
  getCareerIntelligence: () => request<any>('/users/me/skill-intelligence'),

  getCareerSuggestions: (additional_context?: string) =>
    request<any>('/ai/career-suggestions', {
      method: 'POST',
      body: { additional_context },
    }),

  getCachedSuggestions: () => request<any>('/ai/career-suggestions/cached'),

  chatSend: (message: string, session_id?: string) =>
    request<any>('/ai/chat', { method: 'POST', body: { message, session_id } }),

  chatHistory: (session_id?: string) =>
    request<any>(`/ai/chat/history${session_id ? `?session_id=${session_id}` : ''}`),

  chatSessions: () => request<any>('/ai/chat/sessions'),

  generateBio: (data: {
    role: string;
    full_name?: string;
    writing_style: string;
    existing_bio?: string;
    institution?: string;
    education_level?: string;
    career_goal?: string;
    interests?: string[];
    skills?: string[];
    organization?: string;
    job_title?: string;
    mentor_category?: string;
    expertise?: string[];
    graduation_year?: string;
    employment_status?: string;
    institution_name?: string;
    location?: string;
    institution_type?: string;
  }) => request<{ bio: string }>('/ai/generate-bio', { method: 'POST', body: data }),

  // Catalog
  listCourses: (career_path?: string) =>
    request<any>(`/catalog/courses${career_path ? `?career_path=${career_path}` : ''}`),
  listMentors: (career_path?: string) =>
    request<any>(`/catalog/mentors${career_path ? `?career_path=${career_path}` : ''}`),
  listInternships: (career_path?: string) =>
    request<any>(`/catalog/internships${career_path ? `?career_path=${career_path}` : ''}`),
  listDeals: (category?: string) =>
    request<any>(`/catalog/deals${category ? `?category=${category}` : ''}`),
  listResources: (category?: string) =>
    request<any>(`/catalog/resources${category ? `?category=${category}` : ''}`),
  listEvents: (category?: string) =>
    request<any>(`/catalog/events${category ? `?category=${category}` : ''}`),
  listFinancial: (kind?: 'loan' | 'scholarship') =>
    request<any>(`/catalog/financial${kind ? `?kind=${kind}` : ''}`),
  listInsurance: (kind?: string) =>
    request<any>(`/catalog/insurance${kind ? `?kind=${kind}` : ''}`),
  listHousing: (country?: string) =>
    request<any>(`/catalog/housing${country ? `?country=${country}` : ''}`),

  // Bookings
  createBooking: (payload: any) =>
    request<any>('/bookings', { method: 'POST', body: payload }),
  myBookings: () => request<any>('/bookings/me'),

  // Event registration with QR
  registerEvent: (event_id: string) =>
    request<any>(`/events/${event_id}/register`, { method: 'POST', body: {} }),
  myEventRegistration: (event_id: string) =>
    request<any>(`/events/${event_id}/my-registration`),
  myEventRegistrations: () => request<any>('/events/my-registrations'),

  // Knowledge Rooms (Module 4: Networking chat)
  listRooms: () => request<any>('/rooms'),
  roomMessages: (room_id: string) => request<any>(`/rooms/${room_id}/messages`),
  postRoomMessage: (room_id: string, message: string) =>
    request<any>(`/rooms/${room_id}/messages`, { method: 'POST', body: { message } }),

  // Admin
  pendingMentors: () => request<any>('/admin/mentors/pending'),
  approveMentor: (id: string) =>
    request<any>(`/admin/mentors/${id}/approve`, { method: 'POST' }),
  rejectMentor: (id: string) =>
    request<any>(`/admin/mentors/${id}/reject`, { method: 'POST' }),

  // Dashboard
  dashboard: () => request<any>('/dashboard'),

  // Personalization (preferences editor + alumni transition + click tracking)
  updatePreferences: (payload: {
    career_path?: string;
    education_level?: string;
    interests?: string[];
    skills?: string[];
  }) => request<any>('/users/me/preferences', { method: 'PATCH', body: payload }),

  transitionToAlumni: () =>
    request<any>('/users/me/transition-alumni', { method: 'POST', body: {} }),

  trackModuleClick: (module_id: string) =>
    request<any>('/dashboard/track-click', { method: 'POST', body: { module_id } }),

  // Analytics — adapts payload to caller's role (admin/college/mentor)
  analytics: () => request<any>('/analytics'),

  // Integrations status + live fetches
  integrationsStatus: () => request<any>('/integrations/status'),
  liveCourses: (q?: string) => request<any>(`/integrations/courses${q ? `?query=${encodeURIComponent(q)}` : ''}`),
  liveInternships: (q?: string) => request<any>(`/integrations/internships${q ? `?query=${encodeURIComponent(q)}` : ''}`),

  // Reviews
  postReview: (payload: { mentor_id: string; rating: number; comment?: string; booking_id?: string }) =>
    request<any>('/reviews', { method: 'POST', body: payload }),
  mentorReviews: (mentor_id: string) => request<any>(`/mentors/${mentor_id}/reviews`),
  replyToReview: (review_id: string, reply: string) =>
    request<any>(`/reviews/${review_id}/reply`, { method: 'POST', body: { reply } }),

  // Bookings / Dev actions
  markBookingCompleted: (booking_id: string) =>
    request<any>(`/student/bookings/${booking_id}/complete`, { method: 'POST', body: {} }),

  // Notifications
  registerPushToken: (token: string, platform = 'unknown') =>
    request<any>('/notifications/register', { method: 'POST', body: { token, platform } }),
  notifications: () => request<any>('/notifications'),
  markNotificationsRead: (ids?: string[]) =>
    request<any>('/notifications/mark-read', {
      method: 'POST',
      body: ids ? { ids } : {},
    }),
  dismissNotifications: (ids?: string[]) =>
    request<any>('/notifications/dismiss', {
      method: 'POST',
      body: ids ? { ids } : {},
    }),
  // Mentor portal: booking actions + session posting
  confirmBooking: (id: string) =>
    request<any>(`/bookings/${id}/confirm`, { method: 'POST', body: {} }),
  declineBooking: (id: string) =>
    request<any>(`/bookings/${id}/decline`, { method: 'POST', body: {} }),
  createMentorSession: (payload: {
    title: string;
    topic: string;
    scheduled_at: string;
    duration_minutes: number;
    max_attendees: number;
  }) => request<any>('/mentor/sessions', { method: 'POST', body: payload }),
  myMentorSessions: () => request<any>('/mentor/sessions/me'),
  mentorConnections: (email?: string, page: number = 1, per_page: number = 24) => request<any>(`/mentor/connections${email ? `?email=${encodeURIComponent(email)}&page=${page}&per_page=${per_page}` : `?page=${page}&per_page=${per_page}`}`),
  acceptConnection: (otherId: string) => request<any>(`/network/accept/${otherId}`, { method: 'POST' }),
  rejectConnection: (otherId: string) => request<any>(`/network/reject/${otherId}`, { method: 'POST' }),
  withdrawConnection: (otherId: string) => request<any>(`/network/withdraw/${otherId}`, { method: 'POST' }),
  createMentorBooking: (payload: {
    student_id: string;
    slot_start_iso: string;
    topic: string;
    notes?: string;
  }) => request<any>('/mentor/bookings', { method: 'POST', body: payload }),
  rescheduleBooking: (id: string, slotStartIso: string) =>
    request<any>(`/bookings/${id}/reschedule`, { method: 'POST', body: { slot_start_iso: slotStartIso } }),
  networkDiscover: (q?: string) => request<any>(`/network/discover${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  networkConnections: () => request<any>('/network/connections'),
  networkRequests: () => request<any>('/network/requests'),
  sendConnectionRequest: (otherId: string, message?: string) =>
    request<any>(`/network/connect/${encodeURIComponent(otherId)}`, {
      method: 'POST',
      body: message ? { message } : {},
    }),

  // ── ECHO Showcase ──────────────────────────────────────────────────────────
  listEchoShowcases: () => request<any>('/echo/showcases'),
  getEchoShowcase: (slug: string) => request<any>(`/echo/showcases/${slug}`),
  registerEchoShowcase: (slug: string, payload: any) =>
    request<any>(`/echo/showcases/${slug}/register`, { method: 'POST', body: payload }),
  myEchoRegistration: (slug: string) =>
    request<any>(`/echo/showcases/${slug}/my-registration`),
  createEchoPaymentOrder: (slug: string, payload: any) =>
    request<any>(`/echo/showcases/${slug}/payment-order`, { method: 'POST', body: payload }),
  verifyEchoPayment: (slug: string, payload: any) =>
    request<any>(`/echo/showcases/${slug}/verify-payment`, { method: 'POST', body: payload }),

  // Public college autocomplete (registration / onboarding forms)
  searchColleges: (q: string, limit = 8) =>
    request<any>(`/colleges/search?q=${encodeURIComponent(q)}&limit=${limit}`, { auth: false }),

  // Admin ECHO Showcase
  adminListEchoShowcases: () => request<any>('/echo/admin/showcases'),
  createEchoShowcase: (payload: any) =>
    request<any>('/echo/admin/showcases', { method: 'POST', body: payload }),
  updateEchoShowcase: (id: string, payload: any) =>
    request<any>(`/echo/admin/showcases/${id}`, { method: 'PUT', body: payload }),
  deleteEchoShowcase: (id: string) =>
    request<any>(`/echo/admin/showcases/${id}`, { method: 'DELETE' }),
  publishEchoShowcase: (id: string) =>
    request<any>(`/echo/admin/showcases/${id}/publish`, { method: 'PATCH' }),
  draftEchoShowcase: (id: string) =>
    request<any>(`/echo/admin/showcases/${id}/draft`, { method: 'PATCH' }),
  archiveEchoShowcase: (id: string) =>
    request<any>(`/echo/admin/showcases/${id}/archive`, { method: 'PATCH' }),
  uploadEchoMedia: (payload: any) => {
    if (typeof FormData !== 'undefined' && payload instanceof FormData) {
      return request<any>('/echo/admin/upload', { method: 'POST', body: payload });
    }
    if (payload && payload.file && typeof FormData !== 'undefined') {
      const fd = new FormData();
      fd.append('file', payload.file, payload.filename || payload.file.name);
      return request<any>('/echo/admin/upload', { method: 'POST', body: fd });
    }
    return request<any>('/echo/admin/upload', { method: 'POST', body: payload });
  },
  listEchoMedia: () =>
    request<any>('/echo/admin/media'),
  getEchoMediaStats: () =>
    request<any>('/echo/admin/media/stats'),
  deleteEchoMedia: (filename: string) =>
    request<any>(`/echo/admin/media/${encodeURIComponent(filename)}`, { method: 'DELETE' }),
  bulkDeleteEchoMedia: (filenames: string[]) =>
    request<any>('/echo/admin/media/bulk-delete', { method: 'POST', body: { filenames } }),
  restoreEchoShowcaseVersion: (id: string, versionIndex: number) =>
    request<any>(`/echo/admin/showcases/${id}/restore/${versionIndex}`, { method: 'POST' }),
  adminEchoRegistrations: () =>
    request<any>('/echo/admin/registrations'),
  adminEchoDeleteRegistration: (regId: string) =>
    request<any>(`/echo/admin/registrations/${regId}`, { method: 'DELETE' }),
  adminEchoSendPaymentReminder: (regId: string) =>
    request<any>(`/echo/admin/registrations/${regId}/remind`, { method: 'POST' }),
  adminEchoMarkRegistrationFailed: (regId: string) =>
    request<any>(`/echo/admin/registrations/${regId}/mark-failed`, { method: 'POST' }),
  adminEchoRevenue: () =>
    request<any>('/echo/admin/revenue'),
  myEchoInvoices: () =>
    request<any>('/echo/my-invoices'),
  myEchoRegistrations: () =>
    request<any>('/echo/my-registrations'),

  // ── Newsletter ────────────────────────────────────────────────────────────
  sendNewsletter: (payload: any) =>
    request<any>('/newsletter/admin/send', { method: 'POST', body: payload }),
  saveNewsletterDraft: (payload: any) =>
    request<any>('/newsletter/admin/save-draft', { method: 'POST', body: payload }),
  previewNewsletter: (payload: any) =>
    request<any>('/newsletter/admin/preview', { method: 'POST', body: payload }),
  sendNewsletterTest: (payload: any) =>
    request<any>('/newsletter/admin/send-test', { method: 'POST', body: payload }),
  sendNewsletterTestWhatsApp: (payload: any) =>
    request<any>('/newsletter/admin/send-test-whatsapp', { method: 'POST', body: payload }),
  cancelNewsletterCampaign: (campaignId: string) =>
    request<any>(`/newsletter/admin/campaigns/${campaignId}`, { method: 'DELETE' }),
  getNewsletterCampaign: (campaignId: string) =>
    request<any>(`/newsletter/admin/campaigns/${campaignId}`),
  updateNewsletterCampaign: (campaignId: string, payload: any) =>
    request<any>(`/newsletter/admin/campaigns/${campaignId}`, { method: 'PATCH', body: payload }),
  listNewsletterCampaigns: () =>
    request<any>('/newsletter/admin/campaigns'),
  newsletterUpcomingEvents: () =>
    request<any>('/newsletter/admin/upcoming-events'),
  getNewsletterRecipientCount: () =>
    request<any>('/newsletter/admin/recipient-count'),

  emailQualityReport: (q = '') =>
    request<any>(`/admin/email-quality${q ? `?q=${encodeURIComponent(q)}` : ''}`),
  unsuppressEmail: (email: string) =>
    request<any>(`/admin/email-quality/suppressions?email=${encodeURIComponent(email)}`, { method: 'DELETE' }),

  // ── Newsletter image upload (shared /admin/upload endpoint) ───────────────
  uploadNewsletterImage: (file: File, folder = 'newsletter') => {
    const fd = new FormData();
    fd.append('file', file, file.name);
    return request<any>(`/admin/upload?folder=${encodeURIComponent(folder)}`, { method: 'POST', body: fd });
  },

  // ── Individual notifications ──────────────────────────────────────────────
  searchUsers: (q: string) =>
    request<any>(`/newsletter/admin/search-users?q=${encodeURIComponent(q)}`),
  sendIndividualNotification: (payload: any) =>
    request<any>('/newsletter/admin/send-individual', { method: 'POST', body: payload }),
};

export function resolveImageUrl(url?: string | null): string {
  if (!url) return '';
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:') ||
    url.startsWith('blob:')
  ) {
    return url;
  }
  const cleanUrl = url.startsWith('/') ? url : `/${url}`;
  return `${BASE_URL}${cleanUrl}`;
}

export { BASE_URL };
