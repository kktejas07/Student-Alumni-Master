/**
 * env contract tests — the API base URL the frontend computes.
 *
 * Regression: the default hard-coded a different backend port (8002) than the
 * documented one (8000, backend/start.bat / DOKPLOY.md / .env files), so any
 * dev without EXPO_PUBLIC_BACKEND_URL in the build silently pointed login at
 * a dead port and saw "Unable to reach the server".
 *
 * env.ts imports react-native/expo-constants (native-only tooling); stub them
 * so the real module can load under jest's node environment (all web paths).
 */

jest.mock('react-native', () => ({ Platform: { OS: 'web' } }));
jest.mock('expo-constants', () => ({ default: {} }));

function setWindow(url: string | null) {
  if (url === null) {
    (global as any).window = undefined;
    return;
  }
  const parsed = new URL(url);
  (global as any).window = {
    location: { protocol: parsed.protocol, hostname: parsed.hostname },
  };
}

async function freshModule() {
  let mod: any;
  await jest.isolateModulesAsync(async () => {
    mod = await import('../env');
  });
  return mod;
}

const ORIGINAL_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

beforeEach(() => {
  jest.resetModules();
  delete process.env.EXPO_PUBLIC_BACKEND_URL;
});

afterEach(() => {
  if (ORIGINAL_URL !== undefined) process.env.EXPO_PUBLIC_BACKEND_URL = ORIGINAL_URL;
  else delete process.env.EXPO_PUBLIC_BACKEND_URL;
  setWindow(null);
});

describe('getBaseUrl (web)', () => {
  test('local dev defaults to http://localhost:8000', async () => {
    setWindow('http://localhost:8081/login');
    const { getBaseUrl } = await freshModule();
    expect(getBaseUrl()).toBe('http://localhost:8000');
  });

  test('127.0.0.1 also defaults to port 8000', async () => {
    setWindow('http://127.0.0.1:8081/login');
    const { getBaseUrl } = await freshModule();
    expect(getBaseUrl()).toBe('http://127.0.0.1:8000');
  });

  test('private-LAN hosts still get a port-8000 default', async () => {
    setWindow('http://192.168.1.10:8081');
    const { getBaseUrl } = await freshModule();
    expect(getBaseUrl()).toBe('http://192.168.1.10:8000');
  });

  test('production hostnames use relative routing (no origin overrides)', async () => {
    setWindow('https://studentalumni.ai/login');
    const { getBaseUrl } = await freshModule();
    expect(getBaseUrl()).toBe('');
  });

  test('EXPO_PUBLIC_BACKEND_URL always wins (never replaced with a hardcoded URL)', async () => {
    process.env.EXPO_PUBLIC_BACKEND_URL = 'http://localhost:9999';
    setWindow('http://localhost:8081/login');
    const { getBaseUrl } = await freshModule();
    expect(getBaseUrl()).toBe('http://localhost:9999');
  });

  test('no window at all still lands on the local default', async () => {
    setWindow(null);
    const { getBaseUrl } = await freshModule();
    expect(getBaseUrl()).toBe('http://localhost:8000');
  });
});
