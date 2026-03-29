import { initializeApp, getApps, type FirebaseApp, type FirebaseOptions } from 'firebase/app';

const DEFAULT_CONFIG: FirebaseOptions = {
  apiKey: 'AIzaSyBdefault-placeholder',
  authDomain: 'universal-auth-default.firebaseapp.com',
  projectId: 'universal-auth-default',
};

const appCache = new Map<string, FirebaseApp>();

// H4: Include projectId in hash to avoid cache collisions
function configHash(config: FirebaseOptions): string {
  return `${config.apiKey}::${config.authDomain}::${config.projectId ?? ''}`;
}

export function getOrInitApp(config?: Partial<FirebaseOptions>): FirebaseApp {
  const finalConfig: FirebaseOptions =
    config?.apiKey ? { ...DEFAULT_CONFIG, ...config } : DEFAULT_CONFIG;

  const key = configHash(finalConfig);

  if (appCache.has(key)) {
    return appCache.get(key)!;
  }

  const isDefault =
    key === configHash(DEFAULT_CONFIG);
  const appName = isDefault
    ? '[universal-auth-default]'
    : `[universal-auth-${key.slice(0, 12)}]`;

  // Reuse existing app if already initialized with same name
  const existing = getApps().find((a) => a.name === appName);
  if (existing) {
    appCache.set(key, existing);
    return existing;
  }

  const app = initializeApp(finalConfig, appName);
  appCache.set(key, app);
  return app;
}

export type { FirebaseOptions };
