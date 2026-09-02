/**
 * en-US asset-profile domain keys. Key-for-key mirror of
 * zh-CN/asset-profiles/index.ts (check-locale gate).
 */
export default {
  // ---- list ----
  'pages.asset-profiles.list.createdTime': 'Created time',
  'pages.asset-profiles.list.name': 'Name',
  'pages.asset-profiles.list.description': 'Description',
  'pages.asset-profiles.list.default': 'Default',
  'pages.asset-profiles.list.search': 'Search asset profiles',
  'pages.asset-profiles.list.refresh': 'Refresh',
  'pages.asset-profiles.list.add': 'Add new asset profile',
  'pages.asset-profiles.list.selectedCount': '{count} selected',
  'pages.asset-profiles.list.batchDelete': 'Delete selected',
  'pages.asset-profiles.list.total': '{count} total',
  'pages.asset-profiles.list.empty': 'No asset profiles',
  'pages.asset-profiles.list.loadFailed': 'Failed to load asset profiles',
  'pages.asset-profiles.list.actionExport': 'Export asset profile',
  'pages.asset-profiles.list.actionSetDefault': 'Set asset profile as default',
  'pages.asset-profiles.list.actionEdit': 'Edit',
  'pages.asset-profiles.list.actionDelete': 'Delete',
  'pages.asset-profiles.list.actionYes': 'Yes',
  'pages.asset-profiles.list.actionNo': 'No',
  'pages.asset-profiles.list.cancel': 'Cancel',
  'pages.asset-profiles.list.setDefaultTitle':
    "Are you sure you want to make the asset profile ''{name}'' the default?",
  'pages.asset-profiles.list.setDefaultText':
    'After the confirmation the asset profile will be marked as default and will be used for new assets with no profile specified.',
  'pages.asset-profiles.list.toastSetDefault': 'Default asset profile updated.',
  'pages.asset-profiles.list.deleteTitle':
    "Are you sure you want to delete the asset profile ''{name}''?",
  'pages.asset-profiles.list.deleteManyTitle':
    'Are you sure you want to delete {count, plural, =1 {1 asset profile} other {# asset profiles}}?',
  'pages.asset-profiles.list.deleteText':
    'Be careful, after the confirmation the asset profile and all related data will become unrecoverable.',
  'pages.asset-profiles.list.deleteFailed':
    'Deleted with {fail} failure(s). The default asset profile cannot be deleted.',
  'pages.asset-profiles.list.toastDeleted': 'Asset profile deleted.',
  'pages.asset-profiles.list.defaultProtected':
    'The default asset profile cannot be deleted or selected.',
  // ---- dialog ----
  'pages.asset-profiles.dialog.addTitle': 'Add new asset profile',
  'pages.asset-profiles.dialog.editTitle': 'Edit asset profile',
  'pages.asset-profiles.dialog.name': 'Name',
  'pages.asset-profiles.dialog.nameRequired': 'Name is required.',
  'pages.asset-profiles.dialog.nameTooLong':
    'Name must be at most 255 characters.',
  'pages.asset-profiles.dialog.description': 'Description',
  'pages.asset-profiles.dialog.save': 'Save',
  'pages.asset-profiles.dialog.cancel': 'Cancel',
  'pages.asset-profiles.dialog.toastSaved': 'Asset profile saved.',
  'pages.asset-profiles.dialog.saveFailed':
    'Failed to save the asset profile: {reason}',
  // ---- detail ----
  'pages.asset-profiles.detail.tabDetails': 'Details',
  'pages.asset-profiles.detail.tabCalculatedFields': 'Calculated fields',
  'pages.asset-profiles.detail.tabAlarmRules': 'Alarm rules',
  'pages.asset-profiles.detail.tabAuditLogs': 'Audit logs',
  'pages.asset-profiles.detail.tabVersionControl': 'Version control',
  'pages.asset-profiles.detail.defaultTag': 'Default',
  'pages.asset-profiles.detail.defaultRuleChain': 'Default rule chain',
  'pages.asset-profiles.detail.mobileDashboard': 'Mobile dashboard',
  'pages.asset-profiles.detail.mobileDashboardHint':
    'Mobile applications use this dashboard as an asset details dashboard.',
  'pages.asset-profiles.detail.defaultQueueName': 'Default queue name',
  'pages.asset-profiles.detail.selectQueueHint': 'Choose from a dropdown list.',
  'pages.asset-profiles.detail.defaultEdgeRuleChain': 'Default edge rule chain',
  'pages.asset-profiles.detail.defaultEdgeRuleChainHint':
    'Used as the rule chain on the edge to process the incoming data of the assets provisioned with this asset profile.',
  'pages.asset-profiles.detail.image': 'Asset profile image',
  'pages.asset-profiles.detail.edit': 'Edit',
  'pages.asset-profiles.detail.cancelEdit': 'Cancel edit',
  'pages.asset-profiles.detail.save': 'Save',
  'pages.asset-profiles.detail.toastSaved': 'Asset profile saved.',
  'pages.asset-profiles.detail.saveFailed':
    'Failed to save the asset profile: {reason}',
  'pages.asset-profiles.detail.loadFailed': 'Failed to load the asset profile',
  'pages.asset-profiles.detail.unsavedTitle': 'Unsaved changes',
  'pages.asset-profiles.detail.unsavedText':
    'The asset profile has unsaved changes. Leave anyway? Changes will be lost.',
  'pages.asset-profiles.detail.unsavedLeave': 'Leave',
};
