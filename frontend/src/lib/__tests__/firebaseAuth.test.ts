/**
 * firebaseAuth contract tests — Firebase web-config handling for Google sign-in.
 *
 * Regression coverage for the local `auth/api-key-not-valid` failure:
 *   1. Missing/empty configuration must produce a CLEAR diagnostic, never an
 *      unexplained login failure.
 *   2. The auth flow must NEVER silently adopt an unrelated Firebase app's
 *      configuration (wrong project) — it must initialize with exactly the
 *      configuration it was given.
 *   3. A matching existing app is reused; a second initialization never
 *      duplicates apps.
 *
 * The Firebase JS SDK is mocked at the module boundary (jest.mock). No real
 * Google/Firebase tokens, keys, or network calls are used.
 */

const mockInitializeApp = jest.fn();
const mockGetApp = jest.fn();
const mockGetApps = jest.fn();
const mockGetAuth = jest.fn();
const mockSignInWithPopup = jest.fn();
const mockGetIdToken = jest.fn();

jest.mock('firebase/app', () => ({
  initializeApp: mockInitializeApp,
  getApp: mockGetApp,
  getApps: mockGetApps,
}));

jest.mock('firebase/auth', () => ({
  getAuth: mockGetAuth,
  GoogleAuthProvider: jest.fn(),
  GithubAuthProvider: jest.fn(),
  PhoneAuthProvider: jest.fn(),
  signInWithPopup: mockSignInWithPopup,
  signInWithPhoneNumber: jest.fn(),
}));

const WEB_CONFIG = {
  apiKey: 'unit-test-api-key',
  authDomain: 'unit-test.firebaseapp.com',
  projectId: 'unit-test-project',
  appId: '1:000000000000:web:unit',
};

const ENV_KEYS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
];

function defaultMockBehavior() {
  mockGetApps.mockReturnValue([]);
  mockGetApp.mockImplementation(() => { throw new Error('app/after-this-name-not-found'); });
  mockInitializeApp.mockImplementation((config: any, name?: string) => ({
    name: name || '[DEFAULT]',
    options: config,
  }));
  mockGetAuth.mockImplementation((app: any) => ({ app }));
}

async function freshModule() {
  let mod: any;
  await jest.isolateModulesAsync(async () => {
    mod = await import('../firebaseAuth');
  });
  return mod;
}

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  ENV_KEYS.forEach((k) => { delete process.env[k]; });
  defaultMockBehavior();
});

afterEach(() => {
  ENV_KEYS.forEach((k) => { delete process.env[k]; });
});

