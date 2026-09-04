/**
 * zh-CN widget editor shell keys (`editor.widget.editor.*`, M9 wave S).
 * The domain seed (`editor.widget.*` in editor-widget.ts) carries the
 * widget-type domain copy; THIS file is the editor shell surface (toolbar /
 * tabs / metadata sidebar / preview + console / help / dialogs).
 * Keep zh-CN/en-US key-for-key identical (check-locale gate).
 */
export default {
  // page
  'editor.widget.editor.loading': '加载 widget 类型…',
  'editor.widget.editor.angularType':
    '该类型是 Angular widget（无 react-1 运行时标记），不支持直接编辑源码。',
  'editor.widget.editor.angularTypeDerive': '受限派生入口随派生对话框提供。',
  'editor.widget.editor.createEntryTitle': 'widget 编辑器',
  'editor.widget.editor.createEmptyText':
    '从仪表盘或 widget 库进入编辑器；库列表入口由资源库子系统提供。',
  'editor.widget.editor.createOpen': '新建 widget',

  // toolbar
  'editor.widget.editor.toolbar.save': '保存',
  'editor.widget.editor.toolbar.saveAs': '另存为',
  'editor.widget.editor.toolbar.run': '运行',
  'editor.widget.editor.toolbar.tidy': '格式化',
  'editor.widget.editor.toolbar.undo': '撤销',
  'editor.widget.editor.toolbar.redo': '重做',
  'editor.widget.editor.toolbar.fullscreen': '全屏',
  'editor.widget.editor.toolbar.exitFullscreen': '退出全屏',
  'editor.widget.editor.toolbar.metadata': '元数据',
  'editor.widget.editor.toolbar.exit': '退出',
  'editor.widget.editor.toolbar.help': '快捷键',
  'editor.widget.editor.toolbar.exitDirtyTitle': '有未保存的更改',
  'editor.widget.editor.toolbar.exitDirtyText':
    '草稿存在未保存的更改，退出将丢弃这些更改。',
  'editor.widget.editor.toolbar.exitDirtyOk': '放弃更改',
  'editor.widget.editor.toolbar.tidyFailed': '格式化失败',
  'editor.widget.editor.toolbar.saved': '已保存',

  // tabs
  'editor.widget.editor.tab.tsx': 'TSX',
  'editor.widget.editor.tab.css': 'CSS',
  'editor.widget.editor.tab.schema': 'Schema',
  'editor.widget.editor.tab.defaultConfig': 'defaultConfig',

  // preview + console
  'editor.widget.editor.preview.title': '预览',
  'editor.widget.editor.preview.pending': '预览面板',
  'editor.widget.editor.preview.runId': '运行序号',
  'editor.widget.editor.console.title': '控制台',
  'editor.widget.editor.console.empty': '暂无输出',
  'editor.widget.editor.console.clear': '清空',

  // metadata sidebar
  'editor.widget.editor.metadata.title': '元数据',
  'editor.widget.editor.metadata.fqn': '标识（fqn）',
  'editor.widget.editor.metadata.fqnImmutable': '保存后由服务端固定',
  'editor.widget.editor.metadata.name': '名称',
  'editor.widget.editor.metadata.type': '类型',
  'editor.widget.editor.metadata.sizeX': '宽（格）',
  'editor.widget.editor.metadata.sizeY': '高（格）',
  'editor.widget.editor.metadata.typeParameters': '类型参数（JSON）',
  'editor.widget.editor.metadata.typeParametersInvalid':
    'JSON 解析失败，保留上次有效值',
  'editor.widget.editor.metadata.actionSources': '操作源',
  'editor.widget.editor.metadata.actionSources.key': '源标识',
  'editor.widget.editor.metadata.actionSources.name': '显示名',
  'editor.widget.editor.metadata.actionSources.multiple': '可多绑定',
  'editor.widget.editor.metadata.actionSources.add': '添加操作源',

  // widget kinds（新建五桶）
  'editor.widget.editor.kind.timeseries': '时序数据',
  'editor.widget.editor.kind.latest': '最新值',
  'editor.widget.editor.kind.rpc': '控制（RPC）',
  'editor.widget.editor.kind.alarm': '告警',
  'editor.widget.editor.kind.static': '静态',

  // help drawer
  'editor.widget.editor.help.title': '快捷键',
  'editor.widget.editor.help.save': '保存',
  'editor.widget.editor.help.saveAs': '另存为',
  'editor.widget.editor.help.run': '运行（重编译预览）',
  'editor.widget.editor.help.tidy': '格式化当前代码页',
  'editor.widget.editor.help.exit': '退出编辑器',
  'editor.widget.editor.help.undo':
    '撤销（焦点在代码编辑器内归编辑器自身栈；在表单或页面归编辑会话）',
  'editor.widget.editor.help.redo': '重做（焦点归属同撤销）',
  'editor.widget.editor.help.help': '打开快捷键帮助',

  // dialogs（波 3 D 冻结路径；占位期文案）
  'editor.widget.editor.dialog.new.title': '新建 widget',
  'editor.widget.editor.dialog.new.pending':
    '起步模板选择将在此提供（latest-values / timeseries / rpc / alarm / static）。',
  'editor.widget.editor.dialog.derive.title': '派生 widget',
  'editor.widget.editor.dialog.derive.pending':
    '从现有自定义类型全量派生、从内置类型受限派生的入口将在此提供。',
  'editor.widget.editor.dialog.saveAs.title': '另存为',
  'editor.widget.editor.dialog.saveAs.name': '新名称',
  'editor.widget.editor.dialog.saveAs.ok': '创建副本草稿',
};
