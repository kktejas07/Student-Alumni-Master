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
export async function request<T>(
  path: string,
  options: { method?: string; body?: any; auth?: boolean } = {},
): Promise<T> {
  const { method = 'GET', body, auth = true } = options;

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

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (auth && token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  // On 401, do a one-shot retry — gives AsyncStorage one more chance to
  // surface a token that was just persisted in the background.
  if (res.status === 401 && auth) {
    const t2 = await tokenStore.getAccess();
    if (t2 && t2 !== token) {
      if (Platform.OS !== 'web') {
        await new Promise((r) => setTimeout(r, 350));
      }
      // Re-fetch token in case it changed during sleep
      const t3 = await tokenStore.getAccess();
      if (t3) {
        const r2 = await fetch(`${BASE_URL}/api${path}`, {
          method,
          headers: { ...headers, Authorization: `Bearer ${t3}` },
          body: body ? JSON.stringify(body) : undefined,
        });
        const t = await r2.text();
        let d: any;
        try { d = t ? JSON.parse(t) : {}; } catch { d = { raw: t }; }
        if (r2.ok) return d as T;
        const detail2 = d?.detail;
        const msg2 = typeof detail2 === 'string'
          ? detail2
          : detail2?.msg || `Request failed (${r2.status})`;
        throw new Error(msg2);
      }
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
    throw new Error(msg);
  }
  return data as T;
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
};

export { BASE_URL };
