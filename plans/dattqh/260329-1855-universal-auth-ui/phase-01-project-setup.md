# Phase 1: Project Setup & Build Pipeline

**Priority:** Critical | **Effort:** S | **Status:** Pending

## Overview

Initialize npm package with TypeScript, Rollup build producing ESM+UMD, Firebase as peer dependency.

## Files to Create

- `package.json`
- `tsconfig.json`
- `rollup.config.js`
- `.gitignore`
- `src/index.ts` (placeholder)

## Implementation Steps

### 1. Init package.json

```json
{
  "name": "universal-auth-ui",
  "version": "0.1.0",
  "description": "Drop-in Web Components for Firebase Authentication (Google, GitHub, Microsoft)",
  "type": "module",
  "main": "dist/index.umd.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.umd.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "peerDependencies": {
    "firebase": ">=10.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4",
    "rollup": "^4.0",
    "@rollup/plugin-typescript": "^11.0",
    "@rollup/plugin-terser": "^0.4",
    "rollup-plugin-dts": "^6.0",
    "firebase": "^10.0"
  },
  "scripts": {
    "build": "rollup -c",
    "dev": "rollup -c -w",
    "typecheck": "tsc --noEmit"
  },
  "keywords": ["firebase", "auth", "web-components", "google-login", "github-login", "microsoft-login"],
  "license": "MIT"
}
```

### 2. tsconfig.json

- `target: ES2020`, `module: ESNext`, `moduleResolution: bundler`
- `strict: true`, `declaration: true`
- `outDir: dist`, `rootDir: src`

### 3. rollup.config.js

- Input: `src/index.ts`
- Output: ESM (`dist/index.mjs`) + UMD (`dist/index.umd.js`, name `UniversalAuthUI`)
- Externals: `firebase/*` (peer dep, don't bundle)
- Plugins: typescript, terser
- Separate dts build for type declarations

### 4. .gitignore

- `node_modules/`, `dist/`, `.env`

### 5. Placeholder src/index.ts

```ts
// Entry point — components will auto-register here
export const VERSION = '0.1.0';
```

## Success Criteria

- [x] `npm install` succeeds
- [x] `npm run build` produces `dist/index.mjs`, `dist/index.umd.js`, `dist/index.d.ts`
- [x] `npm run typecheck` passes
- [x] Firebase NOT bundled in output (external)
