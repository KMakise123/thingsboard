/**
 * Resources file library (M11 wave 1A, spec §3.5). The entityTypes.* block
 * holds the referencing-entity display names shared by the whole resources
 * family delete flow (the wave-2C image gallery reuses the same keys).
 */
export default {
  // ---- list ----
  'pages.resources.library.search': 'Search resources',
  'pages.resources.library.typePlaceholder': 'All resource types',
  'pages.resources.library.createdTime': 'Created time',
  'pages.resources.library.title': 'Title',
  'pages.resources.library.resourceType': 'Resource type',
  'pages.resources.library.fileName': 'File name',
  'pages.resources.library.system': 'System',
  'pages.resources.library.type.lwm2mModel': 'LwM2M model',
  'pages.resources.library.type.pkcs12': 'PKCS #12',
  'pages.resources.library.type.jks': 'JKS',
  'pages.resources.library.type.general': 'General',
  'pages.resources.library.type.jsModule': 'JavaScript module',
  // ---- referencing entity types (shared resources delete flow) ----
  'pages.resources.library.entityTypes.WIDGET_TYPE': 'Widget type',
  'pages.resources.library.entityTypes.WIDGETS_BUNDLE': 'Widgets bundle',
  'pages.resources.library.entityTypes.DASHBOARD': 'Dashboard',
  'pages.resources.library.entityTypes.RULE_CHAIN': 'Rule chain',
  'pages.resources.library.entityTypes.DEVICE_PROFILE': 'Device profile',
  'pages.resources.library.entityTypes.ASSET_PROFILE': 'Asset profile',
  'pages.resources.library.entityTypes.DEVICE': 'Device',
  'pages.resources.library.entityTypes.ASSET': 'Asset',
  'pages.resources.library.entityTypes.ENTITY_VIEW': 'Entity view',
  'pages.resources.library.entityTypes.CUSTOMER': 'Customer',
  'pages.resources.library.entityTypes.USER': 'User',
  'pages.resources.library.entityTypes.TENANT': 'Tenant',
  // ---- actions ----
  'pages.resources.library.refresh': 'Refresh',
  'pages.resources.library.upload': 'Upload resources',
  'pages.resources.library.uploadTitle': 'Upload files',
  'pages.resources.library.uploadHint':
    'Click or drag files here to upload; multiple files are supported',
  'pages.resources.library.edit': 'Edit info',
  'pages.resources.library.editTitle': 'Edit resource info',
  'pages.resources.library.formTitle': 'Title',
  'pages.resources.library.download': 'Download',
  'pages.resources.library.delete': 'Delete',
  'pages.resources.library.batchDelete': 'Delete selected',
  'pages.resources.library.selectedCount': '{count} selected',
  // ---- delete flow ----
  'pages.resources.library.deleteOneTitle':
    "Are you sure you want to delete the resource '{title}'?",
  'pages.resources.library.deleteOneText':
    'Be careful, after the confirmation the resource will become unrecoverable.',
  'pages.resources.library.deleteManyTitle':
    'Are you sure you want to delete {count, plural, =1 {1 resource} other {# resources}}?',
  'pages.resources.library.deleteManyText':
    'Be careful, after the confirmation all selected resources will be removed and become unrecoverable.',
  'pages.resources.library.inUseTitle': 'Resource is in use',
  'pages.resources.library.inUseText':
    "'{title}' is still referenced by the entities below; deleting it will break them.",
  'pages.resources.library.inUseManyTitle': 'Resources are in use',
  'pages.resources.library.inUseManyText':
    'The resources below are still referenced by other entities; select the ones to force-delete.',
  'pages.resources.library.deleteInUse': 'Delete anyway',
  'pages.resources.library.cancel': 'Cancel',
  'pages.resources.library.references': 'References',
  // ---- feedback ----
  'pages.resources.library.toastDeleted': 'Resource deleted.',
  'pages.resources.library.toastUpdated': 'Resource info updated.',
  'pages.resources.library.batchResult': '{ok} succeeded, {fail} failed.',
  'pages.resources.library.loadFailed': 'Failed to load resources',
  'pages.resources.library.empty': 'No resources',
  'pages.resources.library.total': '{count} total',
} as const;
