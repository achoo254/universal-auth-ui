# Phase 7: Testing & npm Publish

**Priority:** High | **Effort:** M | **Status:** Complete

## Overview

Unit tests for core logic, build verification, npm publish preparation.

## Files to Create

- `src/__tests__/auth-service.test.ts`
- `src/__tests__/auth-button.test.ts`
- `.npmrc` (optional, publish config)

## Dependencies

- All previous phases

## Implementation Steps

### 1. Test Setup

Add to devDependencies:
- `vitest` — fast, ESM-native test runner
- `jsdom` — DOM environment for Web Components
- `@vitest/coverage-v8` — coverage reporting

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

`vitest.config.ts`:
```ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true
  }
});
```

### 2. Core Tests (auth-service.test.ts)

- `getOrInitApp()` returns Firebase app with default config
- `getOrInitApp(customConfig)` returns separate app instance
- App cache prevents duplicate initialization
- `createProvider()` returns correct provider class per type
- `postTokenToServer()` sends correct fetch request (mock fetch)

### 3. Component Tests (auth-button.test.ts)

- Element registers as `auth-button` custom element
- Renders button with correct provider label
- Observed attributes trigger re-render
- `theme="dark"` applies dark styles
- `size="small|medium|large"` changes dimensions
- Click dispatches auth flow (mock signInWithPopup)
- `auth-success` event has correct detail structure
- `auth-error` event fires on failure
- `composed: true` on all events
- Loading state toggles during auth

### 4. Build Verification

```bash
npm run build
# Verify outputs exist
ls dist/index.mjs dist/index.umd.js dist/index.d.ts
# Verify Firebase not bundled
grep -c "firebase" dist/index.mjs  # should have import statements, not bundled code
```

### 5. npm Publish Preparation

- `npm pack` → verify tarball contents (only `dist/`, `package.json`, `README.md`, `LICENSE`)
- `files` field in package.json already scoped to `["dist"]`
- Verify `peerDependencies` listed correctly
- Add `repository`, `bugs`, `homepage` fields to package.json
- Create `LICENSE` file (MIT)

### 6. Publish

```bash
npm login
npm publish --access public
```

## Success Criteria

- [x] All unit tests pass
- [x] Coverage > 80% for core logic
- [x] Build produces correct outputs
- [x] Firebase SDK not bundled in dist
- [x] `npm pack` contains only intended files
- [x] Package published to npm successfully
