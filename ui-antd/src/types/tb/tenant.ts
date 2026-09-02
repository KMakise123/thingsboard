/**
 * Tenant / tenant-profile / queue wire types (handwritten, authoritative).
 *
 * Base: ui-ngx tenant.model.ts + tenant-profile.model.ts + queue.models.ts,
 * cross-checked against the backend controllers (RECON §3):
 * TenantController, TenantProfileController, QueueInfo in profileData.
 *
 * Import this file directly (`@/types/tb/tenant`) — the `@/types/tb` barrel
 * is not part of this domain's change set.
 */
import type { BaseData, EntityIdOf, EntityType, HasVersion } from './entity';

/** GET /api/tenant/info/{id} and GET /api/tenantInfos row (Tenant + profile name). */
export interface TenantInfo
  extends BaseData<EntityIdOf<EntityType.TENANT>>,
    HasVersion {
  /** Required on the wire (ui-ngx Validators.required on the form). */
  tenantProfileId: EntityIdOf<EntityType.TENANT_PROFILE>;
  title: string;
  region?: string;
  // Contact group (ui-ngx tb-contact).
  country?: string;
  state?: string;
  city?: string;
  zip?: string;
  address?: string;
  address2?: string;
  phone?: string;
  email?: string;
  /** Joined from the referenced tenant profile (read shape only). */
  tenantProfileName?: string;
  additionalInfo?: {
    description?: string;
    /** v1 hides the home-dashboard editor entry (spec principle 3). */
    homeDashboardId?: string;
    homeDashboardHideToolbar?: boolean;
  } & Record<string, unknown>;
}

/**
 * One rate-limit input of the tenant-profile form. Wire syntax is the
 * comma-separated "capacity:periodSeconds" pair list, e.g. "1000:1,20000:60".
 */
export type RateLimit = string;

/**
 * profileData.configuration of the DEFAULT tenant profile
 * (ui-ngx DefaultTenantProfileConfiguration; 0 = unlimited everywhere the
 * form says so). Numbers are required (the form always sends them), the
 * rate-limit strings are optional (empty = not set).
 */
export interface TenantProfileConfiguration {
  type: 'DEFAULT';

  // Entities
  maxDevices: number;
  maxAssets: number;
  maxCustomers: number;
  maxUsers: number;
  maxDashboards: number;
  maxRuleChains: number;
  maxEdges: number;

  // Files (bytes)
  maxResourcesInBytes: number;
  maxOtaPackagesInBytes: number;
  maxResourceSize: number;

  // Transport rate limits
  transportTenantMsgRateLimit?: RateLimit;
  transportTenantTelemetryMsgRateLimit?: RateLimit;
  transportTenantTelemetryDataPointsRateLimit?: RateLimit;
  transportDeviceMsgRateLimit?: RateLimit;
  transportDeviceTelemetryMsgRateLimit?: RateLimit;
  transportDeviceTelemetryDataPointsRateLimit?: RateLimit;
  transportGatewayMsgRateLimit?: RateLimit;
  transportGatewayTelemetryMsgRateLimit?: RateLimit;
  transportGatewayTelemetryDataPointsRateLimit?: RateLimit;
  transportGatewayDeviceMsgRateLimit?: RateLimit;
  transportGatewayDeviceTelemetryMsgRateLimit?: RateLimit;
  transportGatewayDeviceTelemetryDataPointsRateLimit?: RateLimit;

  // REST / export-import / notification rate limits
  tenantServerRestLimitsConfiguration?: RateLimit;
  customerServerRestLimitsConfiguration?: RateLimit;
  tenantEntityExportRateLimit?: RateLimit;
  tenantEntityImportRateLimit?: RateLimit;
  tenantNotificationRequestsRateLimit?: RateLimit;
  tenantNotificationRequestsPerRuleRateLimit?: RateLimit;

  // Rule engine
  maxTransportMessages: number;
  maxTransportDataPoints: number;
  maxREExecutions: number;
  maxJSExecutions: number;
  maxTbelExecutions: number;
  maxDPStorageDays: number;
  maxRuleNodeExecutionsPerMessage: number;
  maxEmails: number;
  maxSms: number;
  smsEnabled: boolean;
  maxCreatedAlarms: number;
  maxDebugModeDurationMinutes: number;

  // Cassandra query rate limits
  cassandraWriteQueryTenantCoreRateLimits?: RateLimit;
  cassandraReadQueryTenantCoreRateLimits?: RateLimit;
  cassandraWriteQueryTenantRuleEngineRateLimits?: RateLimit;
  cassandraReadQueryTenantRuleEngineRateLimits?: RateLimit;

