/**
 * system.map against the REAL anchor config shape (thermostats.json "Map"):
 * markers over the Thermostats alias, xKey/yKey latitude+longitude
 * attributes, temperature/humidity/active tooltip bindings with decimals and
 * a navigate_to_details link-act → chart state. leaflet is stubbed (real
 * tiles/DOM layout are unavailable under happy-dom); the entity latest-data
 * channel rides the setDefaultWsManager seam.
 */
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
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
import GeoMap from './map';

const leafletMock = vi.hoisted(() => {
  const markerStubs: Array<{
    coords: [number, number];
    bindPopup: ReturnType<typeof vi.fn>;
    addTo: ReturnType<typeof vi.fn>;
  }> = [];
  const mapStub = {
    remove: vi.fn(),
    fitBounds: vi.fn(),
    setView: vi.fn(),
    on: vi.fn(),
  };
  const groupStub: {
    clearLayers: ReturnType<typeof vi.fn>;
    addTo: ReturnType<typeof vi.fn>;
  } = {
    clearLayers: vi.fn(),
    addTo: vi.fn(() => groupStub), // real leaflet addTo returns the layer
  };
  const stub = {
    markerStubs,
    mapStub,
    groupStub,
    map: vi.fn(() => mapStub),
    tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
    layerGroup: vi.fn(() => groupStub),
    circleMarker: vi.fn((coords: [number, number], options: unknown) => {
      const marker = {
        coords,
        options,
        bindPopup: vi.fn(),
        addTo: vi.fn(),
      };
      markerStubs.push(marker);
      return marker;
    }),
    latLngBounds: vi.fn((coords: unknown) => ({
      coords,
      pad: vi.fn(() => 'padded-bounds'),
    })),
  };
  return stub;
});
vi.mock('leaflet', () => leafletMock);

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

// --- anchor fixture (thermostats.json map widget 5186d1e3, trimmed) ----------

function anchorMapWidget(): Widget {
  return {
    typeFullFqn: 'system.map',
    sizeX: 8.5,
    sizeY: 6,
    row: 0,
    col: 0,
    config: {
      title: 'Map',
      showTitle: false,
      datasources: [],
      settings: {
        layers: [
          {
            provider: 'openstreet',
            layerType: 'OpenStreetMap.Mapnik',
          },
        ],
        markers: [
          {
            dsEntityAliasId: 'thermostats',
            xKey: { name: 'latitude', label: 'latitude', type: 'attribute' },
            yKey: { name: 'longitude', label: 'longitude', type: 'attribute' },
            additionalDataKeys: [
              { name: 'temperature', type: 'timeseries', label: 'temperature' },
              { name: 'humidity', type: 'timeseries', label: 'humidity' },
              { name: 'active', type: 'attribute', label: 'active' },
            ],
            tooltip: {
              show: true,
              pattern:
                '<b>${entityName}</b><br/><b>Temperature:</b> ${temperature:1} °C' +
                '<link-act name="navigate_to_details">Thermostat details</link-act>',
              tagActions: [
                {
                  name: 'navigate_to_details',
                  type: 'openDashboardState',
                  targetDashboardStateId: 'chart',
                  setEntityId: true,
                },
              ],
            },
            markerShape: {
              shape: 'markerShape1',
              size: 34,
              color: { type: 'constant', color: '#307FE5' },
            },
          },
        ],
        fitMapBounds: true,
        defaultZoomLevel: 14,
      },
    },
  };
}

const layout: WidgetLayout = { sizeX: 8.5, sizeY: 6, row: 0, col: 0 };

const statesStub: StatesController = {
  mode: 'entity',
  stateObject: [{ id: 'map', params: {} }],
  currentStateId: 'map',
  currentStateParams: {} as DashboardStateParams,
  breadcrumbs: [],
  openState: vi.fn(),
  navigatePrev: vi.fn(),
  resetState: vi.fn(),
};

const intl = createIntl({ locale: 'zh-CN', messages: { ...zhDashboards } });

const entities = [
  { entityType: EntityType.DEVICE, id: 'therm-1', name: 'Thermostat A' },
];

function renderMap(widget: Widget) {
  return render(
    <RawIntlProvider value={intl}>
      <GeoMap
        fqn="system.map"
        widgetId="w-map"
        widget={widget}
        layout={layout}
        ctx={{
          effectiveTimewindow: { selectedTab: 'REALTIME' },
          aliases: { thermostats: entities },
          datasources: [],
          states: statesStub,
          isMobile: false,
        }}
      />
    </RawIntlProvider>,
  );
}

