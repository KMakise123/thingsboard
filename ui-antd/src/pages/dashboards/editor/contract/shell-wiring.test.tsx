/**
 * D-wave shell wiring contract tests (spec §3.1 exit two-path + §3.8
 * leave confirm / 409 three options / import / export). The shell is
 * rendered for real; only the transport (@/services/tb/dashboard) and the
 * router (@umijs/max history) are mocked at the module boundary.
 *
 * Matrix:
 *  - leave confirm: dirty ⇒ confirm → rollback+exit; clean / undo-to-bottom
 *    ⇒ straight exit, no confirm (§3.8 精确判定).
 *  - 409: save → dialog with server snapshot; A adopts server baseline;
 *    B overwrite success (fresh-version POST), pending 保存退出 then lands
 *    on the view; B exhaustion keeps the dialog open (ADR cap 3); C exports
 *    the local draft and adopts the server (or exits when server unknown).
 *  - import: one undoable `import-dashboard` group replaces the draft
 *    content and merges 补录 stubs; queries are NOT invalidated (draft-only).
 *  - export: downloads the CURRENT DRAFT as `{title}.json` without any
 *    server fetch.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { validateAndUpdateDashboard } from '@/core/dashboard/model';
import { EditorSession } from '@/core/editor/session';
import zhEditorCommon from '@/locales/zh-CN/editor';
import zhEditorDashboard from '@/locales/zh-CN/editor-dashboard';
import zhContract from '@/locales/zh-CN/editor-dashboard-contract';
import type { Dashboard, DashboardConfiguration } from '@/types/tb/dashboard';

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('@umijs/max', () => ({ history: historyMock }));

const dashboardServiceMock = vi.hoisted(() => ({
  saveDashboard: vi.fn(),
  getDashboard: vi.fn(),
  exportDashboard: vi.fn(),
  getTenantDashboards: vi.fn(),
}));
vi.mock('@/services/tb/dashboard', () => dashboardServiceMock);
vi.mock('@/services/tb/widget-type', () => ({
  getWidgetTypeByFullFqn: vi.fn(),
}));

import { EditorShell } from '../shell';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhEditorCommon, ...zhEditorDashboard, ...zhContract },
});

/** ServerErrorError-shaped VERSION_CONFLICT 409 (errorCode 35). */
function versionConflict(): Error & { errorCode: number } {
  return Object.assign(new Error('version conflict'), { errorCode: 35 });
}

function dashboardJson(): Dashboard {
  return {
    id: { entityType: 'DASHBOARD', id: 'd1' },
    title: 'Demo',
    version: 3,
    configuration: {
      widgets: {
        w1: { typeFullFqn: 'system.cards.html_value_card', config: {} },
      },
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
    },
  } as unknown as Dashboard;
}

function serverDashboardFixture(): Dashboard {
  return {
    id: { entityType: 'DASHBOARD', id: 'd1' },
    title: 'Server title',
    version: 9,
    configuration: {
      widgets: {
        sw: { typeFullFqn: 'system.cards.html_value_card', config: {} },
      },
      states: dashboardJson().configuration?.states,
      entityAliases: {},
    },
  } as unknown as Dashboard;
}

function importedDashboardPayload() {
  return {
    title: 'Imported dashboard',
    configuration: {
      widgets: [
        {
          typeFullFqn: 'system.cards.test',
          config: {
            datasources: [
              { type: 'entity', entityAliasId: 'alias-1', dataKeys: [] },
            ],
          },
        },
      ],
      entityAliases: {},
      states: [
        { default: true, name: 'Root', layouts: { main: { widgets: [] } } },
      ],
    },
  };
}

function normalize(json: Dashboard): DashboardConfiguration {
  return validateAndUpdateDashboard(json)
    .configuration as DashboardConfiguration;
}

function setup() {
  const dashboard = dashboardJson();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const session = new EditorSession<DashboardConfiguration>({
    baseline: normalize(dashboard),
  });
  render(
    <RawIntlProvider value={intl}>
      <AntdApp>
        <QueryClientProvider client={queryClient}>
          <EditorShell session={session} dashboard={dashboard} />
        </QueryClientProvider>
      </AntdApp>
    </RawIntlProvider>,
  );
  return { session, queryClient };
}

function makeDirty(session: EditorSession<DashboardConfiguration>): void {
  act(() => {
    session.write('edit', (draft) => {
      draft.widgets.w1.config.title = 'local draft';
    });
  });
}