  // Edge rate limits (optional — the Edge subsystem)
  edgeEventRateLimits?: RateLimit;
  edgeEventRateLimitsPerEdge?: RateLimit;
  edgeUplinkMessagesRateLimits?: RateLimit;
  edgeUplinkMessagesRateLimitsPerEdge?: RateLimit;

  // TTL
  defaultStorageTtlDays: number;
  alarmsTtlDays: number;
  rpcTtlDays: number;
  queueStatsTtlDays: number;
  ruleEngineExceptionsTtlDays: number;

  // WS quotas
  maxWsSessionsPerTenant: number;
  maxWsSessionsPerCustomer: number;
  maxWsSessionsPerRegularUser: number;
  maxWsSessionsPerPublicUser: number;
  wsMsgQueueLimitPerSession: number;
  maxWsSubscriptionsPerTenant: number;
  maxWsSubscriptionsPerCustomer: number;
  maxWsSubscriptionsPerRegularUser: number;
  maxWsSubscriptionsPerPublicUser: number;
  wsUpdatesPerSessionRateLimit?: RateLimit;

  // Calculated fields
  maxCalculatedFieldsPerEntity: number;
  maxArgumentsPerCF: number;
  maxRelationLevelPerCfArgument: number;
  minAllowedDeduplicationIntervalInSecForCF: number;
  minAllowedAggregationIntervalInSecForCF: number;
  maxRelatedEntitiesToReturnPerCfArgument: number;
  minAllowedScheduledUpdateIntervalInSecForCF: number;
  intermediateAggregationIntervalInSecForCF: number;
  cfReevaluationCheckInterval: number;
  alarmsReevaluationInterval: number;
  maxDataPointsPerRollingArg: number;
  maxStateSizeInKBytes: number;
  maxSingleValueArgumentSizeInKBytes: number;
  calculatedFieldDebugEventsRateLimit?: RateLimit;
}

/** Queue submit strategies (ui-ngx QueueSubmitStrategyTypes). */
export type QueueSubmitStrategyType =
  | 'SEQUENTIAL_BY_ORIGINATOR'
  | 'SEQUENTIAL_BY_TENANT'
  | 'SEQUENTIAL'
  | 'BURST'
  | 'BATCH';

/** Queue processing strategies (ui-ngx QueueProcessingStrategyTypes). */
export type QueueProcessingStrategyType =
  | 'RETRY_FAILED_AND_TIMED_OUT'
  | 'SKIP_ALL_FAILURES'
  | 'SKIP_ALL_FAILURES_AND_TIMED_OUT'
  | 'RETRY_ALL'
  | 'RETRY_FAILED'
  | 'RETRY_TIMED_OUT';

/**
 * A rule-engine queue definition inside profileData.queueConfiguration.
 * The topic is derived server-side (`tb_rule_engine.<name>`), drafts omit
 * id/createdTime.
 */
export interface QueueInfo {
  id?: EntityIdOf<EntityType.QUEUE>;
  createdTime?: number;
  name: string;
  topic?: string;
  packProcessingTimeout: number;
  partitions: number;
  consumerPerPartition: boolean;
  pollInterval: number;
  processingStrategy: {
    type: QueueProcessingStrategyType;
    retries: number;
    failurePercentage: number;
    pauseBetweenRetries: number;
    maxPauseBetweenRetries: number;
  };
  submitStrategy: {
    type: QueueSubmitStrategyType;
    batchSize: number;
  };
  additionalInfo?: {
    description?: string;
    customProperties?: string;
    duplicateMsgToAllPartitions?: boolean;
  };
}

/** profileData of a tenant profile. */
export interface TenantProfileData {
  configuration: TenantProfileConfiguration;
  /** Present only for isolatedTbRuleEngine profiles. */
  queueConfiguration?: Array<QueueInfo> | null;
}

/** POST /api/tenantProfile body + GET /api/tenantProfile/{id} response. */
export interface TenantProfile
  extends BaseData<EntityIdOf<EntityType.TENANT_PROFILE>>,
    HasVersion {
  name: string;
  description?: string;
  default?: boolean;
  isolatedTbRuleEngine?: boolean;
  profileData?: TenantProfileData;
}

/** GET /api/tenantProfileInfos row — the picker/digest shape. */
export interface TenantProfileInfo
  extends BaseData<EntityIdOf<EntityType.TENANT_PROFILE>> {
  name: string;
  description?: string;
  default?: boolean;
  isolatedTbRuleEngine?: boolean;
}
