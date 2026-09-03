/**
 * en-US editor dashboard dialog keys (`editor.dashboard.dialogs.*`, M7
 * brief §3 P wave). Keep zh-CN/en-US key-for-key identical (check-locale
 * gate). Keys shared with the editor-common domain stay in editor.ts.
 */
export default {
  // move-widgets (§3.3)
  'editor.dashboard.dialogs.moveWidgets.title': 'Move all widgets',
  'editor.dashboard.dialogs.moveWidgets.move': 'Move',
  'editor.dashboard.dialogs.moveWidgets.layout': 'Layout',
  'editor.dashboard.dialogs.moveWidgets.cols': 'Columns offset',
  'editor.dashboard.dialogs.moveWidgets.rows': 'Rows offset',
  'editor.dashboard.dialogs.moveWidgets.empty':
    'The layout has no widgets to move.',

  // manage-states (§3.5)
  'editor.dashboard.dialogs.states.title': 'Manage dashboard states',
  'editor.dashboard.dialogs.states.add': 'Add state',
  'editor.dashboard.dialogs.states.addTitle': 'Add dashboard state',
  'editor.dashboard.dialogs.states.editTitle': 'Edit dashboard state',
  'editor.dashboard.dialogs.states.edit': 'Edit',
  'editor.dashboard.dialogs.states.remove': 'Delete',
  'editor.dashboard.dialogs.states.name': 'Name',
  'editor.dashboard.dialogs.states.id': 'State id',
  'editor.dashboard.dialogs.states.root': 'Root',
  'editor.dashboard.dialogs.states.rootYes': 'Root state',
  'editor.dashboard.dialogs.states.isRoot': 'Root state',
  'editor.dashboard.dialogs.states.actions': 'Actions',
  'editor.dashboard.dialogs.states.nameRequired': 'State name is required.',
  'editor.dashboard.dialogs.states.nameExists': 'State name already exists.',
  'editor.dashboard.dialogs.states.idRequired': 'State id is required.',
  'editor.dashboard.dialogs.states.idExists': 'State id already exists.',

  // manage-layouts (§3.5 / §3.6)
  'editor.dashboard.dialogs.layouts.title': 'Manage layouts',
  'editor.dashboard.dialogs.layouts.type': 'Layout type',
  'editor.dashboard.dialogs.layouts.default': 'Default',
  'editor.dashboard.dialogs.layouts.divider': 'Divider (left + right)',
  'editor.dashboard.dialogs.layouts.scada': 'SCADA',
  'editor.dashboard.dialogs.layouts.layouts': 'Layouts',
  'editor.dashboard.dialogs.layouts.settings': 'Layout settings',
  'editor.dashboard.dialogs.layouts.breakpoints': 'Breakpoints',
  'editor.dashboard.dialogs.layouts.addBreakpoint': 'Add breakpoint',
  'editor.dashboard.dialogs.layouts.defaultBreakpoint': 'Default',

  // add-breakpoint (§3.5)
  'editor.dashboard.dialogs.breakpoint.title': 'Add new breakpoint',
  'editor.dashboard.dialogs.breakpoint.breakpoint': 'Breakpoint',
  'editor.dashboard.dialogs.breakpoint.copyFrom': 'Copy from',
  'editor.dashboard.dialogs.breakpoint.exhausted':
    'All breakpoints are already defined.',
  'editor.dashboard.dialogs.breakpoint.switcher': 'Preview breakpoint',

  // dashboard-settings (§3.5, dashboard mode)
  'editor.dashboard.dialogs.settings.title': 'Dashboard settings',
  'editor.dashboard.dialogs.settings.stateController': 'State controller',
  'editor.dashboard.dialogs.settings.controllerDefault': 'Default',
  'editor.dashboard.dialogs.settings.controllerEntity': 'Entity',
  'editor.dashboard.dialogs.settings.showTitle': 'Show dashboard title',
  'editor.dashboard.dialogs.settings.titleColor': 'Title color',
  'editor.dashboard.dialogs.settings.showLogo': 'Show dashboard logo',
  'editor.dashboard.dialogs.settings.logoUrl': 'Logo image URL',
  'editor.dashboard.dialogs.settings.hideToolbar': 'Hide toolbar',
  'editor.dashboard.dialogs.settings.toolbarAlwaysOpen': 'Toolbar always open',
  'editor.dashboard.dialogs.settings.showDashboardsSelect':
    'Show dashboards select',
  'editor.dashboard.dialogs.settings.showEntitiesSelect':
    'Show entities select',
  'editor.dashboard.dialogs.settings.showFilters': 'Show filters',
  'editor.dashboard.dialogs.settings.showTimewindow': 'Display timewindow',
  'editor.dashboard.dialogs.settings.showExport': 'Display export',
  'editor.dashboard.dialogs.settings.showUpdateImage':
    'Display update dashboard image',
  'editor.dashboard.dialogs.settings.dashboardCss': 'Dashboard CSS',
  'editor.dashboard.dialogs.settings.dashboardCssHint':
    'Plain CSS applied to the dashboard. Added to the page as a style sheet.',

  // dashboard-settings (§3.5/§3.6, layout-scoped reuse mode)
  'editor.dashboard.dialogs.gridSettings.title': 'Layout settings',
  'editor.dashboard.dialogs.gridSettings.columns': 'Columns',
  'editor.dashboard.dialogs.gridSettings.minColumns': 'Minimum columns',
  'editor.dashboard.dialogs.gridSettings.margin': 'Margin',
  'editor.dashboard.dialogs.gridSettings.outerMargin': 'Outer margin',
  'editor.dashboard.dialogs.gridSettings.autoFillHeight': 'Auto fill height',
  'editor.dashboard.dialogs.gridSettings.rowHeight': 'Row height',
  'editor.dashboard.dialogs.gridSettings.backgroundColor': 'Background color',
  'editor.dashboard.dialogs.gridSettings.backgroundImageUrl':
    'Background image URL',
  'editor.dashboard.dialogs.gridSettings.backgroundSizeMode':
    'Background size mode',
  'editor.dashboard.dialogs.gridSettings.mobileAutoFillHeight':
    'Mobile auto fill height',
  'editor.dashboard.dialogs.gridSettings.mobileRowHeight': 'Mobile row height',

  // dashboard-image (§3.5, read-only toolbar entry)
  'editor.dashboard.dialogs.image.title': 'Update dashboard image',
  'editor.dashboard.dialogs.image.empty': 'No dashboard image set.',
  'editor.dashboard.dialogs.image.upload': 'Upload image',
  'editor.dashboard.dialogs.image.clear': 'Clear image',

  // manage-aliases + alias (§3.5)
  'editor.dashboard.dialogs.aliases.title': 'Entity aliases',
  'editor.dashboard.dialogs.aliases.add': 'Add alias',
  'editor.dashboard.dialogs.aliases.edit': 'Edit alias',
  'editor.dashboard.dialogs.aliases.remove': 'Delete alias',
  'editor.dashboard.dialogs.aliases.inUse':
    'The alias is used by widgets and cannot be deleted.',
  'editor.dashboard.dialogs.aliases.empty': 'No entity aliases configured.',
  'editor.dashboard.dialogs.alias.title': 'Entity alias',
  'editor.dashboard.dialogs.alias.name': 'Name',
  'editor.dashboard.dialogs.alias.nameRequired': 'Alias name is required.',
  'editor.dashboard.dialogs.alias.nameExists': 'Alias name already exists.',
  'editor.dashboard.dialogs.alias.filterType': 'Filter type',
  'editor.dashboard.dialogs.alias.entityType': 'Entity type',
  'editor.dashboard.dialogs.alias.entityId': 'Entity id',
  'editor.dashboard.dialogs.alias.entityIdRequired': 'Entity id is required.',
  'editor.dashboard.dialogs.alias.stateEntityParamName':
    'State entity parameter name',
  'editor.dashboard.dialogs.alias.deviceTypes': 'Device types',
  'editor.dashboard.dialogs.alias.deviceNameFilter': 'Device name filter',
  'editor.dashboard.dialogs.alias.direction': 'Direction',
  'editor.dashboard.dialogs.alias.maxLevel': 'Max relation level',
  'editor.dashboard.dialogs.alias.rootStateEntity':
    'Take root entity from the dashboard state',
  'editor.dashboard.dialogs.alias.resolveMultiple': 'Resolve multiple entities',

  // filters (§3.5)
  'editor.dashboard.dialogs.filters.title': 'Filters',
  'editor.dashboard.dialogs.filters.editorTitle': 'Filter',
  'editor.dashboard.dialogs.filters.add': 'Add filter',
  'editor.dashboard.dialogs.filters.edit': 'Edit filter',
  'editor.dashboard.dialogs.filters.remove': 'Delete filter',
  'editor.dashboard.dialogs.filters.inUse':
    'The filter is used by widgets and cannot be deleted.',
  'editor.dashboard.dialogs.filters.empty': 'No filters configured.',
  'editor.dashboard.dialogs.filters.name': 'Filter name',
  'editor.dashboard.dialogs.filters.nameRequired': 'Filter name is required.',
  'editor.dashboard.dialogs.filters.nameExists': 'Filter name already exists.',
  'editor.dashboard.dialogs.filters.editable': 'Editable by users',
  'editor.dashboard.dialogs.filters.keyFilters': 'Key filters (JSON)',
  'editor.dashboard.dialogs.filters.keyFiltersInvalid':
    'Key filters must be a JSON array.',
};
