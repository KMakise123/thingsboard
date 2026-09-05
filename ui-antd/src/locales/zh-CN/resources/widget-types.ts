/**
 * zh-CN resources/widget-types keys (M11 wave 1B: widget types list +
 * detail face, template-select dialog, import/export dialogs).
 * Wording follows ui-ngx locale.constant-zh_CN.json (widget / widget-type
 * keys: 部件 / 部件类型 vocabulary).
 * Must stay key-for-key identical with en-US/resources/widget-types.ts
 * (check-locale).
 */
export default {
  // ---- list: table & filters ----
  'pages.resources.widgetTypes.createdTime': '创建时间',
  'pages.resources.widgetTypes.name': '名称',
  'pages.resources.widgetTypes.bundles': '部件包',
  'pages.resources.widgetTypes.kind': '部件类型',
  'pages.resources.widgetTypes.kindValue.timeseries': '时间序列',
  'pages.resources.widgetTypes.kindValue.latest': '最新值',
  'pages.resources.widgetTypes.kindValue.rpc': '控制部件',
  'pages.resources.widgetTypes.kindValue.alarm': '告警部件',
  'pages.resources.widgetTypes.kindValue.static': '静态部件',
  'pages.resources.widgetTypes.system': '系统',
  'pages.resources.widgetTypes.systemYes': '系统',
  'pages.resources.widgetTypes.deprecated': '已弃用',
  'pages.resources.widgetTypes.deprecatedYes': '已弃用',
  'pages.resources.widgetTypes.empty': '暂无部件类型',
  'pages.resources.widgetTypes.loadFailed': '加载部件类型列表失败',

  // ---- list: toolbar ----
  'pages.resources.widgetTypes.search': '搜索部件类型',
  'pages.resources.widgetTypes.deprecatedAll': '全部',
  'pages.resources.widgetTypes.deprecatedActual': '当前',
  'pages.resources.widgetTypes.deprecatedOnly': '已弃用',
  'pages.resources.widgetTypes.refresh': '刷新',
  'pages.resources.widgetTypes.selectedCount': '已选 {count} 项',
  'pages.resources.widgetTypes.total': '共 {count} 个',
  'pages.resources.widgetTypes.create': '创建新部件类型',
  'pages.resources.widgetTypes.import': '导入部件类型',

  // ---- list: row actions ----
  'pages.resources.widgetTypes.export': '导出部件类型',
  'pages.resources.widgetTypes.exportSelected': '导出所选',
  'pages.resources.widgetTypes.details': '部件详情',
  'pages.resources.widgetTypes.edit': '编辑部件',
  'pages.resources.widgetTypes.delete': '删除部件类型',
  'pages.resources.widgetTypes.deleteTitle': '确定要删除部件类型“{name}”吗？',
  'pages.resources.widgetTypes.deleteText':
    '请注意，确认后该部件类型将无法恢复。引用它的仪表盘会降级为占位显示。',

  // ---- list: toasts ----
  'pages.resources.widgetTypes.toastDeleted': '部件类型已删除。',
  'pages.resources.widgetTypes.toastImported': '部件类型“{name}”已导入。',

  // ---- template select dialog (ui-ngx select-widget-type parity) ----
  'pages.resources.widgetTypes.templateTitle': '选择部件类型',
  'pages.resources.widgetTypes.templateHint':
    '选择新部件类型的数据类别，编辑器将以匹配的模板打开。',
  'pages.resources.widgetTypes.templateConfirm': '创建',
  'pages.resources.widgetTypes.template.timeseries': '时间序列',
  'pages.resources.widgetTypes.template.latest': '最新值',
  'pages.resources.widgetTypes.template.rpc': '控制部件',
  'pages.resources.widgetTypes.template.alarm': '告警部件',
  'pages.resources.widgetTypes.template.static': '静态部件',

  // ---- export dialog ----
  'pages.resources.widgetTypes.exportTitle': '导出部件类型',
  'pages.resources.widgetTypes.exportOk': '导出',
  'pages.resources.widgetTypes.exportPrompt':
    '将 {count, plural, =1 {1 个部件类型} other {# 个部件类型}} 导出为可下载的文件吗？',
  'pages.resources.widgetTypes.exportIncludeResources':
    '嵌入部件图片和资源（自包含导出）',

  // ---- import dialog ----
  'pages.resources.widgetTypes.importTitle': '导入部件类型',
  'pages.resources.widgetTypes.importOk': '导入',
  'pages.resources.widgetTypes.importDropHint':
    '拖放部件类型 JSON 文件，或点击选择文件。',
  'pages.resources.widgetTypes.importHint':
    '文件中的 fqn 与现有部件类型一致时会更新该类型（updateExistingByFqn），否则创建新类型。',
  'pages.resources.widgetTypes.importParseError':
    '无法导入部件类型：文件不是有效的 JSON。',
  'pages.resources.widgetTypes.importInvalidError':
    '无法导入部件类型：无效的部件数据结构。',
  'pages.resources.widgetTypes.importFailed': '导入部件类型失败：{error}',
  'pages.resources.widgetTypes.cancel': '取消',

  // ---- detail face ----
  'pages.resources.widgetTypes.detailsLoading': '正在加载部件类型…',
  'pages.resources.widgetTypes.fqn': '全限定名',
  'pages.resources.widgetTypes.description': '描述',
  'pages.resources.widgetTypes.previewTitle': '预览',
  'pages.resources.widgetTypes.angularPreview':
    '该类型为 Angular 部件，本分支预览仅支持 react-1 类型。',
} as const;
