/**
 * zh-CN editor dashboard keys (`editor.dashboard.*`, M7 brief §3 C wave).
 * Keep zh-CN/en-US key-for-key identical (check-locale gate). Keys shared
 * with the editor-common domain (save/undo/redo/…) stay in editor.ts.
 */
export default {
  'editor.dashboard.toolbar.manageLayouts': '管理布局',
  'editor.dashboard.toolbar.rightLayout': '右侧布局',
  'editor.dashboard.toolbar.fullscreen': '全屏',
  'editor.dashboard.toolbar.exitFullscreen': '退出全屏',
  'editor.dashboard.toolbar.states': '状态',
  'editor.dashboard.toolbar.aliases': '别名',
  'editor.dashboard.toolbar.filters': '过滤器',
  'editor.dashboard.toolbar.settings': '设置',
  'editor.dashboard.toolbar.import': '导入',
  'editor.dashboard.toolbar.export': '导出',
  'editor.dashboard.toolbar.versionControl': '版本控制',
  'editor.dashboard.toolbar.versionControlEmpty':
    '当前编辑器未接入版本控制操作。',
  'editor.dashboard.toolbar.saved': '已保存',
  'editor.dashboard.toolbar.saveFailed': '保存失败',
  'editor.dashboard.toolbar.importFailed': '导入失败',
  'editor.dashboard.toolbar.importInvalid': '无效的仪表盘文件',
  'editor.dashboard.panel.placeholder':
    '未选中 widget：在画布中点击一个 widget 进行配置。',
  'editor.dashboard.dialog.empty': '该面板暂无可执行操作。',
  'editor.dashboard.conflict.title': '保存冲突',
  'editor.dashboard.conflict.empty':
    '检测到保存冲突，但当前未接入冲突处理操作。',
};
