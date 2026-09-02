/**
 * en-US tenant-profile keys — mirrors zh-CN/tenant-profiles/index.ts
 * key-for-key (check-locale gate). Wording follows the ui-ngx en baseline.
 */
export default {
  // ---- list ----
  'pages.tenantProfiles.list.search': 'Search tenant profiles',
  'pages.tenantProfiles.list.refresh': 'Refresh',
  'pages.tenantProfiles.list.add': 'Add tenant profile',
  'pages.tenantProfiles.list.total': '{count} total',
  'pages.tenantProfiles.list.empty': 'No tenant profiles',
  'pages.tenantProfiles.list.loadFailed': 'Failed to load tenant profiles',
  'pages.tenantProfiles.list.createdTime': 'Created time',
  'pages.tenantProfiles.list.name': 'Name',
  'pages.tenantProfiles.list.description': 'Description',
  'pages.tenantProfiles.list.default': 'Default',
  'pages.tenantProfiles.list.selectedCount': '{count} selected',
  'pages.tenantProfiles.list.batchDelete': 'Delete selected',
  'pages.tenantProfiles.list.batchResult': '{ok} succeeded, {fail} failed.',
  'pages.tenantProfiles.list.actionExport': 'Export tenant profile',
  'pages.tenantProfiles.list.actionSetDefault': 'Make default tenant profile',
  'pages.tenantProfiles.list.actionDelete': 'Delete tenant profile',
  'pages.tenantProfiles.list.deleteTitle':
    "Are you sure you want to delete the tenant profile '{name}'?",
  'pages.tenantProfiles.list.deleteText':
    'Be careful, after the confirmation the tenant profile and all related data will become unrecoverable.',
  'pages.tenantProfiles.list.deleteManyTitle':
    'Are you sure you want to delete {count, plural, =1 {1 tenant profile} other {# tenant profiles}}?',
  'pages.tenantProfiles.list.deleteManyText':
    'Be careful, after the confirmation all selected tenant profiles will be removed and all related data will become unrecoverable.',
  'pages.tenantProfiles.list.setDefaultTitle':
    "Are you sure you want to make the tenant profile '{name}' default?",
  'pages.tenantProfiles.list.setDefaultText':
    'After the confirmation the tenant profile will be marked as default and used for new tenants without an explicit profile.',
  'pages.tenantProfiles.list.toastDeleted': 'Tenant profile deleted.',
  'pages.tenantProfiles.list.toastDefaultSet':
    'Default tenant profile updated.',

  // ---- detail page ----
  'pages.tenantProfiles.detail.name': 'Name',
  'pages.tenantProfiles.detail.nameRequired': 'Name is required.',
  'pages.tenantProfiles.detail.nameMaxLength':
    'Name must be at most 255 characters.',
  'pages.tenantProfiles.detail.isolatedTbRuleEngine':
    'Isolated ThingsBoard Rule Engine queues',
  'pages.tenantProfiles.detail.queues': 'Queues',
  'pages.tenantProfiles.detail.profileConfiguration': 'Profile configuration',
  'pages.tenantProfiles.detail.tabAttributes': 'Attributes',
  'pages.tenantProfiles.detail.tabLatestTelemetry': 'Latest telemetry',
  'pages.tenantProfiles.detail.tabAuditLogs': 'Audit logs',
  'pages.tenantProfiles.detail.toastSaved': 'Tenant profile saved.',
  'pages.tenantProfiles.detail.loadFailed': 'Failed to load the tenant profile',
  'pages.tenantProfiles.detail.actionSave': 'Save',
  'pages.tenantProfiles.detail.editingHint':
    'Edit the profile fields, then save. Unsaved changes are guarded on leave.',

  // ---- configuration form groups and fields ----
  'pages.tenantProfiles.config.unlimited': '(0 — unlimited)',
  'pages.tenantProfiles.config.requiredMessage': 'This field is required.',
  'pages.tenantProfiles.config.rateLimitPattern':
    'Format: comma-separated capacity and period (seconds) pairs, e.g. 100:1,2000:60',
  'pages.tenantProfiles.config.advancedSettings': 'Advanced settings',
  'pages.tenantProfiles.config.smsEnabled': 'SMS enabled',
  'pages.tenantProfiles.config.groupEntities': 'Entities',
  'pages.tenantProfiles.config.groupRuleEngine': 'Rule engine',
  'pages.tenantProfiles.config.groupCalculatedFields': 'Calculated fields',
  'pages.tenantProfiles.config.groupTtl': 'Time to live',
  'pages.tenantProfiles.config.groupAlarmsNotifications':
    'Alarms and notifications',
  'pages.tenantProfiles.config.groupDebug': 'Debug',
  'pages.tenantProfiles.config.groupFiles': 'Files',
  'pages.tenantProfiles.config.groupWs': 'WS',
  'pages.tenantProfiles.config.groupRateLimits': 'Rate limits',
  'pages.tenantProfiles.config.maxDevices': 'Maximum number of devices',
  'pages.tenantProfiles.config.maxDashboards': 'Maximum number of dashboards',
  'pages.tenantProfiles.config.maxAssets': 'Maximum number of assets',
  'pages.tenantProfiles.config.maxUsers': 'Maximum number of users',
  'pages.tenantProfiles.config.maxCustomers': 'Maximum number of customers',
  'pages.tenantProfiles.config.maxRuleChains': 'Maximum number of rule chains',
  'pages.tenantProfiles.config.maxEdges': 'Maximum number of edges',
  'pages.tenantProfiles.config.maxREExecutions':
    'Maximum number of rule engine executions',
  'pages.tenantProfiles.config.maxTransportMessages':
    'Maximum number of transport messages',
  'pages.tenantProfiles.config.maxJSExecutions':
    'Maximum number of JavaScript executions',
  'pages.tenantProfiles.config.maxTbelExecutions':
    'Maximum number of TBEL executions',
  'pages.tenantProfiles.config.maxRuleNodeExecutionsPerMessage':
    'Maximum number of rule node executions per message',
  'pages.tenantProfiles.config.maxTransportDataPoints':
    'Maximum number of transport data points',
  'pages.tenantProfiles.config.maxCalculatedFields':
    'Maximum number of calculated fields per entity',
  'pages.tenantProfiles.config.maxDataPointsPerRollingArg':
    'Maximum number of data points in a rolling argument',
  'pages.tenantProfiles.config.maxArgumentsPerCF':
    'Maximum number of arguments per calculated field',
  'pages.tenantProfiles.config.maxStateSize': 'Maximum state size (KB)',
  'pages.tenantProfiles.config.maxValueArgumentSize':
    'Maximum single value argument size (KB)',
  'pages.tenantProfiles.config.maxRelatedLevelPerArgument':
    'Maximum relation level for a "related entity" argument',
  'pages.tenantProfiles.config.minAllowedScheduledUpdateInterval':
    'Minimum allowed scheduled update interval for a "related entity" argument (seconds)',
  'pages.tenantProfiles.config.minAllowedAggregationInterval':
    'Minimum allowed aggregation interval (seconds)',
  'pages.tenantProfiles.config.minAllowedDeduplicationInterval':
    'Minimum allowed deduplication interval (seconds)',
  'pages.tenantProfiles.config.intermediateAggregationInterval':
    'Intermediate aggregation interval (seconds)',
  'pages.tenantProfiles.config.reevaluationCheckInterval':
    'Reevaluation check interval (seconds)',
  'pages.tenantProfiles.config.relationSearchEntityLimit':
    'Relation search entity limit',
  'pages.tenantProfiles.config.maxDPStorageDays':
    'Maximum number of days to store data points',
  'pages.tenantProfiles.config.alarmsTtlDays': 'Number of days to store alarms',
  'pages.tenantProfiles.config.defaultStorageTtlDays':
    'Default storage TTL in days',
  'pages.tenantProfiles.config.rpcTtlDays': 'RPC TTL in days',
  'pages.tenantProfiles.config.queueStatsTtlDays':
    'Queue statistics TTL in days',
  'pages.tenantProfiles.config.ruleEngineExceptionsTtlDays':
    'Rule engine exceptions TTL in days',
  'pages.tenantProfiles.config.maxSms': 'Maximum number of SMS to send',
  'pages.tenantProfiles.config.maxEmails': 'Maximum number of emails to send',
  'pages.tenantProfiles.config.maxCreatedAlarms':
    'Maximum number of created alarms',
  'pages.tenantProfiles.config.alarmsReevaluationInterval':
    'Alarms reevaluation interval (seconds)',
  'pages.tenantProfiles.config.maximumDebugDurationMin':
    'Maximum debug duration (minutes)',
  'pages.tenantProfiles.config.maxResourcesSumDataSize':
    'Maximum total size of resource files (bytes)',
  'pages.tenantProfiles.config.maxOtaPackagesSumDataSize':
    'Maximum total size of OTA package files (bytes)',
  'pages.tenantProfiles.config.maxResourceSize':
    'Maximum size of a single resource file (bytes)',
  'pages.tenantProfiles.config.wsSessionsPerTenant':
    'Maximum number of sessions per tenant',
  'pages.tenantProfiles.config.wsSubscriptionsPerTenant':
    'Maximum number of subscriptions per tenant',
  'pages.tenantProfiles.config.wsSessionsPerCustomer':
    'Maximum number of sessions per customer',
  'pages.tenantProfiles.config.wsSubscriptionsPerCustomer':
    'Maximum number of subscriptions per customer',
  'pages.tenantProfiles.config.wsSessionsPerRegularUser':
    'Maximum number of sessions per regular user',
  'pages.tenantProfiles.config.wsSubscriptionsPerRegularUser':
    'Maximum number of subscriptions per regular user',
  'pages.tenantProfiles.config.wsSessionsPerPublicUser':
    'Maximum number of sessions per public user',
  'pages.tenantProfiles.config.wsSubscriptionsPerPublicUser':
    'Maximum number of subscriptions per public user',
  'pages.tenantProfiles.config.wsQueuePerSession':
    'Maximum message queue size per session',
  'pages.tenantProfiles.config.transportTenantMsg': 'Transport tenant messages',
  'pages.tenantProfiles.config.transportDeviceMsg': 'Transport device messages',
  'pages.tenantProfiles.config.transportTenantTelemetryMsg':
    'Transport tenant telemetry messages',
  'pages.tenantProfiles.config.transportDeviceTelemetryMsg':
    'Transport device telemetry messages',
  'pages.tenantProfiles.config.transportGatewayMsg':
    'Transport Gateway messages',
  'pages.tenantProfiles.config.transportGatewayDeviceMsg':
    'Transport Gateway device messages',
  'pages.tenantProfiles.config.transportGatewayTelemetryMsg':
    'Transport Gateway telemetry messages',
  'pages.tenantProfiles.config.transportGatewayDeviceTelemetryMsg':
    'Transport Gateway device telemetry messages',
  'pages.tenantProfiles.config.transportTenantTelemetryDataPoints':
    'Transport tenant telemetry data points',
  'pages.tenantProfiles.config.transportDeviceTelemetryDataPoints':
    'Transport device telemetry data points',
  'pages.tenantProfiles.config.transportGatewayTelemetryDataPoints':
    'Transport Gateway telemetry data points',
  'pages.tenantProfiles.config.transportGatewayDeviceTelemetryDataPoints':
    'Transport Gateway device telemetry data points',
  'pages.tenantProfiles.config.tenantRestLimits': 'Tenant REST requests',
  'pages.tenantProfiles.config.customerRestLimits': 'Customer REST requests',
  'pages.tenantProfiles.config.tenantEntityExportRateLimit':
    'Entity version creation',
  'pages.tenantProfiles.config.tenantEntityImportRateLimit':
    'Entity version loading',
  'pages.tenantProfiles.config.cassandraWriteTenantCore':
    'Rest API Cassandra write queries',
  'pages.tenantProfiles.config.cassandraReadTenantCore':
    'Rest API and WS telemetry Cassandra read queries',
  'pages.tenantProfiles.config.cassandraWriteTenantRuleEngine':
    'Rule engine telemetry Cassandra write queries',
  'pages.tenantProfiles.config.cassandraReadTenantRuleEngine':
    'Rule engine telemetry Cassandra read queries',
  'pages.tenantProfiles.config.tenantNotificationRequest':
    'Notification requests',
  'pages.tenantProfiles.config.tenantNotificationRequestsPerRule':
    'Notification requests per notification rule',
  'pages.tenantProfiles.config.edgeEventsRateLimit': 'Edge events',
  'pages.tenantProfiles.config.edgeEventsPerEdgeRateLimit':
    'Edge events per edge',
  'pages.tenantProfiles.config.edgeUplinkMessagesRateLimit':
    'Edge uplink messages',
  'pages.tenantProfiles.config.edgeUplinkMessagesPerEdgeRateLimit':
    'Edge uplink messages per edge',
  'pages.tenantProfiles.config.wsUpdatesPerSession': 'WS updates per session',

  // ---- queues editor ----
  'pages.tenantProfiles.queues.noQueue': 'No queues configured',
  'pages.tenantProfiles.queues.addQueue': 'Add queue',
  'pages.tenantProfiles.queues.delete': 'Delete queue',
  'pages.tenantProfiles.queues.name': 'Name',
  'pages.tenantProfiles.queues.nameRequired': 'Queue name is required!',
  'pages.tenantProfiles.queues.namePattern':
    'Queue name contains characters other than ASCII alphanumerics, ".", "_" and "-"!',
  'pages.tenantProfiles.queues.pollInterval': 'Polling interval',
  'pages.tenantProfiles.queues.pollIntervalRequired':
    'Polling interval is required!',
  'pages.tenantProfiles.queues.partitions': 'Partitions',
  'pages.tenantProfiles.queues.partitionsRequired': 'Partitions is required!',
  'pages.tenantProfiles.queues.packProcessingTimeout':
    'Pack processing timeout (ms)',
  'pages.tenantProfiles.queues.packProcessingTimeoutRequired':
    'Pack processing timeout is required!',
  'pages.tenantProfiles.queues.submitSettings': 'Submit settings',
  'pages.tenantProfiles.queues.submitStrategy': 'Strategy type',
  'pages.tenantProfiles.queues.submitStrategyTypeRequired':
    'Submit strategy type is required!',
  'pages.tenantProfiles.queues.batchSize': 'Batch size',
  'pages.tenantProfiles.queues.batchSizeRequired': 'Batch size is required!',
  'pages.tenantProfiles.queues.processingSettings': 'Retry processing settings',
  'pages.tenantProfiles.queues.processingStrategy': 'Processing type',
  'pages.tenantProfiles.queues.processingStrategyTypeRequired':
    'Processing strategy type is required!',
  'pages.tenantProfiles.queues.retries': 'Retries (0 — unlimited)',
  'pages.tenantProfiles.queues.retriesRequired': 'Retries is required!',
  'pages.tenantProfiles.queues.failurePercentage':
    'Percentage of failed messages to skip retries (%)',
  'pages.tenantProfiles.queues.failurePercentageRequired':
    'Failure percentage is required!',
  'pages.tenantProfiles.queues.pauseBetweenRetries':
    'Pause between retries (seconds)',
  'pages.tenantProfiles.queues.pauseBetweenRetriesRequired':
    'Pause between retries is required!',
  'pages.tenantProfiles.queues.maxPauseBetweenRetries':
    'Extra pause between retries (seconds)',
  'pages.tenantProfiles.queues.maxPauseBetweenRetriesRequired':
    'Max pause between retries is required!',
  'pages.tenantProfiles.queues.consumerPerPartition':
    'Poll messages per consumer per partition',
  'pages.tenantProfiles.queues.duplicateMsgToAllPartitions':
    'Duplicate messages to all partitions',
  'pages.tenantProfiles.queues.customProperties': 'Custom properties',
  'pages.tenantProfiles.queues.description': 'Description',
};
