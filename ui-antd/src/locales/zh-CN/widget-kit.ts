/**
 * zh-CN copy for compiled custom widget states (`editor.widgetKit.*`,
 * ADR 0004 §6). K wave (M9 wave-2): compile-broken / runtime-broken cards
 * rendered on dashboards that reference a react-1 widget type.
 * Keep zh-CN/en-US key-for-key identical (check-locale gate).
 */
export default {
  'editor.widgetKit.compileError': '自定义组件编译失败',
  'editor.widgetKit.compileErrorHint':
    '该组件类型存在，但源码未通过编译；请在 widget 编辑器中修复后重新保存',
  'editor.widgetKit.runtimeError': '自定义组件运行出错',
};
