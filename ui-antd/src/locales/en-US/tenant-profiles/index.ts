/**
 * en-US tenant-profile keys — mirrors zh-CN/tenant-profiles/index.ts
 * key-for-key (check-locale gate). Wording follows the ui-ngx en baseline.
 */
export default {
  // ---- list ----
  'pages.tenantProfiles.list.search': 'Search tenant profiles',
  'pages.tenantProfiles.list.refresh': 'Refresh',
  'pages.tenantProfiles.list.add': 'Add tenant profile',
  'pages.tenantProfiles.list.total': '{count} total',
  'pages.tenantProfiles.list.empty': 'No tenant profiles',
  'pages.tenantProfiles.list.loadFailed': 'Failed to load tenant profiles',
  'pages.tenantProfiles.list.createdTime': 'Created time',
  'pages.tenantProfiles.list.name': 'Name',
  'pages.tenantProfiles.list.description': 'Description',
  'pages.tenantProfiles.list.default': 'Default',
  'pages.tenantProfiles.list.selectedCount': '{count} selected',
  'pages.tenantProfiles.list.batchDelete': 'Delete selected',
  'pages.tenantProfiles.list.batchResult': '{ok} succeeded, {fail} failed.',
  'pages.tenantProfiles.list.actionExport': 'Export tenant profile',
  'pages.tenantProfiles.list.actionSetDefault': 'Make default tenant profile',
  'pages.tenantProfiles.list.actionDelete': 'Delete tenant profile',
  'pages.tenantProfiles.list.deleteTitle':
    "Are you sure you want to delete the tenant profile '{name}'?",
  'pages.tenantProfiles.list.deleteText':
    'Be careful, after the confirmation the tenant profile and all related data will become unrecoverable.',
  'pages.tenantProfiles.list.deleteManyTitle':
    'Are you sure you want to delete {count, plural, =1 {1 tenant profile} other {# tenant profiles}}?',
  'pages.tenantProfiles.list.deleteManyText':
    'Be careful, after the confirmation all selected tenant profiles will be removed and all related data will become unrecoverable.',
  'pages.tenantProfiles.list.setDefaultTitle':
    "Are you sure you want to make the tenant profile '{name}' default?",
  'pages.tenantProfiles.list.setDefaultText':
    'After the confirmation the tenant profile will be marked as default and used for new tenants without an explicit profile.',
  'pages.tenantProfiles.list.toastDeleted': 'Tenant profile deleted.',
  'pages.tenantProfiles.list.toastDefaultSet':
    'Default tenant profile updated.',
};
