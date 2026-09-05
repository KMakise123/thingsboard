/**
 * Page-local authority reader for the edge detail page.
 *
 * Same rationale as the device detail page's hook (kept separate to respect
 * the file ownership boundary between the waves): the JWT already carries
 * the authority scope, and core/auth imports cleanly under vitest without
 * the umi runtime. TENANT_ADMIN gets the full detail surface, CUSTOMER_USER
 * the read-only collapse (spec §5.2).
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
