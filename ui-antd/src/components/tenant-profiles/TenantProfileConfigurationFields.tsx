/**
 * Tenant-profile configuration form fields (ui-ngx
 * default-tenant-profile-configuration parity, AntD-ized).
 *
 * The nine fieldsets render in ui-ngx order: Entities / Rule engine /
 * Calculated fields / TTL / Alarms & notifications / Debug / Files / WS /
 * Rate limits. Every group carries the "(0 — unlimited)" hint; the groups
 * with an "Advanced settings" expansion panel in ui-ngx collapse here
 * (antd Collapse, collapsed by default). Number inputs are required with a
 * min per the ui-ngx range validators; rate limits are string inputs
 * validated against the "capacity:period[,capacity:period]" syntax
 * (e.g. "1000:1,20000:60").
 */
import { Collapse, Form, Input, InputNumber, Switch } from 'antd';
import { useIntl } from 'react-intl';

interface BaseProps {
  /** Form name path of the configuration object (e.g. profileData > configuration). */
  prefix: Array<string>;
}

/** Field spec: [configField, labelKey, defaultMessage, min?]. */
type FieldSpec = [string, string, string, number?];

function NumberItem({
  name,
  label,
  min,
}: {
  name: Array<string>;
  label: string;
  min: number;
}) {
  const { formatMessage } = useIntl();
  return (
    <Form.Item
      name={name}
      label={label}
      rules={[
        {
          required: true,
          message: formatMessage({
            id: 'pages.tenantProfiles.config.requiredMessage',
            defaultMessage: 'This field is required.',
          }),
        },
      ]}
    >
      <InputNumber className="w-full" min={min} precision={0} />
    </Form.Item>
  );
}

function RateItem({ name, label }: { name: Array<string>; label: string }) {
  const { formatMessage } = useIntl();
  return (
    <Form.Item
      name={name}
      label={label}
      // TB rate-limit syntax: comma-separated capacity:period pairs
      // (seconds), e.g. "1000:1,20000:60". Empty = not set.
      rules={[
        {
          validator: (_rule, value: string | undefined) => {
            const text = value?.trim();
            if (!text) {
              return Promise.resolve();
            }
            const pair = /^\d+:\d+(,\d+:\d+)*$/;
            return pair.test(text)
              ? Promise.resolve()
              : Promise.reject(
                  new Error(
                    formatMessage({
                      id: 'pages.tenantProfiles.config.rateLimitPattern',
                      defaultMessage:
                        'Format: comma-separated capacity and period (seconds) pairs, e.g. 100:1,2000:60',
                    }),
                  ),
                );
          },
        },
      ]}
    >
      <Input allowClear placeholder="1000:1,20000:60" />
    </Form.Item>
  );
}

function GroupGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-x-6 md:grid-cols-3">{children}</div>
  );
}

/** The ui-ngx groups: title + basic numbers + optional advanced collapse. */
interface GroupSpec {
  titleKey: string;
  titleDefault: string;
  unlimited?: boolean;
  smsToggle?: boolean;
  basic: FieldSpec[];
  advanced?: FieldSpec[];
}

