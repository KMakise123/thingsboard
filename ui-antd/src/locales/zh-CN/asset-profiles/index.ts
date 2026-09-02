/**
 * zh-CN asset-profile domain keys (list page, add/edit dialog, detail
 * general tab + tabs). Wording follows ui-ngx locale.constant-zh_CN.json
 * (asset-profile keys). Must stay key-for-key identical with
 * en-US/asset-profiles/index.ts (check-locale).
 */
export default {
  // ---- list ----
  'pages.asset-profiles.list.createdTime': '创建时间',
  'pages.asset-profiles.list.name': '名称',
  'pages.asset-profiles.list.description': '描述',
  'pages.asset-profiles.list.default': '默认',
  'pages.asset-profiles.list.search': '搜索资产配置',
  'pages.asset-profiles.list.refresh': '刷新',
  'pages.asset-profiles.list.add': '添加资产配置',
  'pages.asset-profiles.list.selectedCount': '已选择 {count} 项',
  'pages.asset-profiles.list.batchDelete': '删除所选',
  'pages.asset-profiles.list.total': '共 {count} 条',
  'pages.asset-profiles.list.empty': '未找到资产配置',
  'pages.asset-profiles.list.loadFailed': '加载资产配置失败',
  'pages.asset-profiles.list.actionExport': '导出资产配置',
  'pages.asset-profiles.list.actionSetDefault': '设为默认资产配置',
  'pages.asset-profiles.list.actionEdit': '编辑',
  'pages.asset-profiles.list.actionDelete': '删除',
  'pages.asset-profiles.list.actionYes': '是',
  'pages.asset-profiles.list.actionNo': '否',
  'pages.asset-profiles.list.cancel': '取消',
  'pages.asset-profiles.list.setDefaultTitle':
    '确定要将资产配置“{name}”设为默认吗？',
  'pages.asset-profiles.list.setDefaultText':
    '确认后资产配置将被标记为默认，并用于未指定配置的新资产。',
  'pages.asset-profiles.list.toastSetDefault': '默认资产配置已更新。',
  'pages.asset-profiles.list.deleteTitle': '确定要删除资产配置“{name}”吗？',
  'pages.asset-profiles.list.deleteManyTitle':
    '确定要删除 {count} 个资产配置吗？',
  'pages.asset-profiles.list.deleteText':
    '请注意，确认后资产配置及所有相关数据将无法恢复。',
  'pages.asset-profiles.list.deleteFailed':
    '删除时出现 {fail} 个失败。默认资产配置不可删除。',
  'pages.asset-profiles.list.toastDeleted': '资产配置已删除。',
  'pages.asset-profiles.list.defaultProtected':
    '默认资产配置不可删除、不可选中。',
  // ---- dialog ----
  'pages.asset-profiles.dialog.addTitle': '添加资产配置',
  'pages.asset-profiles.dialog.editTitle': '编辑资产配置',
  'pages.asset-profiles.dialog.name': '名称',
  'pages.asset-profiles.dialog.nameRequired': '名称为必填项。',
  'pages.asset-profiles.dialog.nameTooLong': '名称长度不能超过 255 个字符。',
  'pages.asset-profiles.dialog.description': '描述',
  'pages.asset-profiles.dialog.save': '保存',
  'pages.asset-profiles.dialog.cancel': '取消',
  'pages.asset-profiles.dialog.toastSaved': '资产配置已保存。',
  'pages.asset-profiles.dialog.saveFailed': '保存资产配置失败：{reason}',
  // ---- detail ----
  'pages.asset-profiles.detail.tabDetails': '详情',
  'pages.asset-profiles.detail.tabCalculatedFields': '计算字段',
  'pages.asset-profiles.detail.tabAlarmRules': '告警规则',
  'pages.asset-profiles.detail.tabAuditLogs': '审计日志',
  'pages.asset-profiles.detail.tabVersionControl': '版本控制',
  'pages.asset-profiles.detail.defaultTag': '默认',
  'pages.asset-profiles.detail.defaultRuleChain': '默认规则链',
  'pages.asset-profiles.detail.mobileDashboard': '移动端仪表板',
  'pages.asset-profiles.detail.mobileDashboardHint':
    '移动应用程序用作资产详情仪表板',
  'pages.asset-profiles.detail.defaultQueueName': '默认队列名称',
  'pages.asset-profiles.detail.selectQueueHint': '从下拉列表中选择。',
  'pages.asset-profiles.detail.defaultEdgeRuleChain': '默认 Edge 规则链',
  'pages.asset-profiles.detail.defaultEdgeRuleChainHint':
    '在 Edge 上用作处理此资产配置资产传入数据的规则链',
  'pages.asset-profiles.detail.image': '资产配置图片',
  'pages.asset-profiles.detail.edit': '编辑',
  'pages.asset-profiles.detail.cancelEdit': '取消编辑',
  'pages.asset-profiles.detail.save': '保存',
  'pages.asset-profiles.detail.toastSaved': '资产配置已保存。',
  'pages.asset-profiles.detail.saveFailed': '保存资产配置失败：{reason}',
  'pages.asset-profiles.detail.loadFailed': '加载资产配置失败',
  'pages.asset-profiles.detail.unsavedTitle': '未保存的修改',
  'pages.asset-profiles.detail.unsavedText':
    '资产配置有未保存的修改，仍要离开吗？修改将丢失。',
  'pages.asset-profiles.detail.unsavedLeave': '离开',
};
