/**
 * zh-CN rule-node keys (`editor.ruleNode.*`, M8 wave-2 K): node config form
 * + P0 custom family components. Labels mirror the ui-ngx `rule-node-config.*`
 * section (locale.constant-zh_CN.json); enum option labels follow the ui-ngx
 * translation maps (telemetry scopes, alarm severities, entity types).
 * Keep zh-CN/en-US key-for-key identical (check-locale gate).
 */
export default {
  // script family — per-node test button labels (ui-ngx test-*-function)
  'editor.ruleNode.test.filter': '测试过滤函数',
  'editor.ruleNode.test.switch': '测试切换函数',
  'editor.ruleNode.test.transform': '测试转换函数',
  'editor.ruleNode.test.log': '测试转为字符串函数',
  'editor.ruleNode.test.generate': '测试生成器函数',
  'editor.ruleNode.test.details': '测试详情函数',
  'editor.ruleNode.test.modalTitle': '测试脚本',

  // generator simple fields
  'editor.ruleNode.field.msgCount': '生成消息限制（0 - 无限）',
  'editor.ruleNode.field.periodInSeconds': '生成频率（秒）',
  'editor.ruleNode.field.originatorType': '发起者类型',
  'editor.ruleNode.field.originatorId': '发起者 ID',

  // save time series / save attributes simple fields
  'editor.ruleNode.field.defaultTTL': '默认 TTL',
  'editor.ruleNode.field.useServerTs': '使用服务器时间戳',
  'editor.ruleNode.field.scope': '属性范围',
  'editor.ruleNode.field.notifyDevice': '强制通知设备',
  'editor.ruleNode.field.sendAttributesUpdatedNotification': '发送属性更新通知',
  'editor.ruleNode.field.updateAttributesOnlyOnValueChange': '仅在值变化时更新属性',
  'editor.ruleNode.field.alarmType': '告警类型',

  // key operations
  'editor.ruleNode.keyOps.source': '来源',
  'editor.ruleNode.keyOps.keys': '键',
  'editor.ruleNode.keyOps.keysPlaceholder': '添加键',
  'editor.ruleNode.option.msgSource.data': '数据',
  'editor.ruleNode.option.msgSource.metadata': '元数据',

  // rename keys mapping
  'editor.ruleNode.rename.mapping': '键映射',
  'editor.ruleNode.rename.currentKey': '当前键名称',
  'editor.ruleNode.rename.newKey': '新键名称',
  'editor.ruleNode.rename.add': '添加映射',

  // processing settings (save time series / save attributes)
  'editor.ruleNode.processing.title': '处理设置',
  'editor.ruleNode.processing.strategy': '策略',
  'editor.ruleNode.processing.deduplicationInterval': '去重间隔（秒）',
  'editor.ruleNode.processing.advanced': '高级策略',
  'editor.ruleNode.processing.advanced.timeseries': '遥测',
  'editor.ruleNode.processing.advanced.latest': '最新值',
  'editor.ruleNode.processing.advanced.webSockets': 'WebSocket',
  'editor.ruleNode.processing.advanced.calculatedFields': '计算字段',
  'editor.ruleNode.option.processing.onEveryMessage': '每条消息',
  'editor.ruleNode.option.processing.deduplicate': '去重',
  'editor.ruleNode.option.processing.webSocketsOnly': '仅 WebSocket',
  'editor.ruleNode.option.strategy.onEveryMessage': '每条消息',
  'editor.ruleNode.option.strategy.deduplicate': '去重',
  'editor.ruleNode.option.strategy.skip': '跳过',

  // create alarm family
  'editor.ruleNode.createAlarm.severity': '告警严重程度',
  'editor.ruleNode.createAlarm.dynamicSeverity': '使用告警严重程度模式',
  'editor.ruleNode.createAlarm.propagate': '将告警传播到关联实体',
  'editor.ruleNode.createAlarm.propagateToOwner': '将告警传播到实体所有者（客户或租户）',
  'editor.ruleNode.createAlarm.propagateToTenant': '将告警传播到租户',
  'editor.ruleNode.createAlarm.relationTypes': '要传播的关联类型',
  'editor.ruleNode.createAlarm.useMessageAlarmData': '使用消息告警数据',
  'editor.ruleNode.createAlarm.overwriteAlarmDetails': '覆盖告警详情',
  'editor.ruleNode.option.severity.critical': '危险',
  'editor.ruleNode.option.severity.major': '主要',
  'editor.ruleNode.option.severity.minor': '次要',
  'editor.ruleNode.option.severity.warning': '警告',
  'editor.ruleNode.option.severity.indeterminate': '不确定',

  // shared enum options
  'editor.ruleNode.option.scope.server': '服务器端属性',
  'editor.ruleNode.option.scope.shared': '共享属性',
  'editor.ruleNode.option.scope.client': '客户端属性',
  'editor.ruleNode.option.entityType.device': '设备',
  'editor.ruleNode.option.entityType.asset': '资产',
  'editor.ruleNode.option.entityType.entityView': '实体视图',
  'editor.ruleNode.option.entityType.customer': '客户',
  'editor.ruleNode.option.entityType.user': '用户',
  'editor.ruleNode.option.entityType.dashboard': '仪表板',
  'editor.ruleNode.option.entityType.tenant': '当前租户',
  'editor.ruleNode.option.entityType.ruleNode': '当前规则节点',
};
