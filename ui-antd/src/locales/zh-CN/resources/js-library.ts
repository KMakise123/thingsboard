/**
 * JS 库（M11 波 1A，spec §3.4）。
 */
export default {
  // ---- 列表 ----
  'pages.resources.jsLibrary.search': '搜索脚本',
  'pages.resources.jsLibrary.subTypePlaceholder': '全部脚本类型',
  'pages.resources.jsLibrary.createdTime': '创建时间',
  'pages.resources.jsLibrary.title': '标题',
  'pages.resources.jsLibrary.scriptType': '脚本类型',
  'pages.resources.jsLibrary.system': '系统',
  'pages.resources.jsLibrary.subType.extension': '扩展',
  'pages.resources.jsLibrary.subType.module': '模块',
  // ---- 操作 ----
  'pages.resources.jsLibrary.refresh': '刷新',
  'pages.resources.jsLibrary.add': '新建脚本',
  'pages.resources.jsLibrary.edit': '编辑脚本',
  'pages.resources.jsLibrary.fieldTitle': '标题',
  'pages.resources.jsLibrary.fieldSubType': '脚本类型',
  'pages.resources.jsLibrary.fieldContent': '代码',
  'pages.resources.jsLibrary.fieldFile': '文件',
  'pages.resources.jsLibrary.upload': '上传文件',
  'pages.resources.jsLibrary.uploadHint': '点击或拖拽 .js 文件到此处上传',
  'pages.resources.jsLibrary.download': '下载',
  'pages.resources.jsLibrary.delete': '删除',
  'pages.resources.jsLibrary.batchDelete': '删除所选',
  'pages.resources.jsLibrary.selectedCount': '已选 {count} 项',
  'pages.resources.jsLibrary.titleRequired': '请输入标题',
  // ---- 删除流 ----
  'pages.resources.jsLibrary.deleteOneTitle': '确定要删除脚本“{title}”吗？',
  'pages.resources.jsLibrary.deleteOneText': '请注意，确认后脚本将不可恢复。',
  'pages.resources.jsLibrary.deleteManyTitle':
    '确定要删除 {count, plural, =1 {1 个脚本} other {# 个脚本}}吗？',
  'pages.resources.jsLibrary.deleteManyText': '请注意，确认后所有所选脚本都将被移除，且不可恢复。',
  'pages.resources.jsLibrary.inUseTitle': '脚本正被引用',
  'pages.resources.jsLibrary.inUseText':
    '“{title}”仍被下列实体引用，强行删除会导致引用处失效。',
  'pages.resources.jsLibrary.inUseManyTitle': '脚本正被引用',
  'pages.resources.jsLibrary.inUseManyText':
    '下列脚本仍被其他实体引用，勾选后可强行删除。',
  'pages.resources.jsLibrary.deleteInUse': '仍要删除',
  'pages.resources.jsLibrary.cancel': '取消',
  // ---- 反馈 ----
  'pages.resources.jsLibrary.toastDeleted': '脚本已删除。',
  'pages.resources.jsLibrary.toastSaved': '脚本已保存。',
  'pages.resources.jsLibrary.batchResult': '{ok} 项成功，{fail} 项失败。',
  'pages.resources.jsLibrary.loadFailed': '加载脚本列表失败',
  'pages.resources.jsLibrary.empty': '暂无脚本',
  'pages.resources.jsLibrary.total': '共 {count} 条',
} as const;
