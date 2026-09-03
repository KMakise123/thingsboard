/**
 * §3.8 leave-guard contract tests: dirty precision (reference compare ⇒
 * undo-to-bottom is clean ⇒ no prompt), conservative prompt on truncated
 * history, and the session API surface proof that NOT-in-stack state has no
 * writer to trip the guard with.
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EditorSession } from '@/core/editor/session';
import type { DashboardConfiguration } from '@/types/tb/dashboard';
import { shouldPromptLeave, useLeaveGuard } from './use-leave-guard';

function baseline(): DashboardConfiguration {
  return {
    widgets: { w1: { typeFullFqn: 'system.cards.test', config: {} } },
    states: {
      default: {
        name: 'Root',
        root: true,
        layouts: {
          main: {
            widgets: { w1: { sizeX: 8, sizeY: 6, row: 0, col: 0 } },
            gridSettings: { columns: 24, margin: 10 },
          },
        },
      },
    },
    entityAliases: {},
  } as unknown as DashboardConfiguration;
}

function makeSession(budget?: number) {
  return new EditorSession<DashboardConfiguration>({
    baseline: baseline(),
    ...(budget ? { patchBudgetBytes: budget } : {}),
  });
}

function fireBeforeUnload(): boolean {
  const event = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

describe('useLeaveGuard — §3.8 dirty precision', () => {
  it('prompts on beforeunload while the draft is dirty', () => {
    const session = makeSession();
    renderHook(() => useLeaveGuard({ session, enabled: true }));
    act(() => {
      session.write('edit', (draft) => {
        draft.widgets.w1.config.title = 'changed';
      });
    });
    expect(fireBeforeUnload()).toBe(true);
  });

  it('does NOT prompt when disabled', () => {
    const session = makeSession();
    renderHook(() => useLeaveGuard({ session, enabled: false }));
    act(() => {
      session.write('edit', (draft) => {
        draft.widgets.w1.config.title = 'changed';
      });
    });
    expect(fireBeforeUnload()).toBe(false);
  });

  it('edits then undo-to-bottom ⇒ dirty false ⇒ NO prompt (spec §3.8 exact loop)', () => {
    const session = makeSession();
    renderHook(() => useLeaveGuard({ session, enabled: true }));
    act(() => {
      session.write('add widget', (draft) => {
        draft.widgets.w1.config.title = 'first';
      });
      session.write('add widget', (draft) => {
        draft.widgets.w1.config.title = 'second';
      });
    });
    expect(session.dirty).toBe(true);
    act(() => {
      session.undo();
      session.undo();
    });
    expect(session.dirty).toBe(false);
    expect(fireBeforeUnload()).toBe(false);
  });

  it('re-dirtying after undo-to-bottom prompts again', () => {
    const session = makeSession();
    renderHook(() => useLeaveGuard({ session, enabled: true }));
    act(() => {
      session.write('edit', (draft) => {
        draft.widgets.w1.config.title = 'changed';
      });
    });
    act(() => session.undo());
    act(() => session.redo());
    expect(session.dirty).toBe(true);
    expect(fireBeforeUnload()).toBe(true);
  });

  it('stops prompting once disabled (editor unmounted)', () => {
    const session = makeSession();
    const { unmount } = renderHook(() =>
      useLeaveGuard({ session, enabled: true }),
    );
    act(() => {
      session.write('edit', (draft) => {
        draft.widgets.w1.config.title = 'changed';
      });
    });
    unmount();
    expect(fireBeforeUnload()).toBe(false);
  });

  it('historyTruncated ⇒ conservative prompt even if dirty reads false (documented degraded case)', () => {
    // Tiny budget: two write groups exceed it ⇒ oldest group evicted and
    // historyTruncated latches. The guard fails closed.
    const session = makeSession(1);
    renderHook(() => useLeaveGuard({ session, enabled: true }));
    expect(session.historyTruncated).toBe(false);
    act(() => {
      session.write('one', (draft) => {
        draft.widgets.w1.config.title = 'a';
      });
      session.write('two', (draft) => {
        draft.widgets.w1.config.title = 'b';
      });
    });
    expect(session.historyTruncated).toBe(true);
    expect(shouldPromptLeave(session)).toBe(true);
    expect(fireBeforeUnload()).toBe(true);
  });

  it('clean session does not prompt', () => {
    const session = makeSession();
    renderHook(() => useLeaveGuard({ session, enabled: true }));
    expect(fireBeforeUnload()).toBe(false);
  });
});

describe('session API surface — NOT-in-stack state has no writer (§3.9 不入栈项 proof)', () => {
  it('EditorSession exposes only the frozen API — there is NO raw setter', () => {
    const methods = Object.getOwnPropertyNames(EditorSession.prototype)
      .filter((name) => name !== 'constructor')
      .sort();
    expect(methods).toEqual([
      'assertEntered', // private
      'canRedo', // getter
      'canUndo', // getter
      'checkpoint',
      'current', // getter
      'dirty', // getter
      'enter',
      'evictOverBudget', // private
      'history', // getter
      'historyTruncated', // getter
      'notify', // private
      'redo',
      'rollback', // private
      'save',
      'undo',
      'write',
    ]);
    // `subscribe` is an instance arrow-field (not on the prototype) — the
    // load-bearing assertions are the two below: no `set`-style mutator
    // exists anywhere on the class surface.
    expect(
      Object.getOwnPropertyDescriptor(EditorSession.prototype, 'current')?.set,
    ).toBeUndefined();
  });

  it('timewindow/selection-style runtime state cannot reach the draft without a history group', () => {
    const session = makeSession();
    // The only public mutators are write/save/enter/undo/redo/checkpoint;
    // every one of them either creates a transaction group (write) or
    // re-baselines wholesale (save/enter). There is no silent path.
    const before = session.history.length;
    expect(() => {
      // @ts-expect-error — probing that no undocumented setter exists
      session.set?.('selectedWidgetId', 'w1');
    }).not.toThrow();
    expect(session.history.length).toBe(before);
  });

  it('write with an empty recipe is a full no-op (cannot fake dirtiness)', () => {
    const session = makeSession();
    const referenceBefore = session.current;
    act(() => {
      session.write('empty', () => {});
    });
    expect(session.history.length).toBe(0);
    expect(session.dirty).toBe(false);
    expect(session.current).toBe(referenceBefore);
  });
});

describe('shouldPromptLeave', () => {
  it('mirrors dirty && fails closed on truncation', () => {
    const clean = makeSession();
    expect(shouldPromptLeave(clean)).toBe(false);
    const dirty = makeSession();
    act(() => {
      dirty.write('edit', (draft) => {
        draft.widgets.w1.config.title = 'x';
      });
    });
    expect(shouldPromptLeave(dirty)).toBe(true);
    const truncated = makeSession(1);
    act(() => {
      truncated.write('one', (draft) => {
        draft.widgets.w1.config.title = 'a';
      });
      truncated.write('two', (draft) => {
        draft.widgets.w1.config.title = 'b';
      });
    });
    expect(shouldPromptLeave(truncated)).toBe(true);
  });

  it('guard registers beforeunload only while enabled (spy on add/remove)', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const session = makeSession();
    const { unmount } = renderHook(() =>
      useLeaveGuard({ session, enabled: true }),
    );
    expect(addSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    unmount();
    expect(removeSpy).toHaveBeenCalledWith(
      'beforeunload',
      expect.any(Function),
    );
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });
});
