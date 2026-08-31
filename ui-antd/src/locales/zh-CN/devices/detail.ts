/**
 * zh-CN device detail keys (10-tab detail page). Keep key-for-key identical
 * with en-US/devices/detail.ts (check-locale gate).
 */
export default {
  // header + shell
  'pages.devices.detail.back': '返回设备列表',
  'pages.devices.detail.active': '在线',
  'pages.devices.detail.inactive': '离线',
  'pages.devices.detail.edit': '编辑',
  'pages.devices.detail.cancelEdit': '取消编辑',
  'pages.devices.detail.loadFailed': '设备加载失败',
  'pages.devices.detail.unsavedTitle': '未保存的修改',
  'pages.devices.detail.unsavedText':
    '设备资料存在未保存的修改，确定离开吗？离开后修改将丢失。',
  'pages.devices.detail.unsavedLeave': '离开',
  'pages.devices.detail.cancel': '取消',

  // tabs
  'pages.devices.detail.tabDetails': '详情',
  'pages.devices.detail.tabAttributes': '属性',
  'pages.devices.detail.tabLatestTelemetry': '最新遥测',
  'pages.devices.detail.tabCalculatedFields': '计算字段',
  'pages.devices.detail.tabAlarmRules': '告警规则',
  'pages.devices.detail.tabAlarms': '告警',
  'pages.devices.detail.tabEvents': '事件',
  'pages.devices.detail.tabRelations': '关系',
  'pages.devices.detail.tabAuditLogs': '审计日志',
  'pages.devices.detail.tabVersionControl': '版本控制',

  // details tab
  'pages.devices.detail.name': '名称',
  'pages.devices.detail.nameRequired': '名称为必填项。',
  'pages.devices.detail.nameTooLong': '名称最长 255 个字符。',
  'pages.devices.detail.profile': '设备配置',
  'pages.devices.detail.profileRequired': '设备配置为必填项。',
  'pages.devices.detail.label': '标签',
  'pages.devices.detail.labelTooLong': '标签最长 255 个字符。',
  'pages.devices.detail.isGateway': '是网关',
  'pages.devices.detail.overwriteActivityTime': '覆盖网关活动时间',
  'pages.devices.detail.description': '描述',
  'pages.devices.detail.yes': '是',
  'pages.devices.detail.no': '否',
  'pages.devices.detail.save': '保存',
  'pages.devices.detail.toastSaved': '设备已保存。',
  'pages.devices.detail.saveFailed': '设备保存失败：{reason}',
};
