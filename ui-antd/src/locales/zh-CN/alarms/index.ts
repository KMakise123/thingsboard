/**
 * zh-CN alarm-domain keys (global alarms page, spec 3.6). Keep key-for-key
 * identical with en-US/alarms/index.ts (check-locale gate). Wording follows
 * ui-ngx locale.constant-zh_CN.json (`alarm.*` section). Cell/label strings
 * shared with the entity tabs stay under pages.devices.detail.* — see
 * components/alarms/alarm-columns.tsx.
 */
export default {
  // tabs
  'pages.alarms.tabAlarms': '告警',
  'pages.alarms.tabAlarmRules': '告警规则',

  // table columns
  'pages.alarms.column.originator': '发起者',

  // assignee cell / reassign popover
  'pages.alarms.filter.unassigned': '未分配',
  'pages.alarms.filter.assignedToMe': '分配给我',
  'pages.alarms.filter.searchUser': '搜索用户',
  'pages.alarms.filter.noUsers': '未找到用户',

  // filter bar
  'pages.alarms.filter.status': '告警状态',
  'pages.alarms.filter.severity': '严重程度',
  'pages.alarms.filter.type': '告警类型',
  'pages.alarms.filter.assignee': '受理人',
  'pages.alarms.filter.propagated': '搜索传播的告警',
  'pages.alarms.search': '搜索告警',
  'pages.alarms.wsStatus': '实时更新',
  'pages.alarms.refresh': '刷新',
  'pages.alarms.twAll': '所有时间',
  'pages.alarms.tw.5m': '最近 5 分钟',
  'pages.alarms.tw.15m': '最近 15 分钟',
  'pages.alarms.tw.30m': '最近 30 分钟',
  'pages.alarms.tw.1h': '最近 1 小时',
  'pages.alarms.tw.3h': '最近 3 小时',
  'pages.alarms.tw.6h': '最近 6 小时',
  'pages.alarms.tw.12h': '最近 12 小时',
  'pages.alarms.tw.24h': '最近 24 小时',
  'pages.alarms.tw.2d': '最近 2 天',
  'pages.alarms.tw.7d': '最近 7 天',
  'pages.alarms.tw.30d': '最近 30 天',

  // selection + batch actions
  'pages.alarms.selectedCount': '已选 {count} 项',
  'pages.alarms.batchCountTitle':
    '{action} {count, plural, =1 {1 个告警} other {# 个告警}}？',
  'pages.alarms.ack': '确认',
  'pages.alarms.clear': '清除',
  'pages.alarms.delete': '删除',
  'pages.alarms.ackText': '确定要确认所选告警吗？',
  'pages.alarms.clearText': '确定要清除所选告警吗？',
  'pages.alarms.deleteTitle':
    '删除 {count, plural, =1 {1 个告警} other {# 个告警}}？',
  'pages.alarms.deleteText': '请注意，确认后告警将无法恢复。',
  'pages.alarms.alreadyAcked': '所选告警已被确认',
  'pages.alarms.alreadyCleared': '所选告警已被清除',
  'pages.alarms.toastAcked': '告警已确认。',
  'pages.alarms.toastCleared': '告警已清除。',
  'pages.alarms.toastDeleted': '告警已删除。',
  'pages.alarms.batchPartial': '{ok} 项成功，{fail} 项失败。',

  // table shell
  'pages.alarms.loadFailed': '加载告警失败',
  'pages.alarms.empty': '未找到告警',
  'pages.alarms.total': '共 {count} 条',
  'pages.alarms.cancel': '取消',
};
