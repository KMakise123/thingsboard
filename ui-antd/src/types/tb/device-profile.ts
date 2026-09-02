/**
 * Device-profile domain types (handwritten, authoritative).
 *
 * Base: ui-ngx/src/app/shared/models/device.models.ts, cross-checked against
 * the openapi snapshot (`DeviceProfile` schema: the default flag serializes
 * as `default`, not `isDefault`) and the Java bean
 * common/data/.../DeviceProfile.java.
 */

import type { DeviceProfileType, DeviceTransportType } from './device';
import type { BaseData, EntityIdOf, EntityType, HasVersion } from './entity';

/**
 * Wire enum — provisioning strategies the transport accepts
 * (openapi DeviceProfile.provisionType; CE has no claiming field).
 */
export enum DeviceProvisionType {
  DISABLED = 'DISABLED',
  ALLOW_CREATE_NEW_DEVICES = 'ALLOW_CREATE_NEW_DEVICES',
  CHECK_PRE_PROVISIONED_DEVICES = 'CHECK_PRE_PROVISIONED_DEVICES',
  X509_CERTIFICATE_CHAIN = 'X509_CERTIFICATE_CHAIN',
}

/** Wire enum — MQTT/CoAP payload encoding (ui-ngx TransportPayloadType). */
export enum TransportPayloadType {
  JSON = 'JSON',
  PROTOBUF = 'PROTOBUF',
}

/** Wire enum — CoAP device flavours (ui-ngx CoapTransportDeviceType). */
export enum CoapTransportDeviceType {
  DEFAULT = 'DEFAULT',
  EFENTO = 'EFENTO',
}

/** Wire enum — CoAP client power-saving modes (ui-ngx PowerMode). */
export enum CoapPowerMode {
  E_DRX = 'E_DRX',
  PSM = 'PSM',
  DRX = 'DRX',
}

/** Wire enum — OTA package families referenced by a device profile. */
export enum OtaPackageType {
  FIRMWARE = 'FIRMWARE',
  SOFTWARE = 'SOFTWARE',
}

/** `profileData.configuration` — DEFAULT carries no fields (empty form in ui-ngx). */
export interface DeviceProfileConfiguration {
  type: DeviceProfileType;
  [key: string]: unknown;
}

/** Nested payload block shared by the MQTT and CoAP transport forms. */
export interface TransportPayloadTypeConfiguration {
  transportPayloadType?: TransportPayloadType;
  /** Present (PROTOBUF only): JSON-compatibility switches. */
  enableCompatibilityWithJsonPayloadFormat?: boolean;
  useJsonPayloadFormatForDefaultDownlinkTopics?: boolean;
  /** PROTOBUF schemas (multiline .proto text). */
  deviceTelemetryProtoSchema?: string;
  deviceAttributesProtoSchema?: string;
  deviceRpcRequestProtoSchema?: string;
  deviceRpcResponseProtoSchema?: string;
  [key: string]: unknown;
}

/**
 * `profileData.transportConfiguration` per transport family. The wire blob
 * is one object discriminated by `type`; families that v1 does not render as
 * a form (LWM2M object/observe config, the SNMP mapping table) keep their
 * fields as an opaque record so a save round-trips them untouched.
 */
export interface DeviceProfileTransportConfiguration {
  type: DeviceTransportType;
  /** MQTT only. */
  deviceTelemetryTopic?: string;
  deviceAttributesTopic?: string;
  deviceAttributesSubscribeTopic?: string;
  sparkplug?: boolean;
  sparkplugAttributesMetricNames?: Array<string>;
  sendAckOnValidationException?: boolean;
  transportPayloadTypeConfiguration?: TransportPayloadTypeConfiguration;
  /** CoAP only. */
  coapDeviceTypeConfiguration?: {
    coapDeviceType?: CoapTransportDeviceType;
    transportPayloadTypeConfiguration?: TransportPayloadTypeConfiguration;
    [key: string]: unknown;
  };
  clientSettings?: {
    powerMode?: CoapPowerMode | null;
    edrxCycle?: number;
    pagingTransmissionWindow?: number;
    psmActivityTimer?: number;
    [key: string]: unknown;
  };
  /** SNMP only (editable scalar fields). */
  timeoutMs?: number;
  retries?: number;
  /**
   * Opaque leftovers of the families whose deep editors are not built yet
   * (LWM2M object/observe tree, SNMP communicationConfigs mappings).
   * Round-tripped verbatim on save.
   */
  [key: string]: unknown;
}

/**
 * `profileData.provisionConfiguration` — the UI-facing provisioning block.
 * On the wire `type`/`provisionDeviceKey` also mirror onto the profile root
 * (provisionType/provisionDeviceKey); the secret only lives here.
 */
export interface DeviceProvisionConfiguration {
  type: DeviceProvisionType;
  provisionDeviceSecret?: string;
  provisionDeviceKey?: string;
  certificateValue?: string;
  certificateRegExPattern?: string;
  allowCreateNewDevicesByX509Certificate?: boolean;
}

/** `profileData` — the profile's nested configuration bag. */
export interface DeviceProfileData {
  configuration: DeviceProfileConfiguration;
  transportConfiguration: DeviceProfileTransportConfiguration;
  /** @Deprecated legacy alarm rules — M1 scope keeps them read-only (round-trip only). */
  alarms?: Array<unknown>;
  provisionConfiguration?: DeviceProvisionConfiguration;
}

/** GET /api/deviceProfile/{id} / POST /api/deviceProfile — the full entity. */
export interface DeviceProfile
  extends BaseData<EntityIdOf<EntityType.DEVICE_PROFILE>>,
    HasVersion {
  tenantId?: EntityIdOf<EntityType.TENANT>;
  name: string;
  description?: string;
  /** Serialized as `default` on the wire (Java `boolean isDefault`). */
  default: boolean;
  type: DeviceProfileType;
  image?: string;
  transportType: DeviceTransportType;
  provisionType: DeviceProvisionType;
  provisionDeviceKey?: string;
  defaultRuleChainId?: EntityIdOf<EntityType.RULE_CHAIN>;
  defaultDashboardId?: EntityIdOf<EntityType.DASHBOARD>;
  defaultQueueName?: string;
  firmwareId?: EntityIdOf<EntityType.OTA_PACKAGE>;
  softwareId?: EntityIdOf<EntityType.OTA_PACKAGE>;
  defaultEdgeRuleChainId?: EntityIdOf<EntityType.RULE_CHAIN>;
  profileData: DeviceProfileData;
}

/** Minimal queue row for the default-queue picker (GET /api/queues). */
export interface RuleEngineQueue {
  id: { entityType: EntityType.QUEUE; id: string };
  name: string;
  topic?: string;
}

/** Minimal rule-chain row for the default-rule-chain pickers. */
export interface RuleChainDigest {
  id: EntityIdOf<EntityType.RULE_CHAIN>;
  name: string;
  root?: boolean;
}

/** Rule chain families the /api/ruleChains?type= filter accepts. */
export type RuleChainTypeFilter = 'CORE' | 'EDGE';

/** Minimal OTA package row for the firmware/software pickers. */
export interface OtaPackageDigest {
  id: EntityIdOf<EntityType.OTA_PACKAGE>;
  title: string;
  version: string;
  type: OtaPackageType;
}
