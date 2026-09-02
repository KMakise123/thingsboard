/**
 * Single source of truth for menus and permissions (issue #8).
 *
 * Route conventions:
 * - `name` is the menu i18n key suffix: route name `devices` renders the
 *   `menu.devices` message from src/locales. Omit `name` for hidden routes.
 * - `access` must match a key returned by src/access.ts, which mirrors the
 *   backend Authority enum (SYS_ADMIN / TENANT_ADMIN / CUSTOMER_USER).
 *   Menus are generated from this tree filtered by access — never hand-
 *   written. M1 role sets: TA = devices (+later domains), CU = devices
 *   read-only, SA = no tenant menu (temporary /home until M3 sys pages).
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
    ],
  },
  // ui-ngx mail-link aliases (see header comment)
  { path: '/login', redirect: '/user/login' },
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
  // Role-based entry: SA → /home, TA/CU → /devices, anonymous → login.
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
  {
    name: 'home',
    icon: 'home',
    path: '/home',
    access: 'canSysAdmin',
    component: './home',
  },

  // 404 → role-aware entry (TA/CU land on the device list, spec §3.2).
  { path: '*', redirect: '/' },
];
