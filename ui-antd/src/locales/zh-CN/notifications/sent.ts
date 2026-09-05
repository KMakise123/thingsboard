/**
 * Notification sent + send-wizard keys (zh-CN side) — key-for-key identical
 * with the other locale.
 *
 * NOTE: the shared message editor (`components/notifications/
 * template-configuration`) deliberately keeps its strings under the
 * `pages.notifications.sent.templateConfig.*` sub-namespace (per the M12
 * wave-3-B brief) even though the templates page (wave 3-C) reuses it.
 */
export default {
  // ---- list page -----------------------------------------------------------
  'pages.notifications.sent.send': '发送通知',
  'pages.notifications.sent.refresh': '刷新',
  'pages.notifications.sent.createdTime': '创建时间',
  'pages.notifications.sent.status': '状态',
  'pages.notifications.sent.deliveryMethods': '发送方式',
  'pages.notifications.sent.template': '模板',
  'pages.notifications.sent.total': '共 {count} 条',
  'pages.notifications.sent.empty': '暂无已发通知',
  'pages.notifications.sent.loadFailed': '已发通知加载失败',
  'pages.notifications.sent.selectedCount': '已选 {count} 条',
  'pages.notifications.sent.batchDelete': '删除所选',
  'pages.notifications.sent.delete': '删除',
  'pages.notifications.sent.cancel': '取消',
  'pages.notifications.sent.deleteOneTitle': '确定要删除该通知请求吗？',
  'pages.notifications.sent.deleteOneText': '请注意，确认后该请求将无法恢复。',
  'pages.notifications.sent.deleteManyTitle':
    '确定要删除 {count, plural, =1 {1 个请求} other {# 个请求}} 吗？',
  'pages.notifications.sent.deleteManyText': '请注意，确认后请求将无法恢复。',
  'pages.notifications.sent.toastDeleted': '通知请求已删除。',
  'pages.notifications.sent.batchResult': '{ok} 个成功，{fail} 个失败。',

  // ---- status / methods / fails --------------------------------------------
  'pages.notifications.sent.status.sent': '已发送',
  'pages.notifications.sent.status.processing': '处理中',
  'pages.notifications.sent.status.scheduled': '已计划',
  'pages.notifications.sent.fails':
    '{count, plural, =1 {1 次失败} other {# 次失败}} >',
  'pages.notifications.sent.deliveryMethod.web': 'Web',
  'pages.notifications.sent.deliveryMethod.email': 'Email',
  'pages.notifications.sent.deliveryMethod.sms': 'SMS',
  'pages.notifications.sent.deliveryMethod.slack': 'Slack',
  'pages.notifications.sent.deliveryMethod.microsoftTeams': 'Microsoft Teams',
  'pages.notifications.sent.deliveryMethod.mobileApp': '移动应用',
  'pages.notifications.sent.deliveryMethod.deliveryMethod': '发送方式',

  // ---- errors dialog ---------------------------------------------------------
  'pages.notifications.sent.errorDialog.title': '发送失败明细',
  'pages.notifications.sent.errorDialog.empty': '该请求没有记录到发送失败。',
  'pages.notifications.sent.errorDialog.loadFailed': '请求失败明细加载失败',

  // ---- wizard ---------------------------------------------------------------
  'pages.notifications.sent.wizard.newTitle': '新通知',
  'pages.notifications.sent.wizard.againTitle': '再次通知',
  'pages.notifications.sent.wizard.step.setup': '设置',
  'pages.notifications.sent.wizard.step.compose': '编写',
  'pages.notifications.sent.wizard.step.review': '审核',
  'pages.notifications.sent.wizard.back': '上一步',
  'pages.notifications.sent.wizard.next': '下一步',
  'pages.notifications.sent.wizard.send': '发送',
  'pages.notifications.sent.wizard.startFromScratch': '从头开始',
  'pages.notifications.sent.wizard.useTemplate': '使用模板',
  'pages.notifications.sent.wizard.template': '模板',
  'pages.notifications.sent.wizard.templateRequired': '模板为必填项',
  'pages.notifications.sent.wizard.templateSearch': '搜索模板',
  'pages.notifications.sent.wizard.recipients': '收件人',
  'pages.notifications.sent.wizard.recipientsRequired': '收件人为必填项',
  'pages.notifications.sent.wizard.searchRecipients': '搜索收件人',
  'pages.notifications.sent.wizard.createRecipient': '新建',
  'pages.notifications.sent.wizard.atLeastOneMethod':
    '至少需要选择一种发送方式',
  'pages.notifications.sent.wizard.deliveryMethodNotConfigured':
    '发送方式未配置。请联系系统管理员。',
  'pages.notifications.sent.wizard.refreshDeliveryMethods':
    '刷新可用的发送方式',
  'pages.notifications.sent.wizard.webAlwaysOn':
    'Web 通知始终会投递到站内通知铃铛。',
  'pages.notifications.sent.wizard.scheduleLater': '计划稍后发送',
  'pages.notifications.sent.wizard.scheduleTime': '时间',
  'pages.notifications.sent.wizard.scheduleTimeRequired': '时间为必填项',
  'pages.notifications.sent.wizard.scheduleTimezone': '时区',
  'pages.notifications.sent.wizard.scheduleTimezoneRequired': '时区为必填项',
  'pages.notifications.sent.wizard.scheduleRangeHint':
    '时间需介于当前时刻与 7 天后之间。',
  'pages.notifications.sent.wizard.reviewTotalRecipients':
    '{count, plural, =1 {1 个收件人} other {# 个收件人}}',
  'pages.notifications.sent.wizard.previewFailed': '预览生成失败',
  'pages.notifications.sent.wizard.composeIncomplete':
    '请先补全所有已启用方式的消息内容。',
  'pages.notifications.sent.wizard.webPreview': 'Web 通知预览',
  'pages.notifications.sent.wizard.mobileAppPreview': '移动应用通知预览',
  'pages.notifications.sent.wizard.smsPreview': 'SMS 通知预览',
  'pages.notifications.sent.wizard.emailPreview': 'Email 通知预览',
  'pages.notifications.sent.wizard.slackPreview': 'Slack 通知预览',
  'pages.notifications.sent.wizard.microsoftTeamsPreview':
    'Microsoft Teams 通知预览',
  'pages.notifications.sent.wizard.toastSent': '通知请求已发送。',

  // ---- shared message editor (components/notifications/template-configuration)
  // Kept under this namespace per the wave-3-B brief; wave 3-C reuses it.
  'pages.notifications.sent.templateConfig.customizeMessages': '自定义消息',
  'pages.notifications.sent.templateConfig.templatizationHint':
    '输入字段支持模板化。',
  'pages.notifications.sent.templateConfig.seeDocumentation': '查看文档',
  'pages.notifications.sent.templateConfig.helpTitle': '模板化参数 — {type}',
  'pages.notifications.sent.templateConfig.helpClose': '关闭',
  'pages.notifications.sent.templateConfig.commonParamsTitle':
    '所有类型可用的参数',
  'pages.notifications.sent.templateConfig.modifiersTitle': '取值修饰符',
  'pages.notifications.sent.templateConfig.modifiersHint':
    '参数值支持 upperCase / lowerCase / capitalize 后缀 — 直接附加在参数名后：',
  'pages.notifications.sent.templateConfig.subject': '主题',
  'pages.notifications.sent.templateConfig.subjectRequired': '主题为必填项',
  'pages.notifications.sent.templateConfig.subjectMaxLength':
    '主题长度不得超过 {length} 个字符',
  'pages.notifications.sent.templateConfig.message': '消息',
  'pages.notifications.sent.templateConfig.messageRequired': '消息为必填项',
  'pages.notifications.sent.templateConfig.messageMaxLength':
    '消息长度不得超过 {length} 个字符',
  'pages.notifications.sent.templateConfig.emailBodyHtmlHint':
    '邮件正文为 HTML，请直接编辑 HTML 源码（本 fork 暂无所见即所得编辑器）。',
  'pages.notifications.sent.templateConfig.icon': '图标',
  'pages.notifications.sent.templateConfig.iconColor': '图标颜色',
  'pages.notifications.sent.templateConfig.themeColor': '主题颜色',
  'pages.notifications.sent.templateConfig.actionButton': '操作按钮',
  'pages.notifications.sent.templateConfig.notificationTapAction':
    '通知点击操作',
  'pages.notifications.sent.templateConfig.notificationTapActionHint':
    '如果未启用，将使用默认告警仪表板',
  'pages.notifications.sent.templateConfig.buttonText': '按钮文本',
  'pages.notifications.sent.templateConfig.buttonTextRequired':
    '按钮文本为必填项',
  'pages.notifications.sent.templateConfig.buttonTextMaxLength':
    '按钮文本长度不得超过 {length} 个字符',
  'pages.notifications.sent.templateConfig.actionType': '操作类型',
  'pages.notifications.sent.templateConfig.linkTypeLink': '打开 URL 链接',
  'pages.notifications.sent.templateConfig.linkTypeDashboard': '打开仪表板',
  'pages.notifications.sent.templateConfig.link': '链接',
  'pages.notifications.sent.templateConfig.linkRequired': '链接为必填项',
  'pages.notifications.sent.templateConfig.linkMaxLength':
    '链接长度不得超过 {length} 个字符',
  'pages.notifications.sent.templateConfig.dashboard': '仪表板',
  'pages.notifications.sent.templateConfig.dashboardRequired': '仪表板为必填项',
  'pages.notifications.sent.templateConfig.searchDashboards': '搜索仪表板',
  'pages.notifications.sent.templateConfig.dashboardState': '仪表板状态',
  'pages.notifications.sent.templateConfig.setEntityFromNotification':
    '将通知中的实体设置到仪表板状态',
  'pages.notifications.sent.templateConfig.buttonInvalid': '操作按钮配置不完整',

  // Notification type display names (help dialog title + wizard reuse).
  'pages.notifications.sent.templateConfig.type.general': '通用',
  'pages.notifications.sent.templateConfig.type.alarm': '告警',
  'pages.notifications.sent.templateConfig.type.deviceActivity': '设备活跃',
  'pages.notifications.sent.templateConfig.type.entityAction': '实体操作',
  'pages.notifications.sent.templateConfig.type.alarmComment': '告警评论',
  'pages.notifications.sent.templateConfig.type.alarmAssignment': '告警分配',
  'pages.notifications.sent.templateConfig.type.ruleEngineLifecycleEvent':
    '规则引擎生命周期事件',
  'pages.notifications.sent.templateConfig.type.entitiesLimit': '实体限制',
  'pages.notifications.sent.templateConfig.type.entitiesLimitIncreaseRequest':
    '实体限制提升请求',
  'pages.notifications.sent.templateConfig.type.apiUsageLimit': 'API 使用限制',
  'pages.notifications.sent.templateConfig.type.newPlatformVersion':
    '新平台版本',
  'pages.notifications.sent.templateConfig.type.ruleNode': '规则节点',
  'pages.notifications.sent.templateConfig.type.rateLimits': '超出速率限制',
  'pages.notifications.sent.templateConfig.type.edgeConnection': 'Edge 连接',
  'pages.notifications.sent.templateConfig.type.edgeCommunicationFailure':
    'Edge 通信故障',
  'pages.notifications.sent.templateConfig.type.taskProcessingFailure':
    '任务处理失败',
  'pages.notifications.sent.templateConfig.type.resourcesShortage': '资源不足',
} as const;
