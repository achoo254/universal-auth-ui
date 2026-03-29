# Phase 3: Auth Button Web Component

**Priority:** Critical | **Effort:** M | **Status:** Complete

## Overview

`<auth-button>` Custom Element — core component. Renders a single branded sign-in button, handles Firebase auth on click, dispatches events.

## Files to Create

- `src/components/auth-button.ts`

## Dependencies

- Phase 2 (auth-service)
- Phase 5 (brand-styles) — can use placeholder styles initially

## Implementation Steps

### 1. Define Custom Element

```ts
class AuthButton extends HTMLElement {
  static observedAttributes = [
    'provider', 'server-url', 'api-key', 'auth-domain',
    'theme', 'size', 'label'
  ];

  // Shadow DOM with open mode
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.shadowRoot!.querySelector('button')!
      .addEventListener('click', () => this.handleClick());
  }

  attributeChangedCallback() {
    if (this.isConnected) this.render();
  }
}

customElements.define('auth-button', AuthButton);
```

### 2. Render Method

- Read `provider` attribute → determine logo SVG + label text + brand CSS
- Read `theme` (light/dark), `size` (small/medium/large)
- Custom `label` attribute overrides default text
- Inject brand-compliant styles into Shadow DOM `<style>` tag
- Expose `part="button"` for external CSS override

```html
<!-- Shadow DOM output -->
<style>/* brand styles injected */</style>
<button part="button" class="auth-btn auth-btn--google auth-btn--light auth-btn--medium">
  <span class="auth-btn__icon">{SVG}</span>
  <span class="auth-btn__label">Sign in with Google</span>
</button>
```

### 3. Click Handler

```ts
async handleClick() {
  const provider = this.getAttribute('provider') as AuthProvider;
  const config = this.getFirebaseConfig(); // from api-key/auth-domain attrs

  try {
    this.setLoading(true);
    const result = await signInWithProvider(provider, config);

    // Dispatch auth-success event
    this.dispatchEvent(new CustomEvent('auth-success', {
      detail: result, bubbles: true, composed: true
    }));

    // If server-url set, POST token
    const serverUrl = this.getAttribute('server-url');
    if (serverUrl) {
      const response = await postTokenToServer(serverUrl, result);
      this.dispatchEvent(new CustomEvent('server-response', {
        detail: { response: await response.json(), status: response.status },
        bubbles: true, composed: true
      }));
    }
  } catch (error) {
    this.dispatchEvent(new CustomEvent('auth-error', {
      detail: { error, provider }, bubbles: true, composed: true
    }));
  } finally {
    this.setLoading(false);
  }
}
```

### 4. Loading State

- During auth, button shows spinner/disabled state
- `setLoading(true)` adds `aria-busy="true"` + `disabled` + CSS spinner

### 5. JS API (programmatic)

```ts
// Allow setting callback programmatically
set onAuth(callback: (result: AuthResult) => void) {
  this._onAuthCallback = callback;
  this.addEventListener('auth-success', (e: CustomEvent) => callback(e.detail));
}
```

## Attributes Reference

| Attribute | Type | Required | Default |
|---|---|---|---|
| `provider` | `google\|github\|microsoft` | Yes | — |
| `server-url` | string | No | — |
| `api-key` | string | No | built-in |
| `auth-domain` | string | No | built-in |
| `theme` | `light\|dark` | No | `light` |
| `size` | `small\|medium\|large` | No | `medium` |
| `label` | string | No | "Sign in with {Provider}" |

## Events

| Event | Bubbles | Composed | Detail |
|---|---|---|---|
| `auth-success` | Yes | Yes | `{ user, token, provider }` |
| `auth-error` | Yes | Yes | `{ error, provider }` |
| `server-response` | Yes | Yes | `{ response, status }` |

**`composed: true`** = events cross Shadow DOM boundary → parent can listen.

## Success Criteria

- [x] `<auth-button provider="google">` renders branded Google button
- [x] Click opens Firebase popup, returns token
- [x] Events fire correctly, cross Shadow DOM
- [x] Loading state during auth
- [x] Custom label/theme/size attributes work
- [x] `server-url` POSTs token and dispatches response event
