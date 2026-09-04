/**
 * Add-widget flow tests (spec §3.2): drawer (grouped + searched builtin
 * registry) → confirm dialog (title/size/position) → addWidget committed
 * as ONE transaction group with a fresh widget-map guid.
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
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WIDGET_REGISTRY } from '@/components/widgets/registry';
import { validateAndUpdateDashboard } from '@/core/dashboard/model';
import { EditorSession } from '@/core/editor/session';
import zhEditorCommon from '@/locales/zh-CN/editor';
import zhEditorDashboard from '@/locales/zh-CN/editor-dashboard';
import type { Dashboard, DashboardConfiguration } from '@/types/tb/dashboard';

import { AddWidgetFlow } from './index';
import { widgetTypeLabel } from './widget-picker-drawer';

const TEST_FQN = 'system.test.add_flow';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhEditorCommon, ...zhEditorDashboard },
});

vi.mock('@/services/tb/widget-type', () => ({
  getWidgetTypeByFullFqn: vi.fn(),
}));

beforeEach(() => {
  WIDGET_REGISTRY[TEST_FQN] = {
    component: Object.assign(vi.fn(), {
      preload: () => undefined,
    }),
    meta: { label: 'Test widget' },
  } as never;
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
  const onClose = vi.fn();
  const onAdded = vi.fn();
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <RawIntlProvider value={intl}>
      <AntdApp>
        <QueryClientProvider client={queryClient}>
          <AddWidgetFlow
            session={session}
            open
            onClose={onClose}
            onAdded={onAdded}
          />
        </QueryClientProvider>
      </AntdApp>
    </RawIntlProvider>,
  );
  return { session, onClose, onAdded };
}

describe('AddWidgetFlow', () => {
  it('widgetTypeLabel resolves the registry label and falls back to the fqn', () => {
    expect(widgetTypeLabel(TEST_FQN)).toBe('Test widget');
    expect(widgetTypeLabel('system.cards.html_value_card')).toBe(
      'HTML value card',
    );
    expect(widgetTypeLabel('system.not_in_registry')).toBe(
      'system.not_in_registry',
    );
  });

  it('the confirm title field prefills the type display name, not the fqn (D3)', async () => {
    setup();
    fireEvent.click(screen.getByText('Test widget'));
    const titleInput = (await waitFor(() => {
      const input = document.querySelector(
        'input#title',
      ) as HTMLInputElement | null;
      expect(input).not.toBeNull();
      return input as HTMLInputElement;
    })) as HTMLInputElement;
    expect(titleInput.value).toBe('Test widget');
  });

  it('drawer lists registry types grouped; picking one opens the confirm step', () => {
    setup();
    expect(screen.getByTestId('add-widget-drawer')).toBeInTheDocument();
    expect(screen.getByText('Test widget')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Test widget'));
    expect(screen.getByTestId('add-widget-confirm')).toBeInTheDocument();
  });

  it('search filters the registry list', () => {
    setup();
    fireEvent.change(screen.getByTestId('add-widget-search'), {
      target: { value: 'no-such-widget' },
    });
    expect(screen.queryByText('Test widget')).toBeNull();
  });

  it('confirming commits addWidget as ONE group with a fresh guid', async () => {
    const { session, onClose, onAdded } = setup();
    fireEvent.click(screen.getByText('Test widget'));
    const okButton: HTMLButtonElement = await waitFor(() => {
      const button = document.querySelector(
        '.ant-modal-footer .ant-btn-primary',
      );
      expect(button).not.toBeNull();
      return button as HTMLButtonElement;
    });
    fireEvent.click(okButton);
    await waitFor(() => {
      expect(session.history).toHaveLength(1);
    });
    const after = session.current;
    const ids = Object.keys(after.widgets);
    expect(ids).toHaveLength(1);
    expect(after.widgets[ids[0]].typeFullFqn).toBe(TEST_FQN);
    const entry = after.states.default.layouts.main?.widgets[ids[0]];
    expect(entry).toMatchObject({ sizeX: 8, sizeY: 6, row: 0, col: 0 });
    expect(onClose).toHaveBeenCalled();
    expect(onAdded).toHaveBeenCalledWith(ids[0]);
    // undo reverts the add in one step
    act(() => {
      session.undo();
    });
    expect(Object.keys(session.current.widgets)).toHaveLength(0);
  });

  it('prefills the confirm dialog with the first FREE slot (D2)', async () => {
    // one 8x6 widget at the origin → the default 8x6 lands at (0, 8)
    const occupied = {
      ...dashboardJson(),
      configuration: {
        widgets: { seed: { typeFullFqn: TEST_FQN, config: {} } },
        states: {
          default: {
            name: 'Root',
            root: true,
            layouts: {
              main: {
                widgets: { seed: { sizeX: 8, sizeY: 6, row: 0, col: 0 } },
                gridSettings: { columns: 24, margin: 10 },
              },
            },
          },
        },
        entityAliases: {},
      },
    } as unknown as Dashboard;
    const configuration = validateAndUpdateDashboard(occupied)
      .configuration as DashboardConfiguration;
    const session = new EditorSession<DashboardConfiguration>({
      baseline: configuration,
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <RawIntlProvider value={intl}>
        <AntdApp>
          <QueryClientProvider client={queryClient}>
            <AddWidgetFlow session={session} open onClose={vi.fn()} />
          </QueryClientProvider>
        </AntdApp>
      </RawIntlProvider>,
    );
    fireEvent.click(screen.getByText('Test widget'));
    const rowInput = (await waitFor(() => {
      const input = document.querySelector(
        'input#row',
      ) as HTMLInputElement | null;
      expect(input).not.toBeNull();
      return input as HTMLInputElement;
    })) as HTMLInputElement;
    const colInput = document.querySelector('input#col') as HTMLInputElement;
    expect(rowInput.value).toBe('0');
    expect(colInput.value).toBe('8');
    // confirming lands the widget in the prefilled free slot — no overlap
    const okButton = document.querySelector(
      '.ant-modal-footer .ant-btn-primary',
    ) as HTMLButtonElement;
    fireEvent.click(okButton);
    await waitFor(() => {
      expect(session.history).toHaveLength(1);
    });
    const ids = Object.keys(session.current.widgets).filter(
      (id) => id !== 'seed',
    );
    expect(
      session.current.states.default.layouts.main?.widgets[ids[0]],
    ).toMatchObject({ row: 0, col: 8 });
  });
});
