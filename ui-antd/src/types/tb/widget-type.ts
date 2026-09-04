/**
 * Handwritten authoritative widget-type wire types (M9 wave-1 F).
 *
 * Source of truth (cross-checked, in priority order):
 *   - openapi snapshot: `WidgetType` / `WidgetTypeDetails` / `WidgetTypeInfo`
 *     schemas and the `getWidgetType` / `getWidgetTypeById` /
 *     `saveWidgetType` / `deleteWidgetType` / `getWidgetTypes` operations.
 *   - backend `WidgetTypeController.java` + `widget/BaseWidgetType.java` /
 *     `widget/WidgetTypeDetails.java`.
 *   - ui-ngx `shared/models/widget.models.ts` for the descriptor JSON key
 *     names (`WidgetTypeDescriptor` + `WidgetControllerDescriptor` + the
 *     `widgetActionSources` map).
 *
 * Wire realities pinned here (verified against the controller, NOT the
 * brief): `GET /api/widgetType?fqn=` returns the base `WidgetType` (WITH
 * descriptor, WITHOUT image/description/tags/resources) and requires the
 * FULL fqn including the `system.`/`tenant.` scope prefix, while the
 * entity's own `fqn` field is the short scope-less name. Full details only
 * come back from `GET /api/widgetType/{id}`.
 *
 * The descriptor is a free-form JsonNode upstream (no shape validation,
 * varchar 1MB hard cap — editors warn at 512KB): the interface below pins
 * the known keys and keeps an index signature so unknown keys round-trip
 * untouched (import/export + upstream Angular widgets must not lose data).
 */

import type { EntityIdOf, EntityType, EpochMillis } from './entity';

/** Widget kind (`descriptor.type`; the five create-dialog buckets upstream). */
export type WidgetTypeKind =
  | 'timeseries'
  | 'latest'
  | 'rpc'
  | 'alarm'
  | 'static';

/** `descriptor.resources[]` entry (ui-ngx WidgetResource). */
export interface WidgetTypeResource {
  /** relative `/api/resource/...` or external URL. */
  url: string;
  /**
   * true = JS module resource. The fork runtime only consumes
   * `isModule: false` entries (ADR 0004 §4); entries are preserved
   * as-is on save/export (P10 half-item).
   */
  isModule?: boolean;
  [key: string]: unknown;
}

/**
 * `descriptor.actionSources` value (ui-ngx WidgetActionSource :143).
 * The exact source-id KEYS are verified upstream: `widgetActionSources`
 * currently maps exactly one key — `headerButton` — and the map is open
 * for upstream to add more, so it is modeled as an open record.
 */
export interface WidgetActionSource {
  /** upstream i18n key, e.g. `widget-action.header-button` (passthrough). */
  name?: string;
  /** echo of the source id, e.g. `headerButton`. */
  value?: string;
  /** whether the source can bind multiple actions. */
  multiple?: boolean;
  hasShowCondition?: boolean;
  [key: string]: unknown;
}

/** `descriptor.typeParameters` — known upstream keys (ui-ngx :184-212).
 * The two function-typed upstream fields (`defaultDataKeysFunction` /
 * `dataKeySettingsFunction`) never serialize to wire JSON and are omitted.
 */
export interface WidgetTypeParameters {
  useCustomDatasources?: boolean;
  maxDatasources?: number;
  maxDataKeys?: number;
  datasourcesOptional?: boolean;
  dataKeysOptional?: boolean;
  stateData?: boolean;
  hasDataPageLink?: boolean;
  singleEntity?: boolean;
  hasAdditionalLatestDataKeys?: boolean;
  warnOnPageDataOverflow?: boolean;
  ignoreDataUpdateOnIntervalTick?: boolean;
  processNoDataByWidget?: boolean;
  previewWidth?: string;
  previewHeight?: string;
  embedTitlePanel?: boolean;
  embedActionsPanel?: boolean;
  overflowVisible?: boolean;
  hideDataTab?: boolean;
  hideDataSettings?: boolean;
  displayRpcMessageToast?: boolean;
  targetDeviceOptional?: boolean;
  supportsUnitConversion?: boolean;
  /** upstream WidgetActionType enum values, passthrough as strings. */
  additionalWidgetActionTypes?: string[];
  [key: string]: unknown;
}

/**
 * `descriptor.settingsForm` wire shape: upstream FormProperty[] (the exact
 * data model is mirrored in `components/form-property/types.ts`). types/tb
 * stays free of UI-layer imports, so this is carried as a loose array and
 * narrowed by `core/widget` at the draft boundary.
 */
export type WidgetSettingsFormWire = Array<Record<string, unknown>>;

/**
 * descriptor JSON authoritative shape. Known keys + open index signature
 * (unknown keys pass through untouched). Upstream (Angular) widgets carry
 * the legacy template/controller keys; fork widgets add `runtime`,
 * `schemaVersion` and `source` (ADR 0004 §4).
 */