describe('initFirebaseAuth — configuration handling', () => {
  test('missing/empty config returns false and never touches the Firebase SDK', async () => {
    const { initFirebaseAuth } = await freshModule();

    expect(await initFirebaseAuth({ apiKey: '', authDomain: '', projectId: '', appId: '' })).toBe(false);
    expect(await initFirebaseAuth({ apiKey: 'key', authDomain: '', projectId: '', appId: '' })).toBe(false);
    expect(mockInitializeApp).not.toHaveBeenCalled();
    expect(mockGetAuth).not.toHaveBeenCalled();
  });

  test('initializes a dedicated named app with EXACTLY the provided config', async () => {
    const { initFirebaseAuth, getFirebaseAuth } = await freshModule();

    expect(await initFirebaseAuth(WEB_CONFIG)).toBe(true);

    expect(mockInitializeApp).toHaveBeenCalledTimes(1);
    expect(mockInitializeApp).toHaveBeenCalledWith(WEB_CONFIG, 'studentalumni-auth');
    const app = mockInitializeApp.mock.results[0].value;
    // .auth is a lazy getter — accessing it wires getAuth(app)
    expect(getFirebaseAuth().auth).toBeDefined();
    expect(mockGetAuth).toHaveBeenCalledWith(app);
  });

  test('does NOT adopt an unrelated existing app — initializes its own instead', async () => {
    // Simulates e.g. an analytics app initialized earlier with a different
    // (stale/invalid) configuration. Auth must ignore it.
    mockGetApps.mockReturnValue([
      { name: 'analytics-app', options: { apiKey: 'other-key', projectId: 'other-project' } },
    ]);
    const { initFirebaseAuth, getFirebaseAuth } = await freshModule();

    expect(await initFirebaseAuth(WEB_CONFIG)).toBe(true);

    expect(mockInitializeApp).toHaveBeenCalledWith(WEB_CONFIG, 'studentalumni-auth');
    const app = mockInitializeApp.mock.results[0].value;
    expect(app.options.apiKey).toBe(WEB_CONFIG.apiKey);
    expect(getFirebaseAuth().auth).toBeDefined();
    expect(mockGetAuth).toHaveBeenCalledWith(app);
  });

  test('reuses an existing app ONLY when its config matches exactly', async () => {
    mockGetApps.mockReturnValue([
      { name: '[DEFAULT]', options: { apiKey: WEB_CONFIG.apiKey, projectId: WEB_CONFIG.projectId } },
    ]);
    const { initFirebaseAuth, getFirebaseAuth } = await freshModule();

    expect(await initFirebaseAuth(WEB_CONFIG)).toBe(true);

    expect(mockInitializeApp).not.toHaveBeenCalled();
    expect(mockGetApp).not.toHaveBeenCalled();
    expect(getFirebaseAuth().auth).toBeDefined();
    expect(mockGetAuth).toHaveBeenCalledWith(
      expect.objectContaining({ options: expect.objectContaining({ apiKey: WEB_CONFIG.apiKey }) })
    );
  });

  test('re-initializing while already configured is a no-op (no duplicate apps)', async () => {
    const { initFirebaseAuth } = await freshModule();

    expect(await initFirebaseAuth(WEB_CONFIG)).toBe(true);
    expect(await initFirebaseAuth(WEB_CONFIG)).toBe(true);

    expect(mockInitializeApp).toHaveBeenCalledTimes(1);
  });

  test('existing named auth app is reused instead of re-initialized', async () => {
    mockGetApps.mockReturnValue([]); // unrelated apps gone, but our named app exists
    mockGetApp.mockReturnValue({ name: 'studentalumni-auth', options: { ...WEB_CONFIG } });
    const { initFirebaseAuth, getFirebaseAuth } = await freshModule();

    expect(await initFirebaseAuth(WEB_CONFIG)).toBe(true);

    expect(mockInitializeApp).not.toHaveBeenCalled();
    expect(getFirebaseAuth().auth).toBeDefined();
    expect(mockGetAuth).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'studentalumni-auth' })
    );
  });
});

describe('signInWithGoogle — diagnostics and popup flow', () => {
  test('no configuration anywhere → clear "not configured" diagnostic, SDK untouched', async () => {
    const { signInWithGoogle } = await freshModule();

    await expect(signInWithGoogle()).rejects.toThrow(
      'Google sign-in is not configured for this environment: no Firebase web configuration was provided.'
    );
    expect(mockInitializeApp).not.toHaveBeenCalled();
    expect(mockSignInWithPopup).not.toHaveBeenCalled();
  });

  test('successful popup returns the Firebase ID token and profile fields', async () => {
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'build-time-key';
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'build-time-project';
    mockSignInWithPopup.mockResolvedValue({
      user: {
        getIdToken: mockGetIdToken.mockResolvedValue('fixture-id-token'),
        email: 'student@example.com',
        displayName: 'Test Student',
        photoURL: 'https://example.test/pic.jpg',
      },
    });
    const { signInWithGoogle } = await freshModule();

    const result = await signInWithGoogle();

    expect(result).toEqual({
      idToken: 'fixture-id-token',
      email: 'student@example.com',
      name: 'Test Student',
      picture: 'https://example.test/pic.jpg',
    });
    expect(mockGetIdToken).toHaveBeenCalledTimes(1);
    expect(mockInitializeApp).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: 'build-time-key', projectId: 'build-time-project' }),
      'studentalumni-auth'
    );
  });

  test('popup closed by the user → null (no error surfaced)', async () => {
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'build-time-key';
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'build-time-project';
    mockSignInWithPopup.mockRejectedValue({ code: 'auth/popup-closed-by-user' });
    const { signInWithGoogle } = await freshModule();

    await expect(signInWithGoogle()).resolves.toBeNull();
  });

  test('Firebase provider errors (invalid API key) propagate with their message', async () => {
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'build-time-key';
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'build-time-project';
    const providerError = Object.assign(new Error('Firebase: Error (auth/api-key-not-valid.-please-pass-a-valid-api-key.).'), { code: 'auth/invalid-api-key' });
    mockSignInWithPopup.mockRejectedValue(providerError);
    const { signInWithGoogle } = await freshModule();

    await expect(signInWithGoogle()).rejects.toThrow('auth/api-key-not-valid');
  });
});