const GROUPS: Array<GroupSpec> = [
  {
    titleKey: 'groupEntities',
    titleDefault: 'Entities',
    unlimited: true,
    basic: [
      ['maxDevices', 'maxDevices', 'Maximum number of devices'],
      ['maxDashboards', 'maxDashboards', 'Maximum number of dashboards'],
      ['maxAssets', 'maxAssets', 'Maximum number of assets'],
      ['maxUsers', 'maxUsers', 'Maximum number of users'],
    ],
    advanced: [
      ['maxCustomers', 'maxCustomers', 'Maximum number of customers'],
      ['maxRuleChains', 'maxRuleChains', 'Maximum number of rule chains'],
      ['maxEdges', 'maxEdges', 'Maximum number of edges'],
    ],
  },
  {
    titleKey: 'groupRuleEngine',
    titleDefault: 'Rule engine',
    unlimited: true,
    basic: [
      [
        'maxREExecutions',
        'maxREExecutions',
        'Maximum number of rule engine executions',
      ],
      [
        'maxTransportMessages',
        'maxTransportMessages',
        'Maximum number of transport messages',
      ],
    ],
    advanced: [
      [
        'maxJSExecutions',
        'maxJSExecutions',
        'Maximum number of JavaScript executions',
      ],
      [
        'maxTbelExecutions',
        'maxTbelExecutions',
        'Maximum number of TBEL executions',
      ],
      [
        'maxRuleNodeExecutionsPerMessage',
        'maxRuleNodeExecutionsPerMessage',
        'Maximum number of rule node executions per message',
      ],
      [
        'maxTransportDataPoints',
        'maxTransportDataPoints',
        'Maximum number of transport data points',
      ],
    ],
  },
  {
    titleKey: 'groupCalculatedFields',
    titleDefault: 'Calculated fields',
    unlimited: true,
    basic: [
      [
        'maxCalculatedFieldsPerEntity',
        'maxCalculatedFields',
        'Maximum number of calculated fields per entity',
      ],
      [
        'maxDataPointsPerRollingArg',
        'maxDataPointsPerRollingArg',
        'Maximum number of data points in a rolling argument',
      ],
      [
        'maxArgumentsPerCF',
        'maxArgumentsPerCF',
        'Maximum number of arguments per calculated field',
      ],
    ],
    advanced: [
      ['maxStateSizeInKBytes', 'maxStateSize', 'Maximum state size (KB)'],
      [
        'maxSingleValueArgumentSizeInKBytes',
        'maxValueArgumentSize',
        'Maximum single value argument size (KB)',
      ],
      [
        'maxRelationLevelPerCfArgument',
        'maxRelatedLevelPerArgument',
        'Maximum relation level for a "related entity" argument',
        1,
      ],
      [
        'minAllowedScheduledUpdateIntervalInSecForCF',
        'minAllowedScheduledUpdateInterval',
        'Minimum allowed scheduled update interval for a "related entity" argument (seconds)',
      ],
      [
        'minAllowedAggregationIntervalInSecForCF',
        'minAllowedAggregationInterval',
        'Minimum allowed aggregation interval (seconds)',
      ],
      [
        'minAllowedDeduplicationIntervalInSecForCF',
        'minAllowedDeduplicationInterval',
        'Minimum allowed deduplication interval (seconds)',
      ],
      [
        'intermediateAggregationIntervalInSecForCF',
        'intermediateAggregationInterval',
        'Intermediate aggregation interval (seconds)',
        1,
      ],
      [
        'cfReevaluationCheckInterval',
        'reevaluationCheckInterval',
        'Reevaluation check interval (seconds)',
        1,
      ],
      [
        'maxRelatedEntitiesToReturnPerCfArgument',
        'relationSearchEntityLimit',
        'Relation search entity limit',
        1,
      ],
    ],
  },
  {
    titleKey: 'groupTtl',
    titleDefault: 'Time to live',
    unlimited: true,
    basic: [
      [
        'maxDPStorageDays',
        'maxDPStorageDays',
        'Maximum number of days to store data points',
      ],
      ['alarmsTtlDays', 'alarmsTtlDays', 'Number of days to store alarms'],
      [
        'defaultStorageTtlDays',
        'defaultStorageTtlDays',
        'Default storage TTL in days',
      ],
      ['rpcTtlDays', 'rpcTtlDays', 'RPC TTL in days'],
      [
        'queueStatsTtlDays',
        'queueStatsTtlDays',
        'Queue statistics TTL in days',
      ],
      [
        'ruleEngineExceptionsTtlDays',
        'ruleEngineExceptionsTtlDays',
        'Rule engine exceptions TTL in days',
      ],
    ],
  },
  {
    titleKey: 'groupAlarmsNotifications',
    titleDefault: 'Alarms and notifications',
    unlimited: true,
    smsToggle: true,
    basic: [
      ['maxSms', 'maxSms', 'Maximum number of SMS to send'],
      ['maxEmails', 'maxEmails', 'Maximum number of emails to send'],
      [
        'maxCreatedAlarms',
        'maxCreatedAlarms',
        'Maximum number of created alarms',
      ],
      [
        'alarmsReevaluationInterval',
        'alarmsReevaluationInterval',
        'Alarms reevaluation interval (seconds)',
        1,
      ],
    ],
  },
  {
    titleKey: 'groupDebug',
    titleDefault: 'Debug',
    basic: [
      [
        'maxDebugModeDurationMinutes',
        'maximumDebugDurationMin',
        'Maximum debug duration (minutes)',
      ],
    ],
  },
  {
    titleKey: 'groupFiles',
    titleDefault: 'Files',
    unlimited: true,
    basic: [
      [
        'maxResourcesInBytes',
        'maxResourcesSumDataSize',
        'Maximum total size of resource files (bytes)',
      ],
      [
        'maxOtaPackagesInBytes',
        'maxOtaPackagesSumDataSize',
        'Maximum total size of OTA package files (bytes)',
      ],
      [
        'maxResourceSize',
        'maxResourceSize',
        'Maximum size of a single resource file (bytes)',
      ],
    ],
  },
  {
    titleKey: 'groupWs',
    titleDefault: 'WS',
    unlimited: true,
    basic: [
      [
        'maxWsSessionsPerTenant',
        'wsSessionsPerTenant',
        'Maximum number of sessions per tenant',
      ],
      [
        'maxWsSubscriptionsPerTenant',
        'wsSubscriptionsPerTenant',
        'Maximum number of subscriptions per tenant',
      ],
      [
        'maxWsSessionsPerCustomer',
        'wsSessionsPerCustomer',
        'Maximum number of sessions per customer',
      ],
      [
        'maxWsSubscriptionsPerCustomer',
        'wsSubscriptionsPerCustomer',
        'Maximum number of subscriptions per customer',
      ],
    ],
    advanced: [
      [
        'maxWsSessionsPerRegularUser',
        'wsSessionsPerRegularUser',
        'Maximum number of sessions per regular user',
      ],
      [
        'maxWsSubscriptionsPerRegularUser',
        'wsSubscriptionsPerRegularUser',
        'Maximum number of subscriptions per regular user',
      ],
      [
        'maxWsSessionsPerPublicUser',
        'wsSessionsPerPublicUser',
        'Maximum number of sessions per public user',
      ],
      [
        'maxWsSubscriptionsPerPublicUser',
        'wsSubscriptionsPerPublicUser',
        'Maximum number of subscriptions per public user',
      ],
      [
        'wsMsgQueueLimitPerSession',
        'wsQueuePerSession',
        'Maximum message queue size per session',
      ],
    ],
  },
];

