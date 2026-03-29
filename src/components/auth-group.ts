import './auth-button.js';

const PASSTHROUGH_ATTRS = ['server-url', 'api-key', 'auth-domain', 'theme', 'size'] as const;
const VALID_PROVIDERS = new Set(['google', 'github', 'microsoft']);

export class AuthGroup extends HTMLElement {
  static observedAttributes = [
    'providers', 'layout', 'gap',
    ...PASSTHROUGH_ATTRS,
  ];

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

  private get providers(): string[] {
    return (this.getAttribute('providers') || 'google')
      .split(',')
      .map((p) => p.trim())
      .filter((p) => VALID_PROVIDERS.has(p));
  }

  // C2: Use DOM API instead of innerHTML string interpolation to prevent XSS
  private render() {
    const gap = this.getAttribute('gap') || '8px';
    const layout = this.getAttribute('layout') || 'vertical';
    const direction = layout === 'horizontal' ? 'row' : 'column';

    const style = document.createElement('style');
    style.textContent = `
      :host { display: block; }
      .auth-group {
        display: flex;
        flex-direction: ${direction === 'row' ? 'row' : 'column'};
        gap: var(--auth-group-gap, ${gap});
      }
    `;

    const container = document.createElement('div');
    container.className = 'auth-group';
    container.setAttribute('part', 'group');

    for (const provider of this.providers) {
      const btn = document.createElement('auth-button');
      btn.setAttribute('provider', provider);

      for (const attr of PASSTHROUGH_ATTRS) {
        const val = this.getAttribute(attr);
        if (val) btn.setAttribute(attr, val);
      }

      container.appendChild(btn);
    }

    this.shadowRoot!.replaceChildren(style, container);
  }
}

customElements.define('auth-group', AuthGroup);
