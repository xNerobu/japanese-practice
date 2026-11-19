/**
 * Firebase web config is public in the built site. Access control lives in
 * Firestore security rules and Firebase Auth, not in hiding these values.
 * When any required key is missing, the app stays on localStorage only.
 */
export const FIREBASE_ENV_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

export type FirebaseEnvKey = (typeof FIREBASE_ENV_KEYS)[number];

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

function readEnv(name: FirebaseEnvKey): string {
  const value = import.meta.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

export function readFirebaseWebConfig(): FirebaseWebConfig | null {
  const apiKey = readEnv('VITE_FIREBASE_API_KEY');
  const authDomain = readEnv('VITE_FIREBASE_AUTH_DOMAIN');
  const projectId = readEnv('VITE_FIREBASE_PROJECT_ID');
  const storageBucket = readEnv('VITE_FIREBASE_STORAGE_BUCKET');
  const messagingSenderId = readEnv('VITE_FIREBASE_MESSAGING_SENDER_ID');
  const appId = readEnv('VITE_FIREBASE_APP_ID');

  if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
    return null;
  }

  return { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId };
}

export function isFirebaseConfigured(): boolean {
  return readFirebaseWebConfig() !== null;
}
