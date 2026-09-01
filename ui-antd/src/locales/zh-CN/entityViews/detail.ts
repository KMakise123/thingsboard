/**
 * zh-CN entity-view detail keys (detail-page header form shell + the six
 * tabs). Wording follows ui-ngx locale.constant-zh_CN.json (entity-view /
 * attribute sections). Must stay key-for-key identical with
 * en-US/entityViews/detail.ts (check-locale).
 */
export default {
  'pages.entityViews.detail.title': '实体视图详情',
  'pages.entityViews.detail.loadFailed': '加载实体视图失败',
  'pages.entityViews.detail.public': '公开',

  // ---- header form shell (edit / save / dirty guard) ----
  'pages.entityViews.detail.edit': '编辑',
  'pages.entityViews.detail.cancelEdit': '取消编辑',
  'pages.entityViews.detail.save': '保存',
  'pages.entityViews.detail.toastSaved': '实体视图已保存。',
  'pages.entityViews.detail.saveFailed': '保存实体视图失败：{reason}',
  'pages.entityViews.detail.unsavedTitle': '未保存的修改',
  'pages.entityViews.detail.unsavedText':
    '实体视图有未保存的修改，确定离开吗？修改将丢失。',
  'pages.entityViews.detail.unsavedLeave': '离开',
  'pages.entityViews.detail.cancel': '取消',

  // ---- tabs (ui-ngx entity-view-tabs order) ----
  'pages.entityViews.detail.tabAttributes': '属性',
  'pages.entityViews.detail.tabLatestTelemetry': '最新遥测',
  'pages.entityViews.detail.tabAlarms': '告警',
  'pages.entityViews.detail.tabRelations': '关联',
  'pages.entityViews.detail.tabAuditLogs': '审计日志',
  'pages.entityViews.detail.tabVersionControl': '版本控制',
};
