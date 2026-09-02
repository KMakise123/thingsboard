/**
 * profileData factory tests (ui-ngx createDeviceProfileTransportConfiguration
 * parity): MQTT/COAP seeds match the upstream defaults; SNMP/LWM2M keep the
 * transport shape; provisioning seeds DISABLED.
 */
import { describe, expect, it } from 'vitest';

import {
  DeviceProfileType,
  DeviceTransportType,
} from '@/types/tb/device';
import { DeviceProvisionType } from '@/types/tb/device-profile';

import {
  createDeviceProfileConfiguration,
  createDeviceProfileTransportConfiguration,
  createDeviceProvisionConfiguration,
} from './transport-defaults';

describe('device profile configuration factories', () => {
  it('seeds MQTT with the upstream topic filters and JSON payload', () => {
    const config = createDeviceProfileTransportConfiguration(DeviceTransportType.MQTT);
    expect(config).toMatchObject({
      type: 'MQTT',
      deviceTelemetryTopic: 'v1/devices/me/telemetry',
      deviceAttributesTopic: 'v1/devices/me/attributes',
      deviceAttributesSubscribeTopic: 'v1/devices/me/attributes',
      sparkplug: false,
      sendAckOnValidationException: false,
    });
    expect(config.transportPayloadTypeConfiguration).toMatchObject({
      transportPayloadType: 'JSON',
      enableCompatibilityWithJsonPayloadFormat: false,
      useJsonPayloadFormatForDefaultDownlinkTopics: false,
    });
  });

  it('seeds COAP with the default device type and DRX power mode', () => {
    const config = createDeviceProfileTransportConfiguration(DeviceTransportType.COAP);
    expect(config.coapDeviceTypeConfiguration).toMatchObject({
      coapDeviceType: 'DEFAULT',
    });
    expect(config.clientSettings).toEqual({ powerMode: 'DRX' });
  });

  it('seeds SNMP with the upstream timeout/retries and keeps LWM2M a stub', () => {
    const snmp = createDeviceProfileTransportConfiguration(DeviceTransportType.SNMP);
    expect(snmp).toMatchObject({ type: 'SNMP', timeoutMs: 500, retries: 0 });

    const lwm2m = createDeviceProfileTransportConfiguration(DeviceTransportType.LWM2M);
    expect(lwm2m).toEqual({ type: 'LWM2M' });

    expect(createDeviceProfileTransportConfiguration(DeviceTransportType.DEFAULT)).toEqual({
      type: 'DEFAULT',
    });
  });

  it('seeds the DEFAULT profile configuration and DISABLED provisioning', () => {
    expect(createDeviceProfileConfiguration(DeviceProfileType.DEFAULT)).toEqual({
      type: 'DEFAULT',
    });
    expect(createDeviceProfileConfiguration(DeviceProfileType.SNMP)).toEqual({ type: 'SNMP' });
    expect(createDeviceProvisionConfiguration()).toEqual({
      type: DeviceProvisionType.DISABLED,
    });
    expect(DeviceProfileType.DEFAULT).toBe('DEFAULT');
  });
});
