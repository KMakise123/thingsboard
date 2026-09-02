/**
 * system.map — geo map widget (leaflet direct; brief §6 W2 spike verdict:
 * no heavyweight wrapper library).
 *
 * Anchor reality (thermostats ×3 "Map"): config.settings.markers[] describe
 * the layers — each references an entity alias (dsEntityAliasId), xKey
 * (latitude attribute), yKey (longitude attribute) and additionalDataKeys
 * (tooltip bindings). Tiles come from settings.layers (openstreet provider:
 * OpenStreetMap.Mapnik / Esri.WorldImagery). The tooltip pattern carries
 * ${key:decimals} bindings and <link-act> tag actions whose
 * openDashboardState entries drill down via ctx.states (anchor:
 * navigate_to_details → chart state).
 *
 * v1 simplifications (registered): marker images/clustering/polygons/
 * circles and markerIcon colorFunction scripts (JS) stay unevaluated —
 * markers render as colored circle markers.
 */

import * as L from 'leaflet';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import 'leaflet/dist/leaflet.css';
import type { ResolvedEntity } from '@/core/dashboard/alias-resolver';
import type { ExpandedDatasource } from '@/core/dashboard/datasources';
import type { DataKey } from '@/types/tb/widget';
import type { WidgetComponentProps } from './contract';
import { useEntityLatestData } from './hooks/use-entity-latest';
import {
  interpolateStateParams,
  resolveI18nMessage,
} from './hooks/widget-text';

interface MapLayerConfig {
  provider?: string;
  layerType?: string;
  url?: string;
}

interface MapMarkerConfig {
  dsEntityAliasId?: string | null;
  xKey?: Partial<DataKey>;
  yKey?: Partial<DataKey>;
  additionalDataKeys?: Array<DataKey>;
  label?: { pattern?: string; show?: boolean };
  tooltip?: {
    show?: boolean;
    pattern?: string;
    tagActions?: Array<{
      name?: string;
      type?: string;
      targetDashboardStateId?: string;
      setEntityId?: boolean;
    }>;
  };
  markerShape?: { color?: { type?: string; color?: string } };
}

interface MapSettings {
  layers?: Array<MapLayerConfig>;
  markers?: Array<MapMarkerConfig>;
  fitMapBounds?: boolean;
  useDefaultCenterPosition?: boolean;
  defaultCenterPosition?: string;
  defaultZoomLevel?: number;
}

/** Tile URL templates for the anchor providers (v1 openstreet provider set). */
const TILE_URLS: Record<string, string> = {
  'OpenStreetMap.Mapnik': 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  'Esri.WorldImagery':
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
};

const TILE_ATTRIBUTIONS: Record<string, string> = {
  'OpenStreetMap.Mapnik': '&copy; OpenStreetMap contributors',
  'Esri.WorldImagery': 'Tiles &copy; Esri',
};

const DEFAULT_MARKER_COLOR = '#307FE5';

const VALUE_PATTERN = /\$\{([a-zA-Z][a-zA-Z0-9_.]*)(?::(-?\d+))?\}/g;

function formatBound(value: unknown, decimals?: string): string {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return String(value);
  }
  return decimals === undefined
    ? String(value)
    : numeric.toFixed(Number(decimals));
}

interface MarkerPoint {
  entity: ResolvedEntity;
  lat: number | null;
  lng: number | null;
  values: Record<string, unknown>;
  marker: MapMarkerConfig;
}

