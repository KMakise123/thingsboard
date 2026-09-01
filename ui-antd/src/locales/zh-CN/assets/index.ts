/**
 * zh-CN asset domain keys (list page, add/edit dialog, CSV import and the
 * 8-tab detail page). Wording follows ui-ngx locale.constant-zh_CN.json
 * (asset / attribute keys). Must stay key-for-key identical with
 * en-US/assets/index.ts (check-locale).
 */
export default {
  // ---- list: table & filters ----
  'pages.assets.list.search': '搜索资产',
  'pages.assets.list.profile': '资产配置',
  'pages.assets.list.profilePlaceholder': '全部资产配置',
  'pages.assets.list.name': '名称',
  'pages.assets.list.label': '标签',
  'pages.assets.list.createdTime': '创建时间',
  'pages.assets.list.customer': '客户',
  'pages.assets.list.empty': '暂无资产',
  'pages.assets.list.loadFailed': '加载资产列表失败',

  // ---- list: toolbar ----
  'pages.assets.list.add': '添加新资产',
  'pages.assets.list.import': '导入资产',
  'pages.assets.list.refresh': '刷新',
  'pages.assets.list.selectedCount': '已选 {count} 项',
  'pages.assets.list.total': '共 {count} 个',
  'pages.assets.list.batchDelete': '删除所选',
  'pages.assets.list.batchAssign': '分配客户',
  'pages.assets.list.batchUnassign': '取消分配客户',

  // ---- list: row actions ----
  'pages.assets.list.actionEdit': '编辑',
  'pages.assets.list.actionDelete': '删除',
  'pages.assets.list.actionAssign': '分配给客户',
  'pages.assets.list.actionUnassign': '从客户取消分配',
  'pages.assets.list.actionMakePublic': '将资产设为公开',
  'pages.assets.list.actionMakePrivate': '将资产设为私有',
  'pages.assets.list.publicColumn': '公开',
  'pages.assets.list.makePublicTitle': '确定要将资产“{name}”设为公开吗？',
  'pages.assets.list.makePublicText':
    '确认后，该资产及其所有数据将被设为公开，可被其他人访问。',

  // ---- list: confirmations & toasts ----
  'pages.assets.list.cancel': '取消',
  'pages.assets.list.deleteTitle': '确定要删除资产“{name}”吗？',
  'pages.assets.list.deleteText':
    '请注意，确认后资产及所有相关数据将无法恢复。',
  'pages.assets.list.deleteManyTitle': '确定要删除 {count} 个资产吗？',
  'pages.assets.list.deleteManyText':
    '请注意，确认后所有选中的资产将被移除，所有相关数据将无法恢复。',
  'pages.assets.list.unassignTitle': '确定要从客户取消分配资产“{name}”吗？',
  'pages.assets.list.unassignText': '确认后资产将被取消分配，客户将无法访问。',
  'pages.assets.list.unassignManyTitle': '确定要取消分配 {count} 个资产吗？',
  'pages.assets.list.unassignManyText':
    '确认后所有选中的资产将被取消分配，客户将无法访问。',
  'pages.assets.list.toastDeleted': '资产已删除。',
  'pages.assets.list.toastAssigned': '资产已分配给客户。',
  'pages.assets.list.toastUnassigned': '资产已从客户取消分配。',
  'pages.assets.list.toastMadePublic': '资产已设为公开。',
  'pages.assets.list.toastImported': '导入完成。',
  'pages.assets.list.batchResult': '成功 {ok} 个，失败 {fail} 个。',

  // ---- add/edit dialog ----
  'pages.assets.dialog.addTitle': '添加新资产',
  'pages.assets.dialog.editTitle': '编辑资产',
  'pages.assets.dialog.save': '保存',
  'pages.assets.dialog.cancel': '取消',
  'pages.assets.dialog.name': '名称',
  'pages.assets.dialog.nameRequired': '名称为必填项。',
  'pages.assets.dialog.nameTooLong': '名称长度不能超过 255 个字符。',
  'pages.assets.dialog.assetProfile': '资产配置',
  'pages.assets.dialog.assetProfileRequired': '资产配置为必选项。',
  'pages.assets.dialog.assetProfilePlaceholder': '请选择资产配置',
  'pages.assets.dialog.label': '标签',
  'pages.assets.dialog.labelTooLong': '标签长度不能超过 255 个字符。',
  'pages.assets.dialog.customer': '分配给客户',
  'pages.assets.dialog.customerPlaceholder': '不分配客户',
  'pages.assets.dialog.description': '描述',
  'pages.assets.dialog.toastSaved': '资产已保存。',
  'pages.assets.dialog.saveFailed': '保存资产失败：{reason}',

  // ---- CSV import ----
  'pages.assets.import.title': '导入资产',
  'pages.assets.import.parseError': '无法解析 CSV：{message}',
  'pages.assets.import.stepFile': '选择文件',
  'pages.assets.import.stepConfig': '导入配置',
  'pages.assets.import.stepColumns': '选择列类型',
  'pages.assets.import.stepResult': '导入结果',
  'pages.assets.import.dropHint': '拖拽 CSV 文件到此处，或点击选择文件上传。',
  'pages.assets.import.noFile': '未选择文件',
  'pages.assets.import.next': '下一步',
  'pages.assets.import.back': '上一步',
  'pages.assets.import.cancel': '取消',
  'pages.assets.import.delimiter': 'CSV 分隔符',
  'pages.assets.import.header': '第一行包含列名',
  'pages.assets.import.update': '更新已有资产（属性 / 遥测）',
  'pages.assets.import.columnSample': '示例值',
  'pages.assets.import.columnType': '列类型',
  'pages.assets.import.columnKey': '属性/遥测键',
  'pages.assets.import.start': '导入',
  'pages.assets.import.running': '正在导入…',
  'pages.assets.import.created': '新建 {count}',
  'pages.assets.import.updated': '更新 {count}',
  'pages.assets.import.errors': '错误 {count}',
  'pages.assets.import.errorsList': '错误详情',
  'pages.assets.import.finish': '完成',
  'pages.assets.import.type.name': '名称',
  'pages.assets.import.type.type': '类型',
  'pages.assets.import.type.label': '标签',
  'pages.assets.import.type.description': '描述',
  'pages.assets.import.type.serverAttribute': '服务端属性',
  'pages.assets.import.type.sharedAttribute': '共享属性',
  'pages.assets.import.type.timeseries': '遥测',

  // ---- detail: header form ----
  'pages.assets.detail.edit': '编辑',
  'pages.assets.detail.cancelEdit': '取消编辑',
  'pages.assets.detail.save': '保存',
  'pages.assets.detail.name': '名称',
  'pages.assets.detail.nameRequired': '名称为必填项。',
  'pages.assets.detail.nameTooLong': '名称长度不能超过 255 个字符。',
  'pages.assets.detail.profile': '资产配置',
  'pages.assets.detail.profileRequired': '资产配置为必选项。',
  'pages.assets.detail.label': '标签',
  'pages.assets.detail.labelTooLong': '标签长度不能超过 255 个字符。',
  'pages.assets.detail.description': '描述',
  'pages.assets.detail.customer': '客户',
  'pages.assets.detail.public': '公开',
  'pages.assets.detail.toastSaved': '资产已保存。',
  'pages.assets.detail.saveFailed': '保存资产失败：{reason}',

  // ---- detail: header actions ----
  'pages.assets.detail.actionUnassign': '从客户取消分配',
  'pages.assets.detail.unassignTitle': '确定要从客户取消分配资产“{name}”吗？',
  'pages.assets.detail.unassignText':
    '确认后资产将被取消分配，客户将无法访问。',
  'pages.assets.detail.toastUnassigned': '资产已从客户取消分配。',
  'pages.assets.detail.cancel': '取消',
  'pages.assets.detail.unsavedTitle': '有未保存的修改',
  'pages.assets.detail.unsavedText':
    '资产有未保存的修改，仍要离开吗？离开后修改将丢失。',
  'pages.assets.detail.unsavedLeave': '离开',
  'pages.assets.detail.loadFailed': '加载资产失败',

  // ---- detail: tabs ----
  'pages.assets.detail.tabAttributes': '属性',
  'pages.assets.detail.tabLatestTelemetry': '最新遥测',
  'pages.assets.detail.tabCalculatedFields': '计算字段',
  'pages.assets.detail.tabAlarmRules': '告警规则',
  'pages.assets.detail.tabAlarms': '告警',
  'pages.assets.detail.tabRelations': '关联',
  'pages.assets.detail.tabAuditLogs': '审计日志',
  'pages.assets.detail.tabVersionControl': '版本控制',
};
