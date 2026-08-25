/**
 * Firebase Auth — handles sign-in with Google, GitHub, phone via Firebase SDK.
 * Backend verifies the Firebase ID token and issues a platform JWT.
 */

let _firebaseAuth: any = null;
let _firebaseApp: any = null;

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
    const { initializeApp, getApps } = await import('firebase/app');
    const { getAuth, GoogleAuthProvider, GithubAuthProvider, signInWithPopup, PhoneAuthProvider, signInWithPhoneNumber } = await import('firebase/auth');

    const existing = getApps();
    const app = existing.length > 0 ? existing[0] : initializeApp(config as any);
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
    const initialized = await initFirebaseAuth({
      apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
      authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
      projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",
      appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "",
    });
    if (!initialized) {
      throw new Error("Firebase Auth could not be initialized. Check API keys.");
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