export default function Map({ ctx, widget }: WidgetComponentProps) {
  const { locale } = useIntl();
  const settings = (widget.config.settings ?? {}) as MapSettings;
  const [node, setNode] = useState<HTMLDivElement | null>(null);

  // marker i ↔ datasource i (index-aligned on purpose: useEntityLatestData
  // skips empty entity sets, so unresolved aliases cost zero WS cmds)
  const datasources = useMemo<Array<ExpandedDatasource>>(
    () =>
      (settings.markers ?? []).map((marker) => ({
        type: 'entity' as const,
        entities: ctx.aliases[marker.dsEntityAliasId as string] ?? [],
        dataKeys: [
          marker.xKey,
          marker.yKey,
          ...(marker.additionalDataKeys ?? []),
        ].filter((key): key is DataKey => Boolean(key?.name)),
      })),
    [settings.markers, ctx.aliases],
  );

  const { entries } = useEntityLatestData(datasources);

  const points = useMemo<Array<MarkerPoint>>(() => {
    const out: Array<MarkerPoint> = [];
    (settings.markers ?? []).forEach((marker, markerIndex) => {
      const entities = ctx.aliases[marker.dsEntityAliasId as string] ?? [];
      for (const entity of entities) {
        const row = entries.find(
          ({ datasourceIndex, row: candidate }) =>
            datasourceIndex === markerIndex &&
            (typeof candidate.entityId === 'string'
              ? candidate.entityId
              : candidate.entityId.id) === entity.id,
        )?.row;
        const readLatest = (key?: Partial<DataKey>): unknown => {
          if (!key?.name) {
            return undefined;
          }
          const keyType =
            key.type === 'timeseries' ? 'TIME_SERIES' : 'ATTRIBUTE';
          return row?.latest?.[keyType]?.[key.name]?.value;
        };
        const values: Record<string, unknown> = {};
        for (const key of [
          marker.xKey,
          marker.yKey,
          ...(marker.additionalDataKeys ?? []),
        ]) {
          if (key?.name) {
            values[key.label ?? key.name] = readLatest(key);
          }
        }
        const lat = Number(readLatest(marker.xKey));
        const lng = Number(readLatest(marker.yKey));
        out.push({
          entity,
          lat: Number.isFinite(lat) ? lat : null,
          lng: Number.isFinite(lng) ? lng : null,
          values,
          marker,
        });
      }
    });
    return out;
  }, [settings.markers, ctx.aliases, entries]);

  // ---- leaflet lifecycle: init once per container node --------------------
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;

  useEffect(() => {
    if (!node || mapRef.current) {
      return;
    }
    const layer = settings.layers?.[0];
    const layerType = layer?.layerType ?? 'OpenStreetMap.Mapnik';
    const map = L.map(node, {
      center: [0, 0],
      zoom: settings.defaultZoomLevel ?? 8,
    });
    L.tileLayer(
      layer?.url ?? TILE_URLS[layerType] ?? TILE_URLS['OpenStreetMap.Mapnik'],
      {
        attribution:
          layer?.url !== undefined
            ? '&copy;'
            : (TILE_ATTRIBUTIONS[layerType] ??
              TILE_ATTRIBUTIONS['OpenStreetMap.Mapnik']),
        maxZoom: 18,
      },
    ).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // tile layer rides the first settings layer only (v1: no layer switcher)
  }, [node, settings.layers, settings.defaultZoomLevel]);

  // repaint markers when data moves; fit bounds per settings
  useEffect(() => {
    const map = mapRef.current;
    const group = layerRef.current;
    if (!map || !group) {
      return;
    }
    console.log(
      '[map-debug] repaint effect map=',
      !!map,
      'group=',
      !!group,
      'points=',
      points.length,
      'lat0=',
      points[0]?.lat,
    );
    group.clearLayers();
    const bounds: Array<[number, number]> = [];
    for (const point of points) {
      if (point.lat === null || point.lng === null) {
        continue;
      }
      bounds.push([point.lat, point.lng]);
      const color =
        point.marker.markerShape?.color?.type === 'constant'
          ? (point.marker.markerShape.color.color ?? DEFAULT_MARKER_COLOR)
          : DEFAULT_MARKER_COLOR;
      const marker = L.circleMarker([point.lat, point.lng], {
        radius: 8,
        color,
        fillColor: color,
        fillOpacity: 0.85,
        weight: 2,
      });
      const pattern =
        point.marker.tooltip?.pattern ?? point.marker.label?.pattern;
      if (pattern) {
        marker.bindPopup(
          `<div data-entity-id="${point.entity.id}">${renderPopupHtml(pattern, point)}</div>`,
        );
      }
      marker.addTo(group);
    }
    if (bounds.length > 0 && settings.fitMapBounds !== false) {
      map.fitBounds(L.latLngBounds(bounds).pad(0.35));
    } else if (bounds.length === 0 && settings.useDefaultCenterPosition) {
      const [lat, lng] = (settings.defaultCenterPosition ?? '0,0')
        .split(',')
        .map((part) => Number(part.trim()));
      map.setView([lat, lng], settings.defaultZoomLevel ?? 8);
    }
  }, [
    points,
    settings.fitMapBounds,
    settings.useDefaultCenterPosition,
    settings.defaultCenterPosition,
    settings.defaultZoomLevel,
  ]);

  // delegated click handling for <link-act> → openDashboardState
  useEffect(() => {
    if (!node) {
      return;
    }
    const handler = (event: MouseEvent) => {
      const target = (event.target as HTMLElement | null)?.closest?.(
        '.tb-map-link-act',
      ) as HTMLElement | null;
      if (!target) {
        return;
      }
      const stateTarget = target.getAttribute('data-state-target');
      if (!stateTarget) {
        return;
      }
      const setEntity = target.getAttribute('data-set-entity') === '1';
      const holder = target.closest('[data-entity-id]');
      const entityId = holder?.getAttribute('data-entity-id') ?? undefined;
      const entity = datasources
        .flatMap((datasource) => datasource.entities)
        .find((candidate) => candidate.id === entityId);
      ctxRef.current.states.openState(
        stateTarget,
        setEntity && entity
          ? {
              entityId: { entityType: entity.entityType, id: entity.id },
              entityName: entity.name,
              entityLabel: entity.label,
            }
          : undefined,
      );
    };
    node.addEventListener('click', handler);
    return () => {
      node.removeEventListener('click', handler);
    };
  }, [node, datasources]);

  const title =
    widget.config.showTitle !== false
      ? interpolateStateParams(
          resolveI18nMessage(widget.config.title, locale),
          ctx.states.currentStateParams,
        )
      : '';

  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
      }}
      data-widget="system.map"
    >
      {title ? (
        <div
          style={{
            position: 'absolute',
            top: 4,
            left: 8,
            zIndex: 500,
            background: 'rgba(255, 255, 255, 0.72)',
            borderRadius: 4,
            padding: '0 6px',
          }}
        >
          {title}
        </div>
      ) : null}
      <div
        ref={setNode}
        data-map-container=""
        style={{ height: '100%', width: '100%' }}
      />
    </div>
  );
}

