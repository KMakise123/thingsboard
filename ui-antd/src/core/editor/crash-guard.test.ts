/**
 * crash-guard core contracts (M10 brief §2, ADR 0004 崩溃保护; spec §7
 * 冲突约束「beforeunload / 路由 blocker 不误伤正常离开确认」):
 *   1. write → current DRAFT snapshot into sessionStorage (truncated stack:
 *      the undo stack is never serialized);
 *   2. dirty→clean transition (save / undo-to-bottom / rollback) clears the
 *      key — a clean exit leaves no archive, so the next enter must NOT
 *      prompt recovery;
 *   3. debounceMs coalesces the storage writes (widget editor code-text
 *      path), detach flushes the pending write synchronously;
 *   4. recovery parsing is strict: broken/wrong-schema archives are removed
 *      silently; restore lands as ONE undoable transaction group;
 *   5. 不误伤: the guard never registers a second leave interception
 *      (no beforeunload listener) — use-leave-guard stays the only one.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  attachCrashGuard,
  CRASH_ARCHIVE_SCHEMA_VERSION,
  CRASH_GUARD_KEY_PREFIX,
  type CrashArchive,
  clearCrashArchive,
  crashGuardKey,
  isRecoverable,
  readCrashArchive,
  restoreCrashArchive,
} from './crash-guard';
import { EditorSession } from './session';

interface Doc {
  title: string;
  count: number;
}

const KEY = crashGuardKey('dashboard', 'd1');

function enteredSession(baseline: Doc): EditorSession<Doc> {
  const session = new EditorSession<Doc>();
  session.enter(baseline);
  return session;
}

function rawStorage(): string | null {
  return sessionStorage.getItem(KEY);
}

function storedArchive(): CrashArchive<Doc> | null {
  return readCrashArchive<Doc>(KEY);
}

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('crashGuardKey', () => {
  it('names the key tb-editor-crash:<domain>:<entityId>', () => {
    expect(KEY).toBe('tb-editor-crash:dashboard:d1');
    expect(KEY.startsWith(CRASH_GUARD_KEY_PREFIX)).toBe(true);
  });

  it('falls back to "new" when the entity has no id yet', () => {
    expect(crashGuardKey('widget', undefined)).toBe(
      'tb-editor-crash:widget:new',
    );
    expect(crashGuardKey('widget', '')).toBe('tb-editor-crash:widget:new');
  });
});

describe('attachCrashGuard — archive writes', () => {
  it('serializes the current draft snapshot on write', () => {
    const session = enteredSession({ title: 'base', count: 0 });
    const detach = attachCrashGuard({ key: KEY, session });
    try {
      session.write('w1', (draft) => {
        draft.count = 1;
      });
      const archive = storedArchive();
      expect(archive).not.toBeNull();
      expect(archive?.schemaVersion).toBe(CRASH_ARCHIVE_SCHEMA_VERSION);
      expect(archive?.schemaVersion).toBe(1);
      expect(archive?.entityId).toBe('d1');
      expect(typeof archive?.savedAt).toBe('number');
      expect(archive?.draft).toEqual({ title: 'base', count: 1 });
    } finally {
      detach();
    }
  });

  it('stores only the draft, never the undo stack (截断栈)', () => {
    const session = enteredSession({ title: 'base', count: 0 });
    const detach = attachCrashGuard({ key: KEY, session });
    try {
      session.write('w1', (draft) => {
        draft.count = 1;
      });
      session.write('w2', (draft) => {
        draft.count = 2;
      });
      const raw = rawStorage();
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw as string) as Record<string, unknown>;
      expect(Object.keys(parsed).sort()).toEqual([
        'draft',
        'entityId',
        'savedAt',
        'schemaVersion',
      ]);
      expect((parsed.draft as Doc).count).toBe(2);
      expect(session.history.length).toBe(2);
    } finally {
      detach();
    }
  });

  it('overwrites the same key on each write (latest snapshot wins)', () => {
    const session = enteredSession({ title: 'base', count: 0 });
    const detach = attachCrashGuard({ key: KEY, session });
    try {
      session.write('w1', (draft) => {
        draft.count = 1;
      });
      const first = storedArchive();
      session.write('w2', (draft) => {
        draft.count = 2;
      });
      const second = storedArchive();
      expect(second?.draft.count).toBe(2);
      expect(sessionStorage.length).toBe(1);
      expect(second?.savedAt).toBeGreaterThanOrEqual(first?.savedAt ?? 0);
    } finally {
      detach();
    }
  });

  it('never writes while the session is clean (enter stays inert)', () => {
    const session = enteredSession({ title: 'base', count: 0 });
    const detach = attachCrashGuard({ key: KEY, session });
    try {
      expect(rawStorage()).toBeNull();
    } finally {
      detach();
    }
  });
});

describe('attachCrashGuard — clean transitions clear the key', () => {
  it('clears after save (dirty→clean): a clean exit leaves no archive', () => {
    const session = enteredSession({ title: 'base', count: 0 });
    const detach = attachCrashGuard({ key: KEY, session });
    try {
      session.write('w1', (draft) => {
        draft.count = 1;
      });
      expect(rawStorage()).not.toBeNull();
      session.save();
      expect(session.dirty).toBe(false);
      expect(rawStorage()).toBeNull();
    } finally {
      detach();
    }
  });

  it('clears after undo drains to the baseline', () => {
    const session = enteredSession({ title: 'base', count: 0 });
    const detach = attachCrashGuard({ key: KEY, session });
    try {
      session.write('w1', (draft) => {
        draft.count = 1;
      });
      expect(rawStorage()).not.toBeNull();
      session.undo();
      expect(session.dirty).toBe(false);
      expect(rawStorage()).toBeNull();
    } finally {
      detach();
    }
  });

  it('re-arms after clearing: edit → save → edit archives again', () => {
    const session = enteredSession({ title: 'base', count: 0 });
    const detach = attachCrashGuard({ key: KEY, session });
    try {
      session.write('w1', (draft) => {
        draft.count = 1;
      });
      session.save();
      expect(rawStorage()).toBeNull();
      session.write('w2', (draft) => {
        draft.count = 2;
      });
      expect(storedArchive()?.draft.count).toBe(2);
    } finally {
      detach();
    }
  });

  it('does NOT clear a pre-existing archive it never wrote', () => {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({
        schemaVersion: 1,
        entityId: 'd1',
        savedAt: 1,
        draft: { title: 'crashed', count: 9 },
      }),
    );
    const session = enteredSession({ title: 'base', count: 0 });
    const detach = attachCrashGuard({ key: KEY, session });
    try {
      // the recovery dialog must still be able to read it after attach
      expect(storedArchive()?.draft.title).toBe('crashed');
    } finally {
      detach();
    }
  });
});

describe('attachCrashGuard — debounce (widget code-text path)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('coalesces rapid writes into one storage write after debounceMs', () => {
    const session = enteredSession({ title: 'base', count: 0 });
    // happy-dom: spy the instance, not Storage.prototype
    const setItemSpy = vi.spyOn(sessionStorage, 'setItem');
    const detach = attachCrashGuard({ key: KEY, session, debounceMs: 300 });
    try {
      session.write('w1', (draft) => {
        draft.count = 1;
      });
      session.write('w2', (draft) => {
        draft.count = 2;
      });
      session.write('w3', (draft) => {
        draft.count = 3;
      });
      // nothing written while inside the debounce window
      expect(setItemSpy.mock.calls.filter(([key]) => key === KEY)).toHaveLength(
        0,
      );
      expect(rawStorage()).toBeNull();
      vi.advanceTimersByTime(300);
      const writes = setItemSpy.mock.calls.filter(([key]) => key === KEY);
      expect(writes).toHaveLength(1);
      expect(storedArchive()?.draft.count).toBe(3);
    } finally {
      setItemSpy.mockRestore();
      detach();
    }
  });

  it('a clean transition inside the window cancels the pending write', () => {
    const session = enteredSession({ title: 'base', count: 0 });
    const detach = attachCrashGuard({ key: KEY, session, debounceMs: 300 });
    try {
      session.write('w1', (draft) => {
        draft.count = 1;
      });
      session.save();
      vi.advanceTimersByTime(1000);
      expect(rawStorage()).toBeNull();
    } finally {
      detach();
    }
  });

  it('detach flushes the pending debounced write synchronously', () => {
    const session = enteredSession({ title: 'base', count: 0 });
    const detach = attachCrashGuard({ key: KEY, session, debounceMs: 300 });
    session.write('w1', (draft) => {
      draft.count = 1;
    });
    detach();
    // flushed although the debounce timer never fired
    expect(storedArchive()?.draft.count).toBe(1);
  });

  it('detach while clean does not resurrect the key', () => {
    const session = enteredSession({ title: 'base', count: 0 });
    const detach = attachCrashGuard({ key: KEY, session, debounceMs: 300 });
    detach();
    expect(rawStorage()).toBeNull();
  });
});

describe('attachCrashGuard — 不误伤 (no second leave interception)', () => {
  it('never registers beforeunload (leave-guard stays the only one)', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const session = enteredSession({ title: 'base', count: 0 });
    const detach = attachCrashGuard({ key: KEY, session });
    try {
      session.write('w1', (draft) => {
        draft.count = 1;
      });
      const registered = addSpy.mock.calls.map(([type]) => type);
      expect(registered).not.toContain('beforeunload');
      expect(registered).not.toContain('pagehide');
    } finally {
      addSpy.mockRestore();
      detach();
    }
  });
});

describe('readCrashArchive — strict parsing', () => {
  it('round-trips a stored archive', () => {
    const archive: CrashArchive<Doc> = {
      schemaVersion: 1,
      entityId: 'd1',
      savedAt: 42,
      draft: { title: 'x', count: 1 },
    };
    sessionStorage.setItem(KEY, JSON.stringify(archive));
    expect(readCrashArchive<Doc>(KEY)).toEqual(archive);
  });

  it('returns null for a missing key', () => {
    expect(readCrashArchive<Doc>(KEY)).toBeNull();
  });

  it('silently clears broken JSON', () => {
    sessionStorage.setItem(KEY, '{not json');
    expect(readCrashArchive<Doc>(KEY)).toBeNull();
    expect(rawStorage()).toBeNull();
  });

  it('silently clears a wrong schemaVersion', () => {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({
        schemaVersion: 99,
        entityId: 'd1',
        savedAt: 1,
        draft: { title: 'x', count: 1 },
      }),
    );
    expect(readCrashArchive<Doc>(KEY)).toBeNull();
    expect(rawStorage()).toBeNull();
  });

  it('silently clears a shape-invalid archive (no draft)', () => {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ schemaVersion: 1, entityId: 'd1', savedAt: 1 }),
    );
    expect(readCrashArchive<Doc>(KEY)).toBeNull();
    expect(rawStorage()).toBeNull();
  });

  it('clearCrashArchive removes the key', () => {
    sessionStorage.setItem(KEY, '{}');
    clearCrashArchive(KEY);
    expect(rawStorage()).toBeNull();
  });
});

describe('isRecoverable', () => {
  const baseline: Doc = { title: 'base', count: 0 };

  it('false when there is no archive', () => {
    expect(isRecoverable(null, baseline)).toBe(false);
  });

  it('false when the archive equals the baseline (no drift)', () => {
    const archive: CrashArchive<Doc> = {
      schemaVersion: 1,
      entityId: 'd1',
      savedAt: 1,
      draft: { title: 'base', count: 0 },
    };
    expect(isRecoverable(archive, baseline)).toBe(false);
  });

  it('true when the archive drifted from the baseline', () => {
    const archive: CrashArchive<Doc> = {
      schemaVersion: 1,
      entityId: 'd1',
      savedAt: 1,
      draft: { title: 'base', count: 7 },
    };
    expect(isRecoverable(archive, baseline)).toBe(true);
  });

  it('detects drift in nested structures', () => {
    const session = new EditorSession<Record<string, unknown>>();
    const serverBaseline = {
      states: { main: { widgets: {} } },
      widgets: { w1: { type: 'chart' } },
    };
    session.enter(serverBaseline);
    const archive: CrashArchive<Record<string, unknown>> = {
      schemaVersion: 1,
      entityId: 'd1',
      savedAt: 1,
      draft: {
        states: { main: { widgets: { w1: { x: 3 } } } },
        widgets: { w1: { type: 'chart' } },
      },
    };
    expect(isRecoverable(archive, session.current)).toBe(true);
  });
});

describe('restoreCrashArchive — one undoable transaction group', () => {
  it('writes the archived draft as ONE group; one undo reverts it', () => {
    const session = enteredSession({ title: 'base', count: 0 });
    const archive: CrashArchive<Doc> = {
      schemaVersion: 1,
      entityId: 'd1',
      savedAt: 1,
      draft: { title: 'crashed', count: 9 },
    };
    const groupsBefore = session.history.length;
    restoreCrashArchive(session, archive);
    expect(session.current).toEqual({ title: 'crashed', count: 9 });
    expect(session.dirty).toBe(true);
    expect(session.history.length).toBe(groupsBefore + 1);
    session.undo();
    expect(session.current).toEqual({ title: 'base', count: 0 });
    expect(session.dirty).toBe(false);
  });

  it('replaces removed top-level keys too (whole-draft semantics)', () => {
    const session = new EditorSession<Record<string, unknown>>();
    session.enter({ keep: 1, extra: 'x' });
    const archive: CrashArchive<Record<string, unknown>> = {
      schemaVersion: 1,
      entityId: 'd1',
      savedAt: 1,
      draft: { keep: 2, added: true },
    };
    restoreCrashArchive(session, archive);
    expect(session.current).toEqual({ keep: 2, added: true });
    expect(Object.keys(session.current).sort()).toEqual(['added', 'keep']);
  });

  it('is a no-op when the archive matches the current draft', () => {
    const session = enteredSession({ title: 'base', count: 0 });
    const archive: CrashArchive<Doc> = {
      schemaVersion: 1,
      entityId: 'd1',
      savedAt: 1,
      draft: { title: 'base', count: 0 },
    };
    restoreCrashArchive(session, archive);
    expect(session.history.length).toBe(0);
    expect(session.dirty).toBe(false);
  });
});
