/**
 * zh-CN widget editor contract/IO keys (`editor.widget.io.*`, M9 wave 3 D).
 * Covers the save chain (compile/smoke gates + 512KB soft limit + conflict
 * options), restore-last-saved, import/export and the new/derive dialog
 * copy. Shell-surface keys stay in editor-widget-editor.ts (wave S).
 * Keep zh-CN/en-US key-for-key identical (check-locale gate).
 */
export default {
  // save chain — gate aborts (compile / module execute / smoke render)
  'editor.widget.io.save.compileFailed': '保存中止：TSX 编译失败',
  'editor.widget.io.save.executeFailed': '保存中止：源码执行失败',
  'editor.widget.io.save.smokeFailed': '保存中止：组件冒烟渲染失败',
  'editor.widget.io.save.descriptorSoftLimit':
    '描述符已超过 512KB 软限制，仍会继续保存，但正接近数据库 1MB 硬上限。',
  'editor.widget.io.save.overwriteFailed':
    '覆盖失败：服务器版本仍在变化（已重试 3 次），请改用其他选项。',
  'editor.widget.io.save.loadServerFailed': '无法获取服务器最新版本。',

  // restore last saved
  'editor.widget.io.restore': '恢复上次保存',
  'editor.widget.io.restoreTitle': '恢复到上次保存的版本？',
  'editor.widget.io.restoreText':
    '当前草稿将回退到最近一次保存的状态。回退本身是一步可撤销的操作。',
  'editor.widget.io.restoreOk': '恢复',
  'editor.widget.io.restored': '已恢复到上次保存的版本',

  // import / export toolbar entries
  'editor.widget.io.export': '导出 JSON',
  'editor.widget.io.import': '导入',
  'editor.widget.io.exportFailed': '导出失败',

  // import dialog
  'editor.widget.io.importTitle': '导入 widget 类型',
  'editor.widget.io.importSource': '文件中的类型',
  'editor.widget.io.importReplace':
    '导入将替换当前草稿（一个可撤销的操作组），保存后才写入服务器。',
  'editor.widget.io.importConfirm': '导入并替换草稿',
  'editor.widget.io.importAngularBadge': 'Angular（非 react-1）',
  'editor.widget.io.importAngularText':
    '该文件是 Angular widget（无 react-1 运行时标记），源码无法在本编辑器打开，引用它的仪表盘按占位渲染。可以将其原样保存为服务器副本（描述符不做任何改写）。',
  'editor.widget.io.importSaveCopy': '保存为服务器副本',
  'editor.widget.io.importCopySaved': '已保存服务器副本。',
  'editor.widget.io.importCopyFailed': '保存副本失败',
  'editor.widget.io.importClose': '关闭',
  'editor.widget.io.importBrokenJson': '文件不是有效的 JSON，无法导入。',
  'editor.widget.io.importMissingName': '文件缺少 name 字段，无法导入。',
  'editor.widget.io.importMissingDescriptor':
    '文件缺少 descriptor 字段，无法导入。',
  'editor.widget.io.importReadFailed': '读取文件失败。',

  // new dialog — five React starter buckets
  'editor.widget.editor.dialog.new.pick': '选择一个 starter 模板。',
  'editor.widget.editor.dialog.new.pickHint':
    '每个模板自带 function 数据源，预览开箱即有随机数据。',
  'editor.widget.editor.dialog.new.confirm': '创建',
  'editor.widget.starter.latest.name': '最新值卡片',
  'editor.widget.starter.latest.desc': '函数数据源 + 最新值列表',
  'editor.widget.starter.timeseries.name': '时序折线图',
  'editor.widget.starter.timeseries.desc': '函数数据源 + recharts 折线图',
  'editor.widget.starter.rpc.name': 'RPC 控制按钮',
  'editor.widget.starter.rpc.desc': '两路 RPC 调用 + 结果回显',
  'editor.widget.starter.alarm.name': '告警状态卡',
  'editor.widget.starter.alarm.desc': '函数数据源 + 告警状态卡',
  'editor.widget.starter.static.name': '静态卡片',
  'editor.widget.starter.static.desc': '纯展示卡片（文案与配色可配置）',

  // derive dialog — two tiers
  'editor.widget.editor.dialog.derive.modeCustom': '从自定义类型',
  'editor.widget.editor.dialog.derive.modeBuiltin': '从内置类型',
  'editor.widget.editor.dialog.derive.customHint':
    '选择一个 react-1 自定义类型，源码（TSX/CSS/Schema/defaultConfig）全量复制为新副本。',
  'editor.widget.editor.dialog.derive.builtinHint':
    '内置类型是 Angular widget：源码不可得。仅复用其 Schema/defaultConfig/尺寸骨架，TSX 使用 starter 骨架（不会出现 Angular 源码）。',
  'editor.widget.editor.dialog.derive.name': '新类型名称',
  'editor.widget.editor.dialog.derive.pickSource': '选择来源类型',
  'editor.widget.editor.dialog.derive.loading': '正在加载类型列表…',
  'editor.widget.editor.dialog.derive.empty':
    '没有可派生的 react-1 自定义类型。',
  'editor.widget.editor.dialog.derive.loadFailed': '类型列表加载失败',
  'editor.widget.editor.dialog.derive.detailsFailed': '类型详情加载失败',
  'editor.widget.editor.dialog.derive.confirm': '派生',

  // save-as additions (title/ok/name live in editor-widget-editor.ts)
  'editor.widget.editor.dialog.saveAs.fqn': '新标识 fqn（短名，可选）',
  'editor.widget.editor.dialog.saveAs.fqnHint':
    '留空由服务端根据名称生成；fqn 保存后不可修改。',
  'editor.widget.editor.dialog.saveAs.fqnInvalid':
    '仅允许小写字母、数字与下划线',
};
