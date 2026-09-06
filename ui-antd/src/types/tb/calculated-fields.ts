/**
 * Calculated-field wire types (handwritten, authoritative) — M14 wave-1.
 *
 * Modeled field-by-field against the backend Java classes in
 * common/data/src/main/java/org/thingsboard/server/common/data/cf/
 * (CalculatedField, CalculatedFieldInfo and configuration/*, read
 * 2026-09-06). The seven configuration shapes form one discriminator
 * union on `type` — the same discriminated-property layout the backend
 * serializes via @JsonTypeInfo on CalculatedFieldConfiguration.
 *
 * Known ui-ngx TS-model gap fixed here:
 * GeofencingCalculatedFieldConfiguration.entityCoordinates exists in Java
 * (geofencing/GeofencingCalculatedFieldConfiguration.java) but was missing
 * from ui-ngx shared/models/calculated-field.models.ts.
 */

import type { AlarmSeverity } from './alarm';
import type {
  BaseData,
  EntityId,
  EntityType,
  HasTenantIdAndCustomer,
  HasVersion,
} from './entity';
import type { AttributeScope } from './telemetry';

/** Wire enum (Java common/data/cf/CalculatedFieldType.java). */
export type CalculatedFieldType =
  | 'SIMPLE'
  | 'SCRIPT'
  | 'GEOFENCING'
  | 'ALARM'
  | 'PROPAGATION'
  | 'RELATED_ENTITIES_AGGREGATION'
  | 'ENTITY_AGGREGATION';

export type ArgumentType = 'ATTRIBUTE' | 'TS_LATEST' | 'TS_ROLLING';

export type OutputType = 'TIME_SERIES' | 'ATTRIBUTES';

export type OutputStrategyType = 'IMMEDIATE' | 'RULE_CHAIN';

export type AggFunction =
  | 'AVG'
  | 'MIN'
  | 'MAX'
  | 'SUM'
  | 'COUNT'
  | 'COUNT_UNIQUE';

export type AggIntervalType =
  | 'HOUR'
  | 'DAY'
  | 'WEEK'
  | 'WEEK_SUN_SAT'
  | 'MONTH'
  | 'QUARTER'
  | 'YEAR'
  | 'CUSTOM';

export type GeofencingReportStrategy =
  | 'REPORT_TRANSITION_EVENTS_ONLY'
  | 'REPORT_PRESENCE_STATUS_ONLY'
  | 'REPORT_TRANSITION_EVENTS_AND_PRESENCE_STATUS';

export type EntitySearchDirection = 'FROM' | 'TO';

export type CfArgumentDynamicSourceType =
  | 'RELATION_PATH_QUERY'
  | 'CURRENT_OWNER';

/** Java common/data/relation/RelationPathLevel.java (record). */
export interface RelationPathLevel {
  direction: EntitySearchDirection;
  relationType: string;
}

/** Telemetry/attribute key reference of an argument (Java ReferencedEntityKey). */
export interface ReferencedEntityKey {
  key: string;
  type: ArgumentType;
  /** Attribute scope — only meaningful for `ATTRIBUTE` arguments. */
  scope?: AttributeScope;
}

/**
 * Dynamic (non-fixed) argument source. `RELATION_PATH_QUERY` walks up to N
 * relation levels (Java RelationPathQueryDynamicSourceConfiguration),
 * `CURRENT_OWNER` pins the argument to the entity's owner.
 */
export type CfArgumentDynamicSourceConfiguration =
  | RelationPathQueryDynamicSourceConfiguration
  | CurrentOwnerDynamicSourceConfiguration;

export interface RelationPathQueryDynamicSourceConfiguration {
  type: 'RELATION_PATH_QUERY';
  levels?: RelationPathLevel[];
}

export interface CurrentOwnerDynamicSourceConfiguration {
  type: 'CURRENT_OWNER';
}

/** One calculated-field argument (Java cf/configuration/Argument.java). */
export interface CalculatedFieldArgument {
  /** Concrete referenced entity; omitted when the argument targets the CF's own entity. */
  refEntityId?: EntityId;
  refDynamicSourceConfiguration?: CfArgumentDynamicSourceConfiguration;
  refEntityKey: ReferencedEntityKey;
  /** Fallback used before the key has any data. */
  defaultValue?: string;
  /** TS_ROLLING only — data-point cap (tenant-profile limit: CF_LIMITS.maxDataPointsPerRollingArg). */
  limit?: number;
  /** TS_ROLLING only — window in ms. */
  timeWindow?: number;
}

// ---------------------------------------------------------------------------
// Output (Java Output / TimeSeriesOutput / AttributesOutput + strategies).
// Note: upstream ui-ngx names its time-series strategy interfaces the wrong
// way round (TimeSeriesRuleChainOutputStrategy carries type IMMEDIATE); the
// names below follow the Java semantics and discriminate on `type`.
// ---------------------------------------------------------------------------

