/**
 * en-US entity-view detail keys (detail-page header form shell + the six
 * tabs). Wording follows ui-ngx locale.constant-en_US.json (entity-view /
 * attribute sections). Must stay key-for-key identical with
 * zh-CN/entityViews/detail.ts (check-locale).
 */
export default {
  'pages.entityViews.detail.title': 'Entity view details',
  'pages.entityViews.detail.loadFailed': 'Failed to load the entity view',
  'pages.entityViews.detail.public': 'Public',

  // ---- header form shell (edit / save / dirty guard) ----
  'pages.entityViews.detail.edit': 'Edit',
  'pages.entityViews.detail.cancelEdit': 'Cancel edit',
  'pages.entityViews.detail.save': 'Save',
  'pages.entityViews.detail.toastSaved': 'Entity view saved.',
  'pages.entityViews.detail.saveFailed':
    'Failed to save the entity view: {reason}',
  'pages.entityViews.detail.unsavedTitle': 'Unsaved changes',
  'pages.entityViews.detail.unsavedText':
    'The entity view has unsaved changes. Leave anyway? Changes will be lost.',
  'pages.entityViews.detail.unsavedLeave': 'Leave',
  'pages.entityViews.detail.cancel': 'Cancel',

  // ---- tabs (ui-ngx entity-view-tabs order) ----
  'pages.entityViews.detail.tabAttributes': 'Attributes',
  'pages.entityViews.detail.tabLatestTelemetry': 'Latest telemetry',
  'pages.entityViews.detail.tabAlarms': 'Alarms',
  'pages.entityViews.detail.tabRelations': 'Relations',
  'pages.entityViews.detail.tabAuditLogs': 'Audit logs',
  'pages.entityViews.detail.tabVersionControl': 'Version control',
};
