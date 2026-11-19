import { LogIn, LogOut } from 'lucide-react';

interface AccountSyncProps {
  configured: boolean;
  authReady: boolean;
  signedIn: boolean;
  email: string | null;
  displayName: string | null;
  busy: boolean;
  notice: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function AccountSync({
  configured,
  authReady,
  signedIn,
  email,
  displayName,
  busy,
  notice,
  onSignIn,
  onSignOut,
}: AccountSyncProps) {
  if (!configured || !authReady) return null;

  const label = accountLabel(displayName, email);

  return (
    <div className="mb-4 flex flex-col items-center gap-1">
      {signedIn ? (
        <div className="flex max-w-full items-center justify-center gap-2 px-2">
          <span
            className="max-w-[12rem] truncate text-sm text-gray-600 sm:max-w-xs dark:text-gray-300"
            title={email ?? label}
          >
            {label}
          </span>
          <button
            type="button"
            onClick={onSignOut}
            disabled={busy}
            className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-sm font-semibold text-purple-700 transition-colors hover:bg-purple-50 disabled:opacity-60 dark:text-purple-300 dark:hover:bg-purple-950"
          >
            <LogOut size={16} aria-hidden="true" />
            登出
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onSignIn}
          disabled={busy}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-purple-200 bg-white px-4 py-2 text-sm font-semibold text-purple-700 transition-colors hover:bg-purple-50 disabled:opacity-60 dark:border-purple-700 dark:bg-gray-800 dark:text-purple-200 dark:hover:bg-purple-950"
        >
          <LogIn size={16} aria-hidden="true" />
          使用 Google 登入
        </button>
      )}
      {notice && (
        <p
          role="status"
          aria-live="polite"
          className="max-w-md px-3 text-center text-xs leading-relaxed text-gray-500 dark:text-gray-400"
        >
          {notice}
        </p>
      )}
    </div>
  );
}

function accountLabel(displayName: string | null, email: string | null): string {
  const name = displayName?.trim();
  if (name) return name;
  const trimmedEmail = email?.trim();
  if (trimmedEmail) return trimmedEmail;
  return '已登入';
}
