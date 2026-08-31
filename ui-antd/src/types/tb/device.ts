/**
 * Device domain types (handwritten, authoritative).
 *
 * Base: ui-ngx/src/app/shared/models/device.models.ts, cross-checked against
 * openapi schemas Device / DeviceCredentials / DeviceProfileInfo.
 */

import type {
  BaseData,
  EntityIdOf,
  EntityType,
  HasTenantIdAndCustomer,
  HasVersion,
} from './entity';

/** Transport families a device profile can select. */
export enum DeviceTransportType {
  DEFAULT = 'DEFAULT',
  MQTT = 'MQTT',
  COAP = 'COAP',
  LWM2M = 'LWM2M',
  SNMP = 'SNMP',
}

export enum DeviceProfileType {
  DEFAULT = 'DEFAULT',
  SNMP = 'SNMP',
}

/**
 * Opaque per-transport configuration blobs. M1 only round-trips them
 * (read/edit JSON); typed editors arrive with the profile pages (M3).
 */
export interface DeviceData {
  configuration: Record<string, unknown> & { type?: string };
  transportConfiguration: Record<string, unknown> & {
    type?: DeviceTransportType;
  };
}

/** GET /api/device — full device entity (also the POST /api/device body). */
export interface Device
  extends BaseData<EntityIdOf<EntityType.DEVICE>>,
    HasTenantIdAndCustomer,
    HasVersion {
  name: string;
  /** Device profile "type" name; derived, prefer deviceProfileId. */
  type?: string;
  label?: string;
  deviceProfileId?: EntityIdOf<EntityType.DEVICE_PROFILE>;
  firmwareId?: EntityIdOf<EntityType.OTA_PACKAGE>;
  softwareId?: EntityIdOf<EntityType.OTA_PACKAGE>;
  deviceData?: DeviceData;
  /** Free-form JSON: description, gateway flag, overwrite activity time... */
  additionalInfo?: Record<string, unknown>;
}

/**
 * GET /api/tenant/deviceInfos — list row with joined fields the table needs.
 * (V2 shape: the old /api/tenant/devices plain-Device variant is not consumed.)
 */
export interface DeviceInfo extends Device {
  customerTitle: string;
  customerIsPublic: boolean;
  deviceProfileName: string;
  active: boolean;
}

/** Device profile digest for list filters and wizards. */
export interface DeviceProfileInfo {
  id: EntityIdOf<EntityType.DEVICE_PROFILE>;
  tenantId?: EntityIdOf<EntityType.TENANT>;
  name: string;
  image?: string;
  defaultDashboardId?: EntityIdOf<EntityType.DASHBOARD>;
  type: DeviceProfileType;
  transportType: DeviceTransportType;
}

/** Wire enum — the backend knows 4 values (openapi DeviceCredentialsType). */
export enum DeviceCredentialsType {
  ACCESS_TOKEN = 'ACCESS_TOKEN',
  X509_CERTIFICATE = 'X509_CERTIFICATE',
  MQTT_BASIC = 'MQTT_BASIC',
  LWM2M_CREDENTIALS = 'LWM2M_CREDENTIALS',
}

/** Decoded `credentialsValue` when type === MQTT_BASIC. */
export interface DeviceCredentialMqttBasic {
  clientId: string;
  userName: string;
  password: string;
}

/**
 * Credentials dialog forms (M1 scope): the three shapes the UI can render/edit.
 * `credentialsValue` is a JSON string on the wire; these are the parsed bodies.
 */
export type DeviceCredentialsValue =
  | { credentialsType: DeviceCredentialsType.ACCESS_TOKEN; accessToken: string }
  | {
      credentialsType: DeviceCredentialsType.MQTT_BASIC;
      mqttBasic: DeviceCredentialMqttBasic;
    }
  | {
      credentialsType: DeviceCredentialsType.X509_CERTIFICATE;
      /** PEM chain, multiline string. */
      certPem: string;
    };

/**
 * GET /api/device/{deviceId}/credentials raw wire shape.
 * (The credentials entity has no EntityType enum value — id stays loose.)
 */
export interface DeviceCredentials extends BaseData, HasVersion {
  deviceId: EntityIdOf<EntityType.DEVICE>;
  credentialsType: DeviceCredentialsType;
  /** Unique credential id (token hash / CN / empty). */
  credentialsId?: string;
  /** Opaque JSON string; decode per credentialsType. */
  credentialsValue?: string;
}

/** Save-Device request used by the create wizard (POST /api/device). */
export interface SaveDeviceParams {
  /** Access token to provision in the same request. */
  accessToken?: string;
}

/** CSV bulk import body — POST /api/device/bulk_import (multipart/form-data). */
export interface BulkImportRequest {
  file: File | Blob;
  mapping: Record<string, unknown>;
}

/** Bulk import response — per-row errors and counters. */
export interface BulkImportResult {
  created: number;
  updated: number;
  deleted: number;
  errors: Array<{ line: number; error: string }>;
}

/** Connectivity-check payload — GET /api/device-connectivity/{deviceId}. */
export interface PublishTelemetryCommand {
  http?: { http?: string; https?: string };
  mqtt: {
    mqtt?: string;
    mqtts?: string | Array<string>;
    docker?: { mqtt?: string; mqtts?: string | Array<string> };
  };
  coap: {
    coap?: string;
    coaps?: string;
    docker?: { coap?: string; coaps?: string };
  };
  lwm2m?: string;
  snmp?: string;
}

/** Entity list filter for the device selector (POST /api/devices query body). */
export interface DeviceSearchQuery {
  entityFilter: Record<string, unknown>;
  deviceTypes?: Array<string>;
}
