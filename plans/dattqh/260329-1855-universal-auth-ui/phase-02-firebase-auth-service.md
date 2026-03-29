# Phase 2: Firebase Core & Auth Service

**Priority:** Critical | **Effort:** M | **Status:** Complete

## Overview

Core Firebase initialization with hybrid config (built-in default + custom override) and auth service wrapping signInWithPopup for Google/GitHub/Microsoft.

## Files to Create

- `src/core/firebase-init.ts`
- `src/core/auth-service.ts`

## Key Insights

- Firebase JS SDK uses modular tree-shakeable imports (`firebase/app`, `firebase/auth`)
- Multiple Firebase apps possible via `initializeApp(config, name)` — use unique name per config to avoid conflicts
- `signInWithPopup` is standard for OAuth providers on web
- `getIdToken()` returns JWT for server verification

## Implementation Steps

### 1. firebase-init.ts

```ts
// Default Firebase config (package author's project)
const DEFAULT_CONFIG = {
  apiKey: "...",  // To be filled with actual config
  authDomain: "...",
  projectId: "..."
};

// Cache: config hash → FirebaseApp to avoid re-init
const appCache = new Map<string, FirebaseApp>();

export function getOrInitApp(config?: Partial<FirebaseConfig>): FirebaseApp {
  const finalConfig = config?.apiKey ? { ...DEFAULT_CONFIG, ...config } : DEFAULT_CONFIG;
  const cacheKey = finalConfig.apiKey + finalConfig.authDomain;

  if (!appCache.has(cacheKey)) {
    const appName = cacheKey === (DEFAULT_CONFIG.apiKey + DEFAULT_CONFIG.authDomain)
      ? '[universal-auth-default]'
      : `[universal-auth-${hash(cacheKey)}]`;
    appCache.set(cacheKey, initializeApp(finalConfig, appName));
  }
  return appCache.get(cacheKey)!;
}
```

### 2. auth-service.ts

```ts
export type AuthProvider = 'google' | 'github' | 'microsoft';

export interface AuthResult {
  user: { uid: string; email: string; displayName: string; photoURL: string; };
  token: string;   // Firebase ID token (JWT)
  provider: AuthProvider;
}

export async function signInWithProvider(
  provider: AuthProvider,
  config?: Partial<FirebaseConfig>
): Promise<AuthResult> {
  const app = getOrInitApp(config);
  const auth = getAuth(app);
  const authProvider = createProvider(provider);
  const result = await signInWithPopup(auth, authProvider);
  const token = await result.user.getIdToken();
  return {
    user: { uid, email, displayName, photoURL },
    token,
    provider
  };
}

export async function postTokenToServer(
  serverUrl: string,
  authResult: AuthResult
): Promise<Response> {
  return fetch(serverUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(authResult)
  });
}
```

Provider factory:
- `google` → `new GoogleAuthProvider()`
- `github` → `new GithubAuthProvider()`
- `microsoft` → `new OAuthProvider('microsoft.com')`

## Success Criteria

- [x] `signInWithProvider('google')` opens popup, returns AuthResult
- [x] Custom config creates separate Firebase app instance
- [x] Default config works without any user configuration
- [x] `postTokenToServer` sends correct JSON payload
- [x] No Firebase app duplication on repeated calls
