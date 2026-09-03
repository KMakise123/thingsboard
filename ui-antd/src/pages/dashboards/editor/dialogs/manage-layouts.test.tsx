/**
 * ManageLayoutsDialog tests (spec §3.5/§3.6): layout-count switching
 * (default/scada = one layout, divider = main + right), the ui-ngx save
 * semantics (type lands on main + breakpoints, divider drops breakpoints),
 * breakpoint deletion, and the Layout settings entry reusing the
 * dashboard-settings dialog in grid mode through the local DialogHost.
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
import { ManageLayoutsDialog } from './manage-layouts';
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

function setup(seed?: (draft: DashboardConfiguration) => void) {
  const configuration = validateAndUpdateDashboard(dashboardJson())
    .configuration as DashboardConfiguration;
  const session = new EditorSession<DashboardConfiguration>({
    baseline: configuration,
  });
  publishDialogSession(session);
  if (seed) {
    act(() => {
      session.write('seed', seed);
    });
  }
  render(
    <RawIntlProvider value={intl}>
      <ManageLayoutsDialog open onClose={() => undefined} />
    </RawIntlProvider>,
  );
  return { session };
}

function pickMode(label: string): void {
  fireEvent.click(screen.getByRole('radio', { name: label }));
}

afterEach(() => {
  cleanup();
  clearDialogSession();
});

describe('ManageLayoutsDialog', () => {
  it('divider adds the right layout in ONE transaction group', async () => {
    const { session } = setup();
    pickMode('分栏（左 + 右）');
    await waitFor(() => {
      expect(session.history).toHaveLength(1);
    });
    expect(session.history[0].label).toBe('set layouts');
    expect(session.current.states.default.layouts.right).toBeDefined();
    expect(
      session.current.states.default.layouts.right?.gridSettings.layoutType,
    ).toBe('divider');
    expect(
      session.current.states.default.layouts.main?.gridSettings.layoutType,
    ).toBe('divider');
  });

  it('default removes the right layout and re-types breakpoints', async () => {
    const { session } = setup((draft) => {
      const layouts = draft.states.default.layouts;
      layouts.right = {
        widgets: {},
        gridSettings: { columns: 24, margin: 10 },
      };
      layouts.main!.breakpoints = {
        sm: {
          widgets: {},
          gridSettings: { columns: 24, margin: 10, layoutType: 'divider' },
        },
      };
    });
    pickMode('默认');
    await waitFor(() => {
      expect(session.history).toHaveLength(2);
    });
    expect(session.current.states.default.layouts.right).toBeUndefined();
    const smGrid = (
      session.current.states.default.layouts.main?.breakpoints?.sm as
        | { gridSettings: { layoutType?: string } }
        | undefined
    )?.gridSettings;
    expect(smGrid?.layoutType).toBe('default');
  });

  it('scada writes the layout type onto the main layout', async () => {
    const { session } = setup();
    pickMode('SCADA');
    await waitFor(() => {
      expect(session.history).toHaveLength(1);
    });
    expect(
      session.current.states.default.layouts.main?.gridSettings.layoutType,
    ).toBe('scada');
    expect(session.current.states.default.layouts.right).toBeUndefined();
  });

  it('deletes a breakpoint entry in ONE transaction group', async () => {
    const { session } = setup((draft) => {
      draft.states.default.layouts.main!.breakpoints = {
        sm: {
          widgets: {},
          gridSettings: { columns: 24, margin: 10 },
        },
        xs: {
          widgets: {},
          gridSettings: { columns: 24, margin: 10 },
        },
      };
    });
    fireEvent.click(screen.getByTestId('layouts-bp-delete-sm'));
    await waitFor(() => {
      expect(session.history).toHaveLength(2);
    });
    const breakpoints =
      session.current.states.default.layouts.main?.breakpoints ?? {};
    expect(breakpoints.sm).toBeUndefined();
    expect(breakpoints.xs).toBeDefined();
  });

  it('layout settings opens dashboard-settings in grid mode via the local host', async () => {
    const { session } = setup();
    fireEvent.click(screen.getByTestId('layouts-settings-main'));
    const settingsDialog = await screen.findByTestId(
      'dashboard-settings-dialog',
    );
    expect(settingsDialog).toBeInTheDocument();
    // grid mode shows the columns control and NOT the dashboardCss editor
    expect(await screen.findByLabelText('列数')).toBeInTheDocument();
    expect(screen.queryByTestId('dashboard-settings-css')).toBeNull();
    expect(session.current.states.default.layouts.main).toBeDefined();
  });
});
