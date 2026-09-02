/**
 * Handwritten authoritative dashboard wire types (M5).
 *
 * Source of truth: the six anchor dashboard JSONs (4 demo dashboards +
 * gateways_dashboard.json + api_usage.json), ui-ngx shared/models/
 * dashboard.models.ts (:28-208) and the generated openapi snapshot
 * (DashboardInfo / Dashboard / ShortCustomerInfo schemas).
 *
 * Normalization contract: `configuration.widgets` is an array in legacy
 * exports; `validateAndUpdateDashboard` (core/dashboard/model.ts) maps it to
 * Record<string, Widget> before the runtime sees it, so the Record form below
 * is the only one the runtime types admit.
 */

import type { BaseData, EntityIdOf, EntityType, HasVersion } from './entity';
import type { Timewindow } from './timewindow';
import type { Widget, WidgetLayout } from './widget';

/** Widget-side types re-exported so dashboard consumers need one import. */
export type { Widget, WidgetLayout };

/** Customer entry in `assignedCustomers` (openapi ShortCustomerInfo). */
export interface ShortCustomerInfo {
  customerId?: EntityIdOf<EntityType.CUSTOMER>;
  title?: string;
  /** true for the special "Public" customer of a made-public dashboard. */
  public?: boolean;
  [key: string]: unknown;
}

