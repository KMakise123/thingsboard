/**
 * WidgetConfigPanel tests (spec §3.4 + §3.9, M7 wave K): five-section chrome,
 * main-draft writes (WYSIWYG, no local copy), the panel checkpoint contract
 * (取消 rolls back as ONE group / every other close keeps changes), the
 * coalesced config path (fake-timers one-group), the alias-dialog trigger,
 * the basic/advanced mechanism (registry meta + probed react-1 descriptor),
 * the FormPropertyForm settings section unknown-key fidelity, and the P6
 * undo-safe field behavior (undo lands under a focused field without crash).
 *
 * Seams mocked per the frozen contracts: the dialogs host (P-wave dialog
 * bodies are placeholders) and the widgetType probe service.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { act, lazy } from 'react';
import { RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { WidgetComponent } from '@/components/widgets/contract';
import type { WidgetRegistryEntry } from '@/components/widgets/registry';
import { WIDGET_REGISTRY } from '@/components/widgets/registry';
import { COALESCE_WINDOW_MS } from '@/core/editor/session';
import {
  configOf,
  dataDashboardJson,
  intl,
  type PanelTestSetup,
  setupPanelSession,
} from './panel-test-fixtures';
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

const probeGetWidgetType = vi.hoisted(() => vi.fn());

vi.mock('@/services/tb/dashboard', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/services/tb/dashboard')>();
  return { ...actual, getWidgetTypeByFqn: probeGetWidgetType };
});

/** react-1 descriptor bodies the probe answers with (spec §3.4 ②). */
function stubProbe(): void {
  probeGetWidgetType.mockImplementation((fqn: string) => {
    if (fqn === 'system.react1.schema') {
      return Promise.resolve({
        fqn,
        descriptor: {
          runtime: 'react-1',
          settingsForm: [
            {
              id: 'showLegend',
              name: 'Show legend',
              type: 'switch',
              default: true,
            },
          ],
        },
      });
    }
    if (fqn === 'system.react1.basic') {
      return Promise.resolve({
        fqn,
        descriptor: {
          runtime: 'react-1',
          basicMode: {
            form: [{ id: 'title', name: 'Title', type: 'text', default: '' }],
          },
        },
      });
    }
    return Promise.reject(new Error(`widget type not found: ${fqn}`));
  });
}

function renderPanel(
  setup: PanelTestSetup,
  widgetId: string | null = 'w1',
  onClose: () => void = () => undefined,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <RawIntlProvider value={intl}>
      <QueryClientProvider client={queryClient}>
        <WidgetConfigPanel
          session={setup.session}
          widgetId={widgetId}
          onClose={onClose}
        />
      </QueryClientProvider>
    </RawIntlProvider>,
  );
}

function typeIntoTitle(setup: PanelTestSetup, text: string): HTMLInputElement {
  // The title input is disabled until 显示标题 is on (ui-ngx parity).
  fireEvent.click(screen.getByTestId('panel-show-title'));
  expect(configOf(setup).showTitle).toBe(true);
  const input = screen.getByTestId('panel-card-title') as HTMLInputElement;
  fireEvent.change(input, { target: { value: text } });
  expect(configOf(setup).title).toBe(text === '' ? undefined : text);
  return input;
}

async function openSection(label: string): Promise<void> {
  fireEvent.click(screen.getByText(label));
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  dialogController.openDialog.mockClear();
  probeGetWidgetType.mockReset();
  delete WIDGET_REGISTRY['system.test.basic'];
});

beforeEach(() => {
  stubProbe();
});

