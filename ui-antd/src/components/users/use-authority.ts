/**
 * Authority reader for the shared UsersTable hosts.
 *
 * Same rationale as the device list's reader: the host needs the caller's
 * authority before the umi initialState model is consumed in this tree, and
 * the JWT already carries the answer. Adds the two claims the user domain
 * needs on top: `userId` (self-delete guard — you cannot delete yourself)
 * and `tenantId` (context for the create payload; the backend also forces
 * the session tenant for non-SA callers).
 */
import { useMemo } from 'react';

import { tokenStore } from '@/core/auth/token-store';

export type AppAuthority = 'SYS_ADMIN' | 'TENANT_ADMIN' | 'CUSTOMER_USER';

export interface AuthorityInfo {
  authority: AppAuthority;
  /** Present for CUSTOMER_USER — the owning customer of the session. */
  customerId?: string;
  /** Session user id (self-delete guard). */
  userId?: string;
  /** Session tenant id. */
  tenantId?: string;
}

const KNOWN: ReadonlySet<string> = new Set([
  'SYS_ADMIN',
  'TENANT_ADMIN',
  'CUSTOMER_USER',
]);

export function readAuthorityInfo(): AuthorityInfo {
  const claims = tokenStore.decodeTokenClaims();
  const scope = claims?.scopes?.find((entry) => KNOWN.has(entry));
  const claimString = (key: string): string | undefined =>
    typeof claims?.[key] === 'string' ? (claims[key] as string) : undefined;
  if (scope === 'CUSTOMER_USER') {
    return {
      authority: 'CUSTOMER_USER',
      customerId: claimString('customerId'),
      userId: claimString('userId'),
      tenantId: claimString('tenantId'),
    };
  }
  if (scope === 'SYS_ADMIN') {
    return { authority: 'SYS_ADMIN', userId: claimString('userId') };
  }
  // Unreadable token (SSR, corrupt storage): assume tenant — the shell's
  // route guards still reject unauthenticated users before this page mounts.
  return {
    authority: 'TENANT_ADMIN',
    userId: claimString('userId'),
    tenantId: claimString('tenantId'),
  };
}

export function useAuthority(): AuthorityInfo {
  return useMemo(readAuthorityInfo, []);
}
