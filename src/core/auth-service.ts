import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  type AuthProvider as FirebaseAuthProvider,
} from 'firebase/auth';
import { type FirebaseOptions } from 'firebase/app';
import { getOrInitApp } from './firebase-init.js';

export type AuthProvider = 'google' | 'github' | 'microsoft';

export interface AuthResult {
  user: {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  };
  token: string;
  provider: AuthProvider;
}

function createProvider(provider: AuthProvider): FirebaseAuthProvider {
  switch (provider) {
    case 'google':
      return new GoogleAuthProvider();
    case 'github':
      return new GithubAuthProvider();
    case 'microsoft':
      return new OAuthProvider('microsoft.com');
    default:
      throw new Error(`Unsupported auth provider: "${provider}". Use "google", "github", or "microsoft".`);
  }
}

export async function signInWithProvider(
  provider: AuthProvider,
  config?: Partial<FirebaseOptions>,
): Promise<AuthResult> {
  const app = getOrInitApp(config);
  const auth = getAuth(app);
  const authProvider = createProvider(provider);
  const result = await signInWithPopup(auth, authProvider);
  const token = await result.user.getIdToken();

  return {
    user: {
      uid: result.user.uid,
      email: result.user.email,
      displayName: result.user.displayName,
      photoURL: result.user.photoURL,
    },
    token,
    provider,
  };
}

export async function postTokenToServer(
  serverUrl: string,
  authResult: AuthResult,
): Promise<Response> {
  // Send only token + provider by default — avoid leaking full user profile
  const payload = {
    token: authResult.token,
    provider: authResult.provider,
  };
  return fetch(serverUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}
