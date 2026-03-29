import type { AuthProvider } from '../core/auth-service.js';

type Theme = 'light' | 'dark';
type Size = 'small' | 'medium' | 'large';

interface ProviderTheme {
  bg: string;
  border: string;
  text: string;
  hoverBg: string;
}

const PROVIDER_THEMES: Record<AuthProvider, Record<Theme, ProviderTheme>> = {
  google: {
    light: { bg: '#FFFFFF', border: '#747775', text: '#1F1F1F', hoverBg: '#F2F2F2' },
    dark: { bg: '#131314', border: '#8E918F', text: '#E3E3E3', hoverBg: '#2A2A2B' },
  },
  github: {
    light: { bg: '#FFFFFF', border: '#D0D7DE', text: '#24292F', hoverBg: '#F6F8FA' },
    dark: { bg: '#24292F', border: '#24292F', text: '#FFFFFF', hoverBg: '#32383F' },
  },
  microsoft: {
    light: { bg: '#FFFFFF', border: '#8C8C8C', text: '#5E5E5E', hoverBg: '#F2F2F2' },
    dark: { bg: '#2F2F2F', border: '#2F2F2F', text: '#FFFFFF', hoverBg: '#3D3D3D' },
  },
};

const SIZE_MAP: Record<Size, { height: string; fontSize: string; iconSize: string; padding: string }> = {
  small: { height: '32px', fontSize: '12px', iconSize: '16px', padding: '0 8px' },
  medium: { height: '40px', fontSize: '14px', iconSize: '20px', padding: '0 12px' },
  large: { height: '48px', fontSize: '16px', iconSize: '24px', padding: '0 16px' },
};

export function getButtonStyles(provider: AuthProvider, theme: Theme, size: Size): string {
  const t = PROVIDER_THEMES[provider][theme];
  const s = SIZE_MAP[size];

  return `
    :host {
      display: inline-block;
      --auth-btn-border-radius: 4px;
      --auth-btn-font-family: 'Roboto', system-ui, sans-serif;
      --auth-btn-transition: background-color 0.2s;
    }

    .auth-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-width: 200px;
      height: var(--auth-btn-height, ${s.height});
      padding: ${s.padding};
      background: ${t.bg};
      color: ${t.text};
      border: 1px solid ${t.border};
      border-radius: var(--auth-btn-border-radius);
      font-family: var(--auth-btn-font-family);
      font-size: var(--auth-btn-font-size, ${s.fontSize});
      font-weight: 500;
      cursor: pointer;
      transition: var(--auth-btn-transition);
      outline: none;
      box-sizing: border-box;
      white-space: nowrap;
    }

    .auth-btn:hover:not(:disabled) {
      background: ${t.hoverBg};
    }

    .auth-btn:focus-visible {
      outline: 2px solid #4285F4;
      outline-offset: 2px;
    }

    .auth-btn:disabled {
      opacity: 0.6;
      pointer-events: none;
    }

    .auth-btn__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: ${s.iconSize};
      height: ${s.iconSize};
      flex-shrink: 0;
    }

    .auth-btn__icon svg {
      width: 100%;
      height: 100%;
    }

    .auth-btn__label {
      flex-shrink: 0;
    }

    /* Loading spinner */
    .auth-btn--loading .auth-btn__icon {
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .spinner {
      width: ${s.iconSize};
      height: ${s.iconSize};
      border: 2px solid ${t.border};
      border-top-color: ${t.text};
      border-radius: 50%;
    }
  `;
}

export const DEFAULT_LABELS: Record<AuthProvider, string> = {
  google: 'Sign in with Google',
  github: 'Sign in with GitHub',
  microsoft: 'Sign in with Microsoft',
};
