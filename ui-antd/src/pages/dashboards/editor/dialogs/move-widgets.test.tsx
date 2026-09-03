/**
 * MoveWidgetsDialog tests (spec §3.3): offset shift of every widget in the
 * chosen layout commits as ONE transaction group; negative offsets clamp at
 * the grid origin (ui-ngx moveWidgets semantics); the right-layout picker
 * targets the chosen layout; the empty-layout guard disables the move
 * action. (The displayGrid 'always' force while the dialog is open is
 * pinned in canvas/editor-grid.test.tsx — "move-widgets override channel".)
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, describe, expect, it } from 'vitest';
import { validateAndUpdateDashboard } from '@/core/dashboard/model';
import { EditorSession } from '@/core/editor/session';
import zhEditor from '@/locales/zh-CN/editor';
import zhEditorDashboard from '@/locales/zh-CN/editor-dashboard';
import zhDialogs from '@/locales/zh-CN/editor-dashboard-dialogs';
import type { Dashboard, DashboardConfiguration } from '@/types/tb/dashboard';
import { MoveWidgetsDialog } from './move-widgets';
import {
  clearDialogSession,
  publishDialogSession,
} from './use-dialog-session';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhEditor, ...zhEditorDashboard, ...zhDialogs },
});

function dashboardJson(): Dashboard {
  return {
    id: { entityType: 'DASHBOARD', id: 'd1' },
    title: 'Demo',
    configuration: {
      widgets: {
        w1: { typeFullFqn: 'system.test.mv', config: {} },
        w2: { typeFullFqn: 'system.test.mv', config: {} },
      },
      states: {
        default: {
          name: 'Root',
          root: true,
          layouts: {
            main: {
              widgets: {
                w1: { sizeX: 4, sizeY: 3, row: 2, col: 3 },
                w2: { sizeX: 4, sizeY: 3, row: 10, col: 9 },
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

function setup() {
  const configuration = validateAndUpdateDashboard(dashboardJson())
    .configuration as DashboardConfiguration;
  const session = new EditorSession<DashboardConfiguration>({
    baseline: configuration,
  });
  publishDialogSession(session);
  return { session };
}

function renderDialog(session: EditorSession<DashboardConfiguration>) {
  render(
    <RawIntlProvider value={intl}>
      <MoveWidgetsDialog open payload={undefined} onClose={() => undefined} />
    </RawIntlProvider>,
  );
}

function spinbuttons(): HTMLElement[] {
  return screen.getAllByRole('spinbutton');
}

/** antd v6 Select: mousedown on the root `.ant-select`, then click an option. */
async function pickSelectOption(label: string): Promise<void> {
  const select = document.querySelector('.ant-select');
  expect(select).not.toBeNull();
  fireEvent.mouseDown(select as HTMLElement);
  fireEvent.click(
    await screen.findByText(label, {
      selector: '.ant-select-item-option-content',
    }),
  );
  // Let the option's onChange land in the form before proceeding.
  await new Promise((resolve) => {
    setTimeout(resolve, 100);
  });
}

afterEach(() => {
  cleanup();
  clearDialogSession();
});

describe('MoveWidgetsDialog', () => {
  it('shifts every widget of the layout in ONE transaction group', async () => {
    const { session } = setup();
    renderDialog(session);
    fireEvent.change(spinbuttons()[0], { target: { value: '3' } });
    fireEvent.change(spinbuttons()[1], { target: { value: '2' } });
    fireEvent.click(screen.getByTestId('move-widgets-ok'));
    await waitFor(() => {
      expect(session.history).toHaveLength(1);
    });
    expect(session.history[0].label).toBe('move widgets');
    const widgets = session.current.states.default.layouts?.main?.widgets!;
    expect(widgets.w1).toMatchObject({ row: 4, col: 6 });
    expect(widgets.w2).toMatchObject({ row: 12, col: 12 });
    expect(session.dirty).toBe(true);
  });

  it('zero offsets are a full no-op (immer emits no patches)', async () => {
    const { session } = setup();
    renderDialog(session);
    fireEvent.click(screen.getByTestId('move-widgets-ok'));
    await waitFor(() => {
      expect(session.history).toHaveLength(0);
    });
    expect(session.dirty).toBe(false);
    expect(session.current.states.default.layouts?.main?.widgets.w1).toMatchObject(
      { row: 2, col: 3 },
    );
  });

  it('negative offsets clamp so no widget crosses the grid origin', async () => {
    const { session } = setup();
    renderDialog(session);
    fireEvent.change(spinbuttons()[0], { target: { value: '-50' } });
    fireEvent.change(spinbuttons()[1], { target: { value: '-5' } });
    fireEvent.click(screen.getByTestId('move-widgets-ok'));
    await waitFor(() => {
      expect(session.history).toHaveLength(1);
    });
    const widgets = session.current.states.default.layouts?.main?.widgets!;
    // minCol 3 + (-50) clamps to shift -3; minRow 2 + (-5) clamps to shift -2
    expect(widgets.w1).toMatchObject({ row: 0, col: 0 });
    expect(widgets.w2).toMatchObject({ row: 8, col: 6 });
  });

  it('targets the chosen layout when the state has two layouts', async () => {
    const { session } = setup();
    session.write('add right layout', (draft) => {
      draft.states.default.layouts.right = {
        widgets: {
          w1: { sizeX: 4, sizeY: 3, row: 1, col: 1 },
        },
        gridSettings: { columns: 24, margin: 10 },
      };
    });
    renderDialog(session);
    await pickSelectOption('右侧布局');
    fireEvent.change(spinbuttons()[0], { target: { value: '3' } });
    fireEvent.change(spinbuttons()[1], { target: { value: '2' } });
    fireEvent.click(screen.getByTestId('move-widgets-ok'));
    await waitFor(() => {
      expect(session.history).toHaveLength(2);
    });
    expect(session.current.states.default.layouts?.right?.widgets.w1).toMatchObject(
      { row: 3, col: 4 },
    );
    // main untouched
    expect(session.current.states.default.layouts?.main?.widgets.w1).toMatchObject(
      { row: 2, col: 3 },
    );
  });

  it('disables the move action on an empty layout', () => {
    const { session } = setup();
    session.write('clear layout', (draft) => {
      draft.states.default.layouts.main!.widgets = {};
    });
    renderDialog(session);
    expect(screen.getByTestId('move-widgets-empty')).toBeInTheDocument();
    expect(
      (screen.getByTestId('move-widgets-ok') as HTMLButtonElement).disabled,
    ).toBe(true);
  });
});
