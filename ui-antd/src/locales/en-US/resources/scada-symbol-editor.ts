/**
 * SCADA symbol editor page (M11 wave 2D, spec §3.3). Wording follows the
 * ui-ngx scada.* keys (general/tags/behavior/properties tabs).
 */
export default {
  // ---- page ----
  'pages.resources.scadaSymbolEditor.title': 'SCADA symbol editor',
  'pages.resources.scadaSymbolEditor.readonlyHint':
    'System symbols are read-only for tenants; editing controls are disabled.',
  // ---- toolbar ----
  'pages.resources.scadaSymbolEditor.save': 'Save',
  'pages.resources.scadaSymbolEditor.preview': 'Preview',
  'pages.resources.scadaSymbolEditor.replaceSvg': 'Replace SVG',
  'pages.resources.scadaSymbolEditor.download': 'Download symbol',
  'pages.resources.scadaSymbolEditor.createWidget': 'Create widget from symbol',
  'pages.resources.scadaSymbolEditor.metadata': 'Metadata panel',
  'pages.resources.scadaSymbolEditor.zoomIn': 'Zoom in',
  'pages.resources.scadaSymbolEditor.zoomOut': 'Zoom out',
  'pages.resources.scadaSymbolEditor.showHidden': 'Show hidden elements',
  'pages.resources.scadaSymbolEditor.modeSvg': 'Graphic',
  'pages.resources.scadaSymbolEditor.modeXml': 'XML',
  // ---- exit confirm (M10 D1 controlled shape) ----
  'pages.resources.scadaSymbolEditor.exitDirtyTitle': 'Unsaved changes',
  'pages.resources.scadaSymbolEditor.exitDirtyText':
    'The editor has unsaved changes; leaving discards them.',
  'pages.resources.scadaSymbolEditor.exitDirtyOk': 'Discard changes',
  // ---- save / validation messages ----
  'pages.resources.scadaSymbolEditor.saveSuccess': 'Symbol saved',
  'pages.resources.scadaSymbolEditor.saveFailed': 'Failed to save the symbol: {message}',
  'pages.resources.scadaSymbolEditor.metadataInvalid':
    'The metadata panel has validation errors; fix them first.',
  'pages.resources.scadaSymbolEditor.invalidXml':
    'The XML content cannot be parsed; fix it first.',
  // ---- canvas hover panel ----
  'pages.resources.scadaSymbolEditor.panel.addTag': 'Add tag',
  'pages.resources.scadaSymbolEditor.panel.updateTag': 'Update tag',
  'pages.resources.scadaSymbolEditor.panel.tagPlaceholder': 'Tag name',
  'pages.resources.scadaSymbolEditor.panel.apply': 'Apply',
  'pages.resources.scadaSymbolEditor.panel.cancel': 'Cancel',
  'pages.resources.scadaSymbolEditor.panel.removeTag': 'Remove tag',
  'pages.resources.scadaSymbolEditor.panel.editStateRender': 'Tag render function',
  'pages.resources.scadaSymbolEditor.panel.editClickAction': 'Click action function',
  'pages.resources.scadaSymbolEditor.panel.hidden': 'hidden',
  // ---- metadata: general ----
  'pages.resources.scadaSymbolEditor.general.title': 'Title',
  'pages.resources.scadaSymbolEditor.general.titleRequired': 'Title is required',
  'pages.resources.scadaSymbolEditor.general.description': 'Description',
  'pages.resources.scadaSymbolEditor.general.searchTags': 'Search tags',
  'pages.resources.scadaSymbolEditor.general.searchTagsPlaceholder':
    'Type and press Enter',
  'pages.resources.scadaSymbolEditor.general.sizeX': 'Width (cells)',
  'pages.resources.scadaSymbolEditor.general.sizeY': 'Height (cells)',
  'pages.resources.scadaSymbolEditor.general.sizeRange': 'Must be 1-24',
  // ---- metadata: tags ----
  'pages.resources.scadaSymbolEditor.tags.title': 'Tags',
  'pages.resources.scadaSymbolEditor.tags.empty':
    'No tags yet. Hover an element on the canvas to add one.',
  'pages.resources.scadaSymbolEditor.tags.tagName': 'Tag',
  'pages.resources.scadaSymbolEditor.tags.stateRenderFunction': 'State render function',
  'pages.resources.scadaSymbolEditor.tags.clickAction': 'Click action function',
  'pages.resources.scadaSymbolEditor.tags.delete': 'Delete tag',
  // ---- metadata: behavior ----
  'pages.resources.scadaSymbolEditor.behavior.title': 'Behavior',
  'pages.resources.scadaSymbolEditor.behavior.add': 'Add behavior',
  'pages.resources.scadaSymbolEditor.behavior.empty': 'No behaviors yet.',
  'pages.resources.scadaSymbolEditor.behavior.name': 'Name',
  'pages.resources.scadaSymbolEditor.behavior.id': 'ID',
  'pages.resources.scadaSymbolEditor.behavior.type': 'Type',
  'pages.resources.scadaSymbolEditor.behavior.typeValue': 'Value',
  'pages.resources.scadaSymbolEditor.behavior.typeAction': 'Action',
  'pages.resources.scadaSymbolEditor.behavior.typeWidgetAction': 'Widget action',
  'pages.resources.scadaSymbolEditor.behavior.valueType': 'Value type',
  'pages.resources.scadaSymbolEditor.behavior.trueLabel': 'True label',
  'pages.resources.scadaSymbolEditor.behavior.falseLabel': 'False label',
  'pages.resources.scadaSymbolEditor.behavior.stateLabel': 'State label',
  'pages.resources.scadaSymbolEditor.behavior.defaultSettings': 'Default settings (JSON)',
  'pages.resources.scadaSymbolEditor.behavior.resetDefault': 'Reset to defaults',
  'pages.resources.scadaSymbolEditor.behavior.settingsInvalidJson':
    'Settings are not valid JSON.',
  'pages.resources.scadaSymbolEditor.behavior.delete': 'Delete behavior',
  // ---- metadata: properties ----
  'pages.resources.scadaSymbolEditor.properties.title': 'Properties',
  'pages.resources.scadaSymbolEditor.properties.add': 'Add property',
  'pages.resources.scadaSymbolEditor.properties.empty': 'No properties yet.',
  'pages.resources.scadaSymbolEditor.properties.id': 'ID',
  'pages.resources.scadaSymbolEditor.properties.name': 'Name',
  'pages.resources.scadaSymbolEditor.properties.type': 'Type',
  'pages.resources.scadaSymbolEditor.properties.default': 'Default value',
  'pages.resources.scadaSymbolEditor.properties.required': 'Required',
  'pages.resources.scadaSymbolEditor.properties.delete': 'Delete property',
  'pages.resources.scadaSymbolEditor.properties.moveUp': 'Move up',
  'pages.resources.scadaSymbolEditor.properties.moveDown': 'Move down',
  // ---- static preview ----
  'pages.resources.scadaSymbolEditor.preview.title': 'Symbol preview',
  'pages.resources.scadaSymbolEditor.preview.back': 'Back to editing',
  'pages.resources.scadaSymbolEditor.preview.size':
    'Rendered at the metadata size ({sizeX}×{sizeY} cells)',
  // ---- create widget from symbol ----
  'pages.resources.scadaSymbolEditor.createWidget.title': 'Create widget from symbol',
  'pages.resources.scadaSymbolEditor.createWidget.name': 'Widget name',
  'pages.resources.scadaSymbolEditor.createWidget.nameRequired': 'Widget name is required',
  'pages.resources.scadaSymbolEditor.createWidget.bundle': 'Add to widgets bundle (optional)',
  'pages.resources.scadaSymbolEditor.createWidget.bundlePlaceholder': 'No bundle',
  'pages.resources.scadaSymbolEditor.createWidget.success': 'Widget created',
  'pages.resources.scadaSymbolEditor.createWidget.gotoList': 'Open the widget types list',
  'pages.resources.scadaSymbolEditor.createWidget.failed': 'Failed to create the widget',
};
