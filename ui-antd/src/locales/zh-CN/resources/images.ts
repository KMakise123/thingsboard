/**
 * 图片库（M11 波 2C，spec §3.2）。译名对齐 ui-ngx image.* 词条。
 */
export default {
  // ---- 画廊工具栏 ----
  'pages.resources.images.listMode': '列表视图',
  'pages.resources.images.gridMode': '网格视图',
  'pages.resources.images.includeSystemImages': '包含系统图片',
  'pages.resources.images.search': '搜索图片',
  'pages.resources.images.refresh': '刷新',
  'pages.resources.images.upload': '上传图片',
  'pages.resources.images.import': '从 JSON 导入图片',
  'pages.resources.images.importHint': '选择导出的图片 JSON 文件进行导入。',
  'pages.resources.images.selectedImages':
    '已选择 {count, plural, =1 {1 张图片} other {# 张图片}}',
  'pages.resources.images.batchDelete': '删除所选',
  // ---- 列 ----
  'pages.resources.images.preview': '预览',
  'pages.resources.images.name': '名称',
  'pages.resources.images.createdTime': '创建时间',
  'pages.resources.images.resolution': '分辨率',
  'pages.resources.images.size': '大小',
  'pages.resources.images.system': '系统',
  'pages.resources.images.total': '共 {count} 条',
  'pages.resources.images.empty': '未找到图片',
  // ---- 行操作 ----
  'pages.resources.images.download': '下载图片',
  'pages.resources.images.export': '导出图片为 JSON',
  'pages.resources.images.embed': '嵌入图片',
  'pages.resources.images.edit': '编辑图片',
  'pages.resources.images.details': '图片详情',
  'pages.resources.images.delete': '删除图片',
  // ---- 上传 ----
  'pages.resources.images.fieldFile': '文件',
  'pages.resources.images.fieldTitle': '标题',
  'pages.resources.images.uploadHint': '点击或拖拽文件到此处上传',
  'pages.resources.images.uploadFileRequired': '请先选择要上传的文件。',
  'pages.resources.images.nameRequired': '名称为必填项。',
  // ---- 详情 ----
  'pages.resources.images.detailsTitle': '图片详情',
  'pages.resources.images.save': '保存',
  'pages.resources.images.mediaType': '媒体类型',
  'pages.resources.images.link': '链接',
  // ---- 嵌入公链 ----
  'pages.resources.images.publicLinkSwitch': '公开（对未授权用户可用）',
  'pages.resources.images.embedCode': '嵌入代码',
  'pages.resources.images.embedHint':
    '打开公开开关后，将生成免登链接与嵌入代码。',
  'pages.resources.images.close': '关闭',
  // ---- 删除流 ----
  'pages.resources.images.deleteTitle': '确定要删除图片“{title}”吗？',
  'pages.resources.images.deleteText': '请注意，确认后图片将无法恢复。',
  'pages.resources.images.deleteManyTitle':
    '确定要删除 {count, plural, =1 {1 张图片} other {# 张图片}}吗？',
  'pages.resources.images.deleteManyText':
    '请注意，确认后所有选中的图片将被移除，且所有相关数据将无法恢复。',
  'pages.resources.images.inUseTitle': '图片被其他实体使用',
  'pages.resources.images.inUseText':
    '图片“{title}”未被删除，因为它被以下实体使用：',
  'pages.resources.images.inUseManyTitle': '图片被其他实体使用',
  'pages.resources.images.inUseManyText':
    '并非所有图片都已删除，因为它们被其他实体使用。可在下方勾选后强行删除。',
  'pages.resources.images.deleteInUse': '仍然删除',
  'pages.resources.images.cancel': '取消',
  'pages.resources.images.references': '引用',
  // ---- 反馈 ----
  'pages.resources.images.toastSaved': '图片已保存。',
  'pages.resources.images.toastDeleted': '图片已删除。',
  'pages.resources.images.toastImported': '图片“{title}”已导入。',
  'pages.resources.images.batchResult': '{ok} 项成功，{fail} 项失败。',
  'pages.resources.images.loadFailed': '加载图片列表失败',
  'pages.resources.images.importParseError': '无法解析图片 JSON 文件。',
  'pages.resources.images.importInvalidError':
    '无法从 JSON 导入图片：无效的图片 JSON 数据结构。',
} as const;
