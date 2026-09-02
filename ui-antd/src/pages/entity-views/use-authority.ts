/**
 * Page-local authority reader for the entity-view pages.
 *
 * Same rationale as the device pages' hook: the JWT already carries the
 * authority scope, and core/auth imports cleanly under vitest without the
 * umi runtime. Entity views are tenant-admin land (routes gate the menu),
 * so any other authority gets the read-only surface — hand-typed URLs must
 * not unlock actions (spec 3.11).
 */
import { useMemo } from 'react';

import { tokenStore } from '@/core/auth/token-store';

export type AppAuthority = 'SYS_ADMIN' | 'TENANT_ADMIN' | 'CUSTOMER_USER';

export interface AuthorityInfo {
  authority: AppAuthority;
}

const KNOWN: ReadonlySet<string> = new Set([
  'SYS_ADMIN',
  'TENANT_ADMIN',
  'CUSTOMER_USER',
]);

export function readAuthorityInfo(): AuthorityInfo {
  const claims = tokenStore.decodeTokenClaims();
  const scope = claims?.scopes?.find((entry) => KNOWN.has(entry));
  if (scope === 'CUSTOMER_USER') {
    return { authority: 'CUSTOMER_USER' };
  }
  if (scope === 'SYS_ADMIN') {
    return { authority: 'SYS_ADMIN' };
  }
  // Unreadable token (SSR, corrupt storage): assume tenant — route guards
  // still reject unauthenticated users before this page mounts.
  return { authority: 'TENANT_ADMIN' };
}

export function useAuthority(): AuthorityInfo {
  return useMemo(readAuthorityInfo, []);
}
