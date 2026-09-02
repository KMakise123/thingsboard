/**
 * en-US user-management keys (users list page + user create/edit dialog +
 * activation-link dialog). Wording follows ui-ngx locale.constant-en_US.json
 * (user.* block). Must stay key-for-key identical with zh-CN (check-locale).
 */
export default {
  // ---- list: table & toolbar ----
  'pages.users.list.title': 'Users',
  'pages.users.list.search': 'Search users',
  'pages.users.list.refresh': 'Refresh',
  'pages.users.list.total': '{count} total',
  'pages.users.list.empty': 'No users',
  'pages.users.list.loadFailed': 'Failed to load users',
  'pages.users.list.createdTime': 'Created time',
  'pages.users.list.firstName': 'First name',
  'pages.users.list.lastName': 'Last name',
  'pages.users.list.email': 'Email',
  'pages.users.list.authority': 'Authority',
  'pages.users.list.authorityTenantAdmin': 'Tenant admin',
  'pages.users.list.authorityCustomerUser': 'Customer user',
  'pages.users.list.add': 'Add user',

  // ---- row actions (six ops: edit / delete / activation link / resend /
  // enable-disable account) ----
  'pages.users.list.actionEdit': 'Edit',
  'pages.users.list.actionDelete': 'Delete',
  'pages.users.list.actionDisplayActivationLink': 'Display activation link',
  'pages.users.list.actionResendActivation': 'Resend activation',
  'pages.users.list.actionEnableAccount': 'Enable user account',
  'pages.users.list.actionDisableAccount': 'Disable user account',
  'pages.users.list.actionLoadingAccountState': 'Loading account state…',
  'pages.users.list.moreActions': 'More actions',

  // ---- delete confirm & toasts ----
  'pages.users.list.deleteTitle':
    "Are you sure you want to delete the user '{email}'?",
  'pages.users.list.deleteText':
    'Be careful, after the confirmation the user and all related data will become unrecoverable.',
  'pages.users.list.resendTitle':
    "Are you sure you want to resend the activation email to '{email}'?",
  'pages.users.list.resendText':
    'The activation email contains the link the user needs to create a password.',
  'pages.users.list.toastDeleted': 'User deleted.',
  'pages.users.list.toastCreated': 'User created.',
  'pages.users.list.toastSaved': 'User saved.',
  'pages.users.list.toastActivationEmailSent':
    'Activation email was successfully sent!',
  'pages.users.list.toastAccountEnabled':
    'User account was successfully enabled!',
  'pages.users.list.toastAccountDisabled':
    'User account was successfully disabled!',

  // ---- user create / edit dialog ----
  'pages.users.userDialog.createTitle': 'Add user',
  'pages.users.userDialog.editTitle': 'Edit user',
  'pages.users.userDialog.email': 'Email',
  'pages.users.userDialog.emailRequired': 'Email is required.',
  'pages.users.userDialog.emailInvalid': 'Invalid email format.',
  'pages.users.userDialog.firstName': 'First name',
  'pages.users.userDialog.lastName': 'Last name',
  'pages.users.userDialog.description': 'Description',
  'pages.users.userDialog.authority': 'Authority',
  'pages.users.userDialog.authorityRequired': 'Authority is required.',
  'pages.users.userDialog.authorityTenantAdmin': 'Tenant administrator',
  'pages.users.userDialog.authorityCustomerUser': 'Customer user',
  'pages.users.userDialog.customer': 'Customer',
  'pages.users.userDialog.customerPlaceholder': 'Search and select a customer',
  'pages.users.userDialog.customerRequired':
    'Customer users must be assigned to a customer.',
  'pages.users.userDialog.editScopeHint':
    'Authority and customer cannot be changed after creation.',
  'pages.users.userDialog.activationMethod': 'Activation method',
  'pages.users.userDialog.activationDisplay': 'Display activation link',
  'pages.users.userDialog.activationSendMail': 'Send activation mail',
  'pages.users.userDialog.actionCancel': 'Cancel',
  'pages.users.userDialog.actionAdd': 'Add',
  'pages.users.userDialog.actionSave': 'Save',

  // ---- activation-link dialog (shared by the post-create flow and the
  // "reset password" row action) ----
  'pages.users.activation.title': 'User activation link',
  'pages.users.activation.hint':
    'In order to activate the user, use the following activation link (expires in {ttl}):',
  'pages.users.activation.copy': 'Copy activation link',
  'pages.users.activation.copied':
    'User activation link has been copied to clipboard',
  'pages.users.activation.copyFailed': 'Copy failed, select and copy manually',
  'pages.users.activation.loadFailed': 'Failed to load the activation link',
  'pages.users.activation.ok': 'OK',
  'pages.users.activation.ttlDays': '{value} days',
  'pages.users.activation.ttlHours': '{value} hours',
  'pages.users.activation.ttlMinutes': '{value} minutes',
  'pages.users.activation.ttlSeconds': '{value} seconds',
};
