/**
 * en-US device detail keys (10-tab detail page). Keep key-for-key identical
 * with zh-CN/devices/detail.ts (check-locale gate).
 */
export default {
  // header + shell
  'pages.devices.detail.back': 'Back to devices',
  'pages.devices.detail.active': 'Active',
  'pages.devices.detail.inactive': 'Inactive',
  'pages.devices.detail.edit': 'Edit',
  'pages.devices.detail.cancelEdit': 'Cancel edit',
  'pages.devices.detail.loadFailed': 'Failed to load the device',
  'pages.devices.detail.unsavedTitle': 'Unsaved changes',
  'pages.devices.detail.unsavedText':
    'The device has unsaved changes. Leave anyway? Changes will be lost.',
  'pages.devices.detail.unsavedLeave': 'Leave',
  'pages.devices.detail.cancel': 'Cancel',

  // tabs
  'pages.devices.detail.tabDetails': 'Details',
  'pages.devices.detail.tabAttributes': 'Attributes',
  'pages.devices.detail.tabLatestTelemetry': 'Latest telemetry',
  'pages.devices.detail.tabCalculatedFields': 'Calculated fields',
  'pages.devices.detail.tabAlarmRules': 'Alarm rules',
  'pages.devices.detail.tabAlarms': 'Alarms',
  'pages.devices.detail.tabEvents': 'Events',
  'pages.devices.detail.tabRelations': 'Relations',
  'pages.devices.detail.tabAuditLogs': 'Audit logs',
  'pages.devices.detail.tabVersionControl': 'Version control',

  // details tab
  'pages.devices.detail.name': 'Name',
  'pages.devices.detail.nameRequired': 'Name is required.',
  'pages.devices.detail.nameTooLong': 'Name must be at most 255 characters.',
  'pages.devices.detail.profile': 'Device profile',
  'pages.devices.detail.profileRequired': 'Device profile is required.',
  'pages.devices.detail.label': 'Label',
  'pages.devices.detail.labelTooLong': 'Label must be at most 255 characters.',
  'pages.devices.detail.isGateway': 'Is gateway',
  'pages.devices.detail.overwriteActivityTime':
    'Overwrite activity time for gateway',
  'pages.devices.detail.description': 'Description',
  'pages.devices.detail.yes': 'Yes',
  'pages.devices.detail.no': 'No',
  'pages.devices.detail.save': 'Save',
  'pages.devices.detail.toastSaved': 'Device saved.',
  'pages.devices.detail.saveFailed': 'Failed to save the device: {reason}',

  // attributes tab
  'pages.devices.detail.scope.CLIENT_SCOPE': 'Client attributes',
  'pages.devices.detail.scope.SERVER_SCOPE': 'Server attributes',
  'pages.devices.detail.scope.SHARED_SCOPE': 'Shared attributes',
  'pages.devices.detail.lastUpdate': 'Last update',
  'pages.devices.detail.key': 'Key',
  'pages.devices.detail.value': 'Value',
  'pages.devices.detail.actions': 'Actions',
  'pages.devices.detail.delete': 'Delete',
  'pages.devices.detail.deleteSelected': 'Delete selected',
  'pages.devices.detail.searchKeys': 'Search keys',
  'pages.devices.detail.wsStatus': 'Live updates',
  'pages.devices.detail.clientScopeReadonly':
    'Client attributes are reported by the device and are read-only here.',
  'pages.devices.detail.attrLoadFailed': 'Failed to load attributes',
  'pages.devices.detail.attrEmpty': 'No attributes',
  'pages.devices.detail.attrAdd': 'Add attribute',
  'pages.devices.detail.attrSaved': 'Attribute saved.',
  'pages.devices.detail.attrDeleted':
    '{count, plural, =1 {Attribute deleted.} other {# attributes deleted.}}',
  'pages.devices.detail.attrDeleteTitle': "Delete attribute '{key}'?",
  'pages.devices.detail.attrDeleteManyTitle':
    'Delete {count, plural, =1 {1 attribute} other {# attributes}}?',
  'pages.devices.detail.attrAddTitle': 'Add attribute',
  'pages.devices.detail.attrEditTitle': 'Edit attribute: {key}',
  'pages.devices.detail.attrKey': 'Key',
  'pages.devices.detail.attrKeyRequired': 'Key is required.',
  'pages.devices.detail.attrValue': 'Value',
  'pages.devices.detail.attrValueType': 'Value type',
  'pages.devices.detail.attrTypeString': 'String',
  'pages.devices.detail.attrTypeNumber': 'Number',
  'pages.devices.detail.attrTypeBoolean': 'Boolean',
  'pages.devices.detail.attrTypeJson': 'JSON',
  'pages.devices.detail.attrValueInvalidNumber': 'Value must be a number.',
  'pages.devices.detail.attrValueInvalidJson': 'Value must be valid JSON.',
};
