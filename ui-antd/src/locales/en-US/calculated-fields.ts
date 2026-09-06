/**
 * en-US strings for the calculated-fields standalone page (M14 wave-4).
 * Key-for-key identical with zh-CN/calculated-fields.ts (check-locale gate).
 * Wording anchored on ui-ngx `calculated-fields.*` (locale.constant-en_US.json).
 */
export default {
  // list page
  'pages.calculatedFields.search': 'Search calculated fields',
  'pages.calculatedFields.refresh': 'Refresh',
  'pages.calculatedFields.total': '{count} total',
  'pages.calculatedFields.empty': 'No calculated fields found',
  'pages.calculatedFields.loadFailed': 'Failed to load calculated fields',
  'pages.calculatedFields.selectedCount': '{count} selected',
  'pages.calculatedFields.batchDelete': 'Delete selected',

  // columns
  'pages.calculatedFields.createdTime': 'Created time',
  'pages.calculatedFields.name': 'Name',
  'pages.calculatedFields.entityType': 'Entity type',
  'pages.calculatedFields.entityName': 'Entity',
  'pages.calculatedFields.type': 'Type',
  'pages.calculatedFields.actions': 'Actions',

  // filter dimensions (6 page types — ALARM excluded by contract)
  'pages.calculatedFields.filter.types': 'Filter by types',
  'pages.calculatedFields.filter.entityType': 'Filter by entity type',
  'pages.calculatedFields.filter.entities': 'Filter by entities',
  'pages.calculatedFields.filter.entitiesPlaceholder': 'Filter by entities',
  'pages.calculatedFields.filter.entitiesNeedType': 'Pick an entity type first',

  'pages.calculatedFields.entityType.DEVICE': 'Device',
  'pages.calculatedFields.entityType.ASSET': 'Asset',
  'pages.calculatedFields.entityType.DEVICE_PROFILE': 'Device profile',
  'pages.calculatedFields.entityType.ASSET_PROFILE': 'Asset profile',

  'pages.calculatedFields.type.SIMPLE': 'Simple',
  'pages.calculatedFields.type.SCRIPT': 'Script',
  'pages.calculatedFields.type.PROPAGATION': 'Propagation',
  'pages.calculatedFields.type.RELATED_ENTITIES_AGGREGATION':
    'Related entities aggregation',
  'pages.calculatedFields.type.ENTITY_AGGREGATION': 'Entity aggregation',
  'pages.calculatedFields.type.GEOFENCING': 'Geofencing',

  // row / header actions
  'pages.calculatedFields.add': 'Add calculated field',
  'pages.calculatedFields.import': 'Import',
  'pages.calculatedFields.copy': 'Copy',
  'pages.calculatedFields.export': 'Export',
  'pages.calculatedFields.events': 'Events',
  'pages.calculatedFields.eventsTitle': 'Events: "{name}"',
  'pages.calculatedFields.delete': 'Delete',
  'pages.calculatedFields.edit': 'Edit',
  'pages.calculatedFields.cancel': 'Cancel',
  'pages.calculatedFields.apply': 'Apply',
  'pages.calculatedFields.save': 'Save',
  'pages.calculatedFields.deleteOneTitle':
    'Are you sure you want to delete the calculated field "{name}"?',
  'pages.calculatedFields.deleteManyTitle':
    'Are you sure you want to delete {count, plural, =1 {1 calculated field} other {# calculated fields}}?',
  'pages.calculatedFields.deleteText':
    'Be careful, after the confirmation the calculated field will become unrecoverable.',
  'pages.calculatedFields.toastDeleted': 'Calculated field deleted.',
  'pages.calculatedFields.toastSaved': 'Calculated field saved.',
  'pages.calculatedFields.importRejected':
    '{reason, select, parse {The file is not valid JSON.} type {ALARM and unknown calculated-field types cannot be imported here.} other {The file does not contain a calculated field.}}',

  // edit dialog skeleton
  'pages.calculatedFields.addTitle': 'Add calculated field',
  'pages.calculatedFields.editTitle': 'Edit calculated field',
  'pages.calculatedFields.importTitle': 'Import calculated field',
  'pages.calculatedFields.nameRequired': 'Name is required.',
  'pages.calculatedFields.nameMaxLength':
    'Name should be less than 256 characters.',
  'pages.calculatedFields.targetEntity': 'Target entity',
  'pages.calculatedFields.targetEntityType': 'Entity type',
  'pages.calculatedFields.targetEntityRequired': 'Target entity is required.',
  'pages.calculatedFields.targetEntityLocked':
    'The target entity cannot be changed after creation — delete and recreate the field to move it.',
  'pages.calculatedFields.debugSettings': 'Debug settings',
  'pages.calculatedFields.debugFailures': 'Debug failures',
  'pages.calculatedFields.debugAll': 'Debug all',
  'pages.calculatedFields.debugFor': 'Debug switches for "{name}".',
  'pages.calculatedFields.debugSettingsHint':
    'Debug events appear under the Events row action while debugging is on.',
  'pages.calculatedFields.fixProblems':
    'Fix the highlighted problems before saving.',

  // precheck (spec 6.1-10 / 6.6 enhancement)
  'pages.calculatedFields.precheckBlocked':
    'The expression failed the pre-check — fix it before saving.',
  'pages.calculatedFields.precheckDegraded':
    'The pre-check could not run (TBEL script engine disabled) — the field is saved without validation.',

  // arguments suite
  'pages.calculatedFields.arguments': 'Arguments',
  'pages.calculatedFields.argumentsEmpty': 'No arguments yet',
  'pages.calculatedFields.argumentsRequired':
    'At least one argument is required.',
  'pages.calculatedFields.argumentsRollingInSimple':
    'SIMPLE calculated fields do not support rolling arguments. Switch the field type to SCRIPT or use latest-telemetry arguments.',
  'pages.calculatedFields.argumentsEntityNotFound':
    'Some arguments reference an entity that cannot be found. Fix or remove them before saving.',
  'pages.calculatedFields.argument.addTitle': 'Add argument',
  'pages.calculatedFields.argument.editTitle': 'Edit argument',
  'pages.calculatedFields.argument.name': 'Name',
  'pages.calculatedFields.argument.nameRequired': 'Argument name is required.',
  'pages.calculatedFields.argument.namePattern':
    'Only letters, digits and underscores, starting with a letter or underscore.',
  'pages.calculatedFields.argument.nameMaxLength':
    'Argument name should be less than 256 characters.',
  'pages.calculatedFields.argument.nameDuplicate':
    'Argument name is already used in this field.',
  'pages.calculatedFields.argument.nameForbidden':
    '"{name}" is a reserved name and cannot be used.',
  'pages.calculatedFields.argument.source': 'Source entity',
  'pages.calculatedFields.argument.sourceHint':
    'Where the argument reads its value from: the target entity itself, a concrete entity, the tenant or the owner.',
  'pages.calculatedFields.argument.source.CURRENT': 'Current entity',
  'pages.calculatedFields.argument.source.DEVICE': 'Device',
  'pages.calculatedFields.argument.source.ASSET': 'Asset',
  'pages.calculatedFields.argument.source.CUSTOMER': 'Customer',
  'pages.calculatedFields.argument.source.TENANT': 'Tenant',
  'pages.calculatedFields.argument.source.CURRENT_OWNER': 'Current owner',
  'pages.calculatedFields.argument.refEntity': 'Entity',
  'pages.calculatedFields.argument.refEntityRequired': 'Entity is required.',
  'pages.calculatedFields.argument.entityPlaceholder': 'Search entity',
  'pages.calculatedFields.argument.entityNotFound': 'No entities found',
  'pages.calculatedFields.argument.tenantHint':
    'Reads tenant-level data of the current tenant.',
  'pages.calculatedFields.argument.ownerHint':
    'Reads data of the entity owner (resolved at runtime).',
  'pages.calculatedFields.argument.key': 'Key',
  'pages.calculatedFields.argument.keyRequired': 'Key is required.',
  'pages.calculatedFields.argument.keyPattern':
    'Single spaces inside the key are allowed.',
  'pages.calculatedFields.argument.keyType': 'Data type',
  'pages.calculatedFields.argument.keyType.TS_LATEST': 'Latest telemetry',
  'pages.calculatedFields.argument.keyType.ATTRIBUTE': 'Attribute',
  'pages.calculatedFields.argument.keyType.TS_ROLLING': 'Rolling telemetry',
  'pages.calculatedFields.argument.scope': 'Attribute scope',
  'pages.calculatedFields.argument.limit': 'Limit (max {max} data points)',
  'pages.calculatedFields.argument.limitRequired': 'Limit is required.',
  'pages.calculatedFields.argument.timeWindow': 'Time window (ms)',
  'pages.calculatedFields.argument.timeWindowRequired':
    'Time window is required.',
  'pages.calculatedFields.argument.defaultValue': 'Default value',
  'pages.calculatedFields.argument.defaultValuePattern':
    'Single spaces inside the value are allowed.',

  // expression / script
  'pages.calculatedFields.expression': 'Expression',
  'pages.calculatedFields.expressionRequired': 'Expression is required.',
  'pages.calculatedFields.expressionMaxLength':
    'Expression should be less than 256 characters.',
  'pages.calculatedFields.expressionPattern':
    'Single spaces inside the expression are allowed.',
  'pages.calculatedFields.scriptSignature': 'function calculate({args})',
  'pages.calculatedFields.testScript': 'Test script',
  'pages.calculatedFields.useLatestTs': 'Use latest telemetry for calculations',
  'pages.calculatedFields.useLatestTsTimeseriesOnly':
    '(time series output only)',

  // test dialog (R15)
  'pages.calculatedFields.testScriptTitle':
    'Test calculated field expression (TBEL)',
  'pages.calculatedFields.testRun': 'Test',
  'pages.calculatedFields.testNoArguments': 'This field has no arguments.',
  'pages.calculatedFields.testParseError':
    'Some argument values are not valid JSON. Fix them to run the test.',
  'pages.calculatedFields.testOutputPlaceholder':
    'Run the test to see the output',

  // output suite
  'pages.calculatedFields.output.title': 'Output',
  'pages.calculatedFields.output.type': 'Output type',
  'pages.calculatedFields.output.type.TIME_SERIES': 'Time series',
  'pages.calculatedFields.output.type.ATTRIBUTES': 'Attributes',
  'pages.calculatedFields.output.scope': 'Scope',
  'pages.calculatedFields.output.scopeHint':
    'Attribute scope is selectable for Device-family targets only.',
  'pages.calculatedFields.output.timeseriesKey': 'Time series key',
  'pages.calculatedFields.output.attributeKey': 'Attribute key',
  'pages.calculatedFields.output.keyRequired': 'Output key is required.',
  'pages.calculatedFields.output.keyPattern':
    'Single spaces inside the key are allowed.',
  'pages.calculatedFields.output.decimals': 'Decimals',
  'pages.calculatedFields.output.strategy': 'Output strategy',
  'pages.calculatedFields.output.strategyHint':
    'IMMEDIATE writes the calculated values to the database directly; RULE_CHAIN forwards them to the rule chain instead.',
  'pages.calculatedFields.output.strategy.IMMEDIATE': 'Save to database',
  'pages.calculatedFields.output.strategy.RULE_CHAIN': 'Send to rule chain',
  'pages.calculatedFields.output.saveTimeSeries': 'Save time series',
  'pages.calculatedFields.output.saveLatest': 'Save to latest telemetry',
  'pages.calculatedFields.output.sendWsUpdate': 'Send message over WebSocket',
  'pages.calculatedFields.output.processCfs': 'Process other calculated fields',
  'pages.calculatedFields.output.saveAttribute': 'Save attributes',
  'pages.calculatedFields.output.updateOnlyOnChange':
    'Update attributes only on value change',
  'pages.calculatedFields.output.sendAttributesUpdatedNotification':
    'Send attributes updated notification',
  'pages.calculatedFields.output.useCustomTtl': 'Use custom TTL',
  'pages.calculatedFields.output.ttl': 'TTL (seconds)',
  'pages.calculatedFields.output.ruleChainHint':
    'The calculated values are forwarded to the rule chain — the immediate-write parameters above are disabled.',

  // wave-5 placeholder
  'pages.calculatedFields.placeholderTitle':
    'Configurator delivered in a later wave',
  'pages.calculatedFields.placeholderHint':
    'Saving is disabled until the full editor ships.',
  'pages.calculatedFields.placeholderDescription':
    'The full editor for this calculated-field type ships with the M14 wave-5 delivery (propagation, aggregations, geofencing). Choose SIMPLE or SCRIPT to continue in this wave.',
};
