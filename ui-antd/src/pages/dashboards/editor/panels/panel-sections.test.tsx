/**
 * Config-panel section behavior tests (spec §3.4, M7 wave K): the Data
 * editors (datasources add / edit / reorder incl. data keys and latest
 * keys, timewindow override semantics, page size), the Actions editor, the
 * Widget-card css/style passthrough fields, the Layout visibility matrix
 * (default / non-default breakpoint / scada) with breakpoint-copy
 * materialization, and the pure panel helpers.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { act } from 'react';
import { RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { writeDraft } from '@/core/editor/dashboard-draft';
import { nextDataKeyColor } from './data-keys-editor';
import {
  breakpointLayoutOf,
  resolvePanelTarget,
  updateWidgetBreakpointLayout,
} from './panel-target';
import {
  breakpointDashboardJson,
  configOf,
  intl,
  type PanelTestSetup,
  scadaDashboardJson,
  setupPanelSession,
} from './panel-test-fixtures';
import { widgetKindOf } from './section-data';
import { WidgetConfigPanel } from './WidgetConfigPanel';

const dialogController = vi.hoisted(() => ({
  openDialog: vi.fn(),
  closeDialog: vi.fn(),
}));

vi.mock('@/pages/dashboards/editor/dialogs/host', () => ({
  DialogHost: () => null,
  useEditorDialogs: () => ({
    activeId: null,
    payload: undefined,
    openDialog: dialogController.openDialog,
    closeDialog: dialogController.closeDialog,
  }),
}));

vi.mock('@/services/tb/widget-type', () => ({
  getWidgetTypeByFullFqn: vi.fn(() => Promise.reject(new Error('not found'))),
}));

function renderPanel(
  setup: PanelTestSetup,
  widgetId: string | null = 'w1',
): void {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <RawIntlProvider value={intl}>
      <QueryClientProvider client={queryClient}>
        <WidgetConfigPanel
          session={setup.session}
          widgetId={widgetId}
          onClose={() => undefined}
        />
      </QueryClientProvider>
    </RawIntlProvider>,
  );
}

function datasource(
  setup: PanelTestSetup,
  index: number,
): Record<string, unknown> {
  return (configOf(setup).datasources as Array<Record<string, unknown>>)[
    index
  ] as Record<string, unknown>;
}

/** antd v6 Select: mousedown on the tested select, click the option. */
async function pickSelectOption(testId: string, label: string): Promise<void> {
  const select = screen.getByTestId(testId);
  fireEvent.mouseDown(select.querySelector('.ant-select-selector') ?? select);
  fireEvent.click(
    await screen.findByText(label, {
      selector: '.ant-select-item-option-content',
    }),
  );
}

afterEach(() => {
  cleanup();
  dialogController.openDialog.mockClear();
});

beforeEach(() => {
  dialogController.openDialog.mockClear();
});

describe('Data: datasources editor (add / edit / reorder)', () => {
  it('add appends an entity row with empty keys to the main draft', () => {
    const setup = setupPanelSession();
    renderPanel(setup);

    fireEvent.click(screen.getByTestId('panel-datasources-add'));
    expect(configOf(setup).datasources).toHaveLength(2);
    expect(datasource(setup, 1).type).toBe('entity');
    expect(datasource(setup, 1).dataKeys).toEqual([]);
  });

  it('type switch moves the row between alias and free-name binding', async () => {
    const setup = setupPanelSession();
    renderPanel(setup);

    fireEvent.click(screen.getByTestId('panel-datasources-add'));
    await pickSelectOption('panel-datasources-1-type', 'function');
    expect(datasource(setup, 1).type).toBe('function');
    expect(datasource(setup, 1).entityAliasId).toBeUndefined();
    expect(
      (screen.getByTestId('panel-datasources-1-name') as HTMLInputElement)
        .value,
    ).toBe('');

    fireEvent.change(screen.getByTestId('panel-datasources-1-name'), {
      target: { value: 'my-fn' },
    });
    expect(datasource(setup, 1).name).toBe('my-fn');
  });

  it('↑/↓ buttons reorder rows as one array replacement', () => {
    const setup = setupPanelSession();
    renderPanel(setup);

    fireEvent.click(screen.getByTestId('panel-datasources-add'));
    fireEvent.click(screen.getByTestId('panel-datasources-0-down'));
    expect(datasource(setup, 0).entityAliasId).toBeUndefined();
    expect(datasource(setup, 1).entityAliasId).toBe('alias1');
  });

  it('remove drops the row', () => {
    const setup = setupPanelSession();
    renderPanel(setup);

    fireEvent.click(screen.getByTestId('panel-datasources-add'));
    fireEvent.click(screen.getByTestId('panel-datasources-1-remove'));
    expect(configOf(setup).datasources).toHaveLength(1);
  });
});

