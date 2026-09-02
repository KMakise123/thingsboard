/**
 * en-US alarm-domain keys (global alarms page, spec 3.6). Keep key-for-key
 * identical with zh-CN/alarms/index.ts (check-locale gate).
 */
export default {
  // tabs
  'pages.alarms.tabAlarms': 'Alarms',
  'pages.alarms.tabAlarmRules': 'Alarm rules',

  // table columns
  'pages.alarms.column.originator': 'Originator',

  // assignee cell / reassign popover
  'pages.alarms.filter.unassigned': 'Unassigned',
  'pages.alarms.filter.assignedToMe': 'Assigned to me',
  'pages.alarms.filter.searchUser': 'Search user',
  'pages.alarms.filter.noUsers': 'No users found',

  // filter bar
  'pages.alarms.filter.status': 'Alarm status',
  'pages.alarms.filter.severity': 'Severity',
  'pages.alarms.filter.type': 'Alarm type',
  'pages.alarms.filter.assignee': 'Assignee',
  'pages.alarms.filter.propagated': 'Search propagated alarms',
  'pages.alarms.search': 'Search alarms',
  'pages.alarms.wsStatus': 'Live updates',
  'pages.alarms.refresh': 'Refresh',
  'pages.alarms.twAll': 'For all time',
  'pages.alarms.tw.5m': 'Last 5 minutes',
  'pages.alarms.tw.15m': 'Last 15 minutes',
  'pages.alarms.tw.30m': 'Last 30 minutes',
  'pages.alarms.tw.1h': 'Last 1 hour',
  'pages.alarms.tw.3h': 'Last 3 hours',
  'pages.alarms.tw.6h': 'Last 6 hours',
  'pages.alarms.tw.12h': 'Last 12 hours',
  'pages.alarms.tw.24h': 'Last 24 hours',
  'pages.alarms.tw.2d': 'Last 2 days',
  'pages.alarms.tw.7d': 'Last 7 days',
  'pages.alarms.tw.30d': 'Last 30 days',

  // selection + batch actions
  'pages.alarms.selectedCount': '{count} selected',
  'pages.alarms.batchCountTitle':
    '{action} {count, plural, =1 {1 alarm} other {# alarms}}?',
  'pages.alarms.ack': 'Acknowledge',
  'pages.alarms.clear': 'Clear',
  'pages.alarms.delete': 'Delete',
  'pages.alarms.ackText':
    'Are you sure you want to acknowledge the selected alarms?',
  'pages.alarms.clearText':
    'Are you sure you want to clear the selected alarms?',
  'pages.alarms.deleteTitle':
    'Delete {count, plural, =1 {1 alarm} other {# alarms}}?',
  'pages.alarms.deleteText':
    'Be careful, after the confirmation the alarm(s) will become unrecoverable.',
  'pages.alarms.alreadyAcked': 'Selected alarms are already acknowledged.',
  'pages.alarms.alreadyCleared': 'Selected alarms are already cleared.',
  'pages.alarms.toastAcked': 'Alarms acknowledged.',
  'pages.alarms.toastCleared': 'Alarms cleared.',
  'pages.alarms.toastDeleted': 'Alarms deleted.',
  'pages.alarms.batchPartial': '{ok} succeeded, {fail} failed.',

  // table shell
  'pages.alarms.loadFailed': 'Failed to load alarms',
  'pages.alarms.empty': 'No alarms found',
  'pages.alarms.total': '{count} total',
  'pages.alarms.cancel': 'Cancel',
};
