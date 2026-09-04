/**
 * crash-guard — crash protection for the editor suite (ADR 0004 §2 定案,
 * M10 brief §2). While an editor is open, the CURRENT DRAFT snapshot (the
 * truncated stack: never the undo history) is serialized into sessionStorage
 * under `tb-editor-crash:<域>:<实体id|new>`. After a crash / hard kill the
 * next editor enter finds the archive and offers recovery (the React
 * binding + dialog live in crash-guard-react.tsx).
 *
 * Design boundaries (M10 brief §2 — hard edges):
 *  - Read-only vs the leave-guard stack: this module NEVER registers
 *    beforeunload/pagehide or a route blocker — use-leave-guard owns the
 *    §3.8 leave confirm; the guard only observes session writes.
 *  - Clean exit clears the key: the moment the session turns CLEAN (save,
 *    undo drained to the baseline, rollback) the key is removed — the draft
 *    equals the baseline, so any archive under the key is stale noise and
 *    the next enter cannot mis-prompt a recovery. A pre-existing archive
 *    (written by a crashed visit) survives attach alone — attach only
 *    observes writes, it never fires on a clean session, so the recovery
 *    dialog can still read it.
 *  - Storage writes are best-effort: quota errors / private-mode
 *    sessionStorage are swallowed silently (crash protection must never
 *    toast-bomb or crash the editor).
 *
 * Framework-light core (the session.ts precedent): no React here.
 */

import type { EditorSession } from './session';

/** Key namespace — three editors share the prefix, never each other's keys. */
export const CRASH_GUARD_KEY_PREFIX = 'tb-editor-crash:';

/** Archive shape version — bump on a breaking draft-format change. */
export const CRASH_ARCHIVE_SCHEMA_VERSION = 1;

/** The persisted draft snapshot (truncated stack: draft only). */
export interface CrashArchive<T> {
  schemaVersion: typeof CRASH_ARCHIVE_SCHEMA_VERSION;
  /** Entity id the archive was captured for (forensics; the key carries it). */
  entityId: string;
  /** Wall-clock ts of the snapshot. */
  savedAt: number;
  draft: T;
}

/** `tb-editor-crash:<域>:<实体id|new>` — id-less entities land on `new`. */
export function crashGuardKey(domain: string, entityId?: string): string {
  return `${CRASH_GUARD_KEY_PREFIX}${domain}:${entityId || 'new'}`;
}

/** The `<实体id>` part of a guard key (after the domain segment). */
function entityIdOfKey(key: string): string {
  const rest = key.slice(CRASH_GUARD_KEY_PREFIX.length);
  const sep = rest.indexOf(':');
  return sep === -1 ? 'new' : rest.slice(sep + 1);
}

export function clearCrashArchive(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // private-mode / disabled storage — nothing to clean up
  }
}

/** Strict parse; ANY shape violation removes the key silently (不崩不轰炸). */
export function readCrashArchive<T>(key: string): CrashArchive<T> | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(key);
  } catch {
    return null;
  }
  if (raw === null) {
    return null;
  }
  const fail = (): null => {
    clearCrashArchive(key);
    return null;
  };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fail();
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return fail();
  }
  const archive = parsed as Partial<CrashArchive<T>>;
  if (
    archive.schemaVersion !== CRASH_ARCHIVE_SCHEMA_VERSION ||
    typeof archive.entityId !== 'string' ||
    typeof archive.savedAt !== 'number' ||
    archive.draft === null ||
    typeof archive.draft !== 'object' ||
    Array.isArray(archive.draft)
  ) {
    return fail();
  }
  return parsed as CrashArchive<T>;
}

/**
 * Recovery predicate: an archive is offered only when it exists AND drifted
 * from the live baseline (structural JSON compare — the archive is a parsed
 * copy, reference identity can never hold).
 */
export function isRecoverable<T extends object>(
  archive: CrashArchive<T> | null,
  baseline: T,
): boolean {
  if (!archive) {
    return false;
  }
  return JSON.stringify(archive.draft) !== JSON.stringify(baseline);
}

