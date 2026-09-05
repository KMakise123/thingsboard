/**
 * JavaScript library (M11 wave 1A, spec §3.4).
 */
export default {
  // ---- list ----
  'pages.resources.jsLibrary.search': 'Search scripts',
  'pages.resources.jsLibrary.subTypePlaceholder': 'All script types',
  'pages.resources.jsLibrary.createdTime': 'Created time',
  'pages.resources.jsLibrary.title': 'Title',
  'pages.resources.jsLibrary.scriptType': 'Script type',
  'pages.resources.jsLibrary.system': 'System',
  'pages.resources.jsLibrary.subType.extension': 'Extension',
  'pages.resources.jsLibrary.subType.module': 'Module',
  // ---- actions ----
  'pages.resources.jsLibrary.refresh': 'Refresh',
  'pages.resources.jsLibrary.add': 'Add script',
  'pages.resources.jsLibrary.edit': 'Edit script',
  'pages.resources.jsLibrary.fieldTitle': 'Title',
  'pages.resources.jsLibrary.fieldSubType': 'Script type',
  'pages.resources.jsLibrary.fieldContent': 'Code',
  'pages.resources.jsLibrary.fieldFile': 'File',
  'pages.resources.jsLibrary.upload': 'Upload file',
  'pages.resources.jsLibrary.uploadHint': 'Click or drag a .js file here to upload',
  'pages.resources.jsLibrary.download': 'Download',
  'pages.resources.jsLibrary.delete': 'Delete',
  'pages.resources.jsLibrary.batchDelete': 'Delete selected',
  'pages.resources.jsLibrary.selectedCount': '{count} selected',
  'pages.resources.jsLibrary.titleRequired': 'Title is required',
  // ---- delete flow ----
  'pages.resources.jsLibrary.deleteOneTitle':
    "Are you sure you want to delete the script '{title}'?",
  'pages.resources.jsLibrary.deleteOneText':
    'Be careful, after the confirmation the script will become unrecoverable.',
  'pages.resources.jsLibrary.deleteManyTitle':
    'Are you sure you want to delete {count, plural, =1 {1 script} other {# scripts}}?',
  'pages.resources.jsLibrary.deleteManyText':
    'Be careful, after the confirmation all selected scripts will be removed and become unrecoverable.',
  'pages.resources.jsLibrary.inUseTitle': 'Script is in use',
  'pages.resources.jsLibrary.inUseText':
    "'{title}' is still referenced by the entities below; deleting it will break them.",
  'pages.resources.jsLibrary.inUseManyTitle': 'Scripts are in use',
  'pages.resources.jsLibrary.inUseManyText':
    'The scripts below are still referenced by other entities; select the ones to force-delete.',
  'pages.resources.jsLibrary.deleteInUse': 'Delete anyway',
  'pages.resources.jsLibrary.cancel': 'Cancel',
  'pages.resources.jsLibrary.references': 'References',
  // ---- feedback ----
  'pages.resources.jsLibrary.toastDeleted': 'Script deleted.',
  'pages.resources.jsLibrary.toastSaved': 'Script saved.',
  'pages.resources.jsLibrary.batchResult': '{ok} succeeded, {fail} failed.',
  'pages.resources.jsLibrary.loadFailed': 'Failed to load scripts',
  'pages.resources.jsLibrary.empty': 'No scripts',
  'pages.resources.jsLibrary.total': '{count} total',
} as const;
