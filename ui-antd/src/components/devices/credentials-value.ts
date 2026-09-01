/**
 * Device-credentials form mapping.
 *
 * The wire shape is DeviceCredentials { credentialsType, credentialsId,
 * credentialsValue } where `credentialsValue` is a JSON string for
 * MQTT_BASIC and the PEM text for X509 (device-credentials.component.ts in
 * ui-ngx does the same parse/format dance in its CVAs). This module owns
 * the one place where the form value turns into the wire payload and back,
 * so the wizard and the credentials dialog cannot drift apart.
 */
import {
  type DeviceCredentialMqttBasic,
  type DeviceCredentials,
  DeviceCredentialsType,
  type DeviceTransportType,
} from '@/types/tb';

// BaseData['id'] is required by the wire type but absent when creating;
// callers merge onto a loaded entity for updates. Server-assigned fields
// stay undefined on the create path (undefined keys drop at serialization).
type DeviceCredentialsDraft = Omit<
  DeviceCredentials,
  'id' | 'deviceId' | 'createdTime'
> & {
  id: DeviceCredentials['id'] | undefined;
  deviceId: DeviceCredentials['deviceId'] | undefined;
  createdTime: DeviceCredentials['createdTime'] | undefined;
};

/** Form value shared by the wizard step and the credentials dialog. */
export interface DeviceCredentialsFormValue {
  credentialsType: DeviceCredentialsType;
  /** ACCESS_TOKEN only. */
  credentialsId?: string;
  /** MQTT_BASIC (parsed object) or X509 (PEM text) depending on the type. */
  credentialsValue?: string | DeviceCredentialMqttBasic;
}

const TOKEN_MAX_LENGTH = 32;

/** Which credential types a transport admits (credentialTypesByTransportType). */
export function credentialTypesForTransport(
  transportType: DeviceTransportType | undefined,
): DeviceCredentialsType[] {
  switch (transportType) {
    case 'COAP':
      return [
        DeviceCredentialsType.ACCESS_TOKEN,
        DeviceCredentialsType.X509_CERTIFICATE,
      ];
    case 'LWM2M':
      return [DeviceCredentialsType.LWM2M_CREDENTIALS];
    case 'SNMP':
      return [DeviceCredentialsType.ACCESS_TOKEN];
    default:
      return [
        DeviceCredentialsType.ACCESS_TOKEN,
        DeviceCredentialsType.X509_CERTIFICATE,
        DeviceCredentialsType.MQTT_BASIC,
      ];
  }
}

/** ui-ngx generateSecret parity: base-36 chunks concatenated to length. */
export function generateSecret(length = 20): string {
  const chunk = Math.random()
    .toString(36)
    .slice(2, 2 + Math.min(length, 10));
  return chunk.length >= length
    ? chunk
    : chunk.concat(generateSecret(length - chunk.length));
}

export function isValidAccessToken(token: string | undefined): boolean {
  return !!token && token.length >= 1 && token.length <= TOKEN_MAX_LENGTH;
}

export function isMqttBasicValid(
  value: DeviceCredentialMqttBasic | undefined,
): boolean {
  // At least one of clientId / userName must be present (ui-ngx validator).
  return !!value && (!!value.clientId || !!value.userName);
}

/** Wire credentials -> form value (parses the MQTT JSON string). */
export function credentialsToFormValue(
  credentials: DeviceCredentials,
): DeviceCredentialsFormValue {
  let parsedValue: DeviceCredentialsFormValue['credentialsValue'];
  if (
    credentials.credentialsType === DeviceCredentialsType.MQTT_BASIC &&
    credentials.credentialsValue
  ) {
    try {
      parsedValue = JSON.parse(
        credentials.credentialsValue,
      ) as DeviceCredentialMqttBasic;
    } catch {
      parsedValue = { clientId: '', userName: '', password: '' };
    }
  } else if (
    credentials.credentialsType === DeviceCredentialsType.X509_CERTIFICATE
  ) {
    parsedValue = credentials.credentialsValue ?? '';
  }
  return {
    credentialsType: credentials.credentialsType,
    credentialsId: credentials.credentialsId ?? '',
    credentialsValue: parsedValue,
  };
}

/**
 * Form value -> wire DeviceCredentials (MQTT object serialized to JSON).
 * `base` is the loaded credentials entity when editing (its id/version ride
 * along for the update), or undefined when creating (wizard path, backend
 * assigns both).
 */
export function formValueToCredentials(
  value: DeviceCredentialsFormValue,
  base?: DeviceCredentials,
): DeviceCredentials {
  let credentialsId: string | undefined;
  let credentialsValue: string | undefined;
  switch (value.credentialsType) {
    case DeviceCredentialsType.ACCESS_TOKEN:
      credentialsId = value.credentialsId;
      break;
    case DeviceCredentialsType.MQTT_BASIC:
      credentialsValue = JSON.stringify(
        value.credentialsValue ?? {
          clientId: '',
          userName: '',
          password: '',
        },
      );
      break;
    case DeviceCredentialsType.X509_CERTIFICATE:
    case DeviceCredentialsType.LWM2M_CREDENTIALS:
      credentialsValue =
        typeof value.credentialsValue === 'string'
          ? value.credentialsValue
          : '';
      break;
  }
  const draft: DeviceCredentialsDraft = {
    id: base?.id,
    createdTime: base?.createdTime,
    deviceId: base?.deviceId,
    version: base?.version,
    credentialsType: value.credentialsType,
    credentialsId,
    credentialsValue,
  };
  // Creating (wizard path) omits the server-assigned identity — undefined
  // keys drop at serialization and the backend mints them.
  return draft as DeviceCredentials;
}

/**
 * Regenerate the secret part of a form value ("reset credentials"):
 * a fresh token, fresh MQTT user/password (clientId kept), or nothing for
 * certificate types (certificates cannot be minted client-side).
 */
export function regenerateFormSecret(
  value: DeviceCredentialsFormValue,
): DeviceCredentialsFormValue {
  switch (value.credentialsType) {
    case DeviceCredentialsType.ACCESS_TOKEN:
      return { ...value, credentialsId: generateSecret(20) };
    case DeviceCredentialsType.MQTT_BASIC: {
      const current =
        typeof value.credentialsValue === 'object' && value.credentialsValue
          ? value.credentialsValue
          : { clientId: '', userName: '', password: '' };
      return {
        ...value,
        credentialsValue: {
          clientId: current.clientId,
          userName: generateSecret(20),
          password: generateSecret(20),
        },
      };
    }
    default:
      return value;
  }
}

/** Human key for the copyable fields of a credentials form value. */
export function credentialCopyEntries(
  value: DeviceCredentialsFormValue,
): Array<{ key: string; text: string }> {
  switch (value.credentialsType) {
    case DeviceCredentialsType.ACCESS_TOKEN:
      return value.credentialsId
        ? [{ key: 'accessToken', text: value.credentialsId }]
        : [];
    case DeviceCredentialsType.MQTT_BASIC: {
      const mqtt =
        typeof value.credentialsValue === 'object' && value.credentialsValue
          ? value.credentialsValue
          : undefined;
      return mqtt
        ? [
            { key: 'clientId', text: mqtt.clientId },
            { key: 'userName', text: mqtt.userName },
            { key: 'password', text: mqtt.password },
          ].filter((entry) => entry.text)
        : [];
    }
    case DeviceCredentialsType.X509_CERTIFICATE:
      return typeof value.credentialsValue === 'string' &&
        value.credentialsValue
        ? [{ key: 'certPem', text: value.credentialsValue }]
        : [];
    default:
      return [];
  }
}
