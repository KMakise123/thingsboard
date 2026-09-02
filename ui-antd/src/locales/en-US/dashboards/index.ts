/**
 * en-US dashboards domain keys (M5). Must stay key-for-key identical with
 * zh-CN/dashboards/index.ts (check-locale).
 */
export default {
  // ---- widget placeholders (ADR 0003 three states + W2 pending slot) ----
  'dashboards.widget.unsupported': 'Not supported yet',
  'dashboards.widget.unsupportedAngular':
    'This widget is not supported yet (Angular-only component)',
  'dashboards.widget.unsupportedCustom':
    'Custom widgets are not supported yet; they will arrive with the editor',
  'dashboards.widget.missing': 'Widget not found or has been removed',
  'dashboards.widget.pending': 'Widget is on its way',

  // ---- W2 widget bodies (brief §1.8 / §6) ----
  'dashboards.widget.chart.noData': 'No numeric data in this window',
  'dashboards.widget.legend.min': 'min',
  'dashboards.widget.legend.max': 'max',
  'dashboards.widget.legend.avg': 'avg',
  'dashboards.widget.legend.total': 'total',
  'dashboards.widget.legend.latest': 'latest',
  'dashboards.widget.table.entity': 'Entity',
  'dashboards.widget.table.timestamp': 'Timestamp',
  'dashboards.widget.table.search': 'Search',
  'dashboards.widget.map.noLocation': 'No location data',
  'dashboards.widget.map.details': 'View details',
  'dashboards.widget.attributes.saved': 'Attributes saved',
  'dashboards.widget.attributes.saveFailed': 'Failed to save attributes',
  'dashboards.widget.attributes.noEntity':
    'This widget has no resolved target entity',
  'dashboards.widget.alarms.originator': 'Originator',
  'dashboards.widget.alarms.assignee': 'Unassigned',
  'dashboards.widget.alarms.empty': 'No alarms in the selected window',

  // ---- page / toolbar ----
  'dashboards.page.loading': 'Loading dashboard…',
  'dashboards.page.emptyConfiguration':
    'This dashboard has no configuration yet',
  'dashboards.page.emptyState': 'This page has no layout yet',
  'dashboards.page.noWidgets': 'This dashboard has no widgets yet',
  'dashboards.page.aliasError': 'Some data sources failed to resolve',
  'dashboards.toolbar.dashboardSelect': 'Dashboards',
  'dashboards.toolbar.export': 'Export dashboard',
  'dashboards.toolbar.fullscreen': 'Fullscreen',
  'dashboards.toolbar.exitFullscreen': 'Exit fullscreen',

  // ---- W3 list page (/dashboards, recon §4; wording follows ui-ngx) ----
  'dashboards.list.search': 'Search dashboards',
  'dashboards.list.refresh': 'Refresh',
  'dashboards.list.createdTime': 'Created time',
  'dashboards.list.title': 'Title',
  'dashboards.list.assignedCustomers': 'Assigned to customers',
  'dashboards.list.publicColumn': 'Public',
  'dashboards.list.empty': 'No dashboards',
  'dashboards.list.loadFailed': 'Failed to load dashboards',
  'dashboards.list.total': '{count} total',
  'dashboards.list.selectedCount': '{count} selected',
  'dashboards.list.actionExport': 'Export dashboard',
  'dashboards.list.exportFailed': 'Failed to export the dashboard: {error}',
  'dashboards.list.actionMakePublic': 'Make dashboard public',
  'dashboards.list.actionMakePrivate': 'Make dashboard private',
  'dashboards.list.actionDelete': 'Delete',
  'dashboards.list.makePublicTitle':
    "Are you sure you want to make the dashboard '{title}' public?",
  'dashboards.list.makePublicText':
    'After the confirmation the dashboard and all its data will be made public and accessible by others.',
  'dashboards.list.makePrivateTitle':
    "Are you sure you want to make the dashboard '{title}' private?",
  'dashboards.list.makePrivateText':
    "After the confirmation the dashboard will be made private and won't be accessible by others.",
  'dashboards.list.publicLinkTitle': 'Dashboard is now public',
  'dashboards.list.publicLinkLabel': 'Public link',
  'dashboards.list.publicLinkHint':
    'The anonymous public page ships later; the link is generated for reference only.',
  'dashboards.list.makePublicSuccess': 'Dashboard is now public.',
  'dashboards.list.makePrivateSuccess': 'Dashboard is now private.',
  'dashboards.list.deleteTitle':
    "Are you sure you want to delete the dashboard '{title}'?",
  'dashboards.list.deleteText':
    'Be careful, after the confirmation the dashboard and all related data will become unrecoverable.',
  'dashboards.list.cancel': 'Cancel',
  'dashboards.list.toastDeleted': 'Dashboard deleted.',

  // ---- W3 unit 2 import/export ----
  'dashboards.list.import': 'Import dashboard',
  'dashboards.list.importTitle': 'Import dashboard',
  'dashboards.list.importOk': 'Import',
  'dashboards.list.importDropHint':
    'Drop a dashboard JSON file here or click to select one.',
  'dashboards.list.importHint':
    'The file must carry a title and a configuration. Widgets with missing entity aliases are imported as-is (no alias assignment in v1).',
  'dashboards.list.importParseError': 'The file could not be parsed as JSON.',
  'dashboards.list.importInvalidError':
    'Invalid dashboard file: the title or configuration is missing.',
  'dashboards.list.importFailed': 'Failed to import the dashboard: {error}',
  'dashboards.list.toastImported': "Dashboard '{title}' has been imported.",

  // ---- global timewindow picker ----
  'dashboards.tw.tabRealtime': 'Realtime',
  'dashboards.tw.tabHistory': 'History',
  'dashboards.tw.custom': 'Custom',
  'dashboards.tw.aggregation': 'Aggregation',
  'dashboards.tw.aggInterval': 'Aggregation interval',
  'dashboards.tw.auto': 'auto',

  // ---- timewindow presets (ui-ngx defaultTimeIntervals, 25 entries) ----
  'dashboards.tw.preset.s1': 'Last 1 second',
  'dashboards.tw.preset.s5': 'Last 5 seconds',
  'dashboards.tw.preset.s10': 'Last 10 seconds',
  'dashboards.tw.preset.s15': 'Last 15 seconds',
  'dashboards.tw.preset.s30': 'Last 30 seconds',
  'dashboards.tw.preset.m1': 'Last 1 minute',
  'dashboards.tw.preset.m2': 'Last 2 minutes',
  'dashboards.tw.preset.m5': 'Last 5 minutes',
  'dashboards.tw.preset.m10': 'Last 10 minutes',
  'dashboards.tw.preset.m15': 'Last 15 minutes',
  'dashboards.tw.preset.m30': 'Last 30 minutes',
  'dashboards.tw.preset.h1': 'Last 1 hour',
  'dashboards.tw.preset.h2': 'Last 2 hours',
  'dashboards.tw.preset.h5': 'Last 5 hours',
  'dashboards.tw.preset.h6': 'Last 6 hours',
  'dashboards.tw.preset.h8': 'Last 8 hours',
  'dashboards.tw.preset.h10': 'Last 10 hours',
  'dashboards.tw.preset.h12': 'Last 12 hours',
  'dashboards.tw.preset.d1': 'Last 1 day',
  'dashboards.tw.preset.d7': 'Last 7 days',
  'dashboards.tw.preset.week': 'Last week',
  'dashboards.tw.preset.weekIso': 'Last ISO week',
  'dashboards.tw.preset.d30': 'Last 30 days',
  'dashboards.tw.preset.month': 'Last month',
  'dashboards.tw.preset.quarter': 'Last quarter',
};
