/**
 * Device transport (handwritten). Double-path endpoints always use the V2
 * Infos shape; every paged call passes an explicit sort. Batch operations
 * fan out over the single-entity endpoints — upstream has no bulk endpoint
 * and ui-ngx does the same forkJoin dance.
 */

import type { QueryParams } from '@/core/http/client';
import {
  type BulkImportRequest,
  type BulkImportResult,
  type Device,
  type DeviceCredentials,
  type DeviceInfo,
  type DeviceProfileInfo,
  type DeviceSearchQuery,
  type EntitySubtype,
  type PageData,
  type PageLink,
  pageLinkToQueryParams,
} from '@/types/tb';

import { tbHttp } from './http';

export interface DeviceListFilter {
  /** Legacy profile type name (mutually exclusive with deviceProfileId). */
  type?: string;
  deviceProfileId?: string;
  active?: boolean;
}

function deviceListQuery(
  pageLink: PageLink,
  filter: DeviceListFilter = {},
): QueryParams {
  return {
    ...pageLinkToQueryParams(pageLink),
    type: filter.type,
    deviceProfileId: filter.deviceProfileId,
    active: filter.active,
  };
}

/** GET /api/tenant/deviceInfos (V2 shape: joined profile/customer/active). */
export async function getTenantDevices(
  pageLink: PageLink,
  filter: DeviceListFilter = {},
): Promise<PageData<DeviceInfo>> {
  return tbHttp.get<PageData<DeviceInfo>>(
    '/api/tenant/deviceInfos',
    deviceListQuery(pageLink, filter),
  );
}

/** GET /api/customer/{customerId}/deviceInfos (V2). */
export async function getCustomerDevices(
  customerId: string,
  pageLink: PageLink,
  filter: DeviceListFilter = {},
): Promise<PageData<DeviceInfo>> {
  return tbHttp.get<PageData<DeviceInfo>>(
    `/api/customer/${customerId}/deviceInfos`,
    deviceListQuery(pageLink, filter),
  );
}

/** GET /api/device/{deviceId} */
export async function getDeviceById(deviceId: string): Promise<Device> {
  return tbHttp.get<Device>(`/api/device/${deviceId}`);
}

/** GET /api/device/info/{deviceId} (V2 joined row). */
export async function getDeviceInfoById(deviceId: string): Promise<DeviceInfo> {
  return tbHttp.get<DeviceInfo>(`/api/device/info/${deviceId}`);
}

/** POST /api/device (accessToken rides as a query param, as in ui-ngx). */
export async function saveDevice(
  device: Device,
  params: { accessToken?: string } = {},
): Promise<Device> {
  return tbHttp.post<Device>('/api/device', device, {
    accessToken: params.accessToken,
  });
}

/** POST /api/device-with-credentials — wizard step "create with credentials". */
export async function saveDeviceWithCredentials(
  device: Device,
  credentials: DeviceCredentials,
): Promise<Device> {
  return tbHttp.post<Device>('/api/device-with-credentials', { device, credentials });
}

/** DELETE /api/device/{deviceId} */
export async function deleteDevice(deviceId: string): Promise<void> {
  await tbHttp.delete(`/api/device/${deviceId}`);
}

/** Batch delete: fan-out over DELETE /api/device/{id} (no bulk endpoint upstream). */
export async function deleteDevices(deviceIds: Array<string>): Promise<void> {
  await Promise.all(deviceIds.map((id) => deleteDevice(id)));
}

/** POST /api/devices (findDevicesByQuery) — selector / wizard entity search. */
export async function findDevicesByQuery(
  query: DeviceSearchQuery,
): Promise<Array<Device>> {
  return tbHttp.post<Array<Device>>('/api/devices', query);
}

/**
 * POST /api/entitiesQuery/count — count for the same query shape (the count
 * endpoint reads `entityFilter` only; `deviceTypes` is ignored).
 */
export async function findDeviceCountByQuery(
  query: DeviceSearchQuery,
): Promise<number> {
  return tbHttp.post<number>('/api/entitiesQuery/count', query);
}

/** GET /api/device/{deviceId}/credentials */
export async function getDeviceCredentials(deviceId: string): Promise<DeviceCredentials> {
  return tbHttp.get<DeviceCredentials>(`/api/device/${deviceId}/credentials`);
}

/** POST /api/device/credentials */
export async function saveDeviceCredentials(
  credentials: DeviceCredentials,
): Promise<DeviceCredentials> {
  return tbHttp.post<DeviceCredentials>('/api/device/credentials', credentials);
}

/** POST /api/customer/{customerId}/device/{deviceId} */
export async function assignDeviceToCustomer(
  customerId: string,
  deviceId: string,
): Promise<Device> {
  return tbHttp.post<Device>(`/api/customer/${customerId}/device/${deviceId}`);
}

/** DELETE /api/customer/device/{deviceId} */
export async function unassignDeviceFromCustomer(deviceId: string): Promise<void> {
  await tbHttp.delete(`/api/customer/device/${deviceId}`);
}

/** Batch assign — fan-out over the single-assign endpoint. */
export async function assignDevicesToCustomer(
  customerId: string,
  deviceIds: Array<string>,
): Promise<void> {
  await Promise.all(deviceIds.map((id) => assignDeviceToCustomer(customerId, id)));
}

/** Batch unassign — fan-out over the single-unassign endpoint. */
export async function unassignDevicesFromCustomer(deviceIds: Array<string>): Promise<void> {
  await Promise.all(deviceIds.map((id) => unassignDeviceFromCustomer(id)));
}

/** GET /api/device/types — profile type names for legacy filters. */
export async function getDeviceTypes(): Promise<Array<EntitySubtype>> {
  return tbHttp.get<Array<EntitySubtype>>('/api/device/types');
}

/** GET /api/deviceProfileInfos — profile autocomplete (V2 digest). */
export async function getDeviceProfiles(
  pageLink: PageLink,
): Promise<PageData<DeviceProfileInfo>> {
  return tbHttp.get<PageData<DeviceProfileInfo>>(
    '/api/deviceProfileInfos',
    pageLinkToQueryParams(pageLink),
  );
}

/**
 * POST /api/device/bulk_import — JSON body (the backend binds
 * `@RequestBody BulkImportRequest`; `file` carries the CSV text itself).
 */
export async function importDevices(
  request: BulkImportRequest,
): Promise<BulkImportResult> {
  return tbHttp.post<BulkImportResult>('/api/device/bulk_import', request);
}

/** GET /api/device-connectivity/{deviceId} — connectivity check dialog. */
export async function getDeviceConnectivity(deviceId: string): Promise<Record<string, unknown>> {
  return tbHttp.get<Record<string, unknown>>(`/api/device-connectivity/${deviceId}`);
}
