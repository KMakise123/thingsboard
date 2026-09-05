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
    name: 'settings',
    icon: 'setting',
    path: '/settings',
    access: 'canSysAdmin',
    routes: [
      // Child names stay relative: umi nests them under the parent name, so
      // the menu id is menu.settings.general (etc.). A parent redirect would
      // make umi render the whole subtree as EmptyRoute (blank page).
      { path: '/settings', redirect: '/settings/general' },
      {
        name: 'general',
        path: '/settings/general',
        component: './settings/general',
      },
      {
        name: 'outgoingMail',
        path: '/settings/outgoing-mail',
        component: './settings/outgoing-mail',
      },
      {
        name: 'twoFa',
        path: '/settings/two-fa',
        component: './settings/two-fa',
      },
      {
        name: 'oauth2',
        path: '/settings/oauth2',
        component: './settings/oauth2',
      },
      {
        name: 'auditLogs',
        path: '/settings/audit-logs',
        component: './settings/audit-logs',
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
