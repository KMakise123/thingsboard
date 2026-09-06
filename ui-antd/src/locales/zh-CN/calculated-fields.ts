/**
 * zh-CN strings for the calculated-fields standalone page (M14 wave-4).
 * Key-for-key identical with en-US/calculated-fields.ts (check-locale gate).
 */
export default {
  // list page
  'pages.calculatedFields.search': '搜索计算字段',
  'pages.calculatedFields.refresh': '刷新',
  'pages.calculatedFields.total': '共 {count} 条',
  'pages.calculatedFields.empty': '暂无计算字段',
  'pages.calculatedFields.loadFailed': '计算字段加载失败',
  'pages.calculatedFields.selectedCount': '已选 {count} 条',
  'pages.calculatedFields.batchDelete': '删除所选',

  // columns
  'pages.calculatedFields.createdTime': '创建时间',
  'pages.calculatedFields.name': '名称',
  'pages.calculatedFields.entityType': '实体类型',
  'pages.calculatedFields.entityName': '实体',
  'pages.calculatedFields.type': '类型',
  'pages.calculatedFields.actions': '操作',

  // filter dimensions（六型——ALARM 按契约排除）
  'pages.calculatedFields.filter.types': '按类型过滤',
  'pages.calculatedFields.filter.entityType': '按实体类型过滤',
  'pages.calculatedFields.filter.entities': '按实体过滤',
  'pages.calculatedFields.filter.entitiesPlaceholder': '按实体过滤',
  'pages.calculatedFields.filter.entitiesNeedType': '请先选择实体类型',

  'pages.calculatedFields.entityType.DEVICE': '设备',
  'pages.calculatedFields.entityType.ASSET': '资产',
  'pages.calculatedFields.entityType.DEVICE_PROFILE': '设备配置',
  'pages.calculatedFields.entityType.ASSET_PROFILE': '资产配置',

  'pages.calculatedFields.type.SIMPLE': '简单',
  'pages.calculatedFields.type.SCRIPT': '脚本',
  'pages.calculatedFields.type.PROPAGATION': '属性传播',
  'pages.calculatedFields.type.RELATED_ENTITIES_AGGREGATION': '关联实体聚合',
  'pages.calculatedFields.type.ENTITY_AGGREGATION': '实体聚合',
  'pages.calculatedFields.type.GEOFENCING': '地理围栏',

  // row / header actions
  'pages.calculatedFields.add': '新增计算字段',
  'pages.calculatedFields.import': '导入',
  'pages.calculatedFields.copy': '复制',
  'pages.calculatedFields.export': '导出',
  'pages.calculatedFields.events': '事件',
  'pages.calculatedFields.eventsTitle': '事件：“{name}”',
  'pages.calculatedFields.delete': '删除',
  'pages.calculatedFields.edit': '编辑',
  'pages.calculatedFields.cancel': '取消',
  'pages.calculatedFields.apply': '应用',
  'pages.calculatedFields.save': '保存',
  'pages.calculatedFields.deleteOneTitle': '确定要删除计算字段“{name}”吗？',
  'pages.calculatedFields.deleteManyTitle':
    '确定要删除 {count, plural, =1 {1 个计算字段} other {# 个计算字段}}吗？',
  'pages.calculatedFields.deleteText': '注意：确认之后该计算字段将无法恢复。',
  'pages.calculatedFields.toastDeleted': '计算字段已删除。',
  'pages.calculatedFields.toastSaved': '计算字段已保存。',
  'pages.calculatedFields.importRejected':
    '{reason, select, parse {文件不是有效的 JSON。} type {ALARM 及未知类型不能在此导入。} other {文件中不包含计算字段。}}',

  // edit dialog skeleton
  'pages.calculatedFields.addTitle': '新增计算字段',
  'pages.calculatedFields.editTitle': '编辑计算字段',
  'pages.calculatedFields.importTitle': '导入计算字段',
  'pages.calculatedFields.nameRequired': '名称必填。',
  'pages.calculatedFields.nameMaxLength': '名称长度需小于 256 个字符。',
  'pages.calculatedFields.targetEntity': '目标实体',
  'pages.calculatedFields.targetEntityType': '实体类型',
  'pages.calculatedFields.targetEntityRequired': '目标实体必填。',
  'pages.calculatedFields.targetEntityLocked':
    '创建后不可更改目标实体——如需迁移请删除后重建。',
  'pages.calculatedFields.debugSettings': '调试设置',
  'pages.calculatedFields.debugFailures': '调试失败',
  'pages.calculatedFields.debugAll': '调试全部',
  'pages.calculatedFields.debugFor': '“{name}”的调试开关。',
  'pages.calculatedFields.debugSettingsHint':
    '调试开启期间，可通过行内“事件”动作查看调试事件。',
  'pages.calculatedFields.fixProblems': '请先修正标出的问题再保存。',

  // precheck（spec 6.1-10 / 6.6 增强登记）
  'pages.calculatedFields.precheckBlocked':
    '表达式未通过保存前预检——请修正后再保存。',
  'pages.calculatedFields.precheckDegraded':
    '预检无法执行（TBEL 脚本引擎未装配）——本次保存将不做表达式校验。',

  // arguments suite
  'pages.calculatedFields.arguments': '参数',
  'pages.calculatedFields.argumentsEmpty': '暂无参数',
  'pages.calculatedFields.argumentsRequired': '至少需要一个参数。',
  'pages.calculatedFields.argumentsRollingInSimple':
    '简单型计算字段不支持滚动窗口参数。请把字段类型切换为脚本，或改用最新遥测参数。',
  'pages.calculatedFields.argumentsEntityNotFound':
    '部分参数引用的实体不存在。请修正或删除这些参数后再保存。',
  'pages.calculatedFields.argument.addTitle': '新增参数',
  'pages.calculatedFields.argument.editTitle': '编辑参数',
  'pages.calculatedFields.argument.name': '名称',
  'pages.calculatedFields.argument.nameRequired': '参数名必填。',
  'pages.calculatedFields.argument.namePattern':
    '仅允许字母、数字和下划线，且以字母或下划线开头。',
  'pages.calculatedFields.argument.nameMaxLength':
    '参数名长度需小于 256 个字符。',
  'pages.calculatedFields.argument.nameDuplicate': '参数名在该字段内已被使用。',
  'pages.calculatedFields.argument.nameForbidden':
    '“{name}”是保留名，不能用作参数名。',
  'pages.calculatedFields.argument.source': '来源实体',
  'pages.calculatedFields.argument.sourceHint':
    '参数从哪里取值：字段目标实体本身、某个具体实体、租户或属主。',
  'pages.calculatedFields.argument.source.CURRENT': '当前实体',
  'pages.calculatedFields.argument.source.DEVICE': '设备',
  'pages.calculatedFields.argument.source.ASSET': '资产',
  'pages.calculatedFields.argument.source.CUSTOMER': '客户',
  'pages.calculatedFields.argument.source.TENANT': '租户',
  'pages.calculatedFields.argument.source.CURRENT_OWNER': '当前属主',
  'pages.calculatedFields.argument.refEntity': '实体',
  'pages.calculatedFields.argument.refEntityRequired': '实体必填。',
  'pages.calculatedFields.argument.entityPlaceholder': '搜索实体',
  'pages.calculatedFields.argument.entityNotFound': '未找到实体',
  'pages.calculatedFields.argument.tenantHint': '读取当前租户的租户级数据。',
  'pages.calculatedFields.argument.ownerHint':
    '读取实体属主的数据（运行期解析）。',
  'pages.calculatedFields.argument.key': '键',
  'pages.calculatedFields.argument.keyRequired': '键必填。',
  'pages.calculatedFields.argument.keyPattern': '键内部允许单个空格。',
  'pages.calculatedFields.argument.keyType': '数据类型',
  'pages.calculatedFields.argument.keyType.TS_LATEST': '最新遥测',
  'pages.calculatedFields.argument.keyType.ATTRIBUTE': '属性',
  'pages.calculatedFields.argument.keyType.TS_ROLLING': '滚动遥测',
  'pages.calculatedFields.argument.scope': '属性范围',
  'pages.calculatedFields.argument.limit': '数据点上限（最多 {max} 个）',
  'pages.calculatedFields.argument.limitRequired': '数据点上限必填。',
  'pages.calculatedFields.argument.timeWindow': '时间窗口（毫秒）',
  'pages.calculatedFields.argument.timeWindowRequired': '时间窗口必填。',
  'pages.calculatedFields.argument.defaultValue': '默认值',
  'pages.calculatedFields.argument.defaultValuePattern': '值内部允许单个空格。',

  // expression / script
  'pages.calculatedFields.expression': '表达式',
  'pages.calculatedFields.expressionRequired': '表达式必填。',
  'pages.calculatedFields.expressionMaxLength': '表达式长度需小于 256 个字符。',
  'pages.calculatedFields.expressionPattern': '表达式内部允许单个空格。',
  'pages.calculatedFields.scriptSignature': 'function calculate({args})',
  'pages.calculatedFields.testScript': '测试脚本',
  'pages.calculatedFields.useLatestTs': '计算时使用最新遥测',
  'pages.calculatedFields.useLatestTsTimeseriesOnly': '（仅时序输出可用）',

  // test dialog (R15)
  'pages.calculatedFields.testScriptTitle': '测试计算字段表达式（TBEL）',
  'pages.calculatedFields.testRun': '测试',
  'pages.calculatedFields.testNoArguments': '该字段没有参数。',
  'pages.calculatedFields.testParseError':
    '部分参数值不是有效的 JSON。请修正后再运行测试。',
  'pages.calculatedFields.testOutputPlaceholder': '运行测试后此处显示输出',

  // output suite
  'pages.calculatedFields.output.title': '输出',
  'pages.calculatedFields.output.type': '输出类型',
  'pages.calculatedFields.output.type.TIME_SERIES': '时序数据',
  'pages.calculatedFields.output.type.ATTRIBUTES': '属性',
  'pages.calculatedFields.output.scope': '范围',
  'pages.calculatedFields.output.scopeHint': '仅设备族目标实体可选择属性范围。',
  'pages.calculatedFields.output.timeseriesKey': '时序键',
  'pages.calculatedFields.output.attributeKey': '属性键',
  'pages.calculatedFields.output.keyRequired': '输出键必填。',
  'pages.calculatedFields.output.keyPattern': '键内部允许单个空格。',
  'pages.calculatedFields.output.decimals': '小数位数',
  'pages.calculatedFields.output.strategy': '输出策略',
  'pages.calculatedFields.output.strategyHint':
    '“写入数据库”直接落库；“发往规则链”则把计算结果交给规则链处理。',
  'pages.calculatedFields.output.strategy.IMMEDIATE': '写入数据库',
  'pages.calculatedFields.output.strategy.RULE_CHAIN': '发往规则链',
  'pages.calculatedFields.output.saveTimeSeries': '保存时序数据',
  'pages.calculatedFields.output.saveLatest': '写入最新遥测',
  'pages.calculatedFields.output.sendWsUpdate': '通过 WebSocket 推送',
  'pages.calculatedFields.output.processCfs': '触发其他计算字段',
  'pages.calculatedFields.output.saveAttribute': '保存属性',
  'pages.calculatedFields.output.updateOnlyOnChange': '仅值变化时更新属性',
  'pages.calculatedFields.output.sendAttributesUpdatedNotification':
    '发送属性更新通知',
  'pages.calculatedFields.output.useCustomTtl': '使用自定义 TTL',
  'pages.calculatedFields.output.ttl': 'TTL（秒）',
  'pages.calculatedFields.output.ruleChainHint':
    '计算结果将转发给规则链——上方的直接落库参数已禁用。',

  // wave-5 placeholder
  'pages.calculatedFields.placeholderTitle': '配置器将在后续波次交付',
  'pages.calculatedFields.placeholderHint': '完整编辑器交付前暂不能保存。',
  'pages.calculatedFields.placeholderDescription':
    '该类型的完整编辑器随 M14 wave-5 交付（属性传播、两类聚合、地理围栏）。本波次请先选择“简单”或“脚本”类型。',
};
