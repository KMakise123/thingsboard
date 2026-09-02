/**
 * en-US tenant-domain keys — mirrors zh-CN/tenants/index.ts key-for-key
 * (check-locale gate). Wording follows the ui-ngx en baseline.
 */
export default {
  // ---- form (shared by the dialog and the detail header) ----
  'pages.tenants.form.title': 'Title',
  'pages.tenants.form.titleRequired': 'Title is required.',
  'pages.tenants.form.titleMaxLength': 'Title must be at most 255 characters.',
  'pages.tenants.form.tenantProfile': 'Tenant profile',
  'pages.tenants.form.tenantProfileRequired': 'Tenant profile is required.',
  'pages.tenants.form.tenantProfilePlaceholder': 'Select a tenant profile',
  'pages.tenants.form.country': 'Country',
  'pages.tenants.form.city': 'City',
  'pages.tenants.form.state': 'State',
  'pages.tenants.form.zip': 'Postal code',
  'pages.tenants.form.address': 'Address',
  'pages.tenants.form.address2': 'Address 2',
  'pages.tenants.form.phone': 'Phone',
  'pages.tenants.form.email': 'Email',
  'pages.tenants.form.emailInvalid': 'Invalid email format.',
  'pages.tenants.form.description': 'Description',

  // ---- create / edit dialog ----
  'pages.tenants.dialog.createTitle': 'Add tenant',
  'pages.tenants.dialog.editTitle': 'Edit tenant',
  'pages.tenants.dialog.actionAdd': 'Add',
  'pages.tenants.dialog.actionSave': 'Save',

  // ---- list ----
  'pages.tenants.list.search': 'Search tenants',
  'pages.tenants.list.refresh': 'Refresh',
  'pages.tenants.list.add': 'Add tenant',
  'pages.tenants.list.total': '{count} total',
  'pages.tenants.list.empty': 'No tenants',
  'pages.tenants.list.loadFailed': 'Failed to load tenants',
  'pages.tenants.list.createdTime': 'Created time',
  'pages.tenants.list.title': 'Title',
  'pages.tenants.list.tenantProfile': 'Tenant profile',
  'pages.tenants.list.email': 'Email',
  'pages.tenants.list.country': 'Country',
  'pages.tenants.list.city': 'City',
  'pages.tenants.list.actionEdit': 'Edit',
  'pages.tenants.list.actionManageAdmins': 'Manage tenant admins',
  'pages.tenants.list.actionDelete': 'Delete tenant',
  'pages.tenants.list.deleteTitle':
    "Are you sure you want to delete the tenant '{title}'?",
  'pages.tenants.list.deleteText':
    'Be careful, after the confirmation the tenant and all related data will become unrecoverable.',
  'pages.tenants.list.toastDeleted': 'Tenant deleted.',
  'pages.tenants.list.toastSaved': 'Tenant saved.',

  // ---- detail page ----
  'pages.tenants.detail.loadFailed': 'Failed to load the tenant',
  'pages.tenants.detail.toastSaved': 'Tenant saved.',
  'pages.tenants.detail.edit': 'Edit',
  'pages.tenants.detail.cancelEdit': 'Cancel edit',
  'pages.tenants.detail.tabAttributes': 'Attributes',
  'pages.tenants.detail.tabLatestTelemetry': 'Latest telemetry',
  'pages.tenants.detail.tabEvents': 'Events',
  'pages.tenants.detail.tabRelations': 'Relations',
  'pages.tenants.detail.eventCreatedTime': 'Created time',
  'pages.tenants.detail.eventType': 'Type',
  'pages.tenants.detail.eventMessage': 'Message',
  'pages.tenants.detail.eventEmpty': 'No events',
  'pages.tenants.detail.eventLoadFailed': 'Failed to load events',

  // ---- tenant-admins scope page (/tenants/:id/users) ----
  'pages.tenants.users.title': '{title}: Tenant admins',
  'pages.tenants.users.search': 'Search users',
  'pages.tenants.users.add': 'Add user',
  'pages.tenants.users.loginAs': 'Login as tenant admin',
};
