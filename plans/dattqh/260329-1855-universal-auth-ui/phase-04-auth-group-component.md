# Phase 4: Auth Group Web Component

**Priority:** High | **Effort:** S | **Status:** Complete

## Overview

`<auth-group>` — convenience wrapper that renders multiple `<auth-button>` elements from a comma-separated `providers` attribute.

## Files to Create

- `src/components/auth-group.ts`

## Dependencies

- Phase 3 (auth-button must be registered)

## Implementation Steps

### 1. Define Custom Element

```ts
class AuthGroup extends HTMLElement {
  static observedAttributes = [
    'providers', 'layout', 'gap',
    'server-url', 'api-key', 'auth-domain', 'theme', 'size'
  ];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() { this.render(); }
  attributeChangedCallback() { if (this.isConnected) this.render(); }
}

customElements.define('auth-group', AuthGroup);
```

### 2. Render Method

- Parse `providers="google,github,microsoft"` → array
- Create `<auth-button>` for each, passing through shared attributes (server-url, theme, size, api-key, auth-domain)
- Layout via flexbox: `vertical` (column) or `horizontal` (row)
- Gap configurable via `gap` attribute

```html
<!-- Shadow DOM output for providers="google,github" layout="vertical" -->
<style>
  :host { display: block; }
  .auth-group {
    display: flex;
    flex-direction: column;
    gap: var(--auth-group-gap, 8px);
  }
  :host([layout="horizontal"]) .auth-group {
    flex-direction: row;
  }
</style>
<div class="auth-group" part="group">
  <auth-button provider="google" theme="light" server-url="..."></auth-button>
  <auth-button provider="github" theme="light" server-url="..."></auth-button>
</div>
```

### 3. Event Bubbling

Events from child `<auth-button>` bubble up with `composed: true` → no extra work needed. Parent can listen on `<auth-group>` directly.

## Attributes

| Attribute | Type | Default | Description |
|---|---|---|---|
| `providers` | comma-separated string | `"google"` | Which providers to show |
| `layout` | `vertical\|horizontal` | `vertical` | Button arrangement |
| `gap` | CSS value | `8px` | Space between buttons |
| *(inherits all auth-button attrs)* | | | Passed through to children |

## Success Criteria

- [x] `<auth-group providers="google,github,microsoft">` renders 3 buttons
- [x] Shared attributes (theme, server-url, etc.) propagate to children
- [x] Layout vertical/horizontal works
- [x] Events bubble from child buttons to group element
