/** Notification rules keys (en-US side) — key-for-key identical with the other locale. */
export default {
  // ------------------------------------------------------------------ list
  'pages.notifications.rules.search': 'Search rules',
  'pages.notifications.rules.refresh': 'Refresh',
  'pages.notifications.rules.selectedCount': '{count} selected',
  'pages.notifications.rules.batchDelete': 'Delete selected',
  'pages.notifications.rules.add': 'Add rule',
  'pages.notifications.rules.createdTime': 'Created time',
  'pages.notifications.rules.name': 'Name',
  'pages.notifications.rules.templateName': 'Template',
  'pages.notifications.rules.triggerType': 'Trigger',
  'pages.notifications.rules.description': 'Description',
  'pages.notifications.rules.total': '{count} total',
  'pages.notifications.rules.empty': 'No notification rules',
  'pages.notifications.rules.loadFailed': 'Failed to load notification rules',
  'pages.notifications.rules.delete': 'Delete',
  'pages.notifications.rules.deleteOneTitle':
    "Delete the notification rule '{name}'?",
  'pages.notifications.rules.deleteOneText':
    'Be careful, after the confirmation the notification rule will become unrecoverable.',
  'pages.notifications.rules.deleteManyTitle':
    'Delete {count, plural, =1 {1 notification rule} other {# notification rules}}?',
  'pages.notifications.rules.deleteManyText': 'This cannot be undone.',
  'pages.notifications.rules.cancel': 'Cancel',
  'pages.notifications.rules.toastDeleted': 'Notification rule deleted.',
  'pages.notifications.rules.batchResult': '{ok} succeeded, {fail} failed.',
  'pages.notifications.rules.enableRule': 'Enable rule',
  'pages.notifications.rules.disableRule': 'Disable rule',
  'pages.notifications.rules.toggleFailed': 'Failed to update the rule',
  'pages.notifications.rules.copyRule': 'Copy rule',

  // ---------------------------------------------------------------- wizard
  'pages.notifications.rules.wizard.addTitle': 'Add notification rule',
  'pages.notifications.rules.wizard.editTitle': 'Edit notification rule',
  'pages.notifications.rules.wizard.stepBasic': 'Basic settings',
  'pages.notifications.rules.wizard.stepTrigger': 'Trigger settings',
  'pages.notifications.rules.wizard.name': 'Name',
  'pages.notifications.rules.wizard.nameRequired': 'Name is required',
  'pages.notifications.rules.wizard.enabled': 'Enable rule',
  'pages.notifications.rules.wizard.triggerType': 'Trigger',
  'pages.notifications.rules.wizard.template': 'Template',
  'pages.notifications.rules.wizard.templateRequired': 'Template is required',
  'pages.notifications.rules.wizard.searchTemplate': 'Search templates',
  'pages.notifications.rules.wizard.recipients': 'Recipients',
  'pages.notifications.rules.wizard.recipientsRequired':
    'Recipients is required',
  'pages.notifications.rules.wizard.searchTargets': 'Search recipients',
  'pages.notifications.rules.wizard.createRecipient': 'Create new recipient',
  'pages.notifications.rules.wizard.escalationChain': 'Escalation chain',
  'pages.notifications.rules.wizard.escalationsRequired':
    'Every stage needs recipients; delays must be between 1 minute and 7 days.',
  'pages.notifications.rules.wizard.next': 'Next',
  'pages.notifications.rules.wizard.back': 'Back',
  'pages.notifications.rules.wizard.add': 'Add',
  'pages.notifications.rules.wizard.save': 'Save',
  'pages.notifications.rules.wizard.toastSaved': 'Rule saved.',

  // ------------------------------------------------------ escalation chain
  'pages.notifications.rules.escalation.firstRecipient':
    'First recipients (immediately)',
  'pages.notifications.rules.escalation.after': 'After',
  'pages.notifications.rules.escalation.notify': 'notify',
  'pages.notifications.rules.escalation.addStage': 'Add stage',
  'pages.notifications.rules.escalation.remove': 'Remove',
  'pages.notifications.rules.escalation.stageInvalid':
    'Every stage needs recipients; delays must be between 1 minute and 7 days.',
  'pages.notifications.rules.escalation.searchTargets': 'Search recipients',
  'pages.notifications.rules.escalation.unit.minutes': 'minute(s)',
  'pages.notifications.rules.escalation.unit.hours': 'hour(s)',
  'pages.notifications.rules.escalation.unit.days': 'day(s)',
  'pages.notifications.rules.createNew': 'Create new',

  // --------------------------------------------------------- trigger names
  'pages.notifications.rules.trigger.ENTITY_ACTION': 'Entity action',
  'pages.notifications.rules.trigger.ALARM': 'Alarm',
  'pages.notifications.rules.trigger.ALARM_COMMENT': 'Alarm comment',
  'pages.notifications.rules.trigger.ALARM_ASSIGNMENT': 'Alarm assignment',
  'pages.notifications.rules.trigger.DEVICE_ACTIVITY': 'Device activity',
  'pages.notifications.rules.trigger.RULE_ENGINE_COMPONENT_LIFECYCLE_EVENT':
    'Rule engine component lifecycle event',
  'pages.notifications.rules.trigger.EDGE_CONNECTION': 'Edge connection',
  'pages.notifications.rules.trigger.EDGE_COMMUNICATION_FAILURE':
    'Edge communication failure',
  'pages.notifications.rules.trigger.NEW_PLATFORM_VERSION':
    'New platform version',
  'pages.notifications.rules.trigger.ENTITIES_LIMIT': 'Entities limit',
  'pages.notifications.rules.trigger.API_USAGE_LIMIT': 'API usage limit',
  'pages.notifications.rules.trigger.RATE_LIMITS': 'Rate limits',
  'pages.notifications.rules.trigger.TASK_PROCESSING_FAILURE':
    'Task processing failure',
  'pages.notifications.rules.trigger.RESOURCES_SHORTAGE': 'Resources shortage',

  // -------------------------------------------------------- trigger fields
  'pages.notifications.rules.triggerForm.filter': 'Filter',
  'pages.notifications.rules.triggerForm.alarmTypeList': 'Alarm type list',
  'pages.notifications.rules.triggerForm.anyType': 'Any type',
  'pages.notifications.rules.triggerForm.alarmSeverityList':
    'Alarm severity list',
  'pages.notifications.rules.triggerForm.anySeverity': 'Any severity',
  'pages.notifications.rules.triggerForm.alarmStatusList': 'Alarm status list',
  'pages.notifications.rules.triggerForm.anyStatus': 'Any status',
  'pages.notifications.rules.triggerForm.notifyOn': 'Notify on',
  'pages.notifications.rules.triggerForm.notifyOnRequired':
    'Notify on events is required',
  'pages.notifications.rules.triggerForm.clearRuleStatuses':
    'Stop the escalation when the alarm status becomes',
  'pages.notifications.rules.triggerForm.clearRuleHint':
    'Enabled when the escalation chain has more than one stage',
  'pages.notifications.rules.triggerForm.description': 'Description',
  'pages.notifications.rules.triggerForm.allEvents': 'All events',
  'pages.notifications.rules.triggerForm.searchEntities': 'Search entities',
  'pages.notifications.rules.triggerForm.devices': 'Devices',
  'pages.notifications.rules.triggerForm.deviceProfiles': 'Device profiles',
  'pages.notifications.rules.triggerForm.deviceListHint':
    'Notifications will be generated only for the devices on the list; empty means all devices',
  'pages.notifications.rules.triggerForm.deviceProfilesHint':
    'Notifications will be generated only for the profiles on the list; empty means all profiles',
  'pages.notifications.rules.triggerForm.entityTypes': 'Entity types',
  'pages.notifications.rules.triggerForm.entityTypesRequired':
    'Entity types is required',
  'pages.notifications.rules.triggerForm.status': 'Status',
  'pages.notifications.rules.triggerForm.created': 'Created',
  'pages.notifications.rules.triggerForm.updated': 'Updated',
  'pages.notifications.rules.triggerForm.deleted': 'Deleted',
  'pages.notifications.rules.triggerForm.onlyUserComments':
    'Notify only on user comments',
  'pages.notifications.rules.triggerForm.notifyOnCommentUpdate':
    'Notify on comment update',
  'pages.notifications.rules.triggerForm.ruleEngineFilter': 'Rule chain filter',
  'pages.notifications.rules.triggerForm.ruleChains': 'Rule chains',
  'pages.notifications.rules.triggerForm.ruleChainsHint':
    'Notifications will be generated only for the rule chains on the list; empty means all rule chains',
  'pages.notifications.rules.triggerForm.ruleChainEvents': 'Rule chain events',
  'pages.notifications.rules.triggerForm.onlyRuleChainLifecycleFailures':
    'Only rule chain lifecycle failures',
  'pages.notifications.rules.triggerForm.ruleNodeFilter': 'Rule node filter',
  'pages.notifications.rules.triggerForm.trackRuleNodeEvents':
    'Track rule node events',
  'pages.notifications.rules.triggerForm.ruleNodeEvents': 'Rule node events',
  'pages.notifications.rules.triggerForm.onlyRuleNodeLifecycleFailures':
    'Only rule node lifecycle failures',
  'pages.notifications.rules.triggerForm.edgeInstances': 'Edge instances',
  'pages.notifications.rules.triggerForm.edgeListHint':
    'Notifications will be generated only for the edge instances on the list; empty means all edges',
  'pages.notifications.rules.triggerForm.threshold': 'Threshold',
  'pages.notifications.rules.triggerForm.apiFeatures': 'API features',
  'pages.notifications.rules.triggerForm.apiFeaturesHint':
    'Empty means all API features are matched',
  'pages.notifications.rules.triggerForm.rateLimits': 'Rate limits',
  'pages.notifications.rules.triggerForm.rateLimitsHint':
    'Predefined limited APIs',
  'pages.notifications.rules.triggerForm.cpuThreshold': 'CPU threshold',
  'pages.notifications.rules.triggerForm.ramThreshold': 'RAM threshold',
  'pages.notifications.rules.triggerForm.storageThreshold': 'Storage threshold',
  'pages.notifications.rules.triggerForm.noConfig':
    'This trigger has no additional settings',

  // ------------------------------------------------------- value labels
  'pages.notifications.rules.severity.CRITICAL': 'Critical',
  'pages.notifications.rules.severity.MAJOR': 'Major',
  'pages.notifications.rules.severity.MINOR': 'Minor',
  'pages.notifications.rules.severity.WARNING': 'Warning',
  'pages.notifications.rules.severity.INDETERMINATE': 'Indeterminate',
  'pages.notifications.rules.status.ACTIVE': 'Active',
  'pages.notifications.rules.status.CLEARED': 'Cleared',
  'pages.notifications.rules.status.ACK': 'Acknowledged',
  'pages.notifications.rules.status.UNACK': 'Unacknowledged',
  'pages.notifications.rules.alarmAction.CREATED': 'Created',
  'pages.notifications.rules.alarmAction.SEVERITY_CHANGED': 'Severity changed',
  'pages.notifications.rules.alarmAction.ACKNOWLEDGED': 'Acknowledged',
  'pages.notifications.rules.alarmAction.CLEARED': 'Cleared',
  'pages.notifications.rules.assignmentAction.ASSIGNED': 'Assigned',
  'pages.notifications.rules.assignmentAction.UNASSIGNED': 'Unassigned',
  'pages.notifications.rules.deviceEvent.ACTIVE': 'Active',
  'pages.notifications.rules.deviceEvent.INACTIVE': 'Inactive',
  'pages.notifications.rules.lifecycleEvent.STARTED': 'Started',
  'pages.notifications.rules.lifecycleEvent.UPDATED': 'Updated',
  'pages.notifications.rules.lifecycleEvent.STOPPED': 'Stopped',
  'pages.notifications.rules.edgeEvent.CONNECTED': 'Connected',
  'pages.notifications.rules.edgeEvent.DISCONNECTED': 'Disconnected',
  'pages.notifications.rules.apiFeature.TRANSPORT': 'Transport',
  'pages.notifications.rules.apiFeature.DB': 'Database',
  'pages.notifications.rules.apiFeature.RE': 'Rule engine',
  'pages.notifications.rules.apiFeature.JS': 'JS scripts',
  'pages.notifications.rules.apiFeature.TBEL': 'TBEL scripts',
  'pages.notifications.rules.apiFeature.EMAIL': 'Email',
  'pages.notifications.rules.apiFeature.SMS': 'SMS',
  'pages.notifications.rules.apiFeature.ALARM': 'Alarms',
  'pages.notifications.rules.apiState.ENABLED': 'Enabled',
  'pages.notifications.rules.apiState.WARNING': 'Warning',
  'pages.notifications.rules.apiState.DISABLED': 'Disabled',
  'pages.notifications.rules.limitedApi.ENTITY_EXPORT': 'Entity export',
  'pages.notifications.rules.limitedApi.ENTITY_IMPORT': 'Entity import',
  'pages.notifications.rules.limitedApi.NOTIFICATION_REQUESTS':
    'Notification requests',
  'pages.notifications.rules.limitedApi.NOTIFICATION_REQUESTS_PER_RULE':
    'Notification requests per rule',
  'pages.notifications.rules.limitedApi.REST_REQUESTS_PER_TENANT':
    'REST requests per tenant',
  'pages.notifications.rules.limitedApi.REST_REQUESTS_PER_CUSTOMER':
    'REST requests per customer',
  'pages.notifications.rules.limitedApi.WS_UPDATES_PER_SESSION':
    'WS updates per session',
  'pages.notifications.rules.limitedApi.CASSANDRA_WRITE_QUERIES_CORE':
    'Cassandra write queries (core)',
  'pages.notifications.rules.limitedApi.CASSANDRA_READ_QUERIES_CORE':
    'Cassandra read queries (core)',
  'pages.notifications.rules.limitedApi.CASSANDRA_WRITE_QUERIES_RULE_ENGINE':
    'Cassandra write queries (rule engine)',
  'pages.notifications.rules.limitedApi.CASSANDRA_READ_QUERIES_RULE_ENGINE':
    'Cassandra read queries (rule engine)',
  'pages.notifications.rules.limitedApi.CASSANDRA_READ_QUERIES_MONOLITH':
    'Cassandra read queries (monolith)',
  'pages.notifications.rules.limitedApi.CASSANDRA_WRITE_QUERIES_MONOLITH':
    'Cassandra write queries (monolith)',
  'pages.notifications.rules.limitedApi.CASSANDRA_QUERIES': 'Cassandra queries',
  'pages.notifications.rules.limitedApi.EDGE_EVENTS': 'Edge events',
  'pages.notifications.rules.limitedApi.EDGE_EVENTS_PER_EDGE':
    'Edge events per edge',
  'pages.notifications.rules.limitedApi.EDGE_UPLINK_MESSAGES':
    'Edge uplink messages',
  'pages.notifications.rules.limitedApi.EDGE_UPLINK_MESSAGES_PER_EDGE':
    'Edge uplink messages per edge',
  'pages.notifications.rules.limitedApi.PASSWORD_RESET': 'Password reset',
  'pages.notifications.rules.limitedApi.TWO_FA_VERIFICATION_CODE_SEND':
    '2FA verification code send',
  'pages.notifications.rules.limitedApi.TWO_FA_VERIFICATION_CODE_CHECK':
    '2FA verification code check',
  'pages.notifications.rules.limitedApi.TRANSPORT_MESSAGES_PER_TENANT':
    'Transport messages per tenant',
  'pages.notifications.rules.limitedApi.TRANSPORT_MESSAGES_PER_DEVICE':
    'Transport messages per device',
  'pages.notifications.rules.limitedApi.TRANSPORT_MESSAGES_PER_GATEWAY':
    'Transport messages per gateway',
  'pages.notifications.rules.limitedApi.TRANSPORT_MESSAGES_PER_GATEWAY_DEVICE':
    'Transport messages per gateway device',
  'pages.notifications.rules.limitedApi.EMAILS': 'Emails',
  'pages.notifications.rules.limitedApi.WS_SUBSCRIPTIONS': 'WS subscriptions',
  'pages.notifications.rules.limitedApi.CALCULATED_FIELD_DEBUG_EVENTS':
    'Calculated field debug events',

  // ----------------------------------------------------- entity type names
  'pages.notifications.rules.entityType.TENANT': 'Tenant',
  'pages.notifications.rules.entityType.CUSTOMER': 'Customer',
  'pages.notifications.rules.entityType.USER': 'User',
  'pages.notifications.rules.entityType.DASHBOARD': 'Dashboard',
  'pages.notifications.rules.entityType.ASSET': 'Asset',
  'pages.notifications.rules.entityType.DEVICE': 'Device',
  'pages.notifications.rules.entityType.DEVICE_PROFILE': 'Device profile',
  'pages.notifications.rules.entityType.ASSET_PROFILE': 'Asset profile',
  'pages.notifications.rules.entityType.ALARM': 'Alarm',
  'pages.notifications.rules.entityType.RULE_CHAIN': 'Rule chain',
  'pages.notifications.rules.entityType.RULE_NODE': 'Rule node',
  'pages.notifications.rules.entityType.EDGE': 'Edge',
  'pages.notifications.rules.entityType.ENTITY_VIEW': 'Entity view',
  'pages.notifications.rules.entityType.WIDGETS_BUNDLE': 'Widgets bundle',
  'pages.notifications.rules.entityType.TB_RESOURCE': 'Resource',
  'pages.notifications.rules.entityType.OTA_PACKAGE': 'OTA package',
  'pages.notifications.rules.entityType.QUEUE_STATS': 'Queue stats',
  'pages.notifications.rules.entityType.NOTIFICATION_RULE': 'Notification rule',
  'pages.notifications.rules.entityType.NOTIFICATION_TARGET':
    'Notification target',
  'pages.notifications.rules.entityType.NOTIFICATION_TEMPLATE':
    'Notification template',
  'pages.notifications.rules.entityType.OAUTH2_CLIENT': 'OAuth 2 client',
  'pages.notifications.rules.entityType.DOMAIN': 'Domain',
  'pages.notifications.rules.entityType.MOBILE_APP': 'Mobile application',
  'pages.notifications.rules.entityType.MOBILE_APP_BUNDLE':
    'Mobile application bundle',
  'pages.notifications.rules.entityType.CALCULATED_FIELD': 'Calculated field',
  'pages.notifications.rules.entityType.AI_MODEL': 'AI model',
  'pages.notifications.rules.entityType.API_KEY': 'API key',
} as const;