describe('Data: data keys editor', () => {
  it('add keys with label fallback and palette continuation', () => {
    const setup = setupPanelSession();
    renderPanel(setup);

    fireEvent.change(screen.getByTestId('panel-datasources-0-keys-add-name'), {
      target: { value: 'humidity' },
    });
    fireEvent.click(screen.getByTestId('panel-datasources-0-keys-add'));

    const keys = datasource(setup, 0).dataKeys as Array<{
      name: string;
      label?: string;
      color?: string;
      type: string;
    }>;
    expect(keys).toHaveLength(2);
    expect(keys[1]).toMatchObject({
      name: 'humidity',
      label: 'humidity',
      type: 'timeseries',
      // palette cursor counts every existing key on the widget
      color: '#4caf50',
    });
  });

  it('edits label / type / units / decimals and reorders via buttons', async () => {
    const setup = setupPanelSession();
    renderPanel(setup);

    fireEvent.change(
      screen.getByTestId('panel-datasources-0-keys-key-0-label'),
      { target: { value: '温度' } },
    );
    fireEvent.change(
      screen.getByTestId('panel-datasources-0-keys-key-0-units'),
      { target: { value: '°C' } },
    );
    fireEvent.change(
      screen.getByTestId('panel-datasources-0-keys-key-0-decimals'),
      { target: { value: '2' } },
    );
    await pickSelectOption('panel-datasources-0-keys-key-0-type', 'attribute');

    const keys = datasource(setup, 0).dataKeys as Array<
      Record<string, unknown>
    >;
    expect(keys[0]).toMatchObject({
      label: '温度',
      units: '°C',
      decimals: 2,
      type: 'attribute',
    });

    // add a second key then swap the pair via the keyboard fallback
    fireEvent.change(screen.getByTestId('panel-datasources-0-keys-add-name'), {
      target: { value: 'humidity' },
    });
    fireEvent.click(screen.getByTestId('panel-datasources-0-keys-add'));
    fireEvent.click(screen.getByTestId('panel-datasources-0-keys-key-1-up'));
    expect(
      (datasource(setup, 0).dataKeys as Array<Record<string, unknown>>)[0]
        ?.name,
    ).toBe('humidity');

    fireEvent.click(
      screen.getByTestId('panel-datasources-0-keys-key-0-remove'),
    );
    expect(
      datasource(setup, 0).dataKeys as Array<Record<string, unknown>>,
    ).toHaveLength(1);
  });

  it('latest keys are a separate array beside dataKeys', () => {
    const setup = setupPanelSession();
    renderPanel(setup);

    fireEvent.change(
      screen.getByTestId('panel-datasources-0-latest-keys-add-name'),
      { target: { value: 'status' } },
    );
    fireEvent.click(screen.getByTestId('panel-datasources-0-latest-keys-add'));
    expect(
      datasource(setup, 0).latestDataKeys as Array<Record<string, unknown>>,
    ).toHaveLength(1);
    expect(
      datasource(setup, 0).dataKeys as Array<Record<string, unknown>>,
    ).toHaveLength(1);
  });
});

describe('Data: timewindow override semantics', () => {
  it('switching OFF adopts the dashboard window as the widget baseline', () => {
    const setup = setupPanelSession();
    renderPanel(setup);
    expect(screen.getByTestId('panel-data-timewindow')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('panel-timewindow-override'));
    expect(configOf(setup).useDashboardTimewindow).toBe(false);
    expect(configOf(setup).timewindow).toEqual(setup.configuration.timewindow);
    expect(screen.getByTestId('panel-display-timewindow')).toBeInTheDocument();

    // back to the dashboard window: the private copy stays (harmless data)
    fireEvent.click(screen.getByTestId('panel-timewindow-override'));
    expect(configOf(setup).useDashboardTimewindow).toBe(true);
  });
});

describe('Data: page size (§3.4 Data extras)', () => {
  it('pageSize lands on the config', () => {
    const setup = setupPanelSession();
    renderPanel(setup);
    fireEvent.change(screen.getByTestId('panel-page-size'), {
      target: { value: '50' },
    });
    expect(configOf(setup).pageSize).toBe(50);
  });
});

