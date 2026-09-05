/**
 * SCADA 符号编辑器页（M11 波 2D，spec §3.3 编辑器部分）。
 * 译名对齐 ui-ngx scada.* 词条（general/tags/behavior/properties 四 tab）。
 */
export default {
  // ---- 页面 ----
  'pages.resources.scadaSymbolEditor.title': 'SCADA 符号编辑器',
  'pages.resources.scadaSymbolEditor.readonlyHint':
    '系统符号对租户只读，编辑控件已禁用。',
  // ---- 工具栏 ----
  'pages.resources.scadaSymbolEditor.save': '保存',
  'pages.resources.scadaSymbolEditor.preview': '预览',
  'pages.resources.scadaSymbolEditor.replaceSvg': '替换 SVG',
  'pages.resources.scadaSymbolEditor.download': '下载符号',
  'pages.resources.scadaSymbolEditor.createWidget': '从符号创建 Widget',
  'pages.resources.scadaSymbolEditor.metadata': '属性面板',
  'pages.resources.scadaSymbolEditor.zoomIn': '放大',
  'pages.resources.scadaSymbolEditor.zoomOut': '缩小',
  'pages.resources.scadaSymbolEditor.showHidden': '显示隐藏元素',
  'pages.resources.scadaSymbolEditor.modeSvg': '图形',
  'pages.resources.scadaSymbolEditor.modeXml': 'XML',
  // ---- 退出确认（M10 D1 受控形态）----
  'pages.resources.scadaSymbolEditor.exitDirtyTitle': '未保存的修改',
  'pages.resources.scadaSymbolEditor.exitDirtyText':
    '当前编辑内容尚未保存，离开将丢弃这些修改。',
  'pages.resources.scadaSymbolEditor.exitDirtyOk': '丢弃修改',
  // ---- 保存 / 校验消息 ----
  'pages.resources.scadaSymbolEditor.saveSuccess': '符号已保存',
  'pages.resources.scadaSymbolEditor.saveFailed': '符号保存失败：{message}',
  'pages.resources.scadaSymbolEditor.metadataInvalid':
    '属性面板存在校验错误，请先修正。',
  'pages.resources.scadaSymbolEditor.invalidXml': 'XML 内容无法解析，请先修正。',
  // ---- 画布 hover 面板 ----
  'pages.resources.scadaSymbolEditor.panel.addTag': '添加标签',
  'pages.resources.scadaSymbolEditor.panel.updateTag': '修改标签',
  'pages.resources.scadaSymbolEditor.panel.tagPlaceholder': '输入标签名',
  'pages.resources.scadaSymbolEditor.panel.apply': '应用',
  'pages.resources.scadaSymbolEditor.panel.cancel': '取消',
  'pages.resources.scadaSymbolEditor.panel.removeTag': '移除标签',
  'pages.resources.scadaSymbolEditor.panel.editStateRender': '标签渲染函数',
  'pages.resources.scadaSymbolEditor.panel.editClickAction': '点击动作函数',
  'pages.resources.scadaSymbolEditor.panel.hidden': '隐藏元素',
  // ---- metadata：general ----
  'pages.resources.scadaSymbolEditor.general.title': '标题',
  'pages.resources.scadaSymbolEditor.general.titleRequired': '标题必填',
  'pages.resources.scadaSymbolEditor.general.description': '描述',
  'pages.resources.scadaSymbolEditor.general.searchTags': '搜索标签',
  'pages.resources.scadaSymbolEditor.general.searchTagsPlaceholder':
    '输入后回车添加',
  'pages.resources.scadaSymbolEditor.general.sizeX': '宽度（格）',
  'pages.resources.scadaSymbolEditor.general.sizeY': '高度（格）',
  'pages.resources.scadaSymbolEditor.general.sizeRange': '取值范围 1-24',
  // ---- metadata：tags ----
  'pages.resources.scadaSymbolEditor.tags.title': '标签',
  'pages.resources.scadaSymbolEditor.tags.empty':
    '暂无标签。在画布中悬停元素即可添加标签。',
  'pages.resources.scadaSymbolEditor.tags.tagName': '标签',
  'pages.resources.scadaSymbolEditor.tags.stateRenderFunction': '状态渲染函数',
  'pages.resources.scadaSymbolEditor.tags.clickAction': '点击动作函数',
  'pages.resources.scadaSymbolEditor.tags.delete': '删除标签',
  // ---- metadata：behavior ----
  'pages.resources.scadaSymbolEditor.behavior.title': '行为',
  'pages.resources.scadaSymbolEditor.behavior.add': '添加行为',
  'pages.resources.scadaSymbolEditor.behavior.empty': '暂无行为。',
  'pages.resources.scadaSymbolEditor.behavior.name': '名称',
  'pages.resources.scadaSymbolEditor.behavior.id': 'ID',
  'pages.resources.scadaSymbolEditor.behavior.type': '类型',
  'pages.resources.scadaSymbolEditor.behavior.typeValue': '值（Value）',
  'pages.resources.scadaSymbolEditor.behavior.typeAction': '动作（Action）',
  'pages.resources.scadaSymbolEditor.behavior.typeWidgetAction':
    'Widget 动作（Widget Action）',
  'pages.resources.scadaSymbolEditor.behavior.valueType': '值类型',
  'pages.resources.scadaSymbolEditor.behavior.trueLabel': 'True 标签',
  'pages.resources.scadaSymbolEditor.behavior.falseLabel': 'False 标签',
  'pages.resources.scadaSymbolEditor.behavior.stateLabel': '状态标签',
  'pages.resources.scadaSymbolEditor.behavior.defaultSettings': '默认设置（JSON）',
  'pages.resources.scadaSymbolEditor.behavior.resetDefault': '恢复默认设置',
  'pages.resources.scadaSymbolEditor.behavior.settingsInvalidJson':
    '设置不是合法 JSON。',
  'pages.resources.scadaSymbolEditor.behavior.delete': '删除行为',
  // ---- metadata：properties ----
  'pages.resources.scadaSymbolEditor.properties.title': '属性',
  'pages.resources.scadaSymbolEditor.properties.add': '添加属性',
  'pages.resources.scadaSymbolEditor.properties.empty': '暂无属性。',
  'pages.resources.scadaSymbolEditor.properties.id': 'ID',
  'pages.resources.scadaSymbolEditor.properties.name': '名称',
  'pages.resources.scadaSymbolEditor.properties.type': '类型',
  'pages.resources.scadaSymbolEditor.properties.default': '默认值',
  'pages.resources.scadaSymbolEditor.properties.required': '必填',
  'pages.resources.scadaSymbolEditor.properties.delete': '删除属性',
  'pages.resources.scadaSymbolEditor.properties.moveUp': '上移',
  'pages.resources.scadaSymbolEditor.properties.moveDown': '下移',
  // ---- 静态预览 ----
  'pages.resources.scadaSymbolEditor.preview.title': '符号预览',
  'pages.resources.scadaSymbolEditor.preview.back': '返回编辑',
  'pages.resources.scadaSymbolEditor.preview.size': '按属性尺寸渲染（{sizeX}×{sizeY} 格）',
  // ---- 从符号创建 Widget ----
  'pages.resources.scadaSymbolEditor.createWidget.title': '从符号创建 Widget',
  'pages.resources.scadaSymbolEditor.createWidget.name': 'Widget 名称',
  'pages.resources.scadaSymbolEditor.createWidget.nameRequired': 'Widget 名称必填',
  'pages.resources.scadaSymbolEditor.createWidget.bundle': '加入 Widget 包（可选）',
  'pages.resources.scadaSymbolEditor.createWidget.bundlePlaceholder': '不加入任何包',
  'pages.resources.scadaSymbolEditor.createWidget.success': 'Widget 已创建',
  'pages.resources.scadaSymbolEditor.createWidget.gotoList': '查看 Widget 类型列表',
  'pages.resources.scadaSymbolEditor.createWidget.failed': 'Widget 创建失败',
};
