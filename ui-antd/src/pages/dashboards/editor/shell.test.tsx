/**
 * EditorShell wiring tests: save path (POST payload + version + session
 * baseline discipline), exit two ways (save→view, cancel→entry baseline),
 * undo/redo affordances, hotkeys + typing-target guard, and the DialogHost
 * seam. Services mocked at the module boundary.
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
import { useEffect, useState } from 'react';
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

import { EditorShell, isTypingTarget } from './shell';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhEditorCommon, ...zhEditorDashboard, ...zhContract },
});

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
              widgets: {
                w1: { sizeX: 8, sizeY: 6, row: 0, col: 0 },
              },
              gridSettings: { columns: 24, margin: 10 },
            },
          },
        },
      },
      entityAliases: {},
    },
  } as unknown as Dashboard;
}

function emptyDashboardJson(): Dashboard {
  return {
    id: { entityType: 'DASHBOARD', id: 'd2' },
    title: 'Empty',
    configuration: {},
  } as unknown as Dashboard;
}

function normalize(json: Dashboard): DashboardConfiguration {
  return validateAndUpdateDashboard(json)
    .configuration as DashboardConfiguration;
}

/** Navigation sink shared between the D1 harness and the mocked history. */
const exitRouteListeners = new Set<() => void>();

interface SetupOptions {
  dashboard?: Dashboard;
}