const RATE_LIMITS_BASIC: Array<FieldSpec> = [
  [
    'transportTenantMsgRateLimit',
    'transportTenantMsg',
    'Transport tenant messages',
  ],
  [
    'transportDeviceMsgRateLimit',
    'transportDeviceMsg',
    'Transport device messages',
  ],
  [
    'transportTenantTelemetryMsgRateLimit',
    'transportTenantTelemetryMsg',
    'Transport tenant telemetry messages',
  ],
  [
    'transportDeviceTelemetryMsgRateLimit',
    'transportDeviceTelemetryMsg',
    'Transport device telemetry messages',
  ],
  [
    'transportGatewayMsgRateLimit',
    'transportGatewayMsg',
    'Transport Gateway messages',
  ],
  [
    'transportGatewayDeviceMsgRateLimit',
    'transportGatewayDeviceMsg',
    'Transport Gateway device messages',
  ],
  [
    'transportGatewayTelemetryMsgRateLimit',
    'transportGatewayTelemetryMsg',
    'Transport Gateway telemetry messages',
  ],
  [
    'transportGatewayDeviceTelemetryMsgRateLimit',
    'transportGatewayDeviceTelemetryMsg',
    'Transport Gateway device telemetry messages',
  ],
];

const RATE_LIMITS_ADVANCED: Array<FieldSpec> = [
  [
    'transportTenantTelemetryDataPointsRateLimit',
    'transportTenantTelemetryDataPoints',
    'Transport tenant telemetry data points',
  ],
  [
    'transportDeviceTelemetryDataPointsRateLimit',
    'transportDeviceTelemetryDataPoints',
    'Transport device telemetry data points',
  ],
  [
    'transportGatewayTelemetryDataPointsRateLimit',
    'transportGatewayTelemetryDataPoints',
    'Transport Gateway telemetry data points',
  ],
  [
    'transportGatewayDeviceTelemetryDataPointsRateLimit',
    'transportGatewayDeviceTelemetryDataPoints',
    'Transport Gateway device telemetry data points',
  ],
  [
    'tenantServerRestLimitsConfiguration',
    'tenantRestLimits',
    'Tenant REST requests',
  ],
  [
    'customerServerRestLimitsConfiguration',
    'customerRestLimits',
    'Customer REST requests',
  ],
  [
    'tenantEntityExportRateLimit',
    'tenantEntityExportRateLimit',
    'Entity version creation',
  ],
  [
    'tenantEntityImportRateLimit',
    'tenantEntityImportRateLimit',
    'Entity version loading',
  ],
  [
    'cassandraWriteQueryTenantCoreRateLimits',
    'cassandraWriteTenantCore',
    'Rest API Cassandra write queries',
  ],
  [
    'cassandraReadQueryTenantCoreRateLimits',
    'cassandraReadTenantCore',
    'Rest API and WS telemetry Cassandra read queries',
  ],
  [
    'cassandraWriteQueryTenantRuleEngineRateLimits',
    'cassandraWriteTenantRuleEngine',
    'Rule engine telemetry Cassandra write queries',
  ],
  [
    'cassandraReadQueryTenantRuleEngineRateLimits',
    'cassandraReadTenantRuleEngine',
    'Rule engine telemetry Cassandra read queries',
  ],
  [
    'tenantNotificationRequestsRateLimit',
    'tenantNotificationRequest',
    'Notification requests',
  ],
  [
    'tenantNotificationRequestsPerRuleRateLimit',
    'tenantNotificationRequestsPerRule',
    'Notification requests per notification rule',
  ],
  ['edgeEventRateLimits', 'edgeEventsRateLimit', 'Edge events'],
  [
    'edgeEventRateLimitsPerEdge',
    'edgeEventsPerEdgeRateLimit',
    'Edge events per edge',
  ],
  [
    'edgeUplinkMessagesRateLimits',
    'edgeUplinkMessagesRateLimit',
    'Edge uplink messages',
  ],
  [
    'edgeUplinkMessagesRateLimitsPerEdge',
    'edgeUplinkMessagesPerEdgeRateLimit',
    'Edge uplink messages per edge',
  ],
  [
    'wsUpdatesPerSessionRateLimit',
    'wsUpdatesPerSession',
    'WS updates per session',
  ],
];

