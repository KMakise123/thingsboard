/**
 * §3.1 取消退出 contract tests: the entry checkpoint rolls the draft back
 * to the entry baseline (content), re-anchors so dirty reads honest, stays
 * inert after a later enter() (409 load-server adoption), and no-ops on a
 * clean draft.
 */
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EditorSession } from '@/core/editor/session';
import type { DashboardConfiguration } from '@/types/tb/dashboard';
import { useEditorEntryCheckpoint } from './use-editor-entry-checkpoint';

function baseline(): DashboardConfiguration {
  return {
    widgets: {},
    states: {
      default: {
        name: 'Root',
        root: true,
        layouts: {
          main: {
            widgets: {},
            gridSettings: { columns: 24, margin: 10 },
          },
        },
      },
    },
    entityAliases: {},
  } as unknown as DashboardConfiguration;
}

function makeSession() {
  return new EditorSession<DashboardConfiguration>({ baseline: baseline() });
}

describe('useEditorEntryCheckpoint — §3.1 cancel-exit rollback', () => {
  it('rolls back all post-entry writes as one group and reads clean again', () => {
    const session = makeSession();
    const { result } = renderHook(() =>
      useEditorEntryCheckpoint({ session, enabled: true }),
    );
    act(() => {
      session.write('add widget', (draft) => {
        draft.widgets.w1 = {
          typeFullFqn: 'system.cards.test',
          config: { title: 'a' },
        } as DashboardConfiguration['widgets'][string];
      });
      session.write('edit widget', (draft) => {
        draft.widgets.w1.config.title = 'b';
      });
    });
    expect(session.dirty).toBe(true);
    expect(session.history.length).toBe(2);

    act(() => result.current.rollbackToEntry());

    expect(session.dirty).toBe(false);
    // entry-baseline content restored
    expect(session.current.widgets).toEqual({});
    // history survives: the edits + the rollback group remain inspectable
    expect(session.history.length).toBe(3);
    expect(session.history[2].label).toBe('rollback: editor entry');
  });

  it('is a safe no-op on a clean draft (no rollback group committed)', () => {
    const session = makeSession();
    const { result } = renderHook(() =>
      useEditorEntryCheckpoint({ session, enabled: true }),
    );
    const before = session.current;
    act(() => result.current.rollbackToEntry());
    expect(session.dirty).toBe(false);
    expect(session.history.length).toBe(0);
    expect(session.current).toBe(before);
  });

  it('partial undo then rollback still lands on the entry content', () => {
    const session = makeSession();
    const { result } = renderHook(() =>
      useEditorEntryCheckpoint({ session, enabled: true }),
    );
    act(() => {
      session.write('one', (draft) => {
        draft.widgets.w1 = {
          typeFullFqn: 'w',
          config: { title: 'a' },
        } as DashboardConfiguration['widgets'][string];
      });
      session.write('two', (draft) => {
        draft.widgets.w2 = {
          typeFullFqn: 'w',
          config: { title: 'b' },
        } as DashboardConfiguration['widgets'][string];
      });
    });
    act(() => session.undo()); // w2 removed from the applied set
    expect(session.history.length).toBe(1);

    act(() => result.current.rollbackToEntry());
    expect(Object.keys(session.current.widgets)).toEqual([]);
    expect(session.dirty).toBe(false);
  });

  it('handle is inert after a later enter() — a rollback must not resurrect a pre-enter draft', () => {
    const session = makeSession();
    const { result } = renderHook(() =>
      useEditorEntryCheckpoint({ session, enabled: true }),
    );
    act(() => {
      session.write('edit', (draft) => {
        draft.entityAliases.a1 = {
          id: 'a1',
          alias: 'A',
          filter: { type: 'entityType', entityType: 'DEVICE' },
        };
      });
    });
    const adopted = baseline();
    act(() => {
      session.enter(adopted); // 409 load-server: user adopts a new baseline
    });
    act(() => {
      session.write('post-enter edit', (draft) => {
        draft.entityAliases.a2 = {
          id: 'a2',
          alias: 'B',
          filter: { type: 'entityType', entityType: 'DEVICE' },
        };
      });
    });
    expect(session.dirty).toBe(true);

    act(() => result.current.rollbackToEntry());

    // inert handle ⇒ no rollback group; the dirty state stays honest
    expect(session.history.length).toBe(1);
    expect(session.dirty).toBe(true);
    expect(Object.keys(session.current.entityAliases)).toEqual(['a2']);
  });

  it('does not take a checkpoint while disabled', () => {
    const session = makeSession();
    const { result } = renderHook(() =>
      useEditorEntryCheckpoint({ session, enabled: false }),
    );
    act(() => {
      session.write('edit', (draft) => {
        draft.entityAliases.a1 = {
          id: 'a1',
          alias: 'A',
          filter: { type: 'entityType', entityType: 'DEVICE' },
        };
      });
    });
    act(() => result.current.rollbackToEntry());
    expect(session.dirty).toBe(true);
    expect(session.history.length).toBe(1);
  });
});