describe('Widget card: css / style passthrough fields', () => {
  it('widgetCss and advanced style JSON write through', async () => {
    const setup = setupPanelSession();
    renderPanel(setup);
    fireEvent.click(screen.getByText('Widget 卡片'));

    // widgetCss lives in the expandable advanced-style panel (§3.4 扩展面板)
    fireEvent.click(screen.getByText('高级样式'));
    await waitFor(() => {
      expect(screen.getByTestId('panel-widget-css')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByTestId('panel-widget-css'), {
      target: { value: '.widget { border: 1px solid red; }' },
    });
    expect(configOf(setup).widgetCss).toBe(
      '.widget { border: 1px solid red; }',
    );

    // title tooltip passthrough
    fireEvent.click(screen.getByTestId('panel-show-title'));
    fireEvent.change(screen.getByTestId('panel-title-tooltip'), {
      target: { value: 'Live temperature' },
    });
    expect(configOf(setup).titleTooltip).toBe('Live temperature');
  });
});

describe('Actions editor (§3.4 slot 4)', () => {
  it('add / edit / remove an action on the default source', async () => {
    const setup = setupPanelSession();
    renderPanel(setup);
    fireEvent.click(screen.getByText('操作'));

    fireEvent.click(screen.getByTestId('panel-actions-headerButton-add'));
    const actions = () =>
      (
        configOf(setup).actions as Record<
          string,
          Array<Record<string, unknown>>
        >
      ).headerButton as Array<Record<string, unknown>>;
    expect(actions()).toHaveLength(1);
    expect(actions()[0]?.type).toBe('doNothing');

    fireEvent.change(screen.getByTestId('panel-actions-headerButton-0-name'), {
      target: { value: 'Open details' },
    });
    await pickSelectOption('panel-actions-headerButton-0-type', 'custom');
    expect(actions()[0]?.name).toBe('Open details');
    expect(actions()[0]?.type).toBe('custom');

    fireEvent.change(
      screen.getByTestId('panel-actions-headerButton-0-custom-fn'),
      { target: { value: 'window.open(url)' } },
    );
    expect(actions()[0]?.customFunction).toBe('window.open(url)');

    fireEvent.click(screen.getByTestId('panel-actions-headerButton-0-remove'));
    expect(actions()).toHaveLength(0);
  });
});

describe('Layout visibility matrix (§3.4 slot 5)', () => {
  it('non-default breakpoint shows the mobile/list group and writes the copy', () => {
    const setup = setupPanelSession(breakpointDashboardJson());
    renderPanel(setup);
    fireEvent.click(screen.getByText('布局'));

    expect(screen.getByTestId('panel-layout-breakpoint')).toBeInTheDocument();
    // default: only the resize pair
    expect(screen.queryByTestId('panel-layout-mobile-group')).toBeNull();

    fireEvent.click(screen.getByText('lg'));
    expect(screen.getByTestId('panel-layout-mobile-group')).toBeInTheDocument();
    // fixture: w1 is mobileHide: true in the lg copy
    expect(screen.getByTestId('panel-layout-mobile-hide')).toHaveAttribute(
      'aria-checked',
      'true',
    );

    fireEvent.click(screen.getByTestId('panel-layout-desktop-hide'));
    const main = setup.session.current.states.default.layouts
      .main as unknown as {
      breakpoints: Record<
        string,
        { widgets: Record<string, Record<string, unknown>> }
      >;
      widgets: Record<string, Record<string, unknown>>;
    };
    const breakpointLayout = main.breakpoints.lg?.widgets.w1;
    expect(breakpointLayout?.desktopHide).toBe(true);
    expect(breakpointLayout?.mobileHide).toBe(true);
    // the default placement is untouched
    expect(main.widgets.w1?.desktopHide).toBeUndefined();
  });

  it('scada layout shows only the resize pair, breakpoints structurally absent', () => {
    const setup = setupPanelSession(scadaDashboardJson());
    renderPanel(setup);
    fireEvent.click(screen.getByText('布局'));

    expect(screen.getByTestId('panel-layout-resizable')).toBeInTheDocument();
    expect(
      screen.getByTestId('panel-layout-preserve-aspect-ratio'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('panel-layout-breakpoint')).toBeNull();
    expect(screen.queryByTestId('panel-layout-mobile-group')).toBeNull();
  });

  it('default placement edits go through the shared updateWidgetLayout recipe', () => {
    const setup = setupPanelSession();
    renderPanel(setup);
    fireEvent.click(screen.getByText('布局'));

    fireEvent.click(screen.getByTestId('panel-layout-preserve-aspect-ratio'));
    const main = setup.session.current.states.default.layouts
      .main as unknown as {
      widgets: Record<string, Record<string, unknown>>;
    };
    expect(main.widgets.w1?.preserveAspectRatio).toBe(true);
    const group = setup.session.history.at(-1);
    expect(group?.label).toBe('update widget layout');
  });
});

describe('breakpoint copy materialization (panel recipe)', () => {
  it('first edit materializes a FULL snapshot copy (parent edits never bleed)', () => {
    const setup = setupPanelSession();
    act(() => {
      writeDraft(
        setup.session,
        updateWidgetBreakpointLayout({
          widgetId: 'w1',
          stateId: 'default',
          layoutId: 'main',
          breakpoint: 'xl',
          patch: { mobileHide: true },
        }),
      );
    });
    const main = setup.session.current.states.default.layouts
      .main as unknown as {
      breakpoints: Record<
        string,
        { widgets: Record<string, unknown>; gridSettings?: unknown }
      >;
    };
    expect(main.breakpoints.xl?.gridSettings).toMatchObject({
      columns: 24,
      margin: 10,
    });
    expect(main.breakpoints.xl?.widgets.wAlarm).toBeDefined();

    // reading helper resolves the copy
    const target = resolvePanelTarget(setup.session.current, 'w1');
    expect(target).not.toBeNull();
    expect(
      breakpointLayoutOf(
        setup.session.current,
        target as NonNullable<ReturnType<typeof resolvePanelTarget>>,
        'xl',
      )?.mobileHide,
    ).toBe(true);
  });
});

describe('panel pure helpers', () => {
  it('widgetKindOf derives the Data-section blocks from the config shape', () => {
    const { session } = setupPanelSession();
    expect(widgetKindOf(session.current.widgets.w1)).toBe('data');
    expect(widgetKindOf(session.current.widgets.wAlarm)).toBe('alarm');
    expect(widgetKindOf(session.current.widgets.wRpc)).toBe('rpc');
  });

  it('resolvePanelTarget prefers the root state and main layout', () => {
    const { session } = setupPanelSession();
    expect(resolvePanelTarget(session.current, 'w1')).toEqual({
      widgetId: 'w1',
      stateId: 'default',
      layoutId: 'main',
    });
    expect(resolvePanelTarget(session.current, 'missing')).toBeNull();
  });

  it('nextDataKeyColor walks the widget-local palette', () => {
    expect(nextDataKeyColor([[], []])).toBe('#2196f3');
    expect(nextDataKeyColor([[{ name: 'a', type: 'timeseries' }]])).toBe(
      '#4caf50',
    );
  });
});

describe('alarm widgets keep an alarmSource row (§3.4 Data)', () => {
  it('alarm source keys are typed alarm and write back into alarmSource', async () => {
    const setup = setupPanelSession();
    renderPanel(setup, 'wAlarm');

    // add a second alarm-typed key through the alarm source keys editor
    fireEvent.change(screen.getByTestId('panel-alarm-source-0-keys-add-name'), {
      target: { value: 'createdTime' },
    });
    await pickSelectOption('panel-alarm-source-0-keys-add-type', 'alarm');
    fireEvent.click(screen.getByTestId('panel-alarm-source-0-keys-add'));

    const alarmSource = setup.session.current.widgets.wAlarm.config
      .alarmSource as {
      type?: string;
      dataKeys: Array<Record<string, unknown>>;
    };
    expect(alarmSource.type).toBe('alarm');
    expect(alarmSource.dataKeys).toHaveLength(2);
    expect(alarmSource.dataKeys[1]).toMatchObject({
      name: 'createdTime',
      type: 'alarm',
    });
  });
});

describe('appearance data settings (§3.4 Appearance)', () => {
  it('units / decimals / no-data message write through', async () => {
    const setup = setupPanelSession();
    renderPanel(setup);
    fireEvent.click(screen.getByText('外观'));

    await waitFor(() => {
      expect(screen.getByTestId('panel-units')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByTestId('panel-units'), {
      target: { value: '°C' },
    });
    fireEvent.change(screen.getByTestId('panel-decimals'), {
      target: { value: '1' },
    });
    fireEvent.change(screen.getByTestId('panel-no-data-message'), {
      target: { value: '暂无数据' },
    });
    expect(configOf(setup).units).toBe('°C');
    expect(configOf(setup).decimals).toBe(1);
    expect(configOf(setup).noDataDisplayMessage).toBe('暂无数据');
  });
});
