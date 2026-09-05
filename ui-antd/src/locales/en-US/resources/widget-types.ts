/**
 * en-US resources/widget-types keys (M11 wave 1B: widget types list +
 * detail face, template-select dialog, import/export dialogs).
 * Wording follows ui-ngx locale.constant-en_US.json (widget / widget-type
 * keys).
 * Must stay key-for-key identical with zh-CN/resources/widget-types.ts
 * (check-locale).
 */
export default {
  // ---- list: table & filters ----
  'pages.resources.widgetTypes.createdTime': 'Created time',
  'pages.resources.widgetTypes.name': 'Name',
  'pages.resources.widgetTypes.bundles': 'Widgets bundles',
  'pages.resources.widgetTypes.kind': 'Widget type',
  'pages.resources.widgetTypes.kindValue.timeseries': 'Time series',
  'pages.resources.widgetTypes.kindValue.latest': 'Latest values',
  'pages.resources.widgetTypes.kindValue.rpc': 'Control widget',
  'pages.resources.widgetTypes.kindValue.alarm': 'Alarm widget',
  'pages.resources.widgetTypes.kindValue.static': 'Static widget',
  'pages.resources.widgetTypes.system': 'System',
  'pages.resources.widgetTypes.systemYes': 'System',
  'pages.resources.widgetTypes.deprecated': 'Deprecated',
  'pages.resources.widgetTypes.deprecatedYes': 'Deprecated',
  'pages.resources.widgetTypes.empty': 'No widget types',
  'pages.resources.widgetTypes.loadFailed': 'Failed to load widget types',

  // ---- list: toolbar ----
  'pages.resources.widgetTypes.search': 'Search widget types',
  'pages.resources.widgetTypes.deprecatedAll': 'All',
  'pages.resources.widgetTypes.deprecatedActual': 'Actual',
  'pages.resources.widgetTypes.deprecatedOnly': 'Deprecated',
  'pages.resources.widgetTypes.refresh': 'Refresh',
  'pages.resources.widgetTypes.selectedCount': '{count} selected',
  'pages.resources.widgetTypes.total': '{count} total',
  'pages.resources.widgetTypes.create': 'Create new widget type',
  'pages.resources.widgetTypes.import': 'Import widget type',

  // ---- list: row actions ----
  'pages.resources.widgetTypes.export': 'Export widget type',
  'pages.resources.widgetTypes.exportSelected': 'Export selected',
  'pages.resources.widgetTypes.details': 'Widget details',
  'pages.resources.widgetTypes.edit': 'Edit widget',
  'pages.resources.widgetTypes.delete': 'Delete widget type',
  'pages.resources.widgetTypes.deleteTitle':
    "Are you sure you want to delete the widget type '{name}'?",
  'pages.resources.widgetTypes.deleteText':
    'Be careful, after the confirmation the widget type will become unrecoverable. Dashboards referencing it degrade to placeholders.',

  // ---- list: toasts ----
  'pages.resources.widgetTypes.toastDeleted': 'Widget type deleted.',
  'pages.resources.widgetTypes.toastImported': "Widget type '{name}' imported.",

  // ---- template select dialog (ui-ngx select-widget-type parity) ----
  'pages.resources.widgetTypes.templateTitle': 'Select widget type',
  'pages.resources.widgetTypes.templateHint':
    'Pick the data bucket of the new widget type — the editor opens with a matching starter.',
  'pages.resources.widgetTypes.templateConfirm': 'Create',
  'pages.resources.widgetTypes.template.timeseries': 'Time series',
  'pages.resources.widgetTypes.template.latest': 'Latest values',
  'pages.resources.widgetTypes.template.rpc': 'Control widget',
  'pages.resources.widgetTypes.template.alarm': 'Alarm widget',
  'pages.resources.widgetTypes.template.static': 'Static widget',

  // ---- export dialog ----
  'pages.resources.widgetTypes.exportTitle': 'Export widget type',
  'pages.resources.widgetTypes.exportOk': 'Export',
  'pages.resources.widgetTypes.exportPrompt':
    'Export {count, plural, =1 {1 widget type} other {# widget types}} to a downloadable file?',
  'pages.resources.widgetTypes.exportIncludeResources':
    'Embed widget images and resources (self-contained export)',

  // ---- import dialog ----
  'pages.resources.widgetTypes.importTitle': 'Import widget type',
  'pages.resources.widgetTypes.importOk': 'Import',
  'pages.resources.widgetTypes.importDropHint':
    'Drop a widget type JSON file or click to select one.',
  'pages.resources.widgetTypes.importHint':
    'A file whose fqn matches an existing type UPDATES that type (updateExistingByFqn); otherwise a new type is created.',
  'pages.resources.widgetTypes.importParseError':
    'Unable to import widget type: the file is not valid JSON.',
  'pages.resources.widgetTypes.importInvalidError':
    'Unable to import widget type: invalid widget data structure.',
  'pages.resources.widgetTypes.importFailed':
    'Failed to import the widget type: {error}',
  'pages.resources.widgetTypes.cancel': 'Cancel',

  // ---- detail face ----
  'pages.resources.widgetTypes.detailsLoading': 'Loading widget type…',
  'pages.resources.widgetTypes.fqn': 'Fully-qualified name',
  'pages.resources.widgetTypes.description': 'Description',
  'pages.resources.widgetTypes.previewTitle': 'Preview',
  'pages.resources.widgetTypes.angularPreview':
    'This type is an Angular widget; the fork preview renders react-1 types only.',
} as const;
