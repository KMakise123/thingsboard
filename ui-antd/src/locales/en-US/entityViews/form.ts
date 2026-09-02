/**
 * en-US entity-view form keys (shared by the create/edit dialog and the
 * detail-page header form). Wording follows ui-ngx locale.constant-en_US.json
 * (entity-view section). Must stay key-for-key identical with
 * zh-CN/entityViews/form.ts (check-locale).
 */
export default {
  'pages.entityViews.form.name': 'Name',
  'pages.entityViews.form.nameRequired': 'Name is required.',
  'pages.entityViews.form.nameTooLong': 'Name must be at most 255 characters.',
  'pages.entityViews.form.type': 'Entity view type',
  'pages.entityViews.form.typeRequired': 'Entity view type is required.',
  'pages.entityViews.form.typePlaceholder':
    'Enter or select an entity view type',
  'pages.entityViews.form.targetEntityType': 'Target entity type',
  'pages.entityViews.form.targetEntity': 'Target entity',
  'pages.entityViews.form.targetEntityRequired': 'Target entity is required.',
  'pages.entityViews.form.targetEntityPlaceholder':
    'Search and select a device or asset',
  'pages.entityViews.form.deviceOption': 'Device',
  'pages.entityViews.form.assetOption': 'Asset',
  'pages.entityViews.form.attributesPropagation': 'Attributes propagation',
  'pages.entityViews.form.attributesPropagationHint':
    'Entity View will automatically copy specified attributes from Target Entity each time you save or update this entity view. For performance reasons target entity attributes are not propagated to entity view on each attribute change. You can enable automatic propagation by configuring "copy to view" rule node in your rule chain and linking "Post attributes" and "Attributes Updated" messages to the new rule node.',
  'pages.entityViews.form.timeseriesData': 'Time series data',
  'pages.entityViews.form.timeseriesDataHint':
    'Configure time series data keys of the target entity that will be accessible to the entity view. This time series data is read-only.',
  'pages.entityViews.form.clientAttributes': 'Client attributes',
  'pages.entityViews.form.sharedAttributes': 'Shared attributes',
  'pages.entityViews.form.serverAttributes': 'Server attributes',
  'pages.entityViews.form.timeseries': 'Time series',
  'pages.entityViews.form.startTs': 'Start time',
  'pages.entityViews.form.endTs': 'End time',
  'pages.entityViews.form.timeRangeConflict':
    'The start time must not be later than the end time.',
  'pages.entityViews.form.keysNoTarget': 'Select a target entity first.',
  'pages.entityViews.form.description': 'Description',
};