function GroupHeader({
  label,
  unlimited,
}: {
  label: string;
  unlimited?: boolean;
}) {
  const { formatMessage } = useIntl();
  return (
    <div className="mb-2 text-base font-medium">
      {label}{' '}
      {unlimited && (
        <span className="text-xs font-normal text-[rgba(0,0,0,0.45)]">
          {formatMessage({
            id: 'pages.tenantProfiles.config.unlimited',
            defaultMessage: '(0 — unlimited)',
          })}
        </span>
      )}
    </div>
  );
}

function AdvancedPanel({ children }: { children: React.ReactNode }) {
  const { formatMessage } = useIntl();
  return (
    <Collapse
      ghost
      className="mt-1"
      items={[
        {
          key: 'advanced',
          label: formatMessage({
            id: 'pages.tenantProfiles.config.advancedSettings',
            defaultMessage: 'Advanced settings',
          }),
          children: <GroupGrid>{children}</GroupGrid>,
        },
      ]}
    />
  );
}

function labelOf(
  formatMessage: ReturnType<typeof useIntl>['formatMessage'],
  spec: FieldSpec,
): string {
  return formatMessage({
    id: `pages.tenantProfiles.config.${spec[1]}`,
    defaultMessage: spec[2],
  });
}

export function TenantProfileConfigurationFields({ prefix }: BaseProps) {
  const { formatMessage } = useIntl();

  const renderNumbers = (specs: Array<FieldSpec>) =>
    specs.map((spec) => (
      <NumberItem
        key={spec[0]}
        name={[...prefix, spec[0]]}
        label={labelOf(formatMessage, spec)}
        min={spec[3] ?? 0}
      />
    ));

  const renderRates = (specs: Array<FieldSpec>) =>
    specs.map((spec) => (
      <RateItem
        key={spec[0]}
        name={[...prefix, spec[0]]}
        label={labelOf(formatMessage, spec)}
      />
    ));

  return (
    <div className="flex flex-col gap-6">
      {GROUPS.map((group) => (
        <fieldset key={group.titleKey} className="border-0 p-0">
          <GroupHeader
            label={formatMessage({
              id: `pages.tenantProfiles.config.${group.titleKey}`,
              defaultMessage: group.titleDefault,
            })}
            unlimited={group.unlimited}
          />
          <GroupGrid>
            {group.smsToggle && (
              <Form.Item
                name={[...prefix, 'smsEnabled']}
                label={formatMessage({
                  id: 'pages.tenantProfiles.config.smsEnabled',
                  defaultMessage: 'SMS enabled',
                })}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            )}
            {renderNumbers(group.basic)}
          </GroupGrid>
          {group.advanced && (
            <AdvancedPanel>{renderNumbers(group.advanced)}</AdvancedPanel>
          )}
        </fieldset>
      ))}

      <fieldset className="border-0 p-0">
        <GroupHeader
          label={formatMessage({
            id: 'pages.tenantProfiles.config.groupRateLimits',
            defaultMessage: 'Rate limits',
          })}
        />
        <GroupGrid>{renderRates(RATE_LIMITS_BASIC)}</GroupGrid>
        <AdvancedPanel>{renderRates(RATE_LIMITS_ADVANCED)}</AdvancedPanel>
      </fieldset>
    </div>
  );
}
