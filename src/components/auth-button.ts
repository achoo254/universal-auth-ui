import { type FirebaseOptions } from 'firebase/app';
import { signInWithProvider, postTokenToServer, type AuthProvider, type AuthResult } from '../core/auth-service.js';
import { getButtonStyles, DEFAULT_LABELS } from '../styles/brand-styles.js';
import { googleLogo } from '../assets/google-logo.js';
import { githubLogo } from '../assets/github-logo.js';
import { microsoftLogo } from '../assets/microsoft-logo.js';

const VALID_PROVIDERS: Set<string> = new Set(['google', 'github', 'microsoft']);

const LOGOS: Record<AuthProvider, string> = {
  google: googleLogo,
  github: githubLogo,
  microsoft: microsoftLogo,
};

const SPINNER_SVG = `<div class="spinner"></div>`;

export class AuthButton extends HTMLElement {
  static observedAttributes = [
    'provider', 'server-url', 'api-key', 'auth-domain',
    'theme', 'size', 'label',
  ];

  private _loading = false;
  private _clickHandler = () => this.handleClick();

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }

  private get provider(): AuthProvider {
    return (this.getAttribute('provider') as AuthProvider) || 'google';
  }

  private get theme(): 'light' | 'dark' {
    return (this.getAttribute('theme') as 'light' | 'dark') || 'light';
  }

  private get size(): 'small' | 'medium' | 'large' {
    return (this.getAttribute('size') as 'small' | 'medium' | 'large') || 'medium';
  }

  private getFirebaseConfig(): Partial<FirebaseOptions> | undefined {
    const apiKey = this.getAttribute('api-key');
    const authDomain = this.getAttribute('auth-domain');
    if (!apiKey && !authDomain) return undefined;
    return {
      ...(apiKey ? { apiKey } : {}),
      ...(authDomain ? { authDomain } : {}),
    };
  }

  private setLoading(loading: boolean) {
    this._loading = loading;
    const btn = this.shadowRoot!.querySelector('button');
    if (!btn) return;
    btn.disabled = loading;
    btn.setAttribute('aria-busy', String(loading));
    btn.classList.toggle('auth-btn--loading', loading);

    const iconEl = btn.querySelector('.auth-btn__icon');
    if (iconEl) {
      iconEl.innerHTML = loading ? SPINNER_SVG : LOGOS[this.provider];
    }
  }

  private async handleClick() {
    // H2: Prevent double-click race condition
    if (this._loading) return;

    const provider = this.provider;
    const config = this.getFirebaseConfig();

    try {
      this.setLoading(true);
      const result: AuthResult = await signInWithProvider(provider, config);

      this.dispatchEvent(new CustomEvent('auth-success', {
        detail: result,
        bubbles: true,
        composed: true,
      }));

      const serverUrl = this.getAttribute('server-url');
      // C3: Enforce HTTPS (allow localhost for development)
      const isSecure = serverUrl && (
        serverUrl.startsWith('https://') ||
        serverUrl.startsWith('http://localhost') ||
        serverUrl.startsWith('http://127.0.0.1')
      );
      if (serverUrl && isSecure) {
        const response = await postTokenToServer(serverUrl, result);
        // F6: Clone response before reading body to avoid consumed stream error
        const cloned = response.clone();
        let body: unknown;
        try {
          body = await response.json();
        } catch {
          body = await cloned.text();
        }
        this.dispatchEvent(new CustomEvent('server-response', {
          detail: { response: body, status: response.status },
          bubbles: true,
          composed: true,
        }));
      }
    } catch (error) {
      this.dispatchEvent(new CustomEvent('auth-error', {
        detail: { error, provider },
        bubbles: true,
        composed: true,
      }));
    } finally {
      this.setLoading(false);
    }
  }

  private render() {
    const provider = this.provider;
    // C1: Sanitize label — use textContent assignment instead of innerHTML interpolation
    const label = this.getAttribute('label') || DEFAULT_LABELS[provider];
    const logo = VALID_PROVIDERS.has(provider) ? LOGOS[provider] : LOGOS.google;
    const styles = getButtonStyles(provider, this.theme, this.size);

    this.shadowRoot!.innerHTML = `
      <style>${styles}</style>
      <button part="button" class="auth-btn" aria-busy="false">
        <span class="auth-btn__icon">${logo}</span>
        <span class="auth-btn__label"></span>
      </button>
    `;

    // C1: Set label via textContent to prevent XSS
    const labelEl = this.shadowRoot!.querySelector('.auth-btn__label');
    if (labelEl) labelEl.textContent = label;

    // F1: Use bound handler to avoid listener accumulation on re-render
    this.shadowRoot!.querySelector('button')?.addEventListener('click', this._clickHandler);
  }
}

customElements.define('auth-button', AuthButton);
