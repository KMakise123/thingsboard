/** settings-domain copy (mirrors ui-ngx locale.constant-en_US.json admin.*). */
export default {
  'pages.settings.common.undo': 'Undo',
  'pages.settings.common.save': 'Save',
  'pages.settings.common.saveFailed': 'Failed to save the settings.',

  'pages.settings.general.generalTitle': 'General settings',
  'pages.settings.general.baseUrl': 'Base URL',
  'pages.settings.general.baseUrlRequired': 'Base URL is required.',
  'pages.settings.general.prohibitDifferentUrl':
    'Prohibit hostname from client request headers',
  'pages.settings.general.prohibitDifferentUrlHint':
    'This setting should be enabled in production. Disabling it may lead to security issues.',
  'pages.settings.general.toastSaved': 'General settings saved.',
  'pages.settings.general.connectivityTitle': 'Device connectivity',
  'pages.settings.general.connectivityHint':
    'If the host or port fields are empty, the default protocol values will be used.',
  'pages.settings.general.toastConnectivitySaved':
    'Device connectivity settings saved.',
  'pages.settings.general.host': 'Host',
  'pages.settings.general.port': 'Port',
  'pages.settings.general.portRange': 'Port should be in the range 1 to 65535.',
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