/** Interpolate a tooltip/label pattern for one marker point. */
function renderPopupHtml(pattern: string, point: MarkerPoint): string {
  const interpolated = interpolateStateParams(
    pattern.replace(
      VALUE_PATTERN,
      (fullMatch, key: string, decimals?: string) => {
        if (Object.hasOwn(point.values, key)) {
          return formatBound(point.values[key], decimals);
        }
        return fullMatch;
      },
    ),
    {
      entityName: point.entity.name ?? point.entity.id,
      entityLabel: point.entity.label ?? point.entity.name,
    },
  );
  return convertLinkActs(
    interpolated,
    point,
    point.marker.tooltip?.tagActions ?? [],
  );
}

/** <link-act name> tags → clickable spans carrying the state target. */
function convertLinkActs(
  html: string,
  point: MarkerPoint,
  actions: NonNullable<NonNullable<MapMarkerConfig['tooltip']>['tagActions']>,
): string {
  return html.replace(
    /<link-act name="([^"]+)">([\s\S]*?)<\/link-act>/g,
    (_match, name: string, text: string) => {
      const action = actions.find((candidate) => candidate.name === name);
      if (!action || action.type !== 'openDashboardState') {
        return text;
      }
      const setEntity =
        action.setEntityId === false || !point.entity.id ? '' : '1';
      return (
        `<span class="tb-map-link-act" role="button" tabindex="0"` +
        ` data-state-target="${action.targetDashboardStateId ?? ''}"` +
        ` data-set-entity="${setEntity}"` +
        ` style="text-decoration: underline; cursor: pointer;">${text}</span>`
      );
    },
  );
}
