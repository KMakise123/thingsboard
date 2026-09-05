/**
 * 资源文件库（M11 波 1A，spec §3.5）。entityTypes.* 一段是资源家族共用的
 * 「被引用实体类型」显示名（删除流对话框），图片库（波 2C）直接复用同名 key。
 */
export default {
  // ---- 列表 ----
  'pages.resources.library.search': '搜索资源',
  'pages.resources.library.typePlaceholder': '全部资源类型',
  'pages.resources.library.createdTime': '创建时间',
  'pages.resources.library.title': '标题',
  'pages.resources.library.resourceType': '资源类型',
  'pages.resources.library.fileName': '文件名',
  'pages.resources.library.system': '系统',
  'pages.resources.library.type.lwm2mModel': 'LwM2M 模型',
  'pages.resources.library.type.pkcs12': 'PKCS #12',
  'pages.resources.library.type.jks': 'JKS',
  'pages.resources.library.type.general': '通用',
  'pages.resources.library.type.jsModule': 'JavaScript 模块',
  // ---- 被引用实体类型（资源家族删除流共用） ----
  'pages.resources.library.entityTypes.WIDGET_TYPE': 'widget 类型',
  'pages.resources.library.entityTypes.WIDGETS_BUNDLE': 'widget 包',
  'pages.resources.library.entityTypes.DASHBOARD': '仪表盘',
  'pages.resources.library.entityTypes.RULE_CHAIN': '规则链',
  'pages.resources.library.entityTypes.DEVICE_PROFILE': '设备配置',
  'pages.resources.library.entityTypes.ASSET_PROFILE': '资产配置',
  'pages.resources.library.entityTypes.DEVICE': '设备',
  'pages.resources.library.entityTypes.ASSET': '资产',
  'pages.resources.library.entityTypes.ENTITY_VIEW': '实体视图',
  'pages.resources.library.entityTypes.CUSTOMER': '客户',
  'pages.resources.library.entityTypes.USER': '用户',
  'pages.resources.library.entityTypes.TENANT': '租户',
  // ---- 操作 ----
  'pages.resources.library.refresh': '刷新',
  'pages.resources.library.upload': '上传资源',
  'pages.resources.library.uploadTitle': '上传文件',
  'pages.resources.library.uploadHint':
    '点击或拖拽文件到此处上传，可一次选择多个文件',
  'pages.resources.library.edit': '编辑信息',
  'pages.resources.library.editTitle': '编辑资源信息',
  'pages.resources.library.formTitle': '标题',
  'pages.resources.library.download': '下载',
  'pages.resources.library.delete': '删除',
  'pages.resources.library.batchDelete': '删除所选',
  'pages.resources.library.selectedCount': '已选 {count} 项',
  // ---- 删除流 ----
  'pages.resources.library.deleteOneTitle': '确定要删除资源“{title}”吗？',
  'pages.resources.library.deleteOneText': '请注意，确认后资源将不可恢复。',
  'pages.resources.library.deleteManyTitle':
    '确定要删除 {count, plural, =1 {1 个资源} other {# 个资源}}吗？',
  'pages.resources.library.deleteManyText':
    '请注意，确认后所有所选资源都将被移除，且不可恢复。',
  'pages.resources.library.inUseTitle': '资源正被引用',
  'pages.resources.library.inUseText':
    '“{title}”仍被下列实体引用，强行删除会导致引用处失效。',
  'pages.resources.library.inUseManyTitle': '资源正被引用',
  'pages.resources.library.inUseManyText':
    '下列资源仍被其他实体引用，勾选后可强行删除。',
  'pages.resources.library.deleteInUse': '仍要删除',
  'pages.resources.library.cancel': '取消',
  'pages.resources.library.references': '引用',
  // ---- 反馈 ----
  'pages.resources.library.toastDeleted': '资源已删除。',
  'pages.resources.library.toastUpdated': '资源信息已更新。',
  'pages.resources.library.batchResult': '{ok} 项成功，{fail} 项失败。',
  'pages.resources.library.loadFailed': '加载资源列表失败',
  'pages.resources.library.empty': '暂无资源',
  'pages.resources.library.total': '共 {count} 条',
} as const;
