/**
 * zh-CN rule-node keys (`editor.ruleNode.*`, M8 wave-2 K): node config form
 * + P0 custom family components. Labels mirror the ui-ngx `rule-node-config.*`
 * section (locale.constant-zh_CN.json); enum option labels follow the ui-ngx
 * translation maps (telemetry scopes, alarm severities, entity types).
 * Keep zh-CN/en-US key-for-key identical (check-locale gate).
 */
export default {
  // node details drawer (wave-3 K2)
  'editor.ruleNode.tab.details': '详情',
  'editor.ruleNode.tab.events': '事件',
  'editor.ruleNode.tab.help': '帮助',
  'editor.ruleNode.details.name': '名称',
  'editor.ruleNode.details.nameRequired': '名称必填',
  'editor.ruleNode.details.description': '节点描述',
  'editor.ruleNode.details.queueName': '队列',
  'editor.ruleNode.details.singletonMode': '单例模式',
  'editor.ruleNode.details.debugFailures': '调试失败消息',
  'editor.ruleNode.details.debugAll': '调试全部消息',
  'editor.ruleNode.details.apply': '应用',
  'editor.ruleNode.help.docUrl': '查看文档',
  'editor.ruleNode.help.noDocs': '该节点暂无帮助文档。',

  // ------------------------------------------------------------------
  // wave-3 K2 — ui-hints full-coverage field labels (ui-ngx
  // rule-node-config.* zh_CN parity; protocol-literal options stay in the
  // hints table untranslated)
  // ------------------------------------------------------------------

  // relation / entity action nodes
  'editor.ruleNode.field.customerNamePattern': '客户标题',
  'editor.ruleNode.field.createCustomerIfNotExists':
    '如果客户不存在则创建新客户',
  'editor.ruleNode.field.direction': '方向',
  'editor.ruleNode.option.direction.from': '从',
  'editor.ruleNode.option.direction.to': '到',
  'editor.ruleNode.field.relationType': '关联类型',
  'editor.ruleNode.field.entityNamePattern': '名称模式',
  'editor.ruleNode.field.createEntityIfNotExists': '如果实体不存在则创建新实体',
  'editor.ruleNode.field.removeCurrentRelations': '移除当前关联',
  'editor.ruleNode.field.changeOriginatorToRelatedEntity':
    '将发起者更改为关联实体',
  'editor.ruleNode.field.deleteForSingleEntity': '仅删除单一实体的关联',
  'editor.ruleNode.field.persistAlarmRulesState': '持久化告警规则状态',
  'editor.ruleNode.field.fetchAlarmRulesStateOnStart': '启动时获取告警规则状态',
  'editor.ruleNode.field.event': '事件',
  'editor.ruleNode.option.event.activity': '活动事件',
  'editor.ruleNode.option.event.inactivity': '未活动事件',
  'editor.ruleNode.option.event.connect': '连接事件',
  'editor.ruleNode.option.event.disconnect': '断开连接事件',

  // gps geofencing
  'editor.ruleNode.field.latitudeKeyName': '纬度键名',
  'editor.ruleNode.field.longitudeKeyName': '经度键名',
  'editor.ruleNode.field.perimeterType': '边界类型',
  'editor.ruleNode.field.fetchPerimeterInfoFromMessageMetadata':
    '从消息元数据获取边界信息',
  'editor.ruleNode.field.perimeterKeyName': '边界键名称',
  'editor.ruleNode.field.polygonsDefinition': '多边形定义',
  'editor.ruleNode.field.centerLatitude': '中心纬度',
  'editor.ruleNode.field.centerLongitude': '中心经度',
  'editor.ruleNode.field.range': '范围',
  'editor.ruleNode.field.rangeUnit': '范围单位',
  'editor.ruleNode.option.perimeter.polygon': '多边形',
  'editor.ruleNode.option.perimeter.circle': '圆形',
  'editor.ruleNode.option.rangeUnit.meter': '米',
  'editor.ruleNode.option.rangeUnit.kilometer': '千米',
  'editor.ruleNode.option.rangeUnit.foot': '英尺',
  'editor.ruleNode.option.rangeUnit.mile': '英里',
  'editor.ruleNode.option.rangeUnit.nauticalMile': '海里',
  'editor.ruleNode.field.minInsideDuration': '最小内部持续时间',
  'editor.ruleNode.field.minOutsideDuration': '最小外部持续时间',
  'editor.ruleNode.field.minInsideDurationTimeUnit': '最小内部持续时间单位',
  'editor.ruleNode.field.minOutsideDurationTimeUnit': '最小外部持续时间单位',
  'editor.ruleNode.field.reportPresenceStatusOnEachMessage':
    '每条消息上报在线状态',

  // time units (shared)
  'editor.ruleNode.option.timeUnit.milliseconds': '毫秒',
  'editor.ruleNode.option.timeUnit.seconds': '秒',
  'editor.ruleNode.option.timeUnit.minutes': '分钟',
  'editor.ruleNode.option.timeUnit.hours': '小时',
  'editor.ruleNode.option.timeUnit.days': '天',

  // math function node
  'editor.ruleNode.field.operation': '操作',
  'editor.ruleNode.field.arguments': '参数',
  'editor.ruleNode.field.customFunction': '自定义函数',
  'editor.ruleNode.field.result': '结果',

  // message count / delay / deduplication
  'editor.ruleNode.field.telemetryPrefix': '遥测前缀',
  'editor.ruleNode.field.interval': '间隔',
  'editor.ruleNode.field.delayPeriodInSeconds': '周期（秒）',
  'editor.ruleNode.field.maxPendingMsgs': '最大待处理消息数',
  'editor.ruleNode.field.periodInSecondsPattern': '周期模式（秒）',
  'editor.ruleNode.field.useMetadataPeriodInSecondsPatterns':
    '使用元数据中的周期模式',
  'editor.ruleNode.field.maxRetries': '最大重试次数',
  'editor.ruleNode.field.strategy': '策略',
  'editor.ruleNode.field.outMsgType': '输出消息类型',

  // filter nodes
  'editor.ruleNode.field.alarmStatusList': '告警状态',
  'editor.ruleNode.field.messageNames': '消息数据字段',
  'editor.ruleNode.field.metadataNames': '元数据字段',
  'editor.ruleNode.field.checkAllKeys': '检查所有指定字段是否存在',
  'editor.ruleNode.field.entityId': '实体 ID',
  'editor.ruleNode.field.entityType': '实体类型',
  'editor.ruleNode.field.checkForSingleEntity': '检查与特定实体的关联',
  'editor.ruleNode.field.messageTypes': '消息类型',
  'editor.ruleNode.field.originatorTypes': '发起者类型过滤器',

  // enrichment nodes
  'editor.ruleNode.field.inputValueKey': '输入值键',
  'editor.ruleNode.field.outputValueKey': '输出值键',
  'editor.ruleNode.field.useCache': '使用缓存',
  'editor.ruleNode.field.addPeriodBetweenMsgs': '添加消息间隔',
  'editor.ruleNode.field.periodValueKey': '周期值键',
  'editor.ruleNode.field.round': '精度（小数位）',
  'editor.ruleNode.field.tellFailureIfDeltaIsNegative': '负差值时报失败',
  'editor.ruleNode.field.excludeZeroDeltas': '从出站消息中排除零差值',
  'editor.ruleNode.field.fetchTo': '获取到',
  'editor.ruleNode.option.fetchTo.data': '消息',
  'editor.ruleNode.option.fetchTo.metadata': '元数据',
  'editor.ruleNode.field.clientAttributeNames': '客户端属性',
  'editor.ruleNode.field.sharedAttributeNames': '共享属性',
  'editor.ruleNode.field.serverAttributeNames': '服务器端属性',
  'editor.ruleNode.field.latestTsKeyNames': '最新遥测键名',
  'editor.ruleNode.field.tellFailureIfAbsent': '报告失败',
  'editor.ruleNode.field.getLatestValueWithTs': '获取最新遥测值的时间戳',
  'editor.ruleNode.field.dataToFetch': '要获取的数据',
  'editor.ruleNode.option.dataToFetch.attributes': '属性',
  'editor.ruleNode.option.dataToFetch.latestTelemetry': '最新遥测',
  'editor.ruleNode.option.dataToFetch.fields': '字段',
  'editor.ruleNode.field.dataMapping': '数据映射',
  'editor.ruleNode.field.ignoreNullStrings': '忽略空字符串',
  'editor.ruleNode.field.sendAttributesDeletedNotification': '发送属性删除通知',
  'editor.ruleNode.field.detailsList': '要获取的实体详情字段',
  'editor.ruleNode.field.deviceRelationsQuery': '设备关联查询',
  'editor.ruleNode.field.relationsQuery': '关联查询',
  'editor.ruleNode.field.fetchLastLevelOnly': '仅取最后一级关联',
  'editor.ruleNode.field.maxLevel': '最大层级',
  'editor.ruleNode.field.startInterval': '间隔开始',
  'editor.ruleNode.field.endInterval': '间隔结束',
  'editor.ruleNode.field.startIntervalPattern': '起始间隔模式',
  'editor.ruleNode.field.endIntervalPattern': '结束间隔模式',
  'editor.ruleNode.field.useMetadataIntervalPatterns': '使用元数据间隔模式',
  'editor.ruleNode.field.startIntervalTimeUnit': '起始间隔单位',
  'editor.ruleNode.field.endIntervalTimeUnit': '结束间隔单位',
  'editor.ruleNode.field.fetchMode': '获取模式',
  'editor.ruleNode.option.fetchMode.first': '第一条',
  'editor.ruleNode.option.fetchMode.last': '最后一条',
  'editor.ruleNode.option.fetchMode.all': '全部',
  'editor.ruleNode.field.orderBy': '排序',
  'editor.ruleNode.option.orderBy.asc': '升序',
  'editor.ruleNode.option.orderBy.desc': '降序',
  'editor.ruleNode.field.aggregation': '数据聚合函数',
  'editor.ruleNode.option.aggregation.none': '无',
  'editor.ruleNode.option.aggregation.min': '最小值',
  'editor.ruleNode.option.aggregation.max': '最大值',
  'editor.ruleNode.option.aggregation.avg': '平均值',
  'editor.ruleNode.option.aggregation.sum': '总和',
  'editor.ruleNode.option.aggregation.count': '计数',
  'editor.ruleNode.field.limit': '限制',

  // external nodes — shared labels
  'editor.ruleNode.field.host': '主机',
  'editor.ruleNode.field.port': '端口',
  'editor.ruleNode.field.username': '用户名',
  'editor.ruleNode.field.password': '密码',
  'editor.ruleNode.field.topicPattern': '主题模式',
  'editor.ruleNode.field.keyPattern': '键模式',
  'editor.ruleNode.field.region': '区域',
  'editor.ruleNode.field.proxyHost': '代理主机',
  'editor.ruleNode.field.proxyPort': '代理端口',
  'editor.ruleNode.field.proxyUser': '代理用户',
  'editor.ruleNode.field.proxyPassword': '代理密码',
  'editor.ruleNode.field.enableProxy': '启用代理',
  'editor.ruleNode.field.parseToPlainText': '解析为纯文本',
  'editor.ruleNode.field.credentials': '凭据',
  'editor.ruleNode.field.protocolVersion': '协议版本',
  'editor.ruleNode.field.connectTimeoutSec': '连接超时（秒）',
  'editor.ruleNode.field.clientId': '客户端 ID',
  'editor.ruleNode.field.appendClientIdSuffix':
    '将 Service ID 作为后缀添加到 Client ID',
  'editor.ruleNode.field.retainedMessage': '保留消息',
  'editor.ruleNode.field.cleanSession': '清除会话',
  'editor.ruleNode.field.ssl': '启用 SSL',
  'editor.ruleNode.field.accessKeyId': '访问密钥 ID',
  'editor.ruleNode.field.secretAccessKey': '秘密访问密钥',

  // ai node
  'editor.ruleNode.field.aiModelId': 'AI 模型',
  'editor.ruleNode.field.systemPrompt': '系统提示词',
  'editor.ruleNode.field.userPrompt': '用户提示词',
  'editor.ruleNode.field.responseFormat': '响应格式',
  'editor.ruleNode.field.responseFormatType': '响应格式类型',
  'editor.ruleNode.option.responseFormat.json': 'JSON',
  'editor.ruleNode.option.responseFormat.text': '文本',
  'editor.ruleNode.option.responseFormat.jsonSchema': 'JSON Schema',
  'editor.ruleNode.field.timeoutSeconds': '超时（秒）',
  'editor.ruleNode.field.forceAck': '强制确认',

  // aws lambda / sns / sqs
  'editor.ruleNode.field.accessKey': '访问密钥',
  'editor.ruleNode.field.secretKey': '秘密密钥',
  'editor.ruleNode.field.functionName': '函数名称',
  'editor.ruleNode.field.qualifier': '限定符',
  'editor.ruleNode.field.connectionTimeout': '连接超时时间',
  'editor.ruleNode.field.requestTimeout': '请求超时时间',
  'editor.ruleNode.field.tellFailureIfFuncThrowsExc': '函数抛出异常时报失败',
  'editor.ruleNode.field.topicArnPattern': '主题 ARN 模式',
  'editor.ruleNode.field.queueType': '队列类型',
  'editor.ruleNode.option.queueType.standard': '标准',
  'editor.ruleNode.option.queueType.fifo': '先进先出',
  'editor.ruleNode.field.queueUrlPattern': '队列 URL 模式',
  'editor.ruleNode.field.delaySeconds': '延迟（秒）',

  // kafka
  'editor.ruleNode.field.bootstrapServers': 'Bootstrap 服务器',
  'editor.ruleNode.field.retries': '失败时自动重试次数',
  'editor.ruleNode.field.batchSize': '批量大小',
  'editor.ruleNode.field.linger': '滞留时间（毫秒）',
  'editor.ruleNode.field.bufferMemory': '缓冲区大小',
  'editor.ruleNode.field.acks': '确认数',
  'editor.ruleNode.field.addMetadataKeyValuesAsKafkaHeaders':
    '将消息元数据键值对添加到 Kafka 记录头',
  'editor.ruleNode.field.kafkaHeadersCharset': '字符集编码',
  'editor.ruleNode.field.otherProperties': '其他属性',

  // rabbitmq
  'editor.ruleNode.field.exchangeNamePattern': 'Exchange 名称模式',
  'editor.ruleNode.field.routingKeyPattern': '路由键模式',
  'editor.ruleNode.field.messageProperties': '消息属性',
  'editor.ruleNode.field.virtualHost': '虚拟主机',
  'editor.ruleNode.field.automaticRecoveryEnabled': '自动恢复',
  'editor.ruleNode.field.handshakeTimeout': '握手超时',

  // rest api call
  'editor.ruleNode.field.restEndpointUrlPattern': '端点 URL 模式',
  'editor.ruleNode.field.requestMethod': '请求方法',
  'editor.ruleNode.field.headers': '请求头',
  'editor.ruleNode.field.queryParams': '查询参数',
  'editor.ruleNode.field.readTimeoutMs': '读取超时（毫秒）',
  'editor.ruleNode.field.maxParallelRequestsCount': '最大并行请求数',
  'editor.ruleNode.field.useSystemProxyProperties': '使用系统代理属性',
  'editor.ruleNode.field.ignoreRequestBody': '无请求体',
  'editor.ruleNode.field.requestBodyTemplate': '请求体模板',
  'editor.ruleNode.field.maxInMemoryBufferSizeInKb': '最大内存缓冲区（KB）',

  // send email
  'editor.ruleNode.field.useSystemSmtpSettings': '使用系统 SMTP 设置',
  'editor.ruleNode.field.smtpHost': 'SMTP 主机',
  'editor.ruleNode.field.smtpPort': 'SMTP 端口',
  'editor.ruleNode.field.smtpProtocol': '协议',
  'editor.ruleNode.field.smtpTimeout': '超时（毫秒）',
  'editor.ruleNode.field.enableTls': '启用 TLS',
  'editor.ruleNode.field.tlsVersion': 'TLS 版本',

  // send sms / slack / notification
  'editor.ruleNode.field.numbersToTemplate': '电话号码收件人模板',
  'editor.ruleNode.field.smsMessageTemplate': '短信消息模板',
  'editor.ruleNode.field.useSystemSmsSettings': '使用系统短信提供商设置',
  'editor.ruleNode.field.smsProviderConfiguration': '短信提供商配置',
  'editor.ruleNode.field.botToken': 'Bot 令牌',
  'editor.ruleNode.field.useSystemSettings': '使用系统设置',
  'editor.ruleNode.field.messageTemplate': '消息模板',
  'editor.ruleNode.field.conversationType': '会话类型',
  'editor.ruleNode.field.conversation': '会话',
  'editor.ruleNode.option.slack.publicChannel': '公开频道',
  'editor.ruleNode.option.slack.privateChannel': '私有频道',
  'editor.ruleNode.option.slack.direct': '直接消息',
  'editor.ruleNode.field.targets': '接收者',
  'editor.ruleNode.field.templateId': '模板',

  // gcp pubsub / cassandra
  'editor.ruleNode.field.projectId': '项目 ID',
  'editor.ruleNode.field.topicName': '主题名称',
  'editor.ruleNode.field.serviceAccountKey': '服务账号密钥',
  'editor.ruleNode.field.serviceAccountKeyFileName': '服务账号密钥文件名',
  'editor.ruleNode.field.tableName': '表名',
  'editor.ruleNode.field.fieldsMapping': '字段映射',

  // rpc reply/request
  'editor.ruleNode.field.serviceIdMetaDataAttribute': '服务 Id',
  'editor.ruleNode.field.sessionIdMetaDataAttribute': '会话 Id',
  'editor.ruleNode.field.requestIdMetaDataAttribute': '请求 Id',
  'editor.ruleNode.field.timeoutInSeconds': '超时（秒）',

  // to email
  'editor.ruleNode.field.fromTemplate': '发件人',
  'editor.ruleNode.field.toTemplate': '收件人',
  'editor.ruleNode.field.ccTemplate': '抄送',
  'editor.ruleNode.field.bccTemplate': '密送',
  'editor.ruleNode.field.subjectTemplate': '主题',
  'editor.ruleNode.field.bodyTemplate': '正文',
  'editor.ruleNode.field.isHtmlTemplate': 'HTML 模板',
  'editor.ruleNode.field.mailBodyType': '邮件正文类型',
  'editor.ruleNode.option.mailBody.plain': '纯文本',
  'editor.ruleNode.option.mailBody.html': 'HTML',
  'editor.ruleNode.option.mailBody.dynamic': '动态',

  // change originator
  'editor.ruleNode.field.originatorSource': '发起者来源',
  'editor.ruleNode.option.originatorSource.customer': '客户',
  'editor.ruleNode.option.originatorSource.tenant': '租户',
  'editor.ruleNode.option.originatorSource.related': '关联实体',
  'editor.ruleNode.option.originatorSource.alarmOriginator': '告警发起者',
  'editor.ruleNode.option.originatorSource.entity': '按名称模式匹配的实体',

  // json path / flow input
  'editor.ruleNode.field.jsonPath': 'JSON 路径表达式',
  'editor.ruleNode.field.ruleChainId': '规则链',
  'editor.ruleNode.field.forwardMsgToDefaultRuleChain':
    '将消息转发到默认规则链',

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
  'editor.ruleNode.field.updateAttributesOnlyOnValueChange':
    '仅在值变化时更新属性',
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
  'editor.ruleNode.processing.mode.basic': '基本',
  'editor.ruleNode.processing.mode.advanced': '高级',
  'editor.ruleNode.processing.strategy': '策略',
  'editor.ruleNode.processing.deduplicationInterval': '去重间隔（秒）',
  'editor.ruleNode.processing.advanced': '高级策略',
  'editor.ruleNode.processing.advanced.timeseries': '遥测',
  'editor.ruleNode.processing.advanced.attributes': '属性',
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
  'editor.ruleNode.createAlarm.propagateToOwner':
    '将告警传播到实体所有者（客户或租户）',
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