export interface AttributesImmediateOutputStrategy {
  type: 'IMMEDIATE';
  updateAttributesOnlyOnValueChange: boolean;
  sendAttributesUpdatedNotification: boolean;
  saveAttribute: boolean;
  sendWsUpdate: boolean;
  processCfs: boolean;
}

export interface AttributesRuleChainOutputStrategy {
  type: 'RULE_CHAIN';
}

export type AttributesOutputStrategy =
  | AttributesImmediateOutputStrategy
  | AttributesRuleChainOutputStrategy;

export interface TimeSeriesImmediateOutputStrategy {
  type: 'IMMEDIATE';
  ttl: number;
  saveTimeSeries: boolean;
  saveLatest: boolean;
  sendWsUpdate: boolean;
  processCfs: boolean;
}

export interface TimeSeriesRuleChainOutputStrategy {
  type: 'RULE_CHAIN';
}

export type TimeSeriesOutputStrategy =
  | TimeSeriesImmediateOutputStrategy
  | TimeSeriesRuleChainOutputStrategy;

export interface AttributesOutput {
  type: 'ATTRIBUTES';
  name: string;
  scope: AttributeScope;
  decimalsByDefault?: number;
  strategy: AttributesOutputStrategy;
}

export interface TimeSeriesOutput {
  type: 'TIME_SERIES';
  name: string;
  decimalsByDefault?: number;
  strategy: TimeSeriesOutputStrategy;
}

export type Output = AttributesOutput | TimeSeriesOutput;

// ---------------------------------------------------------------------------
// Configuration members (Java cf/configuration/*.java).
// ---------------------------------------------------------------------------

export interface SimpleCalculatedFieldConfiguration {
  type: 'SIMPLE';
  expression: string;
  arguments: Record<string, CalculatedFieldArgument>;
  useLatestTs: boolean;
  output: Output;
}

export interface ScriptCalculatedFieldConfiguration {
  type: 'SCRIPT';
  /** TBEL expression; `return {...}` emits the output values. */
  expression: string;
  arguments: Record<string, CalculatedFieldArgument>;
  output: Output;
}

export interface PropagationConfigurationBase {
  type: 'PROPAGATION';
  relation: RelationPathLevel;
  arguments: Record<string, CalculatedFieldArgument>;
  output: Output;
}

export interface PropagationWithNoExpression
  extends PropagationConfigurationBase {
  applyExpressionToResolvedArguments: false;
}

export interface PropagationWithExpression
  extends PropagationConfigurationBase {
  applyExpressionToResolvedArguments: true;
  expression: string;
}

export type PropagationCalculatedFieldConfiguration =
  | PropagationWithNoExpression
  | PropagationWithExpression;

/**
 * Geofencing position of the CF's own entity (Java
 * geofencing/EntityCoordinates.java; the two keys feed the built-in
 * `latitude`/`longitude` TS_LATEST arguments).
 */
export interface EntityCoordinates {
  latitudeKeyName: string;
  longitudeKeyName: string;
}

/** One geofencing zone group (Java geofencing/ZoneGroupConfiguration.java). */
export interface CalculatedFieldGeofencingZoneGroup {
  /** Entity holding the zone polygons; omitted = own entity. */
  refEntityId?: EntityId;
  refDynamicSourceConfiguration?: CfArgumentDynamicSourceConfiguration;
  /** Attribute key on the zone entity carrying the perimeter JSON. */
  perimeterKeyName: string;
  reportStrategy: GeofencingReportStrategy;
  createRelationsWithMatchedZones: boolean;
  /** Required when createRelationsWithMatchedZones is true. */
  relationType?: string;
  /** Required when createRelationsWithMatchedZones is true. */
  direction?: EntitySearchDirection;
}

export interface GeofencingCalculatedFieldConfiguration {
  type: 'GEOFENCING';
  /** Present in the backend Java model; missing from the ngx TS model. */
  entityCoordinates: EntityCoordinates;
  zoneGroups: Record<string, CalculatedFieldGeofencingZoneGroup>;
  scheduledUpdateEnabled: boolean;
  scheduledUpdateInterval?: number;
  output: Output;
}

/** Aggregation metric value source (Java aggregation/AggInput.java). */
export type AggInput =
  | { type: 'key'; key: string }
  | { type: 'function'; function: string };

export interface CalculatedFieldAggMetric {
  function: AggFunction;
  /** Optional TBEL filter gating which entities feed the metric. */
  filter?: string;
  input: AggInput;
  defaultValue?: number;
}

