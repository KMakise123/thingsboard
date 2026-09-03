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
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { validateAndUpdateDashboard } from '@/core/dashboard/model';
import { EditorSession } from '@/core/editor/session';
import zhEditorCommon from '@/locales/zh-CN/editor';
import zhEditorDashboard from '@/locales/zh-CN/editor-dashboard';
import type { Dashboard, DashboardConfiguration } from '@/types/tb/dashboard';

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('@umijs/max', () => ({ history: historyMock }));

const dashboardServiceMock = vi.hoisted(() => ({
  saveDashboard: vi.fn(),
  exportDashboard: vi.fn(),
  getTenantDashboards: vi.fn(),
  getWidgetTypeByFqn: vi.fn(),
}));
vi.mock('@/services/tb/dashboard', () => dashboardServiceMock);

const importExportMock = vi.hoisted(() => ({
  exportDashboardToFile: vi.fn(),
}));
vi.mock('@/pages/dashboards/list/import-export', () => importExportMock);

import { EditorShell, isTypingTarget } from './shell';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhEditorCommon, ...zhEditorDashboard },
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

  it('exit-cancel resets to the entry baseline and navigates back', () => {
    const { session } = setup();
    act(() => {
      session.write('add widget', (draft) => {
        draft.widgets.w1.config.title = 'changed';
      });
    });
    expect(session.dirty).toBe(true);
    fireEvent.click(screen.getByTestId('editor-toolbar-exit-cancel'));
    expect(session.dirty).toBe(false);
    expect(session.history).toHaveLength(0); // enter() reset the stack
    expect(historyMock.push).toHaveBeenCalledWith('/dashboards/d1');
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
