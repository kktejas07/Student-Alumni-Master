/**
 * Contract tests — Google OAuth request construction (frontend side).
 *
 * Mirrors the production flow: the web client signs in through Firebase Auth
 * (signInWithPopup → user.getIdToken()) and the resulting Firebase ID token
 * must be posted under the `id_token` field to POST /api/auth/google —
 * exactly the field the backend OAuthCallback schema verifies.
 *
 * These tests pin the request contract so a field rename/drop in the API
 * client can never silently break Google login again.
 */
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(async () => null),
  deleteItemAsync: jest.fn(),
}));
jest.mock('react-native', () => ({
  Platform: { OS: 'web', select: (o: any) => o.web ?? o.default },
}));
jest.mock('@/src/lib/env', () => ({ getBaseUrl: () => 'https://unit.test' }));

import { api } from '../api';

const fetchMock = jest.fn();

beforeAll(() => {
  (global as any).fetch = fetchMock;
});

beforeEach(() => {
  fetchMock.mockReset();
});

function okJson(payload: unknown) {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(payload),
  };
}

const SESSION_OK = {
  access_token: 'at-token',
  refresh_token: 'rt-token',
  user: { id: 'u1', email: 'g.user@example.com', full_name: 'G User', role: 'student' },
};

describe('api.oauthGoogle request contract', () => {
  it('posts the Firebase ID token under `id_token` to /api/auth/google', async () => {
    fetchMock.mockResolvedValueOnce(okJson(SESSION_OK));

    const res = await api.oauthGoogle({
      id_token: 'firebase-id-token-abc',
      email: 'g.user@example.com',
      full_name: 'G User',
      picture: 'https://pic.example.com/a.jpg',
      role: 'student',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://unit.test/api/auth/google');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    // auth:false — an OAuth exchange must never carry a platform bearer token.
    expect(init.headers.Authorization).toBeUndefined();

    const body = JSON.parse(init.body);
    expect(body.id_token).toBe('firebase-id-token-abc'); // ← the contract
    expect(body.email).toBe('g.user@example.com');
    expect(body.full_name).toBe('G User');
    expect(body.picture).toBe('https://pic.example.com/a.jpg');
    expect(body.role).toBe('student');

    expect(res.access_token).toBe('at-token');
  });

  it('surfaces the backend 401 detail unmasked (no silent success)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ detail: 'Google sign-in requires a valid id_token.' }),
    });

    await expect(
      api.oauthGoogle({ id_token: 'bad-token', email: 'g.user@example.com' })
    ).rejects.toThrow('Google sign-in requires a valid id_token.');
  });
});

describe('email/password login contract (regression guard)', () => {
  it('posts the classic credentials body to /api/auth/login', async () => {
    fetchMock.mockResolvedValueOnce(okJson(SESSION_OK));

    await api.login('s.user@example.com', 'Sup3rSecret');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://unit.test/api/auth/login');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({
      email: 's.user@example.com',
      password: 'Sup3rSecret',
    });
  });
});
