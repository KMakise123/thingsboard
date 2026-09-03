/**
 * ui-hints — rule-node UI metadata static map (M8 brief §2; wave-2 K seeded
 * the P0 start-up set, wave-3 K2 extends it to FULL 76-CORE-node coverage).
 *
 * Keying: the source table is keyed by clazz; each slice is keyed by the
 * field's dotted path FROM THE CONFIGURATION ROOT — together they realize
 * the "clazz + 字段路径" addressing of the brief. `getFormProperties` also
 * accepts `clazz`-prefixed keys directly, so this table (or a slice of it)
 * can be passed in either shape.
 *
 * Locale contract: labels and enumOptions labels are i18n keys under
 * `editor.ruleNode.*`; NodeConfigForm localizes them through
 * {@link localizeUiHintLabels} at render time (M7 renders UiHint labels as
 * data, so the static table itself stays locale-free). Non-`editor.`
 * labels pass through verbatim — used for protocol-literal options
 * (HTTP methods, TLS versions, charsets, acks, MQTT versions, math function
 * names) that ui-ngx also renders untranslated.
 *
 * Coverage bookkeeping (76 CORE clazzes):
 *  - 56 nodes carry field hints;
 *  - 12 EmptyNodeConfiguration nodes carry ONLY the shared `version` hint:
 *    their defaultConfiguration is `{version: 0}` and generator inference
 *    would render an editable number control, while ui-ngx shows an EMPTY
 *    form. M7 UiHint has no hide semantics (`visible` exists on FormProperty
 *    but is not hint-addressable), so the field is forced into JSON source
 *    mode — the closest existing-behavior alignment (wave-3 R observation);
 *  - 8 family-only nodes (log / filter / switch / transform scripts, key
 *    ops, clear alarm) render exclusively through the P0 registry — no
 *    hints.
 *
 * 宁缺勿错 remains the per-field rule: hints only assert facts verified
 * against the backend config classes (rule-engine-components, read 2026-09)
 * and the ui-ngx `*-config.component.html` control shapes; unmapped fields
 * keep generator inference + the JSON source fallback. Array fields never
 * get enumOptions (the M7 channel renders arrays as tag lists — a select
 * over an array value would blank stored data).
 */
import type { FormSelectItem } from '@/components/form-property/types';
import type { UiHints } from '@/components/form-property/ui-hints';

// ---------------------------------------------------------------------------
// shared option groups (values = wire enum names, labels = i18n keys or
// protocol literals)
// ---------------------------------------------------------------------------