function jsonFile(name: string, payload: unknown): File {
  return new File([JSON.stringify(payload)], name, {
    type: 'application/json',
  });
}

/** Payload of the most recent saveDashboard POST in this test. */
function lastSavePost(): Dashboard {
  const calls = dashboardServiceMock.saveDashboard.mock.calls;
  return calls[calls.length - 1][0] as Dashboard;
}

/**
 * Spies the download seam without breaking React/antd DOM creation: every
 * non-anchor element keeps using the real createElement.
 */
function spyDownload() {
  const realCreate = document.createElement.bind(document);
  let anchor: HTMLAnchorElement | null = null;
  let clicks = 0;
  const createSpy = vi.spyOn(document, 'createElement').mockImplementation(((
    tag: string,
    options?: ElementCreationOptions,
  ) => {
    if (tag === 'a') {
      anchor = realCreate('a');
      return anchor;
    }
    return realCreate(tag, options);
  }) as typeof document.createElement);
  const clickSpy = vi
    .spyOn(HTMLAnchorElement.prototype, 'click')
    .mockImplementation(() => {
      clicks += 1;
    });
  return {
    anchor: () => anchor,
    clickCount: () => clicks,
    cleanup: () => {
      createSpy.mockRestore();
      clickSpy.mockRestore();
    },
  };
}

