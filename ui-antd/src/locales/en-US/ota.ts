/**
 * en-US strings for the OTA packages family (M13 wave-2, spec §5.5).
 * Key-for-key identical with zh-CN/ota.ts (check-locale gate).
 * Wording anchored on ui-ngx `ota-update.*` (locale.constant-en_US.json).
 */
export default {
  'pages.ota.search': 'Search packages',
  'pages.ota.add': 'Add package',
  'pages.ota.refresh': 'Refresh',
  'pages.ota.total': '{count} total',
  'pages.ota.empty': 'No packages found',
  'pages.ota.loadFailed': 'Failed to load packages',
  'pages.ota.selectedCount': '{count} selected',
  'pages.ota.batchDelete': 'Delete selected',
  'pages.ota.batchResult': '{ok} succeeded, {fail} failed.',

  // list columns
  'pages.ota.createdTime': 'Created time',
  'pages.ota.title': 'Title',
  'pages.ota.version': 'Version',
  'pages.ota.tag': 'Version tag',
  'pages.ota.type': 'Package type',
  'pages.ota.directUrl': 'Direct URL',
  'pages.ota.fileName': 'File name',
  'pages.ota.dataSize': 'File size',
  'pages.ota.checksum': 'Checksum',
  'pages.ota.type.firmware': 'Firmware',
  'pages.ota.type.software': 'Software',

  // row / header actions
  'pages.ota.download': 'Download package',
  'pages.ota.delete': 'Delete package',
  'pages.ota.cancel': 'Cancel',
  'pages.ota.deleteOneTitle':
    "Are you sure you want to delete the OTA update '{title}'?",
  'pages.ota.deleteOneText':
    'Be careful, after the confirmation the OTA update will become unrecoverable.',
  'pages.ota.deleteManyTitle':
    'Are you sure you want to delete {count, plural, =1 {1 OTA update} other {# OTA updates}}?',
  'pages.ota.deleteManyText':
    'Be careful, after the confirmation all selected OTA updates will be removed.',
  'pages.ota.toastDeleted': 'Package deleted.',
  'pages.ota.toastSaved': 'Package saved.',

  // add dialog
  'pages.ota.titleRequired': 'Title is required.',
  'pages.ota.titleMaxLength': 'Title should be less than 256 characters.',
  'pages.ota.versionRequired': 'Version is required.',
  'pages.ota.versionMaxLength': 'Version should be less than 256 characters.',
  'pages.ota.tagMaxLength': 'Tag should be less than 256 characters.',
  'pages.ota.tagHint':
    'Custom tag should match the package version reported by your device.',
  'pages.ota.profile': 'Device profile',
  'pages.ota.profileRequired': 'Device profile is required.',
  'pages.ota.profilePlaceholder': 'Search and select a device profile',
  'pages.ota.profileHint':
    'The uploaded package will be available only for devices with the chosen profile.',
  'pages.ota.sourceFile': 'Upload binary file',
  'pages.ota.sourceUrl': 'Use external URL',
  'pages.ota.packageFile': 'Package file',
  'pages.ota.dropFile':
    'Drop a package file or click to select a file to upload.',
  'pages.ota.fileRequired': 'Package file is required.',
  'pages.ota.autoChecksum': 'Auto-generate checksum',
  'pages.ota.checksumAlgorithm': 'Checksum algorithm',
  'pages.ota.checksumHint':
    'If checksum is empty, it will be generated automatically',
  'pages.ota.checksumMaxLength':
    'Checksum should be less than 1021 characters.',
  'pages.ota.urlRequired': 'Direct URL is required',
  'pages.ota.warningAfterUpload':
    'Once the package is uploaded, you will not be able to modify title, version, device profile and package type.',

  // detail page
  'pages.ota.detailLoadFailed': 'Failed to load the package',
  'pages.ota.description': 'Description',
  'pages.ota.contentType': 'Content type',
  'pages.ota.url': 'URL',
  'pages.ota.save': 'Save',
  'pages.ota.copyId': 'Copy package Id',
  'pages.ota.copyChecksum': 'Copy checksum',
  'pages.ota.copyDirectUrl': 'Copy direct URL',
  'pages.ota.copiedId': 'Package Id has been copied to clipboard',
  'pages.ota.copiedChecksum': 'Package checksum has been copied to clipboard',
  'pages.ota.copiedDirectUrl':
    'Package direct URL has been copied to clipboard',
  'pages.ota.copyFailed': 'Copy failed, select and copy manually',
};
