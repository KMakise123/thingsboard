/**
 * Images library (M11 wave-2C, spec §3.2).
 */
export default {
  // ---- gallery toolbar ----
  'pages.resources.images.listMode': 'List view',
  'pages.resources.images.gridMode': 'Grid view',
  'pages.resources.images.includeSystemImages': 'Include system images',
  'pages.resources.images.search': 'Search image',
  'pages.resources.images.refresh': 'Refresh',
  'pages.resources.images.upload': 'Upload image',
  'pages.resources.images.import': 'Import image from JSON',
  'pages.resources.images.importHint':
    'Select an exported image JSON file to import.',
  'pages.resources.images.selectedImages':
    '{count, plural, =1 {1 image} other {# images}} selected',
  'pages.resources.images.batchDelete': 'Delete selected',
  // ---- columns ----
  'pages.resources.images.preview': 'Preview',
  'pages.resources.images.name': 'Name',
  'pages.resources.images.createdTime': 'Created time',
  'pages.resources.images.resolution': 'Resolution',
  'pages.resources.images.size': 'Size',
  'pages.resources.images.system': 'System',
  'pages.resources.images.total': '{count} total',
  'pages.resources.images.empty': 'No images found',
  // ---- row actions ----
  'pages.resources.images.download': 'Download image',
  'pages.resources.images.export': 'Export image to JSON',
  'pages.resources.images.embed': 'Embed image',
  'pages.resources.images.edit': 'Edit image',
  'pages.resources.images.details': 'Image details',
  'pages.resources.images.delete': 'Delete image',
  // ---- upload ----
  'pages.resources.images.fieldFile': 'File',
  'pages.resources.images.fieldTitle': 'Title',
  'pages.resources.images.uploadHint': 'Click or drag a file here to upload',
  'pages.resources.images.uploadFileRequired':
    'Please select a file to upload.',
  'pages.resources.images.nameRequired': 'Name is required.',
  // ---- details ----
  'pages.resources.images.detailsTitle': 'Image details',
  'pages.resources.images.save': 'Save',
  'pages.resources.images.mediaType': 'Media type',
  'pages.resources.images.link': 'Link',
  // ---- embed public link ----
  'pages.resources.images.publicLinkSwitch':
    'Public (available to unauthorized users)',
  'pages.resources.images.embedCode': 'Embed code',
  'pages.resources.images.embedHint':
    'Turn on the public switch to generate a no-login link and an embed code.',
  'pages.resources.images.close': 'Close',
  // ---- image input controls ----
  'pages.resources.images.galleryTitle': 'Image gallery',
  'pages.resources.images.noImage': 'No image',
  'pages.resources.images.clearImage': 'Clear image',
  'pages.resources.images.browseFromGallery': 'Browse from gallery',
  'pages.resources.images.setLink': 'Set link',
  'pages.resources.images.imageLink': 'Image link',
  'pages.resources.images.applyLink': 'Apply',
  'pages.resources.images.addFromGallery': 'Add from gallery',
  'pages.resources.images.moveUp': 'Move up',
  'pages.resources.images.moveDown': 'Move down',
  'pages.resources.images.removeImage': 'Remove image',
  // ---- delete flow ----
  'pages.resources.images.deleteTitle':
    "Are you sure you want to delete the image '{title}'?",
  'pages.resources.images.deleteText':
    'Be careful, after the confirmation the image will become unrecoverable.',
  'pages.resources.images.deleteManyTitle':
    'Are you sure you want to delete {count, plural, =1 {1 image} other {# images}}?',
  'pages.resources.images.deleteManyText':
    'Be careful, after the confirmation all selected images will be removed and all related data will become unrecoverable.',
  'pages.resources.images.inUseTitle': 'Image is used by other entities',
  'pages.resources.images.inUseText':
    "The image '{title}' was not deleted because it is used by the following entities:",
  'pages.resources.images.inUseManyTitle': 'Images are used by other entities',
  'pages.resources.images.inUseManyText':
    'Not all images have been deleted because they are used by other entities. Select them below and force-delete if needed.',
  'pages.resources.images.deleteInUse': 'Delete anyway',
  'pages.resources.images.cancel': 'Cancel',
  'pages.resources.images.references': 'References',
  // ---- feedback ----
  'pages.resources.images.toastSaved': 'Image saved.',
  'pages.resources.images.toastDeleted': 'Image deleted.',
  'pages.resources.images.toastImported': "Image '{title}' imported.",
  'pages.resources.images.batchResult': '{ok} succeeded, {fail} failed.',
  'pages.resources.images.loadFailed': 'Failed to load images',
  'pages.resources.images.importParseError':
    'Unable to parse the image JSON file.',
  'pages.resources.images.importInvalidError':
    'Unable to import image from JSON: invalid image JSON data structure.',
} as const;