beforeEach(() => {
  dashboardServiceMock.saveDashboard.mockReset();
  dashboardServiceMock.saveDashboard.mockResolvedValue(dashboardJson());
  dashboardServiceMock.getDashboard.mockReset();
  historyMock.push.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('shell — §3.8 leave confirm on 取消退出', () => {
  it('a clean draft exits with NO confirm', async () => {
    setup();
    fireEvent.click(screen.getByTestId('editor-toolbar-exit-cancel'));
    await waitFor(() => {
      expect(historyMock.push).toHaveBeenCalledWith('/dashboards/d1');
    });
    expect(screen.queryByText('未保存的修改')).not.toBeInTheDocument();
  });

  it('a dirty draft confirms first; cancelling keeps editing (no navigation)', async () => {
    const { session } = setup();
    makeDirty(session);
    fireEvent.click(screen.getByTestId('editor-toolbar-exit-cancel'));

    const cancelButton = await screen.findByRole('button', {
      name: /取\s*消/,
    });
    fireEvent.click(cancelButton);
    expect(historyMock.push).not.toHaveBeenCalled();
    expect(session.dirty).toBe(true);
  });

  it('a dirty draft exits through 放弃修改 with the entry-baseline rollback', async () => {
    const { session } = setup();
    makeDirty(session);
    fireEvent.click(screen.getByTestId('editor-toolbar-exit-cancel'));
    const okButton = await screen.findByRole('button', { name: '放弃修改' });
    fireEvent.click(okButton);
    await waitFor(() => {
      expect(historyMock.push).toHaveBeenCalledWith('/dashboards/d1');
    });
    expect(session.dirty).toBe(false);
    expect(session.current.widgets.w1.config.title).toBeUndefined();
  });

  it('undo-to-bottom ⇒ reference-clean ⇒ exits WITHOUT the confirm (§3.8 精确判定)', async () => {
    const { session } = setup();
    makeDirty(session);
    act(() => session.undo());
    expect(session.dirty).toBe(false);
    fireEvent.click(screen.getByTestId('editor-toolbar-exit-cancel'));
    await waitFor(() => {
      expect(historyMock.push).toHaveBeenCalledWith('/dashboards/d1');
    });
    expect(screen.queryByText('未保存的修改')).not.toBeInTheDocument();
  });
});

describe('shell — §3.8 409 three-option flow', () => {
  async function openConflictDialog() {
    const { session } = setup();
    makeDirty(session);
    dashboardServiceMock.saveDashboard.mockRejectedValue(versionConflict());
    dashboardServiceMock.getDashboard.mockResolvedValue(
      serverDashboardFixture(),
    );
    fireEvent.click(screen.getByTestId('editor-toolbar-save'));
    await screen.findByTestId('editor-conflict-dialog');
    return { session };
  }

  it('save → 409 → dialog shows the server snapshot and stays honest about the dirty local draft', async () => {
    await openConflictDialog();
    expect(screen.getByTestId('editor-conflict-server')).toHaveTextContent(
      'Server title',
    );
    expect(screen.getByTestId('editor-conflict-server')).toHaveTextContent(
      'v9',
    );
    expect(screen.getByTestId('editor-conflict-local')).toHaveTextContent(
      '包含未保存的修改',
    );
    expect(historyMock.push).not.toHaveBeenCalled();
  });

  it('Option A 加载服务器版: adopts the normalized server baseline (clean, empty history); the next save carries version 9', async () => {
    const { session } = await openConflictDialog();
    fireEvent.click(screen.getByTestId('editor-conflict-load-server'));

    // NOTE: happy-dom never fires transitionend, so a closing antd Modal's
    // DOM lingers — dialog closure is asserted through the handler effects
    // (session adoption / meta version / navigation), not DOM removal.
    await waitFor(() => {
      expect(session.dirty).toBe(false);
    });
    expect(session.canUndo).toBe(false);
    expect(Object.keys(session.current.widgets)).toEqual(['sw']);
    expect(historyMock.push).not.toHaveBeenCalled(); // option A keeps editing

    // the adopted meta version flows into the next save POST
    dashboardServiceMock.saveDashboard.mockResolvedValue(
      serverDashboardFixture(),
    );
    fireEvent.click(screen.getByTestId('editor-toolbar-save'));
    await waitFor(() => {
      expect(dashboardServiceMock.saveDashboard).toHaveBeenCalled();
    });
    const posted = lastSavePost();
    expect(posted.version).toBe(9);
  });

  it('Option B 用我的版本覆盖: POSTs the draft against a fresh GET version; success re-anchors the session clean', async () => {
    const { session } = await openConflictDialog();
    dashboardServiceMock.getDashboard.mockResolvedValue(
      serverDashboardFixture(),
    );
    dashboardServiceMock.saveDashboard.mockResolvedValue({
      ...serverDashboardFixture(),
      version: 10,
    });

    fireEvent.click(screen.getByTestId('editor-conflict-overwrite'));

    await waitFor(() => {
      expect(session.dirty).toBe(false);
    });
    const posted = lastSavePost();
    expect(posted.version).toBe(9); // fresh GET version, not the stale 3
    expect(posted.configuration?.widgets.w1.config.title).toBe('local draft');
    expect(historyMock.push).not.toHaveBeenCalled(); // toolbar save: stay
  });

  it('Option B from 保存退出: success resolves the pending exit and navigates to the view', async () => {
    const { session } = setup();
    makeDirty(session);
    dashboardServiceMock.saveDashboard.mockRejectedValueOnce(versionConflict());
    dashboardServiceMock.getDashboard.mockResolvedValue(
      serverDashboardFixture(),
    );
    dashboardServiceMock.saveDashboard.mockResolvedValue({
      ...serverDashboardFixture(),
      version: 10,
    });

    fireEvent.click(screen.getByTestId('editor-toolbar-exit-save'));
    await screen.findByTestId('editor-conflict-dialog');
    fireEvent.click(screen.getByTestId('editor-conflict-overwrite'));

    await waitFor(() => {
      expect(historyMock.push).toHaveBeenCalledWith('/dashboards/d1');
    });
    expect(session.dirty).toBe(false);
  });

  it('Option B exhaustion: retry cap reached, dialog STAYS open with a warning and the draft is never blessed', async () => {
    const { session } = await openConflictDialog();
    dashboardServiceMock.getDashboard.mockResolvedValue(
      serverDashboardFixture(),
    );
    dashboardServiceMock.saveDashboard.mockRejectedValue(versionConflict());

    fireEvent.click(screen.getByTestId('editor-conflict-overwrite'));

    await screen.findByText(/已重试 3 次/);
    expect(screen.getByTestId('editor-conflict-dialog')).toBeInTheDocument();
    expect(session.dirty).toBe(true);
    // 1 conflict save + 3 overwrite attempts
    expect(dashboardServiceMock.saveDashboard).toHaveBeenCalledTimes(4);
  });

  it('Option C 导出本地 JSON 后放弃 (server known): downloads the draft, then adopts the server baseline', async () => {
    const { session } = await openConflictDialog();
    const download = spyDownload();
    try {
      fireEvent.click(screen.getByTestId('editor-conflict-export-local'));

      await waitFor(() => {
        expect(session.dirty).toBe(false);
      });
      expect(download.anchor()?.download).toBe('Demo.json');
      expect(download.clickCount()).toBe(1);
      expect(Object.keys(session.current.widgets)).toEqual(['sw']);
    } finally {
      download.cleanup();
    }
  });

  it('Option C (server unknown): downloads the draft and gives up back to the view', async () => {
    const { session } = setup();
    makeDirty(session);
    dashboardServiceMock.saveDashboard.mockRejectedValue(versionConflict());
    dashboardServiceMock.getDashboard.mockRejectedValue(
      new Error('network down'),
    );
    fireEvent.click(screen.getByTestId('editor-toolbar-save'));
    await screen.findByTestId('editor-conflict-dialog');

    const download = spyDownload();
    try {
      fireEvent.click(screen.getByTestId('editor-conflict-export-local'));
      await waitFor(() => {
        expect(historyMock.push).toHaveBeenCalledWith('/dashboards/d1');
      });
      expect(download.anchor()?.download).toBe('Demo.json');
    } finally {
      download.cleanup();
    }
  });

  it('closing the dialog (X) resolves nothing — the draft stays dirty and a retry re-runs the conflict flow', async () => {
    const { session } = await openConflictDialog();
    fireEvent.click(document.querySelector('.ant-modal-close') as HTMLElement);
    // closure + dismissal: dirty untouched, user stayed in the editor
    expect(session.dirty).toBe(true);
    expect(historyMock.push).not.toHaveBeenCalled();

    // a fresh save re-enters the 409 flow (save + conflict GET again)
    const savesBefore = dashboardServiceMock.saveDashboard.mock.calls.length;
    fireEvent.click(screen.getByTestId('editor-toolbar-save'));
    await waitFor(() => {
      expect(dashboardServiceMock.saveDashboard).toHaveBeenCalledTimes(
        savesBefore + 1,
      );
      expect(dashboardServiceMock.getDashboard).toHaveBeenCalledTimes(2);
    });
    expect(session.dirty).toBe(true);
  });
});

describe('shell — §3.8 import into the open editor (draft-only, one undoable group)', () => {
  async function pickImportFile(payload: unknown) {
    fireEvent.click(screen.getByTestId('editor-toolbar-import'));
    const input = (await waitFor(() => {
      const el = document.querySelector(
        'input[data-testid="editor-import-dragger"]',
      );
      expect(el).toBeTruthy();
      return el as HTMLInputElement;
    })) as HTMLInputElement;
    fireEvent.change(input, {
      target: { files: [jsonFile('a.json', payload)] },
    });
  }

  it('apply replaces the draft content as ONE `import-dashboard` group with the 补录 stub merged; queries untouched', async () => {
    const { session, queryClient } = setup();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    await pickImportFile(importedDashboardPayload());

    await screen.findByTestId('editor-import-missing-aliases');
    fireEvent.click(screen.getByTestId('editor-import-apply'));

    await waitFor(() => {
      expect(session.history).toHaveLength(1);
    });
    expect(session.history[0].label).toBe('import-dashboard');
    expect(Object.keys(session.current.widgets)).toHaveLength(1);
    expect(session.current.entityAliases['alias-1']?.alias).toBe('alias-1');
    expect(session.dirty).toBe(true);
    expect(invalidateSpy).not.toHaveBeenCalled();

    // one group ⇒ one undo restores the pre-import draft
    act(() => session.undo());
    expect(session.dirty).toBe(false);
    expect(Object.keys(session.current.widgets)).toEqual(['w1']);
  });

  it('a broken file surfaces the parse error and never touches the session', async () => {
    const { session } = setup();
    await pickImportFile({ nope: true });
    await screen.findByTestId('editor-import-pick-hint');
    await waitFor(() => {
      expect(document.body.textContent).toContain('导入失败');
    });
    expect(session.history).toHaveLength(0);
    expect(session.dirty).toBe(false);
  });
});

describe('shell — §3.8 toolbar export exports the CURRENT DRAFT', () => {
  it('downloads `{title}.json` with the draft content and ZERO server fetches', async () => {
    const { session } = setup();
    makeDirty(session);
    const download = spyDownload();
    try {
      fireEvent.click(screen.getByTestId('editor-toolbar-export'));

      await waitFor(() => {
        expect(download.clickCount()).toBe(1);
      });
      expect(download.anchor()?.download).toBe('Demo.json');
      expect(dashboardServiceMock.saveDashboard).not.toHaveBeenCalled();
      expect(dashboardServiceMock.exportDashboard).not.toHaveBeenCalled();
      // the session draft is untouched by exporting
      expect(session.dirty).toBe(true);
      expect(screen.getByText('已导出当前草稿 JSON')).toBeInTheDocument();
    } finally {
      download.cleanup();
    }
  });
});
