# Adversarial Code Review: universal-auth-ui

**Date:** 2026-03-29
**Scope:** All source files in `src/`
**Runtime:** Browser (client-side JS, Web Components + Shadow DOM)
**Purpose:** Find ways this code can fail, be exploited, or produce incorrect results

---

## Critical Findings

### F1. Memory Leak: Event Listeners Accumulate on Every Render

- **SEVERITY:** Critical
- **CATEGORY:** Failure / Resource Exhaustion
- **LOCATION:** `src/components/auth-button.ts:139`
- **ATTACK:** Any attribute change (theme, size, label, provider) triggers `render()`, which calls `this.shadowRoot!.innerHTML = ...` then adds a new click listener via `addEventListener('click', ...)`. While `innerHTML` destroys old DOM nodes, if any external code holds a reference to the old button (unlikely but possible in frameworks), listeners leak. More critically, rapid attribute toggling (e.g., reactive framework binding) causes rapid full DOM teardown/rebuild cycles -- expensive and fragile.
- **IMPACT:** Performance degradation in reactive frameworks that frequently update attributes. Each render cycle does full innerHTML parse + DOM query + listener attach.
- **FIX:** Use a stable click handler attached once in `connectedCallback`, and have `render()` only update the parts that change. Or use `replaceChildren` like `auth-group` does and attach listener to `this` (delegated) rather than to the inner button.

### F2. CSS Injection via `gap` Attribute

- **SEVERITY:** Critical
- **CATEGORY:** Security (Injection)
- **LOCATION:** `src/components/auth-group.ts:38-45`
- **ATTACK:** Set `gap` attribute to a malicious value: `<auth-group gap="8px; } :host { display:none } .auth-group { color: red"></auth-group>`. The `gap` value is interpolated directly into a `style.textContent` template string without sanitization. An attacker controlling HTML attributes (e.g., via a CMS, URL parameter reflected into HTML, or framework binding) can inject arbitrary CSS.
- **IMPACT:** CSS injection can exfiltrate data via `background-image: url(...)` to attacker-controlled servers, overlay phishing UI, hide legitimate content, or break layout. In combination with `@import`, can load external stylesheets.
- **FIX:** Validate `gap` against a CSS value regex (e.g., `/^\d+(\.\d+)?(px|em|rem|%|vh|vw)$/`) or use `CSS.supports('gap', value)` before interpolation. Alternatively, set it only via `container.style.gap = gap` (DOM API, auto-escaped).

### F3. CSS Injection via `layout` Attribute

- **SEVERITY:** Critical
- **CATEGORY:** Security (Injection)
- **LOCATION:** `src/components/auth-group.ts:36`
- **ATTACK:** `layout` attribute is read and compared to `'horizontal'` but any non-matching value falls through to `'column'`. However the `direction` variable derived from it is then used in a ternary that only outputs `'row'` or `'column'` (line 43), so this specific path is safe. **Downgrading to informational** -- the ternary on line 43 re-checks `direction` rather than using `layout` directly, preventing injection here.
- **IMPACT:** None (safe by accident). But fragile -- if someone refactors to use `layout` directly in the template, it becomes injectable.
- **FIX:** Explicitly validate `layout` against allowed values at the point of use.

### F4. Token Exposed in Custom Event Detail (Composed, Bubbling)

- **SEVERITY:** Critical
- **CATEGORY:** Security (Data Leak)
- **LOCATION:** `src/components/auth-button.ts:86-90`
- **ATTACK:** The `auth-success` event is dispatched with `composed: true` and `bubbles: true`, meaning it escapes the Shadow DOM and bubbles to `document`. The event detail contains the full Firebase JWT token. ANY script on the page -- including third-party analytics, ad scripts, chat widgets -- can listen for `auth-success` on `document` and steal the token.
- **IMPACT:** Token theft by any third-party JavaScript on the page. The token grants full Firebase Auth access as the user.
- **FIX:** Do not include the raw token in the composed event. Instead, provide a `getToken()` async method on the event detail that consumers must explicitly call, or require consumers to listen directly on the element (not composed). At minimum, document this risk prominently.

### F5. Server POST Has No CSRF Protection

- **SEVERITY:** Critical
- **CATEGORY:** Security (CSRF)
- **LOCATION:** `src/core/auth-service.ts:62-67`
- **ATTACK:** `postTokenToServer` sends a plain `fetch` POST with JSON body and no CSRF token, no custom header beyond `Content-Type`. If the server relies on cookies for session management, this POST is vulnerable to CSRF. Additionally, `credentials` is not set, meaning cookies are only sent for same-origin (default `same-origin`), but if server expects cross-origin cookies, the developer must add `credentials: 'include'` themselves.
- **IMPACT:** If server-url is same-origin and the server uses cookie-based auth, a CSRF attack from another site could replay a stolen token. More practically: the lack of `credentials` option means cross-origin server-url silently fails to send cookies.
- **FIX:** Add a configurable `credentials` option. Document that server-side CSRF protection is the server's responsibility. Consider adding a custom header (e.g., `X-Requested-With: UniversalAuthUI`) that servers can check as a CSRF defense.