const DIRECTION: FormSelectItem[] = [
  { value: 'FROM', label: 'editor.ruleNode.option.direction.from' },
  { value: 'TO', label: 'editor.ruleNode.option.direction.to' },
];
const ORIGINATOR_SOURCES: FormSelectItem[] = [
  {
    value: 'CUSTOMER',
    label: 'editor.ruleNode.option.originatorSource.customer',
  },
  { value: 'TENANT', label: 'editor.ruleNode.option.originatorSource.tenant' },
  {
    value: 'RELATED',
    label: 'editor.ruleNode.option.originatorSource.related',
  },
  {
    value: 'ALARM_ORIGINATOR',
    label: 'editor.ruleNode.option.originatorSource.alarmOriginator',
  },
  { value: 'ENTITY', label: 'editor.ruleNode.option.originatorSource.entity' },
];
const PERIMETER_TYPES: FormSelectItem[] = [
  { value: 'POLYGON', label: 'editor.ruleNode.option.perimeter.polygon' },
  { value: 'CIRCLE', label: 'editor.ruleNode.option.perimeter.circle' },
];
const RANGE_UNITS: FormSelectItem[] = [
  { value: 'METER', label: 'editor.ruleNode.option.rangeUnit.meter' },
  { value: 'KILOMETER', label: 'editor.ruleNode.option.rangeUnit.kilometer' },
  { value: 'FOOT', label: 'editor.ruleNode.option.rangeUnit.foot' },
  { value: 'MILE', label: 'editor.ruleNode.option.rangeUnit.mile' },
  {
    value: 'NAUTICAL_MILE',
    label: 'editor.ruleNode.option.rangeUnit.nauticalMile',
  },
];
const TIME_UNITS: FormSelectItem[] = [
  {
    value: 'MILLISECONDS',
    label: 'editor.ruleNode.option.timeUnit.milliseconds',
  },
  { value: 'SECONDS', label: 'editor.ruleNode.option.timeUnit.seconds' },
  { value: 'MINUTES', label: 'editor.ruleNode.option.timeUnit.minutes' },
  { value: 'HOURS', label: 'editor.ruleNode.option.timeUnit.hours' },
  { value: 'DAYS', label: 'editor.ruleNode.option.timeUnit.days' },
];
const FETCH_MODES: FormSelectItem[] = [
  { value: 'FIRST', label: 'editor.ruleNode.option.fetchMode.first' },
  { value: 'LAST', label: 'editor.ruleNode.option.fetchMode.last' },
  { value: 'ALL', label: 'editor.ruleNode.option.fetchMode.all' },
];
const DATA_TO_FETCH: FormSelectItem[] = [
  {
    value: 'ATTRIBUTES',
    label: 'editor.ruleNode.option.dataToFetch.attributes',
  },
  {
    value: 'LATEST_TELEMETRY',
    label: 'editor.ruleNode.option.dataToFetch.latestTelemetry',
  },
  { value: 'FIELDS', label: 'editor.ruleNode.option.dataToFetch.fields' },
];
const FETCH_TO: FormSelectItem[] = [
  { value: 'DATA', label: 'editor.ruleNode.option.fetchTo.data' },
  { value: 'METADATA', label: 'editor.ruleNode.option.fetchTo.metadata' },
];
const ORDER_BY: FormSelectItem[] = [
  { value: 'ASC', label: 'editor.ruleNode.option.orderBy.asc' },
  { value: 'DESC', label: 'editor.ruleNode.option.orderBy.desc' },
];
const AGGREGATIONS: FormSelectItem[] = [
  { value: 'NONE', label: 'editor.ruleNode.option.aggregation.none' },
  { value: 'MIN', label: 'editor.ruleNode.option.aggregation.min' },
  { value: 'MAX', label: 'editor.ruleNode.option.aggregation.max' },
  { value: 'AVG', label: 'editor.ruleNode.option.aggregation.avg' },
  { value: 'SUM', label: 'editor.ruleNode.option.aggregation.sum' },
  { value: 'COUNT', label: 'editor.ruleNode.option.aggregation.count' },
];
const MQTT_VERSIONS: FormSelectItem[] = [
  { value: 'MQTT_3_1', label: 'MQTT 3.1' },
  { value: 'MQTT_3_1_1', label: 'MQTT 3.1.1' },
  { value: 'MQTT_5', label: 'MQTT 5.0' },
];
const REQUEST_METHODS: FormSelectItem[] = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
].map((method) => ({ value: method, label: method }));
const SMTP_PROTOCOLS: FormSelectItem[] = ['smtp', 'smtps'].map((p) => ({
  value: p,
  label: p,
}));
const TLS_VERSIONS: FormSelectItem[] = [
  'TLSv1',
  'TLSv1.1',
  'TLSv1.2',
  'TLSv1.3',
].map((v) => ({ value: v, label: v }));
const CHARSETS: FormSelectItem[] = [
  'US-ASCII',
  'ISO-8859-1',
  'UTF-8',
  'UTF-16BE',
  'UTF-16LE',
  'UTF-16',
].map((c) => ({ value: c, label: c }));
const KAFKA_ACKS: FormSelectItem[] = ['all', '-1', '0', '1'].map((a) => ({
  value: a,
  label: a,
}));
const SLACK_CONVERSATION_TYPES: FormSelectItem[] = [
  {
    value: 'PUBLIC_CHANNEL',
    label: 'editor.ruleNode.option.slack.publicChannel',
  },
  {
    value: 'PRIVATE_CHANNEL',
    label: 'editor.ruleNode.option.slack.privateChannel',
  },
  { value: 'DIRECT', label: 'editor.ruleNode.option.slack.direct' },
];
const RESPONSE_FORMAT_TYPES: FormSelectItem[] = [
  { value: 'JSON', label: 'editor.ruleNode.option.responseFormat.json' },
  { value: 'TEXT', label: 'editor.ruleNode.option.responseFormat.text' },
  {
    value: 'JSON_SCHEMA',
    label: 'editor.ruleNode.option.responseFormat.jsonSchema',
  },
];
const DEVICE_STATE_EVENTS: FormSelectItem[] = [
  { value: 'ACTIVITY_EVENT', label: 'editor.ruleNode.option.event.activity' },
  {
    value: 'INACTIVITY_EVENT',
    label: 'editor.ruleNode.option.event.inactivity',
  },
  { value: 'CONNECT_EVENT', label: 'editor.ruleNode.option.event.connect' },
  {
    value: 'DISCONNECT_EVENT',
    label: 'editor.ruleNode.option.event.disconnect',
  },
];
const MAIL_BODY_TYPES: FormSelectItem[] = [
  { value: 'false', label: 'editor.ruleNode.option.mailBody.plain' },
  { value: 'true', label: 'editor.ruleNode.option.mailBody.html' },
  { value: 'dynamic', label: 'editor.ruleNode.option.mailBody.dynamic' },
];
// ui-ngx renders math function names untranslated (MathFunctionMap names).
const MATH_FUNCTIONS: FormSelectItem[] = [
  'CUSTOM',
  'ADD',
  'SUB',
  'MULT',
  'DIV',
  'SIN',
  'SINH',
  'COS',
  'COSH',
  'TAN',
  'TANH',
  'ACOS',
  'ASIN',
  'ATAN',
  'ATAN2',
  'EXP',
  'EXPM1',
  'SQRT',
  'CBRT',
  'GET_EXP',
  'HYPOT',
  'LOG',
  'LOG10',
  'LOG1P',
  'CEIL',
  'FLOOR',
  'FLOOR_DIV',
  'FLOOR_MOD',
  'ABS',
  'MIN',
  'MAX',
  'POW',
  'SIGNUM',
  'RAD',
  'DEG',
].map((fn) => ({ value: fn, label: fn }));

// ---------------------------------------------------------------------------
// per-clazz field facts (backend config classes × ui-ngx control shapes)
// ---------------------------------------------------------------------------

/**
 * The EmptyNodeConfiguration value tree is `{version: 0}` — a wire placeholder,
 * not a user field. JSON source mode keeps it out of the way (see module doc).
 */
const EMPTY_VERSION: UiHints = { version: { jsonSource: true } };

/**
 * Nested RelationsQuery shape (change originator / related-attribute nodes):
 * scalar enum + numbers reachable by dotted path; the `filters` array items
 * stay on the per-item JSON fallback (array item paths are dynamic).
 */
const RELATIONS_QUERY: UiHints = {
  relationsQuery: { label: 'editor.ruleNode.field.relationsQuery' },
  'relationsQuery.fetchLastLevelOnly': {
    label: 'editor.ruleNode.field.fetchLastLevelOnly',
  },
  'relationsQuery.direction': {
    label: 'editor.ruleNode.field.direction',
    enumOptions: DIRECTION,
  },
  'relationsQuery.maxLevel': {
    label: 'editor.ruleNode.field.maxLevel',
    widget: 'number',
  },
};

