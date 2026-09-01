/**
 * en-US devices-list keys (device list page, wizard, credentials /
 * connectivity dialogs, batch operations and CSV import).
 * Wording follows ui-ngx locale.constant-en_US.json (device / import keys).
 * Must stay key-for-key identical with zh-CN/devices/list.ts (check-locale).
 */
export default {
  // ---- table & filters ----
  'pages.devices.list.title': 'Devices',
  'pages.devices.list.search': 'Search devices',
  'pages.devices.list.profile': 'Device profile',
  'pages.devices.list.profilePlaceholder': 'All device profiles',
  'pages.devices.list.state': 'State',
  'pages.devices.list.stateAny': 'Any state',
  'pages.devices.list.active': 'Active',
  'pages.devices.list.inactive': 'Inactive',
  'pages.devices.list.name': 'Name',
  'pages.devices.list.label': 'Label',
  'pages.devices.list.createdTime': 'Created time',
  'pages.devices.list.customer': 'Customer',
  'pages.devices.list.public': 'Public',
  'pages.devices.list.isGateway': 'Is gateway',
  'pages.devices.list.empty': 'No devices',
  'pages.devices.list.loadFailed': 'Failed to load devices',

  // ---- toolbar ----
  'pages.devices.list.add': 'Add new device',
  'pages.devices.list.import': 'Import device',
  'pages.devices.list.refresh': 'Refresh',
  'pages.devices.list.selectedCount': '{count} selected',
  'pages.devices.list.total': '{count} total',
  'pages.devices.list.batchDelete': 'Delete selected',
  'pages.devices.list.batchAssign': 'Assign to customer',
  'pages.devices.list.batchUnassign': 'Unassign from customer',

  // ---- row actions ----
  'pages.devices.list.actionDelete': 'Delete',
  'pages.devices.list.actionAssign': 'Assign to customer',
  'pages.devices.list.actionUnassign': 'Unassign from customer',
  'pages.devices.list.actionCredentials': 'Manage credentials',
  'pages.devices.list.actionConnectivity': 'Check connectivity',
  'pages.devices.list.moreActions': 'More actions',

  // ---- delete confirm ----
  'pages.devices.list.deleteTitle':
    "Are you sure you want to delete the device '{name}'?",
  'pages.devices.list.deleteText':
    'Be careful, after the confirmation the device and all related data will become unrecoverable.',
  'pages.devices.list.deleteManyTitle':
    'Are you sure you want to delete {count, plural, =1 {1 device} other {# devices}}?',
  'pages.devices.list.deleteManyText':
    'Be careful, after the confirmation all selected devices will be removed and all related data will become unrecoverable.',

  // ---- batch ----
  'pages.devices.list.assignTitle': 'Assign devices',
  'pages.devices.list.assignText':
    '{count, plural, =1 {1 device} other {# devices}} will be assigned to the selected customer.',
  'pages.devices.list.assignOneText':
    'The device will be assigned to the selected customer.',
  'pages.devices.list.unassignManyTitle':
    'Are you sure you want to unassign {count, plural, =1 {1 device} other {# devices}}?',
  'pages.devices.list.unassignManyText':
    'After the confirmation all selected devices will be unassigned and will not be accessible by the customer.',
  'pages.devices.list.unassignTitle':
    "Are you sure you want to unassign the device '{name}'?",
  'pages.devices.list.unassignText':
    'After the confirmation the device will be unassigned and will not be accessible by the customer.',
  'pages.devices.list.customerPlaceholder': 'Search and select a customer',
  'pages.devices.list.customerRequired': 'Customer is required.',
  'pages.devices.list.customerColumn': 'Customer',
  'pages.devices.list.assignConfirm': 'Assign',
  'pages.devices.list.batchRunning': 'Processing {done}/{total}…',
  'pages.devices.list.batchResult': '{ok} succeeded, {fail} failed.',
  'pages.devices.list.batchFailures': 'Failure details',
  'pages.devices.list.publicCustomerFiltered':
    'The public customer cannot be assigned',

  // ---- wizard ----
  'pages.devices.list.wizardTitle': 'Add new device',
  'pages.devices.list.wizardStepProfile': 'Select device profile',
  'pages.devices.list.wizardStepDetails': 'Device details',
  'pages.devices.list.wizardStepCredentials': 'Credentials',
  'pages.devices.list.wizardStepConnectivity': 'Check connectivity',
  'pages.devices.list.wizardProfilePlaceholder':
    'Search and select a device profile',
  'pages.devices.list.wizardProfileRequired': 'Device profile is required.',
  'pages.devices.list.wizardName': 'Name',
  'pages.devices.list.wizardNameRequired': 'Name is required.',
  'pages.devices.list.wizardNameMaxLength':
    'Name should be less than 256 characters.',
  'pages.devices.list.wizardLabelMaxLength':
    'Label should be less than 256 characters.',
  'pages.devices.list.wizardOverwriteActivityTime':
    'Overwrite activity time for connected device',
  'pages.devices.list.wizardDescription': 'Description',
  'pages.devices.list.wizardCreate': 'Create device',
  'pages.devices.list.wizardSkipCredentials':
    'Skip (auto-generate credentials)',
  'pages.devices.list.wizardCreatedHint':
    'The device has been created. You can check its connectivity before finishing.',
  'pages.devices.list.wizardNext': 'Next',
  'pages.devices.list.wizardFinish': 'Finish',
  'pages.devices.list.cancel': 'Cancel',
  'pages.devices.list.back': 'Back',
  'pages.devices.list.close': 'Close',
  'pages.devices.list.save': 'Save',

  // ---- credentials ----
  'pages.devices.list.credentialsType': 'Credentials type',
  'pages.devices.list.credentialsAccessToken': 'Access token',
  'pages.devices.list.credentialsAccessTokenRequired':
    'Access token is required.',
  'pages.devices.list.credentialsAccessTokenInvalid':
    'Access token length must be from 1 to 32 characters.',
  'pages.devices.list.credentialsCertificate': 'Certificate in PEM format',
  'pages.devices.list.credentialsCertificateRequired':
    'Certificate is required.',
  'pages.devices.list.credentialsClientId': 'Client ID',
  'pages.devices.list.credentialsUserName': 'User name',
  'pages.devices.list.credentialsPassword': 'Password',
  'pages.devices.list.credentialsMqttRequired':
    'Client ID and/or User name are necessary',
  'pages.devices.list.credentialsGenerate': 'Generate',
  'pages.devices.list.credentialsCopy': 'Copy',
  'pages.devices.list.credentialsCopied': 'Copied to clipboard',
  'pages.devices.list.credentialsCopyFailed':
    'Copy failed, select and copy manually',
  'pages.devices.list.credentialsDialogTitle': 'Device credentials',
  'pages.devices.list.credentialsLoading': 'Loading device credentials…',
  'pages.devices.list.credentialsReadOnlyHint':
    'Your role can only view the credentials (copy is supported).',
  'pages.devices.list.credentialsLwm2mHint':
    'LwM2M credential editing arrives in a later release; shown read-only.',
  'pages.devices.list.credentialsReset': 'Reset credentials',
  'pages.devices.list.credentialsResetTitle':
    'Are you sure you want to reset the device credentials?',
  'pages.devices.list.credentialsResetText':
    'A new random access token will be generated and the device will have to reconnect with it.',
  'pages.devices.list.credentialsResetDone': 'Credentials have been reset.',
  'pages.devices.list.credentialsSaved': 'Credentials saved.',

  // ---- connectivity ----
  'pages.devices.list.connectivityTitle': 'Check connectivity',
  'pages.devices.list.connectivityAfterAddTitle':
    "Device created. Let's check connectivity!",
  'pages.devices.list.connectivityLoading':
    'Loading check connectivity commands…',
  'pages.devices.list.connectivityInstructions':
    'Use the following instructions for sending telemetry on behalf of the device using shell',
  'pages.devices.list.connectivityExecuteCommand':
    'Execute the following command',
  'pages.devices.list.connectivityInstallTools':
    'Install necessary client tools',
  'pages.devices.list.connectivityNoCommands':
    'No connectivity commands available.',
  'pages.devices.list.connectivityLatestTelemetry': 'Latest telemetry',
  'pages.devices.list.connectivityNoTelemetry': 'No latest telemetry',
  'pages.devices.list.connectivityKey': 'Key',
  'pages.devices.list.connectivityValue': 'Value',
  'pages.devices.list.connectivityTime': 'Time',
  'pages.devices.list.connectivityDocumentation': 'Documentation',
  'pages.devices.list.connectivityCheckDocs':
    'Check the documentation for connection instructions.',
  'pages.devices.list.connectivityInstallCurlWindows':
    'Starting Windows 10 b17063, cURL is available by default',
  'pages.devices.list.connectivityInstallCurlMacos':
    'Starting Mac OS X 10.2 6C115 (Jaguar), cURL is available by default',
  'pages.devices.list.connectivityInstallMqttWindows':
    'Use the instructions to download, install, setup and run mosquitto_pub',
  'pages.devices.list.connectivityInstallCoapClient':
    'Use the instructions to download, install, setup and run coap-client',
  'pages.devices.list.connectivitySparkplugCommand':
    'Use the following documentation to connect the device through the MQTT Sparkplug.',
  'pages.devices.list.connectivityMqttsX509Command':
    'Use the following documentation to connect the device via MQTT with authorization X509',
  'pages.devices.list.connectivityCoapsX509Command':
    'Use the following documentation to connect the device via CoAP over DTLS with authorization X509',
  'pages.devices.list.connectivitySnmpCommand':
    'Use the following documentation to connect the device through the SNMP.',
  'pages.devices.list.connectivityLwm2mCommand':
    'Use the following documentation to connect the device through the LwM2M.',

  // ---- import ----
  'pages.devices.list.importStepFile': 'Select a file',
  'pages.devices.list.importStepConfig': 'Import configuration',
  'pages.devices.list.importStepColumns': 'Select columns type',
  'pages.devices.list.importStepResult': 'Import result',
  'pages.devices.list.importDropHint':
    'Drop a CSV file or click to select a file to upload.',
  'pages.devices.list.importNoFile': 'No file selected',
  'pages.devices.list.importFileRequired': 'Select a CSV file first.',
  'pages.devices.list.importDelimiter': 'CSV delimiter',
  'pages.devices.list.importHeader': 'First line contains column names',
  'pages.devices.list.importUpdate':
    'Update existing devices (attributes / telemetry)',
  'pages.devices.list.importColumn': 'Column {index}',
  'pages.devices.list.importColumnType': 'Column type',
  'pages.devices.list.importColumnKey': 'Attribute/telemetry key',
  'pages.devices.list.importColumnSample': 'Example value data',
  'pages.devices.list.importRunning': 'Importing…',
  'pages.devices.list.importCreated': 'Created {count}',
  'pages.devices.list.importUpdated': 'Updated {count}',
  'pages.devices.list.importErrors': 'Errors {count}',
  'pages.devices.list.importErrorsList': 'Error details',
  'pages.devices.list.importParseError': 'Could not parse CSV: {message}',
  'pages.devices.list.importMinColumns':
    'A file should contain at least two columns.',
  'pages.devices.list.importType.name': 'Name',
  'pages.devices.list.importType.type': 'Type',
  'pages.devices.list.importType.label': 'Label',
  'pages.devices.list.importType.description': 'Description',
  'pages.devices.list.importType.isGateway': 'Is gateway',
  'pages.devices.list.importType.accessToken': 'Access token',
  'pages.devices.list.importType.x509': 'X.509',
  'pages.devices.list.importType.mqttClientId': 'MQTT client id',
  'pages.devices.list.importType.mqttUserName': 'MQTT user name',
  'pages.devices.list.importType.mqttPassword': 'MQTT password',
  'pages.devices.list.importType.serverAttribute': 'Server attribute',
  'pages.devices.list.importType.sharedAttribute': 'Shared attribute',
  'pages.devices.list.importType.timeseries': 'Time series',

  // ---- toasts ----
  'pages.devices.list.toastDeviceCreated': 'Device created.',
  'pages.devices.list.toastDeleted': 'Device deleted.',
  'pages.devices.list.toastAssigned': 'Devices assigned to the customer.',
  'pages.devices.list.toastUnassigned': 'Devices unassigned from the customer.',
  'pages.devices.list.toastImported': 'Import finished.',
};