---

## Medium Findings

### F6. `response.json()` Consumes Body, Then `response.text()` Fails

- **SEVERITY:** Medium
- **CATEGORY:** Failure / Silent Error
- **LOCATION:** `src/components/auth-button.ts:97-101`
- **ATTACK:** If the server returns a response where `response.json()` fails (e.g., HTML error page), the catch block calls `response.text()`. However, `response.json()` may have partially consumed the body stream. In the Fetch API, once a body reader is used, calling another body method throws `TypeError: body stream already read`.
- **IMPACT:** Server error responses produce an unhandled TypeError instead of the actual error body. The `auth-error` event never fires (this is in the try block after auth success), but the `server-response` event will contain the TypeError as body.
- **FIX:** Clone the response first: `const clone = response.clone(); try { body = await response.json() } catch { body = await clone.text() }`.

### F7. Invalid Provider Silently Falls Through to Google

- **SEVERITY:** Medium
- **CATEGORY:** Assumption / Silent Failure
- **LOCATION:** `src/components/auth-button.ts:40-41, 124`
- **ATTACK:** Set `provider="facebook"` or `provider=""`. The `provider` getter returns the attribute cast as `AuthProvider` with `|| 'google'` fallback. In `render()`, `VALID_PROVIDERS.has(provider)` is false, so it uses `LOGOS.google`. But in `handleClick()`, `createProvider()` in auth-service receives `'facebook'` which hits no switch case and returns `undefined`. `signInWithPopup` then receives `undefined` as the provider, causing a Firebase runtime error.
- **IMPACT:** Confusing error for consumers. The button renders with a Google logo but the auth flow crashes with an opaque Firebase error, not a clear "invalid provider" message.
- **FIX:** Validate provider at the boundary -- in `handleClick()`, check `VALID_PROVIDERS.has(provider)` before calling `signInWithProvider`. If invalid, dispatch `auth-error` with a clear message. In `createProvider()`, add a default case that throws.

### F8. `createProvider` Has No Default/Exhaustive Case

- **SEVERITY:** Medium
- **CATEGORY:** Assumption
- **LOCATION:** `src/core/auth-service.ts:26-34`
- **ATTACK:** TypeScript's type narrowing makes this look safe, but at runtime the `provider` value comes from an unvalidated HTML attribute cast. Any string passes through.
- **IMPACT:** `createProvider` returns `undefined` implicitly, passed to `signInWithPopup` which throws an unhelpful error.
- **FIX:** Add `default: throw new Error(\`Unsupported provider: ${provider}\`)` to the switch.

### F9. `appCache` Never Evicts -- Unbounded Memory Growth

- **SEVERITY:** Medium
- **CATEGORY:** Failure / Resource Exhaustion
- **LOCATION:** `src/core/firebase-init.ts:9`
- **ATTACK:** If a consumer dynamically generates config objects (e.g., per-tenant SaaS with unique API keys), each unique config creates a new Firebase app and cache entry that is never freed.
- **IMPACT:** Memory leak in long-lived SPAs with dynamic tenant configs. Firebase apps hold auth state, network connections, etc.
- **FIX:** Add an LRU eviction policy, or export a `clearApp(config)` function, or use WeakRef for cache values.

### F10. `configHash` Is Not Collision-Resistant

- **SEVERITY:** Medium
- **CATEGORY:** Data Corruption
- **LOCATION:** `src/core/firebase-init.ts:12-14`
- **ATTACK:** `configHash` concatenates with `::` separator. An apiKey containing `::` could collide with a different config. Example: `apiKey="a::b", authDomain=""` produces same hash as `apiKey="a", authDomain="b"`.
- **IMPACT:** Two different Firebase configs resolve to the same cached app, causing auth against the wrong project.
- **FIX:** Use `JSON.stringify` of the config fields, or a proper hash function rather than delimiter-based concatenation.

### F11. HTTPS Check Is Client-Side Only and Incomplete

- **SEVERITY:** Medium
- **CATEGORY:** Security
- **LOCATION:** `src/components/auth-button.ts:94`
- **ATTACK:** The check `serverUrl.startsWith('https://')` silently drops the server POST for non-HTTPS URLs. No error event, no console warning. The consumer has no idea their server integration is silently broken. Also, `localhost` development is blocked since `http://localhost:3000/auth` won't match.
- **IMPACT:** Silent failure in development. Silent failure if server-url attribute has a typo (e.g., `htps://`). No feedback to developer.
- **FIX:** Allow `http://localhost` and `http://127.0.0.1` for development. Dispatch an `auth-error` event or `console.warn` when a non-HTTPS URL is rejected rather than silently skipping.

