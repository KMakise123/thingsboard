/**
 * ManageStatesDialog tests (spec §3.5): add / edit / delete as ONE
 * transaction group each, the nested dashboard-state editor fields
 * (name / id / root), duplicate guards, root-flag normalization
 * (ui-ngx saveState) and root-state delete protection.
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, describe, expect, it } from 'vitest';
import { validateAndUpdateDashboard } from '@/core/dashboard/model';
import { EditorSession } from '@/core/editor/session';
import zhEditor from '@/locales/zh-CN/editor';
import zhEditorDashboard from '@/locales/zh-CN/editor-dashboard';
import zhDialogs from '@/locales/zh-CN/editor-dashboard-dialogs';
import type { Dashboard, DashboardConfiguration } from '@/types/tb/dashboard';
import { ManageStatesDialog } from './manage-states';
import { clearDialogSession, publishDialogSession } from './use-dialog-session';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhEditor, ...zhEditorDashboard, ...zhDialogs },
});

function dashboardJson(): Dashboard {
  return {
    id: { entityType: 'DASHBOARD', id: 'd1' },
    title: 'Demo',
    configuration: {
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
    },
  } as unknown as Dashboard;
}

function setup() {
  const configuration = validateAndUpdateDashboard(dashboardJson())
    .configuration as DashboardConfiguration;
  const session = new EditorSession<DashboardConfiguration>({
    baseline: configuration,
  });
  publishDialogSession(session);
  render(
    <RawIntlProvider value={intl}>
      <ManageStatesDialog open onClose={() => undefined} />
    </RawIntlProvider>,
  );
  return { session };
}

function openAddEditor(): void {
  fireEvent.click(screen.getByTestId('states-add'));
}

afterEach(() => {
  cleanup();
  clearDialogSession();
});

describe('ManageStatesDialog', () => {
  it('adds a state with an auto id in ONE transaction group', async () => {
    const { session } = setup();
    openAddEditor();
    fireEvent.change(screen.getByTestId('state-editor-name'), {
      target: { value: 'temperature' },
    });
    // id autofilled from the name (ui-ngx checkStateName)
    expect(screen.getByTestId('state-editor-id')).toHaveValue('temperature');
    fireEvent.click(screen.getByTestId('state-editor-ok'));
    await waitFor(() => {
      expect(session.history).toHaveLength(1);
    });
    expect(session.history[0].label).toBe('add state');
    const state = session.current.states.temperature;
    expect(state).toBeDefined();
    expect(state.name).toBe('temperature');
    expect(state.root).toBe(false);
    expect(Object.keys(state.layouts)).toContain('main');
  });

  it('rejects a duplicate state id', async () => {
    const { session } = setup();
    openAddEditor();
    fireEvent.change(screen.getByTestId('state-editor-name'), {
      target: { value: 'second' },
    });
    fireEvent.change(screen.getByTestId('state-editor-id'), {
      target: { value: 'default' },
    });
    fireEvent.click(screen.getByTestId('state-editor-ok'));
    await waitFor(() => {
      expect(screen.getByText('状态 ID 已存在。')).toBeInTheDocument();
    });
    expect(session.history).toHaveLength(0);
  });

  it('rename keeps the layouts; an id rename moves the entry', async () => {
    const { session } = setup();
    act(() => {
      session.write('seed state', (draft) => {
        draft.states.temp = {
          name: 'Temp',
          root: false,
          layouts: {
            main: {
              widgets: { w1: { sizeX: 4, sizeY: 3, row: 1, col: 1 } },
              gridSettings: { columns: 24, margin: 10 },
            },
          },
        };
      });
    });
    fireEvent.click(screen.getByTestId('states-edit-temp'));
    fireEvent.change(screen.getByTestId('state-editor-name'), {
      target: { value: 'Temperature' },
    });
    fireEvent.change(screen.getByTestId('state-editor-id'), {
      target: { value: 'temperature' },
    });
    fireEvent.click(screen.getByTestId('state-editor-ok'));
    await waitFor(() => {
      expect(session.history).toHaveLength(2);
    });
    expect(session.current.states.temp).toBeUndefined();
    const renamed = session.current.states.temperature;
    expect(renamed.name).toBe('Temperature');
    expect(renamed.layouts.main?.widgets.w1).toMatchObject({ row: 1, col: 1 });
  });

  it('checking root on a second state clears the flag everywhere else', async () => {
    const { session } = setup();
    act(() => {
      session.write('seed state', (draft) => {
        draft.states.temp = {
          name: 'Temp',
          root: false,
          layouts: {
            main: { widgets: {}, gridSettings: { columns: 24, margin: 10 } },
          },
        };
      });
    });
    fireEvent.click(screen.getByTestId('states-edit-temp'));
    fireEvent.click(screen.getByTestId('state-editor-root'));
    fireEvent.click(screen.getByTestId('state-editor-ok'));
    await waitFor(() => {
      expect(session.history).toHaveLength(2);
    });
    expect(session.current.states.temp.root).toBe(true);
    expect(session.current.states.default.root).toBe(false);
  });

  it('root=false keeps a root somewhere (first key wins)', async () => {
    const { session } = setup();
    fireEvent.click(screen.getByTestId('states-edit-default'));
    fireEvent.click(screen.getByTestId('state-editor-root'));
    fireEvent.click(screen.getByTestId('state-editor-ok'));
    await waitFor(() => {
      expect(session.history).toHaveLength(1);
    });
    const roots = Object.values(session.current.states).filter(
      (state) => state.root,
    );
    expect(roots).toHaveLength(1);
    expect(roots[0].name).toBe('Root');
  });

  it('the root state cannot be deleted', () => {
    const { session } = setup();
    const removeButton = screen.getByTestId(
      'states-remove-default',
    ) as HTMLButtonElement;
    expect(removeButton.disabled).toBe(true);
    fireEvent.click(removeButton);
    expect(session.history).toHaveLength(0);
    expect(session.current.states.default).toBeDefined();
  });

  it('deletes a non-root state in ONE transaction group', async () => {
    const { session } = setup();
    act(() => {
      session.write('seed state', (draft) => {
        draft.states.temp = {
          name: 'Temp',
          root: false,
          layouts: {
            main: { widgets: {}, gridSettings: { columns: 24, margin: 10 } },
          },
        };
      });
    });
    fireEvent.click(screen.getByTestId('states-remove-temp'));
    await waitFor(() => {
      expect(session.history).toHaveLength(2);
    });
    expect(session.current.states.temp).toBeUndefined();
  });
});