/**
 * Commits the archived draft into the open session as ONE transaction group
 * (the import paradigm: whole-draft swap, a single ctrl+z reverts it).
 * Works on plain-object drafts (all three editors' drafts are); an archive
 * equal to the current draft produces zero patches and is a full no-op.
 */
export function restoreCrashArchive<T extends object>(
  session: EditorSession<T>,
  archive: CrashArchive<T>,
): void {
  session.write('crash:restore', (draft) => {
    const target = draft as Record<string, unknown>;
    for (const field of Object.keys(target)) {
      delete target[field];
    }
    Object.assign(target, archive.draft as Record<string, unknown>);
  });
}

export interface CrashGuardOptions<T extends object> {
  /** `tb-editor-crash:<域>:<实体id|new>` — see crashGuardKey. */
  key: string;
  session: EditorSession<T>;
  /**
   * Coalesce window for the STORAGE write (ms) — the widget editor's
   * code-text path (per-keystroke coalesced session writes) passes this so
   * sessionStorage sees one write per pause instead of per keystroke.
   * 0 = write on every session write (dashboard/rule-chain granularity).
   */
  debounceMs?: number;
}

/**
 * Subscribes to the session and mirrors dirty drafts into sessionStorage.
 * Returns the detach function (session.subscribe shape). The detach flushes
 * a pending debounced write synchronously while the session is still dirty
 * (a dirty unmount keeps the freshest snapshot); a clean session never
 * resurrects the key. Storage lifecycle:
 *   - write (dirty)  → archive the current snapshot (optionally debounced);
 *   - dirty→clean    → clear the key (save / drained undo / rollback —
 *                      nothing left to recover);
 *   - clean attach   → a pre-existing archive is left for the recovery
 *                      dialog (it was never written by THIS attach).
 */
export function attachCrashGuard<T extends object>({
  key,
  session,
  debounceMs = 0,
}: CrashGuardOptions<T>): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  // Whether THIS attach ever completed an archive write — detach uses it to
  // distinguish "our dirty unmount" from "a clean session we never touched".
  let archivedHere = false;

  const isDirty = (): boolean | null => {
    try {
      return session.dirty; // throws before enter — treat as "not ours yet"
    } catch {
      return null;
    }
  };

  const writeArchive = (): void => {
    try {
      const archive: CrashArchive<T> = {
        schemaVersion: CRASH_ARCHIVE_SCHEMA_VERSION,
        entityId: entityIdOfKey(key),
        savedAt: Date.now(),
        draft: session.current,
      };
      sessionStorage.setItem(key, JSON.stringify(archive));
      archivedHere = true;
    } catch {
      // quota exceeded / storage disabled — crash protection is best-effort
    }
  };

  const cancelTimer = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const onNotify = (): void => {
    const dirty = isDirty();
    if (dirty === null) {
      return;
    }
    if (dirty) {
      if (debounceMs > 0) {
        cancelTimer();
        timer = setTimeout(() => {
          timer = null;
          writeArchive();
        }, debounceMs);
      } else {
        writeArchive();
      }
      return;
    }
    // Clean state (save / drained undo / rollback): a pending debounced
    // write is IN-FLIGHT and must never fire for a stale draft, and any
    // archive under this key — ours or a crashed visit's — is now older
    // than the baseline, i.e. noise. Cancel + clear unconditionally: a
    // clean draft has nothing to recover.
    cancelTimer();
    if (archivedHere || sessionStorage.getItem(key) !== null) {
      clearCrashArchive(key);
    }
    archivedHere = false;
  };

  const unsubscribe = session.subscribe(onNotify);

  return () => {
    unsubscribe();
    if (timer !== null) {
      cancelTimer();
      const dirty = isDirty();
      if (dirty === true) {
        writeArchive(); // flush the pending snapshot synchronously
      } else if (dirty === false && archivedHere) {
        clearCrashArchive(key);
        archivedHere = false;
      }
    }
  };
}
