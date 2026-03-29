# Phase 6: Demo Page & Documentation

**Priority:** Medium | **Effort:** S | **Status:** Complete

## Overview

Single-page HTML demo showcasing all components + comprehensive README for npm.

## Files to Create

- `demo/index.html`
- `README.md`

## Dependencies

- Phase 3, 4, 5 (all components + styles)

## Implementation Steps

### 1. demo/index.html

Self-contained HTML page importing built package via `<script type="module">`:

```html
<!DOCTYPE html>
<html>
<head><title>universal-auth-ui Demo</title></head>
<body>
  <h2>Single Buttons</h2>
  <auth-button provider="google"></auth-button>
  <auth-button provider="github" theme="dark"></auth-button>
  <auth-button provider="microsoft"></auth-button>

  <h2>Group (Vertical)</h2>
  <auth-group providers="google,github,microsoft"></auth-group>

  <h2>Group (Horizontal, Dark)</h2>
  <auth-group providers="google,github" layout="horizontal" theme="dark"></auth-group>

  <h2>With Server URL</h2>
  <auth-button provider="google" server-url="https://httpbin.org/post"></auth-button>

  <h2>Sizes</h2>
  <auth-button provider="google" size="small"></auth-button>
  <auth-button provider="google" size="medium"></auth-button>
  <auth-button provider="google" size="large"></auth-button>

  <pre id="log"></pre>
  <script type="module">
    import '../dist/index.mjs';
    document.addEventListener('auth-success', e => {
      document.getElementById('log').textContent = JSON.stringify(e.detail, null, 2);
    });
  </script>
</body>
</html>
```

### 2. README.md

Sections:
1. **Title + badges** (npm version, license, bundle size)
2. **Install**: `npm install universal-auth-ui firebase`
3. **Quick Start**: minimal HTML example
4. **Components**: `<auth-button>` + `<auth-group>` with attribute tables
5. **Events**: auth-success, auth-error, server-response
6. **Custom Firebase Config**: api-key/auth-domain override
7. **Server Integration**: server-url flow + backend verification example
8. **Styling**: CSS variables, `::part()`, theme/size
9. **Framework Examples**: Vanilla, React, Vue, Svelte snippets
10. **Security**: Firebase config is not secret, link to Firebase docs
11. **License**: MIT

## Success Criteria

- [x] Demo page renders all component variants
- [x] Events log to page for testing
- [x] README has all usage examples
- [x] Framework integration examples (React, Vue, Svelte)
