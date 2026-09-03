import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  COALESCE_WINDOW_MS,
  DEFAULT_PATCH_BUDGET_BYTES,
  EditorSession,
  type EditorTransaction,
} from './session';

interface Doc {
  text: string;
  count: number;
  items: string[];
  blob?: string;
}

function makeDoc(): Doc {
  return { text: 'base', count: 0, items: [] };
}

function enteredSession(
  options?: ConstructorParameters<typeof EditorSession<Doc>>[0],
): { session: EditorSession<Doc>; baseline: Doc } {
  const session = new EditorSession<Doc>(options);
  const baseline = makeDoc();
  session.enter(baseline);
  return { session, baseline };
}

describe('EditorSession', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('enter / dirty', () => {
    it('starts clean with the entered baseline', () => {
      const { session, baseline } = enteredSession();
      expect(session.current).toBe(baseline);
      expect(session.dirty).toBe(false);
      expect(session.canUndo).toBe(false);
      expect(session.canRedo).toBe(false);
      expect(session.history).toEqual([]);
      expect(session.historyTruncated).toBe(false);
    });

    it('write applies the recipe immutably and flags dirty', () => {
      const { session, baseline } = enteredSession();
      session.write('set text', (draft) => {
        draft.text = 'changed';
      });
      expect(session.current).not.toBe(baseline);
      expect(baseline.text).toBe('base');
      expect(session.current.text).toBe('changed');
      expect(session.dirty).toBe(true);
    });

    it('write with no observable change appends no group', () => {
      const { session } = enteredSession();
      session.write('noop', () => {
        /* no mutation */
      });
      expect(session.canUndo).toBe(false);
      expect(session.dirty).toBe(false);
    });
  });

  describe('coalescing', () => {
    it('merges two same-key writes within the window into one group', () => {
      const { session, baseline } = enteredSession();
      session.write(
        'type a',
        (draft) => {
          draft.text = 'a';
        },
        { coalesceKey: 'title' },
      );
      vi.advanceTimersByTime(COALESCE_WINDOW_MS - 100);
      session.write(
        'type ab',
        (draft) => {
          draft.text = 'ab';
        },
        { coalesceKey: 'title' },
      );

      expect(session.history).toHaveLength(1);
      const group = session.history[0] as EditorTransaction;
      expect(group.label).toBe('type a');
      expect(group.coalesceKey).toBe('title');
      expect(group.patches).toHaveLength(2);

      // one undo step reverts both writes
      session.undo();
      expect(session.current).toEqual(baseline);
      expect(session.dirty).toBe(false);

      // and the merged group redoes as one
      session.redo();
      expect(session.current.text).toBe('ab');
    });

    it('splits into two groups once the window elapses', () => {
      const { session } = enteredSession();
      session.write(
        'type a',
        (draft) => {
          draft.text = 'a';
        },
        { coalesceKey: 'title' },
      );
      vi.advanceTimersByTime(COALESCE_WINDOW_MS + 1);
      session.write(
        'type ab',
        (draft) => {
          draft.text = 'ab';
        },
        { coalesceKey: 'title' },
      );
      expect(session.history).toHaveLength(2);
    });

    it('splits on a different coalesce key', () => {
      const { session } = enteredSession();
      session.write(
        'title',
        (draft) => {
          draft.text = 'a';
        },
        { coalesceKey: 'title' },
      );
      session.write(
        'count',
        (draft) => {
          draft.count = 1;
        },
        { coalesceKey: 'count' },
      );
      expect(session.history).toHaveLength(2);
    });

    it('starts a new group when no coalesce key is given', () => {
      const { session } = enteredSession();
      session.write(
        'keyed',
        (draft) => {
          draft.text = 'a';
        },
        { coalesceKey: 'title' },
      );
      session.write('plain', (draft) => {
        draft.count = 1;
      });
      expect(session.history).toHaveLength(2);
    });

    it('does not merge into an undone group (redo stack holds the future)', () => {
      const { session } = enteredSession();
      session.write(
        'first',
        (draft) => {
          draft.text = 'a';
        },
        { coalesceKey: 'k' },
      );
      session.undo();
      session.write(
        'second',
        (draft) => {
          draft.count = 5;
        },
        { coalesceKey: 'k' },
      );
      expect(session.history).toHaveLength(1);
      expect(session.history[0]?.label).toBe('second');
      expect(session.canRedo).toBe(false);
    });
  });

  describe('undo / redo', () => {
    it('round-trips two writes with inverse patch ordering', () => {
      const { session, baseline } = enteredSession();
      session.write('w1', (draft) => {
        draft.text = 'one';
        draft.items.push('i1');
      });
      const afterW1 = session.current;
      session.write('w2', (draft) => {
        draft.items.push('i2');
        draft.count = 2;
      });
      const afterW2 = session.current;

      session.undo();
      expect(session.current).toEqual(afterW1);
      expect(session.canRedo).toBe(true);

      session.undo();
      expect(session.current).toEqual(baseline);

      session.redo();
      expect(session.current).toEqual(afterW1);
      session.redo();
      expect(session.current).toEqual(afterW2);
      expect(session.canRedo).toBe(false);
    });

    it('resets the current reference to baseline when fully drained', () => {
      const { session, baseline } = enteredSession();
      session.write('w1', (draft) => {
        draft.text = 'one';
      });
      session.write('w2', (draft) => {
        draft.text = 'two';
      });
      session.undo();
      session.undo();
      // 引用复位锚定: drained stack ⇒ exact baseline reference, dirty false
      expect(session.current).toBe(baseline);
      expect(session.dirty).toBe(false);
    });

    it('clears the redo stack on a new write', () => {
      const { session } = enteredSession();
      session.write('w1', (draft) => {
        draft.text = 'one';
      });
      session.undo();
      expect(session.canRedo).toBe(true);
      session.write('w2', (draft) => {
        draft.text = 'two';
      });
      expect(session.canRedo).toBe(false);
    });

    it('undo/redo on empty stacks are safe no-ops', () => {
      const { session, baseline } = enteredSession();
      expect(() => session.undo()).not.toThrow();
      expect(() => session.redo()).not.toThrow();
      expect(session.current).toBe(baseline);
    });
  });

  describe('checkpoint', () => {
    it('rolls back post-checkpoint writes as one group', () => {
      const { session } = enteredSession();
      session.write('w1', (draft) => {
        draft.text = 'one';
        draft.items.push('i1');
      });
      const afterW1 = session.current;

      const cp = session.checkpoint('widget panel');
      session.write('w2', (draft) => {
        draft.items.push('i2');
      });
      session.write('w3', (draft) => {
        draft.count = 3;
      });

      cp.rollback();
      // rollback lands deep-equal on the checkpoint state (it is itself a
      // committed write, so a NEW reference — documented behavior)
      expect(session.current).toEqual(afterW1);
      expect(session.current).not.toBe(afterW1);

      // stack is sane: [w1, w2, w3, rollback] — the rollback rides on top as
      // one group; undoing it restores w2+w3, undoing further walks w1
      expect(session.history).toHaveLength(4);
      expect(session.history[3]?.label).toBe('rollback: widget panel');
      expect(session.canUndo).toBe(true);
      session.undo();
      expect(session.current.count).toBe(3);
      expect(session.current.items).toEqual(['i1', 'i2']);
    });

    it('rollback without post-checkpoint writes is a no-op', () => {
      const { session } = enteredSession();
      session.write('w1', (draft) => {
        draft.text = 'one';
      });
      const cp = session.checkpoint('panel');
      cp.rollback();
      expect(session.history).toHaveLength(1);
      expect(session.canRedo).toBe(false);
    });

    it('rollback ignores writes already undone past the checkpoint', () => {
      const { session } = enteredSession();
      session.write('w1', (draft) => {
        draft.text = 'one';
      });
      const afterW1 = session.current;
      const cp = session.checkpoint('panel');
      session.write('w2', (draft) => {
        draft.count = 2;
      });
      session.undo(); // w2 already reverted by the user
      cp.rollback(); // must not re-apply anything nor throw
      expect(session.current).toEqual(afterW1);
      expect(session.canRedo).toBe(true);
    });

    it('checkpoint from a previous enter() era is inert', () => {
      const { session } = enteredSession();
      const stale = session.checkpoint('stale');
      session.enter(makeDoc());
      session.write('fresh', (draft) => {
        draft.text = 'fresh';
      });
      expect(() => stale.rollback()).not.toThrow();
      expect(session.current.text).toBe('fresh');
      expect(session.canUndo).toBe(true);
    });
  });

  describe('save', () => {
    it('advances the baseline, keeps history, recomputes dirty', () => {
      const { session } = enteredSession();
      session.write('w1', (draft) => {
        draft.text = 'one';
      });
      session.write('w2', (draft) => {
        draft.count = 1;
      });
      const afterW2 = session.current;

      const saved = session.save();
      expect(saved).toBe(afterW2);
      expect(session.dirty).toBe(false);
      expect(session.canUndo).toBe(true);
      expect(session.current).toBe(saved);

      // history survives: undo steps back through pre-save groups vs the
      // NEW baseline
      session.undo();
      expect(session.dirty).toBe(true);
      expect(session.current.count).toBe(0);

      // undo to bottom ⇒ reference reset to the new baseline
      session.undo();
      expect(session.current).toBe(saved);
      expect(session.dirty).toBe(false);
    });

    it('runs the configured serializer and anchors both ends to it', () => {
      const { session } = enteredSession({
        serialize: (draft: Doc): Doc => ({ ...draft, text: draft.text.trim() }),
      });
      session.write('w1', (draft) => {
        draft.text = '  padded  ';
      });
      const saved = session.save();
      expect(saved.text).toBe('padded');
      expect(session.current).toBe(saved);
      expect(session.dirty).toBe(false);
    });

    it('save(serverEntity) re-anchors to the server entity (version backfill)', () => {
      const { session } = enteredSession();
      session.write('w1', (draft) => {
        draft.text = 'one';
      });
      session.write('w2', (draft) => {
        draft.count = 1;
      });
      const serverEntity = { text: 'server', count: 7, items: [] };
      const saved = session.save(serverEntity);
      expect(saved).toBe(serverEntity);
      expect(session.current).toBe(serverEntity);
      expect(session.dirty).toBe(false);

      // pre-save history still walks back from the server anchor
      session.undo();
      expect(session.current.count).toBe(0);
      expect(session.dirty).toBe(true);

      // draining the stack resets to the new baseline reference
      session.undo();
      expect(session.current).toBe(serverEntity);
      expect(session.dirty).toBe(false);
    });
  });

  describe('patch budget', () => {
    it('evicts the oldest groups past the budget and flags truncation', () => {
      const { session, baseline } = enteredSession();
      const chunk = 1_200_000;
      const blobs = ['a', 'b', 'c', 'd'];
      for (const [i, ch] of blobs.entries()) {
        session.write(`blob ${i}`, (draft) => {
          draft.blob = ch.repeat(chunk);
        });
      }

      // 4 × 1.2MB > 4MB ⇒ oldest group dropped
      expect(session.historyTruncated).toBe(true);
      expect(session.history).toHaveLength(3);
      expect(session.history[0]?.label).toBe('blob 1');

      // first undo lands after blob 2 — blob 1's group is gone
      session.undo();
      expect(session.current.blob?.[0]).toBe('c');

      // truncation disables the baseline reference reset: draining the stack
      // cannot claim clean
      session.undo();
      session.undo();
      expect(session.canUndo).toBe(false);
      expect(session.current).not.toBe(baseline);
      expect(session.dirty).toBe(true);
    });

    it('keeps at least the newest group when it alone exceeds the budget', () => {
      const { session } = enteredSession({ patchBudgetBytes: 10 });
      session.write('big', (draft) => {
        draft.blob = 'x'.repeat(500);
      });
      expect(session.history).toHaveLength(1);
      expect(session.canUndo).toBe(true);
    });

    it('exposes the default budget of 4MB', () => {
      expect(DEFAULT_PATCH_BUDGET_BYTES).toBe(4 * 1024 * 1024);
    });
  });

  describe('not-in-stack guarantees', () => {
    it('exposes no raw state setter on the public surface', () => {
      // allowlists stay exact on purpose: any FUTURE member must be added
      // here consciously. `subscribe`/`getSnapshot` are arrow-field instance
      // properties; the private slots are implementation details.
      const instance = new EditorSession<Doc>();
      instance.enter(makeDoc());
      const publicMethods = [
        'canRedo',
        'canUndo',
        'checkpoint',
        'constructor',
        'current',
        'dirty',
        'enter',
        'history',
        'historyTruncated',
        'redo',
        'save',
        'undo',
        'write',
      ];
      const privateSlots = [
        'assertEntered',
        'evictOverBudget',
        'notify',
        'rollback',
      ];
      expect(
        Object.getOwnPropertyNames(EditorSession.prototype).sort(),
      ).toEqual([...publicMethods, ...privateSlots].sort());
      // instance own keys are private class fields + the two observer fns;
      // anything else appearing here is a new public member and must join
      // the allowlists above
      const privateFields = [
        'baseline',
        'budget',
        'draft',
        'epoch',
        'lastGroupId',
        'listeners',
        'redoStack',
        'serializeFn',
        'snapshotCache',
        'totalBytes',
        'truncated',
        'undoStack',
      ];
      expect(
        Object.keys(instance)
          .filter((key) => !privateFields.includes(key))
          .sort(),
      ).toEqual(['getSnapshot', 'subscribe']);
    });

    it('notifies subscribers on write, undo, redo and save', () => {
      const { session } = enteredSession();
      const listener = vi.fn();
      const unsubscribe = session.subscribe(listener);
      session.write('w1', (draft) => {
        draft.text = 'one';
      });
      session.undo();
      session.redo();
      session.save();
      expect(listener).toHaveBeenCalledTimes(4);
      unsubscribe();
      session.write('w2', (draft) => {
        draft.count = 1;
      });
      expect(listener).toHaveBeenCalledTimes(4);
    });

    it('returns a stable snapshot between changes (useSyncExternalStore safe)', () => {
      const { session } = enteredSession();
      const snap1 = session.getSnapshot();
      const snap2 = session.getSnapshot();
      expect(snap1).toBe(snap2);
      session.write('w1', (draft) => {
        draft.text = 'one';
      });
      expect(session.getSnapshot()).not.toBe(snap1);
      expect(session.getSnapshot().dirty).toBe(true);
    });
  });
});
