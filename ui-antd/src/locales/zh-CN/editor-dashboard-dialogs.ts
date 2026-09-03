/**
 * zh-CN editor dashboard dialog keys (`editor.dashboard.dialogs.*`, M7
 * brief §3 P wave). Keep zh-CN/en-US key-for-key identical (check-locale
 * gate). Keys shared with the editor-common domain stay in editor.ts.
 */
export default {
  // move-widgets (§3.3)
  'editor.dashboard.dialogs.moveWidgets.title': '移动所有 widget',
  'editor.dashboard.dialogs.moveWidgets.move': '移动',
  'editor.dashboard.dialogs.moveWidgets.layout': '布局',
  'editor.dashboard.dialogs.moveWidgets.cols': '列偏移量',
  'editor.dashboard.dialogs.moveWidgets.rows': '行偏移量',
  'editor.dashboard.dialogs.moveWidgets.empty': '当前布局没有可移动的 widget。',

  // manage-states (§3.5)
  'editor.dashboard.dialogs.states.title': '管理仪表盘状态',
  'editor.dashboard.dialogs.states.add': '添加状态',
  'editor.dashboard.dialogs.states.addTitle': '添加仪表盘状态',
  'editor.dashboard.dialogs.states.editTitle': '编辑仪表盘状态',
  'editor.dashboard.dialogs.states.edit': '编辑',
  'editor.dashboard.dialogs.states.remove': '删除',
  'editor.dashboard.dialogs.states.name': '名称',
  'editor.dashboard.dialogs.states.id': '状态 ID',
  'editor.dashboard.dialogs.states.root': '根状态',
  'editor.dashboard.dialogs.states.rootYes': '根状态',
  'editor.dashboard.dialogs.states.isRoot': '根状态',
  'editor.dashboard.dialogs.states.actions': '操作',
  'editor.dashboard.dialogs.states.nameRequired': '状态名称必填。',
  'editor.dashboard.dialogs.states.nameExists': '状态名称已存在。',
  'editor.dashboard.dialogs.states.idRequired': '状态 ID 必填。',
  'editor.dashboard.dialogs.states.idExists': '状态 ID 已存在。',

  // manage-layouts (§3.5 / §3.6)
  'editor.dashboard.dialogs.layouts.title': '管理布局',
  'editor.dashboard.dialogs.layouts.type': '布局类型',
  'editor.dashboard.dialogs.layouts.default': '默认',
  'editor.dashboard.dialogs.layouts.divider': '分栏（左 + 右）',
  'editor.dashboard.dialogs.layouts.scada': 'SCADA',
  'editor.dashboard.dialogs.layouts.layouts': '布局',
  'editor.dashboard.dialogs.layouts.settings': '布局设置',
  'editor.dashboard.dialogs.layouts.breakpoints': '断点',
  'editor.dashboard.dialogs.layouts.addBreakpoint': '添加断点',
  'editor.dashboard.dialogs.layouts.defaultBreakpoint': '默认',

  // add-breakpoint (§3.5)
  'editor.dashboard.dialogs.breakpoint.title': '添加新断点',
  'editor.dashboard.dialogs.breakpoint.breakpoint': '断点',
  'editor.dashboard.dialogs.breakpoint.copyFrom': '复制自',
  'editor.dashboard.dialogs.breakpoint.exhausted': '所有断点均已定义。',
  'editor.dashboard.dialogs.breakpoint.switcher': '预览断点',

  // dashboard-settings（§3.5，dashboard 模式）
  'editor.dashboard.dialogs.settings.title': '仪表盘设置',
  'editor.dashboard.dialogs.settings.stateController': '状态控制器',
  'editor.dashboard.dialogs.settings.controllerDefault': '默认',
  'editor.dashboard.dialogs.settings.controllerEntity': '实体',
  'editor.dashboard.dialogs.settings.showTitle': '显示仪表盘标题',
  'editor.dashboard.dialogs.settings.titleColor': '标题颜色',
  'editor.dashboard.dialogs.settings.showLogo': '显示仪表盘 Logo',
  'editor.dashboard.dialogs.settings.logoUrl': 'Logo 图片地址',
  'editor.dashboard.dialogs.settings.hideToolbar': '隐藏工具栏',
  'editor.dashboard.dialogs.settings.toolbarAlwaysOpen': '工具栏常开',
  'editor.dashboard.dialogs.settings.showDashboardsSelect': '显示仪表盘选择器',
  'editor.dashboard.dialogs.settings.showEntitiesSelect': '显示实体选择器',
  'editor.dashboard.dialogs.settings.showFilters': '显示过滤器',
  'editor.dashboard.dialogs.settings.showTimewindow': '显示时间窗口',
  'editor.dashboard.dialogs.settings.showExport': '显示导出',
  'editor.dashboard.dialogs.settings.showUpdateImage': '显示更新仪表盘图片',
  'editor.dashboard.dialogs.settings.dashboardCss': '仪表盘 CSS',
  'editor.dashboard.dialogs.settings.dashboardCssHint':
    '应用于仪表盘的普通 CSS，会作为样式表加入页面。',

  // dashboard-settings（§3.5/§3.6，布局范围复用模式）
  'editor.dashboard.dialogs.gridSettings.title': '布局设置',
  'editor.dashboard.dialogs.gridSettings.columns': '列数',
  'editor.dashboard.dialogs.gridSettings.minColumns': '最小列数',
  'editor.dashboard.dialogs.gridSettings.margin': '边距',
  'editor.dashboard.dialogs.gridSettings.outerMargin': '外边距',
  'editor.dashboard.dialogs.gridSettings.autoFillHeight': '自动填满高度',
  'editor.dashboard.dialogs.gridSettings.rowHeight': '行高',
  'editor.dashboard.dialogs.gridSettings.backgroundColor': '背景颜色',
  'editor.dashboard.dialogs.gridSettings.backgroundImageUrl': '背景图片地址',
  'editor.dashboard.dialogs.gridSettings.backgroundSizeMode': '背景尺寸模式',
  'editor.dashboard.dialogs.gridSettings.mobileAutoFillHeight':
    '移动端自动填满高度',
  'editor.dashboard.dialogs.gridSettings.mobileRowHeight': '移动端行高',

  // dashboard-image（§3.5，非编辑态工具栏入口）
  'editor.dashboard.dialogs.image.title': '更新仪表盘图片',
  'editor.dashboard.dialogs.image.empty': '尚未设置仪表盘图片。',
  'editor.dashboard.dialogs.image.upload': '上传图片',
  'editor.dashboard.dialogs.image.clear': '清除图片',

  // manage-aliases + alias（§3.5）
  'editor.dashboard.dialogs.aliases.title': '实体别名',
  'editor.dashboard.dialogs.aliases.add': '添加别名',
  'editor.dashboard.dialogs.aliases.edit': '编辑别名',
  'editor.dashboard.dialogs.aliases.remove': '删除别名',
  'editor.dashboard.dialogs.aliases.inUse':
    '别名正在被 widget 使用，无法删除。',
  'editor.dashboard.dialogs.aliases.empty': '尚未配置实体别名。',
  'editor.dashboard.dialogs.alias.title': '实体别名',
  'editor.dashboard.dialogs.alias.name': '名称',
  'editor.dashboard.dialogs.alias.nameRequired': '别名名称必填。',
  'editor.dashboard.dialogs.alias.nameExists': '别名名称已存在。',
  'editor.dashboard.dialogs.alias.filterType': '过滤器类型',
  'editor.dashboard.dialogs.alias.entityType': '实体类型',
  'editor.dashboard.dialogs.alias.entityId': '实体 ID',
  'editor.dashboard.dialogs.alias.entityIdRequired': '实体 ID 必填。',
  'editor.dashboard.dialogs.alias.stateEntityParamName': '状态实体参数名',
  'editor.dashboard.dialogs.alias.deviceTypes': '设备类型',
  'editor.dashboard.dialogs.alias.deviceNameFilter': '设备名称过滤',
  'editor.dashboard.dialogs.alias.direction': '方向',
  'editor.dashboard.dialogs.alias.maxLevel': '最大关系层级',
  'editor.dashboard.dialogs.alias.rootStateEntity': '从仪表盘状态取根实体',
  'editor.dashboard.dialogs.alias.resolveMultiple': '解析多个实体',

  // filters（§3.5）
  'editor.dashboard.dialogs.filters.title': '过滤器',
  'editor.dashboard.dialogs.filters.editorTitle': '过滤器',
  'editor.dashboard.dialogs.filters.add': '添加过滤器',
  'editor.dashboard.dialogs.filters.edit': '编辑过滤器',
  'editor.dashboard.dialogs.filters.remove': '删除过滤器',
  'editor.dashboard.dialogs.filters.inUse':
    '过滤器正在被 widget 使用，无法删除。',
  'editor.dashboard.dialogs.filters.empty': '尚未配置过滤器。',
  'editor.dashboard.dialogs.filters.name': '过滤器名称',
  'editor.dashboard.dialogs.filters.nameRequired': '过滤器名称必填。',
  'editor.dashboard.dialogs.filters.nameExists': '过滤器名称已存在。',
  'editor.dashboard.dialogs.filters.editable': '允许用户编辑',
  'editor.dashboard.dialogs.filters.keyFilters': '键过滤器（JSON）',
  'editor.dashboard.dialogs.filters.keyFiltersInvalid':
    '键过滤器必须是 JSON 数组。',
};
