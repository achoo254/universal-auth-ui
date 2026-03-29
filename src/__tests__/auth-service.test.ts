import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase modules
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'test-app' })),
  getApps: vi.fn(() => []),
}));

vi.mock('firebase/auth', () => {
  const mockUser = {
    uid: 'test-uid',
    email: 'test@example.com',
    displayName: 'Test User',
    photoURL: 'https://example.com/photo.jpg',
    getIdToken: vi.fn().mockResolvedValue('mock-jwt-token'),
  };

  return {
    getAuth: vi.fn(() => ({})),
    signInWithPopup: vi.fn().mockResolvedValue({ user: mockUser }),
    GoogleAuthProvider: vi.fn(),
    GithubAuthProvider: vi.fn(),
    OAuthProvider: vi.fn(),
  };
});

import { signInWithProvider, postTokenToServer, type AuthResult } from '../core/auth-service.js';

describe('signInWithProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns AuthResult with user data and token for google', async () => {
    const result = await signInWithProvider('google');
    expect(result.provider).toBe('google');
    expect(result.token).toBe('mock-jwt-token');
    expect(result.user.uid).toBe('test-uid');
    expect(result.user.email).toBe('test@example.com');
  });

  it('returns AuthResult for github provider', async () => {
    const result = await signInWithProvider('github');
    expect(result.provider).toBe('github');
    expect(result.token).toBe('mock-jwt-token');
  });

  it('returns AuthResult for microsoft provider', async () => {
    const result = await signInWithProvider('microsoft');
    expect(result.provider).toBe('microsoft');
  });
});

describe('postTokenToServer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true }),
    });
  });

  it('sends POST with correct JSON body', async () => {
    const authResult: AuthResult = {
      user: { uid: 'uid', email: 'a@b.com', displayName: 'Test', photoURL: null },
      token: 'jwt-token',
      provider: 'google',
    };

    await postTokenToServer('https://api.example.com/auth', authResult);

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.example.com/auth',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: authResult.token, provider: authResult.provider }),
      }),
    );
  });
});
