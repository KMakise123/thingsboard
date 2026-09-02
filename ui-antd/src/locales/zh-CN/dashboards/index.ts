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
  'dashboards.list.placeholder': '仪表盘列表将由 dash-list 批次交付',
  'dashboards.toolbar.dashboardSelect': '仪表盘',
  'dashboards.toolbar.export': '导出仪表盘',
  'dashboards.toolbar.fullscreen': '全屏',
  'dashboards.toolbar.exitFullscreen': '退出全屏',

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
