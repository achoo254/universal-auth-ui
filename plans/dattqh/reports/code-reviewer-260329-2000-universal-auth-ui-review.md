# Code Review: universal-auth-ui

## Scope
- Files: 12 source files + 3 test files + build config
- LOC: ~450 (src), ~230 (tests)
- Focus: full codebase review

## Overall Assessment

Clean, well-structured Web Components library. Good Shadow DOM encapsulation, proper event composition, reasonable TypeScript usage. Several security and correctness issues need attention before production use.

---

## Critical Issues

### C1. XSS via `label` attribute (innerHTML injection)

**File:** `src/components/auth-button.ts:114-119`

The `label` attribute is interpolated directly into `innerHTML` without sanitization:

```ts
this.shadowRoot!.innerHTML = `
  <style>${styles}</style>
  <button part="button" class="auth-btn" aria-busy="false">
    <span class="auth-btn__icon">${logo}</span>
    <span class="auth-btn__label">${label}</span>
  </button>
`;
```

If a consumer sets `<auth-button label="<img src=x onerror=alert(1)>">`, the injected HTML executes inside the Shadow DOM. While Shadow DOM provides style isolation, **scripts still execute** in the same document context.

**Fix:** Use `textContent` assignment instead of interpolation, or escape HTML entities:

```ts
// Option A: Build DOM programmatically
private render() {
  const provider = this.provider;
  const label = this.getAttribute('label') || DEFAULT_LABELS[provider];
  const logo = LOGOS[provider];
  const styles = getButtonStyles(provider, this.theme, this.size);

  this.shadowRoot!.innerHTML = `
    <style>${styles}</style>
    <button part="button" class="auth-btn" aria-busy="false">
      <span class="auth-btn__icon">${logo}</span>
      <span class="auth-btn__label"></span>
    </button>
  `;
  this.shadowRoot!.querySelector('.auth-btn__label')!.textContent = label;
  this.shadowRoot!.querySelector('button')?.addEventListener('click', () => this.handleClick());
}
```

### C2. XSS via `provider` attribute in AuthGroup (HTML attribute injection)

**File:** `src/components/auth-group.ts:45`

```ts
return `<auth-button provider="${provider}" ${attrs}></auth-button>`;
```

The `provider` value comes from user-controlled attribute, split by comma. A malicious value like `google" onclick="alert(1)" x="` breaks out of the attribute. Same issue with passthrough attributes on line 39-40.

**Fix:** Escape attribute values or use DOM API:

```ts
private render() {
  // ... styles setup ...
  this.shadowRoot!.innerHTML = `
    <style>...</style>
    <div class="auth-group" part="group"></div>
  `;
  const container = this.shadowRoot!.querySelector('.auth-group')!;
  this.providers.forEach((provider) => {
    const btn = document.createElement('auth-button');
    btn.setAttribute('provider', provider);
    PASSTHROUGH_ATTRS.forEach((attr) => {
      const val = this.getAttribute(attr);
      if (val) btn.setAttribute(attr, val);
    });
    container.appendChild(btn);
  });
}
```

### C3. `postTokenToServer` sends auth token to arbitrary URL without validation

**File:** `src/core/auth-service.ts:58-67`

The `server-url` attribute is passed directly to `fetch()`. An attacker who controls the attribute (e.g., via DOM manipulation or reflected attribute from URL params) can exfiltrate the Firebase JWT token to any domain.

**Fix:** Validate the URL origin, or at minimum ensure it's same-origin or HTTPS:

```ts
export async function postTokenToServer(
  serverUrl: string,
  authResult: AuthResult,
): Promise<Response> {
  const url = new URL(serverUrl, window.location.origin);
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
    throw new Error('server-url must use HTTPS');
  }
  return fetch(url.toString(), { ... });
}
```

---

## High Priority

### H1. Event listener leak on every re-render

**File:** `src/components/auth-button.ts:123`

