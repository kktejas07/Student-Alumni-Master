/**
 * Test suite: Remember Me and Session-Only Token Storage Lifecycle
 *
 * Verifies:
 * 1. Remember Me defaults to unchecked (session-only).
 * 2. Unchecked login stores tokens in sessionStorage and keeps localStorage clean.
 * 3. Checked login stores tokens in localStorage (with scd_remember_me flag).
 * 4. Reloading the same tab restores session-only tokens.
 * 5. Closing a tab / opening a fresh tab does not restore session-only tokens.
 * 6. Remember Me login survives browser restarts through persistent storage.
 * 7. Token refresh preserves the active storage mode (session vs persistent).
 * 8. Logout clears both sessionStorage and localStorage.
 * 9. Legacy localStorage tokens are migrated safely to sessionStorage and removed from localStorage.
 * 10. Incomplete or invalid legacy tokens are purged safely.
 * 11. Native SecureStore behavior remains unchanged on non-web platforms.
 */

const mockSecureStore = {
  setItemAsync: jest.fn(async () => {}),
  getItemAsync: jest.fn(async () => null),
  deleteItemAsync: jest.fn(async () => {}),
};

jest.mock('expo-secure-store', () => mockSecureStore);

let currentPlatform = 'web';
jest.mock('react-native', () => ({
  Platform: {
    get OS() {
      return currentPlatform;
    },
    select: (obj: any) => obj[currentPlatform] ?? obj.default,
  },
}));

jest.mock('@/src/lib/env', () => ({
  getBaseUrl: () => 'http://localhost:8000',
}));

