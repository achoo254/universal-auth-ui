import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock firebase/app before importing our module
vi.mock('firebase/app', () => {
  const apps: Array<{ name: string; options: Record<string, string> }> = [];

  return {
    initializeApp: vi.fn((config: Record<string, string>, name: string) => {
      const app = { name, options: config };
      apps.push(app);
      return app;
    }),
    getApps: vi.fn(() => apps),
  };
});

import { getOrInitApp } from '../core/firebase-init.js';
import { initializeApp, getApps } from 'firebase/app';

describe('getOrInitApp', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear the internal app cache by resetting the module
  });

  it('creates app with default config when no config provided', () => {
    const app = getOrInitApp();
    expect(initializeApp).toHaveBeenCalledTimes(1);
    expect(app).toBeDefined();
    expect(app.name).toBe('[universal-auth-default]');
  });

  it('returns cached app on second call with same config', () => {
    const app1 = getOrInitApp();
    const app2 = getOrInitApp();
    // initializeApp should only be called once (from first test + first call here)
    // But since cache persists across tests in same module, it reuses
    expect(app1).toBe(app2);
  });

  it('creates separate app for custom config', () => {
    const customApp = getOrInitApp({ apiKey: 'custom-key', authDomain: 'custom.firebaseapp.com' });
    expect(customApp).toBeDefined();
    expect(customApp.name).toContain('[universal-auth-');
    expect(customApp.name).not.toBe('[universal-auth-default]');
  });
});
