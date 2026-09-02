/**
 * system.cards.html_value_card against the REAL anchor config shape
 * (firmware.json waiting-devices card): entityCount datasource + count key
 * labeled `waitingDevicesNumber` + datasource filterId keyFilters, cardHtml
 * template `${waitingDevicesNumber:0}` and scoped cardCss. The WS manager
 * rides the setDefaultWsManager seam.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StatesController } from '@/components/dashboard/use-states-controller';
import type { DashboardStateParams } from '@/core/dashboard/states';
import type { WsManager, WsStatus, WsSubscription } from '@/core/ws';
import { setDefaultWsManager } from '@/core/ws';
import zhDashboards from '@/locales/zh-CN/dashboards';
import { EntityType } from '@/types/tb/entity';
import type { Widget, WidgetLayout } from '@/types/tb/widget';
import HtmlValueCard, { scopeCss } from './html-value-card';

interface StubSubscription extends WsSubscription<number> {
  emit: (count: number) => void;
}

let stubCountSubs: StubSubscription[];
let stubLatestSubs: Array<{
  keys?: Array<string>;
  emit: (data: Array<{ key: string; value: unknown }>) => void;
}>;
let stubManager: WsManager;

function makeStubManager() {
  stubCountSubs = [];
  stubLatestSubs = [];
  stubManager = {
    subscribeEntityCount: () => {
      const listeners = new Set<() => void>();
      let snapshot = 0;
      const subscription: StubSubscription = {
        getSnapshot: () => snapshot,
        getStatus: () => 'open' as WsStatus,
        subscribe(listener: () => void) {
          listeners.add(listener);
          return () => {
            listeners.delete(listener);
          };
        },
        unsubscribe: vi.fn(),
        emit(count: number) {
          snapshot = count;
          for (const listener of listeners) {
            listener();
          }
        },
      };
      stubCountSubs.push(subscription);
      return subscription;
    },
    subscribeLatestTelemetry: (params: { keys?: Array<string> }) => {
      const listeners = new Set<() => void>();
      let snapshot: Array<{ key: string; value: unknown }> = [];
      const subscription = {
        getSnapshot: () => snapshot,
        getStatus: () => 'open' as WsStatus,
        subscribe(listener: () => void) {
          listeners.add(listener);
          return () => {
            listeners.delete(listener);
          };
        },
        unsubscribe: vi.fn(),
        emit: (data: Array<{ key: string; value: unknown }>) => {
          snapshot = data;
          for (const listener of listeners) {
            listener();
          }
        },
        keys: params.keys,
      };
      stubLatestSubs.push(subscription);
      return subscription as unknown as WsSubscription<
        Array<{ key: string; value: unknown }>
      >;
    },
    close: vi.fn(),
  } as unknown as WsManager;
  setDefaultWsManager(stubManager);
}

// --- anchor fixture (firmware.json widget 17543c57, trimmed) -----------------

function anchorHtmlCardWidget(): Widget {
  return {
    typeFullFqn: 'system.cards.html_value_card',
    sizeX: 8,
    sizeY: 3,
    row: 0,
    col: 0,
    config: {
      title: 'New HTML Value Card',
      showTitle: false,
      useDashboardTimewindow: true,
      datasources: [
        {
          type: 'entityCount',
          entityAliasId: 'all-devices',
          filterId: 'waiting-filter',
          dataKeys: [
            {
              name: 'count',
              type: 'count',
              label: 'waitingDevicesNumber',
              color: '#4caf50',
              settings: {},
            },
          ],
        },
      ],
      settings: {
        cardHtml:
          "<div class='card'><div class='content'>" +
          "<div class='value'>${waitingDevicesNumber:0}</div>" +
          "<div class='description'>Device Waiting</div>" +
          '</div></div>',
        cardCss:
          '.card { width: 100%; height: 100%; }\n@media (min-width: 960px) {\n  .card .value { font-size: 2em; }\n}',
      },
    },
  };
}

const layout: WidgetLayout = { sizeX: 8, sizeY: 3, row: 0, col: 0 };

const statesStub: StatesController = {
  mode: 'entity',
  stateObject: [{ id: 'default', params: {} }],
  currentStateId: 'default',
  currentStateParams: {} as DashboardStateParams,
  breadcrumbs: [],
  openState: vi.fn(),
  navigatePrev: vi.fn(),
  resetState: vi.fn(),
};

const intl = createIntl({ locale: 'zh-CN', messages: { ...zhDashboards } });

function renderCard(widget: Widget) {
  return render(
    <RawIntlProvider value={intl}>
      <HtmlValueCard
        fqn="system.cards.html_value_card"
        widgetId="w-card"
        widget={widget}
        layout={layout}
        ctx={{
          effectiveTimewindow: { selectedTab: 'REALTIME' },
          aliases: {},
          datasources: [
            {
              type: 'entityCount',
              entities: [
                { entityType: EntityType.DEVICE, id: 'dev-1' },
                { entityType: EntityType.DEVICE, id: 'dev-2' },
              ],
              dataKeys: widget.config.datasources?.[0]?.dataKeys ?? [],
              filter: {
                id: 'waiting-filter',
                filter: 'WaitingDevicesFilter',
                keyFilters: [{ key: { type: 'TIME_SERIES', key: 'fw_state' } }],
              },
            },
          ],
          states: statesStub,
          isMobile: false,
        }}
      />
    </RawIntlProvider>,
  );
}

beforeEach(() => {
  makeStubManager();
});

afterEach(() => {
  cleanup();
  setDefaultWsManager(null);
});

describe('html_value_card (anchor: firmware waiting-devices card)', () => {
  it('renders the real component (no placeholder) with the scoped card markup', () => {
    renderCard(anchorHtmlCardWidget());
    expect(document.querySelector('[data-widget-placeholder]')).toBeNull();
    expect(document.querySelector('[class*="tb-html-card-"]')).not.toBeNull();
    expect(screen.getByText('Device Waiting')).toBeInTheDocument();
  });

  it('subscribes entityCount with the datasource keyFilters and binds the live count', async () => {
    renderCard(anchorHtmlCardWidget());
    await waitFor(() => {
      expect(stubCountSubs).toHaveLength(1);
    });
    expect(stubCountSubs[0].getSnapshot()).toBe(0);

    stubCountSubs[0].emit(7);
    await waitFor(() => {
      expect(screen.getByText('7')).toBeInTheDocument();
    });
    expect(screen.queryByText('Device Waiting')).toBeInTheDocument();
  });

  it('formats the bound value with the template decimals', async () => {
    renderCard(anchorHtmlCardWidget());
    await waitFor(() => {
      expect(stubCountSubs[0]).toBeTruthy();
    });
    stubCountSubs[0].emit(3);
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  it('scopes author CSS under the instance class and keeps @media prelude', () => {
    renderCard(anchorHtmlCardWidget());
    const style = document.querySelector('style');
    expect(style?.textContent).toContain('.card {');
    const scoped = style?.textContent ?? '';
    expect(scoped).toMatch(/\.tb-html-card-[a-zA-Z0-9-]+ \.card \{/);
    expect(scoped).toContain('@media (min-width: 960px)');
    // inner rules of the media block are scoped too
    expect(scoped).toMatch(/\.tb-html-card-[a-zA-Z0-9-]+ \.card \.value \{/);
  });

  it('scopeCss prefixes comma selectors and preserves at-rules', () => {
    const css = scopeCss(
      '.a, .b { color: red; } @media print { .c { } }',
      'sc',
    );
    expect(css).toContain('.sc .a, .sc .b');
    expect(css).toContain('@media print');
    expect(css).toContain('.sc .c');
  });
});
