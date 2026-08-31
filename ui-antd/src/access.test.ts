import { describe, expect, it } from 'vitest';
import { Authority, type User } from '@/types/tb';
import access from './access';

/** Partial user — access only reads `authority`. */
function userWith(authority: Authority) {
  return { authority } as User;
}

describe('access', () => {
  it('grants every role key for a SYS_ADMIN session', () => {
    const result = access({ currentUser: userWith(Authority.SYS_ADMIN) });
    expect(result).toEqual({
      canSysAdmin: true,
      canTenantAdmin: false,
      canCustomerUser: false,
      canTenantOrCustomer: false,
      canAuthenticated: true,
    });
  });

  it('scopes TENANT_ADMIN to tenant pages and denies sys pages', () => {
    const result = access({ currentUser: userWith(Authority.TENANT_ADMIN) });
    expect(result.canSysAdmin).toBe(false);
    expect(result.canTenantAdmin).toBe(true);
    expect(result.canTenantOrCustomer).toBe(true);
    expect(result.canAuthenticated).toBe(true);
  });

  it('treats CUSTOMER_USER as a tenant-scoped read-only session', () => {
    const result = access({ currentUser: userWith(Authority.CUSTOMER_USER) });
    expect(result.canCustomerUser).toBe(true);
    expect(result.canTenantAdmin).toBe(false);
    expect(result.canTenantOrCustomer).toBe(true);
    expect(result.canAuthenticated).toBe(true);
  });

  it('denies everything without a current user', () => {
    const result = access({ currentUser: null });
    expect(result.canSysAdmin).toBe(false);
    expect(result.canTenantAdmin).toBe(false);
    expect(result.canCustomerUser).toBe(false);
    expect(result.canTenantOrCustomer).toBe(false);
    expect(result.canAuthenticated).toBe(false);
  });

  it('denies everything for transient token scopes (not usable sessions)', () => {
    // Login flows never surface these as currentUser, but the dictionary
    // must not accidentally treat them as an authority.
    const refresh = access({
      currentUser: userWith(Authority.REFRESH_TOKEN),
    });
    expect(refresh.canAuthenticated).toBe(false);
    expect(refresh.canTenantOrCustomer).toBe(false);

    const preVerification = access({
      currentUser: userWith(Authority.PRE_VERIFICATION_TOKEN),
    });
    expect(preVerification.canAuthenticated).toBe(false);
  });

  it('denies everything when initialState or authority is undefined', () => {
    expect(access(undefined).canAuthenticated).toBe(false);
    expect(access({}).canAuthenticated).toBe(false);
    expect(access({ currentUser: {} as User }).canAuthenticated).toBe(false);
  });
});
