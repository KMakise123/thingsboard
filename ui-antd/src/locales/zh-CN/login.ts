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

  // /user/force-mfa — forced 2FA enrollment (brief §2-C)
  'pages.forceMfa.title.configured': '两步验证',
  'pages.forceMfa.title.required': '需要两步验证',
  'pages.forceMfa.description.configured': '设置一个验证方式，或直接登录。',
  'pages.forceMfa.description.required': '设置一个验证方式以继续。',
  'pages.forceMfa.login': '登录',
  'pages.forceMfa.totp.title': '启用认证应用',
  'pages.forceMfa.totp.scanQr': '使用验证应用扫描此二维码',
  'pages.forceMfa.totp.enterKey': '或手动输入此密钥：',
  'pages.forceMfa.totp.copyKey': '复制密钥',
  'pages.forceMfa.totp.copied': '密钥已复制',
  'pages.forceMfa.totp.copyFailed': '复制失败，请手动选择复制',
  'pages.forceMfa.sms.title': '启用短信验证',
  'pages.forceMfa.sms.description': '输入用作验证的手机号。',
  'pages.forceMfa.phone.label': '手机号',
  'pages.forceMfa.phone.invalid':
    '手机号格式不正确（E.164，如 +8613800138000）',
  'pages.forceMfa.email.title': '启用邮箱验证',
  'pages.forceMfa.email.description': '输入用作验证的邮箱。',
  'pages.forceMfa.email.label': '邮箱',
  'pages.forceMfa.sendCode': '发送验证码',
  'pages.forceMfa.enterCode.totp': '请输入认证应用中的安全码',
  'pages.forceMfa.enterCode.sms': '我们刚向 {contact} 发送了 6 位验证码',
  'pages.forceMfa.verificationCode': '6 位验证码',
  'pages.forceMfa.confirm': '确认',
  'pages.forceMfa.backupCode.title': '获取备份码',
  'pages.forceMfa.backupCode.description':
    '打印这些备份码，需要登录账户时即可取用。每个备份码只能使用一次。',
  'pages.forceMfa.backupCode.warn':
    '离开此页面后，这些备份码将不再显示，请妥善保存。',
  'pages.forceMfa.backupCode.download': '下载 (txt)',
  'pages.forceMfa.backupCode.print': '打印',
  'pages.forceMfa.success.totp': '认证应用已启用',
  'pages.forceMfa.success.totpDescription':
    '下次登录时，你需要提供两步验证码。',
  'pages.forceMfa.success.sms': '短信验证已启用',
  'pages.forceMfa.success.smsDescription':
    '下次登录时，需要输入发送到该手机号的安全码。',
  'pages.forceMfa.success.email': '邮箱验证已启用',
  'pages.forceMfa.success.emailDescription':
    '下次登录时，需要输入发送到该邮箱的安全码。',
  'pages.forceMfa.success.backupCode': '备份码已启用',
  'pages.forceMfa.success.backupCodeDescription':
    '下次登录时，可以使用其中一个备份码登录。',
  'pages.forceMfa.addVerificationMethod': '添加验证方式',

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
