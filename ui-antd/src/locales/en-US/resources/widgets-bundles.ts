/**
 * en-US resources/widgets-bundles keys (M11 wave 1B: widgets bundles list
 * + create/edit + import/export dialogs + bundle widgets manager).
 * Wording follows ui-ngx locale.constant-en_US.json (widgets-bundle keys).
 * Must stay key-for-key identical with zh-CN/resources/widgets-bundles.ts
 * (check-locale).
 */
export default {
  // ---- list: table & filters ----
  'pages.resources.widgetsBundles.createdTime': 'Created time',
  'pages.resources.widgetsBundles.title': 'Title',
  'pages.resources.widgetsBundles.system': 'System',
  'pages.resources.widgetsBundles.systemYes': 'System',
  'pages.resources.widgetsBundles.empty': 'No widgets bundles',
  'pages.resources.widgetsBundles.loadFailed': 'Failed to load widgets bundles',

  // ---- list: toolbar ----
  'pages.resources.widgetsBundles.search': 'Search widgets bundles',
  'pages.resources.widgetsBundles.refresh': 'Refresh',
  'pages.resources.widgetsBundles.total': '{count} total',
  'pages.resources.widgetsBundles.create': 'Create new widgets bundle',
  'pages.resources.widgetsBundles.import': 'Import widgets bundle',

  // ---- list: row actions ----
  'pages.resources.widgetsBundles.export': 'Export widgets bundle',
  'pages.resources.widgetsBundles.edit': 'Edit widgets bundle',
  'pages.resources.widgetsBundles.delete': 'Delete widgets bundle',
  'pages.resources.widgetsBundles.deleteTitle':
    "Are you sure you want to delete the widgets bundle '{title}'?",
  'pages.resources.widgetsBundles.deleteText':
    'Be careful, after the confirmation the widgets bundle will become unrecoverable. The widget types it groups stay.',

  // ---- list: toasts ----
  'pages.resources.widgetsBundles.toastSaved': 'Widgets bundle saved.',
  'pages.resources.widgetsBundles.toastDeleted': 'Widgets bundle deleted.',
  'pages.resources.widgetsBundles.toastImported':
    "Widgets bundle '{title}' imported.",

  // ---- create / edit dialog ----
  'pages.resources.widgetsBundles.createTitle': 'Create new widgets bundle',
  'pages.resources.widgetsBundles.editTitle': 'Edit widgets bundle',
  'pages.resources.widgetsBundles.save': 'Save',
  'pages.resources.widgetsBundles.titleRequired': 'Title is required.',
  'pages.resources.widgetsBundles.description': 'Description',
  'pages.resources.widgetsBundles.image': 'Image URL',
  'pages.resources.widgetsBundles.imageHint':
    'Interim plain-URL input — the gallery picker lands with the images wave.',

  // ---- export dialog ----
  'pages.resources.widgetsBundles.exportTitle': 'Export widgets bundle',
  'pages.resources.widgetsBundles.exportOk': 'Export',
  'pages.resources.widgetsBundles.exportPrompt':
    "Export the widgets bundle '{title}'?",
  'pages.resources.widgetsBundles.exportIncludeWidgets':
    'Include bundle widgets in exported data (otherwise only referenced widget FQNs will be exported)',

  // ---- import dialog ----
  'pages.resources.widgetsBundles.importTitle': 'Import widgets bundle',
  'pages.resources.widgetsBundles.importOk': 'Import',
  'pages.resources.widgetsBundles.importDropHint':
    'Drop a widgets bundle JSON file or click to select one.',
  'pages.resources.widgetsBundles.importHint':
    'Carried widget types import through the updateExistingByFqn channel; the bundle membership is rebuilt from types + fqn references.',
  'pages.resources.widgetsBundles.importParseError':
    'Unable to import widgets bundle: the file is not valid JSON.',
  'pages.resources.widgetsBundles.importInvalidError':
    'Unable to import widgets bundle: invalid widgets bundle data structure.',
  'pages.resources.widgetsBundles.importFailed':
    'Failed to import the widgets bundle: {error}',
  'pages.resources.widgetsBundles.cancel': 'Cancel',

  // ---- bundle widgets manager ----
  'pages.resources.bundleWidgets.title': 'Bundle widgets',
  'pages.resources.bundleWidgets.loading': 'Loading widgets bundle…',
  'pages.resources.bundleWidgets.edit': 'Edit',
  'pages.resources.bundleWidgets.save': 'Save',
  'pages.resources.bundleWidgets.cancel': 'Cancel',
  'pages.resources.bundleWidgets.readOnly':
    'This widgets bundle is a system resource — read-only for your session.',
  'pages.resources.bundleWidgets.empty': 'No widget types in this bundle yet.',
  'pages.resources.bundleWidgets.add': 'Add widget type',
  'pages.resources.bundleWidgets.addTitle': 'Add widget type to bundle',
  'pages.resources.bundleWidgets.addPlaceholder': 'Search widget types by name',
  'pages.resources.bundleWidgets.moveUp': 'Move up',
  'pages.resources.bundleWidgets.moveDown': 'Move down',
  'pages.resources.bundleWidgets.remove': 'Remove widget',
  'pages.resources.bundleWidgets.toastSaved': 'Bundle widgets saved.',
} as const;
