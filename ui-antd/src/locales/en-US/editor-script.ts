/**
 * en-US editor script keys (`editor.script.*`, M8 wave-1 S): ScriptEditor
 * language toggle + ScriptTestPanel payload/run/result copy. Keep zh-CN/en-US
 * key-for-key identical (check-locale gate). Labels mirror the ui-ngx
 * equivalents (`rulenode.script-lang-*`, node-script-test-dialog fields).
 */
export default {
  // ScriptEditor language toggle
  'editor.script.lang.js': 'JavaScript',
  'editor.script.lang.tbel': 'TBEL',
  'editor.script.lang.tbelDisabled': 'TBEL is disabled',

  // ScriptTestPanel
  'editor.script.test.payload': 'Test payload',
  'editor.script.test.msgType': 'Message type',
  'editor.script.test.msg': 'Message',
  'editor.script.test.metadata': 'Metadata',
  'editor.script.test.script': 'Script',
  'editor.script.test.run': 'Run',
  'editor.script.test.running': 'Running…',
  'editor.script.test.output': 'Output',
  'editor.script.test.error': 'Error',
  'editor.script.test.invalidJson': 'Invalid JSON: {message}',
};
