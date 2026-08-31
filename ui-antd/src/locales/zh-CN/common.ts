/**
 * zh-CN common keys: app shell, errors, settings drawer and the interim
 * login-family strings. Domain files (devices.ts, alarms.ts, ...) are added
 * by the business waves; keep zh-CN and en-US key-for-key identical
 * (scripts/check-locale.mjs gates this).
 */
export default {
  'navBar.lang': '语言',
  'layout.user.link.help': '帮助',
  'layout.user.link.privacy': '隐私',
  'layout.user.link.terms': '条款',

  // Network / error shell
  'app.network.offline': '当前处于离线状态，部分功能可能不可用',
  'app.request.offline': '网络不可用，请检查网络连接后重试。',
  'app.error.chunk.title': '页面加载失败',
  'app.error.chunk.description.offline':
    '网络连接已断开，请检查网络后重新加载。',
  'app.error.chunk.description.online': '页面资源加载失败，请重新加载重试。',
  'app.error.render.title': '页面出现错误',
  'app.error.render.description':
    '抱歉，页面遇到了一些问题，请刷新页面或返回首页。',
  'app.error.retry': '重试',
  'app.error.reload': '刷新页面',
  'app.error.home': '返回首页',

  // Settings drawer (light-only v1; dark entry is filtered out)
  'app.setting.pagestyle': '整体风格设置',
  'app.setting.pagestyle.light': '亮色菜单风格',
  'app.setting.navigationmode': '导航模式',
  'app.setting.sidemenu': '侧边菜单布局',
  'app.setting.topmenu': '顶部菜单布局',
  'app.setting.mixmenu': '混合菜单布局',
  'app.setting.splitMenus': '折叠菜单',
  'app.setting.sidermenutype': '侧边菜单模式',
  'app.setting.sidermenutype-group': '分组',
  'app.setting.sidermenutype-sub': '子菜单',
  'app.setting.content-width': '内容区域宽度',
  'app.setting.content-width.fixed': '定宽',
  'app.setting.content-width.fluid': '流式',
  'app.setting.fixedheader': '固定 Header',
  'app.setting.fixedsidebar': '固定侧边菜单',
  'app.setting.fixedsidebar.hint': '侧边菜单布局时可配置',
  'app.setting.regionalsettings': '内容区域',
  'app.setting.othersettings': '其他设置',
  'app.setting.weakmode': '色弱模式',
  'app.setting.copy': '拷贝设置',
  'app.setting.copyinfo':
    '拷贝成功，请到 config/defaultSettings.ts 中替换默认配置',
  'app.setting.production.hint':
    '配置栏只在开发环境用于预览，生产环境不会展现，请拷贝后手动修改配置文件',

  // Interim login family (rewritten by the auth wave)
  'pages.layouts.userLayout.title': 'ThingsBoard 物联网平台',
  'pages.login.accountLogin.tab': '账户密码登录',
  'pages.login.accountLogin.errorMessage': '错误的用户名或密码',
  'pages.login.username.placeholder': '用户名',
  'pages.login.username.required': '用户名是必填项！',
  'pages.login.password.placeholder': '密码',
  'pages.login.password.required': '密码是必填项！',
  'pages.login.phoneLogin.tab': '手机号登录',
  'pages.login.phoneLogin.errorMessage': '验证码错误',
  'pages.login.phoneNumber.placeholder': '请输入手机号！',
  'pages.login.phoneNumber.required': '手机号是必填项！',
  'pages.login.phoneNumber.invalid': '不合法的手机号！',
  'pages.login.captcha.placeholder': '请输入验证码！',
  'pages.login.captcha.required': '验证码是必填项！',
  'pages.login.phoneLogin.getVerificationCode': '获取验证码',
  'pages.getCaptchaSecondText': '秒后重新获取',
  'pages.login.rememberMe': '自动登录',
  'pages.login.forgotPassword': '忘记密码 ?',
  'pages.login.submit': '登录',
  'pages.login.success': '登录成功！',
  'pages.login.failure': '登录失败，请重试！',

  // Interim home placeholder
  'pages.home.placeholder.title': 'v1 建设中',
  'pages.home.placeholder.description':
    '脚手架已裁剪为可运行骨架，业务页面随 M1 波次交付。',
};
