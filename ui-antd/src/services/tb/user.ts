/**
 * User transport (handwritten, M2 user-management page).
 *
 * Parity note (RECON §3 / spec §3.5): the backend has NO resetPassword
 * endpoint. ui-ngx's "reset password" row action = show the activation link
 * dialog (getUserActivationLink) + resend the activation email
 * (sendActivationMail). The user domain agent builds the UI on those two.
 *
 * GET /api/users resolves the tenant/customer scope server-side from the
 * caller's authority (TA → tenant users, CU → own customer's users), so the
 * caller only picks the tenant-wide vs customer-scoped entry point.
 */

import { type PageData, type PageLink, type User, type UserActivationLink, pageLinkToQueryParams } from '@/types/tb';

import { tbHttp } from './http';

/** GET /api/users — authority-scoped paged user list. */
export async function getUsers(
  pageLink: PageLink,
): Promise<PageData<User>> {
  return tbHttp.get<PageData<User>>('/api/users', pageLinkToQueryParams(pageLink));
}

/** GET /api/customer/{customerId}/users — customer-scoped paged user list. */
export async function getCustomerUsers(
  customerId: string,
  pageLink: PageLink,
): Promise<PageData<User>> {
  return tbHttp.get<PageData<User>>(
    `/api/customer/${customerId}/users`,
    pageLinkToQueryParams(pageLink),
  );
}

/**
 * POST /api/user — create and update. `sendActivationMail` rides as a query
 * param exactly like ui-ngx's saveUser(user, sendActivationMail).
 */
export async function saveUser(
  user: User,
  params: { sendActivationMail?: boolean } = {},
): Promise<User> {
  return tbHttp.post<User>('/api/user', user, {
    sendActivationMail: params.sendActivationMail,
  });
}

/** GET /api/user/{userId} */
export async function getUserById(userId: string): Promise<User> {
  return tbHttp.get<User>(`/api/user/${userId}`);
}

/** DELETE /api/user/{userId} */
export async function deleteUser(userId: string): Promise<void> {
  await tbHttp.delete(`/api/user/${userId}`);
}

/**
 * POST /api/user/{userId}/userCredentialsEnabled?userCredentialsEnabled= —
 * enable/disable the user's credentials (ui-ngx "disable user credentials").
 */
export async function setUserCredentialsEnabled(
  userId: string,
  enabled: boolean,
): Promise<void> {
  await tbHttp.post<void>(`/api/user/${userId}/userCredentialsEnabled`, undefined, {
    userCredentialsEnabled: enabled,
  });
}

/** GET /api/user/{userId}/activationLink — text/plain link string (the
 * http client falls back to the raw text when the body is not JSON). */
export async function getUserActivationLink(userId: string): Promise<string> {
  return tbHttp.get<string>(`/api/user/${userId}/activationLink`);
}

/** GET /api/user/{userId}/activationLinkInfo — link + TTL digest. */
export async function getUserActivationLinkInfo(
  userId: string,
): Promise<UserActivationLink> {
  return tbHttp.get<UserActivationLink>(
    `/api/user/${userId}/activationLinkInfo`,
  );
}

/** POST /api/user/sendActivationMail?email= */
export async function sendActivationMail(email: string): Promise<void> {
  await tbHttp.post<void>('/api/user/sendActivationMail', undefined, { email });
}
