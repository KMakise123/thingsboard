/**
 * account 域文案（/account/profile + /account/security，措辞跟随 ui-ngx
 * profile.* 与 security.2fa.* 段）。插值一律 {name} ICU 形态；中文里变量值
 * 用弯引号包裹，避免大括号转义问题（M3 结论）。
 */
export default {
  // ---- /account/profile ----
  'pages.account.profile.email': '邮箱',
  'pages.account.profile.emailRequired': '邮箱为必填项。',
  'pages.account.profile.emailInvalid': '邮箱格式无效。',
  'pages.account.profile.firstName': '名字',
  'pages.account.profile.lastName': '姓氏',
  'pages.account.profile.phone': '手机号',
  'pages.account.profile.language': '语言',
  'pages.account.profile.languageFollow': '跟随界面语言',
  'pages.account.profile.lastLogin': '上次登录：{time}',
  'pages.account.profile.toastSaved': '个人资料已保存。',
  'pages.account.profile.toastSaveFailed': '保存个人资料失败。',

  // ---- /account/security：JWT token 卡 ----
  'pages.account.security.jwtTitle': 'JWT Token',
  'pages.account.security.tokenValidTill': 'Token 有效期至',
  'pages.account.security.copyToken': '复制 JWT Token',
  'pages.account.security.tokenCopied': 'JWT Token 已复制到剪贴板',
  'pages.account.security.tokenExpiredWarn': 'JWT Token 已过期！请刷新页面。',

  // ---- /account/security：修改密码卡 ----
  'pages.account.security.changePassword': '修改密码',
  'pages.account.security.currentPassword': '当前密码',
  'pages.account.security.currentPasswordRequired': '请输入当前密码。',
  'pages.account.security.currentPasswordIncorrect': '当前密码不正确，请重试',
  'pages.account.security.newPassword': '新密码',
  'pages.account.security.newPasswordAgain': '确认新密码',
  'pages.account.security.passwordsNotMatch': '两次输入的新密码不一致',
  'pages.account.security.passwordSameAsOld': '新密码不能与当前密码相同',
  'pages.account.security.toastPasswordChanged': '密码修改成功。',

  // ---- /account/security：双因素认证卡 ----
  'pages.account.security.twoFaTitle': '双因素认证',
  'pages.account.security.twoFaDescription':
    '双因素认证为账户多加一道防线：登录时除密码外，还需输入一个安全码。',
  'pages.account.security.twoFaAuthenticateWith': '可通过以下方式验证身份：',
  'pages.account.security.provider.TOTP': '认证器应用',
  'pages.account.security.provider.SMS': '短信',
  'pages.account.security.provider.EMAIL': 'Email',
  'pages.account.security.provider.BACKUP_CODE': '备用验证码',
  'pages.account.security.provider.TOTP.description':
    '使用手机上的 Google Authenticator、Authy 或 Duo 等应用进行验证，登录用的安全码由应用生成。',
  'pages.account.security.provider.SMS.description':
    '使用手机验证：登录时我们会通过短信给你发送安全码。',
  'pages.account.security.provider.EMAIL.description':
    '使用发送到邮箱的安全码进行验证。',
  'pages.account.security.provider.BACKUP_CODE.description':
    '可打印的一次性验证码，在手机不在身边时也能登录账户。',
  'pages.account.security.provider.TOTP.hint': '认证器应用已为你的账户启用',
  'pages.account.security.provider.SMS.hint': '验证码将通过短信发送到“{info}”',
  'pages.account.security.provider.EMAIL.hint':
    '验证码将通过 Email 发送到“{info}”',
  'pages.account.security.provider.BACKUP_CODE.hint':
    '当前有 {info} 个一次性验证码可用',
  'pages.account.security.twoFaMainMethod': '设为主要双因素认证方式',
  'pages.account.security.getNewCode': '获取新的备用验证码',
  'pages.account.security.disableTitle': '确定要停用“{name}”吗？',
  'pages.account.security.disableText': '停用“{name}”会降低账户的安全性',
  'pages.account.security.regenerateTitle': '获取一组新的备用验证码？',
  'pages.account.security.regenerateText':
    '获取新的备用验证码后，剩余的 {count} 个旧验证码将全部失效。',
  'pages.account.security.regenerateOk': '获取新验证码',

  // ---- /account/security：启用对话框 ----
  'pages.account.security.dialog.enableTotpTitle': '启用认证器应用',
  'pages.account.security.dialog.enableSmsTitle': '启用短信验证',
  'pages.account.security.dialog.enableEmailTitle': '启用 Email 验证',
  'pages.account.security.dialog.getBackupCodeTitle': '获取备用验证码',
  'pages.account.security.dialog.scanQrCode': '使用验证应用扫描此二维码',
  'pages.account.security.dialog.enterKeyManually': '或手动输入以下密钥：',
  'pages.account.security.dialog.copyKey': '复制密钥',
  'pages.account.security.dialog.keyCopied': '密钥已复制到剪贴板',
  'pages.account.security.dialog.verificationCode': '6 位验证码',
  'pages.account.security.dialog.verificationCodePlaceholder':
    '在此输入 6 位验证码',
  'pages.account.security.dialog.verificationCodeInvalid': '验证码格式无效',
  'pages.account.security.dialog.smsStepLabel': '手机号码',
  'pages.account.security.dialog.smsStepDescription':
    '输入要用作验证方式的手机号码。',
  'pages.account.security.dialog.phoneInvalid': '手机号码无效',
  'pages.account.security.dialog.phoneRequired': '手机号码为必填项。',
  'pages.account.security.dialog.emailStepLabel': 'Email',
  'pages.account.security.dialog.emailStepDescription':
    '输入要用作验证方式的 Email 地址。',
  'pages.account.security.dialog.verificationStepDescription':
    '输入刚刚发送到“{address}”的 6 位验证码',
  'pages.account.security.dialog.next': '下一步',
  'pages.account.security.dialog.backupCodeDescription':
    '打印这些验证码妥善保存，需要登录账户时使用。每个备用验证码只能使用一次。',
  'pages.account.security.dialog.backupCodeWarn':
    '离开此页面后，这些验证码将无法再次显示。请使用下方选项安全保存。',
  'pages.account.security.dialog.downloadTxt': '下载（txt）',
  'pages.account.security.dialog.print': '打印',
  'pages.account.security.dialog.tooManyRequests':
    '验证码请求过于频繁，请稍后再试',
  'pages.account.security.dialog.activateFailed': '操作失败',
};
