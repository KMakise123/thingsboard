/** Notification rules keys (zh-CN side) — key-for-key identical with the other locale. */
export default {
  // ------------------------------------------------------------------ list
  'pages.notifications.rules.search': '搜索规则',
  'pages.notifications.rules.refresh': '刷新',
  'pages.notifications.rules.selectedCount': '已选 {count} 项',
  'pages.notifications.rules.batchDelete': '删除所选',
  'pages.notifications.rules.add': '新建规则',
  'pages.notifications.rules.createdTime': '创建时间',
  'pages.notifications.rules.name': '名称',
  'pages.notifications.rules.templateName': '模板',
  'pages.notifications.rules.triggerType': '触发器',
  'pages.notifications.rules.description': '描述',
  'pages.notifications.rules.total': '共 {count} 条',
  'pages.notifications.rules.empty': '暂无通知规则',
  'pages.notifications.rules.loadFailed': '通知规则加载失败',
  'pages.notifications.rules.delete': '删除',
  'pages.notifications.rules.deleteOneTitle': '删除通知规则“{name}”？',
  'pages.notifications.rules.deleteOneText':
    '注意：确认后该通知规则将无法恢复。',
  'pages.notifications.rules.deleteManyTitle': '删除 {count} 条通知规则？',
  'pages.notifications.rules.deleteManyText': '此操作无法撤销。',
  'pages.notifications.rules.cancel': '取消',
  'pages.notifications.rules.toastDeleted': '通知规则已删除。',
  'pages.notifications.rules.batchResult': '成功 {ok} 个，失败 {fail} 个。',
  'pages.notifications.rules.enableRule': '启用规则',
  'pages.notifications.rules.disableRule': '停用规则',
  'pages.notifications.rules.toggleFailed': '规则更新失败',
  'pages.notifications.rules.copyRule': '复制规则',

  // ---------------------------------------------------------------- wizard
  'pages.notifications.rules.wizard.addTitle': '新建通知规则',
  'pages.notifications.rules.wizard.editTitle': '编辑通知规则',
  'pages.notifications.rules.wizard.stepBasic': '基本设置',
  'pages.notifications.rules.wizard.stepTrigger': '触发器设置',
  'pages.notifications.rules.wizard.name': '名称',
  'pages.notifications.rules.wizard.nameRequired': '名称必填',
  'pages.notifications.rules.wizard.enabled': '启用规则',
  'pages.notifications.rules.wizard.triggerType': '触发器',
  'pages.notifications.rules.wizard.template': '模板',
  'pages.notifications.rules.wizard.templateRequired': '请选择模板',
  'pages.notifications.rules.wizard.searchTemplate': '搜索模板',
  'pages.notifications.rules.wizard.recipients': '接收人',
  'pages.notifications.rules.wizard.recipientsRequired': '请选择接收人',
  'pages.notifications.rules.wizard.searchTargets': '搜索接收人',
  'pages.notifications.rules.wizard.createRecipient': '新建接收人',
  'pages.notifications.rules.wizard.escalationChain': '升级链',
  'pages.notifications.rules.wizard.escalationsRequired':
    '每个阶段都需要接收人；间隔需在 1 分钟到 7 天之间。',
  'pages.notifications.rules.wizard.next': '下一步',
  'pages.notifications.rules.wizard.back': '上一步',
  'pages.notifications.rules.wizard.add': '添加',
  'pages.notifications.rules.wizard.save': '保存',
  'pages.notifications.rules.wizard.toastSaved': '规则已保存。',

  // ------------------------------------------------------ escalation chain
  'pages.notifications.rules.escalation.firstRecipient':
    '首级接收人（立即通知）',
  'pages.notifications.rules.escalation.after': '在此之后',
  'pages.notifications.rules.escalation.notify': '通知',
  'pages.notifications.rules.escalation.addStage': '添加阶段',
  'pages.notifications.rules.escalation.remove': '移除',
  'pages.notifications.rules.escalation.stageInvalid':
    '每个阶段都需要接收人；间隔需在 1 分钟到 7 天之间。',
  'pages.notifications.rules.escalation.searchTargets': '搜索接收人',
  'pages.notifications.rules.escalation.unit.minutes': '分钟',
  'pages.notifications.rules.escalation.unit.hours': '小时',
  'pages.notifications.rules.escalation.unit.days': '天',
  'pages.notifications.rules.createNew': '新建接收人',

  // --------------------------------------------------------- trigger names
  'pages.notifications.rules.trigger.ENTITY_ACTION': '实体动作',
  'pages.notifications.rules.trigger.ALARM': '告警',
  'pages.notifications.rules.trigger.ALARM_COMMENT': '告警评论',
  'pages.notifications.rules.trigger.ALARM_ASSIGNMENT': '告警分配',
  'pages.notifications.rules.trigger.DEVICE_ACTIVITY': '设备活动',
  'pages.notifications.rules.trigger.RULE_ENGINE_COMPONENT_LIFECYCLE_EVENT':
    '规则引擎组件生命周期事件',
  'pages.notifications.rules.trigger.EDGE_CONNECTION': '边缘连接',
  'pages.notifications.rules.trigger.EDGE_COMMUNICATION_FAILURE':
    '边缘通信失败',
  'pages.notifications.rules.trigger.NEW_PLATFORM_VERSION': '新平台版本',
  'pages.notifications.rules.trigger.ENTITIES_LIMIT': '实体数量上限',
  'pages.notifications.rules.trigger.API_USAGE_LIMIT': 'API 使用上限',
  'pages.notifications.rules.trigger.RATE_LIMITS': '速率限制',
  'pages.notifications.rules.trigger.TASK_PROCESSING_FAILURE': '任务处理失败',
  'pages.notifications.rules.trigger.RESOURCES_SHORTAGE': '资源短缺',

  // -------------------------------------------------------- trigger fields
  'pages.notifications.rules.triggerForm.filter': '过滤器',
  'pages.notifications.rules.triggerForm.alarmTypeList': '告警类型列表',
  'pages.notifications.rules.triggerForm.anyType': '任意类型',
  'pages.notifications.rules.triggerForm.alarmSeverityList': '告警严重级别列表',
  'pages.notifications.rules.triggerForm.anySeverity': '任意严重级别',
  'pages.notifications.rules.triggerForm.alarmStatusList': '告警状态列表',
  'pages.notifications.rules.triggerForm.anyStatus': '任意状态',
  'pages.notifications.rules.triggerForm.notifyOn': '通知时机',
  'pages.notifications.rules.triggerForm.notifyOnRequired': '请选择通知时机',
  'pages.notifications.rules.triggerForm.clearRuleStatuses':
    '当告警状态变为以下状态时停止升级',
  'pages.notifications.rules.triggerForm.clearRuleHint':
    '升级链多于一个阶段时才可设置',
  'pages.notifications.rules.triggerForm.description': '描述',
  'pages.notifications.rules.triggerForm.allEvents': '所有事件',
  'pages.notifications.rules.triggerForm.searchEntities': '搜索实体',
  'pages.notifications.rules.triggerForm.devices': '设备',
  'pages.notifications.rules.triggerForm.deviceProfiles': '设备配置档',
  'pages.notifications.rules.triggerForm.deviceListHint':
    '仅为列表中的设备生成通知；留空表示所有设备',
  'pages.notifications.rules.triggerForm.deviceProfilesHint':
    '仅为列表中的配置档生成通知；留空表示所有配置档',
  'pages.notifications.rules.triggerForm.entityTypes': '实体类型',
  'pages.notifications.rules.triggerForm.entityTypesRequired': '请选择实体类型',
  'pages.notifications.rules.triggerForm.status': '状态',
  'pages.notifications.rules.triggerForm.created': '创建',
  'pages.notifications.rules.triggerForm.updated': '更新',
  'pages.notifications.rules.triggerForm.deleted': '删除',
  'pages.notifications.rules.triggerForm.onlyUserComments': '仅用户评论时通知',
  'pages.notifications.rules.triggerForm.notifyOnCommentUpdate':
    '评论更新时通知',
  'pages.notifications.rules.triggerForm.ruleEngineFilter': '规则链过滤',
  'pages.notifications.rules.triggerForm.ruleChains': '规则链',
  'pages.notifications.rules.triggerForm.ruleChainsHint':
    '仅为列表中的规则链生成通知；留空表示所有规则链',
  'pages.notifications.rules.triggerForm.ruleChainEvents': '规则链事件',
  'pages.notifications.rules.triggerForm.onlyRuleChainLifecycleFailures':
    '仅规则链生命周期失败',
  'pages.notifications.rules.triggerForm.ruleNodeFilter': '规则节点过滤',
  'pages.notifications.rules.triggerForm.trackRuleNodeEvents':
    '跟踪规则节点事件',
  'pages.notifications.rules.triggerForm.ruleNodeEvents': '规则节点事件',
  'pages.notifications.rules.triggerForm.onlyRuleNodeLifecycleFailures':
    '仅规则节点生命周期失败',
  'pages.notifications.rules.triggerForm.edgeInstances': '边缘实例',
  'pages.notifications.rules.triggerForm.edgeListHint':
    '仅为列表中的边缘实例生成通知；留空表示所有边缘实例',
  'pages.notifications.rules.triggerForm.threshold': '阈值',
  'pages.notifications.rules.triggerForm.apiFeatures': 'API 功能',
  'pages.notifications.rules.triggerForm.apiFeaturesHint':
    '留空表示匹配所有 API 功能',
  'pages.notifications.rules.triggerForm.rateLimits': '速率限制',
  'pages.notifications.rules.triggerForm.rateLimitsHint': '预定义限流 API',
  'pages.notifications.rules.triggerForm.cpuThreshold': 'CPU 阈值',
  'pages.notifications.rules.triggerForm.ramThreshold': '内存阈值',
  'pages.notifications.rules.triggerForm.storageThreshold': '存储阈值',
  'pages.notifications.rules.triggerForm.noConfig': '此触发器没有额外配置项',

  // ------------------------------------------------------- value labels
  'pages.notifications.rules.severity.CRITICAL': '严重',
  'pages.notifications.rules.severity.MAJOR': '重要',
  'pages.notifications.rules.severity.MINOR': '次要',
  'pages.notifications.rules.severity.WARNING': '警告',
  'pages.notifications.rules.severity.INDETERMINATE': '不确定',
  'pages.notifications.rules.status.ACTIVE': '活跃',
  'pages.notifications.rules.status.CLEARED': '已清除',
  'pages.notifications.rules.status.ACK': '已确认',
  'pages.notifications.rules.status.UNACK': '未确认',
  'pages.notifications.rules.alarmAction.CREATED': '已创建',
  'pages.notifications.rules.alarmAction.SEVERITY_CHANGED': '严重级别变更',
  'pages.notifications.rules.alarmAction.ACKNOWLEDGED': '已确认',
  'pages.notifications.rules.alarmAction.CLEARED': '已清除',
  'pages.notifications.rules.assignmentAction.ASSIGNED': '已分配',
  'pages.notifications.rules.assignmentAction.UNASSIGNED': '已取消分配',
  'pages.notifications.rules.deviceEvent.ACTIVE': '在线',
  'pages.notifications.rules.deviceEvent.INACTIVE': '离线',
  'pages.notifications.rules.lifecycleEvent.STARTED': '已启动',
  'pages.notifications.rules.lifecycleEvent.UPDATED': '已更新',
  'pages.notifications.rules.lifecycleEvent.STOPPED': '已停止',
  'pages.notifications.rules.edgeEvent.CONNECTED': '已连接',
  'pages.notifications.rules.edgeEvent.DISCONNECTED': '已断开',
  'pages.notifications.rules.apiFeature.TRANSPORT': '传输',
  'pages.notifications.rules.apiFeature.DB': '数据库',
  'pages.notifications.rules.apiFeature.RE': '规则引擎',
  'pages.notifications.rules.apiFeature.JS': 'JS 脚本',
  'pages.notifications.rules.apiFeature.TBEL': 'TBEL 脚本',
  'pages.notifications.rules.apiFeature.EMAIL': '邮件',
  'pages.notifications.rules.apiFeature.SMS': '短信',
  'pages.notifications.rules.apiFeature.ALARM': '告警',
  'pages.notifications.rules.apiState.ENABLED': '已启用',
  'pages.notifications.rules.apiState.WARNING': '警告',
  'pages.notifications.rules.apiState.DISABLED': '已禁用',
  'pages.notifications.rules.limitedApi.ENTITY_EXPORT': '实体导出',
  'pages.notifications.rules.limitedApi.ENTITY_IMPORT': '实体导入',
  'pages.notifications.rules.limitedApi.NOTIFICATION_REQUESTS': '通知请求',
  'pages.notifications.rules.limitedApi.NOTIFICATION_REQUESTS_PER_RULE':
    '每条规则的通知请求',
  'pages.notifications.rules.limitedApi.REST_REQUESTS_PER_TENANT':
    '每租户 REST 请求',
  'pages.notifications.rules.limitedApi.REST_REQUESTS_PER_CUSTOMER':
    '每客户 REST 请求',
  'pages.notifications.rules.limitedApi.WS_UPDATES_PER_SESSION':
    '每会话 WS 推送',
  'pages.notifications.rules.limitedApi.CASSANDRA_WRITE_QUERIES_CORE':
    'Cassandra 写查询（核心）',
  'pages.notifications.rules.limitedApi.CASSANDRA_READ_QUERIES_CORE':
    'Cassandra 读查询（核心）',
  'pages.notifications.rules.limitedApi.CASSANDRA_WRITE_QUERIES_RULE_ENGINE':
    'Cassandra 写查询（规则引擎）',
  'pages.notifications.rules.limitedApi.CASSANDRA_READ_QUERIES_RULE_ENGINE':
    'Cassandra 读查询（规则引擎）',
  'pages.notifications.rules.limitedApi.CASSANDRA_READ_QUERIES_MONOLITH':
    'Cassandra 读查询（单体）',
  'pages.notifications.rules.limitedApi.CASSANDRA_WRITE_QUERIES_MONOLITH':
    'Cassandra 写查询（单体）',
  'pages.notifications.rules.limitedApi.CASSANDRA_QUERIES': 'Cassandra 查询',
  'pages.notifications.rules.limitedApi.EDGE_EVENTS': '边缘事件',
  'pages.notifications.rules.limitedApi.EDGE_EVENTS_PER_EDGE':
    '每边缘实例边缘事件',
  'pages.notifications.rules.limitedApi.EDGE_UPLINK_MESSAGES': '边缘上行消息',
  'pages.notifications.rules.limitedApi.EDGE_UPLINK_MESSAGES_PER_EDGE':
    '每边缘实例上行消息',
  'pages.notifications.rules.limitedApi.PASSWORD_RESET': '密码重置',
  'pages.notifications.rules.limitedApi.TWO_FA_VERIFICATION_CODE_SEND':
    '双因素验证码发送',
  'pages.notifications.rules.limitedApi.TWO_FA_VERIFICATION_CODE_CHECK':
    '双因素验证码校验',
  'pages.notifications.rules.limitedApi.TRANSPORT_MESSAGES_PER_TENANT':
    '每租户传输消息',
  'pages.notifications.rules.limitedApi.TRANSPORT_MESSAGES_PER_DEVICE':
    '每设备传输消息',
  'pages.notifications.rules.limitedApi.TRANSPORT_MESSAGES_PER_GATEWAY':
    '每网关传输消息',
  'pages.notifications.rules.limitedApi.TRANSPORT_MESSAGES_PER_GATEWAY_DEVICE':
    '每网关设备传输消息',
  'pages.notifications.rules.limitedApi.EMAILS': '邮件',
  'pages.notifications.rules.limitedApi.WS_SUBSCRIPTIONS': 'WS 订阅',
  'pages.notifications.rules.limitedApi.CALCULATED_FIELD_DEBUG_EVENTS':
    '计算字段调试事件',

  // ----------------------------------------------------- entity type names
  'pages.notifications.rules.entityType.TENANT': '租户',
  'pages.notifications.rules.entityType.CUSTOMER': '客户',
  'pages.notifications.rules.entityType.USER': '用户',
  'pages.notifications.rules.entityType.DASHBOARD': '仪表盘',
  'pages.notifications.rules.entityType.ASSET': '资产',
  'pages.notifications.rules.entityType.DEVICE': '设备',
  'pages.notifications.rules.entityType.DEVICE_PROFILE': '设备配置档',
  'pages.notifications.rules.entityType.ASSET_PROFILE': '资产配置档',
  'pages.notifications.rules.entityType.ALARM': '告警',
  'pages.notifications.rules.entityType.RULE_CHAIN': '规则链',
  'pages.notifications.rules.entityType.RULE_NODE': '规则节点',
  'pages.notifications.rules.entityType.EDGE': '边缘实例',
  'pages.notifications.rules.entityType.ENTITY_VIEW': '实体视图',
  'pages.notifications.rules.entityType.WIDGETS_BUNDLE': '部件包',
  'pages.notifications.rules.entityType.TB_RESOURCE': '资源文件',
  'pages.notifications.rules.entityType.OTA_PACKAGE': 'OTA 包',
  'pages.notifications.rules.entityType.QUEUE_STATS': '队列统计',
  'pages.notifications.rules.entityType.NOTIFICATION_RULE': '通知规则',
  'pages.notifications.rules.entityType.NOTIFICATION_TARGET': '通知目标',
  'pages.notifications.rules.entityType.NOTIFICATION_TEMPLATE': '通知模板',
  'pages.notifications.rules.entityType.OAUTH2_CLIENT': 'OAuth 2 客户端',
  'pages.notifications.rules.entityType.DOMAIN': '域名',
  'pages.notifications.rules.entityType.MOBILE_APP': '移动应用',
  'pages.notifications.rules.entityType.MOBILE_APP_BUNDLE': '移动应用包',
  'pages.notifications.rules.entityType.CALCULATED_FIELD': '计算字段',
  'pages.notifications.rules.entityType.AI_MODEL': 'AI 模型',
  'pages.notifications.rules.entityType.API_KEY': 'API 密钥',
} as const;
