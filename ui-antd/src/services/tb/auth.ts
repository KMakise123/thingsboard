/**
 * Auth transport (handwritten; endpoints pinned against ui-ngx auth.service
 * and the openapi snapshot).
 *
 * Token side effects live here (login/changePassword store the new pair,
 * logout clears) — this is the auth domain service, matching ui-ngx's
 * AuthService; nothing else in services/ touches tokenStore.
 */

import { tokenStore } from '@/core/auth/token-store';
import type { LoginRequest, LoginResponse, User } from '@/types/tb';

import { tbHttp } from './http';

/** GET /api/noauth/userPasswordPolicy response — every field optional (openapi). */
export interface UserPasswordPolicy {
  minimumLength?: number;
  maximumLength?: number;
  minimumUppercaseLetters?: number;
  minimumLowercaseLetters?: number;
  minimumDigits?: number;
  minimumSpecialCharacters?: number;
  allowWhitespaces?: boolean;
  forceUserToResetPasswordIfNotValid?: boolean;
  /** Force expiration after N days (absent when disabled). */
  passwordExpirationPeriodDays?: number;
  /** Disallow reuse within N days (absent when disabled). */
  passwordReuseFrequencyDays?: number;
}

/** POST /api/auth/login */
export async function login(request: LoginRequest): Promise<LoginResponse> {
  const response = await tbHttp.post<LoginResponse>('/api/auth/login', request);
  tokenStore.setTokens(response.token, response.refreshToken);
  return response;
}

/** POST /api/auth/logout */
export async function logout(): Promise<void> {
  try {
    await tbHttp.post('/api/auth/logout');
  } finally {
    tokenStore.clear();
  }
}

/** POST /api/auth/token — manual refresh (the http layer refreshes on 401 by itself). */
export async function refreshToken(refreshTokenValue: string): Promise<LoginResponse> {
  // /api/auth/token is exempt in the client: no bearer, no 401 recursion.
  return tbHttp.post<LoginResponse>('/api/auth/token', { refreshToken: refreshTokenValue });
}

/** GET /api/auth/user — current user (getInitialState goes through this). */
export async function getCurrentUser(): Promise<User> {
  return tbHttp.get<User>('/api/auth/user');
}

/** POST /api/auth/changePassword — response carries a fresh token pair. */
export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<LoginResponse> {
  const response = await tbHttp.post<LoginResponse>('/api/auth/changePassword', {
    currentPassword,
    newPassword,
  });
  tokenStore.setTokens(response.token, response.refreshToken);
  return response;
}

/** POST /api/noauth/resetPasswordByEmail — forgot-password mail trigger. */
export async function requestPasswordReset(email: string): Promise<void> {
  await tbHttp.post('/api/noauth/resetPasswordByEmail', { email });
}

/** POST /api/noauth/resetPassword — reset via emailed token. */
export async function resetPasswordByToken(
  resetToken: string,
  password: string,
): Promise<void> {
  await tbHttp.post('/api/noauth/resetPassword', { resetToken, password });
}

/** POST /api/noauth/activate — create password from activation email link. */
export async function activate(
  activateToken: string,
  password: string,
  sendActivationMail = false,
): Promise<LoginResponse> {
  const response = await tbHttp.post<LoginResponse>(
    '/api/noauth/activate',
    { activateToken, password },
    { sendActivationMail },
  );
  tokenStore.setTokens(response.token, response.refreshToken);
  return response;
}

/** GET /api/noauth/userPasswordPolicy — strength hints for password forms. */
export async function getUserPasswordPolicy(): Promise<UserPasswordPolicy> {
  return tbHttp.get<UserPasswordPolicy>('/api/noauth/userPasswordPolicy');
}
