# Brainstorm: universal-auth-ui

**Date:** 2026-03-29
**Status:** Approved → Creating Plan

## Problem Statement

No maintained, framework-agnostic Web Component for Firebase Auth on npm. `firebaseui-web` is dead (2022). Need simple drop-in auth buttons for Google/GitHub/Microsoft that work everywhere.

## Chosen Approach: Pure Web Components

### Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Framework | Web Components (Custom Elements) | Framework-agnostic, native browser API |
| UI | Login buttons only | KISS — 3 buttons, no modal/form needed |
| Auth flow | onAuth callback + serverUrl prop | Flexibility for both client-only and server verification |
| Firebase config | Hybrid: built-in default + custom override | Quick start with default, scalable with custom |
| Styling | Brand official (Google/GitHub/Microsoft) | Compliance with provider brand guidelines |
| Package name | `universal-auth-ui` | Generic, not tied to Firebase branding |
| Purpose | Open source npm package | Community adoption, developer reputation |

### Components

- `<auth-button>` — Single provider login button
- `<auth-group>` — Multiple provider buttons grouped

### Attributes

- `provider`: google|github|microsoft (required)
- `server-url`: POST token to custom server (optional)
- `api-key` + `auth-domain`: Override Firebase config (optional)
- `theme`: light|dark
- `size`: small|medium|large
- `layout`: vertical|horizontal (auth-group only)

### Events

- `auth-success`: { user, token, provider }
- `auth-error`: { error, provider }
- `server-response`: { response, status }

### Security Notes

- Firebase config is public by design (not a secret)
- Security lies in: Security Rules, API key domain restriction, App Check
- Service Account key (Admin SDK) is the only real secret — never expose

### Build

- ESM + UMD output via Rollup
- Firebase as peer dependency
- Target: ~3KB gzipped (excl. Firebase)
- TypeScript source

### Risks

| Risk | Level | Mitigation |
|---|---|---|
| Default Firebase quota abuse | Medium | Domain restriction + encourage custom config |
| React event handling quirks | Low | Document addEventListener pattern |
| SSR compatibility | Low | Client-side only, dynamic import |

## Next Steps

Create implementation plan with phases.