const HINT_SOURCE: Record<string, UiHints> = {
  // ------------------------------------------- wave-2 P0 start-up set
  // script family — simple fields only (the script triple is the family's)
  'org.thingsboard.rule.engine.debug.TbMsgGeneratorNode': {
    msgCount: { label: 'editor.ruleNode.field.msgCount' },
    periodInSeconds: { label: 'editor.ruleNode.field.periodInSeconds' },
    originatorType: {
      label: 'editor.ruleNode.field.originatorType',
      enumOptions: [
        { value: 'DEVICE', label: 'editor.ruleNode.option.entityType.device' },
        { value: 'ASSET', label: 'editor.ruleNode.option.entityType.asset' },
        {
          value: 'ENTITY_VIEW',
          label: 'editor.ruleNode.option.entityType.entityView',
        },
        {
          value: 'CUSTOMER',
          label: 'editor.ruleNode.option.entityType.customer',
        },
        { value: 'USER', label: 'editor.ruleNode.option.entityType.user' },
        {
          value: 'DASHBOARD',
          label: 'editor.ruleNode.option.entityType.dashboard',
        },
        { value: 'TENANT', label: 'editor.ruleNode.option.entityType.tenant' },
        {
          value: 'RULE_NODE',
          label: 'editor.ruleNode.option.entityType.ruleNode',
        },
      ],
    },
    originatorId: { label: 'editor.ruleNode.field.originatorId' },
  },

  // save time series — processingSettings is the family's; these stay simple
  'org.thingsboard.rule.engine.telemetry.TbMsgTimeseriesNode': {
    defaultTTL: { label: 'editor.ruleNode.field.defaultTTL' },
    useServerTs: { label: 'editor.ruleNode.field.useServerTs' },
  },

  // save attributes — scope/toggles stay simple, processingSettings is family
  'org.thingsboard.rule.engine.telemetry.TbMsgAttributesNode': {
    scope: {
      label: 'editor.ruleNode.field.scope',
      enumOptions: [
        { value: 'SERVER_SCOPE', label: 'editor.ruleNode.option.scope.server' },
        { value: 'SHARED_SCOPE', label: 'editor.ruleNode.option.scope.shared' },
        { value: 'CLIENT_SCOPE', label: 'editor.ruleNode.option.scope.client' },
      ],
    },
    notifyDevice: { label: 'editor.ruleNode.field.notifyDevice' },
    sendAttributesUpdatedNotification: {
      label: 'editor.ruleNode.field.sendAttributesUpdatedNotification',
    },
    updateAttributesOnlyOnValueChange: {
      label: 'editor.ruleNode.field.updateAttributesOnlyOnValueChange',
    },
  },

  // delete attributes — scope limited to server/shared (client attrs are
  // server-managed; ui-ngx AttributeScopeResult), keys is a tag list
  'org.thingsboard.rule.engine.telemetry.TbMsgDeleteAttributesNode': {
    scope: {
      label: 'editor.ruleNode.field.scope',
      enumOptions: [
        { value: 'SERVER_SCOPE', label: 'editor.ruleNode.option.scope.server' },
        { value: 'SHARED_SCOPE', label: 'editor.ruleNode.option.scope.shared' },
      ],
    },
    keys: { label: 'editor.ruleNode.keyOps.keys' },
    sendAttributesDeletedNotification: {
      label: 'editor.ruleNode.field.sendAttributesDeletedNotification',
    },
    notifyDevice: { label: 'editor.ruleNode.field.notifyDevice' },
  },

  // create alarm — everything except alarmType is the family's
  'org.thingsboard.rule.engine.action.TbCreateAlarmNode': {
    alarmType: { label: 'editor.ruleNode.field.alarmType' },
  },

  // ---------------------------------------------------------------- ACTION
  'org.thingsboard.rule.engine.action.TbAssignToCustomerNode': {
    customerNamePattern: { label: 'editor.ruleNode.field.customerNamePattern' },
    createCustomerIfNotExists: {
      label: 'editor.ruleNode.field.createCustomerIfNotExists',
    },
  },

  'org.thingsboard.rule.engine.action.TbCreateRelationNode': {
    direction: {
      label: 'editor.ruleNode.field.direction',
      enumOptions: DIRECTION,
    },
    relationType: { label: 'editor.ruleNode.field.relationType' },
    entityNamePattern: { label: 'editor.ruleNode.field.entityNamePattern' },
    createEntityIfNotExists: {
      label: 'editor.ruleNode.field.createEntityIfNotExists',
    },
    removeCurrentRelations: {
      label: 'editor.ruleNode.field.removeCurrentRelations',
    },
    changeOriginatorToRelatedEntity: {
      label: 'editor.ruleNode.field.changeOriginatorToRelatedEntity',
    },
  },

  'org.thingsboard.rule.engine.action.TbDeleteRelationNode': {
    deleteForSingleEntity: {
      label: 'editor.ruleNode.field.deleteForSingleEntity',
    },
    direction: {
      label: 'editor.ruleNode.field.direction',
      enumOptions: DIRECTION,
    },
    relationType: { label: 'editor.ruleNode.field.relationType' },
    entityNamePattern: { label: 'editor.ruleNode.field.entityNamePattern' },
  },

  'org.thingsboard.rule.engine.profile.TbDeviceProfileNode': {
    persistAlarmRulesState: {
      label: 'editor.ruleNode.field.persistAlarmRulesState',
    },
    fetchAlarmRulesStateOnStart: {
      label: 'editor.ruleNode.field.fetchAlarmRulesStateOnStart',
    },
  },

  'org.thingsboard.rule.engine.action.TbDeviceStateNode': {
    event: {
      label: 'editor.ruleNode.field.event',
      enumOptions: DEVICE_STATE_EVENTS,
    },
  },

  'org.thingsboard.rule.engine.geo.TbGpsGeofencingActionNode': {
    latitudeKeyName: { label: 'editor.ruleNode.field.latitudeKeyName' },
    longitudeKeyName: { label: 'editor.ruleNode.field.longitudeKeyName' },
    perimeterType: {
      label: 'editor.ruleNode.field.perimeterType',
      enumOptions: PERIMETER_TYPES,
    },
    fetchPerimeterInfoFromMessageMetadata: {
      label: 'editor.ruleNode.field.fetchPerimeterInfoFromMessageMetadata',
    },
    perimeterKeyName: { label: 'editor.ruleNode.field.perimeterKeyName' },
    polygonsDefinition: {
      label: 'editor.ruleNode.field.polygonsDefinition',
      widget: 'textarea',
      rows: 4,
    },
    centerLatitude: { label: 'editor.ruleNode.field.centerLatitude' },
    centerLongitude: { label: 'editor.ruleNode.field.centerLongitude' },
    range: { label: 'editor.ruleNode.field.range' },
    rangeUnit: {
      label: 'editor.ruleNode.field.rangeUnit',
      enumOptions: RANGE_UNITS,
    },
    minInsideDuration: { label: 'editor.ruleNode.field.minInsideDuration' },
    minOutsideDuration: { label: 'editor.ruleNode.field.minOutsideDuration' },
    minInsideDurationTimeUnit: {
      label: 'editor.ruleNode.field.minInsideDurationTimeUnit',
      enumOptions: TIME_UNITS,
    },
    minOutsideDurationTimeUnit: {
      label: 'editor.ruleNode.field.minOutsideDurationTimeUnit',
      enumOptions: TIME_UNITS,
    },
    reportPresenceStatusOnEachMessage: {
      label: 'editor.ruleNode.field.reportPresenceStatusOnEachMessage',
    },
  },

  'org.thingsboard.rule.engine.math.TbMathNode': {
    operation: {
      label: 'editor.ruleNode.field.operation',
      enumOptions: MATH_FUNCTIONS,
    },
    arguments: { label: 'editor.ruleNode.field.arguments' },
    customFunction: {
      label: 'editor.ruleNode.field.customFunction',
      widget: 'textarea',
      rows: 2,
    },
    result: { label: 'editor.ruleNode.field.result' },
  },

  'org.thingsboard.rule.engine.action.TbMsgCountNode': {
    telemetryPrefix: { label: 'editor.ruleNode.field.telemetryPrefix' },
    interval: { label: 'editor.ruleNode.field.interval' },
  },

  'org.thingsboard.rule.engine.delay.TbMsgDelayNode': {
    periodInSeconds: { label: 'editor.ruleNode.field.delayPeriodInSeconds' },
    maxPendingMsgs: { label: 'editor.ruleNode.field.maxPendingMsgs' },
    periodInSecondsPattern: {
      label: 'editor.ruleNode.field.periodInSecondsPattern',
    },
    useMetadataPeriodInSecondsPatterns: {
      label: 'editor.ruleNode.field.useMetadataPeriodInSecondsPatterns',
    },
  },

  'org.thingsboard.rule.engine.edge.TbMsgPushToEdgeNode': {
    scope: { label: 'editor.ruleNode.field.scope' },
  },

  'org.thingsboard.rule.engine.action.TbSaveToCustomCassandraTableNode': {
    tableName: { label: 'editor.ruleNode.field.tableName' },
    fieldsMapping: {
      label: 'editor.ruleNode.field.fieldsMapping',
      widget: 'json',
    },
    defaultTTL: { label: 'editor.ruleNode.field.defaultTTL' },
  },

  'org.thingsboard.rule.engine.rest.TbSendRestApiCallReplyNode': {
    serviceIdMetaDataAttribute: {
      label: 'editor.ruleNode.field.serviceIdMetaDataAttribute',
    },
    requestIdMetaDataAttribute: {
      label: 'editor.ruleNode.field.requestIdMetaDataAttribute',
    },
  },

  'org.thingsboard.rule.engine.rpc.TbSendRPCReplyNode': {
    serviceIdMetaDataAttribute: {
      label: 'editor.ruleNode.field.serviceIdMetaDataAttribute',
    },
    sessionIdMetaDataAttribute: {
      label: 'editor.ruleNode.field.sessionIdMetaDataAttribute',
    },
    requestIdMetaDataAttribute: {
      label: 'editor.ruleNode.field.requestIdMetaDataAttribute',
    },
  },

  'org.thingsboard.rule.engine.rpc.TbSendRPCRequestNode': {
    timeoutInSeconds: { label: 'editor.ruleNode.field.timeoutInSeconds' },
  },

  'org.thingsboard.rule.engine.action.TbUnassignFromCustomerNode': {
    customerNamePattern: { label: 'editor.ruleNode.field.customerNamePattern' },
  },

  'org.thingsboard.rule.engine.mail.TbMsgToEmailNode': {
    fromTemplate: { label: 'editor.ruleNode.field.fromTemplate' },
    toTemplate: {
      label: 'editor.ruleNode.field.toTemplate',
      widget: 'textarea',
      rows: 2,
    },
    ccTemplate: {
      label: 'editor.ruleNode.field.ccTemplate',
      widget: 'textarea',
      rows: 1,
    },
    bccTemplate: {
      label: 'editor.ruleNode.field.bccTemplate',
      widget: 'textarea',
      rows: 1,
    },
    subjectTemplate: {
      label: 'editor.ruleNode.field.subjectTemplate',
      widget: 'textarea',
      rows: 1,
    },
    bodyTemplate: {
      label: 'editor.ruleNode.field.bodyTemplate',
      widget: 'textarea',
      rows: 4,
    },
    isHtmlTemplate: { label: 'editor.ruleNode.field.isHtmlTemplate' },
    mailBodyType: {
      label: 'editor.ruleNode.field.mailBodyType',
      enumOptions: MAIL_BODY_TYPES,
    },
  },

  // -------------------------------------------------------------- EXTERNAL
  'org.thingsboard.rule.engine.ai.TbAiNode': {
    modelId: { label: 'editor.ruleNode.field.aiModelId', widget: 'json' },
    systemPrompt: {
      label: 'editor.ruleNode.field.systemPrompt',
      widget: 'textarea',
      rows: 4,
    },
    userPrompt: {
      label: 'editor.ruleNode.field.userPrompt',
      widget: 'textarea',
      rows: 4,
    },
    responseFormat: { label: 'editor.ruleNode.field.responseFormat' },
    'responseFormat.type': {
      label: 'editor.ruleNode.field.responseFormatType',
      enumOptions: RESPONSE_FORMAT_TYPES,
    },
    timeoutSeconds: { label: 'editor.ruleNode.field.timeoutSeconds' },
    forceAck: { label: 'editor.ruleNode.field.forceAck' },
  },

  'org.thingsboard.rule.engine.aws.lambda.TbAwsLambdaNode': {
    accessKey: { label: 'editor.ruleNode.field.accessKey' },
    secretKey: {
      label: 'editor.ruleNode.field.secretKey',
      widget: 'password',
    },
    region: { label: 'editor.ruleNode.field.region' },
    functionName: { label: 'editor.ruleNode.field.functionName' },
    qualifier: { label: 'editor.ruleNode.field.qualifier' },
    connectionTimeout: { label: 'editor.ruleNode.field.connectionTimeout' },
    requestTimeout: { label: 'editor.ruleNode.field.requestTimeout' },
    tellFailureIfFuncThrowsExc: {
      label: 'editor.ruleNode.field.tellFailureIfFuncThrowsExc',
    },
  },

  'org.thingsboard.rule.engine.mqtt.azure.TbAzureIotHubNode': {
    topicPattern: { label: 'editor.ruleNode.field.topicPattern' },
    host: { label: 'editor.ruleNode.field.host' },
    port: { label: 'editor.ruleNode.field.port' },
    connectTimeoutSec: { label: 'editor.ruleNode.field.connectTimeoutSec' },
    clientId: { label: 'editor.ruleNode.field.clientId' },
    appendClientIdSuffix: {
      label: 'editor.ruleNode.field.appendClientIdSuffix',
    },
    retainedMessage: { label: 'editor.ruleNode.field.retainedMessage' },
    cleanSession: { label: 'editor.ruleNode.field.cleanSession' },
    ssl: { label: 'editor.ruleNode.field.ssl' },
    parseToPlainText: { label: 'editor.ruleNode.field.parseToPlainText' },
    protocolVersion: {
      label: 'editor.ruleNode.field.protocolVersion',
      enumOptions: MQTT_VERSIONS,
    },
    credentials: { label: 'editor.ruleNode.field.credentials', widget: 'json' },
  },

  'org.thingsboard.rule.engine.kafka.TbKafkaNode': {
    topicPattern: { label: 'editor.ruleNode.field.topicPattern' },
    keyPattern: { label: 'editor.ruleNode.field.keyPattern' },
    bootstrapServers: { label: 'editor.ruleNode.field.bootstrapServers' },
    retries: { label: 'editor.ruleNode.field.retries' },
    batchSize: { label: 'editor.ruleNode.field.batchSize' },
    linger: { label: 'editor.ruleNode.field.linger' },
    bufferMemory: { label: 'editor.ruleNode.field.bufferMemory' },
    acks: { label: 'editor.ruleNode.field.acks', enumOptions: KAFKA_ACKS },
    addMetadataKeyValuesAsKafkaHeaders: {
      label: 'editor.ruleNode.field.addMetadataKeyValuesAsKafkaHeaders',
    },
    kafkaHeadersCharset: {
      label: 'editor.ruleNode.field.kafkaHeadersCharset',
      enumOptions: CHARSETS,
    },
    otherProperties: {
      label: 'editor.ruleNode.field.otherProperties',
      widget: 'json',
    },
  },

  'org.thingsboard.rule.engine.mqtt.TbMqttNode': {
    topicPattern: { label: 'editor.ruleNode.field.topicPattern' },
    host: { label: 'editor.ruleNode.field.host' },
    port: { label: 'editor.ruleNode.field.port' },
    connectTimeoutSec: { label: 'editor.ruleNode.field.connectTimeoutSec' },
    clientId: { label: 'editor.ruleNode.field.clientId' },
    appendClientIdSuffix: {
      label: 'editor.ruleNode.field.appendClientIdSuffix',
    },
    retainedMessage: { label: 'editor.ruleNode.field.retainedMessage' },
    cleanSession: { label: 'editor.ruleNode.field.cleanSession' },
    ssl: { label: 'editor.ruleNode.field.ssl' },
    parseToPlainText: { label: 'editor.ruleNode.field.parseToPlainText' },
    protocolVersion: {
      label: 'editor.ruleNode.field.protocolVersion',
      enumOptions: MQTT_VERSIONS,
    },
    credentials: { label: 'editor.ruleNode.field.credentials', widget: 'json' },
  },

  'org.thingsboard.rule.engine.notification.TbNotificationNode': {
    targets: { label: 'editor.ruleNode.field.targets' },
    templateId: { label: 'editor.ruleNode.field.templateId' },
  },

  'org.thingsboard.rule.engine.rabbitmq.TbRabbitMqNode': {
    exchangeNamePattern: { label: 'editor.ruleNode.field.exchangeNamePattern' },
    routingKeyPattern: { label: 'editor.ruleNode.field.routingKeyPattern' },
    messageProperties: {
      label: 'editor.ruleNode.field.messageProperties',
      widget: 'json',
    },
    host: { label: 'editor.ruleNode.field.host' },
    port: { label: 'editor.ruleNode.field.port' },
    virtualHost: { label: 'editor.ruleNode.field.virtualHost' },
    username: { label: 'editor.ruleNode.field.username' },
    password: { label: 'editor.ruleNode.field.password', widget: 'password' },
    automaticRecoveryEnabled: {
      label: 'editor.ruleNode.field.automaticRecoveryEnabled',
    },
    connectionTimeout: { label: 'editor.ruleNode.field.connectionTimeout' },
    handshakeTimeout: { label: 'editor.ruleNode.field.handshakeTimeout' },
  },

  'org.thingsboard.rule.engine.rest.TbRestApiCallNode': {
    restEndpointUrlPattern: {
      label: 'editor.ruleNode.field.restEndpointUrlPattern',
      widget: 'textarea',
      rows: 2,
    },
    requestMethod: {
      label: 'editor.ruleNode.field.requestMethod',
      enumOptions: REQUEST_METHODS,
    },
    headers: { label: 'editor.ruleNode.field.headers', widget: 'json' },
    queryParams: { label: 'editor.ruleNode.field.queryParams', widget: 'json' },
    readTimeoutMs: { label: 'editor.ruleNode.field.readTimeoutMs' },
    maxParallelRequestsCount: {
      label: 'editor.ruleNode.field.maxParallelRequestsCount',
    },
    parseToPlainText: { label: 'editor.ruleNode.field.parseToPlainText' },
    enableProxy: { label: 'editor.ruleNode.field.enableProxy' },
    useSystemProxyProperties: {
      label: 'editor.ruleNode.field.useSystemProxyProperties',
    },
    proxyHost: { label: 'editor.ruleNode.field.proxyHost' },
    proxyPort: { label: 'editor.ruleNode.field.proxyPort' },
    proxyUser: { label: 'editor.ruleNode.field.proxyUser' },
    proxyPassword: {
      label: 'editor.ruleNode.field.proxyPassword',
      widget: 'password',
    },
    credentials: { label: 'editor.ruleNode.field.credentials', widget: 'json' },
    ignoreRequestBody: { label: 'editor.ruleNode.field.ignoreRequestBody' },
    requestBodyTemplate: {
      label: 'editor.ruleNode.field.requestBodyTemplate',
      widget: 'textarea',
      rows: 4,
    },
    maxInMemoryBufferSizeInKb: {
      label: 'editor.ruleNode.field.maxInMemoryBufferSizeInKb',
    },
  },

  'org.thingsboard.rule.engine.mail.TbSendEmailNode': {
    useSystemSmtpSettings: {
      label: 'editor.ruleNode.field.useSystemSmtpSettings',
    },
    smtpHost: { label: 'editor.ruleNode.field.smtpHost' },
    smtpPort: { label: 'editor.ruleNode.field.smtpPort' },
    username: { label: 'editor.ruleNode.field.username' },
    password: { label: 'editor.ruleNode.field.password', widget: 'password' },
    smtpProtocol: {
      label: 'editor.ruleNode.field.smtpProtocol',
      enumOptions: SMTP_PROTOCOLS,
    },
    timeout: { label: 'editor.ruleNode.field.smtpTimeout' },
    enableTls: { label: 'editor.ruleNode.field.enableTls' },
    tlsVersion: {
      label: 'editor.ruleNode.field.tlsVersion',
      enumOptions: TLS_VERSIONS,
    },
    enableProxy: { label: 'editor.ruleNode.field.enableProxy' },
    proxyHost: { label: 'editor.ruleNode.field.proxyHost' },
    proxyPort: { label: 'editor.ruleNode.field.proxyPort' },
    proxyUser: { label: 'editor.ruleNode.field.proxyUser' },
    proxyPassword: {
      label: 'editor.ruleNode.field.proxyPassword',
      widget: 'password',
    },
  },

  'org.thingsboard.rule.engine.sms.TbSendSmsNode': {
    numbersToTemplate: {
      label: 'editor.ruleNode.field.numbersToTemplate',
      widget: 'textarea',
      rows: 2,
    },
    smsMessageTemplate: {
      label: 'editor.ruleNode.field.smsMessageTemplate',
      widget: 'textarea',
      rows: 3,
    },
    useSystemSmsSettings: {
      label: 'editor.ruleNode.field.useSystemSmsSettings',
    },
    smsProviderConfiguration: {
      label: 'editor.ruleNode.field.smsProviderConfiguration',
      widget: 'json',
    },
  },

  'org.thingsboard.rule.engine.notification.TbSlackNode': {
    botToken: { label: 'editor.ruleNode.field.botToken', widget: 'password' },
    useSystemSettings: { label: 'editor.ruleNode.field.useSystemSettings' },
    messageTemplate: {
      label: 'editor.ruleNode.field.messageTemplate',
      widget: 'textarea',
      rows: 3,
    },
    conversationType: {
      label: 'editor.ruleNode.field.conversationType',
      enumOptions: SLACK_CONVERSATION_TYPES,
    },
    conversation: {
      label: 'editor.ruleNode.field.conversation',
      widget: 'json',
    },
  },

  'org.thingsboard.rule.engine.aws.sns.TbSnsNode': {
    topicArnPattern: { label: 'editor.ruleNode.field.topicArnPattern' },
    accessKeyId: { label: 'editor.ruleNode.field.accessKeyId' },
    secretAccessKey: {
      label: 'editor.ruleNode.field.secretAccessKey',
      widget: 'password',
    },
    region: { label: 'editor.ruleNode.field.region' },
  },

  'org.thingsboard.rule.engine.aws.sqs.TbSqsNode': {
    queueType: {
      label: 'editor.ruleNode.field.queueType',
      enumOptions: [
        {
          value: 'STANDARD',
          label: 'editor.ruleNode.option.queueType.standard',
        },
        { value: 'FIFO', label: 'editor.ruleNode.option.queueType.fifo' },
      ],
    },
    queueUrlPattern: { label: 'editor.ruleNode.field.queueUrlPattern' },
    delaySeconds: { label: 'editor.ruleNode.field.delaySeconds' },
    accessKeyId: { label: 'editor.ruleNode.field.accessKeyId' },
    secretAccessKey: {
      label: 'editor.ruleNode.field.secretAccessKey',
      widget: 'password',
    },
    region: { label: 'editor.ruleNode.field.region' },
  },

  'org.thingsboard.rule.engine.gcp.pubsub.TbPubSubNode': {
    projectId: { label: 'editor.ruleNode.field.projectId' },
    topicName: { label: 'editor.ruleNode.field.topicName' },
    serviceAccountKey: {
      label: 'editor.ruleNode.field.serviceAccountKey',
      widget: 'textarea',
      rows: 4,
    },
    serviceAccountKeyFileName: {
      label: 'editor.ruleNode.field.serviceAccountKeyFileName',
    },
  },

  // ---------------------------------------------------------------- FILTER
  'org.thingsboard.rule.engine.filter.TbCheckAlarmStatusNode': {
    alarmStatusList: { label: 'editor.ruleNode.field.alarmStatusList' },
  },

  'org.thingsboard.rule.engine.filter.TbCheckMessageNode': {
    messageNames: { label: 'editor.ruleNode.field.messageNames' },
    metadataNames: { label: 'editor.ruleNode.field.metadataNames' },
    checkAllKeys: { label: 'editor.ruleNode.field.checkAllKeys' },
  },

  'org.thingsboard.rule.engine.filter.TbCheckRelationNode': {
    direction: {
      label: 'editor.ruleNode.field.direction',
      enumOptions: DIRECTION,
    },
    entityId: { label: 'editor.ruleNode.field.entityId' },
    entityType: { label: 'editor.ruleNode.field.entityType' },
    relationType: { label: 'editor.ruleNode.field.relationType' },
    checkForSingleEntity: {
      label: 'editor.ruleNode.field.checkForSingleEntity',
    },
  },

  'org.thingsboard.rule.engine.geo.TbGpsGeofencingFilterNode': {
    latitudeKeyName: { label: 'editor.ruleNode.field.latitudeKeyName' },
    longitudeKeyName: { label: 'editor.ruleNode.field.longitudeKeyName' },
    perimeterType: {
      label: 'editor.ruleNode.field.perimeterType',
      enumOptions: PERIMETER_TYPES,
    },
    fetchPerimeterInfoFromMessageMetadata: {
      label: 'editor.ruleNode.field.fetchPerimeterInfoFromMessageMetadata',
    },
    perimeterKeyName: { label: 'editor.ruleNode.field.perimeterKeyName' },
    polygonsDefinition: {
      label: 'editor.ruleNode.field.polygonsDefinition',
      widget: 'textarea',
      rows: 4,
    },
    centerLatitude: { label: 'editor.ruleNode.field.centerLatitude' },
    centerLongitude: { label: 'editor.ruleNode.field.centerLongitude' },
    range: { label: 'editor.ruleNode.field.range' },
    rangeUnit: {
      label: 'editor.ruleNode.field.rangeUnit',
      enumOptions: RANGE_UNITS,
    },
  },

  'org.thingsboard.rule.engine.filter.TbMsgTypeFilterNode': {
    messageTypes: { label: 'editor.ruleNode.field.messageTypes' },
  },

  'org.thingsboard.rule.engine.filter.TbOriginatorTypeFilterNode': {
    originatorTypes: { label: 'editor.ruleNode.field.originatorTypes' },
  },

  // ------------------------------------------------------------- ENRICHMENT
  'org.thingsboard.rule.engine.metadata.CalculateDeltaNode': {
    inputValueKey: { label: 'editor.ruleNode.field.inputValueKey' },
    outputValueKey: { label: 'editor.ruleNode.field.outputValueKey' },
    useCache: { label: 'editor.ruleNode.field.useCache' },
    addPeriodBetweenMsgs: {
      label: 'editor.ruleNode.field.addPeriodBetweenMsgs',
    },
    periodValueKey: { label: 'editor.ruleNode.field.periodValueKey' },
    round: { label: 'editor.ruleNode.field.round', widget: 'number' },
    tellFailureIfDeltaIsNegative: {
      label: 'editor.ruleNode.field.tellFailureIfDeltaIsNegative',
    },
    excludeZeroDeltas: { label: 'editor.ruleNode.field.excludeZeroDeltas' },
  },

  'org.thingsboard.rule.engine.metadata.TbFetchDeviceCredentialsNode': {
    fetchTo: { label: 'editor.ruleNode.field.fetchTo', enumOptions: FETCH_TO },
  },

  'org.thingsboard.rule.engine.metadata.TbGetAttributesNode': {
    fetchTo: { label: 'editor.ruleNode.field.fetchTo', enumOptions: FETCH_TO },
    clientAttributeNames: {
      label: 'editor.ruleNode.field.clientAttributeNames',
    },
    sharedAttributeNames: {
      label: 'editor.ruleNode.field.sharedAttributeNames',
    },
    serverAttributeNames: {
      label: 'editor.ruleNode.field.serverAttributeNames',
    },
    latestTsKeyNames: { label: 'editor.ruleNode.field.latestTsKeyNames' },
    tellFailureIfAbsent: { label: 'editor.ruleNode.field.tellFailureIfAbsent' },
    getLatestValueWithTs: {
      label: 'editor.ruleNode.field.getLatestValueWithTs',
    },
  },

  'org.thingsboard.rule.engine.metadata.TbGetCustomerAttributeNode': {
    dataToFetch: {
      label: 'editor.ruleNode.field.dataToFetch',
      enumOptions: DATA_TO_FETCH,
    },
    dataMapping: { label: 'editor.ruleNode.field.dataMapping', widget: 'json' },
    fetchTo: { label: 'editor.ruleNode.field.fetchTo', enumOptions: FETCH_TO },
  },

  'org.thingsboard.rule.engine.metadata.TbGetCustomerDetailsNode': {
    detailsList: { label: 'editor.ruleNode.field.detailsList' },
    fetchTo: { label: 'editor.ruleNode.field.fetchTo', enumOptions: FETCH_TO },
  },

  'org.thingsboard.rule.engine.metadata.TbGetDeviceAttrNode': {
    deviceRelationsQuery: {
      label: 'editor.ruleNode.field.deviceRelationsQuery',
    },
    clientAttributeNames: {
      label: 'editor.ruleNode.field.clientAttributeNames',
    },
    sharedAttributeNames: {
      label: 'editor.ruleNode.field.sharedAttributeNames',
    },
    serverAttributeNames: {
      label: 'editor.ruleNode.field.serverAttributeNames',
    },
    latestTsKeyNames: { label: 'editor.ruleNode.field.latestTsKeyNames' },
    tellFailureIfAbsent: { label: 'editor.ruleNode.field.tellFailureIfAbsent' },
    getLatestValueWithTs: {
      label: 'editor.ruleNode.field.getLatestValueWithTs',
    },
    fetchTo: { label: 'editor.ruleNode.field.fetchTo', enumOptions: FETCH_TO },
  },

  'org.thingsboard.rule.engine.metadata.TbGetOriginatorFieldsNode': {
    dataMapping: { label: 'editor.ruleNode.field.dataMapping', widget: 'json' },
    ignoreNullStrings: { label: 'editor.ruleNode.field.ignoreNullStrings' },
    fetchTo: { label: 'editor.ruleNode.field.fetchTo', enumOptions: FETCH_TO },
  },

  'org.thingsboard.rule.engine.metadata.TbGetRelatedAttributeNode': {
    ...RELATIONS_QUERY,
    dataToFetch: {
      label: 'editor.ruleNode.field.dataToFetch',
      enumOptions: DATA_TO_FETCH,
    },
    dataMapping: { label: 'editor.ruleNode.field.dataMapping', widget: 'json' },
    fetchTo: { label: 'editor.ruleNode.field.fetchTo', enumOptions: FETCH_TO },
  },

  'org.thingsboard.rule.engine.metadata.TbGetTelemetryNode': {
    startInterval: { label: 'editor.ruleNode.field.startInterval' },
    endInterval: { label: 'editor.ruleNode.field.endInterval' },
    startIntervalPattern: {
      label: 'editor.ruleNode.field.startIntervalPattern',
    },
    endIntervalPattern: { label: 'editor.ruleNode.field.endIntervalPattern' },
    useMetadataIntervalPatterns: {
      label: 'editor.ruleNode.field.useMetadataIntervalPatterns',
    },
    startIntervalTimeUnit: {
      label: 'editor.ruleNode.field.startIntervalTimeUnit',
      enumOptions: TIME_UNITS,
    },
    endIntervalTimeUnit: {
      label: 'editor.ruleNode.field.endIntervalTimeUnit',
      enumOptions: TIME_UNITS,
    },
    fetchMode: {
      label: 'editor.ruleNode.field.fetchMode',
      enumOptions: FETCH_MODES,
    },
    orderBy: { label: 'editor.ruleNode.field.orderBy', enumOptions: ORDER_BY },
    aggregation: {
      label: 'editor.ruleNode.field.aggregation',
      enumOptions: AGGREGATIONS,
    },
    limit: { label: 'editor.ruleNode.field.limit' },
    latestTsKeyNames: { label: 'editor.ruleNode.field.latestTsKeyNames' },
  },

  'org.thingsboard.rule.engine.metadata.TbGetTenantAttributeNode': {
    dataToFetch: {
      label: 'editor.ruleNode.field.dataToFetch',
      enumOptions: DATA_TO_FETCH,
    },
    dataMapping: { label: 'editor.ruleNode.field.dataMapping', widget: 'json' },
    fetchTo: { label: 'editor.ruleNode.field.fetchTo', enumOptions: FETCH_TO },
  },

  'org.thingsboard.rule.engine.metadata.TbGetTenantDetailsNode': {
    detailsList: { label: 'editor.ruleNode.field.detailsList' },
    fetchTo: { label: 'editor.ruleNode.field.fetchTo', enumOptions: FETCH_TO },
  },

  // ------------------------------------------------------------------ FLOW
  'org.thingsboard.rule.engine.flow.TbRuleChainInputNode': {
    ruleChainId: { label: 'editor.ruleNode.field.ruleChainId' },
    forwardMsgToDefaultRuleChain: {
      label: 'editor.ruleNode.field.forwardMsgToDefaultRuleChain',
    },
  },

  // ---------------------------------------------------------- TRANSFORMATION
  'org.thingsboard.rule.engine.transform.TbChangeOriginatorNode': {
    originatorSource: {
      label: 'editor.ruleNode.field.originatorSource',
      enumOptions: ORIGINATOR_SOURCES,
    },
    ...RELATIONS_QUERY,
    entityType: { label: 'editor.ruleNode.field.entityType' },
    entityNamePattern: { label: 'editor.ruleNode.field.entityNamePattern' },
  },

  'org.thingsboard.rule.engine.transform.TbJsonPathNode': {
    jsonPath: {
      label: 'editor.ruleNode.field.jsonPath',
      widget: 'textarea',
      rows: 2,
    },
  },

  'org.thingsboard.rule.engine.deduplication.TbMsgDeduplicationNode': {
    interval: { label: 'editor.ruleNode.field.interval' },
    strategy: {
      label: 'editor.ruleNode.field.strategy',
      enumOptions: FETCH_MODES,
    },
    outMsgType: { label: 'editor.ruleNode.field.outMsgType' },
    maxPendingMsgs: { label: 'editor.ruleNode.field.maxPendingMsgs' },
    maxRetries: { label: 'editor.ruleNode.field.maxRetries' },
  },

  // ------------------------------------------- EmptyNodeConfiguration nodes
  // (defaultConfiguration = {version: 0} — ui-ngx shows an empty form; the
  // placeholder is forced to JSON source mode instead of an editable number)
  'org.thingsboard.rule.engine.action.TbCopyAttributesToEntityViewNode':
    EMPTY_VERSION,
  'org.thingsboard.rule.engine.telemetry.TbCalculatedFieldsNode': EMPTY_VERSION,
  'org.thingsboard.rule.engine.transaction.TbSynchronizationBeginNode':
    EMPTY_VERSION,
  'org.thingsboard.rule.engine.transaction.TbSynchronizationEndNode':
    EMPTY_VERSION,
  'org.thingsboard.rule.engine.filter.TbAssetTypeSwitchNode': EMPTY_VERSION,
  'org.thingsboard.rule.engine.filter.TbDeviceTypeSwitchNode': EMPTY_VERSION,
  'org.thingsboard.rule.engine.filter.TbMsgTypeSwitchNode': EMPTY_VERSION,
  'org.thingsboard.rule.engine.filter.TbOriginatorTypeSwitchNode':
    EMPTY_VERSION,
  'org.thingsboard.rule.engine.flow.TbAckNode': EMPTY_VERSION,
  'org.thingsboard.rule.engine.flow.TbCheckpointNode': EMPTY_VERSION,
  'org.thingsboard.rule.engine.flow.TbRuleChainOutputNode': EMPTY_VERSION,
  'org.thingsboard.rule.engine.transform.TbSplitArrayMsgNode': EMPTY_VERSION,
};

