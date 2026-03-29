// Auto-register custom elements on import
export { AuthButton } from './components/auth-button.js';
export { AuthGroup } from './components/auth-group.js';
export { signInWithProvider, postTokenToServer } from './core/auth-service.js';
export type { AuthProvider, AuthResult } from './core/auth-service.js';
export { getOrInitApp } from './core/firebase-init.js';
export const VERSION = '0.1.0';
