/**
 * zh-CN login family (password line, M1). Route parity: ui-ngx
 * modules/login — login / resetPasswordRequest / resetPassword /
 * resetExpiredPassword / createPassword / link-expired pages.
 * Must stay key-for-key identical with en-US/login.ts (check-locale gate).
 */
export default {
  'pages.layouts.userLayout.title': 'ThingsBoard 物联网平台',

  // /user/login
  'pages.login.username.placeholder': '邮箱',
  'pages.login.username.required': '请输入邮箱！',
  'pages.login.username.invalid': '邮箱格式不正确',
  'pages.login.password.placeholder': '密码',
  'pages.login.password.required': '请输入密码！',
  'pages.login.submit': '登录',
  'pages.login.success': '登录成功！',
  'pages.login.forgotPassword': '忘记密码？',
  'pages.login.resetPasswordAction': '密码不符合策略，请重置密码',
  'pages.login.error.title': '登录失败',
  'pages.login.error.ok': '知道了',

  // /user/login — OAuth2 buttons (brief §1.4)
  'pages.login.oauth2.groupTitle': '使用以下方式登录',
  'pages.login.oauth2.signInWith': '使用 {name} 登录',
  'pages.login.oauth2.or': '或',

  // /user/mfa — MFA verification step (brief §2-B)
  'pages.mfa.title': '验证你的身份',
  'pages.mfa.back': '返回',
  'pages.mfa.selectWay': '选择一种验证方式',
  'pages.mfa.provider.totp': '认证应用',
  'pages.mfa.provider.sms': '短信',
  'pages.mfa.provider.email': '邮箱',
  'pages.mfa.provider.backupCode': '备份码',
  'pages.mfa.description.totp': '请输入认证应用中的安全码。',
  'pages.mfa.description.sms': '安全码已发送至你的手机 {contact}。',
  'pages.mfa.description.email': '安全码已发送至你的邮箱 {contact}。',
  'pages.mfa.description.backupCode': '请输入你的一个备份码。',
  'pages.mfa.placeholder.totp': '安全码',
  'pages.mfa.placeholder.sms': '短信验证码',
  'pages.mfa.placeholder.email': '邮箱验证码',
  'pages.mfa.placeholder.backupCode': '备份码',
  'pages.mfa.code.required': '请输入验证码',
  'pages.mfa.code.invalid': '验证码格式不正确',
  'pages.mfa.code.incorrect': '验证码不正确',
  'pages.mfa.code.tooManyRequests': '验证码校验请求过多，请稍后再试',
  'pages.mfa.continue': '继续',
  'pages.mfa.resendCode': '重新发送验证码',
  'pages.mfa.resendWait': '{time} 秒后可重新发送',
  'pages.mfa.tryAnotherWay': '试试其他方式',

  // /user/forgot-password (ui-ngx resetPasswordRequest)
  'pages.forgotPassword.title': '忘记密码',
  'pages.forgotPassword.description': '输入账户邮箱，我们将发送密码重置链接。',
  'pages.forgotPassword.email.placeholder': '邮箱',
  'pages.forgotPassword.email.required': '请输入邮箱！',
  'pages.forgotPassword.email.invalid': '邮箱格式不正确',
  'pages.forgotPassword.submit': '发送重置链接',
  'pages.forgotPassword.success': '重置链接已发送，请查收邮件。',

  // password fields shared by reset / create / reset-expired pages
  'pages.password.newPassword': '新密码',
  'pages.password.confirmPassword': '确认新密码',
  'pages.password.required': '请输入密码！',
  'pages.password.notMatch': '两次输入的密码不一致',
  'pages.password.policy.title': '密码策略',
  'pages.password.policy.minimumLength': '长度不少于 {n} 个字符',
  'pages.password.policy.maximumLength': '长度不超过 {n} 个字符',
  'pages.password.policy.minimumUppercaseLetters': '至少包含 {n} 个大写字母',
  'pages.password.policy.minimumLowercaseLetters': '至少包含 {n} 个小写字母',
  'pages.password.policy.minimumDigits': '至少包含 {n} 个数字',
  'pages.password.policy.minimumSpecialCharacters': '至少包含 {n} 个特殊字符',
  'pages.password.policy.noWhitespaces': '不能包含空白字符',
  'pages.password.strength': '密码强度',
  'pages.password.strength.weak': '弱',
  'pages.password.strength.medium': '中',
  'pages.password.strength.strong': '强',

  // /user/reset-password (email reset link)
  'pages.resetPassword.title': '重置密码',
  'pages.resetPassword.submit': '重置密码',
  'pages.resetPassword.success': '密码已重置，请使用新密码登录。',

  // /user/reset-expired-password (credentials-expired login redirect)
  'pages.resetExpiredPassword.title': '密码已过期',
  'pages.resetExpiredPassword.description':
    '你的密码已过期或不符合当前密码策略，请设置新密码后重新登录。',

  // /user/create-password (activation link)
  'pages.createPassword.title': '创建密码',
  'pages.createPassword.description': '为你的账户设置密码，完成激活。',
  'pages.createPassword.submit': '激活账户',
  'pages.createPassword.success': '账户已激活，请使用新密码登录。',

  // link-expired pages (backend 303 targets)
  'pages.activationLinkExpired.title': '激活链接已过期',
  'pages.activationLinkExpired.message':
    '该激活链接已失效，请联系管理员重新发送激活邮件。',
  'pages.passwordResetLinkExpired.title': '密码重置链接已过期',
  'pages.passwordResetLinkExpired.message':
    '该密码重置链接已失效，请重新发起忘记密码流程。',
  'pages.linkExpired.backToLogin': '返回登录',
};
