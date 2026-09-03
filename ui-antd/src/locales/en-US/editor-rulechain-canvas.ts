/**
 * en-US rule-chain canvas editor keys (`editor.ruleChain.canvas.*`, M8 wave
 * C). Copy anchors: ui-ngx locale `rulechain.*` / `rulenode.*` sections.
 * Keep zh-CN/en-US key-for-key identical (check-locale gate).
 */
export default {
  // page
  'editor.ruleChain.canvas.loading': 'Loading rule chain…',

  // toolbar
  'editor.ruleChain.canvas.toolbar.exit': 'Exit',
  'editor.ruleChain.canvas.toolbar.library': 'Node library',
  'editor.ruleChain.canvas.toolbar.addNote': 'Add note',
  'editor.ruleChain.canvas.toolbar.search': 'Search nodes',
  'editor.ruleChain.canvas.toolbar.exitDirtyTitle': 'Unsaved changes',
  'editor.ruleChain.canvas.toolbar.exitDirtyText':
    'The draft has unsaved changes; exiting discards them.',
  'editor.ruleChain.canvas.toolbar.exitDirtyOk': 'Discard changes',
  'editor.ruleChain.canvas.toolbar.saveFailed': 'Save failed',
  'editor.ruleChain.canvas.saveConflict':
    'Version conflict: the rule chain changed on the server. The conflict dialog arrives with M8 wave 3.',

  // pane context menu (ui-ngx rulechain blank-canvas menu parity)
  'editor.ruleChain.canvas.menu.copySelected': 'Copy selected',
  'editor.ruleChain.canvas.menu.paste': 'Paste',
  'editor.ruleChain.canvas.menu.addNote': 'Add note',
  'editor.ruleChain.canvas.menu.deselectAll': 'Deselect all',
  'editor.ruleChain.canvas.menu.createNestedChain': 'Create nested rule chain',
  'editor.ruleChain.canvas.menu.deleteSelected': 'Delete selected',
  'editor.ruleChain.canvas.menu.selectAll': 'Select all',
  'editor.ruleChain.canvas.menu.applyChanges': 'Apply changes',
  'editor.ruleChain.canvas.menu.discardChanges': 'Discard changes',

  // node / edge / note context menus
  'editor.ruleChain.canvas.menu.details': 'Details',
  'editor.ruleChain.canvas.menu.copy': 'Copy',
  'editor.ruleChain.canvas.menu.delete': 'Delete',
  'editor.ruleChain.canvas.menu.editNote': 'Edit note',

  // edge hover buttons
  'editor.ruleChain.canvas.edge.edit': 'Edit link labels',
  'editor.ruleChain.canvas.edge.delete': 'Delete link',

  // add-node dialog
  'editor.ruleChain.canvas.addNode.title': 'Add rule node',
  'editor.ruleChain.canvas.addNode.name': 'Name',
  'editor.ruleChain.canvas.addNode.nameRequired': 'Name is required.',
  'editor.ruleChain.canvas.addNode.description': 'Description',
  'editor.ruleChain.canvas.addNode.configuration': 'Configuration',
  'editor.ruleChain.canvas.addNode.ok': 'OK',

  // link labels dialog
  'editor.ruleChain.canvas.linkLabels.title': 'Link labels',
  'editor.ruleChain.canvas.linkLabels.labels': 'Link labels',
  'editor.ruleChain.canvas.linkLabels.required': 'Link labels are required.',
  'editor.ruleChain.canvas.linkLabels.noLabelsFound': 'No link labels found',
  'editor.ruleChain.canvas.linkLabels.createCustom': 'Create a new one!',

  // note dialog
  'editor.ruleChain.canvas.note.addTitle': 'Add note',
  'editor.ruleChain.canvas.note.editTitle': 'Edit note',
  'editor.ruleChain.canvas.note.content': 'Markdown/HTML content',
  'editor.ruleChain.canvas.note.backgroundColor': 'Background color',
  'editor.ruleChain.canvas.note.border': 'Border',
  'editor.ruleChain.canvas.note.applyDefaultMarkdownStyle':
    'Apply default markdown style',
  'editor.ruleChain.canvas.note.customCss': 'Note content CSS',

  // nested rule chain dialog
  'editor.ruleChain.canvas.nestedChain.title': 'Create nested rule chain',
  'editor.ruleChain.canvas.nestedChain.summary':
    'Export {count} selected nodes into a new rule chain.',
  'editor.ruleChain.canvas.nestedChain.name': 'Name',
  'editor.ruleChain.canvas.nestedChain.nameRequired': 'Name is required.',
  'editor.ruleChain.canvas.nestedChain.noNodes':
    'Select the nodes to export first.',
  'editor.ruleChain.canvas.nestedChain.multipleEntries':
    'The sub-graph must contain at most one entry node without incoming links (found {count}).',
  'editor.ruleChain.canvas.nestedChain.created': 'Nested rule chain created',

  // node library
  'editor.ruleChain.canvas.library.empty': 'No matching nodes',
  'editor.ruleChain.canvas.library.group.filter': 'Filter',
  'editor.ruleChain.canvas.library.group.enrichment': 'Enrichment',
  'editor.ruleChain.canvas.library.group.transformation': 'Transformation',
  'editor.ruleChain.canvas.library.group.action': 'Action',
  'editor.ruleChain.canvas.library.group.external': 'External',
  'editor.ruleChain.canvas.library.group.flow': 'Flow',

  // details drawer (wave-3 K2 placeholder)
  'editor.ruleChain.canvas.details.title': 'Rule node details',
  'editor.ruleChain.canvas.details.name': 'Name',
  'editor.ruleChain.canvas.details.clazz': 'Type',
  'editor.ruleChain.canvas.details.configuration': 'Configuration',
  'editor.ruleChain.canvas.details.placeholder':
    'The details form and help land in this drawer with M8 wave 3 (K2).',
  'editor.ruleChain.canvas.details.eventsPlaceholder':
    'The node events table lands with M8 wave 3 (D).',
};