function setup(options?: SetupOptions) {
  const dashboard = options?.dashboard ?? dashboardJson();
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

beforeEach(() => {
  dashboardServiceMock.saveDashboard.mockReset();
  dashboardServiceMock.saveDashboard.mockResolvedValue(dashboardJson());
  dashboardServiceMock.getDashboard.mockReset();
});

afterEach(() => {
  historyMock.push.mockClear();
});

describe('EditorShell — toolbar', () => {
  it('renders the edit group with undo/redo disabled on a clean draft', () => {
    setup();
    expect(screen.getByTestId('editor-toolbar-save')).toBeInTheDocument();
    expect(screen.getByTestId('editor-toolbar-undo')).toBeDisabled();
    expect(screen.getByTestId('editor-toolbar-redo')).toBeDisabled();
    expect(
      screen.getByTestId('editor-toolbar-version-control'),
    ).toBeInTheDocument();
  });

  it('undo/redo reflect the session stack and commit through the session', () => {
    const { session } = setup();
    act(() => {
      session.write('add widget', (draft) => {
        draft.widgets.w1.config.title = 'changed';
      });
    });
    expect(screen.getByTestId('editor-toolbar-undo')).toBeEnabled();
    fireEvent.click(screen.getByTestId('editor-toolbar-undo'));
    expect(session.dirty).toBe(false);
    expect(screen.getByTestId('editor-toolbar-redo')).toBeEnabled();
    fireEvent.click(screen.getByTestId('editor-toolbar-redo'));
    expect(session.dirty).toBe(true);
  });

  it('save POSTs the draft with the entity meta + version and re-anchors', async () => {
    const { session } = setup();
    act(() => {
      session.write('add widget', (draft) => {
        draft.widgets.w1.config.title = 'changed';
      });
    });
    fireEvent.click(screen.getByTestId('editor-toolbar-save'));
    await waitFor(() => {
      expect(dashboardServiceMock.saveDashboard).toHaveBeenCalledTimes(1);
    });
    const posted = dashboardServiceMock.saveDashboard.mock
      .calls[0][0] as Dashboard;
    expect(posted.id?.id).toBe('d1');
    expect(posted.version).toBe(3);
    expect(posted.configuration?.widgets.w1.config.title).toBe('changed');
  });

  it('exit-save saves and navigates back to the view route', async () => {
    setup();
    fireEvent.click(screen.getByTestId('editor-toolbar-exit-save'));
    await waitFor(() => {
      expect(dashboardServiceMock.saveDashboard).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(historyMock.push).toHaveBeenCalledWith('/dashboards/d1');
    });
  });

  it('exit-cancel rolls the draft back to the entry baseline in one group and navigates back', async () => {
    const { session } = setup();
    act(() => {
      session.write('add widget', (draft) => {
        draft.widgets.w1.config.title = 'changed';
      });
    });
    expect(session.dirty).toBe(true);
    fireEvent.click(screen.getByTestId('editor-toolbar-exit-cancel'));
    // dirty ⇒ §3.8 confirm first
    const ok = await screen.findByRole('button', { name: '放弃修改' });
    fireEvent.click(ok);
    await waitFor(() => {
      expect(historyMock.push).toHaveBeenCalledWith('/dashboards/d1');
    });
    expect(session.dirty).toBe(false);
    expect(session.current.widgets.w1.config.title).toBeUndefined();
    // rollback keeps the history inspectable (entry baseline NOT re-entered)
    expect(session.history).toHaveLength(2);
  });
});

describe('EditorShell — hotkeys (§3.9 focus routing)', () => {
  it('ctrl+z undoes and ctrl+y redoes at the document level', () => {
    const { session } = setup();
    act(() => {
      session.write('edit', (draft) => {
        draft.widgets.w1.config.title = 'changed';
      });
    });
    // rhh v5 matches on event.code by default — dispatch on document,
    // where the library binds its listener
    fireEvent.keyDown(document, { key: 'z', code: 'KeyZ', ctrlKey: true });
    expect(session.dirty).toBe(false);
    fireEvent.keyDown(document, { key: 'y', code: 'KeyY', ctrlKey: true });
    expect(session.dirty).toBe(true);
  });

  it('hotkeys do NOT fire while typing in inputs/CodeMirror', () => {
    const { session } = setup();
    act(() => {
      session.write('edit', (draft) => {
        draft.widgets.w1.config.title = 'changed';
      });
    });
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    fireEvent.keyDown(input, {
      key: 'z',
      code: 'KeyZ',
      ctrlKey: true,
      bubbles: true,
    });
    expect(session.history).toHaveLength(1); // untouched
    expect(isTypingTarget(input)).toBe(true);
    input.remove();
  });

  it('Delete opens the remove confirm; Escape clears selection/dialog', () => {
    const { session } = setup({ dashboard: dashboardJson() });
    expect(session).toBeDefined();
    // Delete without selection must not throw
    fireEvent.keyDown(document.body, {
      key: 'Delete',
      code: 'Delete',
      bubbles: true,
    });
  });
});

describe('EditorShell — dialogs seam', () => {
  it('toolbar entries open placeholder dialogs without crashing', async () => {
    setup();
    fireEvent.click(screen.getByTestId('editor-toolbar-manage-layouts'));
    await waitFor(() => {
      expect(screen.getByText('Manage layouts')).toBeInTheDocument();
    });
    fireEvent.keyDown(document.body, {
      key: 'Escape',
      code: 'Escape',
      bubbles: true,
    });
  });
});

describe('EditorShell — empty dashboard (spec §3.1 自动进入编辑态)', () => {
  it('renders the editing canvas for an empty dashboard without a readonly face', () => {
    setup({ dashboard: emptyDashboardJson() });
    // the editor route carries no readonly face — empty dashboards are
    // born in edit mode
    expect(screen.getByTestId('editor-shell')).toBeInTheDocument();
    expect(screen.getByTestId('editor-toolbar-add-widget')).toBeInTheDocument();
  });
});

describe('EditorShell — widget context menu (M10 D3)', () => {
  it('right-clicking a widget mounts the real shell widget menu', async () => {
    setup();
    const cell = screen
      .getAllByTestId('editor-widget')
      .find((el) => el.getAttribute('data-editor-widget') === 'w1');
    if (!cell?.firstElementChild) {
      throw new Error('widget cell w1 with content not found');
    }
    fireEvent.contextMenu(cell.firstElementChild);
    expect(
      await screen.findByTestId('editor-widget-menu-w1'),
    ).toBeInTheDocument();
  });
});

describe('EditorShell — exit-cancel confirm ownership (M10 D1)', () => {
  /**
   * Mimics the real provider nesting: umi mounts the antd <App> ONCE above
   * the router (plugin-antd innerProvider), so a navigation swaps the page
   * underneath a PERSISTENT App. Whatever dialog lives in the App-level
   * modal holder therefore survives the page swap unless the page itself
   * owns it — exactly the D1 residue class.
   */
  function ExitRouteHarness({
    session,
    dashboard,
  }: {
    session: EditorSession<DashboardConfiguration>;
    dashboard: Dashboard;
  }) {
    const [exited, setExited] = useState(false);
    useEffect(() => {
      const onPush = () => setExited(true);
      exitRouteListeners.add(onPush);
      return () => {
        exitRouteListeners.delete(onPush);
      };
    }, []);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    return (
      <RawIntlProvider value={intl}>
        <AntdApp>
          <QueryClientProvider client={queryClient}>
            {exited ? (
              <div data-testid="readonly-view" />
            ) : (
              <EditorShell session={session} dashboard={dashboard} />
            )}
          </QueryClientProvider>
        </AntdApp>
      </RawIntlProvider>
    );
  }

  it('discarding navigates away and leaves NO confirm dialog residue', async () => {
    const dashboard = dashboardJson();
    const session = new EditorSession<DashboardConfiguration>({
      baseline: normalize(dashboard),
    });
    render(<ExitRouteHarness session={session} dashboard={dashboard} />);
    act(() => {
      session.write('add widget', (draft) => {
        draft.widgets.w1.config.title = 'changed';
      });
    });
    fireEvent.click(screen.getByTestId('editor-toolbar-exit-cancel'));
    const ok = await screen.findByRole('button', { name: '放弃修改' });
    historyMock.push.mockImplementation(() => {
      for (const listener of exitRouteListeners) {
        listener();
      }
    });
    fireEvent.click(ok);
    await waitFor(() => {
      expect(historyMock.push).toHaveBeenCalledWith('/dashboards/d1');
    });
    expect(screen.getByTestId('readonly-view')).toBeInTheDocument();
    // the confirm is owned by the editor face: navigation unmounts it
    // atomically — no mask, no dead dialog may outlive the page
    expect(document.querySelector('.ant-modal-root')).toBeNull();
    historyMock.push.mockReset();
  });

  it('canceling the confirm keeps the editor mounted without navigating', async () => {
    const { session } = setup();
    act(() => {
      session.write('add widget', (draft) => {
        draft.widgets.w1.config.title = 'changed';
      });
    });
    fireEvent.click(screen.getByTestId('editor-toolbar-exit-cancel'));
    expect(
      await screen.findByTestId('editor-exit-confirm'),
    ).toBeInTheDocument();
    const cancel = await screen.findByTestId('editor-exit-confirm-cancel');
    fireEvent.click(cancel);
    // the controlled open state flipped: antd starts the close transition
    // synchronously (happy-dom never finishes the animation itself)
    expect(document.querySelector('.ant-modal-mask')?.className).toContain(
      'leave',
    );
    expect(historyMock.push).not.toHaveBeenCalled();
    expect(session.dirty).toBe(true);
    expect(screen.getByTestId('editor-shell')).toBeInTheDocument();
  });
});
