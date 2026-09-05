/**
 * Notification sent + send-wizard keys (en-US side) — key-for-key identical
 * with the other locale.
 *
 * NOTE: the shared message editor (`components/notifications/
 * template-configuration`) deliberately keeps its strings under the
 * `pages.notifications.sent.templateConfig.*` sub-namespace (per the M12
 * wave-3-B brief) even though the templates page (wave 3-C) reuses it.
 */
export default {
  // ---- list page -----------------------------------------------------------
  'pages.notifications.sent.send': 'Send notification',
  'pages.notifications.sent.refresh': 'Refresh',
  'pages.notifications.sent.createdTime': 'Created time',
  'pages.notifications.sent.status': 'Status',
  'pages.notifications.sent.deliveryMethods': 'Delivery methods',
  'pages.notifications.sent.template': 'Template',
  'pages.notifications.sent.total': '{count} total',
  'pages.notifications.sent.empty': 'No sent notifications',
  'pages.notifications.sent.loadFailed': 'Failed to load sent notifications',
  'pages.notifications.sent.selectedCount': '{count} selected',
  'pages.notifications.sent.batchDelete': 'Delete selected',
  'pages.notifications.sent.delete': 'Delete',
  'pages.notifications.sent.cancel': 'Cancel',
  'pages.notifications.sent.deleteOneTitle':
    'Are you sure you want to delete the notification request?',
  'pages.notifications.sent.deleteOneText':
    'Be careful, after the confirmation the request will become unrecoverable.',
  'pages.notifications.sent.deleteManyTitle':
    'Are you sure you want to delete {count, plural, =1 {1 request} other {# requests}}?',
  'pages.notifications.sent.deleteManyText':
    'Be careful, after the confirmation the requests will become unrecoverable.',
  'pages.notifications.sent.toastDeleted': 'Notification request deleted.',
  'pages.notifications.sent.batchResult': '{ok} succeeded, {fail} failed.',

  // ---- status / methods / fails --------------------------------------------
  'pages.notifications.sent.status.sent': 'Sent',
  'pages.notifications.sent.status.processing': 'Processing',
  'pages.notifications.sent.status.scheduled': 'Scheduled',
  'pages.notifications.sent.fails':
    '{count, plural, =1 {1 failure} other {# failures}} >',
  'pages.notifications.sent.deliveryMethod.web': 'Web',
  'pages.notifications.sent.deliveryMethod.email': 'Email',
  'pages.notifications.sent.deliveryMethod.sms': 'SMS',
  'pages.notifications.sent.deliveryMethod.slack': 'Slack',
  'pages.notifications.sent.deliveryMethod.microsoftTeams': 'Microsoft Teams',
  'pages.notifications.sent.deliveryMethod.mobileApp': 'Mobile app',
  'pages.notifications.sent.deliveryMethod.deliveryMethod': 'Delivery method',

  // ---- errors dialog ---------------------------------------------------------
  'pages.notifications.sent.errorDialog.title': 'Delivery failures',
  'pages.notifications.sent.errorDialog.empty':
    'No delivery errors recorded for this request.',
  'pages.notifications.sent.errorDialog.loadFailed':
    'Failed to load the request errors',

  // ---- wizard ---------------------------------------------------------------
  'pages.notifications.sent.wizard.newTitle': 'New notification',
  'pages.notifications.sent.wizard.againTitle': 'Send again',
  'pages.notifications.sent.wizard.step.setup': 'Setup',
  'pages.notifications.sent.wizard.step.compose': 'Compose',
  'pages.notifications.sent.wizard.step.review': 'Review',
  'pages.notifications.sent.wizard.back': 'Back',
  'pages.notifications.sent.wizard.next': 'Next',
  'pages.notifications.sent.wizard.send': 'Send',
  'pages.notifications.sent.wizard.startFromScratch': 'Start from scratch',
  'pages.notifications.sent.wizard.useTemplate': 'Use template',
  'pages.notifications.sent.wizard.template': 'Template',
  'pages.notifications.sent.wizard.templateRequired': 'Template is required',
  'pages.notifications.sent.wizard.templateSearch': 'Search template',
  'pages.notifications.sent.wizard.recipients': 'Recipients',
  'pages.notifications.sent.wizard.recipientsRequired':
    'Recipients are required',
  'pages.notifications.sent.wizard.searchRecipients': 'Search recipients',
  'pages.notifications.sent.wizard.createRecipient': 'Create new',
  'pages.notifications.sent.wizard.atLeastOneMethod':
    'At least one delivery method should be selected',
  'pages.notifications.sent.wizard.deliveryMethodNotConfigured':
    'Delivery method is not configured. Contact your system administrator.',
  'pages.notifications.sent.wizard.refreshDeliveryMethods':
    'Refresh available delivery methods',
  'pages.notifications.sent.wizard.webAlwaysOn':
    'Web notifications are always delivered to the notification bell.',
  'pages.notifications.sent.wizard.scheduleLater': 'Schedule for later',
  'pages.notifications.sent.wizard.scheduleTime': 'Time',
  'pages.notifications.sent.wizard.scheduleTimeRequired': 'Time is required',
  'pages.notifications.sent.wizard.scheduleTimezone': 'Timezone',
  'pages.notifications.sent.wizard.scheduleTimezoneRequired':
    'Timezone is required',
  'pages.notifications.sent.wizard.scheduleRangeHint':
    'Pick a time between now and 7 days ahead.',
  'pages.notifications.sent.wizard.reviewTotalRecipients':
    '{count, plural, =1 {1 recipient} other {# recipients}}',
  'pages.notifications.sent.wizard.previewFailed':
    'Failed to build the preview',
  'pages.notifications.sent.wizard.composeIncomplete':
    'Complete every enabled message before continuing.',
  'pages.notifications.sent.wizard.webPreview': 'Web notification preview',
  'pages.notifications.sent.wizard.mobileAppPreview':
    'Mobile app notification preview',
  'pages.notifications.sent.wizard.smsPreview': 'SMS notification preview',
  'pages.notifications.sent.wizard.emailPreview': 'Email notification preview',
  'pages.notifications.sent.wizard.slackPreview': 'Slack notification preview',
  'pages.notifications.sent.wizard.microsoftTeamsPreview':
    'Microsoft Teams notification preview',
  'pages.notifications.sent.wizard.toastSent': 'Notification request sent.',

  // ---- shared message editor (components/notifications/template-configuration)
  // Kept under this namespace per the wave-3-B brief; wave 3-C reuses it.
  'pages.notifications.sent.templateConfig.customizeMessages':
    'Customize messages',
  'pages.notifications.sent.templateConfig.templatizationHint':
    'Input fields support templatization.',
  'pages.notifications.sent.templateConfig.seeDocumentation':
    'See documentation',
  'pages.notifications.sent.templateConfig.helpTitle':
    'Templatization parameters — {type}',
  'pages.notifications.sent.templateConfig.helpClose': 'Close',
  'pages.notifications.sent.templateConfig.commonParamsTitle':
    'Parameters available for every type',
  'pages.notifications.sent.templateConfig.modifiersTitle': 'Value modifiers',
  'pages.notifications.sent.templateConfig.modifiersHint':
    'Parameter values support the upperCase / lowerCase / capitalize suffixes — append one to the parameter name:',
  'pages.notifications.sent.templateConfig.subject': 'Subject',
  'pages.notifications.sent.templateConfig.subjectRequired':
    'Subject is required',
  'pages.notifications.sent.templateConfig.subjectMaxLength':
    'Subject should be less than or equal to {length} characters',
  'pages.notifications.sent.templateConfig.message': 'Message',
  'pages.notifications.sent.templateConfig.messageRequired':
    'Message is required',
  'pages.notifications.sent.templateConfig.messageMaxLength':
    'Message should be less than or equal to {length} characters',
  'pages.notifications.sent.templateConfig.emailBodyHtmlHint':
    'Email body is HTML. Edit the HTML source (WYSIWYG composer is not available in this fork).',
  'pages.notifications.sent.templateConfig.icon': 'Icon',
  'pages.notifications.sent.templateConfig.iconColor': 'Icon color',
  'pages.notifications.sent.templateConfig.themeColor': 'Theme color',
  'pages.notifications.sent.templateConfig.actionButton': 'Action button',
  'pages.notifications.sent.templateConfig.notificationTapAction':
    'Notification tap action',
  'pages.notifications.sent.templateConfig.notificationTapActionHint':
    'If not enabled, the default alarm dashboard will be used',
  'pages.notifications.sent.templateConfig.buttonText': 'Button text',
  'pages.notifications.sent.templateConfig.buttonTextRequired':
    'Button text is required',
  'pages.notifications.sent.templateConfig.buttonTextMaxLength':
    'Button text should be less than or equal to {length} characters',
  'pages.notifications.sent.templateConfig.actionType': 'Action type',
  'pages.notifications.sent.templateConfig.linkTypeLink': 'Open URL link',
  'pages.notifications.sent.templateConfig.linkTypeDashboard': 'Open dashboard',
  'pages.notifications.sent.templateConfig.link': 'Link',
  'pages.notifications.sent.templateConfig.linkRequired': 'Link is required',
  'pages.notifications.sent.templateConfig.linkMaxLength':
    'Link should be less than or equal to {length} characters',
  'pages.notifications.sent.templateConfig.dashboard': 'Dashboard',
  'pages.notifications.sent.templateConfig.dashboardRequired':
    'Dashboard is required',
  'pages.notifications.sent.templateConfig.searchDashboards':
    'Search dashboard',
  'pages.notifications.sent.templateConfig.dashboardState': 'Dashboard state',
  'pages.notifications.sent.templateConfig.setEntityFromNotification':
    'Set entity from notification to dashboard state',
  'pages.notifications.sent.templateConfig.buttonInvalid':
    'The action button configuration is incomplete',

  // Notification type display names (help dialog title + wizard reuse).
  'pages.notifications.sent.templateConfig.type.general': 'General',
  'pages.notifications.sent.templateConfig.type.alarm': 'Alarm',
  'pages.notifications.sent.templateConfig.type.deviceActivity':
    'Device activity',
  'pages.notifications.sent.templateConfig.type.entityAction': 'Entity action',
  'pages.notifications.sent.templateConfig.type.alarmComment': 'Alarm comment',
  'pages.notifications.sent.templateConfig.type.alarmAssignment':
    'Alarm assignment',
  'pages.notifications.sent.templateConfig.type.ruleEngineLifecycleEvent':
    'Rule engine lifecycle event',
  'pages.notifications.sent.templateConfig.type.entitiesLimit':
    'Entities limit',
  'pages.notifications.sent.templateConfig.type.entitiesLimitIncreaseRequest':
    'Entities limit increase request',
  'pages.notifications.sent.templateConfig.type.apiUsageLimit':
    'API usage limit',
  'pages.notifications.sent.templateConfig.type.newPlatformVersion':
    'New platform version',
  'pages.notifications.sent.templateConfig.type.ruleNode': 'Rule node',
  'pages.notifications.sent.templateConfig.type.rateLimits':
    'Exceeded rate limits',
  'pages.notifications.sent.templateConfig.type.edgeConnection':
    'Edge connection',
  'pages.notifications.sent.templateConfig.type.edgeCommunicationFailure':
    'Edge communication failure',
  'pages.notifications.sent.templateConfig.type.taskProcessingFailure':
    'Task processing failure',
  'pages.notifications.sent.templateConfig.type.resourcesShortage':
    'Resources shortage',
} as const;
