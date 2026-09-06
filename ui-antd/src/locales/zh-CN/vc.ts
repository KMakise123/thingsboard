/**
 * 版本控制域文案（pages.versionControl.*）——wave-2 先落共享仓库设置表单
 * 文案；独立页（版本表/复数面板）文案随 wave 6 落同一文件（R32）。
 */
export default {
  'pages.versionControl.repository.title': '仓库设置',
  'pages.versionControl.repository.repositoryUri': '仓库 URL',
  'pages.versionControl.repository.repositoryUriRequired':
    '仓库 URL 为必填项。',
  'pages.versionControl.repository.defaultBranch': '默认分支名',
  'pages.versionControl.repository.readOnly': '只读',
  'pages.versionControl.repository.readOnlyHint':
    '只读期间，租户所有会写入仓库的版本控制操作（创建版本、自动提交）都将被禁用。',
  'pages.versionControl.repository.showMergeCommits': '显示合并提交',
  'pages.versionControl.repository.authentication': '认证设置',
  'pages.versionControl.repository.authMethod': '认证方式',
  'pages.versionControl.repository.authMethodRequired': '认证方式为必填项。',
  'pages.versionControl.repository.authMethodUsernamePassword':
    '密码 / 访问令牌',
  'pages.versionControl.repository.authMethodPrivateKey': '私钥',
  'pages.versionControl.repository.username': '用户名',
  'pages.versionControl.repository.password': '密码 / 访问令牌',
  'pages.versionControl.repository.usernamePasswordHint':
    'GitHub 用户必须使用对仓库具备写权限的访问令牌（token）。',
  'pages.versionControl.repository.changePassword': '更改密码 / 访问令牌',
  'pages.versionControl.repository.privateKey': '私钥',
  'pages.versionControl.repository.privateKeyRequired': '私钥文件为必填项。',
  'pages.versionControl.repository.dropPrivateKeyFile':
    '拖拽私钥文件到此处，或点击选择',
  'pages.versionControl.repository.passphrase': '私钥口令',
  'pages.versionControl.repository.changePassphrase': '更改私钥口令',
  'pages.versionControl.repository.checkAccess': '检查访问',
  'pages.versionControl.repository.checkAccessSuccess': '仓库访问验证成功！',
  'pages.versionControl.repository.checkAccessFailed': '仓库访问验证失败。',
  'pages.versionControl.repository.saveFailedHint':
    '仓库设置保存失败。请先执行“检查访问”查看底层原因。',
  'pages.versionControl.repository.toastSaved': '仓库设置已保存。',
  'pages.versionControl.repository.toastDeleted': '仓库设置已删除。',
  'pages.versionControl.repository.delete': '删除',
  'pages.versionControl.repository.deleteConfirmTitle':
    '确定要删除仓库设置吗？',
  'pages.versionControl.repository.deleteConfirmText':
    '请谨慎操作：确认后仓库设置将被移除，版本控制功能将不可用。',
  'pages.versionControl.repository.configuredState': '仓库已配置。',
  'pages.versionControl.repository.notConfiguredState': '仓库尚未配置。',
};
