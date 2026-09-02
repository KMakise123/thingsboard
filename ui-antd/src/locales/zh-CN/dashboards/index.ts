/**
 * zh-CN dashboards 域文案（M5）。 Must stay key-for-key identical with
 * en-US/dashboards/index.ts (check-locale).
 */
export default {
  // ---- widget 占位（ADR 0003 三态 + W2 待实现位） ----
  'dashboards.widget.unsupported': '暂未支持',
  'dashboards.widget.unsupportedAngular':
    '该组件暂未支持（Angular 版组件），将在后续版本提供',
  'dashboards.widget.unsupportedCustom':
    '自定义组件暂未支持，将在编辑器上线后提供',
  'dashboards.widget.missing': '组件不存在或已被移除',
  'dashboards.widget.pending': '组件开发中，即将提供',

  // ---- W2 widget 实体（brief §1.8 / §6） ----
  'dashboards.widget.chart.noData': '该窗口内暂无数值数据',
  'dashboards.widget.legend.min': '最小',
  'dashboards.widget.legend.max': '最大',
  'dashboards.widget.legend.avg': '平均',
  'dashboards.widget.legend.total': '总和',
  'dashboards.widget.legend.latest': '最新',
  'dashboards.widget.table.entity': '实体',
  'dashboards.widget.table.timestamp': '时间',
  'dashboards.widget.table.search': '搜索',
  'dashboards.widget.map.noLocation': '暂无位置数据',
  'dashboards.widget.map.details': '查看详情',
  'dashboards.widget.attributes.saved': '属性已保存',
  'dashboards.widget.attributes.saveFailed': '属性保存失败',
  'dashboards.widget.attributes.noEntity': '该组件未解析到目标实体',
  'dashboards.widget.alarms.originator': '告警对象',
  'dashboards.widget.alarms.assignee': '未分配',
  'dashboards.widget.alarms.empty': '所选时间窗口内暂无告警',

  // ---- 页面 / 工具栏 ----
  'dashboards.page.loading': '仪表盘加载中…',
  'dashboards.page.emptyConfiguration': '该仪表盘暂无配置',
  'dashboards.page.emptyState': '该页面暂无布局',
  'dashboards.page.noWidgets': '该仪表盘暂无组件',
  'dashboards.page.aliasError': '部分数据源解析失败',
  'dashboards.toolbar.dashboardSelect': '仪表盘',
  'dashboards.toolbar.export': '导出仪表盘',
  'dashboards.toolbar.fullscreen': '全屏',
  'dashboards.toolbar.exitFullscreen': '退出全屏',

  // ---- W3 列表页（/dashboards，recon §4；文案对齐 ui-ngx dashboard 域） ----
  'dashboards.list.search': '搜索仪表盘',
  'dashboards.list.refresh': '刷新',
  'dashboards.list.createdTime': '创建时间',
  'dashboards.list.title': '标题',
  'dashboards.list.assignedCustomers': '已分配给客户',
  'dashboards.list.publicColumn': '公开',
  'dashboards.list.empty': '暂无仪表盘',
  'dashboards.list.loadFailed': '加载仪表盘列表失败',
  'dashboards.list.total': '共 {count} 个',
  'dashboards.list.selectedCount': '已选 {count} 项',
  'dashboards.list.actionExport': '导出仪表盘',
  'dashboards.list.exportFailed': '导出仪表盘失败：{error}',
  'dashboards.list.actionMakePublic': '公开仪表盘',
  'dashboards.list.actionMakePrivate': '将仪表盘设为私有',
  'dashboards.list.actionDelete': '删除',
  'dashboards.list.makePublicTitle': '确定要将仪表盘“{title}”设为公开吗？',
  'dashboards.list.makePublicText':
    '确认后，该仪表盘及其所有数据将被设为公开，可被其他人访问。',
  'dashboards.list.makePrivateTitle': '确定要将仪表盘“{title}”设为私有吗？',
  'dashboards.list.makePrivateText':
    '确认后仪表盘将设为私有，其他人将无法访问。',
  'dashboards.list.publicLinkTitle': '仪表盘已公开',
  'dashboards.list.publicLinkLabel': '公开链接',
  'dashboards.list.publicLinkHint':
    '匿名公开访问页归后续版本；当前仅生成并展示链接。',
  'dashboards.list.makePublicSuccess': '仪表盘已设为公开。',
  'dashboards.list.makePrivateSuccess': '仪表盘已设为私有。',
  'dashboards.list.deleteTitle': '确定要删除仪表盘“{title}”吗？',
  'dashboards.list.deleteText':
    '请注意，确认后仪表盘及所有相关数据将无法恢复。',
  'dashboards.list.cancel': '取消',
  'dashboards.list.toastDeleted': '仪表盘已删除。',

  // ---- W3 ② 导入 / 导出 ----
  'dashboards.list.import': '导入仪表盘',
  'dashboards.list.importTitle': '导入仪表盘',
  'dashboards.list.importOk': '导入',
  'dashboards.list.importDropHint':
    '拖拽仪表盘 JSON 文件到此处，或点击选择文件。',
  'dashboards.list.importHint':
    '文件必须包含 title 与 configuration。缺失实体别名的组件按原样导入（v1 不提供别名指派）。',
  'dashboards.list.importParseError': '无法将文件解析为 JSON。',
  'dashboards.list.importInvalidError':
    '无效的仪表盘文件：缺少 title 或 configuration。',
  'dashboards.list.importFailed': '导入仪表盘失败：{error}',
  'dashboards.list.toastImported': '仪表盘“{title}”已导入。',

  // ---- W3 ③ 管理已分配客户 + 批量 ----
  'dashboards.list.actionManageCustomers': '管理已分配的客户',
  'dashboards.list.batchAssign': '分配仪表盘',
  'dashboards.list.batchUnassign': '取消分配仪表盘',
  'dashboards.list.manageTitle.assign': '分配仪表盘给客户',
  'dashboards.list.manageTitle.manage': '管理已分配的客户',
  'dashboards.list.manageTitle.unassign': '取消分配仪表盘的客户',
  'dashboards.list.manageLabel.assign': '请选择要分配仪表盘的客户',
  'dashboards.list.manageLabel.manage': '已分配的客户',
  'dashboards.list.manageLabel.unassign': '请选择要取消分配仪表盘的客户',
  'dashboards.list.manageOk.assign': '分 配',
  'dashboards.list.manageOk.manage': '更 新',
  'dashboards.list.manageOk.unassign': '取 消 分 配',
  'dashboards.list.manageCustomerPlaceholder': '搜索并选择客户',
  'dashboards.list.manageCustomerRequired': '请至少选择一个客户。',
  'dashboards.list.manageHint.manage':
    '仪表盘将只分配给所选客户集合（更新全集）。',
  'dashboards.list.manageHint.batch': '该操作将应用到 {count} 个仪表盘。',
  'dashboards.list.toastManaged': '已更新仪表盘的分配客户。',
  'dashboards.list.batchResult': '成功 {ok} 个，失败 {fail} 个。',

  // ---- W3 ⑤⑥ 系统仪表盘页（usage / gateways） ----
  'dashboards.system.loadFailed': '系统仪表盘加载失败。',
  'dashboards.system.resourceMissing': '后端缺少该系统仪表盘资源。',
  'dashboards.system.retry': '重试',

  // ---- 全局 timewindow 选择器 ----
  'dashboards.tw.tabRealtime': '实时',
  'dashboards.tw.tabHistory': '历史',
  'dashboards.tw.custom': '自定义',
  'dashboards.tw.aggregation': '聚合',
  'dashboards.tw.aggInterval': '聚合间隔',
  'dashboards.tw.auto': '自动',

  // ---- timewindow 预设（ui-ngx defaultTimeIntervals 25 档） ----
  'dashboards.tw.preset.s1': '最近 1 秒',
  'dashboards.tw.preset.s5': '最近 5 秒',
  'dashboards.tw.preset.s10': '最近 10 秒',
  'dashboards.tw.preset.s15': '最近 15 秒',
  'dashboards.tw.preset.s30': '最近 30 秒',
  'dashboards.tw.preset.m1': '最近 1 分钟',
  'dashboards.tw.preset.m2': '最近 2 分钟',
  'dashboards.tw.preset.m5': '最近 5 分钟',
  'dashboards.tw.preset.m10': '最近 10 分钟',
  'dashboards.tw.preset.m15': '最近 15 分钟',
  'dashboards.tw.preset.m30': '最近 30 分钟',
  'dashboards.tw.preset.h1': '最近 1 小时',
  'dashboards.tw.preset.h2': '最近 2 小时',
  'dashboards.tw.preset.h5': '最近 5 小时',
  'dashboards.tw.preset.h6': '最近 6 小时',
  'dashboards.tw.preset.h8': '最近 8 小时',
  'dashboards.tw.preset.h10': '最近 10 小时',
  'dashboards.tw.preset.h12': '最近 12 小时',
  'dashboards.tw.preset.d1': '最近 1 天',
  'dashboards.tw.preset.d7': '最近 7 天',
  'dashboards.tw.preset.week': '最近一周',
  'dashboards.tw.preset.weekIso': '最近一周（ISO）',
  'dashboards.tw.preset.d30': '最近 30 天',
  'dashboards.tw.preset.month': '最近一个月',
  'dashboards.tw.preset.quarter': '最近一个季度',
};
