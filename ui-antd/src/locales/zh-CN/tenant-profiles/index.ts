/**
 * zh-CN 租户配置域 keys（tenantProfiles 列表 / 详情）。措辞对齐 ui-ngx
 * locale.constant-zh_CN.json 的 tenant-profile.* 段。
 * Must stay key-for-key identical with en-US/tenant-profiles/index.ts.
 */
export default {
  // ---- 列表 ----
  'pages.tenantProfiles.list.search': '搜索租户配置',
  'pages.tenantProfiles.list.refresh': '刷新',
  'pages.tenantProfiles.list.add': '添加租户配置',
  'pages.tenantProfiles.list.total': '共 {count} 个',
  'pages.tenantProfiles.list.empty': '暂无租户配置',
  'pages.tenantProfiles.list.loadFailed': '加载租户配置列表失败',
  'pages.tenantProfiles.list.createdTime': '创建时间',
  'pages.tenantProfiles.list.name': '名称',
  'pages.tenantProfiles.list.description': '描述',
  'pages.tenantProfiles.list.default': '默认',
  'pages.tenantProfiles.list.selectedCount': '已选择 {count} 个',
  'pages.tenantProfiles.list.batchDelete': '删除选中项',
  'pages.tenantProfiles.list.batchResult': '{ok} 个成功，{fail} 个失败。',
  'pages.tenantProfiles.list.actionExport': '导出租户配置',
  'pages.tenantProfiles.list.actionSetDefault': '设为默认租户配置',
  'pages.tenantProfiles.list.actionDelete': '删除租户配置',
  'pages.tenantProfiles.list.deleteTitle': '确定要删除租户配置“{name}”吗？',
  'pages.tenantProfiles.list.deleteText':
    '请注意，确认后租户配置及所有相关数据将无法恢复。',
  'pages.tenantProfiles.list.deleteManyTitle':
    '确定要删除 {count, plural, =1 {1 个租户配置} other {# 个租户配置}}吗？',
  'pages.tenantProfiles.list.deleteManyText':
    '请注意，确认后所有选中的租户配置将被移除，且所有相关数据将无法恢复。',
  'pages.tenantProfiles.list.setDefaultTitle':
    '确定要将租户配置“{name}”设为默认吗？',
  'pages.tenantProfiles.list.setDefaultText':
    '确认后，该租户配置将被标记为默认配置，并用于未指定配置的新租户。',
  'pages.tenantProfiles.list.toastDeleted': '租户配置已删除。',
  'pages.tenantProfiles.list.toastDefaultSet': '默认租户配置已更新。',

  // ---- 详情页 ----
  'pages.tenantProfiles.detail.name': '名称',
  'pages.tenantProfiles.detail.nameRequired': '名称为必填项。',
  'pages.tenantProfiles.detail.nameMaxLength': '名称不能超过 255 个字符。',
  'pages.tenantProfiles.detail.isolatedTbRuleEngine':
    '使用隔离的 ThingsBoard 规则引擎队列',
  'pages.tenantProfiles.detail.queues': '队列',
  'pages.tenantProfiles.detail.profileConfiguration': '配置',
  'pages.tenantProfiles.detail.tabAttributes': '属性',
  'pages.tenantProfiles.detail.tabLatestTelemetry': '最新遥测',
  'pages.tenantProfiles.detail.tabAuditLogs': '审计日志',
  'pages.tenantProfiles.detail.toastSaved': '租户配置已保存。',
  'pages.tenantProfiles.detail.loadFailed': '加载租户配置失败',
  'pages.tenantProfiles.detail.actionSave': '保存',
  'pages.tenantProfiles.detail.editingHint':
    '编辑配置字段后保存；离开页面时会保护未保存的更改。',

  // ---- 配置表单分组与字段 ----
  'pages.tenantProfiles.config.unlimited': '（0 — 无限）',
  'pages.tenantProfiles.config.requiredMessage': '此字段为必填项。',
  'pages.tenantProfiles.config.rateLimitPattern':
    '格式为逗号分隔的容量和周期（秒）对，用冒号分隔，例如 100:1,2000:60',
  'pages.tenantProfiles.config.advancedSettings': '高级设置',
  'pages.tenantProfiles.config.smsEnabled': 'SMS 已启用',
  'pages.tenantProfiles.config.groupEntities': '实体',
  'pages.tenantProfiles.config.groupRuleEngine': '规则引擎',
  'pages.tenantProfiles.config.groupCalculatedFields': '计算字段',
  'pages.tenantProfiles.config.groupTtl': '生存时间',
  'pages.tenantProfiles.config.groupAlarmsNotifications': '告警和通知',
  'pages.tenantProfiles.config.groupDebug': '调试',
  'pages.tenantProfiles.config.groupFiles': '文件',
  'pages.tenantProfiles.config.groupWs': 'WS',
  'pages.tenantProfiles.config.groupRateLimits': '速率限制',
  'pages.tenantProfiles.config.maxDevices': '设备最大数量',
  'pages.tenantProfiles.config.maxDashboards': '仪表板最大数量',
  'pages.tenantProfiles.config.maxAssets': '资产最大数量',
  'pages.tenantProfiles.config.maxUsers': '用户最大数量',
  'pages.tenantProfiles.config.maxCustomers': '客户最大数量',
  'pages.tenantProfiles.config.maxRuleChains': '规则链最大数量',
  'pages.tenantProfiles.config.maxEdges': 'Edge 最大数量',
  'pages.tenantProfiles.config.maxREExecutions': '规则引擎执行最大次数',
  'pages.tenantProfiles.config.maxTransportMessages': '传输消息最大数量',
  'pages.tenantProfiles.config.maxJSExecutions': 'JavaScript 执行最大次数',
  'pages.tenantProfiles.config.maxTbelExecutions': 'TBEL 执行最大次数',
  'pages.tenantProfiles.config.maxRuleNodeExecutionsPerMessage':
    '每条消息的规则节点执行最大次数',
  'pages.tenantProfiles.config.maxTransportDataPoints': '传输数据点最大数量',
  'pages.tenantProfiles.config.maxCalculatedFields':
    '每个实体的计算字段最大数量',
  'pages.tenantProfiles.config.maxDataPointsPerRollingArg':
    '滚动参数中的最大数据点数量',
  'pages.tenantProfiles.config.maxArgumentsPerCF': '每个计算字段的最大参数数量',
  'pages.tenantProfiles.config.maxStateSize': '状态最大大小（KB）',
  'pages.tenantProfiles.config.maxValueArgumentSize':
    '单个值参数最大大小（KB）',
  'pages.tenantProfiles.config.maxRelatedLevelPerArgument':
    '“关联实体”参数的最大关联层级',
  'pages.tenantProfiles.config.minAllowedScheduledUpdateInterval':
    '“关联实体”参数的最小允许更新间隔（秒）',
  'pages.tenantProfiles.config.minAllowedAggregationInterval':
    '最小允许聚合间隔（秒）',
  'pages.tenantProfiles.config.minAllowedDeduplicationInterval':
    '最小允许去重间隔（秒）',
  'pages.tenantProfiles.config.intermediateAggregationInterval':
    '中间聚合间隔（秒）',
  'pages.tenantProfiles.config.reevaluationCheckInterval':
    '重新评估检查间隔（秒）',
  'pages.tenantProfiles.config.relationSearchEntityLimit': '关联搜索实体限制',
  'pages.tenantProfiles.config.maxDPStorageDays': '数据点存储最大天数',
  'pages.tenantProfiles.config.alarmsTtlDays': '告警 TTL 天数',
  'pages.tenantProfiles.config.defaultStorageTtlDays': '默认存储 TTL 天数',
  'pages.tenantProfiles.config.rpcTtlDays': 'RPC TTL 天数',
  'pages.tenantProfiles.config.queueStatsTtlDays': '队列统计 TTL 天数',
  'pages.tenantProfiles.config.ruleEngineExceptionsTtlDays':
    '规则引擎异常 TTL 天数',
  'pages.tenantProfiles.config.maxSms': 'SMS 发送最大数量',
  'pages.tenantProfiles.config.maxEmails': 'Email 发送最大数量',
  'pages.tenantProfiles.config.maxCreatedAlarms': '告警创建最大数量',
  'pages.tenantProfiles.config.alarmsReevaluationInterval':
    '告警重新评估间隔（秒）',
  'pages.tenantProfiles.config.maximumDebugDurationMin':
    '最大调试持续时间（分钟）',
  'pages.tenantProfiles.config.maxResourcesSumDataSize':
    '资源文件最大总大小（字节）',
  'pages.tenantProfiles.config.maxOtaPackagesSumDataSize':
    'OTA 软件包文件最大总大小（字节）',
  'pages.tenantProfiles.config.maxResourceSize': '单个资源文件最大大小（字节）',
  'pages.tenantProfiles.config.wsSessionsPerTenant': '每个租户的最大会话数',
  'pages.tenantProfiles.config.wsSubscriptionsPerTenant':
    '每个租户的最大订阅数',
  'pages.tenantProfiles.config.wsSessionsPerCustomer': '每个客户的最大会话数',
  'pages.tenantProfiles.config.wsSubscriptionsPerCustomer':
    '每个客户的最大订阅数',
  'pages.tenantProfiles.config.wsSessionsPerRegularUser':
    '每个普通用户的最大会话数',
  'pages.tenantProfiles.config.wsSubscriptionsPerRegularUser':
    '每个普通用户的最大订阅数',
  'pages.tenantProfiles.config.wsSessionsPerPublicUser':
    '每个公共用户的最大会话数',
  'pages.tenantProfiles.config.wsSubscriptionsPerPublicUser':
    '每个公共用户的最大订阅数',
  'pages.tenantProfiles.config.wsQueuePerSession': '每个会话的最大消息队列大小',
  'pages.tenantProfiles.config.transportTenantMsg': '传输层租户消息',
  'pages.tenantProfiles.config.transportDeviceMsg': '传输层设备消息',
  'pages.tenantProfiles.config.transportTenantTelemetryMsg':
    '传输层租户遥测消息',
  'pages.tenantProfiles.config.transportDeviceTelemetryMsg':
    '传输层设备遥测消息',
  'pages.tenantProfiles.config.transportGatewayMsg': '传输层 Gateway 消息',
  'pages.tenantProfiles.config.transportGatewayDeviceMsg':
    '传输层 Gateway 设备消息',
  'pages.tenantProfiles.config.transportGatewayTelemetryMsg':
    '传输层 Gateway 遥测消息',
  'pages.tenantProfiles.config.transportGatewayDeviceTelemetryMsg':
    '传输层 Gateway 设备遥测消息',
  'pages.tenantProfiles.config.transportTenantTelemetryDataPoints':
    '传输层租户遥测数据点',
  'pages.tenantProfiles.config.transportDeviceTelemetryDataPoints':
    '传输层设备遥测数据点',
  'pages.tenantProfiles.config.transportGatewayTelemetryDataPoints':
    '传输层 Gateway 遥测数据点',
  'pages.tenantProfiles.config.transportGatewayDeviceTelemetryDataPoints':
    '传输层 Gateway 设备遥测数据点',
  'pages.tenantProfiles.config.tenantRestLimits': '租户 REST 请求',
  'pages.tenantProfiles.config.customerRestLimits': '客户 REST 请求',
  'pages.tenantProfiles.config.tenantEntityExportRateLimit': '实体版本创建',
  'pages.tenantProfiles.config.tenantEntityImportRateLimit': '实体版本加载',
  'pages.tenantProfiles.config.cassandraWriteTenantCore':
    'Rest API Cassandra 写入查询',
  'pages.tenantProfiles.config.cassandraReadTenantCore':
    'Rest API 和 WS 遥测 Cassandra 读取查询',
  'pages.tenantProfiles.config.cassandraWriteTenantRuleEngine':
    '规则引擎遥测 Cassandra 写入查询',
  'pages.tenantProfiles.config.cassandraReadTenantRuleEngine':
    '规则引擎遥测 Cassandra 读取查询',
  'pages.tenantProfiles.config.tenantNotificationRequest': '通知请求',
  'pages.tenantProfiles.config.tenantNotificationRequestsPerRule':
    '每条通知规则的通知请求',
  'pages.tenantProfiles.config.edgeEventsRateLimit': 'Edge 事件',
  'pages.tenantProfiles.config.edgeEventsPerEdgeRateLimit':
    '每个 Edge 的 Edge 事件',
  'pages.tenantProfiles.config.edgeUplinkMessagesRateLimit': 'Edge 上行消息',
  'pages.tenantProfiles.config.edgeUplinkMessagesPerEdgeRateLimit':
    '每个 Edge 的 Edge 上行消息',
  'pages.tenantProfiles.config.wsUpdatesPerSession': '每个会话的 WS 更新',

  // ---- 队列编辑器 ----
  'pages.tenantProfiles.queues.noQueue': '未配置队列',
  'pages.tenantProfiles.queues.addQueue': '添加队列',
  'pages.tenantProfiles.queues.delete': '删除队列',
  'pages.tenantProfiles.queues.name': '名称',
  'pages.tenantProfiles.queues.nameRequired': '队列名称为必填项！',
  'pages.tenantProfiles.queues.namePattern':
    '队列名称包含 ASCII 字母数字、“.”、“_”和“-”以外的字符！',
  'pages.tenantProfiles.queues.pollInterval': '轮询间隔',
  'pages.tenantProfiles.queues.pollIntervalRequired': '轮询间隔为必填项！',
  'pages.tenantProfiles.queues.partitions': '分区',
  'pages.tenantProfiles.queues.partitionsRequired': '分区为必填项！',
  'pages.tenantProfiles.queues.packProcessingTimeout': '处理超时（毫秒）',
  'pages.tenantProfiles.queues.packProcessingTimeoutRequired':
    '处理超时为必填项',
  'pages.tenantProfiles.queues.submitSettings': '提交设置',
  'pages.tenantProfiles.queues.submitStrategy': '策略类型',
  'pages.tenantProfiles.queues.submitStrategyTypeRequired':
    '提交策略类型为必填项！',
  'pages.tenantProfiles.queues.batchSize': '批量大小',
  'pages.tenantProfiles.queues.batchSizeRequired': '批量大小为必填项！',
  'pages.tenantProfiles.queues.processingSettings': '重试处理设置',
  'pages.tenantProfiles.queues.processingStrategy': '处理类型',
  'pages.tenantProfiles.queues.processingStrategyTypeRequired':
    '处理策略类型为必填项！',
  'pages.tenantProfiles.queues.retries': '重试次数（0 — 无限）',
  'pages.tenantProfiles.queues.retriesRequired': '重试次数为必填项！',
  'pages.tenantProfiles.queues.failurePercentage':
    '跳过重试的失败消息百分比（%）',
  'pages.tenantProfiles.queues.failurePercentageRequired':
    '失败百分比为必填项！',
  'pages.tenantProfiles.queues.pauseBetweenRetries': '重试间隔（秒）',
  'pages.tenantProfiles.queues.pauseBetweenRetriesRequired':
    '重试间隔为必填项！',
  'pages.tenantProfiles.queues.maxPauseBetweenRetries': '额外重试间隔（秒）',
  'pages.tenantProfiles.queues.maxPauseBetweenRetriesRequired':
    '最大重试间隔为必填项！',
  'pages.tenantProfiles.queues.consumerPerPartition':
    '为每个消费者发送消息轮询',
  'pages.tenantProfiles.queues.duplicateMsgToAllPartitions':
    '将消息复制到所有分区',
  'pages.tenantProfiles.queues.customProperties': '自定义属性',
  'pages.tenantProfiles.queues.description': '描述',
};
