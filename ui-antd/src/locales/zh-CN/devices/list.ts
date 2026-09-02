/**
 * zh-CN devices-list keys (device list page, wizard, credentials /
 * connectivity dialogs, batch operations and CSV import).
 * Wording follows ui-ngx locale.constant-zh_CN.json (device / import keys).
 * Must stay key-for-key identical with en-US/devices/list.ts (check-locale).
 */
export default {
  // ---- table & filters ----
  'pages.devices.list.title': '设备',
  'pages.devices.list.search': '搜索设备',
  'pages.devices.list.profile': '设备配置',
  'pages.devices.list.profilePlaceholder': '全部设备配置',
  'pages.devices.list.state': '状态',
  'pages.devices.list.stateAny': '任意状态',
  'pages.devices.list.active': '活跃',
  'pages.devices.list.inactive': '不活跃',
  'pages.devices.list.name': '名称',
  'pages.devices.list.label': '标签',
  'pages.devices.list.createdTime': '创建时间',
  'pages.devices.list.customer': '客户',
  'pages.devices.list.public': '公开',
  'pages.devices.list.isGateway': '是否为 Gateway',
  'pages.devices.list.empty': '暂无设备',
  'pages.devices.list.loadFailed': '加载设备列表失败',

  // ---- toolbar ----
  'pages.devices.list.add': '添加新设备',
  'pages.devices.list.import': '导入设备',
  'pages.devices.list.refresh': '刷新',
  'pages.devices.list.selectedCount': '已选 {count} 项',
  'pages.devices.list.total': '共 {count} 个',
  'pages.devices.list.batchDelete': '删除所选',
  'pages.devices.list.batchAssign': '分配客户',
  'pages.devices.list.batchUnassign': '取消分配客户',

  // ---- row actions ----
  'pages.devices.list.actionDelete': '删除',
  'pages.devices.list.actionAssign': '分配给客户',
  'pages.devices.list.actionUnassign': '取消分配客户',
  'pages.devices.list.actionCredentials': '管理凭证',
  'pages.devices.list.actionViewCredentials': '查看凭证',
  'pages.devices.list.actionConnectivity': '检查连接',
  'pages.devices.list.moreActions': '更多操作',

  // ---- delete confirm ----
  'pages.devices.list.deleteTitle': '确定要删除设备“{name}”吗？',
  'pages.devices.list.deleteText':
    '请注意，确认后设备及所有相关数据将无法恢复。',
  'pages.devices.list.deleteManyTitle': '确定要删除 {count} 个设备吗？',
  'pages.devices.list.deleteManyText':
    '请注意，确认后所有选中的设备将被移除，所有相关数据将无法恢复。',

  // ---- batch ----
  'pages.devices.list.unassignManyTitle': '确定要取消分配 {count} 个设备吗？',
  'pages.devices.list.unassignManyText':
    '确认后所有选中的设备将被取消分配，客户将无法访问。',
  'pages.devices.list.unassignTitle': '确定要取消分配设备“{name}”吗？',
  'pages.devices.list.unassignText': '确认后设备将被取消分配，客户将无法访问。',
  'pages.devices.list.batchRunning': '正在处理 {done}/{total} …',
  'pages.devices.list.batchResult': '成功 {ok} 个，失败 {fail} 个。',
  'pages.devices.list.batchFailures': '失败详情',
  'pages.devices.list.publicCustomerFiltered': '公开客户不可用于分配',

  // ---- wizard ----
  'pages.devices.list.wizardTitle': '添加新设备',
  'pages.devices.list.wizardStepProfile': '选择设备配置',
  'pages.devices.list.wizardStepDetails': '设备详情',
  'pages.devices.list.wizardStepCredentials': '凭证',
  'pages.devices.list.wizardStepConnectivity': '检查连接',
  'pages.devices.list.wizardProfilePlaceholder': '搜索并选择设备配置',
  'pages.devices.list.wizardProfileRequired': '请选择设备配置。',
  'pages.devices.list.wizardName': '名称',
  'pages.devices.list.wizardNameRequired': '名称为必填项。',
  'pages.devices.list.wizardNameMaxLength': '名称长度不能超过 255 个字符。',
  'pages.devices.list.wizardLabelMaxLength': '标签长度不能超过 255 个字符。',
  'pages.devices.list.wizardOverwriteActivityTime': '覆盖已连接设备的活动时间',
  'pages.devices.list.wizardDescription': '描述',
  'pages.devices.list.wizardCreate': '创建设备',
  'pages.devices.list.wizardSkipCredentials': '跳过（自动生成凭证）',
  'pages.devices.list.wizardCreatedHint':
    '设备已成功创建，可先检查连接，再完成入列。',
  'pages.devices.list.wizardNext': '下一步',
  'pages.devices.list.wizardFinish': '完成',
  'pages.devices.list.cancel': '取消',
  'pages.devices.list.back': '返回',
  'pages.devices.list.close': '关闭',
  'pages.devices.list.save': '保存',

  // ---- credentials ----
  'pages.devices.list.credentialsType': '凭证类型',
  'pages.devices.list.credentialsAccessToken': '访问 Token',
  'pages.devices.list.credentialsAccessTokenRequired': '访问 Token 为必填项。',
  'pages.devices.list.credentialsAccessTokenInvalid':
    '访问 Token 长度必须在 1 到 32 个字符之间。',
  'pages.devices.list.credentialsCertificate': 'PEM 格式证书',
  'pages.devices.list.credentialsCertificateRequired': '证书为必填项。',
  'pages.devices.list.credentialsClientId': 'Client ID',
  'pages.devices.list.credentialsUserName': '用户名',
  'pages.devices.list.credentialsPassword': '密码',
  'pages.devices.list.credentialsMqttRequired': 'Client ID 和/或用户名为必填项',
  'pages.devices.list.credentialsGenerate': '生成',
  'pages.devices.list.credentialsCopy': '复制',
  'pages.devices.list.credentialsCopied': '已复制到剪贴板',
  'pages.devices.list.credentialsCopyFailed': '复制失败，请手动选择复制',
  'pages.devices.list.credentialsDialogTitle': '设备凭证',
  'pages.devices.list.credentialsLoading': '正在加载设备凭证…',
  'pages.devices.list.credentialsReadOnlyHint':
    '当前角色仅可查看凭证（支持复制）。',
  'pages.devices.list.credentialsLwm2mHint':
    'LwM2M 凭证编辑将在后续版本提供，当前仅展示。',
  'pages.devices.list.credentialsReset': '重置凭证',
  'pages.devices.list.credentialsResetTitle': '确定要重置设备凭证吗？',
  'pages.devices.list.credentialsResetText':
    '确认后将生成新的随机访问 Token，设备需要使用新凭证重新连接。',
  'pages.devices.list.credentialsResetDone': '凭证已重置。',
  'pages.devices.list.credentialsSaved': '凭证已保存。',

  // ---- connectivity ----
  'pages.devices.list.connectivityTitle': '检查连接',
  'pages.devices.list.connectivityAfterAddTitle':
    '设备已创建。让我们检查连接！',
  'pages.devices.list.connectivityLoading': '正在加载检查连接命令…',
  'pages.devices.list.connectivityInstructions':
    '使用以下说明通过 shell 代表设备发送遥测数据',
  'pages.devices.list.connectivityExecuteCommand': '执行以下命令',
  'pages.devices.list.connectivityInstallTools': '安装必要的客户端工具',
  'pages.devices.list.connectivityNoCommands': '暂无可用连接命令。',
  'pages.devices.list.connectivityLatestTelemetry': '最新遥测',
  'pages.devices.list.connectivityNoTelemetry': '无最新遥测',
  'pages.devices.list.connectivityKey': '键',
  'pages.devices.list.connectivityValue': '值',
  'pages.devices.list.connectivityTime': '时间',
  'pages.devices.list.connectivityDocumentation': '文档',
  'pages.devices.list.connectivityCheckDocs': '请查阅文档获取连接说明。',
  'pages.devices.list.connectivityInstallCurlWindows':
    '从 Windows 10 b17063 开始，cURL 默认可用',
  'pages.devices.list.connectivityInstallCurlMacos':
    '从 Mac OS X 10.2 6C115 (Jaguar) 开始，cURL 默认可用',
  'pages.devices.list.connectivityInstallMqttWindows':
    '使用说明下载、安装、设置和运行 mosquitto_pub',
  'pages.devices.list.connectivityInstallCoapClient':
    '使用说明下载、安装、设置和运行 coap-client',
  'pages.devices.list.connectivitySparkplugCommand':
    '使用以下文档通过 MQTT Sparkplug 连接设备。',
  'pages.devices.list.connectivityMqttsX509Command':
    '使用以下文档通过 MQTT 及 X509 授权连接设备',
  'pages.devices.list.connectivityCoapsX509Command':
    '使用以下文档通过 CoAP over DTLS 及 X509 授权连接设备',
  'pages.devices.list.connectivitySnmpCommand':
    '使用以下文档通过 SNMP 连接设备。',
  'pages.devices.list.connectivityLwm2mCommand':
    '使用以下文档通过 LwM2M 连接设备。',

  // ---- import ----
  'pages.devices.list.importStepFile': '选择文件',
  'pages.devices.list.importStepConfig': '导入配置',
  'pages.devices.list.importStepColumns': '选择列类型',
  'pages.devices.list.importStepResult': '导入结果',
  'pages.devices.list.importDropHint': '拖放 CSV 文件或点击选择要上传的文件。',
  'pages.devices.list.importNoFile': '未选择文件',
  'pages.devices.list.importFileRequired': '请先选择 CSV 文件。',
  'pages.devices.list.importDelimiter': 'CSV 分隔符',
  'pages.devices.list.importHeader': '第一行包含列名',
  'pages.devices.list.importUpdate': '更新已有设备（属性 / 遥测）',
  'pages.devices.list.importStart': '导入',
  'pages.devices.list.importColumn': '列 {index}',
  'pages.devices.list.importColumnType': '列类型',
  'pages.devices.list.importColumnKey': '属性/遥测键',
  'pages.devices.list.importColumnSample': '示例值数据',
  'pages.devices.list.importRunning': '正在导入…',
  'pages.devices.list.importCreated': '新建 {count} 个',
  'pages.devices.list.importUpdated': '更新 {count} 个',
  'pages.devices.list.importErrors': '失败 {count} 个',
  'pages.devices.list.importErrorsList': '失败详情',
  'pages.devices.list.importParseError': 'CSV 解析失败：{message}',
  'pages.devices.list.importMinColumns': '文件应至少包含两列。',
  'pages.devices.list.importType.name': '名称',
  'pages.devices.list.importType.type': '类型',
  'pages.devices.list.importType.label': '标签',
  'pages.devices.list.importType.description': '描述',
  'pages.devices.list.importType.isGateway': '是否为 Gateway',
  'pages.devices.list.importType.accessToken': '访问 Token',
  'pages.devices.list.importType.x509': 'X.509',
  'pages.devices.list.importType.mqttClientId': 'MQTT Client ID',
  'pages.devices.list.importType.mqttUserName': 'MQTT 用户名',
  'pages.devices.list.importType.mqttPassword': 'MQTT 密码',
  'pages.devices.list.importType.serverAttribute': '服务端属性',
  'pages.devices.list.importType.sharedAttribute': '共享属性',
  'pages.devices.list.importType.timeseries': '时间序列',

  // ---- toasts ----
  'pages.devices.list.toastDeviceCreated': '设备已创建。',
  'pages.devices.list.toastDeleted': '设备已删除。',
  'pages.devices.list.toastAssigned': '设备已分配给客户。',
  'pages.devices.list.toastUnassigned': '设备已取消分配客户。',
  'pages.devices.list.toastImported': '导入完成。',
};
