/** Notification recipients keys (zh-CN side) — key-for-key identical with the other locale. */
export default {
  // list page
  'pages.notifications.recipients.search': '搜索接收人',
  'pages.notifications.recipients.refresh': '刷新',
  'pages.notifications.recipients.selectedCount': '已选 {count} 项',
  'pages.notifications.recipients.batchDelete': '删除所选',
  'pages.notifications.recipients.add': '新建接收人',
  'pages.notifications.recipients.edit': '编辑接收人',
  'pages.notifications.recipients.createdTime': '创建时间',
  'pages.notifications.recipients.name': '名称',
  'pages.notifications.recipients.type': '类型',
  'pages.notifications.recipients.description': '描述',
  'pages.notifications.recipients.total': '共 {count} 条',
  'pages.notifications.recipients.empty': '暂无接收人',
  'pages.notifications.recipients.loadFailed': '接收人加载失败',
  'pages.notifications.recipients.delete': '删除',
  'pages.notifications.recipients.deleteOneTitle': '删除接收人“{name}”？',
  'pages.notifications.recipients.deleteOneText':
    '注意：确认后该接收人将无法恢复。',
  'pages.notifications.recipients.deleteManyTitle': '删除 {count} 个接收人？',
  'pages.notifications.recipients.deleteManyText': '此操作无法撤销。',
  'pages.notifications.recipients.cancel': '取消',
  'pages.notifications.recipients.save': '保存',
  'pages.notifications.recipients.toastSaved': '接收人已保存。',
  'pages.notifications.recipients.toastDeleted': '接收人已删除。',
  'pages.notifications.recipients.batchResult':
    '成功 {ok} 个，失败 {fail} 个。',

  // dialog: common
  'pages.notifications.recipients.nameRequired': '名称必填',
  'pages.notifications.recipients.fieldType': '类型',
  'pages.notifications.recipients.targetType.platformUsers': '平台用户',
  'pages.notifications.recipients.targetType.slack': 'Slack',
  'pages.notifications.recipients.targetType.microsoftTeams': 'Microsoft Teams',

  // dialog: PLATFORM_USERS filters
  'pages.notifications.recipients.fieldUsersFilter': '用户过滤器',
  'pages.notifications.recipients.usersFilter.allUsers': '所有用户',
  'pages.notifications.recipients.usersFilter.tenantAdministrators':
    '租户管理员',
  'pages.notifications.recipients.usersFilter.customerUsers': '客户用户',
  'pages.notifications.recipients.usersFilter.userList': '用户列表',
  'pages.notifications.recipients.usersFilter.originatorEntityOwnerUsers':
    '实体所有者的用户',
  'pages.notifications.recipients.usersFilter.affectedUser': '受影响的用户',
  'pages.notifications.recipients.usersFilter.systemAdministrators':
    '系统管理员',
  'pages.notifications.recipients.usersFilter.affectedTenantAdministrators':
    '受影响的租户管理员',
  'pages.notifications.recipients.filterByTenants.tenants': '按租户',
  'pages.notifications.recipients.filterByTenants.tenantProfiles':
    '按租户配置档',
  'pages.notifications.recipients.fieldTenants': '租户',
  'pages.notifications.recipients.tenantsHint': '留空时覆盖所有租户',
  'pages.notifications.recipients.fieldTenantProfiles': '租户配置档',
  'pages.notifications.recipients.tenantProfilesHint':
    '留空时覆盖所有租户配置档',
  'pages.notifications.recipients.fieldCustomer': '客户',
  'pages.notifications.recipients.customerRequired': '请选择客户',
  'pages.notifications.recipients.fieldUsers': '用户',
  'pages.notifications.recipients.usersRequired': '请选择用户',
  'pages.notifications.recipients.searchTenants': '搜索租户',
  'pages.notifications.recipients.searchTenantProfiles': '搜索租户配置档',
  'pages.notifications.recipients.searchCustomers': '搜索客户',
  'pages.notifications.recipients.searchUsers': '搜索用户',

  // dialog: SLACK
  'pages.notifications.recipients.slackChannelType': 'Slack 会话类型',
  'pages.notifications.recipients.slackType.publicChannel': '公开频道',
  'pages.notifications.recipients.slackType.privateChannel': '私有频道',
  'pages.notifications.recipients.slackType.direct': '私聊',
  'pages.notifications.recipients.fieldConversation': '会话',
  'pages.notifications.recipients.conversationRequired': '请选择会话',
  'pages.notifications.recipients.conversationUnavailable':
    '请从列表中选择会话。',
  'pages.notifications.recipients.searchConversations': '搜索会话',

  // dialog: MICROSOFT_TEAMS
  'pages.notifications.recipients.useOldApi': '使用旧版 API',
  'pages.notifications.recipients.useNewApi': '使用新版 Workflows API',
  'pages.notifications.recipients.deprecatedNotice':
    'Office 365 连接器已停用，建议改用 Workflows API',
  'pages.notifications.recipients.webhookUrl': 'Webhook URL',
  'pages.notifications.recipients.workflowUrl': 'Workflow URL',
  'pages.notifications.recipients.webhookUrlRequired': '请输入 Webhook URL',
  'pages.notifications.recipients.workflowUrlRequired': '请输入 Workflow URL',
  'pages.notifications.recipients.fieldChannelName': '频道名称',
  'pages.notifications.recipients.channelNameRequired': '请输入频道名称',
} as const;
