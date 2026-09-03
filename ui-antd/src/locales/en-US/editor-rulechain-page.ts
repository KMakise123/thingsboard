/**
 * en-US rule-chain page-domain keys (`editor.ruleChain.*`, M8 wave-3 D).
 * Key-for-key mirror of zh-CN/editor-rulechain-page.ts (check-locale gate).
 */
export default {
  // §3.8 409 three-option conflict dialog (form twin of the M7 core dialog)
  'editor.ruleChain.contract.conflict.title': 'Save conflict',
  'editor.ruleChain.contract.conflict.intro':
    'The rule chain on the server was changed by someone else; the local draft is unsaved.',
  'editor.ruleChain.contract.conflict.serverSection': 'Server latest version',
  'editor.ruleChain.contract.conflict.serverUnknown':
    'The latest server version could not be fetched; only the local draft can be exported.',
  'editor.ruleChain.contract.conflict.localSection': 'Local draft',
  'editor.ruleChain.contract.conflict.localDirty': 'Contains unsaved changes',
  'editor.ruleChain.contract.conflict.loadServer': 'Load server version',
  'editor.ruleChain.contract.conflict.loadServerText':
    'Discard the local draft and continue editing the server version.',
  'editor.ruleChain.contract.conflict.overwrite': 'Overwrite with mine',
  'editor.ruleChain.contract.conflict.overwriteText':
    'Fetch the latest server version, then force-save the local draft.',
  'editor.ruleChain.contract.conflict.exportLocal':
    'Export local JSON and give up',
  'editor.ruleChain.contract.conflict.exportLocalText':
    'Download the local draft JSON and leave the editor.',
  'editor.ruleChain.contract.conflict.loadFailed':
    'Failed to load the server version',
  'editor.ruleChain.contract.conflict.overwriteFailed':
    'Overwrite failed: the server version kept changing (3 retries used). Pick another option.',
  'editor.ruleChain.contract.export.done': 'Draft JSON exported',

  // DEBUG events table (node + chain level shared headers/actions)
  'editor.ruleChain.events.createdTime': 'Event time',
  'editor.ruleChain.events.server': 'Server',
  'editor.ruleChain.events.direction': 'Direction',
  'editor.ruleChain.events.msgType': 'Message type',
  'editor.ruleChain.events.relationType': 'Relation type',
  'editor.ruleChain.events.data': 'Data',
  'editor.ruleChain.events.metadata': 'Metadata',
  'editor.ruleChain.events.error': 'Error',
  'editor.ruleChain.events.message': 'Message',
  'editor.ruleChain.events.refresh': 'Refresh',
  'editor.ruleChain.events.filters': 'Filters',
  'editor.ruleChain.events.filtersReset': 'Reset',
  'editor.ruleChain.events.clear': 'Clear events',
  'editor.ruleChain.events.clearTitle': 'Clear events?',
  'editor.ruleChain.events.clearText':
    'The debug events of this entity matching the current filter will be removed irreversibly.',
  'editor.ruleChain.events.empty': 'No events',
  'editor.ruleChain.events.loadFailed': 'Failed to load events',
  'editor.ruleChain.events.clearFailed': 'Failed to clear events',
  'editor.ruleChain.events.nodeUnsaved':
    'Save the rule chain to collect debug events for this node.',
  'editor.ruleChain.events.viewContent': 'View',
  'editor.ruleChain.events.filter.msgDirectionType': 'Direction (IN/OUT)',
  'editor.ruleChain.events.filter.msgType': 'Message type',
  'editor.ruleChain.events.filter.relationType': 'Relation type',
  'editor.ruleChain.events.filter.dataSearch': 'Data',
  'editor.ruleChain.events.filter.metadataSearch': 'Metadata',
  'editor.ruleChain.events.filter.isError': 'Errors only',
  'editor.ruleChain.events.filter.server': 'Server',
  'editor.ruleChain.events.filter.errorStr': 'Error',
  'editor.ruleChain.events.filter.message': 'Message',

  // "test with this message" row action (node events table; script nodes)
  'editor.ruleChain.events.testWithThisMessage': 'Test with this message',
  'editor.ruleChain.events.testModalTitle': 'Test script with this message',
  'editor.ruleChain.events.testNotScriptNode':
    'This node is not a script-family node; the message cannot be replayed.',

  // ruleChains list page
  'ruleChains.list.title': 'Rule chains',
  'ruleChains.list.search': 'Search rule chains',
  'ruleChains.list.refresh': 'Refresh',
  'ruleChains.list.createdTime': 'Created time',
  'ruleChains.list.name': 'Name',
  'ruleChains.list.root': 'Root',
  'ruleChains.list.total': '{count} total',
  'ruleChains.list.empty': 'No rule chains',
  'ruleChains.list.loadFailed': 'Failed to load rule chains',
  'ruleChains.list.actionOpen': 'Open',
  'ruleChains.list.actionDetails': 'Details',
  'ruleChains.list.actionSetRoot': 'Set as root',
  'ruleChains.list.actionEdit': 'Edit',
  'ruleChains.list.actionExport': 'Export rule chain',
  'ruleChains.list.actionDelete': 'Delete',
  'ruleChains.list.actionNew': 'New rule chain',
  'ruleChains.list.actionImport': 'Import rule chain',
  'ruleChains.list.rootTag': 'Root',
  'ruleChains.list.setRootTitle': 'Set as root rule chain?',
  'ruleChains.list.setRootText':
    'After the confirmation all entity messages are processed by this chain by default (the current root chain is replaced).',
  'ruleChains.list.setRootSuccess': 'The rule chain is now the root chain.',
  'ruleChains.list.deleteTitle':
    "Are you sure you want to delete the rule chain '{name}'?",
  'ruleChains.list.deleteText':
    'Be careful, the chain becomes unrecoverable; the root chain and chains referenced by other chains cannot be deleted.',
  'ruleChains.list.toastDeleted': 'Rule chain deleted.',
  'ruleChains.list.exportFailed': 'Failed to export the rule chain: {error}',
  'ruleChains.list.editTitle': 'Edit rule chain',
  'ruleChains.list.newTitle': 'New rule chain',
  'ruleChains.list.nameRequired': 'Name is required',
  'ruleChains.list.description': 'Description',
  'ruleChains.list.ok': 'OK',
  'ruleChains.list.cancel': 'Cancel',
  'ruleChains.list.toastCreated': "Rule chain '{name}' has been created.",
  'ruleChains.list.toastSaved': 'Rule chain saved.',

  // Import dialog (spec §4.9 parity)
  'ruleChains.list.importTitle': 'Import rule chain',
  'ruleChains.list.importDropHint':
    'Drop a rule chain JSON file or click to select one.',
  'ruleChains.list.importParseError':
    'Failed to parse the file: not valid JSON.',
  'ruleChains.list.importInvalidError':
    'The file is missing ruleChain.name or metadata.',
  'ruleChains.list.importConfirmTitle': 'Confirm import',
  'ruleChains.list.importConfirmIntro':
    'A NEW rule chain will be created from the file (no carried id/tenant/root flag):',
  'ruleChains.list.importConfirmName': 'Name',
  'ruleChains.list.importConfirmNodes': 'Nodes',
  'ruleChains.list.importConfirmConnections': 'Connections',
  'ruleChains.list.importConfirmNotes': 'Notes',
  'ruleChains.list.importConfirmMigrated':
    'Legacy format migrated: debugMode nodes → debugSettings ({count}).',
  'ruleChains.list.importConfirmCrossChain':
    '{count} cross-chain connection(s) migrated into Rule Chain Input node(s).',
  'ruleChains.list.importBulkNote':
    'The file is a bulk export ({count} chains); only the first one is imported.',
  'ruleChains.list.importOk': 'Import and open',
  'ruleChains.list.importFailed': 'Failed to import the rule chain: {error}',
  'ruleChains.list.toastImported': "Rule chain '{name}' has been imported.",

  // Entity details dialog (list "details" action)
  'ruleChains.details.title': 'Rule chain details',
  'ruleChains.details.tabAttributes': 'Attributes',
  'ruleChains.details.tabAlarms': 'Alarms',
  'ruleChains.details.tabEvents': 'Events',
  'ruleChains.details.tabRelations': 'Relations',
  'ruleChains.details.tabAuditLogs': 'Audit logs',
};
