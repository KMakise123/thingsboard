/**
 * en-US strings for the Edge family (M13 wave-3, spec §5.1–5.2).
 * Key-for-key identical with zh-CN/edge.ts (check-locale gate).
 */
export default {
  // ---- instances list ----
  'pages.edge.search': 'Search edges',
  'pages.edge.add': 'Add edge',
  'pages.edge.import': 'Import edges',
  'pages.edge.refresh': 'Refresh',
  'pages.edge.total': '{count} total',
  'pages.edge.empty': 'No edges found',
  'pages.edge.loadFailed': 'Failed to load edges',
  'pages.edge.selectedCount': '{count} selected',
  'pages.edge.batchDelete': 'Delete selected',
  'pages.edge.batchAssign': 'Assign to customer',
  'pages.edge.batchResult': '{ok} succeeded, {fail} failed.',
  'pages.edge.typeFilter': 'All edge types',

  // list columns
  'pages.edge.createdTime': 'Created time',
  'pages.edge.name': 'Name',
  'pages.edge.type': 'Edge type',
  'pages.edge.label': 'Label',
  'pages.edge.customer': 'Customer',
  'pages.edge.public': 'Public',

  // create dialog
  'pages.edge.nameRequired': 'Name is required.',
  'pages.edge.nameMaxLength': 'Name should be less than 256 characters.',
  'pages.edge.typeRequired': 'Edge type is required.',
  'pages.edge.typeMaxLength': 'Type should be less than 256 characters.',
  'pages.edge.typeFreeText':
    'Free-form subtype (defaults to "default" for a fresh deployment).',
  'pages.edge.labelMaxLength': 'Label should be less than 256 characters.',
  'pages.edge.routingKey': 'Edge key',
  'pages.edge.secret': 'Edge secret',
  'pages.edge.description': 'Description',
  'pages.edge.cancel': 'Cancel',
  'pages.edge.close': 'Close',
  'pages.edge.toastSaved': 'Edge saved.',

  // row / header actions
  'pages.edge.action.makePublic': 'Make edge public',
  'pages.edge.action.assign': 'Assign to customer',
  'pages.edge.action.unassign': 'Unassign from customer',
  'pages.edge.action.makePrivate': 'Make edge private',
  'pages.edge.action.manageAssets': 'Manage assets',
  'pages.edge.action.manageDevices': 'Manage devices',
  'pages.edge.action.manageEntityViews': 'Manage entity views',
  'pages.edge.action.manageDashboards': 'Manage dashboards',
  'pages.edge.action.manageRuleChains': 'Manage rule chains',
  'pages.edge.action.sync': 'Sync Edge',
  'pages.edge.action.delete': 'Delete',
  'pages.edge.syncStarted': 'Sync process started successfully!',
  'pages.edge.toastDeleted': 'Edge deleted.',
  'pages.edge.toastAssigned': 'Edge assigned to the customer.',
  'pages.edge.toastUnassigned': 'Edge unassigned from the customer.',
  'pages.edge.toastPublic': 'Edge is public.',
  'pages.edge.toastPrivate': 'Edge is private.',

  // confirmations
  'pages.edge.deleteOneTitle':
    "Are you sure you want to delete the edge '{name}'?",
  'pages.edge.deleteOneText':
    'Be careful, after the confirmation the edge and all related data will become unrecoverable.',
  'pages.edge.deleteManyTitle':
    'Are you sure you want to delete {count, plural, =1 {1 edge} other {# edges}}?',
  'pages.edge.deleteManyText':
    'Be careful, after the confirmation all selected edges will be removed and all related data will become unrecoverable.',
  'pages.edge.makePublicTitle':
    "Are you sure you want to make the edge '{name}' public?",
  'pages.edge.makePublicText':
    'After the confirmation the edge and all its data will be made public and accessible by others.',
  'pages.edge.makePrivateTitle':
    "Are you sure you want to make the edge '{name}' private?",
  'pages.edge.makePrivateText':
    'After the confirmation the edge and all its data will become private and will not be accessible by others.',
  'pages.edge.unassignTitle':
    "Are you sure you want to unassign the edge '{name}'?",
  'pages.edge.unassignText':
    'After the confirmation the edge will be unassigned and will not be accessible by the customer.',

  // CSV bulk import dialog
  'pages.edge.importDropHint':
    'Drop a CSV file or click to select a file to upload.',
  'pages.edge.importNoFile': 'No file selected',
  'pages.edge.importDelimiter': 'CSV delimiter',
  'pages.edge.importHeader': 'First line contains column names',
  'pages.edge.importUpdate': 'Update existing edges (attributes / telemetry)',
  'pages.edge.importParseError': 'Could not parse CSV: {message}',
  'pages.edge.importColumnSample': 'Example value data',
  'pages.edge.importColumnType': 'Column type',
  'pages.edge.importColumnKey': 'Attribute/telemetry key',
  'pages.edge.importStart': 'Import',
  'pages.edge.importRunning': 'Importing…',
  'pages.edge.importFinish': 'Finish',
  'pages.edge.importCreated': 'Created {count}',
  'pages.edge.importUpdated': 'Updated {count}',
  'pages.edge.importErrors': 'Errors {count}',
  'pages.edge.importErrorsList': 'Error details',
  'pages.edge.importType.NAME': 'Name',
  'pages.edge.importType.TYPE': 'Type',
  'pages.edge.importType.LABEL': 'Label',
  'pages.edge.importType.DESCRIPTION': 'Description',
  'pages.edge.importType.ROUTING_KEY': 'Edge key',
  'pages.edge.importType.SECRET': 'Edge secret',
  'pages.edge.importType.SERVER_ATTRIBUTE': 'Server attribute',
  'pages.edge.importType.TIMESERIES': 'Timeseries',

  // install / upgrade instructions dialog
  'pages.edge.instructions.titleAfterAdd':
    'Edge created! Check Install & Connect Instructions',
  'pages.edge.instructions.titleInstall': 'Install & Connect Instructions',
  'pages.edge.instructions.titleUpgrade': 'Upgrade Instructions',
  'pages.edge.instructions.buttonInstall': 'Install & Connect Instructions',
  'pages.edge.instructions.buttonUpgrade': 'Upgrade Instructions',
  'pages.edge.instructions.loading': 'Loading edge instructions…',
  'pages.edge.instructions.dontShowAgain': 'Do not show again',
  'pages.edge.instructions.methodDocker': 'Docker',
  'pages.edge.instructions.methodUbuntu': 'Ubuntu',
  'pages.edge.instructions.methodCentos': 'CentOS-RHEL',
  'pages.edge.instructions.loadFailed': 'Failed to load instructions',

  // EdgeEventType names (Downlinks tab, wave 4)
  'pages.edge.eventType.DASHBOARD': 'Dashboard',
  'pages.edge.eventType.ASSET': 'Asset',
  'pages.edge.eventType.DEVICE': 'Device',
  'pages.edge.eventType.DEVICE_PROFILE': 'Device profile',
  'pages.edge.eventType.ASSET_PROFILE': 'Asset profile',
  'pages.edge.eventType.ENTITY_VIEW': 'Entity view',
  'pages.edge.eventType.ALARM': 'Alarm',
  'pages.edge.eventType.RULE_CHAIN': 'Rule chain',
  'pages.edge.eventType.RULE_CHAIN_METADATA': 'Rule chain metadata',
  'pages.edge.eventType.EDGE': 'Edge',
  'pages.edge.eventType.USER': 'User',
  'pages.edge.eventType.CUSTOMER': 'Customer',
  'pages.edge.eventType.RELATION': 'Relation',
  'pages.edge.eventType.TENANT': 'Tenant',
  'pages.edge.eventType.TENANT_PROFILE': 'Tenant profile',
  'pages.edge.eventType.WIDGETS_BUNDLE': 'Widgets bundle',
  'pages.edge.eventType.WIDGET_TYPE': 'Widgets type',
  'pages.edge.eventType.ADMIN_SETTINGS': 'Admin settings',
  'pages.edge.eventType.OTA_PACKAGE': 'OTA package',
  'pages.edge.eventType.QUEUE': 'Queue',

  // EdgeEventActionType names (Downlinks tab, wave 4)
  'pages.edge.eventAction.ADDED': 'Added',
  'pages.edge.eventAction.DELETED': 'Deleted',
  'pages.edge.eventAction.UPDATED': 'Updated',
  'pages.edge.eventAction.POST_ATTRIBUTES': 'Post attributes',
  'pages.edge.eventAction.ATTRIBUTES_UPDATED': 'Attributes updated',
  'pages.edge.eventAction.ATTRIBUTES_DELETED': 'Attributes deleted',
  'pages.edge.eventAction.TIMESERIES_UPDATED': 'Time series updated',
  'pages.edge.eventAction.CREDENTIALS_UPDATED': 'Credentials updated',
  'pages.edge.eventAction.ASSIGNED_TO_CUSTOMER': 'Assigned to customer',
  'pages.edge.eventAction.UNASSIGNED_FROM_CUSTOMER': 'Unassigned from customer',
  'pages.edge.eventAction.RELATION_ADD_OR_UPDATE': 'Relation add or update',
  'pages.edge.eventAction.RELATION_DELETED': 'Relation deleted',
  'pages.edge.eventAction.RPC_CALL': 'RPC call',
  'pages.edge.eventAction.ALARM_ACK': 'Alarm ack',
  'pages.edge.eventAction.ALARM_CLEAR': 'Alarm clear',
  'pages.edge.eventAction.ALARM_ASSIGNED': 'Alarm assigned',
  'pages.edge.eventAction.ALARM_UNASSIGNED': 'Alarm unassigned',
  'pages.edge.eventAction.ASSIGNED_TO_EDGE': 'Assigned to edge',
  'pages.edge.eventAction.UNASSIGNED_FROM_EDGE': 'Unassigned from edge',
  'pages.edge.eventAction.CREDENTIALS_REQUEST': 'Credentials request',
  'pages.edge.eventAction.ENTITY_MERGE_REQUEST': 'Entity merge request',

  // detail page (wave 4)
  'pages.edge.detail.tabDetails': 'Details',
  'pages.edge.detail.tabAttributes': 'Attributes',
  'pages.edge.detail.tabLatestTelemetry': 'Latest telemetry',
  'pages.edge.detail.tabAlarms': 'Alarms',
  'pages.edge.detail.tabEvents': 'Events',
  'pages.edge.detail.tabDownlinks': 'Downlinks',
  'pages.edge.detail.tabRelations': 'Relations',
  'pages.edge.detail.tabAuditLogs': 'Audit logs',
  'pages.edge.detail.loadFailed': 'Failed to load the edge',
  'pages.edge.detail.edit': 'Edit',
  'pages.edge.detail.cancelEdit': 'Cancel edit',
  'pages.edge.detail.save': 'Save',
  'pages.edge.detail.saveFailed': 'Failed to save the edge: {reason}',
  'pages.edge.detail.unsavedTitle': 'Unsaved changes',
  'pages.edge.detail.unsavedText':
    'The edge has unsaved changes. Leave anyway? Changes will be lost.',
  'pages.edge.detail.unsavedLeave': 'Leave',
  'pages.edge.detail.assignedToCustomer':
    'Edge is assigned to customer: {customer}',
  'pages.edge.detail.publicHint': 'Edge is public',
  'pages.edge.detail.copyId': 'Copy ID',
  'pages.edge.detail.copyEdgeKey': 'Copy Edge key',
  'pages.edge.detail.copyEdgeSecret': 'Copy Edge secret',
  'pages.edge.detail.toastCopiedId': 'Edge Id has been copied to clipboard',
  'pages.edge.detail.toastCopiedKey': 'Edge key has been copied to clipboard',
  'pages.edge.detail.toastCopiedSecret':
    'Edge secret has been copied to clipboard',
  'pages.edge.detail.copyFailed': 'Copy failed, select and copy manually',
  'pages.edge.detail.manage': 'Manage',

  // downlinks tab (wave 4)
  'pages.edge.downlinks.type': 'Type',
  'pages.edge.downlinks.action': 'Action',
  'pages.edge.downlinks.entityId': 'Entity id',
  'pages.edge.downlinks.status': 'Status',
  'pages.edge.downlinks.data': 'Data',
  'pages.edge.downlinks.viewData': 'View',
  'pages.edge.downlinks.deployed': 'Deployed',
  'pages.edge.downlinks.pending': 'Pending',
  'pages.edge.downlinks.empty': 'No downlinks yet',
  'pages.edge.downlinks.loadFailed': 'Failed to load downlinks',

  // ---- sub-entity scope pages (wave 5a) ----
  'pages.edge.scope.loadTitleFailed': 'Failed to load the edge name',
  'pages.edge.scope.devicesTitle': 'Devices',
  'pages.edge.scope.assetsTitle': 'Assets',
  'pages.edge.scope.entityViewsTitle': 'Entity views',
  'pages.edge.scope.dashboardsTitle': 'Dashboards',
  'pages.edge.scope.columnDeviceProfile': 'Device profile',
  'pages.edge.scope.columnAssetProfile': 'Asset profile',
  'pages.edge.scope.columnState': 'State',
  'pages.edge.scope.columnType': 'Type',
  'pages.edge.scope.columnTitle': 'Title',
  'pages.edge.scope.devicesSearch': 'Search devices',
  'pages.edge.scope.assetsSearch': 'Search assets',
  'pages.edge.scope.entityViewsSearch': 'Search entity views',
  'pages.edge.scope.dashboardsSearch': 'Search dashboards',
  'pages.edge.scope.devicesLoadFailed': 'Failed to load devices',
  'pages.edge.scope.assetsLoadFailed': 'Failed to load assets',
  'pages.edge.scope.entityViewsLoadFailed': 'Failed to load entity views',
  'pages.edge.scope.dashboardsLoadFailed': 'Failed to load dashboards',
  'pages.edge.scope.devicesEmpty': 'No devices on this edge',
  'pages.edge.scope.assetsEmpty': 'No assets on this edge',
  'pages.edge.scope.entityViewsEmpty': 'No entity views on this edge',
  'pages.edge.scope.dashboardsEmpty': 'No dashboards on this edge',
  'pages.edge.scope.filterTypePlaceholder': 'All types',
  'pages.edge.scope.filterProfilePlaceholder': 'All device profiles',
  'pages.edge.scope.filterActivePlaceholder': 'All states',
  'pages.edge.scope.assignDevices': 'Assign existing devices',
  'pages.edge.scope.assignAssets': 'Assign existing assets',
  'pages.edge.scope.assignEntityViews': 'Assign existing entity views',
  'pages.edge.scope.assignDashboards': 'Assign existing dashboards',
  'pages.edge.scope.assignConfirm': 'Assign',
  'pages.edge.scope.assignRequired': 'Please select at least one entity.',
  'pages.edge.scope.assignPlaceholder': 'Search and select entities',
  'pages.edge.scope.assignHint':
    'The selected entities will be assigned to the edge.',
  'pages.edge.scope.actionUnassign': 'Unassign from edge',
  'pages.edge.scope.batchUnassign': 'Unassign selected',
  'pages.edge.scope.unassignOneTitle':
    "Are you sure you want to unassign '{name}' from the edge?",
  'pages.edge.scope.unassignManyTitle':
    'Are you sure you want to unassign {count, plural, =1 {1 entity} other {# entities}} from the edge?',
  'pages.edge.scope.unassignText':
    'After the confirmation the entity will no longer belong to this edge.',
  'pages.edge.scope.unassignManyText':
    'After the confirmation the selected entities will no longer belong to this edge.',
  'pages.edge.scope.toastUnassigned': 'Entities unassigned from the edge.',
  'pages.edge.scope.toastAssigned': 'Entities assigned to the edge.',
  'pages.edge.scope.actionExport': 'Export dashboard',
  'pages.edge.scope.exportFailed': 'Failed to export the dashboard: {error}',

  // customer-scope edges page (wave 5a)
  'pages.edge.customerEdges.assignExisting': 'Assign existing edges',
  'pages.edge.customerEdges.unassignManyTitle':
    'Are you sure you want to unassign {count, plural, =1 {1 edge} other {# edges}}?',
  'pages.edge.customerEdges.unassignManyText':
    'After the confirmation the selected edges will be unassigned and will not be accessible by the customer.',
  'pages.edge.customerEdges.manage': 'Edges',
};
