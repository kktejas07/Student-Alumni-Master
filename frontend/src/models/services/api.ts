/**
 * MODEL LAYER - API Service
 * All HTTP communication is centralised here. No UI / state logic.
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

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
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (auth) {
    const token = await tokenStore.getAccess();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

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

  // Bookings
  myBookings: () => request<any>('/bookings/me'),

  // Reviews
  postReview: (payload: { mentor_id: string; rating: number; comment?: string; booking_id?: string }) =>
    request<any>('/reviews', { method: 'POST', body: payload }),
  mentorReviews: (mentor_id: string) => request<any>(`/mentors/${mentor_id}/reviews`),

  // Notifications
  registerPushToken: (token: string, platform = 'unknown') =>
    request<any>('/notifications/register', { method: 'POST', body: { token, platform } }),
  notifications: () => request<any>('/notifications'),
  markNotificationsRead: (ids?: string[]) =>
    request<any>('/notifications/mark-read', { method: 'POST', body: { ids } }),

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
};

export { BASE_URL };
