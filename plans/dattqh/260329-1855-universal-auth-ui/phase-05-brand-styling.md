# Phase 5: Brand Styling & Assets

**Priority:** High | **Effort:** M | **Status:** Complete

## Overview

Brand-compliant button styles for Google, GitHub, Microsoft. Inline SVG logos. CSS custom properties for override. Light/dark themes. 3 sizes.

## Files to Create

- `src/styles/brand-styles.ts`
- `src/assets/google-logo.ts`
- `src/assets/github-logo.ts`
- `src/assets/microsoft-logo.ts`

## Dependencies

- Phase 3 (auth-button consumes these styles)

## Implementation Steps

### 1. SVG Logos (inline strings)

Each file exports a single SVG string constant. Must use official brand logos:

- **Google**: 4-color "G" icon (blue #4285F4, red #EA4335, yellow #FBBC05, green #34A853)
- **GitHub**: Octocat mark, single color `#24292F` (dark) or `#FFFFFF` (light)
- **Microsoft**: 4-square logo (orange #F25022, green #7FBA00, blue #00A4EF, yellow #FFB900)

SVGs must be:
- Viewbox normalized (24x24 or similar)
- No external references
- Accessible: `role="img"` + `aria-hidden="true"` (decorative, text label exists)

### 2. Brand Styles per Provider

```ts
// brand-styles.ts
export function getButtonStyles(provider: AuthProvider, theme: 'light' | 'dark'): string {
  // Returns CSS string for Shadow DOM <style> injection
}
```

| Provider | Light Theme | Dark Theme |
|---|---|---|
| **Google** | bg: `#FFFFFF`, border: `#747775`, text: `#1F1F1F`, font: Roboto 500 | bg: `#131314`, border: `#8E918F`, text: `#E3E3E3` |
| **GitHub** | bg: `#FFFFFF`, border: `#D0D7DE`, text: `#24292F` | bg: `#24292F`, border: `#24292F`, text: `#FFFFFF` |
| **Microsoft** | bg: `#FFFFFF`, border: `#8C8C8C`, text: `#5E5E5E` | bg: `#2F2F2F`, border: `#2F2F2F`, text: `#FFFFFF` |

### 3. Size Variants

| Size | Height | Font | Icon | Padding |
|---|---|---|---|---|
| `small` | 32px | 12px | 16x16 | 0 8px |
| `medium` | 40px | 14px | 20x20 | 0 12px |
| `large` | 48px | 16px | 24x24 | 0 16px |

### 4. CSS Custom Properties (override surface)

```css
:host {
  --auth-btn-border-radius: 4px;
  --auth-btn-font-family: 'Roboto', system-ui, sans-serif;
  --auth-btn-font-size: 14px;
  --auth-btn-height: 40px;
  --auth-btn-transition: background-color 0.2s;
}
```

### 5. Common Button Styles

- `cursor: pointer`, smooth hover transition
- Focus ring for accessibility (`outline: 2px solid`, `:focus-visible`)
- Disabled/loading state: `opacity: 0.6`, `pointer-events: none`
- `::part(button)` exposed for full external override
- `min-width: 200px` to prevent text truncation

### 6. Loading Spinner

Simple CSS-only spinner (border-based) shown during auth. Replace icon slot.

## Brand Compliance Notes

- Google: "Sign in with Google" (not "Log in"), Roboto Medium font, exact color codes
- Microsoft: "Sign in with Microsoft" exact wording required
- GitHub: No strict text rules, convention "Sign in with GitHub"
- All: Logo must not be recolored or distorted

## Success Criteria

- [x] Google button matches official brand guidelines
- [x] GitHub button uses official Octocat mark
- [x] Microsoft button uses official 4-square logo
- [x] Light/dark themes for all 3 providers
- [x] 3 size variants (small/medium/large)
- [x] CSS variables allow customization without breaking brand
- [x] Loading spinner displays during auth
