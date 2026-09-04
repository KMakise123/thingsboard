/**
 * useCrashGuard / CrashGuardDialog contracts (M10 brief §2): the recovery
 * prompt appears ONLY when a same-key archive exists AND drifted from the
 * current baseline; restore = one undoable group + the guard re-archives;
 * discard = clear the key; broken archives never surface a dialog.
 */
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it } from 'vitest';
import zhCommon from '@/locales/zh-CN/editor';
import zhCrashGuard from '@/locales/zh-CN/crash-guard';

import {
  type CrashArchive,
  crashGuardKey,
  readCrashArchive,
} from './crash-guard';
import { useCrashGuard } from './crash-guard-react';
import { EditorSession } from './session';

interface Doc {
  title: string;
  count: number;
}

const KEY = crashGuardKey('dashboard', 'd1');

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhCrashGuard },
});

function archiveOf(draft: Doc): CrashArchive<Doc> {
  return { schemaVersion: 1, entityId: 'd1', savedAt: 1234, draft };
}

function Harness({
  session,
  enabled,
  domain = 'dashboard',
  entityId = 'd1',
}: {
  session: EditorSession<Doc>;
  enabled: boolean;
  domain?: string;
  entityId?: string;
}) {
  const { crashGuardDialog } = useCrashGuard<Doc>({
    domain,
    entityId,
    session,
    enabled,
  });
  return (
    <RawIntlProvider value={intl}>
      <div data-testid="page">{crashGuardDialog}</div>
    </RawIntlProvider>
  );
}

function enteredSession(baseline: Doc): EditorSession<Doc> {
  const session = new EditorSession<Doc>();
  session.enter(baseline);
  return session;
}

beforeEach(() => {
  sessionStorage.clear();
});

describe('useCrashGuard', () => {
  it('no dialog, nothing touched when no archive exists', async () => {
    const session = enteredSession({ title: 'base', count: 0 });
    render(<Harness session={session} enabled />);
    await waitFor(() => {
      expect(screen.queryByTestId('crash-guard-dialog')).toBeNull();
    });
    expect(sessionStorage.getItem(KEY)).toBeNull();
    expect(session.dirty).toBe(false);
  });

  it('prompts when an archive exists and drifted', async () => {
    const session = enteredSession({ title: 'base', count: 0 });
    sessionStorage.setItem(
      KEY,
      JSON.stringify(archiveOf({ title: 'crashed', count: 9 })),
    );
    render(<Harness session={session} enabled />);
    await waitFor(() => {
      expect(screen.getByTestId('crash-guard-dialog')).toBeTruthy();
    });
    // the archive survives while the dialog is open (the user decides)
    expect(readCrashArchive<Doc>(KEY)?.draft.title).toBe('crashed');
  });

  it('no prompt when the archive equals the baseline', () => {
    const session = enteredSession({ title: 'base', count: 0 });
    sessionStorage.setItem(
      KEY,
      JSON.stringify(archiveOf({ title: 'base', count: 0 })),
    );
    render(<Harness session={session} enabled />);
    expect(screen.queryByTestId('crash-guard-dialog')).toBeNull();
  });

  it('no prompt and the key is silently cleared for a broken archive', () => {
    const session = enteredSession({ title: 'base', count: 0 });
    sessionStorage.setItem(KEY, '{broken');
    render(<Harness session={session} enabled />);
    expect(screen.queryByTestId('crash-guard-dialog')).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('restore writes the archive as ONE group, closes the dialog', async () => {
    const session = enteredSession({ title: 'base', count: 0 });
    sessionStorage.setItem(
      KEY,
      JSON.stringify(archiveOf({ title: 'crashed', count: 9 })),
    );
    render(<Harness session={session} enabled />);
    await waitFor(() => {
      expect(screen.getByTestId('crash-guard-dialog')).toBeTruthy();
    });
    act(() => {
      screen.getByTestId('crash-guard-restore').click();
    });
    expect(session.current).toEqual({ title: 'crashed', count: 9 });
    expect(session.dirty).toBe(true);
    expect(session.history.length).toBe(1);
    // dialog gone
    expect(screen.queryByTestId('crash-guard-dialog')).toBeNull();
    // the guard re-archived the restored draft (fresh savedAt)
    expect(readCrashArchive<Doc>(KEY)?.draft.title).toBe('crashed');
  });

  it('discard clears the key, leaves the session untouched', async () => {
    const session = enteredSession({ title: 'base', count: 0 });
    sessionStorage.setItem(
      KEY,
      JSON.stringify(archiveOf({ title: 'crashed', count: 9 })),
    );
    render(<Harness session={session} enabled />);
    await waitFor(() => {
      expect(screen.getByTestId('crash-guard-dialog')).toBeTruthy();
    });
    act(() => {
      screen.getByTestId('crash-guard-discard').click();
    });
    expect(sessionStorage.getItem(KEY)).toBeNull();
    expect(session.current).toEqual({ title: 'base', count: 0 });
    expect(session.dirty).toBe(false);
    expect(screen.queryByTestId('crash-guard-dialog')).toBeNull();
  });

  it('stays inert while disabled and engages once enabled', () => {
    const session = enteredSession({ title: 'base', count: 0 });
    sessionStorage.setItem(
      KEY,
      JSON.stringify(archiveOf({ title: 'crashed', count: 9 })),
    );
    const { rerender } = render(<Harness session={session} enabled={false} />);
    expect(screen.queryByTestId('crash-guard-dialog')).toBeNull();
    rerender(<Harness session={session} enabled />);
    expect(screen.getByTestId('crash-guard-dialog')).toBeTruthy();
  });

  it('archives subsequent writes once enabled', async () => {
    const session = enteredSession({ title: 'base', count: 0 });
    render(<Harness session={session} enabled />);
    await waitFor(() => {
      expect(screen.queryByTestId('crash-guard-dialog')).toBeNull();
    });
    act(() => {
      session.write('w1', (draft) => {
        draft.count = 5;
      });
    });
    expect(readCrashArchive<Doc>(KEY)?.draft.count).toBe(5);
  });
});

describe('useCrashGuard — renderHook surface', () => {
  it('exposes the dialog node through crashGuardDialog', () => {
    const session = enteredSession({ title: 'base', count: 0 });
    const { result } = renderHook(
      () =>
        useCrashGuard<Doc>({
          domain: 'dashboard',
          entityId: 'd1',
          session,
          enabled: true,
        }),
      {
        wrapper: ({ children }) => (
          <RawIntlProvider value={intl}>{children}</RawIntlProvider>
        ),
      },
    );
    expect(result.current.crashGuardDialog).toBeNull();
  });
});
