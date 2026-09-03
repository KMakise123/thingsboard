/**
 * en-US rule-node keys (`editor.ruleNode.*`, M8 wave-2 K). Mirrors the ui-ngx
 * `rule-node-config.*` English copy. Keep zh-CN/en-US key-for-key identical
 * (check-locale gate).
 */
export default {
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
  'editor.ruleNode.processing.strategy': 'Strategy',
  'editor.ruleNode.processing.deduplicationInterval':
    'Deduplication interval (seconds)',
  'editor.ruleNode.processing.advanced': 'Advanced strategies',
  'editor.ruleNode.processing.advanced.timeseries': 'Timeseries',
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
  'editor.ruleNode.createAlarm.propagate': 'Propagate alarm to related entities',
  'editor.ruleNode.createAlarm.propagateToOwner':
    'Propagate alarm to entity owner (customer or tenant)',
  'editor.ruleNode.createAlarm.propagateToTenant': 'Propagate alarm to tenant',
  'editor.ruleNode.createAlarm.relationTypes': 'Relation types to propagate',
  'editor.ruleNode.createAlarm.useMessageAlarmData': 'Use message alarm data',
  'editor.ruleNode.createAlarm.overwriteAlarmDetails': 'Overwrite alarm details',
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
