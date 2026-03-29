---
title: universal-auth-ui
status: complete
mode: fast
created: 2026-03-29
completed: 2026-03-29
blockedBy: []
blocks: []
---

# universal-auth-ui — Implementation Plan

## Overview

npm package providing Pure Web Components for Firebase Authentication. Drop-in `<auth-button>` and `<auth-group>` for Google/GitHub/Microsoft sign-in. Framework-agnostic, ~3KB gzipped.

**Brainstorm:** `../reports/brainstorm-260329-1855-universal-auth-ui.md`

## Phases

| # | Phase | Priority | Status | Effort |
|---|-------|----------|--------|--------|
| 1 | [Project Setup & Build Pipeline](phase-01-project-setup.md) | Critical | Complete | S |
| 2 | [Firebase Core & Auth Service](phase-02-firebase-auth-service.md) | Critical | Complete | M |
| 3 | [Auth Button Web Component](phase-03-auth-button-component.md) | Critical | Complete | M |
| 4 | [Auth Group Web Component](phase-04-auth-group-component.md) | High | Complete | S |
| 5 | [Brand Styling & Assets](phase-05-brand-styling.md) | High | Complete | M |
| 6 | [Demo Page & Documentation](phase-06-demo-and-docs.md) | Medium | Complete | S |
| 7 | [Testing & npm Publish](phase-07-testing-publish.md) | High | Complete | M |

## Dependency Graph

```
Phase 1 (Setup) → Phase 2 (Firebase) → Phase 3 (Button) → Phase 4 (Group)
                                     → Phase 5 (Styling) ↗
Phase 6 (Demo) depends on Phase 3+4+5
Phase 7 (Test/Publish) depends on all
```

## Key Architecture

```
src/
├── core/
│   ├── firebase-init.ts       # Firebase app init, hybrid config
│   └── auth-service.ts        # signIn/signOut, token retrieval, server POST
├── components/
│   ├── auth-button.ts         # <auth-button> Custom Element
│   └── auth-group.ts          # <auth-group> Custom Element
├── styles/
│   └── brand-styles.ts        # Per-provider CSS (Shadow DOM)
├── assets/
│   ├── google-logo.ts         # Inline SVG
│   ├── github-logo.ts         # Inline SVG
│   └── microsoft-logo.ts      # Inline SVG
└── index.ts                   # Public exports + auto-register elements

dist/
├── index.mjs                  # ESM
├── index.umd.js               # UMD (script tag)
└── index.d.ts                 # TypeScript declarations
```

## Success Criteria

- `npm install universal-auth-ui firebase` → import → works
- `<auth-button provider="google">` renders brand-compliant button
- `<auth-group providers="google,github,microsoft">` renders all 3
- `auth-success` event fires with `{ user, token, provider }`
- `server-url` attribute POSTs token to custom endpoint
- Custom `api-key`/`auth-domain` overrides default Firebase config
- Works in: vanilla HTML, React, Vue, Svelte (no wrapper needed)
- Bundle < 5KB gzipped (excl. Firebase peer dep)
