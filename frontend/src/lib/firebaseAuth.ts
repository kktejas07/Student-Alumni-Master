/**
 * Firebase Auth — handles sign-in with Google, GitHub, phone via Firebase SDK.
 * Backend verifies the Firebase ID token and issues a platform JWT.
 *
 * Uses signInWithRedirect (not popup) to avoid browser popup blockers on web.
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
    const {
      getAuth, GoogleAuthProvider, GithubAuthProvider,
      signInWithRedirect, getRedirectResult,
      PhoneAuthProvider, signInWithPhoneNumber,
    } = await import('firebase/auth');

    const existing = getApps();
    const app = existing.length > 0 ? existing[0] : initializeApp(config as any);
    _firebaseApp = app;
    _firebaseAuth = {
      get auth() { return getAuth(app); },
      GoogleAuthProvider,
      GithubAuthProvider,
      PhoneAuthProvider,
      signInWithRedirect,
      getRedirectResult,
      signInWithPhoneNumber,
    };
    return true;
  } catch {
    return false;
  }
}

export async function signInWithGoogleRedirect(): Promise<void> {
  if (!_firebaseAuth) return;
  const provider = new _firebaseAuth.GoogleAuthProvider();
  await _firebaseAuth.signInWithRedirect(_firebaseAuth.auth, provider);
}

export async function signInWithGitHubRedirect(): Promise<void> {
  if (!_firebaseAuth) return;
  const provider = new _firebaseAuth.GithubAuthProvider();
  provider.addScope('user:email');
  await _firebaseAuth.signInWithRedirect(_firebaseAuth.auth, provider);
}

export async function handleRedirectResult(): Promise<{ idToken: string; email: string; name: string; picture: string } | null> {
  if (!_firebaseAuth) return null;
  try {
    const result = await _firebaseAuth.getRedirectResult(_firebaseAuth.auth);
    if (!result || !result.user) return null;
    const user = result.user;
    const idToken = await user.getIdToken();
    return {
      idToken,
      email: user.email || '',
      name: user.displayName || '',
      picture: user.photoURL || '',
    };
  } catch {
    return null;
  }
}

// Kept for backward compatibility — now delegates to redirect-based flow
export async function signInWithGoogle(): Promise<{ idToken: string; email: string; name: string; picture: string } | null> {
  await signInWithGoogleRedirect();
  return null; // page will redirect, result handled on return
}

export async function signInWithGitHub(): Promise<{ idToken: string; email: string; name: string; picture: string } | null> {
  await signInWithGitHubRedirect();
  return null; // page will redirect, result handled on return
}
