/**
 * zh-CN widget editor preview keys (`editor.widget.editor.preview.*`, M9
 * wave 3 P). The shell's surface copy lives in editor-widget-editor.ts;
 * THIS file carries only the preview body's own copy (settings form title,
 * error-channel prefixes, empty state). Error MESSAGES themselves are
 * compiled-code / engine passthrough and never enter a key (ADR 0004 §6).
 * Keep zh-CN/en-US key-for-key identical (check-locale gate).
 */
export default {
  'editor.widget.editor.preview.settings': '设置',
  'editor.widget.editor.preview.compileError': '编译失败',
  'editor.widget.editor.preview.runtimeError': '运行出错',
  'editor.widget.editor.preview.empty': '修复错误后按 ctrl+enter 重新运行',
};