/** Dashboard row/listing shape (`/api/dashboard/info/{id}`, page listings). */
export interface DashboardInfo
  extends BaseData<EntityIdOf<EntityType.DASHBOARD>>,
    HasVersion {
  tenantId?: EntityIdOf<EntityType.TENANT>;
  title: string;
  /** same as title, read-only upstream. */
  name?: string;
  image?: string;
  assignedCustomers?: ShortCustomerInfo[];
  mobileHide?: boolean;
  mobileOrder?: number;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Alias / filter declarations (configuration.entityAliases / .filters)
// ---------------------------------------------------------------------------

/** Anchor-verified entity filter types (see docs/spec M5 recon + demo JSONs). */
export type EntityAliasFilterType =
  | 'singleEntity'
  | 'entityType'
  | 'stateEntity'
  | 'deviceType'
  | 'relationsQuery'
  | 'apiUsageState';

export interface SingleEntityFilter {
  type: 'singleEntity';
  resolveMultiple?: boolean;
  singleEntity: EntityIdOf<EntityType>;
  [key: string]: unknown;
}

export interface EntityTypeFilter {
  type: 'entityType';
  resolveMultiple?: boolean;
  entityType: EntityType;
  [key: string]: unknown;
}

/** Resolved client-side from the current dashboard state entity. */
export interface StateEntityFilter {
  type: 'stateEntity';
  resolveMultiple?: boolean;
  /** name of the state param carrying the entity id (default: entityId). */
  stateEntityParamName?: string | null;
  defaultStateEntity?: EntityIdOf<EntityType> | null;
  [key: string]: unknown;
}

export interface DeviceTypeFilter {
  type: 'deviceType';
  resolveMultiple?: boolean;
  /** free-text device name filter (substring). */
  deviceNameFilter?: string;
  deviceTypes: string[];
  [key: string]: unknown;
}

/**
 * Relations traversal from a root entity; `rootStateEntity: true` takes the
 * root from the current dashboard state entity.
 */
export interface RelationsQueryFilter {
  type: 'relationsQuery';
  resolveMultiple?: boolean;
  rootStateEntity?: boolean;
  stateEntityParamName?: string | null;
  defaultStateEntity?: EntityIdOf<EntityType> | null;
  rootEntity?: EntityIdOf<EntityType> | null;
  direction: 'FROM' | 'TO';
  maxLevel?: number;
  fetchLastLevelOnly?: boolean;
  filters: Array<{
    relationType: string;
    entityTypes: Array<EntityType>;
  }>;
  [key: string]: unknown;
}

/** The tenant's singleton api-usage entity (api_usage.json anchor). */
export interface ApiUsageStateFilter {
  type: 'apiUsageState';
  resolveMultiple?: boolean;
  [key: string]: unknown;
}

export type EntityAliasFilter =
  | SingleEntityFilter
  | EntityTypeFilter
  | StateEntityFilter
  | DeviceTypeFilter
  | RelationsQueryFilter
  | ApiUsageStateFilter
  | ({ type: string; resolveMultiple?: boolean } & Record<string, unknown>);

/** Entry of `configuration.entityAliases` keyed by alias id (uuid). */
export interface EntityAlias {
  id: string;
  alias: string;
  filter: EntityAliasFilter;
  [key: string]: unknown;
}

/** Entry of `configuration.filters` (alarm/data filters, referenced by id). */
export interface DashboardFilter {
  id: string;
  /** human filter name. */
  filter: string;
  /** filter predicates; consumed by W2 alarms-table, passthrough here. */
  keyFilters?: Array<Record<string, unknown>>;
  editable?: boolean;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Configuration: states / layouts / settings
// ---------------------------------------------------------------------------

/** Both page layouts of a state (right column is optional). */
export type DashboardLayoutId = 'main' | 'right';

/** RGL-style breakpoint ids that may override a layout. */
export type DashboardBreakpointId =
  | 'default'
  | 'xs'
  | 'sm'
  | 'md'
  | 'lg'
  | 'xl';

export type GridSettingsLayoutType = 'default' | 'scada' | 'divider';

/** Per-state layout: widget placement + grid measurement + breakpoints. */
export interface DashboardLayout {
  widgets: Record<string, WidgetLayout>;
  gridSettings: GridSettings;
  /** breakpoint-scoped full replacements of widgets/gridSettings. */
  breakpoints?: Partial<
    Record<DashboardBreakpointId, Omit<DashboardLayout, 'breakpoints'>>
  >;
  [key: string]: unknown;
}

/** Grid measurement of a layout. Field set = brief §1.2 + the `color` text
 * color that every anchor gridSettings actually carries.
 */
export interface GridSettings {
  layoutType?: GridSettingsLayoutType;
  /** layout background (raw css color from imported JSON; applied verbatim). */
  backgroundColor?: string;
  /** layout text color (anchor-verified addition). */
  color?: string;
  columns?: number;
  minColumns?: number;
  /** cell gap px (default 10). */
  margin?: number;
  /** outer padding around the grid (default true). */
  outerMargin?: boolean;
  /** stretch rows to fill the viewport height (gridType Fit). */
  autoFillHeight?: boolean;
  /** base row height px when not auto-fill (upstream dynamic; see grid math). */
  rowHeight?: number;
  mobileAutoFillHeight?: boolean;
  mobileRowHeight?: number;
  mobileDisplayLayoutFirst?: boolean;
  backgroundSizeMode?: string;
  backgroundImageUrl?: string | null;
  layoutDimension?: {
    type?: 'percentage' | 'fixed';
    leftCalc?: string;
    rightCalc?: string;
    fixedHeight?: string;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

/** Toolbar/behavior toggles (`configuration.settings`). */
export interface DashboardSettings {
  /** `'default' | 'entity'` (v1); default 'entity'. */
  stateControllerId?: string;
  showTitle?: boolean;
  showDashboardsSelect?: boolean;
  showEntitiesSelect?: boolean;
  showFilters?: boolean;
  showDashboardLogo?: boolean;
  dashboardLogoUrl?: string | null;
  showDashboardTimewindow?: boolean;
  showDashboardExport?: boolean;
  showUpdateDashboardImage?: boolean;
  toolbarAlwaysOpen?: boolean;
  hideToolbar?: boolean;
  titleColor?: string;
  dashboardCss?: string;
  [key: string]: unknown;
}

/** Named page ("state") of a dashboard. */
export interface DashboardState {
  name: string;
  root?: boolean;
  layouts: Partial<Record<DashboardLayoutId, DashboardLayout>>;
  [key: string]: unknown;
}

/** `configuration` body of a Dashboard (post validateAndUpdateDashboard). */
export interface DashboardConfiguration {
  timewindow?: Timewindow;
  settings?: DashboardSettings;
  widgets: Record<string, Widget>;
  states: Record<string, DashboardState>;
  entityAliases: Record<string, EntityAlias>;
  filters?: Record<string, DashboardFilter>;
  description?: string;
  [key: string]: unknown;
}

/** Full dashboard entity (`GET /api/dashboard/{id}`, import/export payload). */
export interface Dashboard extends DashboardInfo {
  configuration?: DashboardConfiguration;
  /** resource export data attached by `?includeResources=true` exports. */
  resources?: Array<Record<string, unknown>>;
}
