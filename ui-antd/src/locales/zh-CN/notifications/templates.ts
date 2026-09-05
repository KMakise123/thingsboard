/** notification templates keys (zh-CN side) — key-for-key identical with the other locale. */
export default {
  // ---- list page -----------------------------------------------------------
  'pages.notifications.templates.search': '搜索模板',
  'pages.notifications.templates.refresh': '刷新',
  'pages.notifications.templates.createdTime': '创建时间',
  'pages.notifications.templates.notificationType': '类型',
  'pages.notifications.templates.name': '模板',
  'pages.notifications.templates.total': '共 {count} 条',
  'pages.notifications.templates.empty': '暂无模板',
  'pages.notifications.templates.loadFailed': '模板加载失败',
  'pages.notifications.templates.add': '新建模板',
  'pages.notifications.templates.copy': '复制模板',
  'pages.notifications.templates.delete': '删除',
  'pages.notifications.templates.cancel': '取消',
  'pages.notifications.templates.selectedCount': '已选 {count} 条',
  'pages.notifications.templates.batchDelete': '删除所选',
  'pages.notifications.templates.deleteOneTitle':
    '确定要删除通知模板“{name}”吗？',
  'pages.notifications.templates.deleteOneText':
    '请注意，确认后该模板将无法恢复。',
  'pages.notifications.templates.deleteManyTitle':
    '确定要删除 {count, plural, =1 {1 个模板} other {# 个模板}} 吗？',
  'pages.notifications.templates.deleteManyText':
    '请注意，确认后模板将无法恢复。',
  'pages.notifications.templates.toastDeleted': '模板已删除。',
  'pages.notifications.templates.batchResult': '{ok} 个成功，{fail} 个失败。',

  // ---- notification type display names (mirror of the inbox set) -----------
  'pages.notifications.templates.type.GENERAL': '通用',
  'pages.notifications.templates.type.ALARM': '告警',
  'pages.notifications.templates.type.DEVICE_ACTIVITY': '设备活跃',
  'pages.notifications.templates.type.ENTITY_ACTION': '实体操作',
  'pages.notifications.templates.type.ALARM_COMMENT': '告警评论',
  'pages.notifications.templates.type.ALARM_ASSIGNMENT': '告警分配',
  'pages.notifications.templates.type.RULE_ENGINE_COMPONENT_LIFECYCLE_EVENT':
    '规则引擎生命周期事件',
  'pages.notifications.templates.type.ENTITIES_LIMIT': '实体限制',
  'pages.notifications.templates.type.ENTITIES_LIMIT_INCREASE_REQUEST':
    '实体限制提升请求',
  'pages.notifications.templates.type.API_USAGE_LIMIT': 'API 使用限制',
  'pages.notifications.templates.type.NEW_PLATFORM_VERSION': '新平台版本',
  'pages.notifications.templates.type.RULE_NODE': '规则节点',
  'pages.notifications.templates.type.RATE_LIMITS': '超出速率限制',
  'pages.notifications.templates.type.EDGE_CONNECTION': 'Edge 连接',
  'pages.notifications.templates.type.EDGE_COMMUNICATION_FAILURE':
    'Edge 通信故障',
  'pages.notifications.templates.type.TASK_PROCESSING_FAILURE': '任务处理失败',
  'pages.notifications.templates.type.RESOURCES_SHORTAGE': '资源不足',

  // ---- wizard --------------------------------------------------------------
  'pages.notifications.templates.wizard.addTitle': '新建通知模板',
  'pages.notifications.templates.wizard.editTitle': '编辑通知模板',
  'pages.notifications.templates.wizard.stepSetup': '设置',
  'pages.notifications.templates.wizard.stepCompose': '编写',
  'pages.notifications.templates.wizard.name': '名称',
  'pages.notifications.templates.wizard.nameRequired': '名称为必填项',
  'pages.notifications.templates.wizard.notificationType': '类型',
  'pages.notifications.templates.wizard.deliveryMethods': '发送方式',
  'pages.notifications.templates.wizard.atLeastOne': '至少需要选择一种发送方式',
  'pages.notifications.templates.wizard.back': '上一步',
  'pages.notifications.templates.wizard.next': '下一步',
  'pages.notifications.templates.wizard.save': '保存',
  'pages.notifications.templates.wizard.add': '新建',
  'pages.notifications.templates.wizard.composeIncomplete':
    '请先补全所有已启用方式的消息内容。',
  'pages.notifications.templates.wizard.toastSaved': '模板已保存。',
} as const;
