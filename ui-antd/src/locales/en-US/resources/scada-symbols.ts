/**
 * SCADA symbols library (M11 wave-2C, spec §3.3 library-list part).
 */
export default {
  // ---- gallery toolbar ----
  'pages.resources.scadaSymbols.listMode': 'List view',
  'pages.resources.scadaSymbols.gridMode': 'Grid view',
  'pages.resources.scadaSymbols.includeSystemImages': 'Include system symbols',
  'pages.resources.scadaSymbols.search': 'Search symbol',
  'pages.resources.scadaSymbols.refresh': 'Refresh',
  'pages.resources.scadaSymbols.upload': 'Upload SCADA symbol',
  'pages.resources.scadaSymbols.import': 'Import SCADA symbol from JSON',
  'pages.resources.scadaSymbols.importHint':
    'Select an exported symbol JSON file to import.',
  'pages.resources.scadaSymbols.selectedImages':
    '{count, plural, =1 {1 symbol} other {# symbols}} selected',
  'pages.resources.scadaSymbols.batchDelete': 'Delete selected',
  // ---- columns ----
  'pages.resources.scadaSymbols.preview': 'Preview',
  'pages.resources.scadaSymbols.name': 'Name',
  'pages.resources.scadaSymbols.createdTime': 'Created time',
  'pages.resources.scadaSymbols.resolution': 'Resolution',
  'pages.resources.scadaSymbols.size': 'Size',
  'pages.resources.scadaSymbols.system': 'System',
  'pages.resources.scadaSymbols.total': '{count} total',
  'pages.resources.scadaSymbols.empty': 'No symbols found',
  // ---- row actions ----
  'pages.resources.scadaSymbols.download': 'Download SCADA symbol',
  'pages.resources.scadaSymbols.export': 'Export SCADA symbol to JSON',
  'pages.resources.scadaSymbols.edit': 'Edit SCADA symbol',
  'pages.resources.scadaSymbols.details': 'SCADA symbol details',
  'pages.resources.scadaSymbols.delete': 'Delete SCADA symbol',
  // ---- delete flow ----
  'pages.resources.scadaSymbols.deleteTitle':
    "Are you sure you want to delete the SCADA symbol '{title}'?",
  'pages.resources.scadaSymbols.deleteText':
    'Be careful, after the confirmation the SCADA symbol will become unrecoverable.',
  'pages.resources.scadaSymbols.deleteManyTitle':
    'Are you sure you want to delete {count, plural, =1 {1 SCADA symbol} other {# SCADA symbols}}?',
  'pages.resources.scadaSymbols.deleteManyText':
    'Be careful, after the confirmation all selected SCADA symbols will be removed and all related data will become unrecoverable.',
  'pages.resources.scadaSymbols.inUseTitle':
    'SCADA symbol is used by other entities',
  'pages.resources.scadaSymbols.inUseText':
    "The SCADA symbol '{title}' was not deleted because it is used by the following entities:",
  'pages.resources.scadaSymbols.inUseManyTitle':
    'SCADA symbols are used by other entities',
  'pages.resources.scadaSymbols.inUseManyText':
    'Not all SCADA symbols have been deleted because they are used by other entities. Select them below and force-delete if needed.',
  'pages.resources.scadaSymbols.deleteInUse': 'Delete anyway',
  'pages.resources.scadaSymbols.cancel': 'Cancel',
  'pages.resources.scadaSymbols.references': 'References',
  // ---- feedback ----
  'pages.resources.scadaSymbols.toastDeleted': 'SCADA symbol deleted.',
  'pages.resources.scadaSymbols.toastImported':
    "SCADA symbol '{title}' imported.",
  'pages.resources.scadaSymbols.batchResult': '{ok} succeeded, {fail} failed.',
  'pages.resources.scadaSymbols.loadFailed': 'Failed to load SCADA symbols',
} as const;
