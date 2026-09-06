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

  // ---- M14 wave-5: PROPAGATION / aggregations / GEOFENCING (spec 6.1-12..15) ----

  // shared
  'pages.calculatedFields.direction': 'Relation direction',
  'pages.calculatedFields.relationType': 'Relation type',
  'pages.calculatedFields.relationTypeRequired': 'Relation type is required.',
  'pages.calculatedFields.script': 'Script',

  // PROPAGATION (6.1-12)
  'pages.calculatedFields.propagation.relationTitle':
    'Propagation path to related entities',
  'pages.calculatedFields.propagation.relationHint':
    'The calculated values propagate along this relation path (up to {max} related entities per argument).',
  'pages.calculatedFields.propagation.direction.TO': 'Up to parent',
  'pages.calculatedFields.propagation.direction.FROM': 'Down to child',
  'pages.calculatedFields.propagation.dataToPropagate': 'Data to propagate',
  'pages.calculatedFields.propagation.argumentsOnly': 'Arguments only',
  'pages.calculatedFields.propagation.expressionResult': 'Expression result',
  'pages.calculatedFields.propagation.outputKey': 'Output key',

  // Arguments-table variants (6.1-13/14) + propagation group checks
  'pages.calculatedFields.propagationArgumentsCurrentOnly':
    'Without an expression every argument must read from the current entity — remove entity references (and switch rolling arguments to latest telemetry).',
  'pages.calculatedFields.propagationNeedCurrentArgument':
    'At least one argument must read from the current entity in the expression-result propagation mode.',
  'pages.calculatedFields.argumentsNeedDefaultValue':
    'Every argument needs a default value — related entities may have no data yet when the aggregation runs.',
  'pages.calculatedFields.argument.defaultValueRequired':
    'Default value is required.',
  'pages.calculatedFields.argument.source.relationQuery': 'Related entities',

  // Metrics panel (both aggregations, 6.1-13/14)
  'pages.calculatedFields.metrics.title': 'Metrics',
  'pages.calculatedFields.metrics.addMetric': 'Add metric',
  'pages.calculatedFields.metrics.empty':
    'No metrics yet — at least one is required',
  'pages.calculatedFields.metrics.metricSettings': 'Metric settings',
  'pages.calculatedFields.metrics.metricName': 'Metric name',
  'pages.calculatedFields.metrics.metricNameRequired':
    'Metric name is required.',
  'pages.calculatedFields.metrics.metricNameMaxLength':
    'Metric name should be less than 256 characters.',
  'pages.calculatedFields.metrics.metricNameDuplicate':
    'Metric with such name already exists.',
  'pages.calculatedFields.metrics.aggregation': 'Aggregation',
  'pages.calculatedFields.metrics.agg.AVG': 'Average',
  'pages.calculatedFields.metrics.agg.MIN': 'Minimum',
  'pages.calculatedFields.metrics.agg.MAX': 'Maximum',
  'pages.calculatedFields.metrics.agg.SUM': 'Sum',
  'pages.calculatedFields.metrics.agg.COUNT': 'Count',
  'pages.calculatedFields.metrics.agg.COUNT_UNIQUE': 'Count unique',
  'pages.calculatedFields.metrics.argumentName': 'Argument name',
  'pages.calculatedFields.metrics.argumentNameRequired':
    'Argument name is required.',
  'pages.calculatedFields.metrics.filtered': 'Filtered',
  'pages.calculatedFields.metrics.valueSource': 'Value source',
  'pages.calculatedFields.metrics.valueSourceType.key': 'Key',
  'pages.calculatedFields.metrics.valueSourceType.function': 'Function',
  'pages.calculatedFields.metrics.filter': 'Filter',
  'pages.calculatedFields.metrics.filterHint':
    'Enables filtering of entities during aggregation. The filter function must return a boolean value and can use all configured arguments.',
  'pages.calculatedFields.metrics.mapFunction': 'Map function',
  'pages.calculatedFields.metrics.defaultValue': 'Default value',
  'pages.calculatedFields.metrics.noArguments':
    'Add at least one argument — a metric reads its value from an argument key.',
  'pages.calculatedFields.metricsRequired': 'At least one metric is required.',
  'pages.calculatedFields.metricsInvalid':
    'Some metrics are missing a name or a value source — fix them before saving.',

  // RELATED_ENTITIES_AGGREGATION (6.1-13)
  'pages.calculatedFields.relatedAggregation.relationTitle':
    'Related entities relation',
  'pages.calculatedFields.relatedAggregation.relationHint':
    'Aggregation runs over the entities reached through this relation; argument keys are read from the current entity and a default value is required.',
  'pages.calculatedFields.relatedAggregation.argumentsHint':
    'Each argument reads a key of the current entity and must carry a default value for entities without data yet.',
  'pages.calculatedFields.relatedAggregation.deduplicationInterval':
    'Deduplication interval (seconds)',
  'pages.calculatedFields.relatedAggregation.deduplicationHint':
    'Minimum time between telemetry aggregations.',
  'pages.calculatedFields.relatedAggregation.deduplicationMin':
    'At least {sec} seconds.',
  'pages.calculatedFields.deduplicationIntervalMin':
    'The deduplication interval cannot be below {sec, number} seconds.',

  // ENTITY_AGGREGATION (6.1-14)
  'pages.calculatedFields.entityAggregation.argumentsHint':
    'Each argument reads a latest-telemetry key of the target entity; the aggregation folds them over the interval.',
  'pages.calculatedFields.entityAggregation.intervalTitle':
    'Aggregation interval',
  'pages.calculatedFields.entityAggregation.intervalType':
    'Aggregate interval type',
  'pages.calculatedFields.entityAggregation.timezone': 'Timezone',
  'pages.calculatedFields.entityAggregation.tzRequired':
    'Timezone is required.',
  'pages.calculatedFields.entityAggregation.intervalValue':
    'Aggregate interval value (seconds)',
  'pages.calculatedFields.entityAggregation.intervalMin':
    'Aggregate interval value should be at least {sec} seconds.',
  'pages.calculatedFields.intervalDurationMin':
    'The aggregate interval value is below the allowed minimum.',
  'pages.calculatedFields.intervalTzRequired': 'Timezone is required.',
  'pages.calculatedFields.aggregatePeriod.HOUR': 'Hour',
  'pages.calculatedFields.aggregatePeriod.DAY': 'Day',
  'pages.calculatedFields.aggregatePeriod.WEEK': 'Week (Mon - Sun)',
  'pages.calculatedFields.aggregatePeriod.WEEK_SUN_SAT': 'Week (Sun - Sat)',
  'pages.calculatedFields.aggregatePeriod.MONTH': 'Month',
  'pages.calculatedFields.aggregatePeriod.QUARTER': 'Quarter',
  'pages.calculatedFields.aggregatePeriod.YEAR': 'Year',
  'pages.calculatedFields.aggregatePeriod.CUSTOM': 'Custom',
  'pages.calculatedFields.entityAggregation.applyOffset':
    'Apply offset to interval boundaries',
  'pages.calculatedFields.entityAggregation.offsetValue': 'Offset (seconds)',
  'pages.calculatedFields.entityAggregation.offsetHint':
    'The offset shifts every interval boundary — e.g. an HOUR interval with a 900s offset aggregates 00:15–01:15, 01:15–02:15 and so on (shifted by the timezone).',
  'pages.calculatedFields.entityAggregation.waitDelay':
    'Wait delay (watermark)',
  'pages.calculatedFields.entityAggregation.duration': 'Duration (seconds)',
  'pages.calculatedFields.entityAggregation.durationHint':
    'Late data arriving within this delay is still counted into the current interval.',
  'pages.calculatedFields.entityAggregation.produceIntermediateResult':
    'Produce intermediate results',
  'pages.calculatedFields.entityAggregation.intermediateThreshold':
    '(only for intervals longer than {sec} seconds)',

  // GEOFENCING (6.1-15)
  'pages.calculatedFields.geofencing.entityCoordinates': 'Entity coordinates',
  'pages.calculatedFields.geofencing.entityCoordinatesHint':
    'Time-series keys of the target entity carrying the latitude / longitude position.',
  'pages.calculatedFields.geofencing.latitudeKeyName':
    'Latitude time series key',
  'pages.calculatedFields.geofencing.latitudeKeyRequired':
    'Latitude time series key is required.',
  'pages.calculatedFields.geofencing.longitudeKeyName':
    'Longitude time series key',
  'pages.calculatedFields.geofencing.longitudeKeyRequired':
    'Longitude time series key is required.',
  'pages.calculatedFields.geofencing.zoneGroups': 'Geofencing zone groups',
  'pages.calculatedFields.geofencing.zoneGroupsHint':
    'Zones reference a perimeter attribute key on another entity — there is no map editor by design.',
  'pages.calculatedFields.geofencing.zoneGroupsEmpty':
    'No zone groups yet — at least one is required',
  'pages.calculatedFields.geofencing.addZone': 'Add zone group',
  'pages.calculatedFields.geofencing.zoneSettings':
    'Geofencing zone group settings',
  'pages.calculatedFields.geofencing.zoneEntity': 'Zone entity',
  'pages.calculatedFields.geofencing.zoneEntityType': 'Zone entity type',
  'pages.calculatedFields.geofencing.zoneEntityHint':
    'The entity holding the zone perimeter attribute: the target entity, a concrete entity, the tenant, the owner or the entities reached through relations.',
  'pages.calculatedFields.geofencing.nameRequired': 'Zone name is required.',
  'pages.calculatedFields.geofencing.nameDuplicate':
    'Zone name is already used.',
  'pages.calculatedFields.geofencing.tenantHint':
    'The zone perimeter is read from the current tenant.',
  'pages.calculatedFields.geofencing.ownerHint':
    'The zone perimeter is read from the entity owner (resolved at runtime).',
  'pages.calculatedFields.geofencing.relationPath': 'Path from entity to zones',
  'pages.calculatedFields.geofencing.relationPathHint':
    'Relation levels walked from the entity to the zone holders — up to {max} levels, order matters (drag equivalent: reorder with the arrows).',
  'pages.calculatedFields.geofencing.addLevel': 'Add level',
  'pages.calculatedFields.geofencing.levelDirection.TO': 'Up',
  'pages.calculatedFields.geofencing.levelDirection.FROM': 'Down',
  'pages.calculatedFields.geofencing.levelsRequired':
    'Every relation level needs a relation type — at least one level is required.',
  'pages.calculatedFields.geofencing.perimeterKeyName': 'Perimeter key name',
  'pages.calculatedFields.geofencing.perimeterKeyRequired':
    'Perimeter key name is required.',
  'pages.calculatedFields.geofencing.reportStrategy': 'Report strategy',
  'pages.calculatedFields.geofencing.reportStrategy.REPORT_TRANSITION_EVENTS_AND_PRESENCE_STATUS':
    'Presence status and transition events',
  'pages.calculatedFields.geofencing.reportStrategy.REPORT_TRANSITION_EVENTS_ONLY':
    'Transition events only',
  'pages.calculatedFields.geofencing.reportStrategy.REPORT_PRESENCE_STATUS_ONLY':
    'Presence status only',
  'pages.calculatedFields.geofencing.createRelations':
    'Create relations with matched zones',
  'pages.calculatedFields.geofencing.scheduledUpdateEnabled':
    'Zone groups refresh interval',
  'pages.calculatedFields.geofencing.scheduledUpdateMin':
    'At least {min} seconds.',
  'pages.calculatedFields.geofencing.scheduledUpdateOffHint':
    'Relation-resolved zones are only refreshed when new telemetry arrives — presence may go stale.',
  'pages.calculatedFields.zoneGroupsRequired':
    'At least one zone group is required.',
  'pages.calculatedFields.zoneGroupInvalid':
    'Some zone groups are missing the perimeter key or relation settings — fix them before saving.',

  // Test dialog (RELATED entry cannot write back)
  'pages.calculatedFields.testSaveDisabledHint':
    'This calculated-field type has no expression to save back.',
};
