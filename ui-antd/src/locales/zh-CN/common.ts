/**
 * zh-CN common keys: app shell, generic server-error titles and the
 * temporary SA home. Domain files (login/menu/devices/…) live beside this
 * file; keep zh-CN and en-US key-for-key identical (check-locale gate).
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

  // Forbidden page (layout unAccessible node)
  'app.error.forbidden.title': '无权访问',
  'app.error.forbidden.description': '你没有访问该页面的权限。',
  'app.error.forbidden.back': '返回首页',

  // User menu
  'app.userMenu.logout': '退出登录',

  // Server-error shell titles (src/core/http/server-error.ts titleKey
  // values; `detail` is always the server message verbatim alongside).
  'tb.error.credentialsExpired': '登录凭据已过期',
  'tb.error.tokenExpired': '登录状态已过期',
  'tb.error.unauthorized': '未授权的访问',
  'tb.error.forbidden': '没有权限执行该操作',
  'tb.error.badRequest': '请求无效',
  'tb.error.notFound': '资源不存在',
  'tb.error.tooManyRequests': '请求过于频繁，请稍后再试',
  'tb.error.tooManyUpdates': '更新过于频繁，请稍后再试',
  'tb.error.versionConflict': '数据已被修改，请刷新后重试',
  'tb.error.subscriptionViolation': '订阅数量超出限制',
  'tb.error.entitiesLimitExceeded': '实体数量超出当前套餐限制',
  'tb.error.passwordViolation': '密码不符合当前密码策略',
  'tb.error.server': '服务器内部错误',
  'tb.error.generic': '请求失败',
  'tb.error.network': '网络连接不可用',
  'tb.error.timeout': '请求超时',

  // Temporary SA home (sys-domain pages land in M3)
  'pages.home.sysPending.title': 'sys 域页面建设中',
  'pages.home.sysPending.description':
    '系统管理员域页面（租户管理、租户配置、系统设置等）于 M3 里程碑交付。当前可通过 API 或旧版界面执行系统管理操作。',

  // Page-container back guard (src/components/layout/page-container.tsx,
  // ADR 0008) — shared by every entity detail page.
  'pages.common.unsavedTitle': '未保存的更改',
  'pages.common.unsavedText':
    '当前页面有未保存的更改，确定离开吗？离开后更改将丢失。',
  'pages.common.unsavedLeave': '离开',
  'pages.common.cancel': '取消',

  // Assign-to-customer dialog shared by the device/asset flows
  // (src/components/entities/AssignCustomerModal.tsx).
  'pages.entities.assignTitle': '指派给客户',
  'pages.entities.assignConfirm': '分配',
  'pages.entities.cancel': '取消',
  'pages.entities.customerRequired': '请选择客户。',
  'pages.entities.customerPlaceholder': '搜索并选择客户',
  'pages.entities.customerColumn': '客户',
  'pages.entities.assignOneText': '该实体会分配给所选客户。',
  'pages.entities.assignText':
    '{count, plural, =1 {1 个实体} other {# 个实体}}将分配给所选客户。',
};
