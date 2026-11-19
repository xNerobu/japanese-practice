import { useCallback, useEffect, useRef, useState } from 'react';
import { isFirebaseConfigured } from '../services/firebaseConfig';
import { reconcileLearningPath } from '../utils/learningPath';
import {
  mergeProgress,
  progressEquals,
  resolveSignInProgress,
} from '../utils/progressMerge';
import {
  saveProgress,
  upgradeProgress,
  type ProgressData,
} from '../utils/progress';
import type { CloudAccount, CloudWriteMode } from '../services/progressCloud';

const WRITE_DELAY_MS = 1000;
const REPLACE_DELAY_MS = 300;
const MAX_RETRY_MS = 30_000;

type CloudModule = typeof import('../services/progressCloud');

export interface CloudSyncState {
  configured: boolean;
  authReady: boolean;
  account: CloudAccount | null;
  busy: boolean;
  notice: string | null;
  signIn: () => void;
  signOut: () => void;
  replaceProgress: (progress: ProgressData) => void;
}

interface Notice {
  text: string;
  sticky: boolean;
}

/**
 * Keeps Firestore aligned with local progress after Google sign-in.
 * localStorage remains the working copy: sign-out does not clear it, and a
 * missing or failing network leaves the current practice session usable.
 */
export function useCloudSync(
  progress: ProgressData,
  setProgress: (progress: ProgressData) => void,
): CloudSyncState {
  const configured = isFirebaseConfigured();
  const progressRef = useRef(progress);
  const setProgressRef = useRef(setProgress);

  useEffect(() => {
    progressRef.current = progress;
    setProgressRef.current = setProgress;
  }, [progress, setProgress]);

  const [authReady, setAuthReady] = useState(!configured);
  const [account, setAccount] = useState<CloudAccount | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const cloudRef = useRef<CloudModule | null>(null);
  const uidRef = useRef<string | null>(null);
  const readyRef = useRef(false);
  const hadAccountRef = useRef(false);
  const writeModeRef = useRef<CloudWriteMode>('merge');
  const skipWriteRef = useRef(false);
  const quietRef = useRef(false);
  const blockedRef = useRef(false);
  const flushingRef = useRef(false);
  const rerunRef = useRef(false);
  const retryAttemptRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const noticeRef = useRef<Notice | null>(null);
  const scheduleRef = useRef<(mode: CloudWriteMode, delay: number) => void>(() => {});
  const flushRef = useRef<() => Promise<void>>(async () => {});

  const showNotice = useCallback((text: string, sticky: boolean) => {
    const next = { text, sticky };
    noticeRef.current = next;
    setNotice(next);
  }, []);

  const clearTimers = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!notice || notice.sticky) return;
    const id = window.setTimeout(() => {
      noticeRef.current = null;
      setNotice(null);
    }, 3200);
    return () => window.clearTimeout(id);
  }, [notice]);

  useEffect(() => {
    scheduleRef.current = (mode, delay) => {
      if (!configured || !uidRef.current || !readyRef.current) return;
      if (blockedRef.current && mode !== 'replace') return;
      if (mode === 'replace') {
        writeModeRef.current = 'replace';
        blockedRef.current = false;
      }
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        void flushRef.current();
      }, delay);
    };

    flushRef.current = async () => {
      const uid = uidRef.current;
      const cloud = cloudRef.current;
      if (!uid || !cloud || !readyRef.current) return;
      if (flushingRef.current) {
        rerunRef.current = true;
        return;
      }

      flushingRef.current = true;
      const announce = !quietRef.current;
      if (announce) showNotice('正在同步…', true);
      try {
        const written = await cloud.pushProgress(
          uid,
          () => progressRef.current,
          () => writeModeRef.current,
        );
        if (uidRef.current !== uid) return;

        retryAttemptRef.current = 0;
        if (written.mode === 'replace' && writeModeRef.current === 'replace') {
          writeModeRef.current = 'merge';
        }

        const combined = mergeProgress(progressRef.current, written.progress);
        if (!progressEquals(combined, progressRef.current)) {
          progressRef.current = combined;
          saveProgress(combined);
          skipWriteRef.current = true;
          setProgressRef.current(combined);
        }

        const needsAnotherWrite = writeModeRef.current === 'replace'
          || !progressEquals(progressRef.current, written.progress);
        if (needsAnotherWrite) rerunRef.current = true;

        const recovering = noticeRef.current?.sticky === true;
        if (announce || recovering) {
          quietRef.current = true;
          showNotice('已同步', false);
        } else {
          quietRef.current = true;
        }
      } catch (error) {
        if (uidRef.current !== uid) return;
        console.error('同步進度失敗:', error);
        const message = error instanceof cloud.CloudProgressError
          ? error.message
          : '同步失敗，稍後會再試';
        showNotice(message, true);
        const retriable = error instanceof cloud.CloudProgressError
          ? error.reason === 'offline'
          : cloud.isRetriableCloudError(error);
        if (retriable) {
          const delay = Math.min(MAX_RETRY_MS, 2000 * 2 ** retryAttemptRef.current);
          retryAttemptRef.current += 1;
          retryTimerRef.current = window.setTimeout(() => {
            retryTimerRef.current = null;
            scheduleRef.current(writeModeRef.current, 0);
          }, delay);
        }
      } finally {
        flushingRef.current = false;
        if (rerunRef.current && uidRef.current === uid) {
          rerunRef.current = false;
          const mode = writeModeRef.current;
          scheduleRef.current(mode, mode === 'replace' ? REPLACE_DELAY_MS : WRITE_DELAY_MS);
        }
      }
    };
  });

  useEffect(() => {
    if (!configured) return;
    if (skipWriteRef.current) {
      skipWriteRef.current = false;
      return;
    }
    scheduleRef.current('merge', WRITE_DELAY_MS);
  }, [configured, progress]);

  useEffect(() => {
    if (!configured) return;

    const onOnline = () => {
      if (uidRef.current && readyRef.current) {
        scheduleRef.current(writeModeRef.current, 0);
      }
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden' && timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
        void flushRef.current();
      }
    };

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, [configured]);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    let unsubscribe = () => {};
    let session = 0;

    const signOutLocally = (announce: boolean) => {
      uidRef.current = null;
      readyRef.current = false;
      quietRef.current = false;
      blockedRef.current = false;
      writeModeRef.current = 'merge';
      clearTimers();
      setAccount(null);
      setBusy(false);
      if (announce && hadAccountRef.current) {
        showNotice('已登出，這台裝置的進度仍保留', false);
      }
      hadAccountRef.current = false;
      setAuthReady(true);
    };

    const hydrate = async (
      signedIn: CloudAccount,
      sessionId: number,
      uid: string,
      cloud: CloudModule,
    ) => {
      const stillCurrent = () => !cancelled && session === sessionId && uidRef.current === uid;
      setAccount(signedIn);
      setBusy(false);
      hadAccountRef.current = true;
      setAuthReady(true);
      try {
        const read = await cloud.fetchCloudProgress(uid);
        if (!stillCurrent()) return;
        if (writeModeRef.current === 'replace') {
          readyRef.current = true;
          scheduleRef.current('replace', REPLACE_DELAY_MS);
          return;
        }
        if (read.status === 'invalid') {
          blockedRef.current = true;
          readyRef.current = true;
          showNotice('雲端進度無法讀取，仍使用這台裝置的紀錄', true);
          return;
        }

        const cloudProgress = read.status === 'ok' ? read.progress : null;
        const next = resolveSignInProgress(progressRef.current, cloudProgress);
        if (!stillCurrent()) return;

        if (!progressEquals(next, progressRef.current)) {
          progressRef.current = next;
          saveProgress(next);
          skipWriteRef.current = true;
          setProgressRef.current(next);
        }
        readyRef.current = true;
        quietRef.current = false;
        scheduleRef.current('merge', 0);
      } catch (error) {
        if (!stillCurrent()) return;
        console.error('讀取雲端進度失敗:', error);
        readyRef.current = true;
        const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
        showNotice(
          offline ? '目前離線，進度已存在這台裝置' : '同步失敗，稍後會再試',
          true,
        );
        scheduleRef.current('merge', 2000);
      }
    };

    (async () => {
      let cloud: CloudModule;
      try {
        cloud = await import('../services/progressCloud');
      } catch (error) {
        if (cancelled) return;
        console.error('無法載入登入功能:', error);
        showNotice('無法載入登入功能，進度仍存在這台裝置', true);
        setAuthReady(true);
        setBusy(false);
        return;
      }
      if (cancelled) return;
      cloudRef.current = cloud;
      try {
        await cloud.prepareAuth();
      } catch (error) {
        if (cancelled) return;
        console.error('登入狀態還原失敗:', error);
        showNotice(cloud.authErrorMessage(error), true);
      }
      if (cancelled) return;
      unsubscribe = cloud.watchAuth((nextAccount) => {
        const sessionId = ++session;
        if (!nextAccount) {
          signOutLocally(true);
          return;
        }
        uidRef.current = nextAccount.uid;
        void hydrate(nextAccount, sessionId, nextAccount.uid, cloud);
      });
    })();

    return () => {
      cancelled = true;
      readyRef.current = false;
      unsubscribe();
      clearTimers();
    };
  }, [clearTimers, configured, showNotice]);

  const signIn = useCallback(() => {
    if (!configured || busy) return;
    setBusy(true);
    showNotice('正在登入…', true);
    void (async () => {
      try {
        const cloud = cloudRef.current ?? await import('../services/progressCloud');
        cloudRef.current = cloud;
        await cloud.signInWithGoogle();
      } catch (error) {
        console.error('Google 登入失敗:', error);
        const cloud = cloudRef.current;
        const message = cloud ? cloud.authErrorMessage(error) : '登入失敗，請再試一次';
        showNotice(message, message !== '已取消登入');
        setBusy(false);
      }
    })();
  }, [busy, configured, showNotice]);

  const signOut = useCallback(() => {
    if (!configured || busy) return;
    setBusy(true);
    void (async () => {
      try {
        if (writeModeRef.current === 'replace' && uidRef.current && readyRef.current) {
          clearTimers();
          await flushRef.current();
        }
        const cloud = cloudRef.current ?? await import('../services/progressCloud');
        cloudRef.current = cloud;
        await cloud.signOutGoogle();
      } catch (error) {
        console.error('登出失敗:', error);
        showNotice('登出失敗，請再試一次', true);
        setBusy(false);
      }
    })();
  }, [busy, clearTimers, configured, showNotice]);

  const replaceProgress = useCallback((next: ProgressData) => {
    const ready = reconcileLearningPath(upgradeProgress(next));
    progressRef.current = ready;
    saveProgress(ready);
    skipWriteRef.current = true;
    setProgressRef.current(ready);
    if (!uidRef.current) return;
    writeModeRef.current = 'replace';
    scheduleRef.current('replace', REPLACE_DELAY_MS);
  }, []);

  return {
    configured,
    authReady,
    account,
    busy,
    notice: notice?.text ?? null,
    signIn,
    signOut,
    replaceProgress,
  };
}
