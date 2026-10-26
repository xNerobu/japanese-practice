import type { SRSData } from './spacedRepetition';
import {
  CURRENT_VERSION,
  upgradeProgress,
  type CharProgress,
  type DailyActivity,
  type ExpData,
  type ProgressData,
} from './progress';

/** Reject oversized files before they are parsed. Real backups are a few dozen kilobytes. */
export const MAX_PROGRESS_FILE_BYTES = 1_000_000;
const MAX_CHAR_RECORDS = 2_000;
const MAX_DAILY_ENTRIES = 5_000;
const MAX_CHAR_LENGTH = 8;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const FORBIDDEN_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export const progressTransferMessages = {
  empty: '檔案是空的，請選擇先前匯出的進度檔。',
  invalidJson: 'JSON 格式不正確，無法讀取這個檔案。',
  wrongShape: '檔案內容不是進度資料，請選擇先前匯出的進度檔。',
  badCharacters: '進度檔中的字符資料格式不正確。',
  badHistory: '進度檔中的每日練習紀錄格式不正確。',
  badExp: '進度檔中的經驗值資料格式不正確。',
  badVersion: '進度檔的版本編號不正確。',
  tooLarge: '檔案過大，請選擇先前匯出的進度檔。',
  readFailed: '無法讀取檔案，請再試一次。',
  downloadFailed: '無法下載進度檔，請再試一次。',
  exported: '已下載進度檔，可傳到另一台裝置後匯入。',
  imported: '已用檔案裡的進度取代這台裝置的練習紀錄。',
} as const;

export function newerVersionMessage(fileVersion: number): string {
  return `這個進度檔的版本（v${fileVersion}）比目前網站支援的版本（v${CURRENT_VERSION}）還新，請先更新網站後再匯入。`;
}

export interface ProgressSummary {
  hiraganaCount: number;
  katakanaCount: number;
  level: number;
  totalExp: number;
  dailyDays: number;
}

export type ProgressImportResult =
  | { ok: true; data: ProgressData; summary: ProgressSummary }
  | { ok: false; message: string };

export function progressExportFilename(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `japanese-kana-progress-${year}-${month}-${day}.json`;
}

export function summarizeProgress(progress: ProgressData): ProgressSummary {
  return {
    hiraganaCount: Object.keys(progress.hiragana).length,
    katakanaCount: Object.keys(progress.katakana).length,
    level: progress.exp?.level ?? 1,
    totalExp: progress.exp?.totalExp ?? 0,
    dailyDays: progress.dailyHistory?.length ?? 0,
  };
}

/** Pretty JSON of the full progress record, including both kana sets. */
export function serializeProgress(progress: ProgressData): string {
  const payload = upgradeProgress({
    hiragana: progress.hiragana ?? {},
    katakana: progress.katakana ?? {},
    dailyHistory: progress.dailyHistory ?? [],
    exp: progress.exp ?? { totalExp: 0, level: 1 },
    version: progress.version ?? CURRENT_VERSION,
  });
  return `${JSON.stringify(payload, null, 2)}\n`;
}

/**
 * Validate an exported progress file and return a record ready to replace
 * the device copy. Counts are taken only from the file.
 */
export function parseProgressText(text: string): ProgressImportResult {
  const trimmed = text.replace(/^\uFEFF/, '').trim();
  if (!trimmed) {
    return { ok: false, message: progressTransferMessages.empty };
  }
  if (trimmed.length > MAX_PROGRESS_FILE_BYTES) {
    return { ok: false, message: progressTransferMessages.tooLarge };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, message: progressTransferMessages.invalidJson };
  }

  if (!isPlainObject(parsed)) {
    return { ok: false, message: progressTransferMessages.wrongShape };
  }

  if (!isPlainObject(parsed.hiragana) || !isPlainObject(parsed.katakana)) {
    return { ok: false, message: progressTransferMessages.wrongShape };
  }

  const versionResult = readVersion(parsed.version);
  if (!versionResult.ok) {
    return versionResult;
  }

  const hiragana = readCharMap(parsed.hiragana);
  if (!hiragana) {
    return { ok: false, message: progressTransferMessages.badCharacters };
  }
  const katakana = readCharMap(parsed.katakana);
  if (!katakana) {
    return { ok: false, message: progressTransferMessages.badCharacters };
  }

  const dailyHistory = readDailyHistory(parsed.dailyHistory);
  if (dailyHistory === null) {
    return { ok: false, message: progressTransferMessages.badHistory };
  }

  const exp = readExp(parsed.exp);
  if (exp === null) {
    return { ok: false, message: progressTransferMessages.badExp };
  }

  const data = upgradeProgress({
    hiragana,
    katakana,
    dailyHistory,
    exp,
    version: versionResult.version,
  });

  return { ok: true, data, summary: summarizeProgress(data) };
}

