/**
 * en-US entity-view list keys (list page, create/edit dialog and the row
 * confirmation dialogs). Wording follows ui-ngx locale.constant-en_US.json
 * (entity-view section). Must stay key-for-key identical with
 * zh-CN/entityViews/list.ts (check-locale).
 */
export default {
  // ---- table & toolbar ----
  'pages.entityViews.list.title': 'Entity views',
  'pages.entityViews.list.search': 'Search entity views',
  'pages.entityViews.list.typeAll': 'All types',
  'pages.entityViews.list.createdTime': 'Created time',
  'pages.entityViews.list.name': 'Name',
  'pages.entityViews.list.type': 'Entity view type',
  'pages.entityViews.list.customer': 'Customer',
  'pages.entityViews.list.public': 'Public',
  'pages.entityViews.list.empty': 'No entity views found',
  'pages.entityViews.list.loadFailed': 'Failed to load entity views',
  'pages.entityViews.list.refresh': 'Refresh',
  'pages.entityViews.list.total': '{count} total',
  'pages.entityViews.list.add': 'Add entity view',

  // ---- row actions ----
  'pages.entityViews.list.actionEdit': 'Edit',
  'pages.entityViews.list.actionDelete': 'Delete',
  'pages.entityViews.list.actionAssign': 'Assign to customer',
  'pages.entityViews.list.actionUnassign': 'Unassign from customer',
  'pages.entityViews.list.actionMakePublic': 'Make entity view public',
  'pages.entityViews.list.actionMakePrivate': 'Make entity view private',

  // ---- confirmations ----
  'pages.entityViews.list.deleteTitle':
    "Are you sure you want to delete the entity view '{name}'?",
  'pages.entityViews.list.deleteText':
    'Be careful, after the confirmation the entity view and all related data will become unrecoverable.',
  'pages.entityViews.list.unassignTitle':
    "Are you sure you want to unassign the entity view '{name}'?",
  'pages.entityViews.list.unassignText':
    "After the confirmation the entity view will be unassigned and won't be accessible by the customer.",
  'pages.entityViews.list.makePublicTitle':
    "Are you sure you want to make the entity view '{name}' public?",
  'pages.entityViews.list.makePublicText':
    'After the confirmation the entity view and all its data will be made public and accessible by others.',
  'pages.entityViews.list.makePrivateTitle':
    "Are you sure you want to make the entity view '{name}' private?",
  'pages.entityViews.list.makePrivateText':
    "After the confirmation the entity view and all its data will be made private and won't be accessible by others.",

  // ---- batch ----
  'pages.entityViews.list.selectedCount': '{count} selected',
  'pages.entityViews.list.batchAssign': 'Assign to customer',
  'pages.entityViews.list.batchUnassign': 'Unassign from customer',
  'pages.entityViews.list.unassignManyTitle':
    'Are you sure you want to unassign {count, plural, =1 {1 entity view} other {# entity views}}?',
  'pages.entityViews.list.unassignManyText':
    'After the confirmation all selected entity views will be unassigned and will not be accessible by the customer.',

  // ---- toasts ----
  'pages.entityViews.list.toastDeleted': 'Entity view deleted.',
  'pages.entityViews.list.toastAssigned':
    'Entity views assigned to the customer.',
  'pages.entityViews.list.toastUnassigned': 'Entity view unassigned.',
  'pages.entityViews.list.toastMadePublic': 'Entity view is now public.',
  'pages.entityViews.list.toastMadePrivate': 'Entity view is now private.',

  // ---- create / edit dialog ----
  'pages.entityViews.list.dialogAddTitle': 'Add entity view',
  'pages.entityViews.list.dialogEditTitle': 'Edit entity view',
  'pages.entityViews.list.save': 'Save',
  'pages.entityViews.list.cancel': 'Cancel',
  'pages.entityViews.list.toastSaved': 'Entity view saved.',
  'pages.entityViews.list.saveFailed':
    'Failed to save the entity view: {reason}',
};