describe('WidgetConfigPanel chrome (§3.4 header)', () => {
  it('shows the empty placeholder when no widget is selected', () => {
    const setup = setupPanelSession();
    renderPanel(setup, null);
    const panel = screen.getByTestId('widget-config-panel');
    expect(panel.getAttribute('data-widget-id')).toBeNull();
    expect(screen.queryByTestId('panel-cancel')).toBeNull();
  });

  it('renders all five sections in ui-ngx header order', async () => {
    const setup = setupPanelSession();
    renderPanel(setup);

    expect(screen.getByTestId('widget-config-panel').dataset.widgetId).toBe(
      'w1',
    );
    expect(screen.getByTestId('panel-section-data')).toBeInTheDocument();

    await openSection('外观');
    expect(screen.getByTestId('panel-section-appearance')).toBeInTheDocument();

    await openSection('Widget 卡片');
    expect(screen.getByTestId('panel-section-widget-card')).toBeInTheDocument();

    await openSection('操作');
    expect(screen.getByTestId('panel-section-actions')).toBeInTheDocument();
    // Default action source (ui-ngx widgetActionSources fallback).
    expect(
      screen.getByTestId('panel-actions-headerButton'),
    ).toBeInTheDocument();

    await openSection('布局');
    expect(screen.getByTestId('panel-section-layout')).toBeInTheDocument();
    expect(screen.getByTestId('panel-layout-resizable')).toBeInTheDocument();
    expect(
      screen.getByTestId('panel-layout-preserve-aspect-ratio'),
    ).toBeInTheDocument();
    // No breakpoints in this fixture → breakpoint switcher absent.
    expect(screen.queryByTestId('panel-layout-breakpoint')).toBeNull();
  });

  it('section switch resets to Data when another widget is selected', async () => {
    const setup = setupPanelSession();
    const { rerender } = renderPanel(setup);
    await openSection('外观');
    expect(screen.getByTestId('panel-section-appearance')).toBeInTheDocument();
    rerender(
      <RawIntlProvider value={intl}>
        <QueryClientProvider client={new QueryClient()}>
          <WidgetConfigPanel
            session={setup.session}
            widgetId="wAlarm"
            onClose={() => undefined}
          />
        </QueryClientProvider>
      </RawIntlProvider>,
    );
    expect(screen.getByTestId('panel-section-data')).toBeInTheDocument();
  });
});

