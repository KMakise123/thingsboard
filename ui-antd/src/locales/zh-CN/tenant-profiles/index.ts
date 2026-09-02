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
};
