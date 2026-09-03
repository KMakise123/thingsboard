/**
 * AddBreakpointDialog tests (spec §3.5, ui-ngx createdNewBreakpoint):
 * copy-from-default cloning with the xs mobile adaptation, copy from an
 * existing breakpoint, exhausted-breakpoint guard — each add is ONE
 * transaction group writing layouts.main.breakpoints[id].
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
import { AddBreakpointDialog } from './add-breakpoint';
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
      widgets: { w1: { typeFullFqn: 'system.test', config: {} } },
      states: {
        default: {
          name: 'Root',
          root: true,
          layouts: {
            main: {
              widgets: {
                w1: { sizeX: 8, sizeY: 6, row: 0, col: 0 },
              },
              gridSettings: {
                columns: 24,
                margin: 10,
                mobileRowHeight: 90,
                mobileAutoFillHeight: true,
              },
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
      <AddBreakpointDialog open payload={undefined} onClose={() => undefined} />
    </RawIntlProvider>,
  );
  return { session };
}

afterEach(() => {
  cleanup();
  clearDialogSession();
});

describe('AddBreakpointDialog', () => {
  it('copies from default into xs with the mobile adaptation, ONE group', async () => {
    const { session } = setup();
    // No breakpoints exist yet → the copy-from select is disabled with its
    // initial '默认' value; only the OK commit is needed.
    fireEvent.click(screen.getByTestId('add-breakpoint-ok'));
    await waitFor(() => {
      expect(session.history).toHaveLength(1);
    });
    expect(session.history[0].label).toBe('add breakpoint');
    // breakpoint entries degrade to an index signature — cast for reads
    const xs = session.current.states.default.layouts.main?.breakpoints?.xs as
      | {
          gridSettings: Record<string, unknown>;
          widgets: Record<string, Record<string, unknown>>;
        }
      | undefined;
    expect(xs).toBeDefined();
    // ui-ngx mobile adaptation (maxWidth < 960): rowHeight/mobile autofill
    // adopted from the mobile arm, hide flags stripped from widget layouts.
    expect(xs?.gridSettings.rowHeight).toBe(90);
    expect(xs?.gridSettings.autoFillHeight).toBe(true);
    expect(xs?.widgets.w1).toMatchObject({ row: 0, col: 0, sizeX: 8 });
    expect(xs?.widgets.w1.desktopHide).toBeUndefined();
  });

  it('copies gridSettings + widgets verbatim from an existing breakpoint', async () => {
    const { session } = setup((draft) => {
      draft.states.default.layouts.main!.breakpoints = {
        sm: {
          widgets: { w1: { sizeX: 12, sizeY: 4, row: 2, col: 3 } },
          gridSettings: { columns: 12, margin: 4 },
        },
      };
    });
    // first select: choose md (allowed); second: choose SM.
    const selects = document.querySelectorAll('.ant-select');
    fireEvent.mouseDown(selects[0] as HTMLElement);
    fireEvent.click(
      await screen.findByText(/MD/, {
        selector: '.ant-select-item-option-content',
      }),
    );
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
    fireEvent.mouseDown(selects[1] as HTMLElement);
    fireEvent.click(
      await screen.findByText(/SM/, {
        selector: '.ant-select-item-option-content',
      }),
    );
    await new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
    fireEvent.click(screen.getByTestId('add-breakpoint-ok'));
    await waitFor(() => {
      expect(session.history).toHaveLength(2);
    });
    const md = session.current.states.default.layouts.main?.breakpoints?.md as
      | {
          gridSettings: Record<string, unknown>;
          widgets: Record<string, Record<string, unknown>>;
        }
      | undefined;
    expect(md?.gridSettings.columns).toBe(12);
    expect(md?.widgets.w1).toMatchObject({ sizeX: 12, row: 2, col: 3 });
    // no mobile adaptation when copying from a non-default breakpoint
    expect(md?.gridSettings.rowHeight).toBeUndefined();
  });

  it('guards when every breakpoint is already defined', () => {
    const { session } = setup((draft) => {
      const breakpoints: Record<string, unknown> = {};
      for (const id of ['xs', 'sm', 'md', 'lg', 'xl']) {
        breakpoints[id] = { widgets: {}, gridSettings: { columns: 24 } };
      }
      draft.states.default.layouts.main!.breakpoints = breakpoints;
    });
    expect(screen.getByTestId('add-breakpoint-exhausted')).toBeInTheDocument();
    const ok = screen.getByTestId('add-breakpoint-ok') as HTMLButtonElement;
    expect(ok.disabled).toBe(true);
    fireEvent.click(ok);
    // history still holds only the seed group — no add happened
    expect(session.history).toHaveLength(1);
  });
});
