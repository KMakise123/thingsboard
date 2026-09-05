/** notification templates keys (en-US side) — key-for-key identical with the other locale. */
export default {
  // ---- list page -----------------------------------------------------------
  'pages.notifications.templates.search': 'Search templates',
  'pages.notifications.templates.refresh': 'Refresh',
  'pages.notifications.templates.createdTime': 'Created time',
  'pages.notifications.templates.notificationType': 'Type',
  'pages.notifications.templates.name': 'Template',
  'pages.notifications.templates.total': '{count} total',
  'pages.notifications.templates.empty': 'No templates',
  'pages.notifications.templates.loadFailed': 'Failed to load templates',
  'pages.notifications.templates.add': 'Add template',
  'pages.notifications.templates.copy': 'Copy template',
  'pages.notifications.templates.delete': 'Delete',
  'pages.notifications.templates.cancel': 'Cancel',
  'pages.notifications.templates.selectedCount': '{count} selected',
  'pages.notifications.templates.batchDelete': 'Delete selected',
  'pages.notifications.templates.deleteOneTitle':
    "Are you sure you want to delete the notification template '{name}'?",
  'pages.notifications.templates.deleteOneText':
    'Be careful, after the confirmation the template will become unrecoverable.',
  'pages.notifications.templates.deleteManyTitle':
    'Are you sure you want to delete {count, plural, =1 {1 template} other {# templates}}?',
  'pages.notifications.templates.deleteManyText':
    'Be careful, after the confirmation the templates will become unrecoverable.',
  'pages.notifications.templates.toastDeleted': 'Template deleted.',
  'pages.notifications.templates.batchResult': '{ok} succeeded, {fail} failed.',

  // ---- notification type display names (mirror of the inbox set) -----------
  'pages.notifications.templates.type.GENERAL': 'General',
  'pages.notifications.templates.type.ALARM': 'Alarm',
  'pages.notifications.templates.type.DEVICE_ACTIVITY': 'Device activity',
  'pages.notifications.templates.type.ENTITY_ACTION': 'Entity action',
  'pages.notifications.templates.type.ALARM_COMMENT': 'Alarm comment',
  'pages.notifications.templates.type.ALARM_ASSIGNMENT': 'Alarm assignment',
  'pages.notifications.templates.type.RULE_ENGINE_COMPONENT_LIFECYCLE_EVENT':
    'Rule engine lifecycle event',
  'pages.notifications.templates.type.ENTITIES_LIMIT': 'Entities limit',
  'pages.notifications.templates.type.ENTITIES_LIMIT_INCREASE_REQUEST':
    'Entities limit increase request',
  'pages.notifications.templates.type.API_USAGE_LIMIT': 'API usage limit',
  'pages.notifications.templates.type.NEW_PLATFORM_VERSION':
    'New platform version',
  'pages.notifications.templates.type.RULE_NODE': 'Rule node',
  'pages.notifications.templates.type.RATE_LIMITS': 'Exceeded rate limits',
  'pages.notifications.templates.type.EDGE_CONNECTION': 'Edge connection',
  'pages.notifications.templates.type.EDGE_COMMUNICATION_FAILURE':
    'Edge communication failure',
  'pages.notifications.templates.type.TASK_PROCESSING_FAILURE':
    'Task processing failure',
  'pages.notifications.templates.type.RESOURCES_SHORTAGE': 'Resources shortage',

  // ---- wizard --------------------------------------------------------------
  'pages.notifications.templates.wizard.addTitle': 'Add notification template',
  'pages.notifications.templates.wizard.editTitle':
    'Edit notification template',
  'pages.notifications.templates.wizard.stepSetup': 'Setup',
  'pages.notifications.templates.wizard.stepCompose': 'Compose',
  'pages.notifications.templates.wizard.name': 'Name',
  'pages.notifications.templates.wizard.nameRequired': 'Name is required',
  'pages.notifications.templates.wizard.notificationType': 'Type',
  'pages.notifications.templates.wizard.deliveryMethods': 'Delivery method',
  'pages.notifications.templates.wizard.atLeastOne':
    'At least one delivery method should be selected',
  'pages.notifications.templates.wizard.back': 'Back',
  'pages.notifications.templates.wizard.next': 'Next',
  'pages.notifications.templates.wizard.save': 'Save',
  'pages.notifications.templates.wizard.add': 'Add',
  'pages.notifications.templates.wizard.composeIncomplete':
    'Complete every enabled message before continuing.',
  'pages.notifications.templates.wizard.toastSaved': 'Template saved.',
} as const;
