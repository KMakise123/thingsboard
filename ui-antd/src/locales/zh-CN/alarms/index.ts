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
};
