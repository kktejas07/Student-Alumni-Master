/**
 * Firebase Auth — handles sign-in with Google, GitHub, phone via Firebase SDK.
 * Backend verifies the Firebase ID token and issues a platform JWT.
 */

let _firebaseAuth: any = null;
let _firebaseApp: any = null;

// Dedicated Firebase app name for authentication. Keeps auth isolated from any
// other Firebase app the bundle may create (analytics, messaging, ...) so the
// auth flow always runs against the exact configuration provided to it.
const AUTH_APP_NAME = 'studentalumni-auth';

export function getFirebaseAuth() {
  return _firebaseAuth;
}

export async function initFirebaseAuth(config: {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}): Promise<boolean> {
  if (_firebaseAuth) return true;
  if (!config.apiKey || !config.projectId) return false;

  try {
    const { initializeApp, getApp, getApps } = await import('firebase/app');
    const { getAuth, GoogleAuthProvider, GithubAuthProvider, signInWithPopup, PhoneAuthProvider, signInWithPhoneNumber } = await import('firebase/auth');

    // CONFIG SAFETY: only reuse an existing Firebase app whose configuration
    // EXACTLY matches the provided web configuration (apiKey + projectId).
    // Never silently adopt an unrelated app (e.g. an analytics app initialized
    // with stale or different build args) — that would authenticate the user
    // against the wrong Firebase project.
    const match = getApps().find(
      (a) => a?.options?.apiKey === config.apiKey && a?.options?.projectId === config.projectId
    );
    let app = match;
    if (!app) {
      try {
        app = getApp(AUTH_APP_NAME);
      } catch {
        app = initializeApp(config as any, AUTH_APP_NAME);
      }
    }
    _firebaseApp = app;
    _firebaseAuth = {
      get auth() { return getAuth(app); },
      GoogleAuthProvider,
      GithubAuthProvider,
      PhoneAuthProvider,
      signInWithPopup,
      signInWithPhoneNumber,
    };
    return true;
  } catch {
    return false;
  }
}

export async function signInWithGoogle(): Promise<{ idToken: string; email: string; name: string; picture: string } | null> {
  if (!_firebaseAuth) {
    const lazyConfig = {
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "",
    };
    if (!lazyConfig.apiKey || !lazyConfig.projectId) {
      // Clear diagnostic: distinguish "not configured at all" from an SDK
      // failure, instead of surfacing an unexplained login error.
      throw new Error(
        "Google sign-in is not configured for this environment: no Firebase web configuration was provided."
      );
    }
    const initialized = await initFirebaseAuth(lazyConfig);
    if (!initialized) {
      throw new Error(
        "Firebase Auth could not be initialized. Verify the Firebase web configuration (apiKey/authDomain/projectId) is valid."
      );
    }
  }
  if (!_firebaseAuth) return null;
  try {
    const result = await _firebaseAuth.signInWithPopup(
      _firebaseAuth.auth,
      new _firebaseAuth.GoogleAuthProvider()
    );
    const user = result.user;
    const idToken = await user.getIdToken();
    return {
      idToken,
      email: user.email || '',
      name: user.displayName || '',
      picture: user.photoURL || '',
    };
  } catch (e: any) {
    if (e?.code === 'auth/popup-closed-by-user') return null;
    throw e;
  }
}

export async function signInWithGitHub(): Promise<{ idToken: string; email: string; name: string; picture: string } | null> {
  if (!_firebaseAuth) return null;
  try {
    const provider = new _firebaseAuth.GithubAuthProvider();
    provider.addScope('user:email');
    const result = await _firebaseAuth.signInWithPopup(_firebaseAuth.auth, provider);
    const user = result.user;
    const idToken = await user.getIdToken();
    return {
      idToken,
      email: user.email || '',
      name: user.displayName || '',
      picture: user.photoURL || '',
    };
  } catch (e: any) {
    if (e?.code === 'auth/popup-closed-by-user') return null;
    throw e;
  }
}
