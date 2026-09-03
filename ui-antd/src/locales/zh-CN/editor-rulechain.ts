/**
 * zh-CN rule-chain editor shared base keys (`editor.ruleChain.*`, M8 wave
 * F seed). F wave ships no UI of its own — only the cross-wave contract
 * copy that later waves (canvas/page/details) all consume. Keep
 * zh-CN/en-US key-for-key identical (check-locale gate). Wave-local keys go
 * to editor-rulechain-canvas.ts / editor-rulechain-page.ts, never here.
 */
export default {
  // §2 检查点语义 — the save() checkpoint notice (undo history clears on save)
  'editor.ruleChain.checkpointCleared': '保存成功，撤销历史已清空',
};
