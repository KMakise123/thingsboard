/**
 * zh-CN editor dashboard contract keys (`editor.dashboard.contract.*`, M7
 * wave D — §3.1 exit two-path / §3.8 dirty + leave confirm + 409 three
 * options + import/export / §3.9 contract). Keep zh-CN/en-US key-for-key
 * identical (check-locale gate). The `editor.dashboard.conflict.title` and
 * toolbar keys stay in editor-dashboard.ts (C wave) — never redefine them.
 */
export default {
  // §3.8 leave confirm — discard-changes exit (取消退出 when dirty)
  'editor.dashboard.contract.discardTitle': '未保存的修改',
  'editor.dashboard.contract.discardText':
    '当前草稿有未保存的修改，退出编辑将放弃这些修改。',
  'editor.dashboard.contract.discardOk': '放弃修改',

  // §3.8 409 three-option conflict dialog
  'editor.dashboard.contract.conflict.intro':
    '服务器上的仪表盘已被其他来源修改，本地草稿尚未保存。',
  'editor.dashboard.contract.conflict.serverSection': '服务器最新版本',
  'editor.dashboard.contract.conflict.serverUnknown':
    '无法获取服务器最新版本，仅可导出本地草稿。',
  'editor.dashboard.contract.conflict.localSection': '本地草稿',
  'editor.dashboard.contract.conflict.localDirty': '包含未保存的修改',
  'editor.dashboard.contract.conflict.loadServer': '加载服务器版',
  'editor.dashboard.contract.conflict.loadServerText':
    '放弃本地草稿，切换到服务器版本继续编辑。',
  'editor.dashboard.contract.conflict.overwrite': '用我的版本覆盖',
  'editor.dashboard.contract.conflict.overwriteText':
    '获取服务器最新版本号后强制保存本地草稿。',
  'editor.dashboard.contract.conflict.exportLocal': '导出本地 JSON 后放弃',
  'editor.dashboard.contract.conflict.exportLocalText':
    '下载本地草稿 JSON，放弃编辑回到只读页。',
  'editor.dashboard.contract.conflict.overwriteFailed':
    '覆盖失败：服务器版本仍在变化（已重试 3 次），请改用其他选项。',
  'editor.dashboard.contract.conflict.loadFailed': '加载服务器版本失败',

  // §3.8 import into the open editor (draft swap, one undoable group)
  'editor.dashboard.contract.import.title': '导入仪表盘',
  'editor.dashboard.contract.import.pickHint':
    '点击或拖拽仪表盘 JSON 文件到此处',
  'editor.dashboard.contract.import.confirmTitle': '确认导入',
  'editor.dashboard.contract.import.confirmText':
    '导入内容将替换当前草稿；这是一个撤销组，可用撤销整体恢复。',
  'editor.dashboard.contract.import.widgetCount': '{count} 个 widget',
  'editor.dashboard.contract.import.missingAliases':
    '导入的 widget 引用了 {count} 个未定义的实体别名，请补录或跳过：',
  'editor.dashboard.contract.import.aliasNameLabel': '别名名称',
  'editor.dashboard.contract.import.create': '补录',
  'editor.dashboard.contract.import.created': '已补录',
  'editor.dashboard.contract.import.skip': '跳过',
  'editor.dashboard.contract.import.defaultFilterNote':
    '补录的别名默认创建为设备类型过滤器，可稍后在「别名」管理中修改。',
  'editor.dashboard.contract.import.apply': '导入',
  'editor.dashboard.contract.import.applied': '导入成功（可撤销）',

  // §3.8 export current draft
  'editor.dashboard.contract.export.done': '已导出当前草稿 JSON',
};
