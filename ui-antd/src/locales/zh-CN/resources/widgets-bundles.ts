/**
 * zh-CN resources/widgets-bundles keys (M11 wave 1B: widgets bundles list
 * + create/edit + import/export dialogs + bundle widgets manager).
 * Wording follows ui-ngx locale.constant-zh_CN.json (widgets-bundle keys:
 * 部件包 vocabulary).
 * Must stay key-for-key identical with en-US/resources/widgets-bundles.ts
 * (check-locale).
 */
export default {
  // ---- list: table & filters ----
  'pages.resources.widgetsBundles.createdTime': '创建时间',
  'pages.resources.widgetsBundles.title': '标题',
  'pages.resources.widgetsBundles.system': '系统',
  'pages.resources.widgetsBundles.systemYes': '系统',
  'pages.resources.widgetsBundles.empty': '暂无部件包',
  'pages.resources.widgetsBundles.loadFailed': '加载部件包列表失败',

  // ---- list: toolbar ----
  'pages.resources.widgetsBundles.search': '搜索部件包',
  'pages.resources.widgetsBundles.refresh': '刷新',
  'pages.resources.widgetsBundles.total': '共 {count} 个',
  'pages.resources.widgetsBundles.create': '创建新部件包',
  'pages.resources.widgetsBundles.import': '导入部件包',

  // ---- list: row actions ----
  'pages.resources.widgetsBundles.export': '导出部件包',
  'pages.resources.widgetsBundles.edit': '编辑部件包',
  'pages.resources.widgetsBundles.delete': '删除部件包',
  'pages.resources.widgetsBundles.deleteTitle': '确定要删除部件包“{title}”吗？',
  'pages.resources.widgetsBundles.deleteText':
    '请注意，确认后该部件包将无法恢复。包内的部件类型不受影响。',

  // ---- list: toasts ----
  'pages.resources.widgetsBundles.toastSaved': '部件包已保存。',
  'pages.resources.widgetsBundles.toastDeleted': '部件包已删除。',
  'pages.resources.widgetsBundles.toastImported': '部件包“{title}”已导入。',

  // ---- create / edit dialog ----
  'pages.resources.widgetsBundles.createTitle': '创建新部件包',
  'pages.resources.widgetsBundles.editTitle': '编辑部件包',
  'pages.resources.widgetsBundles.save': '保存',
  'pages.resources.widgetsBundles.titleRequired': '标题为必填项。',
  'pages.resources.widgetsBundles.description': '描述',
  'pages.resources.widgetsBundles.image': '图片',

  // ---- export dialog ----
  'pages.resources.widgetsBundles.exportTitle': '导出部件包',
  'pages.resources.widgetsBundles.exportOk': '导出',
  'pages.resources.widgetsBundles.exportPrompt':
    '确定要导出部件包“{title}”吗？',
  'pages.resources.widgetsBundles.exportIncludeWidgets':
    '在导出数据中包含包内部件（否则仅导出引用的部件 FQN）',

  // ---- import dialog ----
  'pages.resources.widgetsBundles.importTitle': '导入部件包',
  'pages.resources.widgetsBundles.importOk': '导入',
  'pages.resources.widgetsBundles.importDropHint':
    '拖放部件包 JSON 文件，或点击选择文件。',
  'pages.resources.widgetsBundles.importHint':
    '携带的部件类型走 updateExistingByFqn 通道导入；部件包成员关系由类型与 FQN 引用共同重建。',
  'pages.resources.widgetsBundles.importParseError':
    '无法导入部件包：文件不是有效的 JSON。',
  'pages.resources.widgetsBundles.importInvalidError':
    '无法导入部件包：无效的部件包数据结构。',
  'pages.resources.widgetsBundles.importFailed': '导入部件包失败：{error}',
  'pages.resources.widgetsBundles.cancel': '取消',

  // ---- bundle widgets manager ----
  'pages.resources.bundleWidgets.title': '包内部件',
  'pages.resources.bundleWidgets.loading': '正在加载部件包…',
  'pages.resources.bundleWidgets.edit': '编辑',
  'pages.resources.bundleWidgets.save': '保存',
  'pages.resources.bundleWidgets.cancel': '取消',
  'pages.resources.bundleWidgets.readOnly':
    '该部件包为系统资源——当前会话只读。',
  'pages.resources.bundleWidgets.empty': '该部件包还没有部件类型。',
  'pages.resources.bundleWidgets.add': '添加部件类型',
  'pages.resources.bundleWidgets.addTitle': '添加部件类型到部件包',
  'pages.resources.bundleWidgets.addPlaceholder': '按名称搜索部件类型',
  'pages.resources.bundleWidgets.addTenantHint':
    '系统部件类型不能加入自有部件包：选择器仅列出本租户自有的部件类型。',
  'pages.resources.bundleWidgets.moveUp': '上移',
  'pages.resources.bundleWidgets.moveDown': '下移',
  'pages.resources.bundleWidgets.remove': '移除部件',
  'pages.resources.bundleWidgets.toastSaved': '包内部件已保存。',
} as const;