export function deviceHasProgress(progress: ProgressData): boolean {
  const summary = summarizeProgress(progress);
  return summary.hiraganaCount > 0
    || summary.katakanaCount > 0
    || summary.totalExp > 0
    || summary.dailyDays > 0;
}

function readVersion(value: unknown): { ok: true; version: number | undefined } | { ok: false; message: string } {
  if (value === undefined) {
    return { ok: true, version: undefined };
  }
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    return { ok: false, message: progressTransferMessages.badVersion };
  }
  if (value > CURRENT_VERSION) {
    return { ok: false, message: newerVersionMessage(value) };
  }
  return { ok: true, version: value };
}

function readCharMap(value: Record<string, unknown>): Record<string, CharProgress> | null {
  const entries = Object.entries(value);
  if (entries.length > MAX_CHAR_RECORDS) return null;

  const map: Record<string, CharProgress> = {};
  for (const [key, raw] of entries) {
    if (!isCharKey(key) || !isPlainObject(raw)) return null;
    const record = readCharProgress(key, raw);
    if (!record) return null;
    map[key] = record;
  }
  return map;
}

function readCharProgress(key: string, raw: Record<string, unknown>): CharProgress | null {
  if (raw.char !== key) return null;
  if (!isNonNegativeInteger(raw.correct) || !isNonNegativeInteger(raw.incorrect)) return null;
  if (!isNonNegativeFinite(raw.lastPracticed)) return null;

  const record: CharProgress = {
    char: key,
    correct: raw.correct,
    incorrect: raw.incorrect,
    lastPracticed: raw.lastPracticed,
  };

  if (raw.srs === undefined) return record;
  const srs = readSrs(key, raw.srs);
  if (!srs) return null;
  record.srs = srs;
  return record;
}

function readSrs(key: string, value: unknown): SRSData | null {
  if (!isPlainObject(value)) return null;
  if (value.char !== key) return null;
  if (!isNonNegativeInteger(value.interval) || !isNonNegativeInteger(value.repetitions)) return null;
  if (!isEaseFactor(value.easeFactor)) return null;
  if (!isNonNegativeFinite(value.nextReview) || !isNonNegativeFinite(value.lastReview)) return null;

  return {
    char: key,
    interval: value.interval,
    repetitions: value.repetitions,
    easeFactor: value.easeFactor,
    nextReview: value.nextReview,
    lastReview: value.lastReview,
  };
}

function readDailyHistory(value: unknown): DailyActivity[] | undefined | null {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > MAX_DAILY_ENTRIES) return null;

  const history: DailyActivity[] = [];
  for (const entry of value) {
    if (!isPlainObject(entry)) return null;
    if (typeof entry.date !== 'string' || !DATE_PATTERN.test(entry.date)) return null;
    if (!isNonNegativeInteger(entry.correct) || !isNonNegativeInteger(entry.incorrect)) return null;
    if (!isNonNegativeInteger(entry.practiced)) return null;

    const activity: DailyActivity = {
      date: entry.date,
      correct: entry.correct,
      incorrect: entry.incorrect,
      practiced: entry.practiced,
    };
    if (entry.exp !== undefined) {
      if (!isNonNegativeInteger(entry.exp)) return null;
      activity.exp = entry.exp;
    }
    history.push(activity);
  }
  return history;
}

function readExp(value: unknown): ExpData | undefined | null {
  if (value === undefined) return undefined;
  if (!isPlainObject(value)) return null;
  if (!isNonNegativeInteger(value.totalExp)) return null;
  if (!isNonNegativeInteger(value.level) || value.level < 1 || value.level > 10_000) return null;

  const exp: ExpData = {
    totalExp: value.totalExp,
    level: value.level,
  };
  if (value.dailyBonusClaimed !== undefined) {
    if (typeof value.dailyBonusClaimed !== 'string' || !DATE_PATTERN.test(value.dailyBonusClaimed)) {
      return null;
    }
    exp.dailyBonusClaimed = value.dailyBonusClaimed;
  }
  return exp;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCharKey(key: string): boolean {
  return key.length > 0 && key.length <= MAX_CHAR_LENGTH && !FORBIDDEN_KEYS.has(key);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isInteger(value)
    && value >= 0
    && value <= Number.MAX_SAFE_INTEGER;
}

function isNonNegativeFinite(value: unknown): value is number {
  return typeof value === 'number'
    && Number.isFinite(value)
    && value >= 0
    && value <= Number.MAX_SAFE_INTEGER;
}

function isEaseFactor(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 100;
}
