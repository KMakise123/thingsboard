/**
 * en-US editor dashboard keys (`editor.dashboard.*`, M7 brief §3 C wave).
 * Keep zh-CN/en-US key-for-key identical (check-locale gate). Keys shared
 * with the editor-common domain (save/undo/redo/…) stay in editor.ts.
 */
export default {
  'editor.dashboard.toolbar.manageLayouts': 'Manage layouts',
  'editor.dashboard.toolbar.rightLayout': 'Right layout',
  'editor.dashboard.toolbar.fullscreen': 'Fullscreen',
  'editor.dashboard.toolbar.exitFullscreen': 'Exit fullscreen',
  'editor.dashboard.toolbar.states': 'States',
  'editor.dashboard.toolbar.aliases': 'Aliases',
  'editor.dashboard.toolbar.filters': 'Filters',
  'editor.dashboard.toolbar.settings': 'Settings',
  'editor.dashboard.toolbar.import': 'Import',
  'editor.dashboard.toolbar.export': 'Export',
  'editor.dashboard.toolbar.versionControl': 'Version control',
  'editor.dashboard.toolbar.versionControlEmpty':
    'No version control actions are wired into this editor.',
  'editor.dashboard.toolbar.saved': 'Saved',
  'editor.dashboard.toolbar.saveFailed': 'Save failed',
  'editor.dashboard.toolbar.importFailed': 'Import failed',
  'editor.dashboard.toolbar.importInvalid': 'Invalid dashboard file',
  'editor.dashboard.panel.placeholder':
    'No widget selected: click a widget on the canvas to configure it.',
  'editor.dashboard.dialog.empty': 'This panel currently has no actions.',
  'editor.dashboard.conflict.title': 'Save conflict',
  'editor.dashboard.conflict.empty':
    'A save conflict was detected, but no conflict actions are wired up.',
};