Every call to `render()` (triggered by any attribute change) adds a **new** click event listener without removing the previous one. After N attribute changes, a single click fires `handleClick()` N times, causing N auth popups.

Line 31 also adds a listener in `connectedCallback`, but `render()` on line 35 (via `attributeChangedCallback`) replaces the DOM, orphaning that listener -- then adds another on line 123. The `connectedCallback` listener on line 31 is redundant since `render()` always re-attaches.

**Fix:** Remove listener from `connectedCallback` (render handles it), and use `{ once: false }` with a bound handler that gets cleaned up:

```ts
private boundClickHandler = () => this.handleClick();

connectedCallback() {
  this.render();
  // render() handles the listener
}

private render() {
  // ... innerHTML assignment ...
  this.shadowRoot!.querySelector('button')?.addEventListener('click', this.boundClickHandler);
}
```

Since `innerHTML` replaces the entire subtree, old listeners are garbage-collected with old DOM nodes. This is actually fine -- the real bug is `connectedCallback` adding a listener to a button that `render()` then replaces (orphaned, but GC'd). Net: no actual leak, but `connectedCallback` line 31 adds a listener that is immediately lost when `attributeChangedCallback` fires during initial attribute setting. **Remove line 31.**

### H2. Race condition on rapid clicks

**File:** `src/components/auth-button.ts:74-106`

No guard against concurrent `handleClick` invocations. If user double-clicks before `_loading` state propagates (since `setLoading` is sync but the button disable is visual), two auth popups can open. The `_loading` flag is checked nowhere -- it's set but never read as a guard.

**Fix:**
```ts
private async handleClick() {
  if (this._loading) return;  // Add guard
  // ...
}
```

### H3. `response.json()` called without checking Content-Type

**File:** `src/components/auth-button.ts:92`

```ts
detail: { response: await response.json(), status: response.status },
```

If the server returns non-JSON (500 HTML error page, 204 No Content, etc.), `response.json()` throws, and the error falls into the `catch` block, dispatching `auth-error` -- but the auth already succeeded. Consumer gets a confusing error event after a successful sign-in.

**Fix:** Check response before parsing:
```ts
const serverUrl = this.getAttribute('server-url');
if (serverUrl) {
  const response = await postTokenToServer(serverUrl, result);
  let body;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  this.dispatchEvent(new CustomEvent('server-response', {
    detail: { response: body, status: response.status },
    bubbles: true,
    composed: true,
  }));
}
```

### H4. `configHash` is not collision-resistant

**File:** `src/core/firebase-init.ts:11-13`

```ts
function configHash(config: FirebaseOptions): string {
  return `${config.apiKey}::${config.authDomain}`;
}
```

Two configs with same `apiKey` and `authDomain` but different `projectId` produce the same hash, returning the wrong cached app. Should include all config fields.

**Fix:** Use `JSON.stringify` on sorted keys or include `projectId`:

```ts
function configHash(config: FirebaseOptions): string {
  return JSON.stringify(config, Object.keys(config).sort());
}
```

---

## Medium Priority

### M1. No input validation on `provider` attribute

**File:** `src/components/auth-button.ts:38-40`

```ts
private get provider(): AuthProvider {
  return (this.getAttribute('provider') as AuthProvider) || 'google';
}
```

Invalid provider values (e.g., `provider="facebook"`) silently pass the type cast and reach `createProvider()`, which has an exhaustive switch but no default case. TypeScript narrows this at compile time, but at runtime the attribute is a raw string. `createProvider` returns `undefined`, causing `signInWithPopup` to throw a cryptic Firebase error.

**Fix:** Add runtime validation:
```ts
const VALID_PROVIDERS = new Set(['google', 'github', 'microsoft']);

private get provider(): AuthProvider {
  const raw = this.getAttribute('provider') || 'google';
  if (!VALID_PROVIDERS.has(raw)) {
    console.warn(`[auth-button] Invalid provider "${raw}", falling back to "google"`);
    return 'google';
  }
  return raw as AuthProvider;
}
```

### M2. No `disconnectedCallback` cleanup

**File:** `src/components/auth-button.ts`

If the element is removed from DOM during an in-flight auth operation, the `handleClick` promise continues and dispatches events on a disconnected element. Minor issue but can cause unexpected behavior in SPAs.

### M3. `appCache` memory leak

**File:** `src/core/firebase-init.ts:9`

The `Map` grows indefinitely. In an SPA that dynamically creates auth buttons with different configs, cached `FirebaseApp` instances are never released. Low risk for typical usage but worth noting.

### M4. Missing test for AuthGroup

No test file for `auth-group.ts`. This component has the most dangerous innerHTML pattern (C2).

### M5. Test isolation issue in firebase-init tests

**File:** `src/__tests__/firebase-init.test.ts:22-24`

Comment says "Clear the internal app cache by resetting the module" but the cache is never actually cleared. Tests depend on execution order. The `apps` array in the mock also accumulates across tests.

---

## Low Priority

### L1. UMD globals naming

**File:** `rollup.config.js:24-25`

```js
globals: { 'firebase/app': 'firebase.app', 'firebase/auth': 'firebase.auth' }
```

Firebase's official UMD globals are `firebase.app` (module object) not the typical `firebase` namespace. Verify these match the actual Firebase UMD bundle globals.

### L2. Missing `"sideEffects"` in package.json

The package registers custom elements as a side effect of import. Should declare `"sideEffects": true` (or list specific files) so bundlers don't tree-shake the registration.

### L3. VERSION constant is hardcoded

**File:** `src/index.ts:7`

`VERSION` is hardcoded as `'0.1.0'` and will drift from `package.json`. Consider injecting it via build plugin.

---

## Test Coverage Gaps

1. **No AuthGroup tests** -- innerHTML injection surface untested
2. **No test for double-click / loading guard** -- race condition untested
3. **No test for invalid provider attribute** -- runtime validation untested
4. **No test for `postTokenToServer` failure** -- server errors untested
5. **No test for `disconnectedCallback` behavior** -- lifecycle edge case
6. **No test for attribute change re-rendering** -- `attributeChangedCallback` untested
7. **firebase-init tests have cross-test state leakage** via module-level cache

---

## Positive Observations

- Good use of Shadow DOM encapsulation with `part` attribute for external styling
- Events properly use `composed: true` for Shadow DOM boundary crossing
- Clean TypeScript types for AuthResult/AuthProvider
- Brand-compliant styling with proper focus-visible handling
- CSS custom properties allow consumer customization
- SVG logos have `aria-hidden="true"` and `role="img"`
- Firebase app caching prevents duplicate initialization
- Build produces ESM + UMD + type declarations

---

## Recommended Actions (Priority Order)

1. **[CRITICAL]** Fix XSS in auth-button label rendering (C1) -- use textContent
2. **[CRITICAL]** Fix XSS in auth-group provider/attribute injection (C2) -- use DOM API
3. **[CRITICAL]** Add URL validation for server-url (C3)
4. **[HIGH]** Add `_loading` guard in handleClick (H2)
5. **[HIGH]** Fix event listener duplication (H1) -- remove line 31
6. **[HIGH]** Handle non-JSON server responses (H3)
7. **[HIGH]** Fix configHash collision (H4)
8. **[MEDIUM]** Add runtime provider validation (M1)
9. **[MEDIUM]** Add AuthGroup tests (M4)
10. **[LOW]** Add sideEffects to package.json (L2)

---

## Unresolved Questions

1. Is the default Firebase config (`DEFAULT_CONFIG` with placeholder API key) intentional for demo purposes, or should it require explicit config?
2. Should `postTokenToServer` include credentials (cookies) via `credentials: 'include'` for same-origin server endpoints?
3. Is there a plan to support `signInWithRedirect` as alternative to popup for mobile browsers where popups are blocked?
