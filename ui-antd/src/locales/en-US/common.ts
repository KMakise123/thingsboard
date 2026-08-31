/**
 * en-US common keys — keep key-for-key identical with zh-CN/common.ts
 * (scripts/check-locale.mjs gates this).
 */
export default {
  'navBar.lang': 'Languages',
  'layout.user.link.help': 'Help',
  'layout.user.link.privacy': 'Privacy',
  'layout.user.link.terms': 'Terms',

  // Network / error shell
  'app.network.offline': 'You are offline; some features may be unavailable',
  'app.request.offline':
    'Network unavailable. Check your connection and retry.',
  'app.error.chunk.title': 'Page failed to load',
  'app.error.chunk.description.offline':
    'The network is disconnected. Reconnect and reload.',
  'app.error.chunk.description.online':
    'Page assets failed to load. Reload to retry.',
  'app.error.render.title': 'Page error',
  'app.error.render.description':
    'Sorry, something went wrong on this page. Refresh or go back home.',
  'app.error.retry': 'Retry',
  'app.error.reload': 'Reload Page',
  'app.error.home': 'Back Home',

  // Settings drawer (light-only v1; dark entry is filtered out)
  'app.setting.pagestyle': 'Page style setting',
  'app.setting.pagestyle.light': 'Light menu style',
  'app.setting.navigationmode': 'Navigation Mode',
  'app.setting.sidemenu': 'Side Menu Layout',
  'app.setting.topmenu': 'Top Menu Layout',
  'app.setting.mixmenu': 'Mixed Menu Layout',
  'app.setting.splitMenus': 'Collapse Menus',
  'app.setting.sidermenutype': 'Side Menu Mode',
  'app.setting.sidermenutype-group': 'Group',
  'app.setting.sidermenutype-sub': 'Sub-menu',
  'app.setting.content-width': 'Content Width',
  'app.setting.content-width.fixed': 'Fixed',
  'app.setting.content-width.fluid': 'Fluid',
  'app.setting.fixedheader': 'Fixed Header',
  'app.setting.fixedsidebar': 'Fixed Sidebar',
  'app.setting.fixedsidebar.hint': 'Available with the side-menu layout',
  'app.setting.regionalsettings': 'Content Region',
  'app.setting.othersettings': 'Other Settings',
  'app.setting.weakmode': 'Color Blind Friendly Mode',
  'app.setting.copy': 'Copy Setting',
  'app.setting.copyinfo':
    'Copied — paste it into config/defaultSettings.ts to make it the default',
  'app.setting.production.hint':
    'The settings drawer is a dev-time preview only; production builds do not show it',

  // Interim login family (rewritten by the auth wave)
  'pages.layouts.userLayout.title': 'ThingsBoard IoT platform',
  'pages.login.accountLogin.tab': 'Account login',
  'pages.login.accountLogin.errorMessage': 'Wrong username or password',
  'pages.login.username.placeholder': 'Username',
  'pages.login.username.required': 'Username is required!',
  'pages.login.password.placeholder': 'Password',
  'pages.login.password.required': 'Password is required!',
  'pages.login.phoneLogin.tab': 'Phone login',
  'pages.login.phoneLogin.errorMessage': 'Wrong verification code',
  'pages.login.phoneNumber.placeholder': 'Enter your phone number!',
  'pages.login.phoneNumber.required': 'Phone number is required!',
  'pages.login.phoneNumber.invalid': 'Invalid phone number!',
  'pages.login.captcha.placeholder': 'Enter the verification code!',
  'pages.login.captcha.required': 'Verification code is required!',
  'pages.login.phoneLogin.getVerificationCode': 'Get code',
  'pages.getCaptchaSecondText': 'seconds before retry',
  'pages.login.rememberMe': 'Auto login',
  'pages.login.forgotPassword': 'Forgot password?',
  'pages.login.submit': 'Login',
  'pages.login.success': 'Login successful!',
  'pages.login.failure': 'Login failed, please retry!',

  // Interim home placeholder
  'pages.home.placeholder.title': 'v1 work in progress',
  'pages.home.placeholder.description':
    'The scaffold is trimmed to a runnable skeleton; business pages land with the M1 waves.',
};
