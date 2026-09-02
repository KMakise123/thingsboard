/**
 * Handwritten authoritative widget wire types (M5).
 *
 * Source of truth: the six anchor dashboard JSONs and
 * ui-ngx/src/app/shared/models/widget.models.ts (:921-978).
 * The generated snapshot (openapi) models widget payloads as JsonNode and is
 * too coarse; these handwritten types are what the dashboard runtime consumes.
 *
 * Anchor reality: `widget.config` carries far more presentation fields than
 * modeled here (backgroundColor, padding, titleStyle, settings, actions…);
 * the index signature passes those through untouched so W2 widget components
 * can read them without another type migration.
 */

import type { EntityId, EpochMillis } from './entity';
import type { Timewindow } from './timewindow';

/** Where a widget datasource reads entities from. */
export type DatasourceType =
  | 'entity'
  | 'device'
  | 'function'
  | 'alarm'
  | 'entityCount'
  | 'alarmCount';

/** Key kinds a datasource column can reference. */
export type DataKeyType =
  | 'timeseries'
  | 'attribute'
  | 'entityField'
  | 'function'
  | 'alarm';

/** One column of a widget datasource (timeseries key, attribute, …). */
export interface DataKey {
  /** telemetry/attribute key name; for alarm keys e.g. `createdTime`, `severity`. */
  name: string;
  type: DataKeyType;
  /** display label; falls back to `name` upstream. */
  label?: string;
  units?: string;
  decimals?: number;
  /** series color (widget-local palette); may be a raw hex from imported dashboards. */
  color?: string;
  /** function datasource script body (legacy `function` datasources). */
  funcBody?: string;
  /** aggregation override for the key (null => dashboard timewindow agg). */
  aggregationType?: string | null;
  /** widget-specific column settings (cell style functions, chart series config…). */
  settings?: Record<string, unknown>;
  [key: string]: unknown;
}

/** One entity/source a widget reads data from. */
export interface Datasource {
  type: DatasourceType;
  /** resolved entity display name (client-filled, may be absent on import). */
  name?: string | null;
  /** reference into `configuration.entityAliases` when type is entity. */
  entityAliasId?: string;
  /** concrete entity when the datasource targets a single resolved entity. */
  entityId?: EntityId;
  dataKeys: DataKey[];
  /** latest-value columns beside timeseries columns (timeseries widgets). */
  latestDataKeys?: DataKey[];
  [key: string]: unknown;
}

/**
 * Alarm datasource (alarms_table widgets): same column model but typed
 * `alarm` keys, plus an optional reference into `configuration.filters`.
 */
export interface AlarmSource extends Datasource {
  /** alarm column keys use `type: 'alarm'`. */
  dataKeys: DataKey[];
  /** id into `configuration.filters` for alarm-type filtering. */
  filterId?: string | null;
  [key: string]: unknown;
}

/** Widget-level configuration (`configuration.widgets[id].config`). */
export interface WidgetConfig {
  title?: string;
  showTitle?: boolean;
  /** follow the dashboard global timewindow (default true). */
  useDashboardTimewindow?: boolean;
  /** widget-private timewindow, used when useDashboardTimewindow is false. */
  timewindow?: Timewindow;
  datasources?: Datasource[];
  /** alarm widgets source their rows from here instead of datasources. */
  alarmSource?: AlarmSource;
  /**
   * alarms-table filter: either an id into `configuration.filters` or an
   * inline descriptor (anchor thermostats.json carries the inline form).
   */
  alarmFilterConfig?: string | Record<string, unknown> | null;
  /** legacy rpc target device (name or alias ref), passthrough. */
  targetDevice?: unknown;
  /** widget-type specific parameters (chart settings, table settings…). */
  settings?: Record<string, unknown>;
  /** widget action descriptors; v1 renders nothing for them, passthrough. */
  actions?: Record<string, unknown>;
  pageSize?: number;
  units?: string;
  decimals?: number;
  /** mobile stack height override (rows of mobileRowHeight). */
  mobileHeight?: number | null;
  [key: string]: unknown;
}

/**
 * Widget instance as stored in `configuration.widgets[id]`.
 * `row/col` exist on the widget for legacy layouts (widgets array without
 * states) — the authoritative position inside a state comes from
 * `DashboardLayout.widgets[widgetId]` (WidgetLayout).
 */
export interface Widget {
  /** widget-type descriptor id, present when the type was imported by reference. */
  typeId?: EntityId | null;
  /** fully-qualified widget type name, e.g. `system.cards.entities_table`. */
  typeFullFqn: string;
  /** default cell size (descriptor default or last editor size). */
  sizeX?: number;
  sizeY?: number;
  row?: number;
  col?: number;
  config: WidgetConfig;
  [key: string]: unknown;
}

/** Row/column a widget occupies inside one state layout. */
export interface WidgetLayout {
  sizeX: number;
  sizeY: number;
  row: number;
  col: number;
  /** hide in desktop grid. */
  desktopHide?: boolean;
  /** hide in the mobile single-column stack. */
  mobileHide?: boolean;
  /** mobile stack height override (rows of mobileRowHeight). */
  mobileHeight?: number;
  /** mobile stack ordering. */
  mobileOrder?: number;
  resizable?: boolean;
  preserveAspectRatio?: boolean;
  [key: string]: unknown;
}

/** Normalized widget + its position inside a layout (runtime pairing). */
export interface PlacedWidget {
  /** key into configuration.widgets. */
  id: string;
  widget: Widget;
  layout: WidgetLayout;
}

/** Alarm wire row subset the alarms-table placeholder/consumer may rely on. */
export interface WidgetAlarmRow {
  id?: string;
  createdTime?: EpochMillis;
  [key: string]: unknown;
}
