/**
 * Factory defaults for profileData blobs (ui-ngx device.models parity):
 * createDeviceProfileConfiguration / createDeviceProfileTransportConfiguration.
 * Used when creating a profile and when the transport type changes (ui-ngx
 * rebuilds the configuration silently on type change).
 */
import { DeviceProfileType, DeviceTransportType } from '@/types/tb/device';
import {
  CoapPowerMode,
  CoapTransportDeviceType,
  type DeviceProfileConfiguration,
  type DeviceProfileTransportConfiguration,
  type DeviceProvisionConfiguration,
  DeviceProvisionType,
  TransportPayloadType,
} from '@/types/tb/device-profile';

/** DEFAULT is the only type with a create path in v1 (empty configuration). */
export function createDeviceProfileConfiguration(
  type: DeviceProfileType,
): DeviceProfileConfiguration {
  if (type === DeviceProfileType.SNMP) {
    // ui-ngx SNMP profile configuration has no editor in this port (leftover).
    return { type: DeviceProfileType.SNMP };
  }
  return { type: DeviceProfileType.DEFAULT };
}

/** Provisioning seed (ui-ngx builds the same shape from provisionType). */
export function createDeviceProvisionConfiguration(
  type: DeviceProvisionType = DeviceProvisionType.DISABLED,
): DeviceProvisionConfiguration {
  return { type };
}

export function createDeviceProfileTransportConfiguration(
  type: DeviceTransportType,
): DeviceProfileTransportConfiguration {
  switch (type) {
    case 'MQTT':
      return {
        type,
        deviceTelemetryTopic: 'v1/devices/me/telemetry',
        deviceAttributesTopic: 'v1/devices/me/attributes',
        deviceAttributesSubscribeTopic: 'v1/devices/me/attributes',
        sparkplug: false,
        sparkplugAttributesMetricNames: [
          'Node Control/*',
          'Device Control/*',
          'Properties/*',
        ],
        sendAckOnValidationException: false,
        transportPayloadTypeConfiguration: {
          transportPayloadType: TransportPayloadType.JSON,
          enableCompatibilityWithJsonPayloadFormat: false,
          useJsonPayloadFormatForDefaultDownlinkTopics: false,
        },
      };
    case 'COAP':
      return {
        type,
        coapDeviceTypeConfiguration: {
          coapDeviceType: CoapTransportDeviceType.DEFAULT,
          transportPayloadTypeConfiguration: {
            transportPayloadType: TransportPayloadType.JSON,
          },
        },
        clientSettings: { powerMode: CoapPowerMode.DRX },
      };
    case 'SNMP':
      return { type, timeoutMs: 500, retries: 0, communicationConfigs: null };
    case 'LWM2M':
      // Deep object/observe configuration is a registered v2 leftover; the
      // seed keeps the shape the transport expects and the detail tab
      // round-trips whatever the server returns verbatim.
      return { type };
    default:
      return { type: DeviceTransportType.DEFAULT };
  }
}
