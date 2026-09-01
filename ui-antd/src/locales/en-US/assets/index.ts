/**
 * en-US asset domain keys (list page, add/edit dialog, CSV import and the
 * 8-tab detail page). Wording follows ui-ngx locale.constant.json (asset /
 * attribute keys). Must stay key-for-key identical with
 * zh-CN/assets/index.ts (check-locale).
 */
export default {
  // ---- list: table & filters ----
  'pages.assets.list.search': 'Search assets',
  'pages.assets.list.profile': 'Asset profile',
  'pages.assets.list.profilePlaceholder': 'All asset profiles',
  'pages.assets.list.name': 'Name',
  'pages.assets.list.label': 'Label',
  'pages.assets.list.createdTime': 'Created time',
  'pages.assets.list.customer': 'Customer',
  'pages.assets.list.public': 'Public',
  'pages.assets.list.empty': 'No assets',
  'pages.assets.list.loadFailed': 'Failed to load assets',

  // ---- list: toolbar ----
  'pages.assets.list.add': 'Add new asset',
  'pages.assets.list.import': 'Import assets',
  'pages.assets.list.refresh': 'Refresh',
  'pages.assets.list.selectedCount': '{count} selected',
  'pages.assets.list.total': '{count} total',
  'pages.assets.list.batchDelete': 'Delete selected',
  'pages.assets.list.batchAssign': 'Assign to customer',
  'pages.assets.list.batchUnassign': 'Unassign from customer',

  // ---- list: row actions ----
  'pages.assets.list.actionEdit': 'Edit',
  'pages.assets.list.actionDelete': 'Delete',
  'pages.assets.list.actionAssign': 'Assign to customer',
  'pages.assets.list.actionUnassign': 'Unassign from customer',

  // ---- list: confirmations & toasts ----
  'pages.assets.list.cancel': 'Cancel',
  'pages.assets.list.deleteTitle':
    "Are you sure you want to delete the asset '{name}'?",
  'pages.assets.list.deleteText':
    'Be careful, after the confirmation the asset and all related data will become unrecoverable.',
  'pages.assets.list.deleteManyTitle':
    'Are you sure you want to delete {count, plural, =1 {1 asset} other {# assets}}?',
  'pages.assets.list.deleteManyText':
    'Be careful, after the confirmation all selected assets will be removed and all related data will become unrecoverable.',
  'pages.assets.list.unassignTitle':
    "Are you sure you want to unassign the asset '{name}'?",
  'pages.assets.list.unassignText':
    'After the confirmation the asset will be unassigned and will not be accessible by the customer.',
  'pages.assets.list.unassignManyTitle':
    'Are you sure you want to unassign {count, plural, =1 {1 asset} other {# assets}}?',
  'pages.assets.list.unassignManyText':
    'After the confirmation all selected assets will be unassigned and will not be accessible by the customer.',
  'pages.assets.list.toastDeleted': 'Asset deleted.',
  'pages.assets.list.toastAssigned': 'Assets assigned to the customer.',
  'pages.assets.list.toastUnassigned': 'Assets unassigned from the customer.',
  'pages.assets.list.toastImported': 'Import finished.',
  'pages.assets.list.batchResult': '{ok} succeeded, {fail} failed.',

  // ---- add/edit dialog ----
  'pages.assets.dialog.addTitle': 'Add new asset',
  'pages.assets.dialog.editTitle': 'Edit asset',
  'pages.assets.dialog.save': 'Save',
  'pages.assets.dialog.cancel': 'Cancel',
  'pages.assets.dialog.name': 'Name',
  'pages.assets.dialog.nameRequired': 'Name is required.',
  'pages.assets.dialog.nameTooLong': 'Name must be at most 255 characters.',
  'pages.assets.dialog.assetProfile': 'Asset profile',
  'pages.assets.dialog.assetProfileRequired': 'Asset profile is required.',
  'pages.assets.dialog.assetProfilePlaceholder': 'Select an asset profile',
  'pages.assets.dialog.label': 'Label',
  'pages.assets.dialog.labelTooLong': 'Label must be at most 255 characters.',
  'pages.assets.dialog.customer': 'Assign to customer',
  'pages.assets.dialog.customerPlaceholder': 'Leave unassigned',
  'pages.assets.dialog.description': 'Description',
  'pages.assets.dialog.toastSaved': 'Asset saved.',
  'pages.assets.dialog.saveFailed': 'Failed to save the asset: {reason}',

  // ---- CSV import ----
  'pages.assets.import.title': 'Import assets',
  'pages.assets.import.parseError': 'Could not parse CSV: {message}',
  'pages.assets.import.stepFile': 'Select a file',
  'pages.assets.import.stepConfig': 'Import configuration',
  'pages.assets.import.stepColumns': 'Select columns type',
  'pages.assets.import.stepResult': 'Import result',
  'pages.assets.import.dropHint':
    'Drop a CSV file or click to select a file to upload.',
  'pages.assets.import.noFile': 'No file selected',
  'pages.assets.import.next': 'Next',
  'pages.assets.import.back': 'Back',
  'pages.assets.import.cancel': 'Cancel',
  'pages.assets.import.delimiter': 'CSV delimiter',
  'pages.assets.import.header': 'First line contains column names',
  'pages.assets.import.update':
    'Update existing assets (attributes / telemetry)',
  'pages.assets.import.columnSample': 'Example value data',
  'pages.assets.import.columnType': 'Column type',
  'pages.assets.import.columnKey': 'Attribute/telemetry key',
  'pages.assets.import.start': 'Import',
  'pages.assets.import.running': 'Importing…',
  'pages.assets.import.created': 'Created {count}',
  'pages.assets.import.updated': 'Updated {count}',
  'pages.assets.import.errors': 'Errors {count}',
  'pages.assets.import.errorsList': 'Error details',
  'pages.assets.import.finish': 'Finish',
  'pages.assets.import.type.name': 'Name',
  'pages.assets.import.type.type': 'Type',
  'pages.assets.import.type.label': 'Label',
  'pages.assets.import.type.description': 'Description',
  'pages.assets.import.type.serverAttribute': 'Server attribute',
  'pages.assets.import.type.sharedAttribute': 'Shared attribute',
  'pages.assets.import.type.timeseries': 'Timeseries',

  // ---- detail: header form ----
  'pages.assets.detail.edit': 'Edit',
  'pages.assets.detail.cancelEdit': 'Cancel edit',
  'pages.assets.detail.save': 'Save',
  'pages.assets.detail.name': 'Name',
  'pages.assets.detail.nameRequired': 'Name is required.',
  'pages.assets.detail.nameTooLong': 'Name must be at most 255 characters.',
  'pages.assets.detail.profile': 'Asset profile',
  'pages.assets.detail.profileRequired': 'Asset profile is required.',
  'pages.assets.detail.label': 'Label',
  'pages.assets.detail.labelTooLong': 'Label must be at most 255 characters.',
  'pages.assets.detail.description': 'Description',
  'pages.assets.detail.customer': 'Customer',
  'pages.assets.detail.public': 'Public',
  'pages.assets.detail.toastSaved': 'Asset saved.',
  'pages.assets.detail.saveFailed': 'Failed to save the asset: {reason}',

  // ---- detail: header actions ----
  'pages.assets.detail.actionUnassign': 'Unassign from customer',
  'pages.assets.detail.unassignTitle':
    "Are you sure you want to unassign the asset '{name}'?",
  'pages.assets.detail.unassignText':
    'After the confirmation the asset will be unassigned and will not be accessible by the customer.',
  'pages.assets.detail.toastUnassigned': 'Asset unassigned from the customer.',
  'pages.assets.detail.cancel': 'Cancel',
  'pages.assets.detail.unsavedTitle': 'Unsaved changes',
  'pages.assets.detail.unsavedText':
    'The asset has unsaved changes. Leave anyway? Changes will be lost.',
  'pages.assets.detail.unsavedLeave': 'Leave',
  'pages.assets.detail.loadFailed': 'Failed to load the asset',

  // ---- detail: tabs ----
  'pages.assets.detail.tabAttributes': 'Attributes',
  'pages.assets.detail.tabLatestTelemetry': 'Latest telemetry',
  'pages.assets.detail.tabCalculatedFields': 'Calculated fields',
  'pages.assets.detail.tabAlarmRules': 'Alarm rules',
  'pages.assets.detail.tabAlarms': 'Alarms',
  'pages.assets.detail.tabRelations': 'Relations',
  'pages.assets.detail.tabAuditLogs': 'Audit logs',
  'pages.assets.detail.tabVersionControl': 'Version control',
};
