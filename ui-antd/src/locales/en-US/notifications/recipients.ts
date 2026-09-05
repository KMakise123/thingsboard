/** Notification recipients keys (en-US side) — key-for-key identical with the other locale. */
export default {
  // list page
  'pages.notifications.recipients.search': 'Search recipients',
  'pages.notifications.recipients.refresh': 'Refresh',
  'pages.notifications.recipients.selectedCount': '{count} selected',
  'pages.notifications.recipients.batchDelete': 'Delete selected',
  'pages.notifications.recipients.add': 'Add recipient group',
  'pages.notifications.recipients.edit': 'Edit recipient group',
  'pages.notifications.recipients.createdTime': 'Created time',
  'pages.notifications.recipients.name': 'Name',
  'pages.notifications.recipients.type': 'Type',
  'pages.notifications.recipients.description': 'Description',
  'pages.notifications.recipients.total': '{count} total',
  'pages.notifications.recipients.empty': 'No recipient groups',
  'pages.notifications.recipients.loadFailed':
    'Failed to load recipient groups',
  'pages.notifications.recipients.delete': 'Delete',
  'pages.notifications.recipients.deleteOneTitle':
    "Delete the recipient group '{name}'?",
  'pages.notifications.recipients.deleteOneText':
    'Be careful, after the confirmation the recipient group will become unrecoverable.',
  'pages.notifications.recipients.deleteManyTitle':
    'Delete {count, plural, =1 {1 recipient group} other {# recipient groups}}?',
  'pages.notifications.recipients.deleteManyText': 'This cannot be undone.',
  'pages.notifications.recipients.cancel': 'Cancel',
  'pages.notifications.recipients.save': 'Save',
  'pages.notifications.recipients.toastSaved': 'Recipient group saved.',
  'pages.notifications.recipients.toastDeleted': 'Recipient group deleted.',
  'pages.notifications.recipients.batchResult':
    '{ok} succeeded, {fail} failed.',

  // dialog: common
  'pages.notifications.recipients.nameRequired': 'Name is required',
  'pages.notifications.recipients.fieldType': 'Type',
  'pages.notifications.recipients.targetType.platformUsers': 'Platform users',
  'pages.notifications.recipients.targetType.slack': 'Slack',
  'pages.notifications.recipients.targetType.microsoftTeams': 'Microsoft Teams',

  // dialog: PLATFORM_USERS filters
  'pages.notifications.recipients.fieldUsersFilter': 'User filter',
  'pages.notifications.recipients.usersFilter.allUsers': 'All users',
  'pages.notifications.recipients.usersFilter.tenantAdministrators':
    'Tenant administrators',
  'pages.notifications.recipients.usersFilter.customerUsers': 'Customer users',
  'pages.notifications.recipients.usersFilter.userList': 'User list',
  'pages.notifications.recipients.usersFilter.originatorEntityOwnerUsers':
    'Users of the entity owner',
  'pages.notifications.recipients.usersFilter.affectedUser': 'Affected user',
  'pages.notifications.recipients.usersFilter.systemAdministrators':
    'System administrators',
  'pages.notifications.recipients.usersFilter.affectedTenantAdministrators':
    'Affected tenant administrators',
  'pages.notifications.recipients.filterByTenants.tenants': 'Tenants',
  'pages.notifications.recipients.filterByTenants.tenantProfiles':
    'Tenant profiles',
  'pages.notifications.recipients.fieldTenants': 'Tenants',
  'pages.notifications.recipients.tenantsHint':
    'If empty, the group covers all tenants',
  'pages.notifications.recipients.fieldTenantProfiles': 'Tenant profiles',
  'pages.notifications.recipients.tenantProfilesHint':
    'If empty, the group covers all tenant profiles',
  'pages.notifications.recipients.fieldCustomer': 'Customer',
  'pages.notifications.recipients.customerRequired': 'Customer is required',
  'pages.notifications.recipients.fieldUsers': 'Users',
  'pages.notifications.recipients.usersRequired': 'User list is required',
  'pages.notifications.recipients.searchTenants': 'Search tenants',
  'pages.notifications.recipients.searchTenantProfiles':
    'Search tenant profiles',
  'pages.notifications.recipients.searchCustomers': 'Search customers',
  'pages.notifications.recipients.searchUsers': 'Search users',

  // dialog: SLACK
  'pages.notifications.recipients.slackChannelType': 'Slack channel type',
  'pages.notifications.recipients.slackType.publicChannel': 'Public channel',
  'pages.notifications.recipients.slackType.privateChannel': 'Private channel',
  'pages.notifications.recipients.slackType.direct': 'Direct message',
  'pages.notifications.recipients.fieldConversation': 'Conversation',
  'pages.notifications.recipients.conversationRequired':
    'Conversation is required',
  'pages.notifications.recipients.conversationUnavailable':
    'Pick the conversation from the list.',
  'pages.notifications.recipients.searchConversations': 'Search conversations',

  // dialog: MICROSOFT_TEAMS
  'pages.notifications.recipients.useOldApi': 'Use old API',
  'pages.notifications.recipients.useNewApi': 'Use new Workflows API',
  'pages.notifications.recipients.deprecatedNotice':
    'Office 365 connectors are retired; consider the Workflows API',
  'pages.notifications.recipients.webhookUrl': 'Webhook URL',
  'pages.notifications.recipients.workflowUrl': 'Workflow URL',
  'pages.notifications.recipients.webhookUrlRequired':
    'Webhook URL is required',
  'pages.notifications.recipients.workflowUrlRequired':
    'Workflow URL is required',
  'pages.notifications.recipients.fieldChannelName': 'Channel name',
  'pages.notifications.recipients.channelNameRequired':
    'Channel name is required',
} as const;
