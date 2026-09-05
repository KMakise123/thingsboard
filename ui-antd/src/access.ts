/**
 * Authority dictionary mirroring the backend Authority enum (spec §2).
 *
 * Every key returned here is referenced by the `access` fields in
 * config/routes.ts — keep both sides in sync when adding keys.
 *
 *   canSysAdmin          SYS_ADMIN only (sys-domain pages, M3+)
 *   canTenantAdmin       TENANT_ADMIN only
 *   canCustomerUser      CUSTOMER_USER only (read-only subset of tenant pages)
 *   canSysAdminOrTenantAdmin  SA + TA shared pages (M11 resources library)
 *   canTenantOrCustomer  tenant-scoped pages (devices, assets, alarms, …)
 *   canAuthenticated     any usable session
 */
import { Authority, type User } from '@/types/tb';

export interface AccessInitialState {
  currentUser?: User | null;
}

export interface TbAccess {
  canSysAdmin: boolean;
  canTenantAdmin: boolean;
  canCustomerUser: boolean;
  canSysAdminOrTenantAdmin: boolean;
  canTenantOrCustomer: boolean;
  canAuthenticated: boolean;
}

export default function access(
  initialState: AccessInitialState | undefined,
): TbAccess {
  const authority = initialState?.currentUser?.authority;
  const canSysAdmin = authority === Authority.SYS_ADMIN;
  const canTenantAdmin = authority === Authority.TENANT_ADMIN;
  const canCustomerUser = authority === Authority.CUSTOMER_USER;
  return {
    canSysAdmin,
    canTenantAdmin,
    canCustomerUser,
    canSysAdminOrTenantAdmin: canSysAdmin || canTenantAdmin,
    canTenantOrCustomer: canTenantAdmin || canCustomerUser,
    canAuthenticated: canSysAdmin || canTenantAdmin || canCustomerUser,
  };
}