describe('panel writes land on the MAIN draft (§3.9 WYSIWYG)', () => {
  it('card title edit writes through the coalesced config recipe', () => {
    const setup = setupPanelSession();
    renderPanel(setup);
    fireEvent.click(screen.getByText('Widget 卡片'));

    typeIntoTitle(setup, 'Old title edited');
    const groups = setup.session.history.filter(
      (group) => group.coalesceKey === 'w1:config',
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBe('update widget config');
  });

  it('card switches edit the draft directly (no apply step)', () => {
    const setup = setupPanelSession();
    renderPanel(setup);
    fireEvent.click(screen.getByText('Widget 卡片'));

    fireEvent.click(screen.getByTestId('panel-show-title'));
    expect(configOf(setup).showTitle).toBe(true);
    expect(screen.getByTestId('panel-card-title')).not.toBeDisabled();
  });
});

describe('§3.9 panel checkpoint contract', () => {
  it('取消 rolls every post-open write back as ONE group (zero residue)', () => {
    const setup = setupPanelSession();
    const onClose = vi.fn();
    renderPanel(setup, 'w1', onClose);
    fireEvent.click(screen.getByText('Widget 卡片'));

    typeIntoTitle(setup, 'Old title edited');
    expect(setup.session.history).toHaveLength(1);

    fireEvent.click(screen.getByTestId('panel-cancel'));

    expect(onClose).toHaveBeenCalledTimes(1);
    // Values: zero residue vs the pre-open draft.
    expect(configOf(setup).title).toBe('Old title');
    expect(setup.session.current.widgets.w1.config).toEqual(
      setup.configuration.widgets.w1.config,
    );
    // Exactly ONE rollback group on top of the single edit group.
    expect(setup.session.history).toHaveLength(2);
    expect(setup.session.history[1]?.label).toBe('rollback: panel:w1');
  });

  it('取消 with no pending writes adds no rollback group', () => {
    const setup = setupPanelSession();
    renderPanel(setup);
    expect(setup.session.history).toHaveLength(0);

    fireEvent.click(screen.getByTestId('panel-cancel'));
    expect(setup.session.history).toHaveLength(0);
  });

  it('完成 and the header ✕ keep the changes (no rollback)', () => {
    const setup = setupPanelSession();
    const onClose = vi.fn();
    renderPanel(setup, 'w1', onClose);
    fireEvent.click(screen.getByText('Widget 卡片'));

    typeIntoTitle(setup, 'Kept title');
    fireEvent.click(screen.getByTestId('panel-done'));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(configOf(setup).title).toBe('Kept title');
    expect(setup.session.history).toHaveLength(1);

    // Header ✕ same semantics.
    fireEvent.click(screen.getByTestId('panel-close'));
    expect(onClose).toHaveBeenCalledTimes(2);
    expect(configOf(setup).title).toBe('Kept title');
    expect(setup.session.history).toHaveLength(1);
  });
});

describe('§3.9 coalesced continuous typing (fake timers)', () => {
  it('rapid keystrokes merge into one group until the 1s window lapses', () => {
    vi.useFakeTimers();
    const setup = setupPanelSession();
    renderPanel(setup);
    fireEvent.click(screen.getByText('Widget 卡片'));

    const input = typeIntoTitle(setup, 'Old title a');
    fireEvent.change(input, { target: { value: 'Old title ab' } });
    fireEvent.change(input, { target: { value: 'Old title abc' } });
    expect(
      setup.session.history.filter(
        (group) => group.coalesceKey === 'w1:config',
      ),
    ).toHaveLength(1);

    vi.advanceTimersByTime(COALESCE_WINDOW_MS + 50);
    fireEvent.change(input, { target: { value: 'Old title abcd' } });
    expect(
      setup.session.history.filter(
        (group) => group.coalesceKey === 'w1:config',
      ),
    ).toHaveLength(2);
  });
});

describe('P6 undo-safe focused field (brief §5)', () => {
  it('undo landing under a focused field shows the pre-edit value without crash', async () => {
    const setup = setupPanelSession();
    renderPanel(setup);
    fireEvent.click(screen.getByText('Widget 卡片'));

    const input = typeIntoTitle(setup, 'Old title X');
    expect(input.value).toBe('Old title X');

    act(() => {
      setup.session.undo();
    });
    await waitFor(() => {
      expect(input.value).toBe('Old title');
    });
    expect(configOf(setup).title).toBe('Old title');
    expect(screen.getByTestId('widget-config-panel')).toBeInTheDocument();
  });
});

describe('alias dialog trigger (§3.4 别名闭环)', () => {
  it('inline create opens the alias dialog and applies the saved alias', () => {
    const setup = setupPanelSession();
    renderPanel(setup);

    fireEvent.click(screen.getByTestId('panel-datasources-0-alias-new'));
    expect(dialogController.openDialog).toHaveBeenCalledWith(
      'alias',
      expect.objectContaining({ onSaved: expect.any(Function) }),
    );
    const payload = dialogController.openDialog.mock.calls[0]?.[1] as {
      onSaved: (saved?: unknown) => void;
    };
    act(() => {
      payload.onSaved({ id: 'alias2' });
    });
    expect(
      (configOf(setup).datasources?.[0] as { entityAliasId?: string })
        ?.entityAliasId,
    ).toBe('alias2');
  });

  it('edit reuses the alias dialog with the row alias id', () => {
    const setup = setupPanelSession();
    renderPanel(setup);

    fireEvent.click(screen.getByTestId('panel-datasources-0-alias-edit'));
    expect(dialogController.openDialog).toHaveBeenCalledWith('alias', {
      aliasId: 'alias1',
    });
  });
});

describe('basic / advanced switch (§3.4)', () => {
  it('registry meta.basicMode reveals the header switch and basic form', () => {
    const stubComponent = lazy(() =>
      Promise.resolve({ default: (() => null) as WidgetComponent }),
    );
    WIDGET_REGISTRY['system.test.basic'] = {
      component: stubComponent as unknown as WidgetRegistryEntry['component'],
      meta: {
        basicMode: {
          form: [{ id: 'title', name: 'Title', type: 'text', default: '' }],
        },
      },
    };
    const json = dataDashboardJson();
    (
      json.configuration as { widgets: Record<string, { typeFullFqn: string }> }
    ).widgets.w1.typeFullFqn = 'system.test.basic';
    const setup = setupPanelSession(json);
    renderPanel(setup);

    // Advanced (sections) is the default form.
    expect(screen.getByTestId('panel-section-data')).toBeInTheDocument();
    expect(screen.getByTestId('panel-basic-advanced')).toBeInTheDocument();

    fireEvent.click(screen.getByText('基础'));
    expect(configOf(setup).configMode).toBe('basic');
    expect(screen.queryByTestId('panel-section-data')).toBeNull();
    expect(screen.getByTestId('panel-basic-config')).toBeInTheDocument();

    // The basic form edits the whole config through FormPropertyForm.
    fireEvent.change(
      screen
        .getByTestId('form-property-title')
        .querySelector('input') as HTMLInputElement,
      { target: { value: 'basic title' } },
    );
    expect(configOf(setup).title).toBe('basic title');

    fireEvent.click(screen.getByText('高级'));
    expect(configOf(setup).configMode).toBe('advanced');
    expect(screen.getByTestId('panel-section-data')).toBeInTheDocument();
  });

  it('a probed react-1 descriptor.basicMode also enables the switch', async () => {
    const json = dataDashboardJson();
    (
      json.configuration as { widgets: Record<string, { typeFullFqn: string }> }
    ).widgets.w1.typeFullFqn = 'system.react1.basic';
    const setup = setupPanelSession(json);
    renderPanel(setup);

    await waitFor(() => {
      expect(screen.getByTestId('panel-basic-advanced')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('基础'));
    expect(configOf(setup).configMode).toBe('basic');
    expect(screen.getByTestId('panel-basic-config')).toBeInTheDocument();
  });

  it('no basicMode declaration → no switch, sections only', () => {
    const setup = setupPanelSession();
    renderPanel(setup);
    expect(screen.queryByTestId('panel-basic-advanced')).toBeNull();
    expect(screen.getByTestId('panel-section-data')).toBeInTheDocument();
  });
});

describe('Appearance advanced settings via FormPropertyForm (ADR 0004)', () => {
  it('renders the probed settingsForm and preserves unknown settings keys', async () => {
    const json = dataDashboardJson();
    (
      json.configuration as { widgets: Record<string, { typeFullFqn: string }> }
    ).widgets.w1.typeFullFqn = 'system.react1.schema';
    const setup = setupPanelSession(json);
    renderPanel(setup);
    await openSection('外观');

    await waitFor(() => {
      expect(
        screen.getByTestId('form-property-showLegend'),
      ).toBeInTheDocument();
    });
    fireEvent.click(
      screen
        .getByTestId('form-property-showLegend')
        .querySelector('[role="switch"]') as HTMLElement,
    );

    const settings = configOf(setup).settings as Record<string, unknown>;
    expect(settings.showLegend).toBe(false);
    // Unknown-key fidelity: keys outside the schema round-trip untouched.
    expect(settings.customKey).toEqual({ nested: 1 });
  });

  it('no schema anywhere → honest empty state (no 即将支持)', async () => {
    const setup = setupPanelSession();
    renderPanel(setup);
    await openSection('外观');

    await waitFor(() => {
      expect(screen.getByTestId('panel-settings-empty')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('form-property-form')).toBeNull();
  });
});

describe('panel triggers the probe per frozen key', () => {
  it('probes ["widgetType", fqn] once per selection', async () => {
    const setup = setupPanelSession();
    renderPanel(setup);
    await waitFor(() => {
      expect(probeGetWidgetType).toHaveBeenCalledWith(
        'system.time_series_chart',
      );
    });
  });
});

describe('data section widget-kind blocks (§3.4 Data)', () => {
  it('alarm widget: filter + alarm source, no timewindow/datasources', () => {
    const setup = setupPanelSession();
    renderPanel(setup, 'wAlarm');
    expect(screen.getByTestId('panel-alarm-filter')).toBeInTheDocument();
    expect(screen.getByTestId('panel-alarm-source')).toBeInTheDocument();
    expect(screen.queryByTestId('panel-data-timewindow')).toBeNull();
    expect(screen.queryByTestId('panel-datasources')).toBeNull();
  });

  it('alarm filter offers the dashboard filters and the inline sentinel', () => {
    const setup = setupPanelSession();
    renderPanel(setup, 'wAlarm');
    fireEvent.click(screen.getByTestId('panel-alarm-filter-new'));
    expect(dialogController.openDialog).toHaveBeenCalledWith(
      'filters',
      expect.objectContaining({ onSaved: expect.any(Function) }),
    );
  });

  it('rpc widget: target device block with device/entity split', () => {
    const setup = setupPanelSession();
    renderPanel(setup, 'wRpc');
    expect(screen.getByTestId('panel-target-device')).toBeInTheDocument();
    expect(
      (screen.getByTestId('panel-target-device-value') as HTMLInputElement)
        .value,
    ).toBe('device-1');
    expect(screen.queryByTestId('panel-datasources')).toBeNull();
  });
});

describe('data dashboard fixture sanity', () => {
  it('w1 fixture carries the baseline the tests assert on', () => {
    const setup = setupPanelSession();
    expect(configOf(setup).title).toBe('Old title');
    expect(configOf(setup).datasources).toHaveLength(1);
  });
});
