/**
 * en-US editor dashboard contract keys (`editor.dashboard.contract.*`, M7
 * wave D — §3.1 exit two-path / §3.8 dirty + leave confirm + 409 three
 * options + import/export / §3.9 contract). Keep zh-CN/en-US key-for-key
 * identical (check-locale gate). The `editor.dashboard.conflict.title` and
 * toolbar keys stay in editor-dashboard.ts (C wave) — never redefine them.
 */
export default {
  // §3.8 leave confirm — discard-changes exit (取消退出 when dirty)
  'editor.dashboard.contract.discardTitle': 'Unsaved changes',
  'editor.dashboard.contract.discardText':
    'The draft has unsaved changes; exiting edit mode discards them.',
  'editor.dashboard.contract.discardOk': 'Discard changes',

  // §3.8 409 three-option conflict dialog (shared copy: dashboard / widget
  // editors bind the same core ConflictDialog — keep the wording neutral)
  'editor.dashboard.contract.conflict.intro':
    'The content on the server was changed by someone else; choose how to handle your local version.',
  'editor.dashboard.contract.conflict.serverSection': 'Server latest version',
  'editor.dashboard.contract.conflict.serverUnknown':
    'The latest server version could not be fetched; only the local draft can be exported.',
  'editor.dashboard.contract.conflict.localSection': 'Local draft',
  'editor.dashboard.contract.conflict.localDirty': 'Contains unsaved changes',
  'editor.dashboard.contract.conflict.loadServer': 'Load server version',
  'editor.dashboard.contract.conflict.loadServerText':
    'Discard the local draft and continue editing the server version.',
  'editor.dashboard.contract.conflict.overwrite': 'Overwrite with mine',
  'editor.dashboard.contract.conflict.overwriteText':
    'Fetch the latest server version, then force-save the local draft.',
  'editor.dashboard.contract.conflict.exportLocal':
    'Export local JSON and give up',
  'editor.dashboard.contract.conflict.exportLocalText':
    'Download the local draft JSON and return to the read-only view.',
  'editor.dashboard.contract.conflict.overwriteFailed':
    'Overwrite failed: the server version kept changing (3 retries used). Pick another option.',
  'editor.dashboard.contract.conflict.loadFailed':
    'Failed to load the server version',

  // §3.8 import into the open editor (draft swap, one undoable group)
  'editor.dashboard.contract.import.title': 'Import dashboard',
  'editor.dashboard.contract.import.pickHint':
    'Click or drag a dashboard JSON file here',
  'editor.dashboard.contract.import.confirmTitle': 'Confirm import',
  'editor.dashboard.contract.import.confirmText':
    'The imported content replaces the current draft; it is one undo group and can be restored with undo.',
  'editor.dashboard.contract.import.widgetCount': '{count} widget(s)',
  'editor.dashboard.contract.import.missingAliases':
    'The imported widgets reference {count} undefined entity aliases — complete or skip them:',
  'editor.dashboard.contract.import.aliasNameLabel': 'Alias name',
  'editor.dashboard.contract.import.create': 'Complete',
  'editor.dashboard.contract.import.created': 'Completed',
  'editor.dashboard.contract.import.skip': 'Skip',
  'editor.dashboard.contract.import.defaultFilterNote':
    'Completed aliases default to a device-type filter and can be adjusted later in the Aliases dialog.',
  'editor.dashboard.contract.import.apply': 'Import',
  'editor.dashboard.contract.import.applied': 'Imported (undoable)',

  // §3.8 export current draft
  'editor.dashboard.contract.export.done': 'Draft JSON exported',
};
