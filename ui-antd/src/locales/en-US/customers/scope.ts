/**
 * Customer-scope pages ×4 (users / devices / assets / dashboards) copy.
 * Action sets mirror the ui-ngx same-domain tables in customer scope
 * (dashboards: assign/unassign only; rendering lands in M5).
 * Keep zh-CN/en-US key-for-key identical (check-locale gate).
 */
export default {
  'pages.customers.scope.customerLabel': 'Customer',
  'pages.customers.scope.loadTitleFailed': 'Failed to load the customer title',

  'pages.customers.devices.title': 'Customer devices',
  'pages.customers.devices.search': 'Search devices',
  'pages.customers.devices.refresh': 'Refresh',
  'pages.customers.devices.empty': 'No devices',
  'pages.customers.devices.total': '{count} total',
  'pages.customers.devices.loadFailed': 'Failed to load devices',
  'pages.customers.devices.columnCreatedTime': 'Created time',
  'pages.customers.devices.columnName': 'Name',
  'pages.customers.devices.columnProfile': 'Device profile',
  'pages.customers.devices.columnLabel': 'Label',
  'pages.customers.devices.columnState': 'State',
  'pages.customers.devices.active': 'Active',
  'pages.customers.devices.inactive': 'Inactive',
  'pages.customers.devices.selectedCount': '{count} selected',
  'pages.customers.devices.batchUnassign': 'Unassign selected devices',
  'pages.customers.devices.actionUnassign': 'Unassign from this customer',
  'pages.customers.devices.unassignTitle':
    "Are you sure you want to unassign the device '{name}'?",
  'pages.customers.devices.unassignManyTitle':
    'Are you sure you want to unassign {count, plural, =1 {1 device} other {# devices}}?',
  'pages.customers.devices.unassignText':
    'After the confirmation the device will no longer belong to this customer.',
  'pages.customers.devices.unassignManyText':
    'After the confirmation the selected devices will no longer belong to this customer.',
  'pages.customers.devices.toastUnassigned':
    'Devices unassigned from the customer.',
  'pages.customers.devices.actionDelete': 'Delete',
  'pages.customers.devices.deleteTitle':
    "Are you sure you want to delete the device '{name}'?",
  'pages.customers.devices.deleteText':
    'Be careful, after the confirmation the device and all related data will become unrecoverable.',
  'pages.customers.devices.toastDeleted': 'Device deleted.',

  'pages.customers.assets.title': 'Customer assets',
  'pages.customers.assets.search': 'Search assets',
  'pages.customers.assets.refresh': 'Refresh',
  'pages.customers.assets.empty': 'No assets',
  'pages.customers.assets.total': '{count} total',
  'pages.customers.assets.loadFailed': 'Failed to load assets',
  'pages.customers.assets.columnCreatedTime': 'Created time',
  'pages.customers.assets.columnName': 'Name',
  'pages.customers.assets.columnProfile': 'Asset profile',
  'pages.customers.assets.columnLabel': 'Label',
  'pages.customers.assets.selectedCount': '{count} selected',
  'pages.customers.assets.batchUnassign': 'Unassign selected assets',
  'pages.customers.assets.actionUnassign': 'Unassign from this customer',
  'pages.customers.assets.unassignTitle':
    "Are you sure you want to unassign the asset '{name}'?",
  'pages.customers.assets.unassignManyTitle':
    'Are you sure you want to unassign {count, plural, =1 {1 asset} other {# assets}}?',
  'pages.customers.assets.unassignText':
    'After the confirmation the asset will no longer belong to this customer.',
  'pages.customers.assets.unassignManyText':
    'After the confirmation the selected assets will no longer belong to this customer.',
  'pages.customers.assets.toastUnassigned':
    'Assets unassigned from the customer.',
  'pages.customers.assets.actionDelete': 'Delete',
  'pages.customers.assets.deleteTitle':
    "Are you sure you want to delete the asset '{name}'?",
  'pages.customers.assets.deleteText':
    'Be careful, after the confirmation the asset and all related data will become unrecoverable.',
  'pages.customers.assets.toastDeleted': 'Asset deleted.',

  'pages.customers.users.title': 'Customer users',
  'pages.customers.users.search': 'Search users',
  'pages.customers.users.refresh': 'Refresh',
  'pages.customers.users.empty': 'No users',
  'pages.customers.users.total': '{count} total',
  'pages.customers.users.loadFailed': 'Failed to load users',
  'pages.customers.users.columnCreatedTime': 'Created time',
  'pages.customers.users.columnEmail': 'Email',
  'pages.customers.users.columnFirstName': 'First name',
  'pages.customers.users.columnLastName': 'Last name',
  'pages.customers.users.actionEdit': 'Edit',
  'pages.customers.users.actionDelete': 'Delete',
  'pages.customers.users.deleteTitle':
    "Are you sure you want to delete the user '{email}'?",
  'pages.customers.users.deleteText':
    'Be careful, after the confirmation the user will become unrecoverable.',
  'pages.customers.users.toastDeleted': 'User deleted.',
  'pages.customers.users.actionShowActivationLink': 'Show activation link',
  'pages.customers.users.activationLinkTitle': 'Activation link',
  'pages.customers.users.actionResendActivation': 'Resend activation email',
  'pages.customers.users.toastActivationSent':
    'The activation email has been sent.',
  'pages.customers.users.editTitle': 'Edit user',
  'pages.customers.users.fieldEmail': 'Email',
  'pages.customers.users.fieldFirstName': 'First name',
  'pages.customers.users.fieldLastName': 'Last name',
  'pages.customers.users.fieldPhone': 'Phone',
  'pages.customers.users.toastSaved': 'User saved.',

  'pages.customers.dashboards.title': 'Customer dashboards',
  'pages.customers.dashboards.search': 'Search dashboards',
  'pages.customers.dashboards.refresh': 'Refresh',
  'pages.customers.dashboards.empty': 'No dashboards',
  'pages.customers.dashboards.total': '{count} total',
  'pages.customers.dashboards.loadFailed': 'Failed to load dashboards',
  'pages.customers.dashboards.columnCreatedTime': 'Created time',
  'pages.customers.dashboards.columnTitle': 'Dashboard title',
  'pages.customers.dashboards.actionAssign': 'Assign dashboard',
  'pages.customers.dashboards.assignTitle': 'Assign dashboard to customer',
  'pages.customers.dashboards.assignHint':
    'Pick a tenant dashboard to assign to this customer.',
  'pages.customers.dashboards.dashboardRequired': 'Dashboard is required.',
  'pages.customers.dashboards.dashboardPlaceholder':
    'Search and select a dashboard',
  'pages.customers.dashboards.assign': 'Assign',
  'pages.customers.dashboards.cancel': 'Cancel',
  'pages.customers.dashboards.toastAssigned':
    'The dashboard has been assigned to the customer.',
  'pages.customers.dashboards.actionUnassign': 'Unassign',
  'pages.customers.dashboards.unassignTitle':
    "Are you sure you want to unassign the dashboard '{title}'?",
  'pages.customers.dashboards.unassignText':
    'After the confirmation the customer will no longer have access to this dashboard.',
  'pages.customers.dashboards.toastUnassigned': 'Dashboard unassigned.',
};
