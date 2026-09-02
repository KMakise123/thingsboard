/**
 * en-US device-profile domain keys. Key-for-key mirror of
 * zh-CN/device-profiles/index.ts (check-locale gate).
 */
export default {
  'pages.device-profiles.typeDefault': 'Default',
  // ---- list ----
  'pages.device-profiles.list.createdTime': 'Created time',
  'pages.device-profiles.list.name': 'Name',
  'pages.device-profiles.list.type': 'Profile type',
  'pages.device-profiles.list.transportType': 'Transport type',
  'pages.device-profiles.list.description': 'Description',
  'pages.device-profiles.list.default': 'Default',
  'pages.device-profiles.list.search': 'Search device profiles',
  'pages.device-profiles.list.refresh': 'Refresh',
  'pages.device-profiles.list.add': 'Add new device profile',
  'pages.device-profiles.list.selectedCount': '{count} selected',
  'pages.device-profiles.list.batchDelete': 'Delete selected',
  'pages.device-profiles.list.total': '{count} total',
  'pages.device-profiles.list.empty': 'No device profiles',
  'pages.device-profiles.list.loadFailed': 'Failed to load device profiles',
  'pages.device-profiles.list.actionExport': 'Export device profile',
  'pages.device-profiles.list.actionSetDefault':
    'Set device profile as default',
  'pages.device-profiles.list.actionEdit': 'Edit',
  'pages.device-profiles.list.actionDelete': 'Delete',
  'pages.device-profiles.list.actionYes': 'Yes',
  'pages.device-profiles.list.actionNo': 'No',
  'pages.device-profiles.list.cancel': 'Cancel',
  'pages.device-profiles.list.setDefaultTitle':
    "Are you sure you want to make the device profile '{name}' the default?",
  'pages.device-profiles.list.setDefaultText':
    'After the confirmation the profile will be marked as default and will be used for new devices with no profile specified.',
  'pages.device-profiles.list.toastSetDefault':
    'Default device profile updated.',
  'pages.device-profiles.list.deleteTitle':
    "Are you sure you want to delete the device profile '{name}'?",
  'pages.device-profiles.list.deleteManyTitle':
    'Are you sure you want to delete {count, plural, =1 {1 device profile} other {# device profiles}}?',
  'pages.device-profiles.list.deleteText':
    'Be careful, after the confirmation the device profile and all related data, including the related OTA updates, will become unrecoverable.',
  'pages.device-profiles.list.deleteFailed':
    'Deleted with {fail} failure(s). The default device profile cannot be deleted.',
  'pages.device-profiles.list.toastDeleted': 'Device profile deleted.',
  'pages.device-profiles.list.defaultProtected':
    'The default device profile cannot be deleted or selected.',
  // ---- dialog ----
  'pages.device-profiles.dialog.addTitle': 'Add new device profile',
  'pages.device-profiles.dialog.editTitle': 'Edit device profile',
  'pages.device-profiles.dialog.name': 'Name',
  'pages.device-profiles.dialog.nameRequired': 'Name is required.',
  'pages.device-profiles.dialog.nameTooLong':
    'Name must be at most 255 characters.',
  'pages.device-profiles.dialog.type': 'Profile type',
  'pages.device-profiles.dialog.transportType': 'Transport type',
  'pages.device-profiles.dialog.transportTypeRequired':
    'Transport type is required.',
  'pages.device-profiles.dialog.description': 'Description',
  'pages.device-profiles.dialog.save': 'Save',
  'pages.device-profiles.dialog.cancel': 'Cancel',
  'pages.device-profiles.dialog.toastSaved': 'Device profile saved.',
  'pages.device-profiles.dialog.saveFailed':
    'Failed to save the device profile: {reason}',
  // ---- detail general ----
  'pages.device-profiles.detail.tabDetails': 'Details',
  'pages.device-profiles.detail.tabTransportConfiguration':
    'Transport configuration',
  'pages.device-profiles.detail.tabCalculatedFields': 'Calculated fields',
  'pages.device-profiles.detail.tabAlarmRules': 'Alarm rules',
  'pages.device-profiles.detail.tabDeviceProvisioning': 'Device provisioning',
  'pages.device-profiles.detail.tabAuditLogs': 'Audit logs',
  'pages.device-profiles.detail.tabVersionControl': 'Version control',
  'pages.device-profiles.detail.defaultTag': 'Default',
  'pages.device-profiles.detail.defaultRuleChain': 'Default rule chain',
  'pages.device-profiles.detail.mobileDashboard': 'Mobile dashboard',
  'pages.device-profiles.detail.mobileDashboardHint':
    'Mobile application uses this dashboard as a device details dashboard.',
  'pages.device-profiles.detail.defaultQueueName': 'Default queue name',
  'pages.device-profiles.detail.selectQueueHint':
    'Choose from a dropdown list.',
  'pages.device-profiles.detail.defaultEdgeRuleChain':
    'Default edge rule chain',
  'pages.device-profiles.detail.defaultEdgeRuleChainHint':
    'Used as default rule chain on the edge to process incoming data of the devices provisioned with this device profile.',
  'pages.device-profiles.detail.firmware': 'Firmware',
  'pages.device-profiles.detail.software': 'Software',
  'pages.device-profiles.detail.image': 'Device profile image',
  'pages.device-profiles.detail.profileConfiguration': 'Profile configuration',
  'pages.device-profiles.detail.defaultConfigurationEmpty':
    'The default profile type has no additional configuration.',
  'pages.device-profiles.detail.configurationNotEditable':
    'This profile type has no configuration editor in v1; the stored configuration is preserved on save.',
  'pages.device-profiles.detail.edit': 'Edit',
  'pages.device-profiles.detail.cancelEdit': 'Cancel edit',
  'pages.device-profiles.detail.save': 'Save',
  'pages.device-profiles.detail.toastSaved': 'Device profile saved.',
  'pages.device-profiles.detail.saveFailed':
    'Failed to save the device profile: {reason}',
  'pages.device-profiles.detail.loadFailed':
    'Failed to load the device profile',
  'pages.device-profiles.detail.unsavedTitle': 'Unsaved changes',
  'pages.device-profiles.detail.unsavedText':
    'The device profile has unsaved changes. Leave anyway? Changes will be lost.',
  'pages.device-profiles.detail.unsavedLeave': 'Leave',
  // ---- transport ----
  'pages.device-profiles.detail.transportDefaultEmpty':
    'The default transport supports basic MQTT, HTTP and CoAP and has no extra settings.',
  'pages.device-profiles.detail.transportChangeWarning':
    'Changing the transport type rebuilds the configuration with factory defaults.',
  'pages.device-profiles.transport.DEFAULT': 'Default',
  'pages.device-profiles.transport.MQTT': 'MQTT',
  'pages.device-profiles.transport.COAP': 'CoAP',
  'pages.device-profiles.transport.LWM2M': 'LWM2M',
  'pages.device-profiles.transport.SNMP': 'SNMP',
  'pages.device-profiles.transport.DEFAULTHint':
    'Supports basic MQTT, HTTP and CoAP transport',
  'pages.device-profiles.transport.MQTTHint':
    'Enable advanced MQTT transport settings',
  'pages.device-profiles.transport.COAPHint':
    'Enable advanced CoAP transport settings',
  'pages.device-profiles.transport.LWM2MHint': 'LWM2M transport type',
  'pages.device-profiles.transport.SNMPHint':
    'Specify SNMP transport configuration',
  'pages.device-profiles.transport.mqttSparkplug':
    'MQTT Sparkplug B Edge of Network (EoN) node.',
  'pages.device-profiles.transport.mqttSparkplugMetricNames':
    'SparkPlug metrics to store as attributes.',
  'pages.device-profiles.transport.telemetryTopicFilter':
    'Telemetry topic filter',
  'pages.device-profiles.transport.attributesTopicFilter':
    'Attributes publish topic filter',
  'pages.device-profiles.transport.attributesSubscribeTopicFilter':
    'Attributes subscribe topic filter',
  'pages.device-profiles.transport.mqttWildcardsHint':
    'Supports single-level [+] and multi-level [#] wildcards.',
  'pages.device-profiles.transport.mqttPayloadType': 'MQTT device payload',
  'pages.device-profiles.transport.payloadJson': 'JSON',
  'pages.device-profiles.transport.payloadProtobuf': 'Protobuf',
  'pages.device-profiles.transport.mqttCompatJson':
    'Enable compatibility with other payload formats.',
  'pages.device-profiles.transport.mqttJsonDownlink':
    'Use JSON format for default downlink topics',
  'pages.device-profiles.transport.telemetryProtoSchema':
    'Telemetry proto schema',
  'pages.device-profiles.transport.attributesProtoSchema':
    'Attributes proto schema',
  'pages.device-profiles.transport.rpcRequestProtoSchema':
    'RPC request proto schema',
  'pages.device-profiles.transport.rpcResponseProtoSchema':
    'RPC response proto schema',
  'pages.device-profiles.transport.protoSchemaRequired':
    'Proto schema is required.',
  'pages.device-profiles.transport.mqttSendAck':
    'Send PUBACK on the failed validation of the PUBLISH message',
  'pages.device-profiles.transport.coapDeviceType': 'CoAP device type',
  'pages.device-profiles.transport.coapTypeDefault': 'Default',
  'pages.device-profiles.transport.coapTypeEfento': 'Efento NB-IoT',
  'pages.device-profiles.transport.coapPayloadType': 'CoAP device payload',
  'pages.device-profiles.transport.powerSavingMode': 'Power saving mode',
  'pages.device-profiles.transport.edrxCycle': 'eDRX cycle (ms)',
  'pages.device-profiles.transport.pagingTransmissionWindow':
    'Paging transmission window (ms)',
  'pages.device-profiles.transport.psmActivityTimer': 'PSM activity timer (ms)',
  'pages.device-profiles.transport.snmpTimeoutMs': 'Timeout (ms)',
  'pages.device-profiles.transport.snmpRetries': 'Retries',
  'pages.device-profiles.transport.snmpCommunicationConfigs':
    'Communication configs (JSON) — the mapping table editor ships with v2.',
  'pages.device-profiles.transport.lwm2mConfigurationJson':
    'LWM2M configuration (JSON)',
  'pages.device-profiles.transport.lwm2mLeftover':
    'The LWM2M object/observe configuration editor ships with v2; the stored configuration round-trips as JSON.',
  // ---- provisioning ----
  'pages.device-profiles.detail.provisionStrategy': 'Provision strategy',
  'pages.device-profiles.detail.provisionStrategyRequired':
    'Provision strategy is required.',
  'pages.device-profiles.provision.DISABLED': 'Disabled',
  'pages.device-profiles.provision.ALLOW_CREATE_NEW_DEVICES':
    'Allow to create new devices',
  'pages.device-profiles.provision.CHECK_PRE_PROVISIONED_DEVICES':
    'Check pre-provisioned devices',
  'pages.device-profiles.provision.X509_CERTIFICATE_CHAIN':
    'X509 certificate chain',
  'pages.device-profiles.detail.provisionDeviceKey': 'Provision device key',
  'pages.device-profiles.detail.provisionDeviceKeyRequired':
    'Provision device key is required.',
  'pages.device-profiles.detail.provisionDeviceSecret':
    'Provision device secret',
  'pages.device-profiles.detail.provisionDeviceSecretRequired':
    'Provision device secret is required.',
  'pages.device-profiles.detail.provisionCopied': 'Copied to the clipboard.',
  'pages.device-profiles.detail.provisionX509Hint':
    'To provision a device using an X509 certificate chain, the device certificate CN must match the configured regular expression.',
  'pages.device-profiles.detail.provisionX509AllowCreateHint':
    'Allow create new devices with an X509 certificate chain.',
  'pages.device-profiles.detail.provisionX509CertificateValue':
    'Certificate value',
  'pages.device-profiles.detail.provisionX509CertificateValueRequired':
    'Certificate value is required.',
  'pages.device-profiles.detail.provisionX509CnRegex':
    'CN regular expression variable',
  'pages.device-profiles.detail.provisionX509CnRegexHint':
    'The CN is matched against this regular expression.',
  'pages.device-profiles.detail.provisionX509CnRegexRequired':
    'CN regular expression is required.',
};
