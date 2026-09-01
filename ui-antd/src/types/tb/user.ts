/**
 * User / authority / tenant / customer types (handwritten, authoritative).
 *
 * Base: ui-ngx shared/models/user.model.ts + authority.enum.ts + customer.model.ts,
 * cross-checked against openapi schemas User / Tenant / Customer.
 */

import type {
  BaseData,
  EntityIdOf,
  EntityType,
  HasTenantIdAndCustomer,
  HasVersion,
} from './entity';

/**
 * JWT authority scope. Login flows only ever see the first three; the token
 * scopes REFRESH_TOKEN / PRE_VERIFICATION_TOKEN / MFA_CONFIGURATION_TOKEN
 * appear inside transient tokens, not in usable sessions.
 */
export enum Authority {
  SYS_ADMIN = 'SYS_ADMIN',
  TENANT_ADMIN = 'TENANT_ADMIN',
  CUSTOMER_USER = 'CUSTOMER_USER',
  REFRESH_TOKEN = 'REFRESH_TOKEN',
  PRE_VERIFICATION_TOKEN = 'PRE_VERIFICATION_TOKEN',
  MFA_CONFIGURATION_TOKEN = 'MFA_CONFIGURATION_TOKEN',
}

/** GET /api/user/{userId} — full user entity. */
export interface User
  extends BaseData<EntityIdOf<EntityType.USER>>,
    HasTenantIdAndCustomer,
    HasVersion {
  email: string;
  authority: Authority;
  firstName?: string;
  lastName?: string;
  phone?: string;
  /** Derived display name (server-side getter). */
  name?: string;
  additionalInfo?: Record<string, unknown>;
}

/** Decoded JWT payload — the cheap "who am I" before /api/auth/user resolves. */
export interface AuthUser {
  sub: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  scopes: Array<Authority>;
  authority: Authority;
  isPublic?: boolean;
  enabled?: boolean;
  [claim: string]: unknown;
}

/**
 * GET /api/user/{userId}/activationLinkInfo — the activation/password-create
 * link plus TTL. ui-ngx's "reset password" row action = showing this link
 * (the backend has no resetPassword endpoint for admins; spec §3.5).
 */
export interface UserActivationLink {
  value?: string;
  /** Link time-to-live in milliseconds. */
  ttlMs?: number;
}

/** POST /api/auth/login body + response. */
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  /** Authority scope of the returned token (password line: TENANT_ADMIN etc). */
  scope?: Authority;
}

/** Tenant digest (device lists embed tenant context; full CRUD lands M3). */
export interface Tenant
  extends BaseData<EntityIdOf<EntityType.TENANT>>,
    HasVersion {
  tenantProfileId?: EntityIdOf<EntityType.TENANT_PROFILE>;
  title: string;
  region?: string;
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  address2?: string;
  zip?: string;
  phone?: string;
  email?: string;
  additionalInfo?: Record<string, unknown>;
}