---

## Low Findings

### F12. `disconnectedCallback` Not Implemented

- **SEVERITY:** Low
- **CATEGORY:** Failure / Memory Leak
- **LOCATION:** `src/components/auth-button.ts` (missing)
- **ATTACK:** When `auth-button` is removed from the DOM during an active auth popup flow, `_loading` remains true on the detached element. If the element is re-attached, `render()` fires but `_loading` state is stale. The popup callback will try to dispatch events on a potentially re-attached or garbage-collected element.
- **IMPACT:** Minor: stale state if element is removed/re-added. The popup's promise will resolve/reject and attempt to call `setLoading(false)` on the old element reference.
- **FIX:** Implement `disconnectedCallback` to set a `_disconnected` flag. Check it after `await signInWithProvider` returns. Consider aborting the flow.

### F13. No `label` Passthrough in `auth-group`

- **SEVERITY:** Low
- **CATEGORY:** Assumption / API Contract
- **LOCATION:** `src/components/auth-group.ts:3`
- **ATTACK:** `PASSTHROUGH_ATTRS` does not include `'label'`. Setting `label` on `auth-group` has no effect -- all buttons get default labels. This contradicts the README: "All `<auth-button>` attributes ... are passed through."
- **IMPACT:** Consumer confusion. Setting per-button labels is impossible through `auth-group`.
- **FIX:** Either add `'label'` to `PASSTHROUGH_ATTRS` (but then all buttons get the same label, which is wrong), or document that label must be set per-button. Consider a `labels` attribute like `labels="Login with Google,Login with GitHub"`.

### F14. UMD Global Name Assumes `firebase.app` / `firebase.auth` Exist

- **SEVERITY:** Low
- **CATEGORY:** Assumption / Supply Chain
- **LOCATION:** `rollup.config.js:24-25`
- **ATTACK:** UMD build assumes Firebase is loaded as `firebase.app` and `firebase.auth` globals. Firebase v10+ (modular SDK) does not expose globals this way. Only the compat SDK does.
- **IMPACT:** UMD consumers who load Firebase modular SDK via `<script>` will get runtime errors. The UMD format is effectively broken for Firebase 10+ modular usage.
- **FIX:** Document that UMD build requires Firebase compat SDK, or remove UMD output and only ship ESM.

### F15. `auth-group` With Empty/Invalid `providers` Renders Nothing Silently

- **SEVERITY:** Low
- **CATEGORY:** Assumption / Silent Failure
- **LOCATION:** `src/components/auth-group.ts:26-29`
- **ATTACK:** `<auth-group providers="facebook,twitter"></auth-group>` -- all providers are filtered out by `VALID_PROVIDERS`, resulting in an empty container with no buttons and no error.
- **IMPACT:** Consumer sees blank space with no indication of misconfiguration.
- **FIX:** `console.warn` when providers list is empty after filtering, or render an error state.

### F16. Peer Dependency Range Too Wide

- **SEVERITY:** Low
- **CATEGORY:** Supply Chain
- **LOCATION:** `package.json:20`
- **ATTACK:** `"firebase": ">=10.0.0"` accepts any future Firebase version including hypothetical v11, v12, etc. that may have breaking API changes to `signInWithPopup`, `getAuth`, or `getIdToken`.
- **IMPACT:** Future Firebase major version bumps silently accepted, potentially breaking auth flow at runtime while npm install succeeds.
- **FIX:** Cap at `"firebase": ">=10.0.0 <12.0.0"` or similar tested range.

---

## Summary

| Severity | Count |
|----------|-------|
| Critical | 5     |
| Medium   | 6     |
| Low      | 5     |

**Top 3 action items:**
1. **F4 (Token in composed event)** -- highest real-world risk; any third-party script steals auth tokens
2. **F2 (CSS injection via gap)** -- attacker-controlled HTML attributes enable CSS exfiltration
3. **F6 (Body stream double-read)** -- silent failure on server error responses, easy fix with `response.clone()`

---

**Status:** DONE
**Summary:** 16 findings across security, failure modes, resource leaks, and API contract violations. 5 critical (token leak via composed events, CSS injection, CSRF, body stream bug, memory leak from re-renders), 6 medium, 5 low.
**Concerns:** F4 (token exposure in composed events) is the most impactful -- any page script can steal tokens. F2 (CSS injection) is exploitable wherever attacker controls HTML attributes.
