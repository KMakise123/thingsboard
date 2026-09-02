/**
 * Tenant-profile form value helpers (ui-ngx tenant-profile.component.ts +
 * queue-form.component.ts parity).
 *
 * - createDefaultTenantProfileConfiguration mirrors ui-ngx
 *   createTenantProfileConfiguration(DEFAULT): the numbers the form needs
 *   to render for a brand-new profile (0 = unlimited).
 * - The isolated-rule-engine toggle seeds the three stock rule-engine
 *   queues (Main / HighPriority / SequentialByOriginator) exactly like the
 *   ui-ngx formGroup valueChanges subscriber, and clears them when toggled
 *   off.
 * - toWireProfile merges the form configuration OVER the existing one so
 *   server-side fields the v1 form does not edit survive a save.
 */
import type {
  QueueInfo,
  TenantProfile,
  TenantProfileConfiguration,
} from '@/types/tb/tenant';

export function createDefaultTenantProfileConfiguration(): TenantProfileConfiguration {
  return {
    type: 'DEFAULT',
    maxDevices: 0,
    maxAssets: 0,
    maxCustomers: 0,
    maxUsers: 0,
    maxDashboards: 0,
    maxRuleChains: 0,
    maxEdges: 0,
    maxResourcesInBytes: 0,
    maxOtaPackagesInBytes: 0,
    maxResourceSize: 0,
    maxTransportMessages: 0,
    maxTransportDataPoints: 0,
    maxREExecutions: 0,
    maxJSExecutions: 0,
    maxTbelExecutions: 0,
    maxDPStorageDays: 0,
    maxRuleNodeExecutionsPerMessage: 0,
    maxEmails: 0,
    maxSms: 0,
    smsEnabled: true,
    maxCreatedAlarms: 0,
    maxDebugModeDurationMinutes: 15,
    tenantServerRestLimitsConfiguration: '',
    customerServerRestLimitsConfiguration: '',
    maxWsSessionsPerTenant: 0,
    maxWsSessionsPerCustomer: 0,
    maxWsSessionsPerRegularUser: 0,
    maxWsSessionsPerPublicUser: 0,
    wsMsgQueueLimitPerSession: 0,
    maxWsSubscriptionsPerTenant: 0,
    maxWsSubscriptionsPerCustomer: 0,
    maxWsSubscriptionsPerRegularUser: 0,
    maxWsSubscriptionsPerPublicUser: 0,
    wsUpdatesPerSessionRateLimit: '',
    defaultStorageTtlDays: 0,
    alarmsTtlDays: 0,
    rpcTtlDays: 0,
    queueStatsTtlDays: 0,
    ruleEngineExceptionsTtlDays: 0,
    maxCalculatedFieldsPerEntity: 5,
    maxArgumentsPerCF: 10,
    maxDataPointsPerRollingArg: 1000,
    maxRelationLevelPerCfArgument: 2,
    minAllowedDeduplicationIntervalInSecForCF: 10,
    minAllowedAggregationIntervalInSecForCF: 60,
    maxRelatedEntitiesToReturnPerCfArgument: 100,
    minAllowedScheduledUpdateIntervalInSecForCF: 10,
    intermediateAggregationIntervalInSecForCF: 300,
    cfReevaluationCheckInterval: 60,
    alarmsReevaluationInterval: 60,
    maxStateSizeInKBytes: 32,
    maxSingleValueArgumentSizeInKBytes: 2,
    calculatedFieldDebugEventsRateLimit: '',
  };
}

/** The stock queues ui-ngx seeds when isolatedTbRuleEngine turns on. */
export function defaultIsolatedQueues(): Array<QueueInfo> {
  const base = {
    packProcessingTimeout: 10000,
    partitions: 1,
    consumerPerPartition: false,
    pollInterval: 2000,
    additionalInfo: {
      description: '',
      customProperties: '',
      duplicateMsgToAllPartitions: false,
    },
  };
  return [
    {
      ...base,
      name: 'Main',
      submitStrategy: { type: 'BURST', batchSize: 1000 },
      processingStrategy: {
        type: 'SKIP_ALL_FAILURES',
        retries: 3,
        failurePercentage: 0,
        pauseBetweenRetries: 3,
        maxPauseBetweenRetries: 3,
      },
    },
    {
      ...base,
      name: 'HighPriority',
      submitStrategy: { type: 'BURST', batchSize: 100 },
      processingStrategy: {
        type: 'RETRY_FAILED_AND_TIMED_OUT',
        retries: 0,
        failurePercentage: 0,
        pauseBetweenRetries: 5,
        maxPauseBetweenRetries: 5,
      },
    },
    {
      ...base,
      name: 'SequentialByOriginator',
      submitStrategy: { type: 'SEQUENTIAL_BY_ORIGINATOR', batchSize: 100 },
      processingStrategy: {
        type: 'RETRY_FAILED_AND_TIMED_OUT',
        retries: 3,
        failurePercentage: 0,
        pauseBetweenRetries: 5,
        maxPauseBetweenRetries: 5,
      },
    },
  ];
}

/** Flattened form shape (antd Form name-path friendly). */
export interface TenantProfileFormValues {
  name: string;
  description?: string;
  isolatedTbRuleEngine: boolean;
  profileData: {
    configuration: TenantProfileConfiguration;
    queueConfiguration?: Array<QueueInfo> | null;
  };
}

export function profileToFormValues(
  profile?: TenantProfile | null,
): TenantProfileFormValues {
  return {
    name: profile?.name ?? '',
    description: profile?.description,
    isolatedTbRuleEngine: !!profile?.isolatedTbRuleEngine,
    profileData: {
      configuration:
        profile?.profileData?.configuration ??
        createDefaultTenantProfileConfiguration(),
      queueConfiguration: profile?.profileData?.queueConfiguration ?? null,
    },
  };
}

/** Merge the form shape back onto the wire entity (keeps unknown fields). */
export function formValuesToProfile(
  values: TenantProfileFormValues,
  existing?: TenantProfile | null,
): TenantProfile {
  const base =
    existing ??
    ({
      // Create: the backend mints id/createdTime.
      name: '',
      isolatedTbRuleEngine: false,
      profileData: { configuration: createDefaultTenantProfileConfiguration() },
    } as unknown as TenantProfile);
  return {
    ...base,
    name: values.name.trim(),
    description: values.description,
    isolatedTbRuleEngine: values.isolatedTbRuleEngine,
    profileData: {
      configuration: {
        // Spread the server configuration first: fields the v1 form does
        // not render keep their values across saves.
        ...(existing?.profileData?.configuration ??
          createDefaultTenantProfileConfiguration()),
        ...values.profileData.configuration,
        type: 'DEFAULT',
      },
      queueConfiguration: values.isolatedTbRuleEngine
        ? (values.profileData.queueConfiguration ?? null)
        : null,
    },
  };
}
