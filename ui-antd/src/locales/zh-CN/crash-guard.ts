/**
 * zh-CN crash-guard keys (`editor.crashGuard.*`, M10 wave C). Recovery
 * prompt copy: honest about what the archive is and what each option does —
 * no 「即将」-style implication (the choice only affects the archive, never
 * the session on its own). Keep zh-CN/en-US key-for-key identical
 * (check-locale gate).
 */
export default {
  'editor.crashGuard.dialogTitle': '检测到未保存的草稿存档',
  'editor.crashGuard.dialogIntro':
    '上次会话结束时有内容尚未保存，本地留存了一份草稿存档（保存于 {time}）。',
  'editor.crashGuard.restore': '恢复草稿',
  'editor.crashGuard.restoreText':
    '把存档内容写回编辑器，作为一个整体，可一次撤销。',
  'editor.crashGuard.discard': '丢弃存档',
  'editor.crashGuard.discardText': '清除这份存档，继续使用当前内容。',
};
