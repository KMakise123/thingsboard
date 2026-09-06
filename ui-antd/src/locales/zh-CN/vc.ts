/**
 * 版本控制域文案（pages.versionControl.*）——wave-2 落共享仓库设置表单文案，
 * wave-6 落独立页（版本表/复数 create/restore 面板）文案（R32）。
 * 译词对齐 ui-ngx version-control.* 段（去 HTML 标签）。
 */
export default {
  // ---- repository settings（wave-2 共享表单）----
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

  // ---- 通用（独立页 + 双面板 + 弹层）----
  'pages.versionControl.branch': '分支',
  'pages.versionControl.selectBranch': '选择分支',
  'pages.versionControl.defaultBranchSuffix': '默认',
  'pages.versionControl.branchRequired': '分支为必填项。',
  'pages.versionControl.versionName': '版本名称',
  'pages.versionControl.versionNameRequired': '版本名称为必填项。',
  'pages.versionControl.defaultVersionName': '{entityName} 更新',
  'pages.versionControl.createVersion': '创建版本',
  'pages.versionControl.restoreVersion': '恢复版本',
  'pages.versionControl.restore': '恢复',
  'pages.versionControl.close': '关闭',
  'pages.versionControl.confirm': '确认',
  'pages.versionControl.nothingToCommit': '无更改可提交',
  'pages.versionControl.versionCreateResult':
    '新增 {added} 个、修改 {modified} 个、移除 {removed} 个。',
  'pages.versionControl.noEntitiesRestored': '未恢复任何实体',
  'pages.versionControl.loadTypeResult':
    '{created} 已创建、{updated} 已更新、{deleted} 已删除。',
  'pages.versionControl.taskFailed': '版本控制任务失败',
  'pages.versionControl.requestFailed': '版本控制请求失败',
  'pages.versionControl.loadFailed': '版本控制不可用',

  // ---- 实体类型清单（ngx exportableEntityTypes 16 种）----
  'pages.versionControl.entityType': '实体类型',
  'pages.versionControl.entityTypeUndefined': '未定义',
  'pages.versionControl.entityTypes.ASSET': '资产',
  'pages.versionControl.entityTypes.DEVICE': '设备',
  'pages.versionControl.entityTypes.ENTITY_VIEW': '实体视图',
  'pages.versionControl.entityTypes.DASHBOARD': '仪表盘',
  'pages.versionControl.entityTypes.CUSTOMER': '客户',
  'pages.versionControl.entityTypes.DEVICE_PROFILE': '设备配置',
  'pages.versionControl.entityTypes.ASSET_PROFILE': '资产配置',
  'pages.versionControl.entityTypes.RULE_CHAIN': '规则链',
  'pages.versionControl.entityTypes.WIDGET_TYPE': '部件类型',
  'pages.versionControl.entityTypes.WIDGETS_BUNDLE': '部件包',
  'pages.versionControl.entityTypes.TB_RESOURCE': '资源库',
  'pages.versionControl.entityTypes.OTA_PACKAGE': 'OTA 包',
  'pages.versionControl.entityTypes.NOTIFICATION_TEMPLATE': '通知模板',
  'pages.versionControl.entityTypes.NOTIFICATION_TARGET': '通知收件人',
  'pages.versionControl.entityTypes.NOTIFICATION_RULE': '通知规则',
  'pages.versionControl.entityTypes.AI_MODEL': 'AI 模型',
  'pages.versionControl.addEntityType': '添加实体类型',
  'pages.versionControl.removeEntityType': '移除',
  'pages.versionControl.removeAll': '全部移除',

  // ---- 同步策略 ----
  'pages.versionControl.syncStrategy': '同步策略',
  'pages.versionControl.syncStrategyDefault': '默认',
  'pages.versionControl.defaultSyncStrategy': '默认同步策略',
  'pages.versionControl.syncStrategyRequired': '同步策略为必填项。',
  'pages.versionControl.syncStrategyMerge': '合并',
  'pages.versionControl.syncStrategyOverwrite': '覆盖',
  'pages.versionControl.syncStrategyMergeHint':
    '在仓库中创建或更新选中的实体，所有其他仓库实体不会被修改。',
  'pages.versionControl.syncStrategyOverwriteHint':
    '在仓库中创建或更新选中的实体，所有其他仓库实体将被删除。',
  'pages.versionControl.allEntities': '所有实体',

  // ---- 导出 / 加载开关 ----
  'pages.versionControl.exportCredentials': '导出凭证',
  'pages.versionControl.exportAttributes': '导出属性',
  'pages.versionControl.exportRelations': '导出关联',
  'pages.versionControl.exportCalculatedFields': '导出计算字段及告警规则',
  'pages.versionControl.loadCredentials': '加载凭证',
  'pages.versionControl.loadAttributes': '加载属性',
  'pages.versionControl.loadRelations': '加载关联',
  'pages.versionControl.loadCalculatedFields': '加载计算字段和告警规则',
  'pages.versionControl.findExistingEntityByName': '按名称查找现有实体',
  'pages.versionControl.removeOtherEntities': '移除其他实体',
  'pages.versionControl.removeOtherEntitiesConfirmTitle': '移除其他实体？',
  'pages.versionControl.removeOtherEntitiesConfirmText':
    '请注意！此操作将永久删除当前所有不在您要恢复的版本中的实体。',
  'pages.versionControl.removeOtherEntitiesConfirmType':
    '请输入 "remove other entities" 以确认。',
  'pages.versionControl.rollbackOnError': '出错时回滚',
  'pages.versionControl.rollbackOnErrorHint':
    '如果恢复过程中发生错误，已持久化的实体（包括关联、属性等）将保持原样。',

  // ---- 复数 create 面板 ----
  'pages.versionControl.complexCreate.title': '创建实体版本',
  'pages.versionControl.complexCreate.entitiesToExport': '要导出的实体',
  'pages.versionControl.complexCreate.noEntitiesToExport': '请指定要导出的实体',
  'pages.versionControl.complexCreate.pickEntities': '选择实体',
  'pages.versionControl.complexCreate.entitiesRequired': '请指定要导出的实体',

  // ---- 复数 restore 面板 ----
  'pages.versionControl.complexRestore.title': '从版本“{versionName}”恢复实体',
  'pages.versionControl.complexRestore.entitiesToRestore': '要恢复的实体',
  'pages.versionControl.complexRestore.noEntitiesToRestore':
    '请指定要恢复的实体',

  // ---- 独立页版本表 ----
  'pages.versionControl.versions.title': '版本',
  'pages.versionControl.versions.search': '搜索版本',
  'pages.versionControl.versions.createdTime': '创建时间',
  'pages.versionControl.versions.versionId': '版本 ID',
  'pages.versionControl.versions.versionName': '版本名称',
  'pages.versionControl.versions.author': '作者',
  'pages.versionControl.versions.actions': '操作',
  'pages.versionControl.versions.total': '共 {total} 条',
  'pages.versionControl.versions.empty': '未找到版本',
  'pages.versionControl.versions.loadFailed': '版本列表加载失败',

  // ---- 独立页二段 gate ----
  'pages.versionControl.gateHint': '版本控制需要先为租户配置 Git 仓库。',
  'pages.versionControl.goToSettings': '前往仓库设置配置',
  'pages.versionControl.readOnlyBanner':
    '仓库处于只读状态：在仓库设置中关闭只读前，无法创建版本。',

  // ---- 恢复错误三态（EntityLoadError）----
  'pages.versionControl.loadError.deviceCredentialsConflict':
    '无法加载外部 ID 为 {entityId} 的设备，因为数据库中另一个设备已存在相同的凭证。请考虑在恢复表单中禁用“加载凭证”设置。',
  'pages.versionControl.loadError.missingReferencedEntity':
    '无法加载外部 ID 为 {sourceEntityId} 的 {sourceEntityType}，因为它引用了缺失的 ID 为 {targetEntityId} 的 {targetEntityType}。',
  'pages.versionControl.loadError.runtime': '失败：{message}',
};
