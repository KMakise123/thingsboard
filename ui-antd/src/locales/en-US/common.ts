/**
 * en-US common keys — key-for-key identical with zh-CN/common.ts
 * (check-locale gate).
 */
export default {
  'navBar.lang': 'Language',
  'layout.user.link.help': 'Help',
  'layout.user.link.privacy': 'Privacy',
  'layout.user.link.terms': 'Terms',

  // Network / error shell
  'app.network.offline': 'You are offline; some features may be unavailable',
  'app.request.offline':
    'Network unavailable — check your connection and retry.',
  'app.error.chunk.title': 'Page failed to load',
  'app.error.chunk.description.offline':
    'The network is down; reconnect and reload the page.',
  'app.error.chunk.description.online':
    'Page assets failed to load; reload to retry.',
  'app.error.render.title': 'Something went wrong',
  'app.error.render.description':
    'Sorry, this page hit a problem. Refresh or go back to the home page.',
  'app.error.retry': 'Retry',
  'app.error.reload': 'Reload',
  'app.error.home': 'Back to home',

  // Forbidden page (layout unAccessible node)
  'app.error.forbidden.title': 'Access denied',
  'app.error.forbidden.description':
    'You are not authorized to access this page.',
  'app.error.forbidden.back': 'Back to home',

  // User menu
  'app.userMenu.logout': 'Sign out',

  // Server-error shell titles (src/core/http/server-error.ts titleKey
  // values; `detail` is always the server message verbatim alongside).
  'tb.error.credentialsExpired': 'Credentials expired',
  'tb.error.tokenExpired': 'Session expired',
  'tb.error.unauthorized': 'Unauthorized access',
  'tb.error.forbidden': 'You are not allowed to perform this action',
  'tb.error.badRequest': 'Bad request',
  'tb.error.notFound': 'Resource not found',
  'tb.error.tooManyRequests': 'Too many requests — retry later',
  'tb.error.tooManyUpdates': 'Too many updates — retry later',
  'tb.error.versionConflict': 'Data was modified elsewhere; refresh and retry',
  'tb.error.subscriptionViolation': 'Subscription limit exceeded',
  'tb.error.entitiesLimitExceeded': 'Entity limit exceeded for this plan',
  'tb.error.passwordViolation': 'Password violates the current policy',
  'tb.error.server': 'Internal server error',
  'tb.error.generic': 'Request failed',
  'tb.error.network': 'Network unavailable',
  'tb.error.timeout': 'Request timed out',

  // Temporary SA home (sys-domain pages land in M3)
  'pages.home.sysPending.title': 'Sys-domain pages under construction',
  'pages.home.sysPending.description':
    'System-admin pages (tenants, tenant profiles, settings) arrive with the M3 milestone. Until then, use the API or the legacy UI for system administration.',
};
