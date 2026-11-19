import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type Auth,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getFirestore,
  runTransaction,
  type Firestore,
} from 'firebase/firestore';
import { readFirebaseWebConfig } from './firebaseConfig';
import { reconcileLearningPath } from '../utils/learningPath';
import {
  mergeProgress,
  parseCloudDocument,
  toCloudDocument,
} from '../utils/progressMerge';
import { upgradeProgress, type ProgressData } from '../utils/progress';

/** users/{uid}/progress/state — uid is the only identity stored in the path. */
export const PROGRESS_DOCUMENT_ID = 'state';

export interface CloudAccount {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export type CloudFetchResult =
  | { status: 'missing' }
  | { status: 'invalid' }
  | { status: 'ok'; progress: ProgressData };

export type CloudWriteMode = 'merge' | 'replace';

export type CloudFailureReason = 'invalid' | 'offline' | 'permission' | 'unknown';

export class CloudProgressError extends Error {
  readonly reason: CloudFailureReason;

  constructor(reason: CloudFailureReason, message: string) {
    super(message);
    this.name = 'CloudProgressError';
    this.reason = reason;
  }
}

interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

let services: FirebaseServices | null = null;

function firebaseServices(): FirebaseServices {
  if (services) return services;
  const config = readFirebaseWebConfig();
  if (!config) {
    throw new CloudProgressError('unknown', '尚未設定 Firebase');
  }
  const app = getApps().length > 0 ? getApp() : initializeApp(config);
  const auth = getAuth(app);
  auth.languageCode = 'zh-TW';
  services = { app, auth, db: getFirestore(app) };
  return services;
}

function progressDocument(db: Firestore, uid: string) {
  return doc(db, 'users', uid, 'progress', PROGRESS_DOCUMENT_ID);
}

export function toCloudAccount(user: User): CloudAccount {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
  };
}

export async function prepareAuth(): Promise<void> {
  const { auth } = firebaseServices();
  await auth.authStateReady();
  await getRedirectResult(auth);
}

export function watchAuth(onChange: (account: CloudAccount | null) => void): () => void {
  const { auth } = firebaseServices();
  return onAuthStateChanged(auth, (user) => {
    onChange(user ? toCloudAccount(user) : null);
  });
}

export async function signInWithGoogle(): Promise<void> {
  const { auth } = firebaseServices();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const prefersRedirect = isSmallScreen();
  if (prefersRedirect) {
    await signInWithRedirect(auth, provider);
    return;
  }
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    if (firebaseCode(error) === 'auth/popup-blocked') {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw error;
  }
}

export async function signOutGoogle(): Promise<void> {
  const { auth } = firebaseServices();
  await signOut(auth);
}

export async function fetchCloudProgress(uid: string): Promise<CloudFetchResult> {
  const { db } = firebaseServices();
  const snapshot = await getDoc(progressDocument(db, uid));
  if (!snapshot.exists()) return { status: 'missing' };
  const progress = parseCloudDocument(snapshot.data());
  if (!progress) return { status: 'invalid' };
  return { status: 'ok', progress };
}

export interface CloudWriteResult {
  progress: ProgressData;
  mode: CloudWriteMode;
}

/**
 * Write the latest local progress. Merge keeps the stronger record already
 * stored in the cloud. Replace stores the local snapshot as-is, which is how
 * an explicit import or clear avoids merging the previous cloud copy back.
 */
export async function pushProgress(
  uid: string,
  readLocal: () => ProgressData,
  readMode: () => CloudWriteMode,
): Promise<CloudWriteResult> {
  const { db } = firebaseServices();
  const ref = progressDocument(db, uid);
  try {
    return await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(ref);
      const mode = readMode();
      const local = reconcileLearningPath(upgradeProgress(readLocal()));
      let next = local;
      if (mode !== 'replace' && snapshot.exists()) {
        const remote = parseCloudDocument(snapshot.data());
        if (!remote) {
          throw new CloudProgressError('invalid', '雲端進度無法讀取，仍使用這台裝置的紀錄');
        }
        next = mergeProgress(local, remote);
      }
      transaction.set(ref, toCloudDocument(next));
      return { progress: next, mode };
    });
  } catch (error) {
    if (error instanceof CloudProgressError) throw error;
    throw toCloudProgressError(error);
  }
}

export function authErrorMessage(error: unknown): string {
  const code = firebaseCode(error);
  if (code.includes('api-key')) {
    return 'Firebase 設定不正確，進度仍存在這台裝置';
  }
  switch (code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return '已取消登入';
    case 'auth/popup-blocked':
      return '瀏覽器封鎖了登入視窗，請允許彈出視窗後再試';
    case 'auth/network-request-failed':
      return '目前無法連線，請稍後再試';
    case 'auth/unauthorized-domain':
      return '這個網址尚未加入 Firebase 授權網域';
    case 'auth/operation-not-allowed':
      return '尚未啟用 Google 登入';
    default:
      return '登入失敗，請再試一次';
  }
}

export function isRetriableCloudError(error: unknown): boolean {
  if (error instanceof CloudProgressError) return error.reason === 'offline';
  const code = firebaseCode(error);
  return code === 'unavailable'
    || code === 'deadline-exceeded'
    || code === 'aborted'
    || code === 'auth/network-request-failed'
    || code === 'failed-precondition';
}

function toCloudProgressError(error: unknown): CloudProgressError {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return new CloudProgressError('offline', '目前離線，進度已存在這台裝置');
  }
  switch (firebaseCode(error)) {
    case 'unavailable':
    case 'deadline-exceeded':
    case 'auth/network-request-failed':
      return new CloudProgressError('offline', '目前無法連線，進度已存在這台裝置');
    case 'permission-denied':
    case 'unauthenticated':
      return new CloudProgressError('permission', '沒有權限同步進度');
    default:
      return new CloudProgressError('unknown', '同步失敗，稍後會再試');
  }
}

function firebaseCode(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return '';
}

function isSmallScreen(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 640px)').matches;
}
