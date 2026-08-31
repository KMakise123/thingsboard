/**
 * Single source of truth for menus and permissions (issue #8).
 *
 * Route conventions:
 * - `name` is the menu i18n key suffix: route name `login` renders the
 *   `menu.login` message from src/locales. Omit `name` for hidden routes.
 * - `access` must match a key returned by src/access.ts, which mirrors the
 *   backend Authority enum (SYS_ADMIN / TENANT_ADMIN / CUSTOMER_USER).
 * - Real business routes are appended by the page waves; keep this file
 *   declarative only (no imports of page internals).
 *
 * Current content is the minimal runnable skeleton: login + placeholder home.
 */
export default [
  {
    path: '/user',
    layout: false,
    routes: [
      {
        name: 'login',
        path: '/user/login',
        component: './user/login',
      },
    ],
  },
  {
    name: 'home',
    icon: 'home',
    path: '/',
    component: './home',
  },
  {
    component: './exception/404',
    layout: false,
    path: '*',
  },
];