/** Fixed-duration watermark (Java aggregation/single/interval/Watermark.java). */
export interface WatermarkConfig {
  duration: number;
}

/** Calendar or custom aggregation interval (Java AggInterval hierarchy). */
export type AggInterval = FixedAggInterval | CustomAggInterval;

export interface FixedAggInterval {
  type: Exclude<AggIntervalType, 'CUSTOM'>;
  /** IANA tz id the calendar boundaries are evaluated in. */
  tz: string;
  /** Offset in seconds applied to the calendar boundary. */
  offsetSec?: number;
}

export interface CustomAggInterval {
  type: 'CUSTOM';
  tz: string;
  offsetSec?: number;
  /** Fixed window length in seconds. */
  durationSec: number;
}

export interface RelatedEntitiesAggregationCalculatedFieldConfiguration {
  type: 'RELATED_ENTITIES_AGGREGATION';
  relation: RelationPathLevel;
  arguments: Record<string, CalculatedFieldArgument>;
  metrics: Record<string, CalculatedFieldAggMetric>;
  deduplicationIntervalInSec: number;
  scheduledUpdateInterval?: number;
  useLatestTs: boolean;
  output: Output;
}

export interface EntityAggregationCalculatedFieldConfiguration {
  type: 'ENTITY_AGGREGATION';
  arguments: Record<string, CalculatedFieldArgument>;
  metrics: Record<string, CalculatedFieldAggMetric>;
  interval: AggInterval;
  watermark?: WatermarkConfig;
  produceIntermediateResult?: boolean;
  output: Output;
}

export interface AlarmCalculatedFieldConfiguration {
  type: 'ALARM';
  arguments: Record<string, CalculatedFieldArgument>;
  /**
   * Severity → alarm-rule body (Java common/data/cf/AlarmRuleDefinition).
   * The alarm-rules domain owns the rule shape — services/tb/alarm-rules.
   */
  createRules: Partial<Record<AlarmSeverity, Record<string, unknown>>>;
  clearRule?: Record<string, unknown>;
  propagate: boolean;
  propagateToOwner: boolean;
  propagateToTenant: boolean;
  propagateRelationTypes?: string[];
}

/** The full configuration union (backend @JsonTypeInfo discriminator on `type`). */
export type CalculatedFieldConfiguration =
  | SimpleCalculatedFieldConfiguration
  | ScriptCalculatedFieldConfiguration
  | GeofencingCalculatedFieldConfiguration
  | AlarmCalculatedFieldConfiguration
  | PropagationCalculatedFieldConfiguration
  | RelatedEntitiesAggregationCalculatedFieldConfiguration
  | EntityAggregationCalculatedFieldConfiguration;

/**
 * Server-side CF limits — backend DEFAULT values (tenant-profile
 * `CfTenantProfileConfiguration`). M14 consumes these as validation
 * boundaries / form hints only; the authState wiring is a registered
 * enhancement (panel-arch R19), not implemented.
 */
export const CF_LIMITS = {
  maxArgumentsPerCF: 10,
  maxDataPointsPerRollingArg: 1000,
  maxRelationLevelPerCfArgument: 2,
  maxRelatedEntitiesToReturnPerCfArgument: 100,
  minAllowedDeduplicationIntervalInSecForCF: 10,
  minAllowedAggregationIntervalInSecForCF: 60,
  minAllowedScheduledUpdateIntervalInSecForCF: 10,
  intermediateAggregationIntervalInSecForCF: 300,
} as const;

export type CfLimits = typeof CF_LIMITS;

/** Per-entity debug switches (Java common/data/debug/DebugSettings.java). */
export interface CalculatedFieldDebugSettings {
  failuresEnabled?: boolean;
  allEnabled?: boolean;
  /** ms since epoch — server-managed "debug all" deadline. */
  allEnabledUntil?: number;
}

/** GET/POST /api/calculatedField row (Java common/data/cf/CalculatedField.java). */
export interface CalculatedField
  extends BaseData<{ entityType: EntityType.CALCULATED_FIELD; id: string }>,
    HasTenantIdAndCustomer,
    HasVersion {
  /** Target entity — object form `{entityType, id}`; IMMUTABLE after creation (update attempts 400). */
  entityId: EntityId;
  type: CalculatedFieldType;
  name: string;
  debugMode?: boolean;
  debugSettings?: CalculatedFieldDebugSettings;
  configurationVersion?: number;
  configuration: CalculatedFieldConfiguration;
  additionalInfo?: Record<string, unknown>;
}

/**
 * GET /api/calculatedFields row — the tenant-wide list additionally carries
 * the target entity's display name (Java cf/CalculatedFieldInfo.java).
 */
export interface CalculatedFieldInfo extends CalculatedField {
  entityName?: string;
}
