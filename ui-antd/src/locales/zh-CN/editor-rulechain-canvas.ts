/**
 * zh-CN rule-chain canvas editor keys (`editor.ruleChain.canvas.*`, M8 wave
 * C). Copy anchors: ui-ngx locale `rulechain.*` / `rulenode.*` sections.
 * Keep zh-CN/en-US key-for-key identical (check-locale gate). The shared
 * cross-wave copy lives in editor-rulechain.ts — never here.
 */
export default {
  // page
  'editor.ruleChain.canvas.loading': '加载规则链…',

  // toolbar
  'editor.ruleChain.canvas.toolbar.exit': '退出',
  'editor.ruleChain.canvas.toolbar.library': '节点库',
  'editor.ruleChain.canvas.toolbar.addNote': '添加便签',
  'editor.ruleChain.canvas.toolbar.search': '搜索节点',
  'editor.ruleChain.canvas.toolbar.exitDirtyTitle': '有未保存的更改',
  'editor.ruleChain.canvas.toolbar.exitDirtyText':
    '草稿存在未保存的更改，退出将丢弃这些更改。',
  'editor.ruleChain.canvas.toolbar.exitDirtyOk': '放弃更改',
  'editor.ruleChain.canvas.toolbar.saveFailed': '保存失败',
  'editor.ruleChain.canvas.saveConflict':
    '版本冲突：服务器上的规则链已被修改。冲突处理对话框将在 M8 波 3 提供。',

  // pane context menu (ui-ngx rulechain 空白右键菜单 parity)
  'editor.ruleChain.canvas.menu.copySelected': '复制所选',
  'editor.ruleChain.canvas.menu.paste': '粘贴',
  'editor.ruleChain.canvas.menu.addNote': '添加便签',
  'editor.ruleChain.canvas.menu.deselectAll': '取消全选',
  'editor.ruleChain.canvas.menu.createNestedChain': '创建嵌套规则链',
  'editor.ruleChain.canvas.menu.deleteSelected': '删除所选',
  'editor.ruleChain.canvas.menu.selectAll': '全选',
  'editor.ruleChain.canvas.menu.applyChanges': '应用更改',
  'editor.ruleChain.canvas.menu.discardChanges': '放弃更改',

  // node / edge / note context menus
  'editor.ruleChain.canvas.menu.details': '详情',
  'editor.ruleChain.canvas.menu.copy': '复制',
  'editor.ruleChain.canvas.menu.delete': '删除',
  'editor.ruleChain.canvas.menu.editNote': '编辑便签',

  // edge hover buttons
  'editor.ruleChain.canvas.edge.edit': '编辑链接标签',
  'editor.ruleChain.canvas.edge.delete': '删除链接',

  // add-node dialog
  'editor.ruleChain.canvas.addNode.title': '添加规则节点',
  'editor.ruleChain.canvas.addNode.name': '名称',
  'editor.ruleChain.canvas.addNode.nameRequired': '名称为必填项。',
  'editor.ruleChain.canvas.addNode.description': '描述',
  'editor.ruleChain.canvas.addNode.configuration': '配置',
  'editor.ruleChain.canvas.addNode.ok': '确定',

  // link labels dialog
  'editor.ruleChain.canvas.linkLabels.title': '链接标签',
  'editor.ruleChain.canvas.linkLabels.labels': '链接标签',
  'editor.ruleChain.canvas.linkLabels.required': '链接标签为必填项。',
  'editor.ruleChain.canvas.linkLabels.noLabelsFound': '未找到链接标签',
  'editor.ruleChain.canvas.linkLabels.createCustom': '创建一个新标签！',

  // note dialog
  'editor.ruleChain.canvas.note.addTitle': '添加便签',
  'editor.ruleChain.canvas.note.editTitle': '编辑便签',
  'editor.ruleChain.canvas.note.content': 'Markdown/HTML 内容',
  'editor.ruleChain.canvas.note.backgroundColor': '背景颜色',
  'editor.ruleChain.canvas.note.border': '边框',
  'editor.ruleChain.canvas.note.applyDefaultMarkdownStyle':
    '应用默认 Markdown 样式',
  'editor.ruleChain.canvas.note.customCss': '便签内容 CSS',

  // nested rule chain dialog
  'editor.ruleChain.canvas.nestedChain.title': '创建嵌套规则链',
  'editor.ruleChain.canvas.nestedChain.summary':
    '将选中的 {count} 个节点导出为新规则链。',
  'editor.ruleChain.canvas.nestedChain.name': '名称',
  'editor.ruleChain.canvas.nestedChain.nameRequired': '名称为必填项。',
  'editor.ruleChain.canvas.nestedChain.noNodes': '请先选择要导出的节点。',
  'editor.ruleChain.canvas.nestedChain.multipleEntries':
    '子图中无入边的入口节点最多只能有一个（当前 {count} 个）。',
  'editor.ruleChain.canvas.nestedChain.created': '嵌套规则链已创建',

  // node library
  'editor.ruleChain.canvas.library.empty': '无匹配节点',
  'editor.ruleChain.canvas.library.group.filter': '过滤',
  'editor.ruleChain.canvas.library.group.enrichment': '数据补充',
  'editor.ruleChain.canvas.library.group.transformation': '转换',
  'editor.ruleChain.canvas.library.group.action': '操作',
  'editor.ruleChain.canvas.library.group.external': '外部',
  'editor.ruleChain.canvas.library.group.flow': '流程',

  // details drawer (wave-3 K2 placeholder)
  'editor.ruleChain.canvas.details.title': '规则节点详情',
  'editor.ruleChain.canvas.details.name': '名称',
  'editor.ruleChain.canvas.details.clazz': '类型',
  'editor.ruleChain.canvas.details.configuration': '配置',
  'editor.ruleChain.canvas.details.placeholder':
    '详情表单与帮助将在 M8 波 3（K2）接入此抽屉。',
  'editor.ruleChain.canvas.details.eventsPlaceholder':
    '节点事件表将在 M8 波 3（D）接入。',
};
