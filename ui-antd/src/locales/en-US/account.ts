/**
 * en-US account keys — key-for-key identical with zh-CN/account.ts
 * (check-locale gate). Wording follows ui-ngx profile.* and
 * security.2fa.* sections.
 */
export default {
  // ---- /account/profile ----
  'pages.account.profile.email': 'Email',
  'pages.account.profile.emailRequired': 'Email is required.',
  'pages.account.profile.emailInvalid': 'Invalid email format.',
  'pages.account.profile.firstName': 'First name',
  'pages.account.profile.lastName': 'Last name',
  'pages.account.profile.phone': 'Phone number',
  'pages.account.profile.language': 'Language',
  'pages.account.profile.languageFollow': 'Follow interface language',
  'pages.account.profile.lastLogin': 'Last login: {time}',
  'pages.account.profile.toastSaved': 'Profile saved.',
  'pages.account.profile.toastSaveFailed': 'Failed to save the profile.',

  // ---- /account/security: JWT token card ----
  'pages.account.security.jwtTitle': 'JWT token',
  'pages.account.security.tokenValidTill': 'Token is valid till',
  'pages.account.security.copyToken': 'Copy JWT token',
  'pages.account.security.tokenCopied':
    'JWT token has been copied to clipboard',
  'pages.account.security.tokenExpiredWarn':
    'JWT token is expired! Please, refresh the page.',

  // ---- /account/security: change password card ----
  'pages.account.security.changePassword': 'Change password',
  'pages.account.security.currentPassword': 'Current password',
  'pages.account.security.currentPasswordRequired':
    'Current password is required.',
  'pages.account.security.currentPasswordIncorrect':
    'Incorrect password. Try again',
  'pages.account.security.newPassword': 'New password',
  'pages.account.security.newPasswordAgain': 'Confirm new password',
  'pages.account.security.passwordsNotMatch': "New password didn't match",
  'pages.account.security.passwordSameAsOld':
    'New password should be different from current',
  'pages.account.security.toastPasswordChanged': 'Password changed.',

  // ---- /account/security: two-factor auth card ----
  'pages.account.security.twoFaTitle': 'Two-factor authentication',
  'pages.account.security.twoFaDescription':
    'Two-factor authentication protects your account from unauthorized access. All you have to do is enter a security code when you log in.',
  'pages.account.security.twoFaAuthenticateWith': 'You can authenticate with:',
  'pages.account.security.provider.TOTP': 'Authenticator app',
  'pages.account.security.provider.SMS': 'SMS',
  'pages.account.security.provider.EMAIL': 'Email',
  'pages.account.security.provider.BACKUP_CODE': 'Backup code',
  'pages.account.security.provider.TOTP.description':
    'Use apps like Google Authenticator, Authy, or Duo on your phone to authenticate. It will generate a security code for logging in.',
  'pages.account.security.provider.SMS.description':
    "Use your phone to authenticate. We'll send you a security code via SMS message when you log in.",
  'pages.account.security.provider.EMAIL.description':
    'Use a security code sent to your email address to authenticate.',
  'pages.account.security.provider.BACKUP_CODE.description':
    'These printable one-time passcodes allow you to sign in when away from your phone.',
  'pages.account.security.provider.TOTP.hint':
    'Authenticator app is set up for your account',
  'pages.account.security.provider.SMS.hint':
    'Authentication codes are sent by text message to "{info}"',
  'pages.account.security.provider.EMAIL.hint':
    'Authentication codes are sent via email to "{info}"',
  'pages.account.security.provider.BACKUP_CODE.hint':
    '{info} single-use codes are active at this time',
  'pages.account.security.twoFaMainMethod':
    'Use as main two-factor authentication method',
  'pages.account.security.getNewCode': 'Get new code',
  'pages.account.security.disableTitle':
    'Are you sure you want to disable {name}?',
  'pages.account.security.disableText':
    'Disabling {name} will make your account less secure',
  'pages.account.security.regenerateTitle': 'Get new set of backup codes?',
  'pages.account.security.regenerateText':
    'If you get new backup codes, {count} remaining codes you have left will be unusable.',
  'pages.account.security.regenerateOk': 'Get new codes',

  // ---- /account/security: enable dialog ----
  'pages.account.security.dialog.enableTotpTitle': 'Enable authenticator app',
  'pages.account.security.dialog.enableSmsTitle': 'Enable SMS authenticator',
  'pages.account.security.dialog.enableEmailTitle':
    'Enable email authenticator',
  'pages.account.security.dialog.getBackupCodeTitle': 'Get backup code',
  'pages.account.security.dialog.scanQrCode':
    'Scan this QR code with your verification app',
  'pages.account.security.dialog.enterKeyManually':
    'or enter this 32-digits key manually:',
  'pages.account.security.dialog.copyKey': 'Copy key',
  'pages.account.security.dialog.keyCopied': 'Key has been copied to clipboard',
  'pages.account.security.dialog.verificationCode': '6-digit code',
  'pages.account.security.dialog.verificationCodePlaceholder':
    'Enter the 6-digit code here',
  'pages.account.security.dialog.verificationCodeInvalid':
    'Invalid verification code format',
  'pages.account.security.dialog.smsStepLabel': 'Phone Number',
  'pages.account.security.dialog.smsStepDescription':
    'Enter a phone number to use as your authenticator.',
  'pages.account.security.dialog.phoneInvalid':
    'Phone number is invalid or not possible',
  'pages.account.security.dialog.phoneRequired': 'Phone number is required.',
  'pages.account.security.dialog.emailStepLabel': 'Email',
  'pages.account.security.dialog.emailStepDescription':
    'Enter an email to use as your authenticator.',
  'pages.account.security.dialog.verificationStepDescription':
    'Enter a 6-digit code we just sent to "{address}"',
  'pages.account.security.dialog.next': 'Next',
  'pages.account.security.dialog.backupCodeDescription':
    'Print out the codes so you have them handy when you need to use them to log in to your account. You can use each backup code once.',
  'pages.account.security.dialog.backupCodeWarn':
    'Once you leave this page, these codes cannot be shown again. Store them safely using the options below.',
  'pages.account.security.dialog.downloadTxt': 'Download (txt)',
  'pages.account.security.dialog.print': 'Print',
  'pages.account.security.dialog.tooManyRequests':
    'Too many requests to check verification code',
  'pages.account.security.dialog.activateFailed': 'Operation failed',
};
