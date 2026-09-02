/**
 * system.cards.entities_table against the REAL anchor config shape
 * (firmware.json "New Entities table": All-devices alias + datasource
 * filterId → WaitingDevicesFilter keyFilters, mixed attribute/timeseries
 * columns with units/decimals, headerButton openDashboardState action).
 * The WS manager rides the setDefaultWsManager seam.
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StatesController } from '@/components/dashboard/use-states-controller';
import type { DashboardStateParams } from '@/core/dashboard/states';
import type {
  EntityDataParams,
  EntityDataSubscription,
  EntityDataWire,
  WsManager,
  WsStatus,
} from '@/core/ws';
import { setDefaultWsManager } from '@/core/ws';
import zhDashboards from '@/locales/zh-CN/dashboards';
import { EntityType } from '@/types/tb/entity';
import type { Widget, WidgetLayout } from '@/types/tb/widget';
import EntitiesTable from './entities-table';

interface StubEntityDataSubscription extends EntityDataSubscription {
  emit: (rows: Array<EntityDataWire>) => void;
  params: EntityDataParams;
}

let stubSubscriptions: StubEntityDataSubscription[];
let stubManager: WsManager;

function makeStubManager() {
  stubSubscriptions = [];
  stubManager = {
    subscribeEntityData: (params: EntityDataParams) => {
      const listeners = new Set<() => void>();
      let snapshot: Array<EntityDataWire> = [];
      const subscription: StubEntityDataSubscription = {
        params,
        getSnapshot: () => snapshot,
        getStatus: () => 'open' as WsStatus,
        subscribe(listener: () => void) {
          listeners.add(listener);
          return () => {
            listeners.delete(listener);
          };
        },
        unsubscribe: vi.fn(),
        update: vi.fn(),
        emit(rows: Array<EntityDataWire>) {
          snapshot = rows;
          for (const listener of listeners) {
            listener();
          }
        },
      };
      stubSubscriptions.push(subscription);
      return subscription;
    },
    close: vi.fn(),
  } as unknown as WsManager;
  setDefaultWsManager(stubManager);
}

// --- anchor fixture (firmware.json widget 21be08bb "Waiting devices" table,
// trimmed to fields the component reads) --------------------------------------

function anchorEntitiesTableWidget(): Widget {
  return {
    typeFullFqn: 'system.cards.entities_table',
    sizeX: 7.5,
    sizeY: 6.5,
    row: 0,
    col: 0,
    config: {
      title: 'New Entities table',
      showTitle: true,
      useDashboardTimewindow: false,
      datasources: [
        {
          type: 'entity',
          entityAliasId: 'all-devices',
          filterId: 'waiting-filter',
          dataKeys: [
            {
              name: 'current_fw_title',
              type: 'timeseries',
              label: 'Current FW title',
              color: '#2196f3',
              settings: {},
            },
            {
              name: 'current_fw_version',
              type: 'timeseries',
              label: 'Current FW version',
              color: '#4caf50',
              settings: {},
            },
            {
              name: 'fw_state',
              type: 'timeseries',
              label: 'FW state',
              color: '#ffc107',
              settings: {},
            },
          ],
        },
      ],
      actions: {
        headerButton: [
          {
            name: 'Edit location',
            type: 'openDashboardState',
            targetDashboardStateId: 'map',
            setEntityId: false,
          },
        ],
      },
      settings: {
        enableSearch: true,
        displayPagination: true,
        defaultPageSize: 10,
        defaultSortOrder: 'entityName',
        displayEntityName: true,
        displayEntityType: false,
        entitiesTitle: 'Devices',
        displayEntityLabel: false,
        entityNameColumnTitle: 'Device',
      },
    },
  };
}

const layout: WidgetLayout = { sizeX: 7.5, sizeY: 6.5, row: 0, col: 0 };

const dashboardTimewindow = {
  selectedTab: 'REALTIME' as const,
  realtime: { timewindowMs: 3_600_000 },
};

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

const datasource = {
  type: 'entity' as const,
  entities: [
    { entityType: EntityType.DEVICE, id: 'dev-1', name: 'Thermometer 1' },
    { entityType: EntityType.DEVICE, id: 'dev-2', name: 'Thermometer 2' },
  ],
  dataKeys: anchorEntitiesTableWidget().config.datasources?.[0]?.dataKeys ?? [],
  filter: {
    id: 'waiting-filter',
    filter: 'WaitingDevicesFilter',
    keyFilters: [{ key: { type: 'TIME_SERIES', key: 'fw_state' } }],
  },
};

function renderTable(widget: Widget) {
  return render(
    <RawIntlProvider value={intl}>
      <EntitiesTable
        fqn="system.cards.entities_table"
        widgetId="w-table"
        widget={widget}
        layout={layout}
        ctx={{
          effectiveTimewindow: dashboardTimewindow,
          aliases: {},
          datasources: [datasource],
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

describe('entities_table (anchor: firmware waiting-devices table)', () => {
  it('renders the real component (no placeholder) with anchor settings', () => {
    renderTable(anchorEntitiesTableWidget());
    expect(document.querySelector('[data-widget-placeholder]')).toBeNull();
    expect(screen.getByText('New Entities table')).toBeInTheDocument();
    // entityNameColumnTitle from settings
    expect(screen.getByText('Device')).toBeInTheDocument();
    expect(screen.getByText('Current FW title')).toBeInTheDocument();
  });

  it('subscribes with entityList filter, latest values and the datasource keyFilters', async () => {
    renderTable(anchorEntitiesTableWidget());
    await waitFor(() => {
      expect(stubSubscriptions).toHaveLength(1);
    });
    const query = stubSubscriptions[0].params.query;
    expect(query?.entityFilter).toEqual({
      type: 'entityList',
      entityType: 'DEVICE',
      entityList: ['dev-1', 'dev-2'],
    });
    expect(query?.latestValues).toEqual([
      { type: 'TIME_SERIES', key: 'current_fw_title' },
      { type: 'TIME_SERIES', key: 'current_fw_version' },
      { type: 'TIME_SERIES', key: 'fw_state' },
    ]);
    // the datasource-level filter rides the server-side query
    expect(query?.keyFilters).toEqual([
      { key: { type: 'TIME_SERIES', key: 'fw_state' } },
    ]);
    expect(query?.pageLink?.sortOrder).toMatchObject({
      key: { type: 'ENTITY_FIELD', key: 'name' },
      direction: 'ASC',
    });
  });

  it('renders entity rows with formatted latest values and sorts by name', async () => {
    renderTable(anchorEntitiesTableWidget());
    await waitFor(() => {
      expect(stubSubscriptions[0]).toBeTruthy();
    });
    stubSubscriptions[0].emit([
      {
        entityId: { entityType: EntityType.DEVICE, id: 'dev-2' },
        latest: {
          ENTITY_FIELD: { name: { ts: 1, value: 'Thermometer 2' } },
          TIME_SERIES: {
            current_fw_title: { ts: 5, value: 'thermo-fw' },
            current_fw_version: { ts: 5, value: '1.1' },
            fw_state: { ts: 5, value: 'QUEUED' },
          },
        },
      },
      {
        entityId: { entityType: EntityType.DEVICE, id: 'dev-1' },
        latest: {
          ENTITY_FIELD: { name: { ts: 1, value: 'Thermometer 1' } },
          TIME_SERIES: {
            current_fw_title: { ts: 5, value: 'thermo-fw' },
            current_fw_version: { ts: 5, value: '1.0' },
            fw_state: { ts: 5, value: 'QUEUED' },
          },
        },
      },
    ]);
    await waitFor(() => {
      expect(screen.getByText('Thermometer 1')).toBeInTheDocument();
    });
    expect(screen.getAllByText('QUEUED')).toHaveLength(2);
    // sorted by entity name asc: Thermometer 1 row is first in the body
    const rows = document.querySelectorAll('.ant-table-tbody .ant-table-row');
    expect(rows[0]?.textContent).toContain('Thermometer 1');
    expect(rows[1]?.textContent).toContain('Thermometer 2');
  });

  it('filters rows through the search box', async () => {
    renderTable(anchorEntitiesTableWidget());
    await waitFor(() => {
      expect(stubSubscriptions[0]).toBeTruthy();
    });
    stubSubscriptions[0].emit([
      {
        entityId: { entityType: EntityType.DEVICE, id: 'dev-1' },
        latest: {
          ENTITY_FIELD: { name: { ts: 1, value: 'Thermometer 1' } },
          TIME_SERIES: { fw_state: { ts: 5, value: 'QUEUED' } },
        },
      },
      {
        entityId: { entityType: EntityType.DEVICE, id: 'dev-2' },
        latest: {
          ENTITY_FIELD: { name: { ts: 1, value: 'Sensor 9' } },
          TIME_SERIES: { fw_state: { ts: 5, value: 'QUEUED' } },
        },
      },
    ]);
    await waitFor(() => {
      expect(screen.getByText('Thermometer 1')).toBeInTheDocument();
    });
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'thermo' },
    });
    await waitFor(() => {
      expect(screen.queryByText('Sensor 9')).toBeNull();
    });
    expect(screen.getByText('Thermometer 1')).toBeInTheDocument();
  });

  it('renders headerButton openDashboardState actions via the states controller', async () => {
    renderTable(anchorEntitiesTableWidget());
    const button = await screen.findByText('Edit location');
    fireEvent.click(button);
    expect(statesStub.openState).toHaveBeenCalledWith('map');
  });
});
