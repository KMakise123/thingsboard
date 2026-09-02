/**
 * zh-CN device-profile domain keys (list page, add/edit dialog, detail
 * general/transport/provisioning tabs). Wording follows ui-ngx
 * locale.constant-zh_CN.json (device-profile / alarm-rule / audit-log
 * keys). Must stay key-for-key identical with en-US/device-profiles/index.ts
 * (check-locale).
 */
export default {
  'pages.device-profiles.typeDefault': '默认',
  // ---- list ----
  'pages.device-profiles.list.createdTime': '创建时间',
  'pages.device-profiles.list.name': '名称',
  'pages.device-profiles.list.type': '配置类型',
  'pages.device-profiles.list.transportType': '传输类型',
  'pages.device-profiles.list.description': '描述',
  'pages.device-profiles.list.default': '默认',
  'pages.device-profiles.list.search': '搜索设备配置',
  'pages.device-profiles.list.refresh': '刷新',
  'pages.device-profiles.list.add': '添加设备配置',
  'pages.device-profiles.list.selectedCount': '已选择 {count} 项',
  'pages.device-profiles.list.batchDelete': '删除所选',
  'pages.device-profiles.list.total': '共 {count} 条',
  'pages.device-profiles.list.empty': '未找到设备配置',
  'pages.device-profiles.list.loadFailed': '加载设备配置失败',
  'pages.device-profiles.list.actionExport': '导出设备配置',
  'pages.device-profiles.list.actionSetDefault': '设为默认设备配置',
  'pages.device-profiles.list.actionEdit': '编辑',
  'pages.device-profiles.list.actionDelete': '删除',
  'pages.device-profiles.list.actionYes': '是',
  'pages.device-profiles.list.actionNo': '否',
  'pages.device-profiles.list.cancel': '取消',
  'pages.device-profiles.list.setDefaultTitle':
    "确定要将设备配置 '{name}' 设为默认吗？",
  'pages.device-profiles.list.setDefaultText':
    '确认后，该设备配置将被标记为默认，并将用于未指定配置的新设备。',
  'pages.device-profiles.list.toastSetDefault': '默认设备配置已更新。',
  'pages.device-profiles.list.deleteTitle': "确定要删除设备配置 '{name}' 吗？",
  'pages.device-profiles.list.deleteManyTitle':
    '确定要删除 {count} 个设备配置吗？',
  'pages.device-profiles.list.deleteText':
    '请注意，确认后设备配置及所有相关数据（包括关联的 OTA 更新）将无法恢复。',
  'pages.device-profiles.list.deleteFailed':
    '删除时出现 {fail} 个失败。默认设备配置不可删除。',
  'pages.device-profiles.list.toastDeleted': '设备配置已删除。',
  'pages.device-profiles.list.defaultProtected':
    '默认设备配置不可删除、不可选中。',
  // ---- dialog ----
  'pages.device-profiles.dialog.addTitle': '添加设备配置',
  'pages.device-profiles.dialog.editTitle': '编辑设备配置',
  'pages.device-profiles.dialog.name': '名称',
  'pages.device-profiles.dialog.nameRequired': '名称为必填项。',
  'pages.device-profiles.dialog.nameTooLong': '名称长度不能超过 255 个字符。',
  'pages.device-profiles.dialog.type': '配置类型',
  'pages.device-profiles.dialog.transportType': '传输类型',
  'pages.device-profiles.dialog.transportTypeRequired': '传输类型为必填项。',
  'pages.device-profiles.dialog.description': '描述',
  'pages.device-profiles.dialog.save': '保存',
  'pages.device-profiles.dialog.cancel': '取消',
  'pages.device-profiles.dialog.toastSaved': '设备配置已保存。',
  'pages.device-profiles.dialog.saveFailed': '保存设备配置失败：{reason}',
  // ---- detail general ----
  'pages.device-profiles.detail.tabDetails': '详情',
  'pages.device-profiles.detail.tabTransportConfiguration': '传输配置',
  'pages.device-profiles.detail.tabCalculatedFields': '计算字段',
  'pages.device-profiles.detail.tabAlarmRules': '告警规则',
  'pages.device-profiles.detail.tabDeviceProvisioning': '设备预配置',
  'pages.device-profiles.detail.tabAuditLogs': '审计日志',
  'pages.device-profiles.detail.tabVersionControl': '版本控制',
  'pages.device-profiles.detail.defaultTag': '默认',
  'pages.device-profiles.detail.defaultRuleChain': '默认规则链',
  'pages.device-profiles.detail.mobileDashboard': '移动端仪表板',
  'pages.device-profiles.detail.mobileDashboardHint':
    '移动应用使用此仪表板作为设备详情仪表板',
  'pages.device-profiles.detail.defaultQueueName': '默认队列名称',
  'pages.device-profiles.detail.selectQueueHint': '从下拉列表中选择。',
  'pages.device-profiles.detail.defaultEdgeRuleChain': '默认 Edge 规则链',
  'pages.device-profiles.detail.defaultEdgeRuleChainHint':
    '在 Edge 上用作规则链，处理此设备配置的设备传入数据',
  'pages.device-profiles.detail.firmware': '固件',
  'pages.device-profiles.detail.software': '软件',
  'pages.device-profiles.detail.image': '设备配置图片',
  'pages.device-profiles.detail.profileConfiguration': '配置设定',
  'pages.device-profiles.detail.defaultConfigurationEmpty':
    '默认配置类型没有额外配置项。',
  'pages.device-profiles.detail.configurationNotEditable':
    '该配置类型暂无 v1 编辑器；已存储的配置会在保存时原样保留。',
  'pages.device-profiles.detail.edit': '编辑',
  'pages.device-profiles.detail.cancelEdit': '取消编辑',
  'pages.device-profiles.detail.save': '保存',
  'pages.device-profiles.detail.toastSaved': '设备配置已保存。',
  'pages.device-profiles.detail.saveFailed': '保存设备配置失败：{reason}',
  'pages.device-profiles.detail.loadFailed': '加载设备配置失败',
  'pages.device-profiles.detail.unsavedTitle': '未保存的修改',
  'pages.device-profiles.detail.unsavedText':
    '设备配置有未保存的修改，仍要离开吗？修改将丢失。',
  'pages.device-profiles.detail.unsavedLeave': '离开',
  // ---- transport ----
  'pages.device-profiles.detail.transportDefaultEmpty':
    '默认传输支持基本 MQTT、HTTP 和 CoAP，没有额外设置。',
  'pages.device-profiles.detail.transportChangeWarning':
    '切换传输类型将使用出厂默认值重建配置。',
  'pages.device-profiles.transport.DEFAULT': '默认',
  'pages.device-profiles.transport.MQTT': 'MQTT',
  'pages.device-profiles.transport.COAP': 'CoAP',
  'pages.device-profiles.transport.LWM2M': 'LWM2M',
  'pages.device-profiles.transport.SNMP': 'SNMP',
  'pages.device-profiles.transport.DEFAULTHint':
    '支持基本 MQTT、HTTP 和 CoAP 传输',
  'pages.device-profiles.transport.MQTTHint': '启用高级 MQTT 传输设置',
  'pages.device-profiles.transport.COAPHint': '启用高级 CoAP 传输设置',
  'pages.device-profiles.transport.LWM2MHint': 'LWM2M 传输类型',
  'pages.device-profiles.transport.SNMPHint': '指定 SNMP 传输配置',
  'pages.device-profiles.transport.mqttSparkplug':
    'MQTT Sparkplug B Edge of Network (EoN) 节点。',
  'pages.device-profiles.transport.mqttSparkplugMetricNames':
    '存为属性的 SparkPlug 指标名称。',
  'pages.device-profiles.transport.telemetryTopicFilter': '遥测主题过滤器',
  'pages.device-profiles.transport.attributesTopicFilter': '属性发布主题过滤器',
  'pages.device-profiles.transport.attributesSubscribeTopicFilter':
    '属性订阅主题过滤器',
  'pages.device-profiles.transport.mqttWildcardsHint':
    '支持单级 [+] 和多级 [#] 通配符。',
  'pages.device-profiles.transport.mqttPayloadType': 'MQTT 设备负载',
  'pages.device-profiles.transport.payloadJson': 'JSON',
  'pages.device-profiles.transport.payloadProtobuf': 'Protobuf',
  'pages.device-profiles.transport.mqttCompatJson':
    '启用与其他负载格式的兼容性。',
  'pages.device-profiles.transport.mqttJsonDownlink':
    '对默认下行主题使用 Json 格式',
  'pages.device-profiles.transport.telemetryProtoSchema': '遥测 proto 模式',
  'pages.device-profiles.transport.attributesProtoSchema': '属性 proto 模式',
  'pages.device-profiles.transport.rpcRequestProtoSchema':
    'RPC 请求 proto 模式',
  'pages.device-profiles.transport.rpcResponseProtoSchema':
    'RPC 响应 proto 模式',
  'pages.device-profiles.transport.protoSchemaRequired': 'proto 模式为必填项。',
  'pages.device-profiles.transport.mqttSendAck':
    '在 PUBLISH 消息验证失败时发送 PUBACK',
  'pages.device-profiles.transport.coapDeviceType': 'CoAP 设备类型',
  'pages.device-profiles.transport.coapTypeDefault': '默认',
  'pages.device-profiles.transport.coapTypeEfento': 'Efento NB-IoT',
  'pages.device-profiles.transport.coapPayloadType': 'CoAP 设备负载',
  'pages.device-profiles.transport.powerSavingMode': '省电模式',
  'pages.device-profiles.transport.edrxCycle': 'eDRX 周期（毫秒）',
  'pages.device-profiles.transport.pagingTransmissionWindow':
    '寻呼传输窗口（毫秒）',
  'pages.device-profiles.transport.psmActivityTimer': 'PSM 活动定时器（毫秒）',
  'pages.device-profiles.transport.snmpTimeoutMs': '超时（毫秒）',
  'pages.device-profiles.transport.snmpRetries': '重试次数',
  'pages.device-profiles.transport.snmpCommunicationConfigs':
    '通信配置（JSON）——映射表编辑器随 v2 交付。',
  'pages.device-profiles.transport.lwm2mConfigurationJson':
    'LWM2M 配置（JSON）',
  'pages.device-profiles.transport.lwm2mLeftover':
    'LWM2M 对象/观察配置编辑器随 v2 交付；已存储的配置以 JSON 原样保留。',
  // ---- provisioning ----
  'pages.device-profiles.detail.provisionStrategy': '预配置策略',
  'pages.device-profiles.detail.provisionStrategyRequired':
    '预配置策略为必填项。',
  'pages.device-profiles.provision.DISABLED': '禁用',
  'pages.device-profiles.provision.ALLOW_CREATE_NEW_DEVICES': '允许创建新设备',
  'pages.device-profiles.provision.CHECK_PRE_PROVISIONED_DEVICES':
    '检查预预配置的设备',
  'pages.device-profiles.provision.X509_CERTIFICATE_CHAIN': 'X509 证书链',
  'pages.device-profiles.detail.provisionDeviceKey': '设备预配置密钥',
  'pages.device-profiles.detail.provisionDeviceKeyRequired':
    '设备预配置密钥为必填项。',
  'pages.device-profiles.detail.provisionDeviceSecret': '设备预配置密码',
  'pages.device-profiles.detail.provisionDeviceSecretRequired':
    '设备预配置密码为必填项。',
  'pages.device-profiles.detail.provisionCopied': '已复制到剪贴板。',
  'pages.device-profiles.detail.provisionX509Hint':
    '要使用 X509 证书链预配置设备，设备证书 CN 必须匹配所配置的正则表达式。',
  'pages.device-profiles.detail.provisionX509AllowCreateHint':
    '允许通过 X509 证书链创建新设备。',
  'pages.device-profiles.detail.provisionX509CertificateValue': '证书值',
  'pages.device-profiles.detail.provisionX509CertificateValueRequired':
    '证书值为必填项。',
  'pages.device-profiles.detail.provisionX509CnRegex': 'CN 正则表达式变量',
  'pages.device-profiles.detail.provisionX509CnRegexHint':
    'CN 将与此正则表达式进行匹配。',
  'pages.device-profiles.detail.provisionX509CnRegexRequired':
    'CN 正则表达式为必填项。',
};
