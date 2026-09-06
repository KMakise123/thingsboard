/**
 * Single source of truth for menus and permissions (issue #8).
 *
 * Route conventions:
 * - `name` is the menu i18n key suffix: route name `devices` renders the
 *   `menu.devices` message from src/locales. Omit `name` for hidden routes.
 * - `access` must match a key returned by src/access.ts, which mirrors the
 *   backend Authority enum (SYS_ADMIN / TENANT_ADMIN / CUSTOMER_USER).
 *   Menus are generated from this tree filtered by access — never hand-
 *   written. Role sets: SA = sys domain (tenants / tenant profiles /
 *   settings), TA = tenant domain, SA+TA = resources library (M11),
 *   CU = devices / assets / alarms.
 * - Keep this file declarative only (no imports of page internals).
 *
 * ui-ngx path aliases (`/login/…`, `/activationLinkExpired`,
 * `/passwordResetLinkExpired`) keep the backend's email-link 303 redirects
 * working against the /user/* routes (query strings survive redirects).
 */
export default [
  // ---- login family (public, no shell) ----
  {
    path: '/user',
    layout: false,
    routes: [
      {
        name: 'login',
        path: '/user/login',
        component: './user/login',
      },
      {
        path: '/user/forgot-password',
        component: './user/forgot-password',
      },
      {
        path: '/user/reset-password',
        component: './user/reset-password',
      },
      {
        path: '/user/create-password',
        component: './user/create-password',
      },
      {
        path: '/user/reset-expired-password',
        component: './user/reset-expired-password',
      },
      {
        path: '/user/activation-link-expired',
        component: './user/activation-link-expired',
      },
      {
        path: '/user/password-reset-link-expired',
        component: './user/password-reset-link-expired',
      },
      // MFA login step + forced-enrollment (login line, spec §3.1): reached
      // with an interim PRE_VERIFICATION / MFA_CONFIGURATION token, so they
      // stay under the public /user shell (no access field).
      {
        path: '/user/mfa',
        component: './user/mfa',
      },
      {
        path: '/user/force-mfa',
        component: './user/force-mfa',
      },
    ],
  },
  // ui-ngx mail-link aliases (see header comment)
  { path: '/login', redirect: '/user/login' },
  // MFA flow aliases (backend 302s + ui-ngx deep links land on /login/*).
  { path: '/login/mfa', redirect: '/user/mfa' },
  { path: '/login/force-mfa', redirect: '/user/force-mfa' },
  { path: '/login/resetPasswordRequest', redirect: '/user/forgot-password' },
  { path: '/login/resetPassword', redirect: '/user/reset-password' },
  {
    path: '/login/resetExpiredPassword',
    redirect: '/user/reset-expired-password',
  },
  { path: '/login/createPassword', redirect: '/user/create-password' },
  { path: '/activationLinkExpired', redirect: '/user/activation-link-expired' },
  {
    path: '/passwordResetLinkExpired',
    redirect: '/user/password-reset-link-expired',
  },

  // ---- app shell (role-aware) ----
  // Role-based entry: SA → /tenants, TA/CU → /devices, anonymous → login.
  { path: '/', component: './home/entry' },
  {
    name: 'devices',
    icon: 'tablet',
    path: '/devices',
    access: 'canTenantOrCustomer',
    component: './devices/list',
  },
  {
    name: 'devices.detail',
    path: '/devices/:id',
    access: 'canTenantOrCustomer',
    component: './devices/detail',
    hideInMenu: true,
  },

  // ---- M5 dashboards domain ----
  // TA: dashboards list (+ usage / gateways system pages); CU's 4th menu is
  // the same dashboards entry (spec §1.2). The readonly view/fullscreen
  // pages are hidden (addressable by URL only).
  {
    name: 'dashboards',
    icon: 'dashboard',
    path: '/dashboards',
    access: 'canTenantOrCustomer',
    component: './dashboards/list',
  },
  {
    name: 'dashboards.view',
    path: '/dashboards/:dashboardId',
    access: 'canTenantOrCustomer',
    component: './dashboards/view',
    hideInMenu: true,
  },
  {
    // M7 dashboard editor (spec §3.1 edit mode entry; reached from the
    // readonly toolbar 编辑 button). Hidden, TA-only, app-shell page.
    path: '/dashboards/:dashboardId/editor',
    access: 'canTenantAdmin',
    component: './dashboards/editor',
    hideInMenu: true,
  },
  {
    // M8 rule-chain list (brief §3 wave-3 D): TA-only; the editor row below
    // is the chain page itself (ui-ngx parity — no readonly face).
    name: 'ruleChains',
    icon: 'partition',
    path: '/ruleChains',
    access: 'canTenantAdmin',
    component: './rule-chains/list',
  },
  {
    // M8 rule-chain canvas editor (brief §3 wave C): the editor IS the page
    // (ui-ngx parity — no readonly face). Hidden, TA-only.
    path: '/ruleChains/:ruleChainId',
    access: 'canTenantAdmin',
    component: './rule-chains/editor',
    hideInMenu: true,
  },
  {
    // M14 R02: calculated fields — tenant-only flat list (ngx TENANT
    // "Data & processing" sibling of rule chains). No detail route: the
    // list + edit dialog carry every operation (R02 convergence).
    name: 'calculatedFields',
    icon: 'function',
    path: '/calculatedFields',
    access: 'canTenantAdmin',
    component: './calculated-fields/list',
  },
  {
    // M14 R03 (spec §6.0 final path — kebab /version-control, not the
    // camelCase of the arch draft): tenant-only flat version-control page —
    // repository gate two-stage (unconfigured → shared RepositorySettingsForm,
    // configured → the repository-wide versions table + complex create /
    // restore panels). ngx /features/vc parity.
    name: 'versionControl',
    icon: 'history',
    path: '/version-control',
    access: 'canTenantAdmin',
    component: './version-control/page',
  },
  {
    // M9 widget editor (spec §5): /widgets/editor is the create entry — it
    // opens the new-type dialog in-page (the library listing belongs to the
    // resources subsystem, M9 brief §0). Hidden. Access widened to SA+TA in
    // M11: sys-admin manages system widget types from the library (spec §3.1).
    path: '/widgets/editor',
    access: 'canSysAdminOrTenantAdmin',
    component: './widgets/editor',
    hideInMenu: true,
  },
  {
    // M9 widget editor page per type: loads the WidgetTypeDetails, converts
    // it into the WidgetEditorDraft and opens the editor shell. Hidden,
    // SA+TA (same widening as above).
    path: '/widgets/editor/:widgetTypeId',
    access: 'canSysAdminOrTenantAdmin',
    component: './widgets/editor',
    hideInMenu: true,
  },
  {
    // M11 widget type details (read-only preview + jump to editor). Hidden;
    // lives under the resources family access model.
    path: '/resources/widget-types/:widgetTypeId',
    access: 'canSysAdminOrTenantAdmin',
    component: './resources/widget-types/details',
    hideInMenu: true,
  },
  {
    name: 'usage',
    icon: 'barChart',
    path: '/usage',
    access: 'canTenantAdmin',
    component: './usage',
  },
  {
    name: 'gateways',
    icon: 'apartment',
    path: '/entities/gateways',
    access: 'canTenantAdmin',
    component: './gateways',
  },

  // ---- M2 domains (stubs; domain agents replace the pages) ----
  // CU's four menus include assets (spec §1.2) → canTenantOrCustomer;
  // entity views / customers / users are tenant-admin only (RECON §4).
  {
    name: 'assets',
    icon: 'cluster',
    path: '/assets',
    access: 'canTenantOrCustomer',
    component: './assets/list',
  },
  {
    name: 'assets.detail',
    path: '/assets/:id',
    access: 'canTenantOrCustomer',
    component: './assets/detail',
    hideInMenu: true,
  },
  {
    name: 'entityViews',
    icon: 'eye',
    path: '/entityViews',
    access: 'canTenantAdmin',
    component: './entity-views/list',
  },
  {
    name: 'entityViews.detail',
    path: '/entityViews/:id',
    access: 'canTenantAdmin',
    component: './entity-views/detail',
    hideInMenu: true,
  },
  {
    name: 'customers',
    icon: 'team',
    path: '/customers',
    access: 'canTenantAdmin',
    component: './customers/list',
  },
  {
    name: 'customers.detail',
    path: '/customers/:id',
    access: 'canTenantAdmin',
    component: './customers/detail',
    hideInMenu: true,
  },
  // Customer-scope pages: flat siblings of the detail route (react-router
  // ranks the longer path first, order here is irrelevant).
  {
    name: 'customers.users',
    path: '/customers/:id/users',
    access: 'canTenantAdmin',
    component: './customers/users',
    hideInMenu: true,
  },
  {
    name: 'customers.devices',
    path: '/customers/:id/devices',
    access: 'canTenantAdmin',
    component: './customers/devices',
    hideInMenu: true,
  },
  {
    name: 'customers.assets',
    path: '/customers/:id/assets',
    access: 'canTenantAdmin',
    component: './customers/assets',
    hideInMenu: true,
  },
  {
    name: 'customers.dashboards',
    path: '/customers/:id/dashboards',
    access: 'canTenantAdmin',
    component: './customers/dashboards',
    hideInMenu: true,
  },
  {
    // M13 wave-5a: customer-scope Edge instances (title "Customer: Edge
    // instances"; row delete = unassign). Reached from the customer detail
    // button, the customer list row menu and this page's own assign dialog.
    name: 'customers.edges',
    path: '/customers/:id/edges',
    access: 'canTenantAdmin',
    component: './edges/customer-edges',
    hideInMenu: true,
  },
  {
    name: 'users',
    icon: 'user',
    path: '/users',
    access: 'canTenantAdmin',
    component: './users/list',
  },
  // ---- M3 domains (stubs; domain agents replace the pages) ----
  // Alarms: TA + CU (spec §3.6); alarm-rules is an in-page tab, not a route.
  {
    name: 'alarms',
    icon: 'alert',
    path: '/alarms',
    access: 'canTenantOrCustomer',
    component: './alarms',
  },
  // Entity profiles: TA only (spec §3.8).
  {
    name: 'deviceProfiles',
    icon: 'profile',
    path: '/deviceProfiles',
    access: 'canTenantAdmin',
    component: './device-profiles/list',
  },
  {
    name: 'deviceProfiles.detail',
    path: '/deviceProfiles/:id',
    access: 'canTenantAdmin',
    component: './device-profiles/detail',
    hideInMenu: true,
  },
  {
    name: 'assetProfiles',
    icon: 'appstore',
    path: '/assetProfiles',
    access: 'canTenantAdmin',
    component: './asset-profiles/list',
  },
  {
    name: 'assetProfiles.detail',
    path: '/assetProfiles/:id',
    access: 'canTenantAdmin',
    component: './asset-profiles/detail',
    hideInMenu: true,
  },
  // ---- M13 OTA packages family (spec §5.5) ----
  // Packages repository: TA-only (backend gates save/download/delete to
  // TENANT_ADMIN; CU has read-only endpoints but no UI entry, spec §5.5).
  {
    name: 'otaPackages',
    icon: 'memory',
    path: '/otaPackages',
    access: 'canTenantAdmin',
    component: './ota/packages',
  },
  {
    name: 'otaPackages.detail',
    path: '/otaPackages/:id',
    access: 'canTenantAdmin',
    component: './ota/packages/detail',
    hideInMenu: true,
  },
  // ---- M13 edge management family (spec §5.1–5.4) ----
  // Group serves TA (full management) + CU (read-only face), so
  // `canTenantOrCustomer`; per-child access narrows further. Wave 3 mounted
  // the group + the instances list, wave 4 the detail page, wave 5a the
  // four sub-entity scope pages, wave 5b the ruleChains sub-page and the
  // rule-chain template page (both TA-only).
  {
    name: 'edge',
    icon: 'deploymentUnit',
    path: '/edges',
    access: 'canTenantOrCustomer',
    routes: [
      { path: '/edges', redirect: '/edges/instances' },
      {
        name: 'instances',
        path: '/edges/instances',
        component: './edges/list',
      },
      {
        name: 'edges.detail',
        path: '/edges/:id',
        access: 'canTenantOrCustomer',
        component: './edges/detail',
        hideInMenu: true,
      },
      // Wave-5a sub-entity scope pages: flat siblings of the detail route,
      // CU gets the read-only face inside the pages (canTenantOrCustomer).
      {
        name: 'edges.devices',
        path: '/edges/:id/devices',
        access: 'canTenantOrCustomer',
        component: './edges/devices',
        hideInMenu: true,
      },
      {
        name: 'edges.assets',
        path: '/edges/:id/assets',
        access: 'canTenantOrCustomer',
        component: './edges/assets',
        hideInMenu: true,
      },
      {
        name: 'edges.entityViews',
        path: '/edges/:id/entityViews',
        access: 'canTenantOrCustomer',
        component: './edges/entity-views',
        hideInMenu: true,
      },
      {
        name: 'edges.dashboards',
        path: '/edges/:id/dashboards',
        access: 'canTenantOrCustomer',
        component: './edges/dashboards',
        hideInMenu: true,
      },
      {
        name: 'edges.ruleChains',
        path: '/edges/:id/ruleChains',
        access: 'canTenantAdmin',
        component: './edges/rule-chains',
        hideInMenu: true,
      },
      // Rule chain templates: mounted inside the group so the menu nests
      // under Edge management (ngx parity, menu key menu.edge.ruleChainTemplates);
      // the static path outranks /edges/:id in route matching.
      {
        name: 'ruleChainTemplates',
        path: '/edges/rule-chains',
        access: 'canTenantAdmin',
        component: './edges/rule-chain-templates',
      },
    ],
  },
  // Sys-admin family (spec §3.7): tenants + tenant profiles + settings.
  {
    name: 'tenants',
    icon: 'bank',
    path: '/tenants',
    access: 'canSysAdmin',
    component: './tenants/list',
  },
  {
    name: 'tenants.detail',
    path: '/tenants/:id',
    access: 'canSysAdmin',
    component: './tenants/detail',
    hideInMenu: true,
  },
  {
    name: 'tenants.users',
    path: '/tenants/:id/users',
    access: 'canSysAdmin',
    component: './tenants/users',
    hideInMenu: true,
  },
  {
    name: 'tenantProfiles',
    icon: 'idcard',
    path: '/tenantProfiles',
    access: 'canSysAdmin',
    component: './tenant-profiles/list',
  },
  {
    name: 'tenantProfiles.detail',
    path: '/tenantProfiles/:id',
    access: 'canSysAdmin',
    component: './tenant-profiles/detail',
    hideInMenu: true,
  },
  {
    // M14 R01: the settings tree serves both admin roles — the group gate
    // is the shared SA+TA ceiling, each child narrows its own access.
    name: 'settings',
    icon: 'setting',
    path: '/settings',
    access: 'canSysAdminOrTenantAdmin',
    routes: [
      // Child names stay relative: umi nests them under the parent name, so
      // the menu id is menu.settings.general (etc.). A parent redirect would
      // make umi render the whole subtree as EmptyRoute (blank page).
      {
        // Role-aware landing instead of a static redirect: SA → general,
        // TA → home (the entry component decides, ngx redirectTo parity).
        path: '/settings',
        component: './settings/entry',
        hideInMenu: true,
      },
      {
        name: 'general',
        path: '/settings/general',
        access: 'canSysAdmin',
        component: './settings/general',
      },
      {
        name: 'outgoingMail',
        path: '/settings/outgoing-mail',
        access: 'canSysAdmin',
        component: './settings/outgoing-mail',
      },
      {
        name: 'twoFa',
        path: '/settings/two-fa',
        access: 'canSysAdmin',
        component: './settings/two-fa',
      },
      {
        name: 'oauth2',
        path: '/settings/oauth2',
        access: 'canSysAdmin',
        component: './settings/oauth2',
      },
      {
        name: 'auditLogs',
        path: '/settings/audit-logs',
        access: 'canSysAdmin',
        component: './settings/audit-logs',
      },
      // ---- M14 wave-2 settings additions (R28/R29/R04/R22) ----
      {
        name: 'home',
        path: '/settings/home',
        access: 'canTenantAdmin',
        component: './settings/home',
      },
      {
        name: 'repository',
        path: '/settings/repository',
        access: 'canTenantAdmin',
        component: './settings/repository',
      },
      {
        name: 'trendz',
        path: '/settings/trendz',
        access: 'canTenantAdmin',
        component: './settings/trendz',
      },
      {
        name: 'securitySettings',
        path: '/settings/security-settings',
        access: 'canSysAdmin',
        component: './settings/security-settings',
      },
      // ---- M14 wave-3 settings additions (R25/R26/R27/R23) ----
      {
        // No access key: inherits the group gate (SA+TA) — one page with
        // role-shaped cards (SYS: SMS provider + mobile app; TENANT: Slack).
        name: 'notifications',
        path: '/settings/notifications',
        component: './settings/notifications',
      },
      {
        name: 'queues',
        path: '/settings/queues',
        access: 'canSysAdmin',
        component: './settings/queues',
      },
      {
        name: 'detail',
        path: '/settings/queues/:id',
        access: 'canSysAdmin',
        component: './settings/queues/detail',
        hideInMenu: true,
      },
      {
        name: 'aiModels',
        path: '/settings/ai-models',
        access: 'canTenantAdmin',
        component: './settings/ai-models',
      },
      {
        name: 'autoCommit',
        path: '/settings/auto-commit',
        access: 'canTenantAdmin',
        component: './settings/auto-commit',
      },
    ],
  },
  // ---- M11 resources library family (spec §3.1–3.5) ----
  // The five-in-one subsystem (widget types / widgets bundles / images /
  // SCADA symbols / JS library / file resources): SA + TA shared (upstream
  // TB manages resources in both roles), so `canSysAdminOrTenantAdmin`.
  // Nesting mirrors the settings family above — child names stay relative
  // so the menu ids become menu.resources.<child>.
  {
    name: 'resources',
    icon: 'folder',
    path: '/resources',
    access: 'canSysAdminOrTenantAdmin',
    routes: [
      { path: '/resources', redirect: '/resources/widget-types' },
      {
        name: 'widgetTypes',
        path: '/resources/widget-types',
        component: './resources/widget-types/list',
      },
      {
        name: 'widgetsBundles',
        path: '/resources/widgets-bundles',
        component: './resources/widgets-bundles/list',
      },
      {
        // Bundle widgets management for one bundle (add/remove widget types
        // in the bundle). Hidden, addressable by URL.
        path: '/resources/widgets-bundles/:bundleId',
        component: './resources/widgets-bundles/bundle-widgets',
        hideInMenu: true,
      },
      {
        name: 'images',
        path: '/resources/images',
        component: './resources/images',
      },
      {
        name: 'scadaSymbols',
        path: '/resources/scada-symbols',
        component: './resources/scada-symbols',
      },
      {
        // SCADA symbol editor page (`type` = image scope, `key` = the
        // symbol's resource key; symbols are stored as image resources).
        // Hidden, reached from the SCADA symbols gallery.
        path: '/resources/scada-symbols/:type/:key',
        component: './resources/scada-symbols/editor',
        hideInMenu: true,
      },
      {
        name: 'jsLibrary',
        path: '/resources/js-library',
        component: './resources/js-library/list',
      },
      {
        name: 'library',
        path: '/resources/library',
        component: './resources/library/list',
      },
    ],
  },
  // ---- M12 notification center family (spec §4.1–4.6) ----
  // Inbox serves all three roles (CUSTOMER_USER is inbox-readonly, no send
  // button); the other four pages are SA+TA (ui-ngx
  // notification-routing.module.ts:30-119). Per-child access narrows the
  // menu automatically; nesting mirrors the resources family above.
  {
    name: 'notifications',
    icon: 'bell',
    path: '/notifications',
    access: 'canAuthenticated',
    routes: [
      { path: '/notifications', redirect: '/notifications/inbox' },
      {
        name: 'inbox',
        path: '/notifications/inbox',
        component: './notifications/inbox',
      },
      {
        name: 'sent',
        path: '/notifications/sent',
        access: 'canSysAdminOrTenantAdmin',
        component: './notifications/sent',
      },
      {
        name: 'templates',
        path: '/notifications/templates',
        access: 'canSysAdminOrTenantAdmin',
        component: './notifications/templates',
      },
      {
        name: 'recipients',
        path: '/notifications/recipients',
        access: 'canSysAdminOrTenantAdmin',
        component: './notifications/recipients',
      },
      {
        name: 'rules',
        path: '/notifications/rules',
        access: 'canSysAdminOrTenantAdmin',
        component: './notifications/rules',
      },
    ],
  },
  // Account family (spec §3.9): personal profile + security. Entries live
  // behind the avatar dropdown, so children hide from the side menu (name +
  // hideInMenu keeps them addressable for breadcrumbs).
  {
    name: 'account',
    path: '/account',
    access: 'canAuthenticated',
    hideInMenu: true,
    routes: [
      { path: '/account', redirect: '/account/profile' },
      {
        name: 'profile',
        path: '/account/profile',
        component: './account/profile',
        hideInMenu: true,
      },
      {
        name: 'security',
        path: '/account/security',
        component: './account/security',
        hideInMenu: true,
      },
    ],
  },

  // Dashboard single-page (fullscreen) mode: same auth gate as the shell
  // page but rendered without the app shell (ui-ngx dashboard-pages.routing
  // singlePageMode; brief §0.C).
  {
    path: '/dashboard/:dashboardId',
    access: 'canTenantOrCustomer',
    component: './dashboard-fullscreen',
    layout: false,
  },

  // 404 → role-aware entry (TA/CU land on the device list, spec §3.2).
  { path: '*', redirect: '/' },
];
