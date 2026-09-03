/**
 * zh-CN rule-chain page-domain keys (`editor.ruleChain.*`, M8 wave-3 D):
 * the save-conflict three-option dialog (§3.8), the DEBUG event tables
 * (node + chain), the list page and the entity details dialog. Keep
 * zh-CN/en-US key-for-key identical (check-locale gate).
 */
export default {
  // §3.8 409 三选项对话框 (form twin of the M7 core ConflictDialog)
  'editor.ruleChain.contract.conflict.title': '保存冲突',
  'editor.ruleChain.contract.conflict.intro':
    '服务器上的规则链已被他人修改；本地草稿尚未保存。',
  'editor.ruleChain.contract.conflict.serverSection': '服务器最新版本',
  'editor.ruleChain.contract.conflict.serverUnknown':
    '无法获取服务器最新版本；只能导出本地草稿。',
  'editor.ruleChain.contract.conflict.localSection': '本地草稿',
  'editor.ruleChain.contract.conflict.localDirty': '包含未保存的修改',
  'editor.ruleChain.contract.conflict.loadServer': '加载服务器版本',
  'editor.ruleChain.contract.conflict.loadServerText':
    '放弃本地草稿，继续编辑服务器版本。',
  'editor.ruleChain.contract.conflict.overwrite': '用我的版本覆盖',
  'editor.ruleChain.contract.conflict.overwriteText':
    '获取服务器最新版本号后强制保存本地草稿。',
  'editor.ruleChain.contract.conflict.exportLocal': '导出本地 JSON 后放弃',
  'editor.ruleChain.contract.conflict.exportLocalText':
    '下载本地草稿 JSON 并退出编辑器。',
  'editor.ruleChain.contract.conflict.loadFailed': '加载服务器版本失败',
  'editor.ruleChain.contract.conflict.overwriteFailed':
    '覆盖失败：服务器版本持续变化（已重试 3 次）。请选择其他操作。',
  'editor.ruleChain.contract.export.done': '草稿 JSON 已导出',

  // DEBUG 事件表（节点 + 链级共用列头/动作）
  'editor.ruleChain.events.createdTime': '时间',
  'editor.ruleChain.events.server': '服务器',
  'editor.ruleChain.events.direction': '方向',
  'editor.ruleChain.events.msgType': '消息类型',
  'editor.ruleChain.events.relationType': '关系类型',
  'editor.ruleChain.events.data': '数据',
  'editor.ruleChain.events.metadata': '元数据',
  'editor.ruleChain.events.error': '错误',
  'editor.ruleChain.events.message': '消息',
  'editor.ruleChain.events.refresh': '刷新',
  'editor.ruleChain.events.filters': '过滤',
  'editor.ruleChain.events.filtersReset': '重置',
  'editor.ruleChain.events.clear': '清空事件',
  'editor.ruleChain.events.clearTitle': '确认清空事件？',
  'editor.ruleChain.events.clearText':
    '将按当前过滤条件删除该实体的调试事件，且不可恢复。',
  'editor.ruleChain.events.empty': '暂无事件',
  'editor.ruleChain.events.loadFailed': '事件加载失败',
  'editor.ruleChain.events.clearFailed': '事件清空失败',
  'editor.ruleChain.events.nodeUnsaved':
    '保存规则链后，该节点才会开始收集调试事件。',
  'editor.ruleChain.events.viewContent': '查看',
  'editor.ruleChain.events.filter.msgDirectionType': '方向 (IN/OUT)',
  'editor.ruleChain.events.filter.msgType': '消息类型',
  'editor.ruleChain.events.filter.relationType': '关系类型',
  'editor.ruleChain.events.filter.dataSearch': '数据',
  'editor.ruleChain.events.filter.metadataSearch': '元数据',
  'editor.ruleChain.events.filter.isError': '仅看错误',
  'editor.ruleChain.events.filter.server': '服务器',
  'editor.ruleChain.events.filter.errorStr': '错误',
  'editor.ruleChain.events.filter.message': '消息',

  // 「用这条消息测试」动作（节点事件表行内；脚本族节点在场时）
  'editor.ruleChain.events.testWithThisMessage': '用这条消息测试',
  'editor.ruleChain.events.testModalTitle': '用这条消息测试脚本',
  'editor.ruleChain.events.testNotScriptNode':
    '当前节点不是脚本族节点，无法使用该消息测试。',

  // ruleChains 列表页
  'ruleChains.list.title': '规则链',
  'ruleChains.list.search': '搜索规则链',
  'ruleChains.list.refresh': '刷新',
  'ruleChains.list.createdTime': '创建时间',
  'ruleChains.list.name': '名称',
  'ruleChains.list.root': '根链',
  'ruleChains.list.total': '共 {count} 条',
  'ruleChains.list.empty': '暂无规则链',
  'ruleChains.list.loadFailed': '规则链加载失败',
  'ruleChains.list.actionOpen': '打开',
  'ruleChains.list.actionDetails': '详情',
  'ruleChains.list.actionSetRoot': '设为根链',
  'ruleChains.list.actionEdit': '编辑',
  'ruleChains.list.actionExport': '导出规则链',
  'ruleChains.list.actionDelete': '删除',
  'ruleChains.list.actionNew': '新建规则链',
  'ruleChains.list.actionImport': '导入规则链',
  'ruleChains.list.rootTag': '根',
  'ruleChains.list.setRootTitle': '确认设为根链？',
  'ruleChains.list.setRootText':
    '确认后，所有实体消息默认经由根链处理（当前根链将被替换）。',
  'ruleChains.list.setRootSuccess': '已设为根链。',
  'ruleChains.list.deleteTitle': "确认删除规则链「{name}」？",
  'ruleChains.list.deleteText':
    '删除后不可恢复；根链或被其他规则链引用的链无法删除。',
  'ruleChains.list.toastDeleted': '规则链已删除。',
  'ruleChains.list.exportFailed': '导出规则链失败：{error}',
  'ruleChains.list.editTitle': '编辑规则链',
  'ruleChains.list.newTitle': '新建规则链',
  'ruleChains.list.nameRequired': '名称必填',
  'ruleChains.list.description': '说明',
  'ruleChains.list.ok': '确定',
  'ruleChains.list.cancel': '取消',
  'ruleChains.list.toastCreated': "规则链「{name}」已创建。",
  'ruleChains.list.toastSaved': '规则链已保存。',

  // 导入对话框（spec §4.9 parity）
  'ruleChains.list.importTitle': '导入规则链',
  'ruleChains.list.importDropHint': '拖入或点击选择规则链 JSON 文件。',
  'ruleChains.list.importParseError': '文件解析失败：不是合法 JSON。',
  'ruleChains.list.importInvalidError': '文件缺少 ruleChain.name 或 metadata。',
  'ruleChains.list.importConfirmTitle': '确认导入',
  'ruleChains.list.importConfirmIntro':
    '将按以下内容新建规则链（不携带原 id/租户/根链标记）：',
  'ruleChains.list.importConfirmName': '名称',
  'ruleChains.list.importConfirmNodes': '节点数',
  'ruleChains.list.importConfirmConnections': '连接数',
  'ruleChains.list.importConfirmNotes': '便签数',
  'ruleChains.list.importConfirmMigrated':
    '已按旧格式迁移：debugMode 节点 → debugSettings（{count} 个）。',
  'ruleChains.list.importConfirmCrossChain':
    '已把 {count} 条跨链连接迁移为 Rule Chain Input 节点。',
  'ruleChains.list.importBulkNote':
    '文件为批量导出（{count} 条链），仅导入第一条。',
  'ruleChains.list.importOk': '导入并打开',
  'ruleChains.list.importFailed': '导入规则链失败：{error}',
  'ruleChains.list.toastImported': "规则链「{name}」已导入。",

  // 实体详情对话框（列表「详情」动作）
  'ruleChains.details.title': '规则链详情',
  'ruleChains.details.tabAttributes': '属性',
  'ruleChains.details.tabAlarms': '告警',
  'ruleChains.details.tabEvents': '事件',
  'ruleChains.details.tabRelations': '关联',
  'ruleChains.details.tabAuditLogs': '审计日志',
};
