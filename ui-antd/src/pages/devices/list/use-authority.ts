/**
 * Page-local authority reader.
 *
 * The list page must know TENANT_ADMIN vs CUSTOMER_USER (CU is read-only and
 * reads the customer-scoped endpoint) before the umi initialState model is
 * consumed anywhere in this tree. The JWT already carries the answer
 * (`scopes[0]`, `customerId` claim — same decode ui-ngx performs in
 * auth.service), and core/auth is importable under vitest without umi
 * runtime, so the page derives it from the token instead of the model.
 * When the auth wave's initialState becomes the norm, this hook can switch
 * sources without touching any consumer.
 */
import { useMemo } from 'react';

import { tokenStore } from '@/core/auth/token-store';

export type AppAuthority = 'SYS_ADMIN' | 'TENANT_ADMIN' | 'CUSTOMER_USER';

export interface AuthorityInfo {
  authority: AppAuthority;
  /** Present for CUSTOMER_USER — the owning customer of the session. */
  customerId?: string;
}

const KNOWN: ReadonlySet<string> = new Set([
  'SYS_ADMIN',
  'TENANT_ADMIN',
  'CUSTOMER_USER',
]);

export function readAuthorityInfo(): AuthorityInfo {
  const claims = tokenStore.decodeTokenClaims();
  const scope = claims?.scopes?.find((entry) => KNOWN.has(entry));
  const customerId =
    typeof claims?.customerId === 'string'
      ? (claims.customerId as string)
      : undefined;
  if (scope === 'CUSTOMER_USER') {
    return { authority: 'CUSTOMER_USER', customerId };
  }
  if (scope === 'SYS_ADMIN') {
    return { authority: 'SYS_ADMIN' };
  }
  // Unreadable token (SSR, corrupt storage): assume tenant — the shell's
  // route guards still reject unauthenticated users before this page mounts.
  return { authority: 'TENANT_ADMIN' };
}

export function useAuthority(): AuthorityInfo {
  return useMemo(readAuthorityInfo, []);
}