beforeEach(() => {
  makeStubManager();
  leafletMock.markerStubs.length = 0;
  leafletMock.map.mockClear();
  leafletMock.tileLayer.mockClear();
  leafletMock.circleMarker.mockClear();
  leafletMock.latLngBounds.mockClear();
  leafletMock.mapStub.fitBounds.mockClear();
});

afterEach(() => {
  cleanup();
  setDefaultWsManager(null);
});

describe('system.map (anchor: thermostats map, leaflet direct)', () => {
  it('renders the real component (no placeholder) with the OSM tile layer', () => {
    renderMap(anchorMapWidget());
    expect(document.querySelector('[data-widget-placeholder]')).toBeNull();
    expect(
      document.querySelector('[data-widget="system.map"] [data-map-container]'),
    ).not.toBeNull();
    expect(leafletMock.map).toHaveBeenCalled();
    expect(leafletMock.tileLayer).toHaveBeenCalledWith(
      'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      expect.objectContaining({ maxZoom: 18 }),
    );
  });

  it('subscribes the marker alias entities for lat/lng + tooltip keys', async () => {
    renderMap(anchorMapWidget());
    await waitFor(() => {
      expect(stubSubscriptions).toHaveLength(1);
    });
    expect(stubSubscriptions[0].params.query?.entityFilter).toEqual({
      type: 'entityList',
      entityType: 'DEVICE',
      entityList: ['therm-1'],
    });
    expect(stubSubscriptions[0].params.query?.latestValues).toEqual([
      { type: 'ATTRIBUTE', key: 'latitude' },
      { type: 'ATTRIBUTE', key: 'longitude' },
      { type: 'TIME_SERIES', key: 'temperature' },
      { type: 'TIME_SERIES', key: 'humidity' },
      { type: 'ATTRIBUTE', key: 'active' },
    ]);
  });

  it('places markers from the latest lat/lng and interpolates the tooltip pattern', async () => {
    renderMap(anchorMapWidget());
    await waitFor(() => {
      expect(stubSubscriptions[0]).toBeTruthy();
    });
    stubSubscriptions[0].emit([
      {
        entityId: { entityType: EntityType.DEVICE, id: 'therm-1' },
        latest: {
          ATTRIBUTE: {
            latitude: { ts: 1, value: '44.18' },
            longitude: { ts: 1, value: '-84.74' },
            active: { ts: 1, value: 'true' },
          },
          TIME_SERIES: {
            temperature: { ts: 2, value: '21.534' },
            humidity: { ts: 2, value: '58' },
          },
        },
      },
    ]);
    await waitFor(() => {
      expect(leafletMock.circleMarker).toHaveBeenCalled();
    });
    expect(leafletMock.circleMarker.mock.calls[0]?.[0]).toEqual([
      44.18, -84.74,
    ]);
    expect(leafletMock.mapStub.fitBounds).toHaveBeenCalled();
    const popupHtml = leafletMock.markerStubs[0]?.bindPopup.mock
      .calls[0]?.[0] as string;
    expect(popupHtml).toContain('<b>Thermostat A</b>');
    expect(popupHtml).toContain('21.5 °C');
    expect(popupHtml).toContain('data-state-target="chart"');
    expect(popupHtml).toContain('data-set-entity="1"');
  });

  it('routes link-act clicks through the states controller with the entity', async () => {
    renderMap(anchorMapWidget());
    await waitFor(() => {
      expect(stubSubscriptions[0]).toBeTruthy();
    });
    stubSubscriptions[0].emit([
      {
        entityId: { entityType: EntityType.DEVICE, id: 'therm-1' },
        latest: {
          ATTRIBUTE: {
            latitude: { ts: 1, value: '44.18' },
            longitude: { ts: 1, value: '-84.74' },
          },
        },
      },
    ]);
    await waitFor(() => {
      expect(leafletMock.circleMarker).toHaveBeenCalled();
    });
    const container = document.querySelector(
      '[data-map-container]',
    ) as HTMLElement;
    const holder = document.createElement('div');
    holder.setAttribute('data-entity-id', 'therm-1');
    holder.innerHTML =
      '<span class="tb-map-link-act" data-state-target="chart" data-set-entity="1">Thermostat details</span>';
    container.appendChild(holder);
    fireEvent.click(holder.querySelector('.tb-map-link-act') as HTMLElement);
    expect(statesStub.openState).toHaveBeenCalledWith('chart', {
      entityId: { entityType: EntityType.DEVICE, id: 'therm-1' },
      entityName: 'Thermostat A',
      entityLabel: undefined,
    });
  });
});
