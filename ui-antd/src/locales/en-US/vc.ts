/**
 * Version-control domain copy (pages.versionControl.*) — wave-2 hosts the
 * shared repository-settings form keys; the standalone page keys
 * (versions table / complex panels) land here in wave 6 (R32).
 */
export default {
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
};
