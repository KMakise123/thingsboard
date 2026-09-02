/**
 * zh-CN entity-view list keys (list page, create/edit dialog and the row
 * confirmation dialogs). Wording follows ui-ngx locale.constant-zh_CN.json
 * (entity-view section). Must stay key-for-key identical with
 * en-US/entityViews/list.ts (check-locale).
 */
export default {
  // ---- table & toolbar ----
  'pages.entityViews.list.title': '实体视图',
  'pages.entityViews.list.search': '搜索实体视图',
  'pages.entityViews.list.typeAll': '全部类型',
  'pages.entityViews.list.createdTime': '创建时间',
  'pages.entityViews.list.name': '名称',
  'pages.entityViews.list.type': '实体视图类型',
  'pages.entityViews.list.customer': '客户',
  'pages.entityViews.list.public': '公开',
  'pages.entityViews.list.empty': '未找到实体视图',
  'pages.entityViews.list.loadFailed': '加载实体视图列表失败',
  'pages.entityViews.list.refresh': '刷新',
  'pages.entityViews.list.total': '共 {count} 个',
  'pages.entityViews.list.add': '添加实体视图',

  // ---- row actions ----
  'pages.entityViews.list.actionEdit': '编辑',
  'pages.entityViews.list.actionDelete': '删除',
  'pages.entityViews.list.actionAssign': '分配给客户',
  'pages.entityViews.list.actionUnassign': '取消分配客户',
  'pages.entityViews.list.actionMakePublic': '将实体视图设为公开',
  'pages.entityViews.list.actionMakePrivate': '将实体视图设为私有',

  // ---- confirmations ----
  'pages.entityViews.list.deleteTitle': '确定要删除实体视图“{name}”吗？',
  'pages.entityViews.list.deleteText':
    '请注意，确认后实体视图及所有相关数据将无法恢复。',
  'pages.entityViews.list.unassignTitle': '确定要取消分配实体视图“{name}”吗？',
  'pages.entityViews.list.unassignText':
    '确认后，实体视图将被取消分配，客户将无法访问。',
  'pages.entityViews.list.makePublicTitle':
    '确定要将实体视图“{name}”设为公开吗？',
  'pages.entityViews.list.makePublicText':
    '确认后，实体视图及其所有数据将设为公开并可被其他人访问。',
  'pages.entityViews.list.makePrivateTitle':
    '确定要将实体视图“{name}”设为私有吗？',
  'pages.entityViews.list.makePrivateText':
    '确认后，实体视图及其所有数据将设为私有，其他人将无法访问。',

  // ---- batch ----
  'pages.entityViews.list.selectedCount': '已选 {count} 项',
  'pages.entityViews.list.batchAssign': '分配客户',
  'pages.entityViews.list.batchUnassign': '取消分配客户',
  'pages.entityViews.list.unassignManyTitle':
    '确定要取消分配 {count} 个实体视图吗？',
  'pages.entityViews.list.unassignManyText':
    '确认后所有选中的实体视图将被取消分配，客户将无法访问。',

  // ---- toasts ----
  'pages.entityViews.list.toastDeleted': '实体视图已删除。',
  'pages.entityViews.list.toastAssigned': '实体视图已分配给客户。',
  'pages.entityViews.list.toastUnassigned': '实体视图已取消分配。',
  'pages.entityViews.list.toastMadePublic': '实体视图已设为公开。',
  'pages.entityViews.list.toastMadePrivate': '实体视图已设为私有。',

  // ---- create / edit dialog ----
  'pages.entityViews.list.dialogAddTitle': '添加实体视图',
  'pages.entityViews.list.dialogEditTitle': '编辑实体视图',
  'pages.entityViews.list.save': '保存',
  'pages.entityViews.list.cancel': '取消',
  'pages.entityViews.list.toastSaved': '实体视图已保存。',
  'pages.entityViews.list.saveFailed': '保存实体视图失败：{reason}',
};
