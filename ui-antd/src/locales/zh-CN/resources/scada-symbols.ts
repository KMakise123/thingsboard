/**
 * SCADA 符号库（M11 波 2C，spec §3.3 库列表部分）。译名对齐 ui-ngx scada.* 词条。
 */
export default {
  // ---- 画廊工具栏 ----
  'pages.resources.scadaSymbols.listMode': '列表视图',
  'pages.resources.scadaSymbols.gridMode': '网格视图',
  'pages.resources.scadaSymbols.includeSystemImages': '包含系统符号',
  'pages.resources.scadaSymbols.search': '搜索符号',
  'pages.resources.scadaSymbols.refresh': '刷新',
  'pages.resources.scadaSymbols.upload': '上传 SCADA 符号',
  'pages.resources.scadaSymbols.import': '从 JSON 导入 SCADA 符号',
  'pages.resources.scadaSymbols.importHint':
    '选择导出的符号 JSON 文件进行导入。',
  'pages.resources.scadaSymbols.selectedImages':
    '已选择 {count, plural, =1 {1 个符号} other {# 个符号}}',
  'pages.resources.scadaSymbols.batchDelete': '删除所选',
  // ---- 列 ----
  'pages.resources.scadaSymbols.preview': '预览',
  'pages.resources.scadaSymbols.name': '名称',
  'pages.resources.scadaSymbols.createdTime': '创建时间',
  'pages.resources.scadaSymbols.resolution': '分辨率',
  'pages.resources.scadaSymbols.size': '大小',
  'pages.resources.scadaSymbols.system': '系统',
  'pages.resources.scadaSymbols.total': '共 {count} 条',
  'pages.resources.scadaSymbols.empty': '未找到符号',
  // ---- 行操作 ----
  'pages.resources.scadaSymbols.download': '下载 SCADA 符号',
  'pages.resources.scadaSymbols.export': '导出 SCADA 符号为 JSON',
  'pages.resources.scadaSymbols.edit': '编辑 SCADA 符号',
  'pages.resources.scadaSymbols.details': 'SCADA 符号详情',
  'pages.resources.scadaSymbols.delete': '删除 SCADA 符号',
  // ---- 删除流 ----
  'pages.resources.scadaSymbols.deleteTitle':
    '确定要删除 SCADA 符号“{title}”吗？',
  'pages.resources.scadaSymbols.deleteText':
    '请注意，确认后 SCADA 符号将无法恢复。',
  'pages.resources.scadaSymbols.deleteManyTitle':
    '确定要删除 {count, plural, =1 {1 个 SCADA 符号} other {# 个 SCADA 符号}}吗？',
  'pages.resources.scadaSymbols.deleteManyText':
    '请注意，确认后所有选中的 SCADA 符号将被移除，且所有相关数据将无法恢复。',
  'pages.resources.scadaSymbols.inUseTitle': 'SCADA 符号被其他实体使用',
  'pages.resources.scadaSymbols.inUseText':
    'SCADA 符号“{title}”未被删除，因为它被以下实体使用：',
  'pages.resources.scadaSymbols.inUseManyTitle': 'SCADA 符号被其他实体使用',
  'pages.resources.scadaSymbols.inUseManyText':
    '并非所有 SCADA 符号都已删除，因为它们被其他实体使用。可在下方勾选后强行删除。',
  'pages.resources.scadaSymbols.deleteInUse': '仍然删除',
  'pages.resources.scadaSymbols.cancel': '取消',
  'pages.resources.scadaSymbols.references': '引用',
  // ---- 反馈 ----
  'pages.resources.scadaSymbols.toastDeleted': 'SCADA 符号已删除。',
  'pages.resources.scadaSymbols.toastImported': 'SCADA 符号“{title}”已导入。',
  'pages.resources.scadaSymbols.batchResult': '{ok} 项成功，{fail} 项失败。',
  'pages.resources.scadaSymbols.loadFailed': '加载 SCADA 符号列表失败',
} as const;
