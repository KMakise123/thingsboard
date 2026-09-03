/**
 * en-US rule-node keys (`editor.ruleNode.*`, M8 wave-2 K). Mirrors the ui-ngx
 * `rule-node-config.*` English copy. Keep zh-CN/en-US key-for-key identical
 * (check-locale gate).
 */
export default {
  // node details drawer (wave-3 K2)
  'editor.ruleNode.tab.details': 'Details',
  'editor.ruleNode.tab.events': 'Events',
  'editor.ruleNode.tab.help': 'Help',
  'editor.ruleNode.details.name': 'Name',
  'editor.ruleNode.details.nameRequired': 'Name is required',
  'editor.ruleNode.details.description': 'Node description',
  'editor.ruleNode.details.queueName': 'Queue',
  'editor.ruleNode.details.singletonMode': 'Singleton mode',
  'editor.ruleNode.details.debugFailures': 'Debug failures',
  'editor.ruleNode.details.debugAll': 'Debug all messages',
  'editor.ruleNode.details.apply': 'Apply',
  'editor.ruleNode.help.docUrl': 'Open documentation',
  'editor.ruleNode.help.noDocs': 'This node has no documentation.',

  // ------------------------------------------------------------------
  // wave-3 K2 — ui-hints full-coverage field labels (ui-ngx
  // rule-node-config.* en_US parity; protocol-literal options stay in the
  // hints table untranslated)
  // ------------------------------------------------------------------

  // relation / entity action nodes
  'editor.ruleNode.field.customerNamePattern': 'Customer title',
  'editor.ruleNode.field.createCustomerIfNotExists':
    "Create new customer if it doesn't exist",
  'editor.ruleNode.field.direction': 'Direction',
  'editor.ruleNode.option.direction.from': 'From',
  'editor.ruleNode.option.direction.to': 'To',
  'editor.ruleNode.field.relationType': 'Relation type',
  'editor.ruleNode.field.entityNamePattern': 'Name pattern',
  'editor.ruleNode.field.createEntityIfNotExists':
    "Create new entity if it doesn't exist",
  'editor.ruleNode.field.removeCurrentRelations': 'Remove current relations',
  'editor.ruleNode.field.changeOriginatorToRelatedEntity':
    'Change originator to related entity',
  'editor.ruleNode.field.deleteForSingleEntity':
    'Delete for single entity only',
  'editor.ruleNode.field.persistAlarmRulesState': 'Persist alarm rules state',
  'editor.ruleNode.field.fetchAlarmRulesStateOnStart':
    'Fetch alarm rules state on start',
  'editor.ruleNode.field.event': 'Event',
  'editor.ruleNode.option.event.activity': 'Activity event',
  'editor.ruleNode.option.event.inactivity': 'Inactivity event',
  'editor.ruleNode.option.event.connect': 'Connect event',
  'editor.ruleNode.option.event.disconnect': 'Disconnect event',

  // gps geofencing
  'editor.ruleNode.field.latitudeKeyName': 'Latitude key name',
  'editor.ruleNode.field.longitudeKeyName': 'Longitude key name',
  'editor.ruleNode.field.perimeterType': 'Perimeter type',
  'editor.ruleNode.field.fetchPerimeterInfoFromMessageMetadata':
    'Fetch perimeter info from message metadata',
  'editor.ruleNode.field.perimeterKeyName': 'Perimeter key name',
  'editor.ruleNode.field.polygonsDefinition': 'Polygon definition',
  'editor.ruleNode.field.centerLatitude': 'Center latitude',
  'editor.ruleNode.field.centerLongitude': 'Center longitude',
  'editor.ruleNode.field.range': 'Range',
  'editor.ruleNode.field.rangeUnit': 'Range unit',
  'editor.ruleNode.option.perimeter.polygon': 'Polygon',
  'editor.ruleNode.option.perimeter.circle': 'Circle',
  'editor.ruleNode.option.rangeUnit.meter': 'Meter',
  'editor.ruleNode.option.rangeUnit.kilometer': 'Kilometer',
  'editor.ruleNode.option.rangeUnit.foot': 'Foot',
  'editor.ruleNode.option.rangeUnit.mile': 'Mile',
  'editor.ruleNode.option.rangeUnit.nauticalMile': 'Nautical mile',
  'editor.ruleNode.field.minInsideDuration': 'Minimal inside duration',
  'editor.ruleNode.field.minOutsideDuration': 'Minimal outside duration',
  'editor.ruleNode.field.minInsideDurationTimeUnit':
    'Minimal inside duration time unit',
  'editor.ruleNode.field.minOutsideDurationTimeUnit':
    'Minimal outside duration time unit',
  'editor.ruleNode.field.reportPresenceStatusOnEachMessage':
    'Report presence status on each message',

  // time units (shared)
  'editor.ruleNode.option.timeUnit.milliseconds': 'Milliseconds',
  'editor.ruleNode.option.timeUnit.seconds': 'Seconds',
  'editor.ruleNode.option.timeUnit.minutes': 'Minutes',
  'editor.ruleNode.option.timeUnit.hours': 'Hours',
  'editor.ruleNode.option.timeUnit.days': 'Days',

  // math function node
  'editor.ruleNode.field.operation': 'Operation',
  'editor.ruleNode.field.arguments': 'Arguments',
  'editor.ruleNode.field.customFunction': 'Custom function',
  'editor.ruleNode.field.result': 'Result',

  // message count / delay / deduplication
  'editor.ruleNode.field.telemetryPrefix': 'Telemetry prefix',
  'editor.ruleNode.field.interval': 'Interval',
  'editor.ruleNode.field.delayPeriodInSeconds': 'Period in seconds',
  'editor.ruleNode.field.maxPendingMsgs': 'Max pending messages',
  'editor.ruleNode.field.periodInSecondsPattern': 'Period pattern (seconds)',
  'editor.ruleNode.field.useMetadataPeriodInSecondsPatterns':
    'Use metadata period in seconds patterns',
  'editor.ruleNode.field.maxRetries': 'Max retries',
  'editor.ruleNode.field.strategy': 'Strategy',
  'editor.ruleNode.field.outMsgType': 'Output message type',

  // filter nodes
  'editor.ruleNode.field.alarmStatusList': 'Alarm statuses',
  'editor.ruleNode.field.messageNames': 'Message names',
  'editor.ruleNode.field.metadataNames': 'Metadata names',
  'editor.ruleNode.field.checkAllKeys':
    'Check that all specified fields are present',
  'editor.ruleNode.field.entityId': 'Entity id',
  'editor.ruleNode.field.entityType': 'Entity type',
  'editor.ruleNode.field.checkForSingleEntity':
    'Check relation to specific entity',
  'editor.ruleNode.field.messageTypes': 'Message types',
  'editor.ruleNode.field.originatorTypes': 'Originator types filter',

  // enrichment nodes
  'editor.ruleNode.field.inputValueKey': 'Input value key',
  'editor.ruleNode.field.outputValueKey': 'Output value key',
  'editor.ruleNode.field.useCache': 'Use cache',
  'editor.ruleNode.field.addPeriodBetweenMsgs': 'Add period between messages',
  'editor.ruleNode.field.periodValueKey': 'Period value key',
  'editor.ruleNode.field.round': 'Precision (decimal places)',
  'editor.ruleNode.field.tellFailureIfDeltaIsNegative':
    'Tell failure if delta is negative',
  'editor.ruleNode.field.excludeZeroDeltas':
    'Exclude zero deltas from outbound message',
  'editor.ruleNode.field.fetchTo': 'Fetch to',
  'editor.ruleNode.option.fetchTo.data': 'Message',
  'editor.ruleNode.option.fetchTo.metadata': 'Metadata',
  'editor.ruleNode.field.clientAttributeNames': 'Client attributes',
  'editor.ruleNode.field.sharedAttributeNames': 'Shared attributes',
  'editor.ruleNode.field.serverAttributeNames': 'Server attributes',
  'editor.ruleNode.field.latestTsKeyNames': 'Latest telemetry key names',
  'editor.ruleNode.field.tellFailureIfAbsent': 'Tell Failure',
  'editor.ruleNode.field.getLatestValueWithTs':
    'Fetch timestamp for the latest telemetry values',
  'editor.ruleNode.field.dataToFetch': 'Data to fetch',
  'editor.ruleNode.option.dataToFetch.attributes': 'Attributes',
  'editor.ruleNode.option.dataToFetch.latestTelemetry': 'Latest telemetry',
  'editor.ruleNode.option.dataToFetch.fields': 'Fields',
  'editor.ruleNode.field.dataMapping': 'Data mapping',
  'editor.ruleNode.field.ignoreNullStrings': 'Ignore null strings',
  'editor.ruleNode.field.sendAttributesDeletedNotification':
    'Send attributes deleted notification',
  'editor.ruleNode.field.detailsList': 'Entity details fields to fetch',
  'editor.ruleNode.field.deviceRelationsQuery': 'Device relations query',
  'editor.ruleNode.field.relationsQuery': 'Relations query',
  'editor.ruleNode.field.fetchLastLevelOnly': 'Fetch last level only',
  'editor.ruleNode.field.maxLevel': 'Max level',
  'editor.ruleNode.field.startInterval': 'Interval start',
  'editor.ruleNode.field.endInterval': 'Interval end',
  'editor.ruleNode.field.startIntervalPattern': 'Start interval pattern',
  'editor.ruleNode.field.endIntervalPattern': 'End interval pattern',
  'editor.ruleNode.field.useMetadataIntervalPatterns':
    'Use metadata interval patterns',
  'editor.ruleNode.field.startIntervalTimeUnit': 'Start interval time unit',
  'editor.ruleNode.field.endIntervalTimeUnit': 'End interval time unit',
  'editor.ruleNode.field.fetchMode': 'Fetch mode',
  'editor.ruleNode.option.fetchMode.first': 'First',
  'editor.ruleNode.option.fetchMode.last': 'Last',
  'editor.ruleNode.option.fetchMode.all': 'All',
  'editor.ruleNode.field.orderBy': 'Order by',
  'editor.ruleNode.option.orderBy.asc': 'Ascending',
  'editor.ruleNode.option.orderBy.desc': 'Descending',
  'editor.ruleNode.field.aggregation': 'Data aggregation function',
  'editor.ruleNode.option.aggregation.none': 'None',
  'editor.ruleNode.option.aggregation.min': 'Minimum',
  'editor.ruleNode.option.aggregation.max': 'Maximum',
  'editor.ruleNode.option.aggregation.avg': 'Average',
  'editor.ruleNode.option.aggregation.sum': 'Sum',
  'editor.ruleNode.option.aggregation.count': 'Count',
  'editor.ruleNode.field.limit': 'Limit',

  // external nodes — shared labels
  'editor.ruleNode.field.host': 'Host',
  'editor.ruleNode.field.port': 'Port',
  'editor.ruleNode.field.username': 'Username',
  'editor.ruleNode.field.password': 'Password',
  'editor.ruleNode.field.topicPattern': 'Topic pattern',
  'editor.ruleNode.field.keyPattern': 'Key pattern',
  'editor.ruleNode.field.region': 'Region',
  'editor.ruleNode.field.proxyHost': 'Proxy host',
  'editor.ruleNode.field.proxyPort': 'Proxy port',
  'editor.ruleNode.field.proxyUser': 'Proxy user',
  'editor.ruleNode.field.proxyPassword': 'Proxy password',
  'editor.ruleNode.field.enableProxy': 'Enable proxy',
  'editor.ruleNode.field.parseToPlainText': 'Parse to plain text',
  'editor.ruleNode.field.credentials': 'Credentials',
  'editor.ruleNode.field.protocolVersion': 'Protocol version',
  'editor.ruleNode.field.connectTimeoutSec': 'Connection timeout (seconds)',
  'editor.ruleNode.field.clientId': 'Client ID',
  'editor.ruleNode.field.appendClientIdSuffix':
    'Add Service ID as suffix to Client ID',
  'editor.ruleNode.field.retainedMessage': 'Retained',
  'editor.ruleNode.field.cleanSession': 'Clean session',
  'editor.ruleNode.field.ssl': 'Enable SSL',
  'editor.ruleNode.field.accessKeyId': 'Access key ID',
  'editor.ruleNode.field.secretAccessKey': 'Secret access key',

  // ai node
  'editor.ruleNode.field.aiModelId': 'AI model',
  'editor.ruleNode.field.systemPrompt': 'System prompt',
  'editor.ruleNode.field.userPrompt': 'User prompt',
  'editor.ruleNode.field.responseFormat': 'Response format',
  'editor.ruleNode.field.responseFormatType': 'Response format type',
  'editor.ruleNode.option.responseFormat.json': 'JSON',
  'editor.ruleNode.option.responseFormat.text': 'Text',
  'editor.ruleNode.option.responseFormat.jsonSchema': 'JSON Schema',
  'editor.ruleNode.field.timeoutSeconds': 'Timeout (seconds)',
  'editor.ruleNode.field.forceAck': 'Force ack',

  // aws lambda / sns / sqs
  'editor.ruleNode.field.accessKey': 'Access key',
  'editor.ruleNode.field.secretKey': 'Secret key',
  'editor.ruleNode.field.functionName': 'Function name',
  'editor.ruleNode.field.qualifier': 'Qualifier',
  'editor.ruleNode.field.connectionTimeout': 'Connection timeout',
  'editor.ruleNode.field.requestTimeout': 'Request timeout',
  'editor.ruleNode.field.tellFailureIfFuncThrowsExc':
    'Tell failure if function throws exception',
  'editor.ruleNode.field.topicArnPattern': 'Topic ARN pattern',
  'editor.ruleNode.field.queueType': 'Queue type',
  'editor.ruleNode.option.queueType.standard': 'Standard',
  'editor.ruleNode.option.queueType.fifo': 'FIFO',
  'editor.ruleNode.field.queueUrlPattern': 'Queue URL pattern',
  'editor.ruleNode.field.delaySeconds': 'Delay (seconds)',

  // kafka
  'editor.ruleNode.field.bootstrapServers': 'Bootstrap servers',
  'editor.ruleNode.field.retries': 'Automatically retry times if fails',
  'editor.ruleNode.field.batchSize': 'Batch size',
  'editor.ruleNode.field.linger': 'Linger (ms)',
  'editor.ruleNode.field.bufferMemory': 'Buffer memory',
  'editor.ruleNode.field.acks': 'Number of acknowledgments',
  'editor.ruleNode.field.addMetadataKeyValuesAsKafkaHeaders':
    'Add Message metadata key-value pairs to Kafka record headers',
  'editor.ruleNode.field.kafkaHeadersCharset': 'Charset encoding',
  'editor.ruleNode.field.otherProperties': 'Other properties',

  // rabbitmq
  'editor.ruleNode.field.exchangeNamePattern': 'Exchange name pattern',
  'editor.ruleNode.field.routingKeyPattern': 'Routing key pattern',
  'editor.ruleNode.field.messageProperties': 'Message properties',
  'editor.ruleNode.field.virtualHost': 'Virtual host',
  'editor.ruleNode.field.automaticRecoveryEnabled': 'Automatic recovery',
  'editor.ruleNode.field.handshakeTimeout': 'Handshake timeout',

  // rest api call
  'editor.ruleNode.field.restEndpointUrlPattern': 'Endpoint URL pattern',
  'editor.ruleNode.field.requestMethod': 'Request method',
  'editor.ruleNode.field.headers': 'Headers',
  'editor.ruleNode.field.queryParams': 'Query parameters',
  'editor.ruleNode.field.readTimeoutMs': 'Read timeout (ms)',
  'editor.ruleNode.field.maxParallelRequestsCount':
    'Max number of parallel requests',
  'editor.ruleNode.field.useSystemProxyProperties':
    'Use system proxy properties',
  'editor.ruleNode.field.ignoreRequestBody': 'Without request body',
  'editor.ruleNode.field.requestBodyTemplate': 'Request body template',
  'editor.ruleNode.field.maxInMemoryBufferSizeInKb':
    'Max in-memory buffer size (KB)',

  // send email
  'editor.ruleNode.field.useSystemSmtpSettings': 'Use system SMTP settings',
  'editor.ruleNode.field.smtpHost': 'SMTP host',
  'editor.ruleNode.field.smtpPort': 'SMTP port',
  'editor.ruleNode.field.smtpProtocol': 'Protocol',
  'editor.ruleNode.field.smtpTimeout': 'Timeout (ms)',
  'editor.ruleNode.field.enableTls': 'Enable TLS',
  'editor.ruleNode.field.tlsVersion': 'TLS version',

  // send sms / slack / notification
  'editor.ruleNode.field.numbersToTemplate': 'Phone Numbers To Template',
  'editor.ruleNode.field.smsMessageTemplate': 'SMS message Template',
  'editor.ruleNode.field.useSystemSmsSettings':
    'Use system SMS provider settings',
  'editor.ruleNode.field.smsProviderConfiguration':
    'SMS provider configuration',
  'editor.ruleNode.field.botToken': 'Bot token',
  'editor.ruleNode.field.useSystemSettings': 'Use system settings',
  'editor.ruleNode.field.messageTemplate': 'Message template',
  'editor.ruleNode.field.conversationType': 'Conversation type',
  'editor.ruleNode.field.conversation': 'Conversation',
  'editor.ruleNode.option.slack.publicChannel': 'Public channel',
  'editor.ruleNode.option.slack.privateChannel': 'Private channel',
  'editor.ruleNode.option.slack.direct': 'Direct message',
  'editor.ruleNode.field.targets': 'Recipients',
  'editor.ruleNode.field.templateId': 'Template',

  // gcp pubsub / cassandra
  'editor.ruleNode.field.projectId': 'Project id',
  'editor.ruleNode.field.topicName': 'Topic name',
  'editor.ruleNode.field.serviceAccountKey': 'Service account key',
  'editor.ruleNode.field.serviceAccountKeyFileName':
    'Service account key file name',
  'editor.ruleNode.field.tableName': 'Table name',
  'editor.ruleNode.field.fieldsMapping': 'Fields mapping',

  // rpc reply/request
  'editor.ruleNode.field.serviceIdMetaDataAttribute': 'Service Id',
  'editor.ruleNode.field.sessionIdMetaDataAttribute': 'Session Id',
  'editor.ruleNode.field.requestIdMetaDataAttribute': 'Request Id',
  'editor.ruleNode.field.timeoutInSeconds': 'Timeout in seconds',

  // to email
  'editor.ruleNode.field.fromTemplate': 'From',
  'editor.ruleNode.field.toTemplate': 'To',
  'editor.ruleNode.field.ccTemplate': 'Cc',
  'editor.ruleNode.field.bccTemplate': 'Bcc',
  'editor.ruleNode.field.subjectTemplate': 'Subject',
  'editor.ruleNode.field.bodyTemplate': 'Body',
  'editor.ruleNode.field.isHtmlTemplate': 'HTML template',
  'editor.ruleNode.field.mailBodyType': 'Mail body type',
  'editor.ruleNode.option.mailBody.plain': 'Plain text',
  'editor.ruleNode.option.mailBody.html': 'HTML',
  'editor.ruleNode.option.mailBody.dynamic': 'Dynamic',

  // change originator
  'editor.ruleNode.field.originatorSource': 'Originator source',
  'editor.ruleNode.option.originatorSource.customer': 'Customer',
  'editor.ruleNode.option.originatorSource.tenant': 'Tenant',
  'editor.ruleNode.option.originatorSource.related': 'Related entity',
  'editor.ruleNode.option.originatorSource.alarmOriginator': 'Alarm originator',
  'editor.ruleNode.option.originatorSource.entity':
    'Entity matched by name pattern',

  // json path / flow input
  'editor.ruleNode.field.jsonPath': 'JSON path expression',
  'editor.ruleNode.field.ruleChainId': 'Rule chain',
  'editor.ruleNode.field.forwardMsgToDefaultRuleChain':
    'Forward messages to default rule chain',

  // script family — per-node test button labels (ui-ngx test-*-function)
  'editor.ruleNode.test.filter': 'Test filter function',
  'editor.ruleNode.test.switch': 'Test switch function',
  'editor.ruleNode.test.transform': 'Test transformer function',
  'editor.ruleNode.test.log': 'Test to string function',
  'editor.ruleNode.test.generate': 'Test generator function',
  'editor.ruleNode.test.details': 'Test details function',
  'editor.ruleNode.test.modalTitle': 'Test script',

  // generator simple fields
  'editor.ruleNode.field.msgCount': 'Message count limit (0 - unlimited)',
  'editor.ruleNode.field.periodInSeconds': 'Generation frequency (seconds)',
  'editor.ruleNode.field.originatorType': 'Originator type',
  'editor.ruleNode.field.originatorId': 'Originator id',

  // save time series / save attributes simple fields
  'editor.ruleNode.field.defaultTTL': 'Default TTL',
  'editor.ruleNode.field.useServerTs': 'Use server timestamp',
  'editor.ruleNode.field.scope': 'Attributes scope',
  'editor.ruleNode.field.notifyDevice': 'Notify device',
  'editor.ruleNode.field.sendAttributesUpdatedNotification':
    'Send attributes updated notification',
  'editor.ruleNode.field.updateAttributesOnlyOnValueChange':
    'Update attributes only on value change',
  'editor.ruleNode.field.alarmType': 'Alarm type',

  // key operations
  'editor.ruleNode.keyOps.source': 'Source',
  'editor.ruleNode.keyOps.keys': 'Keys',
  'editor.ruleNode.keyOps.keysPlaceholder': 'Add key',
  'editor.ruleNode.option.msgSource.data': 'Data',
  'editor.ruleNode.option.msgSource.metadata': 'Metadata',

  // rename keys mapping
  'editor.ruleNode.rename.mapping': 'Keys mapping',
  'editor.ruleNode.rename.currentKey': 'Current key name',
  'editor.ruleNode.rename.newKey': 'New key name',
  'editor.ruleNode.rename.add': 'Add mapping',

  // processing settings (save time series / save attributes)
  'editor.ruleNode.processing.title': 'Processing settings',
  'editor.ruleNode.processing.mode.basic': 'Basic',
  'editor.ruleNode.processing.mode.advanced': 'Advanced',
  'editor.ruleNode.processing.strategy': 'Strategy',
  'editor.ruleNode.processing.deduplicationInterval':
    'Deduplication interval (seconds)',
  'editor.ruleNode.processing.advanced': 'Advanced strategies',
  'editor.ruleNode.processing.advanced.timeseries': 'Timeseries',
  'editor.ruleNode.processing.advanced.attributes': 'Attributes',
  'editor.ruleNode.processing.advanced.latest': 'Latest values',
  'editor.ruleNode.processing.advanced.webSockets': 'WebSockets',
  'editor.ruleNode.processing.advanced.calculatedFields': 'Calculated fields',
  'editor.ruleNode.option.processing.onEveryMessage': 'On every message',
  'editor.ruleNode.option.processing.deduplicate': 'Deduplicate',
  'editor.ruleNode.option.processing.webSocketsOnly': 'WebSockets only',
  'editor.ruleNode.option.strategy.onEveryMessage': 'On every message',
  'editor.ruleNode.option.strategy.deduplicate': 'Deduplicate',
  'editor.ruleNode.option.strategy.skip': 'Skip',

  // create alarm family
  'editor.ruleNode.createAlarm.severity': 'Alarm severity',
  'editor.ruleNode.createAlarm.dynamicSeverity': 'Use alarm severity pattern',
  'editor.ruleNode.createAlarm.propagate':
    'Propagate alarm to related entities',
  'editor.ruleNode.createAlarm.propagateToOwner':
    'Propagate alarm to entity owner (customer or tenant)',
  'editor.ruleNode.createAlarm.propagateToTenant': 'Propagate alarm to tenant',
  'editor.ruleNode.createAlarm.relationTypes': 'Relation types to propagate',
  'editor.ruleNode.createAlarm.useMessageAlarmData': 'Use message alarm data',
  'editor.ruleNode.createAlarm.overwriteAlarmDetails':
    'Overwrite alarm details',
  'editor.ruleNode.option.severity.critical': 'Critical',
  'editor.ruleNode.option.severity.major': 'Major',
  'editor.ruleNode.option.severity.minor': 'Minor',
  'editor.ruleNode.option.severity.warning': 'Warning',
  'editor.ruleNode.option.severity.indeterminate': 'Indeterminate',

  // shared enum options
  'editor.ruleNode.option.scope.server': 'Server attributes',
  'editor.ruleNode.option.scope.shared': 'Shared attributes',
  'editor.ruleNode.option.scope.client': 'Client attributes',
  'editor.ruleNode.option.entityType.device': 'Device',
  'editor.ruleNode.option.entityType.asset': 'Asset',
  'editor.ruleNode.option.entityType.entityView': 'Entity view',
  'editor.ruleNode.option.entityType.customer': 'Customer',
  'editor.ruleNode.option.entityType.user': 'User',
  'editor.ruleNode.option.entityType.dashboard': 'Dashboard',
  'editor.ruleNode.option.entityType.tenant': 'Current tenant',
  'editor.ruleNode.option.entityType.ruleNode': 'Current rule node',
};
