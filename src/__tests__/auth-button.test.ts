import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

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

// Import component to trigger registration
import '../components/auth-button.js';

describe('AuthButton', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('registers as custom element', () => {
    expect(customElements.get('auth-button')).toBeDefined();
  });

  it('renders button with Google label by default', () => {
    const el = document.createElement('auth-button');
    el.setAttribute('provider', 'google');
    document.body.appendChild(el);

    const btn = el.shadowRoot!.querySelector('button');
    expect(btn).toBeTruthy();
    expect(btn!.textContent).toContain('Sign in with Google');
  });

  it('renders GitHub button with correct label', () => {
    const el = document.createElement('auth-button');
    el.setAttribute('provider', 'github');
    document.body.appendChild(el);

    const label = el.shadowRoot!.querySelector('.auth-btn__label');
    expect(label!.textContent).toBe('Sign in with GitHub');
  });

  it('renders Microsoft button', () => {
    const el = document.createElement('auth-button');
    el.setAttribute('provider', 'microsoft');
    document.body.appendChild(el);

    const label = el.shadowRoot!.querySelector('.auth-btn__label');
    expect(label!.textContent).toBe('Sign in with Microsoft');
  });

  it('uses custom label when provided', () => {
    const el = document.createElement('auth-button');
    el.setAttribute('provider', 'google');
    el.setAttribute('label', 'Continue with Google');
    document.body.appendChild(el);

    const label = el.shadowRoot!.querySelector('.auth-btn__label');
    expect(label!.textContent).toBe('Continue with Google');
  });

  it('contains SVG icon', () => {
    const el = document.createElement('auth-button');
    el.setAttribute('provider', 'google');
    document.body.appendChild(el);

    const icon = el.shadowRoot!.querySelector('.auth-btn__icon');
    expect(icon!.innerHTML).toContain('<svg');
  });

  it('has part attribute for external styling', () => {
    const el = document.createElement('auth-button');
    el.setAttribute('provider', 'google');
    document.body.appendChild(el);

    const btn = el.shadowRoot!.querySelector('button');
    expect(btn!.getAttribute('part')).toBe('button');
  });

  it('dispatches auth-success event on successful sign-in', async () => {
    const el = document.createElement('auth-button');
    el.setAttribute('provider', 'google');
    document.body.appendChild(el);

    const eventPromise = new Promise<CustomEvent>((resolve) => {
      el.addEventListener('auth-success', (e) => resolve(e as CustomEvent));
    });

    const btn = el.shadowRoot!.querySelector('button')!;
    btn.click();

    const event = await eventPromise;
    expect(event.detail.provider).toBe('google');
    expect(event.detail.token).toBe('mock-jwt-token');
    expect(event.detail.user.uid).toBe('test-uid');
  });

  it('dispatches auth-error on failure', async () => {
    const { signInWithPopup } = await import('firebase/auth');
    vi.mocked(signInWithPopup).mockRejectedValueOnce(new Error('Popup closed'));

    const el = document.createElement('auth-button');
    el.setAttribute('provider', 'google');
    document.body.appendChild(el);

    const eventPromise = new Promise<CustomEvent>((resolve) => {
      el.addEventListener('auth-error', (e) => resolve(e as CustomEvent));
    });

    el.shadowRoot!.querySelector('button')!.click();

    const event = await eventPromise;
    expect(event.detail.provider).toBe('google');
    expect(event.detail.error).toBeInstanceOf(Error);
  });

  it('events are composed (cross Shadow DOM)', async () => {
    const el = document.createElement('auth-button');
    el.setAttribute('provider', 'google');
    document.body.appendChild(el);

    const eventPromise = new Promise<CustomEvent>((resolve) => {
      document.addEventListener('auth-success', (e) => resolve(e as CustomEvent), { once: true });
    });

    el.shadowRoot!.querySelector('button')!.click();

    const event = await eventPromise;
    expect(event.composed).toBe(true);
    expect(event.bubbles).toBe(true);
  });
});
