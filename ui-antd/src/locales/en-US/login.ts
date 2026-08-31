/**
 * en-US login family (password line, M1). Key-for-key identical with
 * zh-CN/login.ts (check-locale gate).
 */
export default {
  'pages.layouts.userLayout.title': 'ThingsBoard IoT platform',

  // /user/login
  'pages.login.username.placeholder': 'Email',
  'pages.login.username.required': 'Email is required!',
  'pages.login.username.invalid': 'Invalid email address',
  'pages.login.password.placeholder': 'Password',
  'pages.login.password.required': 'Password is required!',
  'pages.login.submit': 'Sign in',
  'pages.login.success': 'Signed in successfully!',
  'pages.login.forgotPassword': 'Forgot password?',
  'pages.login.resetPasswordAction':
    'Password violates the policy — please reset it',
  'pages.login.error.title': 'Sign-in failed',

  // /user/forgot-password (ui-ngx resetPasswordRequest)
  'pages.forgotPassword.title': 'Forgot password',
  'pages.forgotPassword.description':
    'Enter your account email and we will send a password reset link.',
  'pages.forgotPassword.email.placeholder': 'Email',
  'pages.forgotPassword.email.required': 'Email is required!',
  'pages.forgotPassword.email.invalid': 'Invalid email address',
  'pages.forgotPassword.submit': 'Send reset link',
  'pages.forgotPassword.success': 'Reset link sent — please check your inbox.',

  // password fields shared by reset / create / reset-expired pages
  'pages.password.newPassword': 'New password',
  'pages.password.confirmPassword': 'Confirm new password',
  'pages.password.required': 'Password is required!',
  'pages.password.notMatch': 'Passwords do not match',
  'pages.password.policy.title': 'Password policy',
  'pages.password.policy.minimumLength': 'At least {n} characters',
  'pages.password.policy.maximumLength': 'At most {n} characters',
  'pages.password.policy.minimumUppercaseLetters':
    'At least {n} uppercase letters',
  'pages.password.policy.minimumLowercaseLetters':
    'At least {n} lowercase letters',
  'pages.password.policy.minimumDigits': 'At least {n} digits',
  'pages.password.policy.minimumSpecialCharacters':
    'At least {n} special characters',
  'pages.password.policy.noWhitespaces': 'No whitespace characters',
  'pages.password.strength': 'Password strength',
  'pages.password.strength.weak': 'Weak',
  'pages.password.strength.medium': 'Medium',
  'pages.password.strength.strong': 'Strong',

  // /user/reset-password (email reset link)
  'pages.resetPassword.title': 'Reset password',
  'pages.resetPassword.submit': 'Reset password',
  'pages.resetPassword.success':
    'Password updated — please sign in with the new password.',

  // /user/reset-expired-password (credentials-expired login redirect)
  'pages.resetExpiredPassword.title': 'Password expired',
  'pages.resetExpiredPassword.description':
    'Your password has expired or no longer satisfies the current password policy. Set a new one and sign in again.',

  // /user/create-password (activation link)
  'pages.createPassword.title': 'Create password',
  'pages.createPassword.description':
    'Set a password for your account to finish activation.',
  'pages.createPassword.submit': 'Activate account',
  'pages.createPassword.success':
    'Account activated — please sign in with the new password.',

  // link-expired pages (backend 303 targets)
  'pages.activationLinkExpired.title': 'Activation link expired',
  'pages.activationLinkExpired.message':
    'This activation link is no longer valid. Ask your administrator to resend the activation email.',
  'pages.passwordResetLinkExpired.title': 'Password reset link expired',
  'pages.passwordResetLinkExpired.message':
    'This password reset link is no longer valid. Please start the forgot-password flow again.',
  'pages.linkExpired.backToLogin': 'Back to sign in',
};