export interface WidgetTypeDescriptor {
  /** widget kind; see WidgetTypeKind. */
  type?: WidgetTypeKind;
  /** default cell size, grid columns × rows. */
  sizeX?: number;
  sizeY?: number;
  resources?: WidgetTypeResource[];
  // --- legacy Angular-widget keys (passthrough, never produced by the fork editor) ---
  templateHtml?: string;
  templateCss?: string;
  /** legacy Angular controller script body (TbFunction wire = string). */
  controllerScript?: string;
  settingsDirective?: string;
  dataKeySettingsDirective?: string;
  latestDataKeySettingsDirective?: string;
  hasBasicMode?: boolean;
  basicModeDirective?: string;
  settingsForm?: WidgetSettingsFormWire;
  dataKeySettingsForm?: WidgetSettingsFormWire;
  latestDataKeySettingsForm?: WidgetSettingsFormWire;
  /** default widget config as a JSON STRING — backend helper depends on the string form; never parsed into an object on the wire. */
  defaultConfig?: string;
  typeParameters?: WidgetTypeParameters;
  actionSources?: Record<string, WidgetActionSource>;
  // --- fork increments (ADR 0004 §4) ---
  /** `react-1` = fork-compiled TSX widget; ABSENT = legacy Angular widget. */
  runtime?: 'react-1';
  /** fork descriptor schema version (constant 1; bumps only with widget-kit majors). */
  schemaVersion?: number;
  /** compiled widget source; present only when runtime === 'react-1'. */
  source?: {
    tsx: string;
    css?: string;
  };
  [key: string]: unknown;
}

/**
 * Resource export metadata attached by `GET /api/widgetType/{id}
 * ?includeResources=true` (openapi ResourceExportData; round-trip payload —
 * consumers keep it verbatim).
 */
export interface WidgetTypeResourceExportData {
  link?: string;
  title?: string;
  type?: string;
  subType?: string;
  resourceKey?: string;
  fileName?: string;
  publicResourceKey?: string;
  isPublic?: boolean;
  mediaType?: string;
  /** base64 data, present in export payloads. */
  data?: string;
  public?: boolean;
  [key: string]: unknown;
}

/**
 * Widget type base entity — response of `GET /api/widgetType?fqn=` (short
 * body: no image/description/tags/resources) and the shared tail of the
 * details/info variants. Server-assigned fields are readonly; `id` and
 * `createdTime` are optional because the save endpoint accepts the same
 * shape without them to create a new entity.
 */
export interface WidgetType {
  id?: EntityIdOf<EntityType.WIDGET_TYPE>;
  /** ms since epoch (server-assigned). */
  readonly createdTime?: EpochMillis;
  /** server-forced on save (SYS_ADMIN → system tenant). */
  readonly tenantId?: EntityIdOf<EntityType.TENANT>;
  /**
   * SHORT fqn without the scope prefix (e.g. `my_widget`). The scope-
   * qualified form (`tenant.my_widget` / `system.my_widget`) is what
   * dashboards reference and what `GET /api/widgetType?fqn=` requires;
   * dashboards' `Widget.typeFullFqn` carries the qualified form.
   */
  readonly fqn?: string;
  readonly name?: string;
  deprecated?: boolean;
  scada?: boolean;
  /** optimistic-lock version; pass back on update, 409 on conflict. */
  version?: number;
  descriptor?: WidgetTypeDescriptor;
  [key: string]: unknown;
}

/**
 * Full widget type entity — `GET /api/widgetType/{id}` and the
 * `POST /api/widgetType` request/response body. Extends WidgetType with
 * the editor-facing fields; fqn is immutable after create (server rejects
 * changes).
 */
export interface WidgetTypeDetails extends WidgetType {
  /** relative or external image URL (server may inline as data URL). */
  image?: string;
  description?: string;
  tags?: string[];
  /** populated only via `?includeResources=true` on read. */
  resources?: WidgetTypeResourceExportData[];
}

/**
 * Listing row — `GET /api/widgetTypes` paged response item. Derived from
 * the same entity but WITHOUT the descriptor (that is why derived-type
 * dialogs for built-ins are "restricted", ADR 0004 §4).
 */
export interface WidgetTypeInfo {
  id?: EntityIdOf<EntityType.WIDGET_TYPE>;
  readonly createdTime?: EpochMillis;
  readonly tenantId?: EntityIdOf<EntityType.TENANT>;
  readonly fqn?: string;
  readonly name?: string;
  deprecated?: boolean;
  scada?: boolean;
  version?: number;
  /** base64-encoded thumbnail (read-only upstream). */
  readonly image?: string;
  readonly description?: string;
  readonly tags?: string[];
  /** widget kind; plain string on the wire. */
  readonly widgetType?: WidgetTypeKind;
  readonly bundles?: Array<{
    id?: EntityIdOf<EntityType.WIDGETS_BUNDLE>;
    name?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
}

/** Extra query params of `GET /api/widgetTypes` (beyond the PageLink). */
export interface WidgetTypeListQuery {
  /** only tenant-owned widget types. */
  tenantOnly?: boolean;
  /** also search by description, not only name. */
  fullSearch?: boolean;
  deprecatedFilter?: 'ALL' | 'ACTUAL' | 'DEPRECATED';
  /** kind filter; sent comma-joined as the `widgetTypeList` query param. */
  widgetTypeList?: WidgetTypeKind[];
  /** fetch SCADA symbols first. */
  scadaFirst?: boolean;
}
