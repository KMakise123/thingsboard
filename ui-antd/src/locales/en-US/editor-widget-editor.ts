/**
 * en-US widget editor shell keys (`editor.widget.editor.*`, M9 wave S).
 * Key-for-key mirror of zh-CN/editor-widget-editor.ts (check-locale gate).
 */
export default {
  // page
  'editor.widget.editor.loading': 'Loading widget type…',
  'editor.widget.editor.angularType':
    'This type is an Angular widget (no react-1 runtime marker); its source cannot be edited here.',
  'editor.widget.editor.angularTypeDerive':
    'The restricted-derivation entry ships with the derive dialog.',
  'editor.widget.editor.createEntryTitle': 'Widget editor',
  'editor.widget.editor.createEmptyText':
    'Enter the editor from a dashboard or the widget library; the library listing is provided by the resources subsystem.',
  'editor.widget.editor.createOpen': 'New widget',

  // toolbar
  'editor.widget.editor.toolbar.save': 'Save',
  'editor.widget.editor.toolbar.saveAs': 'Save as',
  'editor.widget.editor.toolbar.run': 'Run',
  'editor.widget.editor.toolbar.tidy': 'Tidy',
  'editor.widget.editor.toolbar.undo': 'Undo',
  'editor.widget.editor.toolbar.redo': 'Redo',
  'editor.widget.editor.toolbar.fullscreen': 'Fullscreen',
  'editor.widget.editor.toolbar.exitFullscreen': 'Exit fullscreen',
  'editor.widget.editor.toolbar.metadata': 'Metadata',
  'editor.widget.editor.toolbar.exit': 'Exit',
  'editor.widget.editor.toolbar.help': 'Shortcuts',
  'editor.widget.editor.toolbar.exitDirtyTitle': 'Unsaved changes',
  'editor.widget.editor.toolbar.exitDirtyText':
    'The draft has unsaved changes; exiting discards them.',
  'editor.widget.editor.toolbar.exitDirtyOk': 'Discard changes',
  'editor.widget.editor.toolbar.tidyFailed': 'Tidy failed',
  'editor.widget.editor.toolbar.saved': 'Saved',

  // tabs
  'editor.widget.editor.tab.tsx': 'TSX',
  'editor.widget.editor.tab.css': 'CSS',
  'editor.widget.editor.tab.schema': 'Schema',
  'editor.widget.editor.tab.defaultConfig': 'defaultConfig',
  'editor.widget.editor.tab.schemaInvalid':
    'Invalid JSON — kept locally until it parses',

  // preview + console
  'editor.widget.editor.preview.title': 'Preview',
  'editor.widget.editor.preview.pending': 'Preview pane',
  'editor.widget.editor.preview.runId': 'Run',
  'editor.widget.editor.console.title': 'Console',
  'editor.widget.editor.console.empty': 'No output yet',
  'editor.widget.editor.console.clear': 'Clear',

  // metadata sidebar
  'editor.widget.editor.metadata.title': 'Metadata',
  'editor.widget.editor.metadata.fqn': 'Identifier (fqn)',
  'editor.widget.editor.metadata.fqnImmutable':
    'Fixed by the server after save',
  'editor.widget.editor.metadata.name': 'Name',
  'editor.widget.editor.metadata.type': 'Type',
  'editor.widget.editor.metadata.sizeX': 'Width (cells)',
  'editor.widget.editor.metadata.sizeY': 'Height (cells)',
  'editor.widget.editor.metadata.typeParameters': 'Type parameters (JSON)',
  'editor.widget.editor.metadata.typeParametersInvalid':
    'JSON parse failed; the last valid value is kept',
  'editor.widget.editor.metadata.actionSources': 'Action sources',
  'editor.widget.editor.metadata.actionSources.key': 'Source id',
  'editor.widget.editor.metadata.actionSources.name': 'Display name',
  'editor.widget.editor.metadata.actionSources.multiple': 'Multiple actions',
  'editor.widget.editor.metadata.actionSources.add': 'Add action source',

  // widget kinds (the five create buckets)
  'editor.widget.editor.kind.timeseries': 'Timeseries',
  'editor.widget.editor.kind.latest': 'Latest values',
  'editor.widget.editor.kind.rpc': 'Control (RPC)',
  'editor.widget.editor.kind.alarm': 'Alarm',
  'editor.widget.editor.kind.static': 'Static',

  // help drawer
  'editor.widget.editor.help.title': 'Shortcuts',
  'editor.widget.editor.help.save': 'Save',
  'editor.widget.editor.help.saveAs': 'Save as',
  'editor.widget.editor.help.run': 'Run (recompile preview)',
  'editor.widget.editor.help.tidy': 'Tidy the active code tab',
  'editor.widget.editor.help.exit': 'Exit the editor',
  'editor.widget.editor.help.undo':
    'Undo (inside the code editor it drives the code-editor stack; in forms or on the page it drives the edit session)',
  'editor.widget.editor.help.redo': 'Redo (same focus routing as undo)',
  'editor.widget.editor.help.help': 'Open the shortcuts help',

  // dialogs (wave-3 D frozen paths; placeholder copy)
  'editor.widget.editor.dialog.new.title': 'New widget',
  'editor.widget.editor.dialog.new.pending':
    'The starter-template picker (latest-values / timeseries / rpc / alarm / static) will be provided here.',
  'editor.widget.editor.dialog.derive.title': 'Derive widget',
  'editor.widget.editor.dialog.derive.pending':
    'Full derivation from existing custom types and restricted derivation from built-ins will be provided here.',
  'editor.widget.editor.dialog.saveAs.title': 'Save as',
  'editor.widget.editor.dialog.saveAs.name': 'New name',
  'editor.widget.editor.dialog.saveAs.ok': 'Create draft copy',
};