// In-memory web storage implementation for testing
class MockStorage implements Storage {
  private store: Map<string, string> = new Map();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

let mockSessionStorage: MockStorage;
let mockLocalStorage: MockStorage;

beforeEach(() => {
  currentPlatform = 'web';
  mockSessionStorage = new MockStorage();
  mockLocalStorage = new MockStorage();

  (global as any).window = {
    sessionStorage: mockSessionStorage,
    localStorage: mockLocalStorage,
  };

  jest.clearAllMocks();
});

import {
  tokenStore,
  migrateLegacyWebTokens,
  TOKEN_KEY,
  REFRESH_KEY,
  REMEMBER_KEY,
} from '../api';

describe('Remember Me & Session-Only Token Storage', () => {
  it('1 & 2: Stores tokens in sessionStorage when Remember Me is unchecked (default)', async () => {
    await tokenStore.setTokens('access-123', 'refresh-123', false);

    expect(mockSessionStorage.getItem(TOKEN_KEY)).toBe('access-123');
    expect(mockSessionStorage.getItem(REFRESH_KEY)).toBe('refresh-123');

    // LocalStorage must remain completely empty
    expect(mockLocalStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(mockLocalStorage.getItem(REFRESH_KEY)).toBeNull();
    expect(mockLocalStorage.getItem(REMEMBER_KEY)).toBeNull();

    expect(await tokenStore.isPersistent()).toBe(false);
  });

  it('3: Stores tokens in localStorage with remember flag when Remember Me is checked', async () => {
    await tokenStore.setTokens('access-persist', 'refresh-persist', true);

    expect(mockLocalStorage.getItem(TOKEN_KEY)).toBe('access-persist');
    expect(mockLocalStorage.getItem(REFRESH_KEY)).toBe('refresh-persist');
    expect(mockLocalStorage.getItem(REMEMBER_KEY)).toBe('true');

    // SessionStorage must be cleared
    expect(mockSessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(mockSessionStorage.getItem(REFRESH_KEY)).toBeNull();

    expect(await tokenStore.isPersistent()).toBe(true);
  });

  it('4: Restores session-only tokens across reloads within the same tab', async () => {
    // User signs in without Remember Me
    await tokenStore.setTokens('tab-access', 'tab-refresh', false);

    // Simulate same tab page reload (sessionStorage remains intact)
    const access = await tokenStore.getAccess();
    const refresh = await tokenStore.getRefresh();

    expect(access).toBe('tab-access');
    expect(refresh).toBe('tab-refresh');
  });

  it('5: Closing a tab (new tab context) does not restore session-only tokens', async () => {
    // User logged in with session-only in Tab 1
    await tokenStore.setTokens('tab1-access', 'tab1-refresh', false);

    // Simulate opening Tab 2 (fresh sessionStorage, same localStorage)
    mockSessionStorage.clear();

    const access = await tokenStore.getAccess();
    const refresh = await tokenStore.getRefresh();

    expect(access).toBeNull();
    expect(refresh).toBeNull();
  });

  it('6: Remember Me login survives browser restarts through persistent storage', async () => {
    // User signs in with Remember Me in Browser session 1
    await tokenStore.setTokens('persist-access', 'persist-refresh', true);

    // Simulate browser restart: sessionStorage wiped, localStorage persisted
    mockSessionStorage.clear();

    const access = await tokenStore.getAccess();
    const refresh = await tokenStore.getRefresh();

    expect(access).toBe('persist-access');
    expect(refresh).toBe('persist-refresh');
    expect(await tokenStore.isPersistent()).toBe(true);
  });

  it('7a: Token refresh preserves session-only storage mode without moving to localStorage', async () => {
    // Session-only login
    await tokenStore.setTokens('access-v1', 'refresh-v1', false);

    // Refresh occurs without explicit rememberMe argument
    await tokenStore.setTokens('access-v2', 'refresh-v2');

    expect(mockSessionStorage.getItem(TOKEN_KEY)).toBe('access-v2');
    expect(mockSessionStorage.getItem(REFRESH_KEY)).toBe('refresh-v2');

    // Must still NOT be in localStorage
    expect(mockLocalStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(mockLocalStorage.getItem(REFRESH_KEY)).toBeNull();
    expect(mockLocalStorage.getItem(REMEMBER_KEY)).toBeNull();
    expect(await tokenStore.isPersistent()).toBe(false);
  });

  it('7b: Token refresh preserves persistent storage mode', async () => {
    // Persistent login
    await tokenStore.setTokens('persist-v1', 'persist-v1', true);

    // Refresh occurs without explicit rememberMe argument
    await tokenStore.setTokens('persist-v2', 'persist-v2');

    expect(mockLocalStorage.getItem(TOKEN_KEY)).toBe('persist-v2');
    expect(mockLocalStorage.getItem(REFRESH_KEY)).toBe('persist-v2');
    expect(mockLocalStorage.getItem(REMEMBER_KEY)).toBe('true');
    expect(mockSessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(await tokenStore.isPersistent()).toBe(true);
  });

  it('8: Logout clears tokens from both sessionStorage and localStorage', async () => {
    // Simulate dirty storage state across both
    mockSessionStorage.setItem(TOKEN_KEY, 'stale-session-acc');
    mockSessionStorage.setItem(REFRESH_KEY, 'stale-session-ref');
    mockLocalStorage.setItem(TOKEN_KEY, 'stale-local-acc');
    mockLocalStorage.setItem(REFRESH_KEY, 'stale-local-ref');
    mockLocalStorage.setItem(REMEMBER_KEY, 'true');

    await tokenStore.clear();

    expect(mockSessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(mockSessionStorage.getItem(REFRESH_KEY)).toBeNull();
    expect(mockLocalStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(mockLocalStorage.getItem(REFRESH_KEY)).toBeNull();
    expect(mockLocalStorage.getItem(REMEMBER_KEY)).toBeNull();
  });

  it('9: Migrates valid legacy localStorage tokens to sessionStorage and purges localStorage', async () => {
    // Legacy storage state: tokens exist in localStorage, but REMEMBER_KEY is absent
    mockLocalStorage.setItem(TOKEN_KEY, 'legacy-access-token');
    mockLocalStorage.setItem(REFRESH_KEY, 'legacy-refresh-token');

    expect(mockSessionStorage.getItem(TOKEN_KEY)).toBeNull();

    // Trigger migration
    migrateLegacyWebTokens();

    // Tokens must now be in sessionStorage for current tab
    expect(mockSessionStorage.getItem(TOKEN_KEY)).toBe('legacy-access-token');
    expect(mockSessionStorage.getItem(REFRESH_KEY)).toBe('legacy-refresh-token');

    // LocalStorage copies must be eradicated
    expect(mockLocalStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(mockLocalStorage.getItem(REFRESH_KEY)).toBeNull();
    expect(mockLocalStorage.getItem(REMEMBER_KEY)).toBeNull();
  });

  it('10: Safely purges incomplete or corrupted legacy tokens without migrating', async () => {
    // Only access token exists, no refresh token
    mockLocalStorage.setItem(TOKEN_KEY, 'orphaned-access');
    mockLocalStorage.removeItem(REFRESH_KEY);

    migrateLegacyWebTokens();

    expect(mockSessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(mockLocalStorage.getItem(TOKEN_KEY)).toBeNull();

    // Blank/whitespace token pair
    mockLocalStorage.setItem(TOKEN_KEY, '   ');
    mockLocalStorage.setItem(REFRESH_KEY, 'valid-refresh');

    migrateLegacyWebTokens();

    expect(mockSessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(mockLocalStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(mockLocalStorage.getItem(REFRESH_KEY)).toBeNull();
  });

  it('11: Does not migrate when user explicitly logged in with Remember Me', async () => {
    mockLocalStorage.setItem(TOKEN_KEY, 'remembered-access');
    mockLocalStorage.setItem(REFRESH_KEY, 'remembered-refresh');
    mockLocalStorage.setItem(REMEMBER_KEY, 'true');

    migrateLegacyWebTokens();

    // Must remain in localStorage, not migrated to sessionStorage
    expect(mockLocalStorage.getItem(TOKEN_KEY)).toBe('remembered-access');
    expect(mockSessionStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('12: Preserves native SecureStore behavior on iOS/Android', async () => {
    currentPlatform = 'ios';

    await tokenStore.setTokens('native-acc', 'native-ref');
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(TOKEN_KEY, 'native-acc');
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(REFRESH_KEY, 'native-ref');

    await tokenStore.getAccess();
    expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith(TOKEN_KEY);

    await tokenStore.clear();
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(TOKEN_KEY);
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(REFRESH_KEY);
  });
});

