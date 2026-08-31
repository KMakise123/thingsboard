/**
 * Handwritten authoritative customer types (M1 minimal set).
 *
 * Source of truth: ui-ngx customer.models + CustomerController, cross-checked
 * against the generated snapshot in src/types/tb/openapi. Only the fields M1
 * device-assign flows consume; the full customer domain lands in M2 with the
 * customers pages.
 */

import type { BaseData, EntityIdOf, EntityType, HasVersion } from './entity';

export interface CustomerAdditionalInfo {
  /** System-managed public customer — assign dialogs filter it out. */
  isPublic?: boolean;
  description?: string;
  homeDashboardId?: string;
  homeDashboardHideToolbar?: boolean;
}

export interface Customer
  extends BaseData<EntityIdOf<EntityType.CUSTOMER>>,
    HasVersion {
  tenantId: EntityIdOf<EntityType.TENANT>;
  title: string;
  additionalInfo?: CustomerAdditionalInfo;
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  address2?: string;
  zip?: string;
  phone?: string;
  email?: string;
}
