/** settings 域文案（措辞跟随 ui-ngx locale.constant-zh_CN.json 的 admin.* 段）。 */
export default {
  'pages.settings.common.undo': '撤销',
  'pages.settings.common.save': '保存',
  'pages.settings.common.saveFailed': '保存设置失败。',

  'pages.settings.general.generalTitle': '常规设置',
  'pages.settings.general.baseUrl': '基础 URL',
  'pages.settings.general.baseUrlRequired': '基础 URL 为必填项。',
  'pages.settings.general.prohibitDifferentUrl': '禁止使用来自客户端请求头的主机名',
  'pages.settings.general.prohibitDifferentUrlHint':
    '此设置应在生产环境中启用。禁用时可能导致安全问题。',
  'pages.settings.general.toastSaved': '常规设置已保存。',
  'pages.settings.general.connectivityTitle': '设备连接',
  'pages.settings.general.connectivityHint': '如果主机或端口字段为空，将使用默认协议值。',
  'pages.settings.general.toastConnectivitySaved': '设备连接设置已保存。',
  'pages.settings.general.host': '主机',
  'pages.settings.general.port': '端口',
  'pages.settings.general.portRange': '端口应在 1 到 65535 的范围内。',
  'pages.settings.general.group.http': 'HTTP(s)',
  'pages.settings.general.group.mqtt': 'MQTT(s)',
  'pages.settings.general.group.coap': 'COAP(s)',
  'pages.settings.general.protocol.http': 'HTTP',
  'pages.settings.general.protocol.https': 'HTTPs',
  'pages.settings.general.protocol.mqtt': 'MQTT',
  'pages.settings.general.protocol.mqtts': 'MQTTs',
  'pages.settings.general.protocol.coap': 'COAP',
  'pages.settings.general.protocol.coaps': 'COAPs',
};
