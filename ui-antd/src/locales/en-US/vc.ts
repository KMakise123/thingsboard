/**
 * Version-control domain copy (pages.versionControl.*) — wave-2 hosts the
 * shared repository-settings form keys; wave 6 adds the standalone page
 * keys (versions table / complex panels) (R32). Wording follows the
 * ui-ngx version-control.* section (HTML tags dropped).
 */
export default {
  // ---- repository settings (wave-2 shared form) ----
  'pages.versionControl.repository.title': 'Repository settings',
  'pages.versionControl.repository.repositoryUri': 'Repository URL',
  'pages.versionControl.repository.repositoryUriRequired':
    'Repository URL is required.',
  'pages.versionControl.repository.defaultBranch': 'Default branch name',
  'pages.versionControl.repository.readOnly': 'Read-only',
  'pages.versionControl.repository.readOnlyHint':
    'While read-only, every version-control operation that writes to the repository (create version, auto-commit) is disabled for the tenant.',
  'pages.versionControl.repository.showMergeCommits': 'Show merge commits',
  'pages.versionControl.repository.authentication': 'Authentication settings',
  'pages.versionControl.repository.authMethod': 'Authentication method',
  'pages.versionControl.repository.authMethodRequired':
    'Authentication method is required.',
  'pages.versionControl.repository.authMethodUsernamePassword':
    'Password / access token',
  'pages.versionControl.repository.authMethodPrivateKey': 'Private key',
  'pages.versionControl.repository.username': 'Username',
  'pages.versionControl.repository.password': 'Password / access token',
  'pages.versionControl.repository.usernamePasswordHint':
    'GitHub users must use access tokens with write permissions to the repository.',
  'pages.versionControl.repository.changePassword':
    'Change password / access token',
  'pages.versionControl.repository.privateKey': 'Private key',
  'pages.versionControl.repository.privateKeyRequired':
    'Private key file is required.',
  'pages.versionControl.repository.dropPrivateKeyFile':
    'Drag and drop a private key file or click',
  'pages.versionControl.repository.passphrase': 'Passphrase',
  'pages.versionControl.repository.changePassphrase': 'Change passphrase',
  'pages.versionControl.repository.checkAccess': 'Check access',
  'pages.versionControl.repository.checkAccessSuccess':
    'Repository access successfully verified!',
  'pages.versionControl.repository.checkAccessFailed':
    'Failed to verify repository access.',
  'pages.versionControl.repository.saveFailedHint':
    'Failed to save the repository settings. Run Check access to see the underlying reason.',
  'pages.versionControl.repository.toastSaved': 'Repository settings saved.',
  'pages.versionControl.repository.toastDeleted':
    'Repository settings deleted.',
  'pages.versionControl.repository.delete': 'Delete',
  'pages.versionControl.repository.deleteConfirmTitle':
    'Are you sure you want to delete repository settings?',
  'pages.versionControl.repository.deleteConfirmText':
    'Be careful, after the confirmation the repository settings will be removed and version control feature will be unavailable.',
  'pages.versionControl.repository.configuredState': 'Repository configured.',
  'pages.versionControl.repository.notConfiguredState':
    'Repository is not configured yet.',

  // ---- common (standalone page + panels + dialogs) ----
  'pages.versionControl.branch': 'Branch',
  'pages.versionControl.selectBranch': 'Select branch',
  'pages.versionControl.defaultBranchSuffix': 'default',
  'pages.versionControl.branchRequired': 'Branch is required.',
  'pages.versionControl.versionName': 'Version name',
  'pages.versionControl.versionNameRequired': 'Version name is required.',
  'pages.versionControl.defaultVersionName': '{entityName} update',
  'pages.versionControl.createVersion': 'Create version',
  'pages.versionControl.restoreVersion': 'Restore version',
  'pages.versionControl.restore': 'Restore',
  'pages.versionControl.close': 'Close',
  'pages.versionControl.confirm': 'Confirm',
  'pages.versionControl.nothingToCommit': 'No changes to commit',
  'pages.versionControl.versionCreateResult':
    '{added} added, {modified} modified, {removed} removed.',
  'pages.versionControl.noEntitiesRestored': 'No entities restored',
  'pages.versionControl.loadTypeResult':
    '{created} created, {updated} updated, {deleted} deleted.',
  'pages.versionControl.taskFailed': 'Version control task failed',
  'pages.versionControl.requestFailed': 'Version control request failed',
  'pages.versionControl.loadFailed': 'Version control is unavailable',

  // ---- entity types (ngx exportableEntityTypes, 16 types) ----
  'pages.versionControl.entityType': 'Entity type',
  'pages.versionControl.entityTypeUndefined': 'Undefined',
  'pages.versionControl.entityTypes.ASSET': 'Assets',
  'pages.versionControl.entityTypes.DEVICE': 'Devices',
  'pages.versionControl.entityTypes.ENTITY_VIEW': 'Entity views',
  'pages.versionControl.entityTypes.DASHBOARD': 'Dashboards',
  'pages.versionControl.entityTypes.CUSTOMER': 'Customers',
  'pages.versionControl.entityTypes.DEVICE_PROFILE': 'Device profiles',
  'pages.versionControl.entityTypes.ASSET_PROFILE': 'Asset profiles',
  'pages.versionControl.entityTypes.RULE_CHAIN': 'Rule chains',
  'pages.versionControl.entityTypes.WIDGET_TYPE': 'Widget types',
  'pages.versionControl.entityTypes.WIDGETS_BUNDLE': 'Widgets bundles',
  'pages.versionControl.entityTypes.TB_RESOURCE': 'Resources library',
  'pages.versionControl.entityTypes.OTA_PACKAGE': 'OTA packages',
  'pages.versionControl.entityTypes.NOTIFICATION_TEMPLATE':
    'Notification templates',
  'pages.versionControl.entityTypes.NOTIFICATION_TARGET':
    'Notification targets',
  'pages.versionControl.entityTypes.NOTIFICATION_RULE': 'Notification rules',
  'pages.versionControl.entityTypes.AI_MODEL': 'AI models',
  'pages.versionControl.addEntityType': 'Add entity type',
  'pages.versionControl.removeEntityType': 'Remove',
  'pages.versionControl.removeAll': 'Remove all',

  // ---- sync strategy ----
  'pages.versionControl.syncStrategy': 'Sync strategy',
  'pages.versionControl.syncStrategyDefault': 'Default',
  'pages.versionControl.defaultSyncStrategy': 'Default sync strategy',
  'pages.versionControl.syncStrategyRequired': 'Sync strategy is required.',
  'pages.versionControl.syncStrategyMerge': 'Merge',
  'pages.versionControl.syncStrategyOverwrite': 'Overwrite',
  'pages.versionControl.syncStrategyMergeHint':
    'Creates or updates the selected entities in the repository. All other repository entities are not modified.',
  'pages.versionControl.syncStrategyOverwriteHint':
    'Creates or updates the selected entities in the repository. All other repository entities are deleted.',
  'pages.versionControl.allEntities': 'All entities',

  // ---- export / load flags ----
  'pages.versionControl.exportCredentials': 'Export credentials',
  'pages.versionControl.exportAttributes': 'Export attributes',
  'pages.versionControl.exportRelations': 'Export relations',
  'pages.versionControl.exportCalculatedFields':
    'Export calculated fields and alarm rules',
  'pages.versionControl.loadCredentials': 'Load credentials',
  'pages.versionControl.loadAttributes': 'Load attributes',
  'pages.versionControl.loadRelations': 'Load relations',
  'pages.versionControl.loadCalculatedFields':
    'Load calculated fields and alarm rules',
  'pages.versionControl.findExistingEntityByName':
    'Find existing entity by name',
  'pages.versionControl.removeOtherEntities': 'Remove other entities',
  'pages.versionControl.removeOtherEntitiesConfirmTitle':
    'Remove other entities?',
  'pages.versionControl.removeOtherEntitiesConfirmText':
    'Be careful! This will permanently DELETE ALL current entities not present in the version you want to restore.',
  'pages.versionControl.removeOtherEntitiesConfirmType':
    'Please type "remove other entities" to confirm.',
  'pages.versionControl.rollbackOnError': 'Rollback on error',
  'pages.versionControl.rollbackOnErrorHint':
    'If an error occurs during the version loading, already persisted entities (relations, attributes, etc.) stay as is.',

  // ---- complex create panel ----
  'pages.versionControl.complexCreate.title': 'Create entities version',
  'pages.versionControl.complexCreate.entitiesToExport': 'Entities to export',
  'pages.versionControl.complexCreate.noEntitiesToExport':
    'Please specify entities to export',
  'pages.versionControl.complexCreate.pickEntities': 'Pick entities',
  'pages.versionControl.complexCreate.entitiesRequired':
    'Please specify entities to export',

  // ---- complex restore panel ----
  'pages.versionControl.complexRestore.title':
    'Restore entities from version "{versionName}"',
  'pages.versionControl.complexRestore.entitiesToRestore':
    'Entities to restore',
  'pages.versionControl.complexRestore.noEntitiesToRestore':
    'Please specify entities to restore',

  // ---- standalone versions table ----
  'pages.versionControl.versions.title': 'Versions',
  'pages.versionControl.versions.search': 'Search versions',
  'pages.versionControl.versions.createdTime': 'Created time',
  'pages.versionControl.versions.versionId': 'Version id',
  'pages.versionControl.versions.versionName': 'Version name',
  'pages.versionControl.versions.author': 'Author',
  'pages.versionControl.versions.actions': 'Actions',
  'pages.versionControl.versions.total': '{total} items',
  'pages.versionControl.versions.empty': 'No versions found',
  'pages.versionControl.versions.loadFailed': 'Failed to load versions',

  // ---- standalone page gate ----
  'pages.versionControl.gateHint':
    'Version control needs a Git repository configured for the tenant.',
  'pages.versionControl.goToSettings':
    'Configure it in the repository settings',
  'pages.versionControl.readOnlyBanner':
    'The repository is read-only: creating versions is disabled until the repository settings turn it off.',

  // ---- load error three states (EntityLoadError) ----
  'pages.versionControl.loadError.deviceCredentialsConflict':
    'Failed to load the device with external id {entityId} because the same credentials are already present in the database for another device. Consider disabling the "Load credentials" setting in the restore form.',
  'pages.versionControl.loadError.missingReferencedEntity':
    'Failed to load the {sourceEntityType} with external id {sourceEntityId} because it references a missing {targetEntityType} with id {targetEntityId}.',
  'pages.versionControl.loadError.runtime': 'Failed: {message}',
};