/** Per-clazz hint slice; unknown clazzes get `{}` (never a wrong hint). */
export function uiHintsFor(clazz: string): UiHints {
  return HINT_SOURCE[clazz] ?? {};
}

/** Number of clazzes carrying hints (coverage bookkeeping for tests). */
export function uiHintsClazzCount(): number {
  return Object.keys(HINT_SOURCE).length;
}

const I18N_KEY_PREFIX = 'editor.';

/**
 * Resolves i18n-key labels (label + enumOptions labels + placeholder) for
 * rendering. Keys not starting with `editor.` pass through untouched, so
 * protocol-literal option labels (HTTP methods, TLS versions, …) render
 * verbatim. Pure — returns a new map, the source table is never mutated.
 */
export function localizeUiHintLabels(
  hints: UiHints,
  formatMessage: (id: string) => string,
): UiHints {
  const localize = (label: string | undefined): string | undefined => {
    if (label === undefined) {
      return undefined;
    }
    return label.startsWith(I18N_KEY_PREFIX) ? formatMessage(label) : label;
  };
  const result: UiHints = {};
  for (const [path, hint] of Object.entries(hints)) {
    result[path] = {
      ...hint,
      label: localize(hint.label),
      placeholder: localize(hint.placeholder),
      ...(hint.enumOptions
        ? {
            enumOptions: hint.enumOptions.map((option) => ({
              ...option,
              label: localize(option.label) ?? option.label,
            })),
          }
        : {}),
    };
  }
  return result;
}
