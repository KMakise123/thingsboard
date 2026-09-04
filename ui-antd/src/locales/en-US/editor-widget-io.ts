/**
 * en-US widget editor contract/IO keys (`editor.widget.io.*`, M9 wave 3 D).
 * Mirror of zh-CN/editor-widget-io.ts — keep key-for-key identical
 * (check-locale gate).
 */
export default {
  // save chain — gate aborts (compile / module execute / smoke render)
  'editor.widget.io.save.compileFailed': 'Save aborted: TSX failed to compile',
  'editor.widget.io.save.executeFailed':
    'Save aborted: source failed to execute',
  'editor.widget.io.save.smokeFailed':
    'Save aborted: the component failed the smoke render',
  'editor.widget.io.save.descriptorSoftLimit':
    'The descriptor exceeds the 512KB soft limit; saving continues, but the 1MB database cap is near.',
  'editor.widget.io.save.overwriteFailed':
    'Overwrite failed: the server version keeps changing (3 retries used); pick another option.',
  'editor.widget.io.save.loadServerFailed':
    'Could not fetch the latest server version.',

  // restore last saved
  'editor.widget.io.restore': 'Restore last saved',
  'editor.widget.io.restoreTitle': 'Restore the last saved version?',
  'editor.widget.io.restoreText':
    'The draft reverts to the most recently saved state. The revert itself is one undoable step.',
  'editor.widget.io.restoreOk': 'Restore',
  'editor.widget.io.restored': 'Restored to the last saved version',

  // import / export toolbar entries
  'editor.widget.io.export': 'Export JSON',
  'editor.widget.io.import': 'Import',
  'editor.widget.io.exportFailed': 'Export failed',

  // import dialog
  'editor.widget.io.importTitle': 'Import widget type',
  'editor.widget.io.importSource': 'Type in the file',
  'editor.widget.io.importReplace':
    'Importing replaces the current draft (one undoable group); nothing reaches the server until you save.',
  'editor.widget.io.importConfirm': 'Import and replace draft',
  'editor.widget.io.importAngularBadge': 'Angular (not react-1)',
  'editor.widget.io.importAngularText':
    'This file is an Angular widget (no react-1 runtime marker): its source cannot be opened here and dashboards referencing it render a placeholder. You can still save it verbatim as a server copy (descriptor untouched).',
  'editor.widget.io.importSaveCopy': 'Save as server copy',
  'editor.widget.io.importCopySaved': 'Server copy saved.',
  'editor.widget.io.importCopyFailed': 'Saving the copy failed',
  'editor.widget.io.importClose': 'Close',
  'editor.widget.io.importBrokenJson': 'The file is not valid JSON.',
  'editor.widget.io.importMissingName':
    'The file has no name field; import refused.',
  'editor.widget.io.importMissingDescriptor':
    'The file has no descriptor field; import refused.',
  'editor.widget.io.importReadFailed': 'Reading the file failed.',

  // new dialog — five React starter buckets
  'editor.widget.editor.dialog.new.pick': 'Pick a starter template.',
  'editor.widget.editor.dialog.new.pickHint':
    'Every starter ships a function datasource, so the preview has random data out of the box.',
  'editor.widget.editor.dialog.new.confirm': 'Create',
  'editor.widget.starter.latest.name': 'Latest values card',
  'editor.widget.starter.latest.desc':
    'Function datasource + latest-value list',
  'editor.widget.starter.timeseries.name': 'Timeseries line chart',
  'editor.widget.starter.timeseries.desc':
    'Function datasource + recharts line chart',
  'editor.widget.starter.rpc.name': 'RPC control button',
  'editor.widget.starter.rpc.desc': 'Two-way RPC call + result echo',
  'editor.widget.starter.alarm.name': 'Alarm status card',
  'editor.widget.starter.alarm.desc': 'Function datasource + alarm status card',
  'editor.widget.starter.static.name': 'Static card',
  'editor.widget.starter.static.desc':
    'Plain display card (configurable text and colors)',

  // derive dialog — two tiers
  'editor.widget.editor.dialog.derive.modeCustom': 'From custom type',
  'editor.widget.editor.dialog.derive.modeBuiltin': 'From built-in type',
  'editor.widget.editor.dialog.derive.customHint':
    'Pick a react-1 custom type; the source (TSX/CSS/Schema/defaultConfig) is copied in full to the new copy.',
  'editor.widget.editor.dialog.derive.builtinHint':
    'Built-in types are Angular widgets: their source is unavailable. Only the Schema/defaultConfig/size skeleton is reused; the TSX uses the starter skeleton (no Angular source will appear).',
  'editor.widget.editor.dialog.derive.name': 'New type name',
  'editor.widget.editor.dialog.derive.pickSource': 'Pick a source type',
  'editor.widget.editor.dialog.derive.loading': 'Loading type list…',
  'editor.widget.editor.dialog.derive.empty':
    'No derivable react-1 custom types.',
  'editor.widget.editor.dialog.derive.loadFailed':
    'Loading the type list failed',
  'editor.widget.editor.dialog.derive.detailsFailed':
    'Loading the type details failed',
  'editor.widget.editor.dialog.derive.confirm': 'Derive',

  // save-as additions (title/ok/name live in editor-widget-editor.ts)
  'editor.widget.editor.dialog.saveAs.fqn': 'New fqn (short name, optional)',
  'editor.widget.editor.dialog.saveAs.fqnHint':
    'Leave empty and the server derives one from the name; the fqn is immutable after the first save.',
  'editor.widget.editor.dialog.saveAs.fqnInvalid':
    'Only lowercase letters, digits and underscores',
};
