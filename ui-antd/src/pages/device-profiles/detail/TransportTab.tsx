/**
 * Device-profile Transport-configuration tab (ui-ngx device-profile-tabs
 * transport slot). Self-contained edit surface: the transport type select
 * plus the per-family configuration form, one save button — the tab merges
 * its slice into the profile and posts the FULL entity. Switching the
 * transport type rebuilds the form from the factory defaults (ui-ngx
 * deviceProfileTransportTypeChanged parity).
 *
 * Delivery scope (M1 complex-editor precedent, registered in the report):
 *   DEFAULT  — no fields (ui-ngx parity)
 *   MQTT     — full: topic filters (+ wildcard validation), Sparkplug
 *              branch, payload type JSON/Protobuf incl. compatibility
 *              switches and the four proto schemas, send-ack switch
 *   COAP     — full: device type, payload type, proto schemas, power
 *              saving mode (ms number inputs instead of the unit picker)
 *   SNMP     — timeout/retries fields; the communication mapping table is
 *              an editable-JSON round-trip (deep editor = v2)
 *   LWM2M    — object/observe configuration as an editable-JSON round-trip
 *              (deep editor = v2)
 */
import { EditOutlined, SaveOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Checkbox,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Typography,
} from 'antd';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import { saveDeviceProfile } from '@/services/tb/device-profile';
import { DeviceTransportType } from '@/types/tb/device';
import {
  CoapPowerMode,
  CoapTransportDeviceType,
  type DeviceProfile,
  type DeviceProfileTransportConfiguration,
  TransportPayloadType,
  type TransportPayloadTypeConfiguration,
} from '@/types/tb/device-profile';
import { createDeviceProfileTransportConfiguration } from '../transport-defaults';

interface TransportFormValues {
  telemetryTopic?: string;
  attributesTopic?: string;
  attributesSubscribeTopic?: string;
  sparkplug?: boolean;
  sparkplugMetricNames?: Array<string>;
  sendAck?: boolean;
  payloadType?: TransportPayloadType;
  compatJson?: boolean;
  useJsonDownlink?: boolean;
  protoTelemetry?: string;
  protoAttributes?: string;
  protoRpcRequest?: string;
  protoRpcResponse?: string;
  coapDeviceType?: CoapTransportDeviceType;
  coapPayloadType?: TransportPayloadType;
  powerMode?: CoapPowerMode;
  edrxCycle?: number;
  pagingTransmissionWindow?: number;
  psmActivityTimer?: number;
  snmpTimeoutMs?: number;
  snmpRetries?: number;
  communicationConfigsJson?: string;
  lwm2mJson?: string;
}

const payloadTypeOptions = (
  Object.values(TransportPayloadType) as Array<TransportPayloadType>
).map((value) => ({ value, label: value }));

export default function TransportTab({ profile }: { profile: DeviceProfile }) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<TransportFormValues>();
  const [editing, setEditing] = useState(false);
  const [type, setType] = useState<DeviceTransportType>(profile.transportType);

  const serverConfig =
    profile.profileData?.transportConfiguration ??
    createDeviceProfileTransportConfiguration(profile.transportType);
  const config =
    type === profile.transportType
      ? serverConfig
      : createDeviceProfileTransportConfiguration(type);
  const initialValues = useMemo(
    () => toFormValues(config, type),
    [config, type],
  );
  const values = Form.useWatch([], form);
  const dirty = editing && !!values && isTransportDirty(values, initialValues);

  const saveMutation = useMutation({
    mutationFn: (formValues: TransportFormValues) =>
      saveDeviceProfile(toSavePayload(formValues, type, profile)),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.device-profiles.detail.toastSaved',
          defaultMessage: 'Device profile saved.',
        }),
      );
      setEditing(false);
      void queryClient.invalidateQueries({
        queryKey: ['device-profile', 'detail'],
      });
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const exitEdit = () => {
    setEditing(false);
    setType(profile.transportType);
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-56">
          <Select<DeviceTransportType>
            value={type}
            disabled={!editing || saveMutation.isPending}
            onChange={(next) => setType(next)}
            style={{ width: '100%' }}
            options={(
              Object.values(DeviceTransportType) as Array<DeviceTransportType>
            ).map((value) => ({
              label: formatMessage({
                id: `pages.device-profiles.transport.${value}`,
                defaultMessage: value,
              }),
              value,
            }))}
          />
        </div>
        {transportTypeHint(formatMessage, type)}
        <div className="flex-1" />
        {!editing && (
          <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>
            {formatMessage({
              id: 'pages.device-profiles.detail.edit',
              defaultMessage: 'Edit',
            })}
          </Button>
        )}
        {editing && (
          <Space>
            <Button onClick={exitEdit}>
              {formatMessage({
                id: 'pages.device-profiles.detail.cancelEdit',
                defaultMessage: 'Cancel edit',
              })}
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saveMutation.isPending}
              disabled={!dirty}
              onClick={() => form.submit()}
            >
              {formatMessage({
                id: 'pages.device-profiles.detail.save',
                defaultMessage: 'Save',
              })}
            </Button>
          </Space>
        )}
      </div>

      {editing && type !== profile.transportType && (
        <Alert
          type="warning"
          showIcon
          title={formatMessage({
            id: 'pages.device-profiles.detail.transportChangeWarning',
            defaultMessage:
              'Changing the transport type rebuilds the configuration with factory defaults.',
          })}
        />
      )}

      <Form<TransportFormValues>
        key={`${type}-${JSON.stringify(initialValues)}`}
        form={form}
        layout="vertical"
        disabled={!editing || saveMutation.isPending}
        onFinish={(next) => saveMutation.mutate(next)}
        initialValues={initialValues}
      >
        {type === 'DEFAULT' && (
          <Typography.Text type="secondary">
            {formatMessage({
              id: 'pages.device-profiles.detail.transportDefaultEmpty',
              defaultMessage:
                'The default transport supports basic MQTT, HTTP and CoAP and has no extra settings.',
            })}
          </Typography.Text>
        )}

        {type === 'MQTT' && (
          <>
            <Form.Item name="sparkplug" valuePropName="checked">
              <Checkbox>
                {formatMessage({
                  id: 'pages.device-profiles.transport.mqttSparkplug',
                  defaultMessage:
                    'MQTT Sparkplug B Edge of Network (EoN) node.',
                })}
              </Checkbox>
            </Form.Item>
            {values?.sparkplug ? (
              <Form.Item
                name="sparkplugMetricNames"
                label={formatMessage({
                  id: 'pages.device-profiles.transport.mqttSparkplugMetricNames',
                  defaultMessage: 'SparkPlug metrics to store as attributes.',
                })}
              >
                <Select
                  mode="tags"
                  open={false}
                  tokenSeparators={[',']}
                  placeholder={formatMessage({
                    id: 'pages.device-profiles.transport.mqttSparkplugMetricNames',
                    defaultMessage: 'SparkPlug metrics to store as attributes.',
                  })}
                />
              </Form.Item>
            ) : (
              <>
                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name="telemetryTopic"
                      label={formatMessage({
                        id: 'pages.device-profiles.transport.telemetryTopicFilter',
                        defaultMessage: 'Telemetry topic filter',
                      })}
                      rules={[
                        { required: true },
                        { validator: validateMqttTopic },
                      ]}
                    >
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name="attributesTopic"
                      label={formatMessage({
                        id: 'pages.device-profiles.transport.attributesTopicFilter',
                        defaultMessage: 'Attributes publish topic filter',
                      })}
                      rules={[
                        { required: true },
                        { validator: validateMqttTopic },
                      ]}
                    >
                      <Input />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name="attributesSubscribeTopic"
                      label={formatMessage({
                        id: 'pages.device-profiles.transport.attributesSubscribeTopicFilter',
                        defaultMessage: 'Attributes subscribe topic filter',
                      })}
                      rules={[
                        { required: true },
                        { validator: validateMqttTopic },
                      ]}
                    >
                      <Input />
                    </Form.Item>
                  </Col>
                </Row>
                <Typography.Text type="secondary" className="block">
                  {formatMessage({
                    id: 'pages.device-profiles.transport.mqttWildcardsHint',
                    defaultMessage:
                      'Supports single-level [+] and multi-level [#] wildcards.',
                  })}
                </Typography.Text>
                <fieldset className="mt-4 rounded border border-solid border-gray-200 p-3">
                  <legend className="px-1">
                    {formatMessage({
                      id: 'pages.device-profiles.transport.mqttPayloadType',
                      defaultMessage: 'MQTT device payload',
                    })}
                  </legend>
                  <Form.Item name="payloadType">
                    <Select options={payloadTypeOptions} />
                  </Form.Item>
                  {values?.payloadType === TransportPayloadType.PROTOBUF && (
                    <>
                      <Form.Item name="compatJson" valuePropName="checked">
                        <Checkbox>
                          {formatMessage({
                            id: 'pages.device-profiles.transport.mqttCompatJson',
                            defaultMessage:
                              'Enable compatibility with other payload formats.',
                          })}
                        </Checkbox>
                      </Form.Item>
                      {values?.compatJson && (
                        <Form.Item
                          name="useJsonDownlink"
                          valuePropName="checked"
                        >
                          <Checkbox>
                            {formatMessage({
                              id: 'pages.device-profiles.transport.mqttJsonDownlink',
                              defaultMessage:
                                'Use JSON format for default downlink topics',
                            })}
                          </Checkbox>
                        </Form.Item>
                      )}
                      <ProtoSchemaFields />
                    </>
                  )}
                </fieldset>
                <Form.Item
                  name="sendAck"
                  valuePropName="checked"
                  className="mt-3"
                >
                  <Checkbox>
                    {formatMessage({
                      id: 'pages.device-profiles.transport.mqttSendAck',
                      defaultMessage:
                        'Send PUBACK on the failed validation of the PUBLISH message',
                    })}
                  </Checkbox>
                </Form.Item>
              </>
            )}
          </>
        )}

        {type === 'COAP' && (
          <>
            <Form.Item
              name="coapDeviceType"
              label={formatMessage({
                id: 'pages.device-profiles.transport.coapDeviceType',
                defaultMessage: 'CoAP device type',
              })}
            >
              <Select
                options={[
                  {
                    label: formatMessage({
                      id: 'pages.device-profiles.transport.coapTypeDefault',
                      defaultMessage: 'Default',
                    }),
                    value: CoapTransportDeviceType.DEFAULT,
                  },
                  {
                    label: formatMessage({
                      id: 'pages.device-profiles.transport.coapTypeEfento',
                      defaultMessage: 'Efento NB-IoT',
                    }),
                    value: CoapTransportDeviceType.EFENTO,
                  },
                ]}
              />
            </Form.Item>
            {values?.coapDeviceType === CoapTransportDeviceType.DEFAULT && (
              <>
                <Form.Item
                  name="coapPayloadType"
                  label={formatMessage({
                    id: 'pages.device-profiles.transport.coapPayloadType',
                    defaultMessage: 'CoAP device payload',
                  })}
                >
                  <Select options={payloadTypeOptions} />
                </Form.Item>
                {values?.coapPayloadType === TransportPayloadType.PROTOBUF && (
                  <ProtoSchemaFields />
                )}
              </>
            )}
            <fieldset className="mt-2 rounded border border-solid border-gray-200 p-3">
              <legend className="px-1">
                {formatMessage({
                  id: 'pages.device-profiles.transport.powerSavingMode',
                  defaultMessage: 'Power saving mode',
                })}
              </legend>
              <Form.Item name="powerMode">
                <Select
                  allowClear
                  options={(
                    Object.values(CoapPowerMode) as Array<CoapPowerMode>
                  ).map((value) => ({ label: value, value }))}
                />
              </Form.Item>
              {values?.powerMode === CoapPowerMode.E_DRX && (
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="edrxCycle"
                      label={formatMessage({
                        id: 'pages.device-profiles.transport.edrxCycle',
                        defaultMessage: 'eDRX cycle (ms)',
                      })}
                      rules={[{ required: true }]}
                    >
                      <InputNumber min={5120} className="w-full" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="pagingTransmissionWindow"
                      label={formatMessage({
                        id: 'pages.device-profiles.transport.pagingTransmissionWindow',
                        defaultMessage: 'Paging transmission window (ms)',
                      })}
                      rules={[{ required: true }]}
                    >
                      <InputNumber min={1280} className="w-full" />
                    </Form.Item>
                  </Col>
                </Row>
              )}
              {values?.powerMode === CoapPowerMode.PSM && (
                <Form.Item
                  name="psmActivityTimer"
                  label={formatMessage({
                    id: 'pages.device-profiles.transport.psmActivityTimer',
                    defaultMessage: 'PSM activity timer (ms)',
                  })}
                  rules={[{ required: true }]}
                >
                  <InputNumber min={1280} className="w-full" />
                </Form.Item>
              )}
            </fieldset>
          </>
        )}

        {type === 'SNMP' && (
          <>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name="snmpTimeoutMs"
                  label={formatMessage({
                    id: 'pages.device-profiles.transport.snmpTimeoutMs',
                    defaultMessage: 'Timeout (ms)',
                  })}
                  rules={[{ required: true }]}
                >
                  <InputNumber min={0} className="w-full" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name="snmpRetries"
                  label={formatMessage({
                    id: 'pages.device-profiles.transport.snmpRetries',
                    defaultMessage: 'Retries',
                  })}
                  rules={[{ required: true }]}
                >
                  <InputNumber min={0} precision={0} className="w-full" />
                </Form.Item>
              </Col>
            </Row>
            <JsonFallbackField
              name="communicationConfigsJson"
              label={formatMessage({
                id: 'pages.device-profiles.transport.snmpCommunicationConfigs',
                defaultMessage:
                  'Communication configs (JSON) — the mapping table editor ships with v2.',
              })}
            />
          </>
        )}

        {type === 'LWM2M' && (
          <>
            <Typography.Text type="secondary" className="block pb-2">
              {formatMessage({
                id: 'pages.device-profiles.transport.lwm2mLeftover',
                defaultMessage:
                  'The LWM2M object/observe configuration editor ships with v2; the stored configuration round-trips as JSON.',
              })}
            </Typography.Text>
            <JsonFallbackField
              name="lwm2mJson"
              label={formatMessage({
                id: 'pages.device-profiles.transport.lwm2mConfigurationJson',
                defaultMessage: 'LWM2M configuration (JSON)',
              })}
            />
          </>
        )}
      </Form>
      {saveMutation.isError && (
        <Typography.Text type="danger">
          {serverErrorText(saveMutation.error)}
        </Typography.Text>
      )}
    </div>
  );
}

/** The four proto schema textareas (ui-ngx tb-protobuf-content port). */
function ProtoSchemaFields() {
  const { formatMessage } = useIntl();
  const field = (
    name: keyof TransportFormValues,
    id: string,
    label: string,
  ) => (
    <Form.Item
      key={name}
      name={name}
      label={formatMessage({ id, defaultMessage: label })}
      rules={[
        {
          required: true,
          message: formatMessage({
            id: 'pages.device-profiles.transport.protoSchemaRequired',
            defaultMessage: 'Proto schema is required.',
          }),
        },
      ]}
    >
      <Input.TextArea rows={4} className="font-mono" />
    </Form.Item>
  );
  return (
    <>
      {field(
        'protoTelemetry',
        'pages.device-profiles.transport.telemetryProtoSchema',
        'Telemetry proto schema',
      )}
      {field(
        'protoAttributes',
        'pages.device-profiles.transport.attributesProtoSchema',
        'Attributes proto schema',
      )}
      {field(
        'protoRpcRequest',
        'pages.device-profiles.transport.rpcRequestProtoSchema',
        'RPC request proto schema',
      )}
      {field(
        'protoRpcResponse',
        'pages.device-profiles.transport.rpcResponseProtoSchema',
        'RPC response proto schema',
      )}
    </>
  );
}

/** Editable-JSON round-trip for configuration slices without a form UI. */
function JsonFallbackField({
  name,
  label,
}: {
  name: 'communicationConfigsJson' | 'lwm2mJson';
  label: string;
}) {
  return (
    <Form.Item
      name={name}
      label={label}
      rules={[
        {
          validator: (_rule, value: string) => {
            if (!value) {
              return Promise.resolve();
            }
            try {
              JSON.parse(value);
              return Promise.resolve();
            } catch {
              return Promise.reject(new Error('Invalid JSON'));
            }
          },
        },
      ]}
    >
      <Input.TextArea rows={6} className="font-mono" />
    </Form.Item>
  );
}

/** MQTT topic-filter validation: '+' only as a whole level, '#' only last. */
function validateMqttTopic(
  _rule: unknown,
  value: string | undefined,
): Promise<void> {
  const text = (value ?? '').trim();
  if (!text) {
    return Promise.resolve(); // the required rule reports the empty case
  }
  const levels = text.split('/');
  const invalidPlus = levels.some(
    (level) => level.includes('+') && level !== '+',
  );
  const invalidHash = levels.some(
    (level, index) =>
      level.includes('#') && !(level === '#' && index === levels.length - 1),
  );
  return invalidPlus || invalidHash
    ? Promise.reject(new Error('Invalid topic filter'))
    : Promise.resolve();
}

function transportTypeHint(
  formatMessage: ReturnType<typeof useIntl>['formatMessage'],
  type: DeviceTransportType,
): React.ReactNode {
  const hints: Partial<
    Record<DeviceTransportType, { id: string; defaultMessage: string }>
  > = {
    DEFAULT: {
      id: 'pages.device-profiles.transport.DEFAULTHint',
      defaultMessage: 'Supports basic MQTT, HTTP and CoAP transport',
    },
    MQTT: {
      id: 'pages.device-profiles.transport.MQTTHint',
      defaultMessage: 'Enable advanced MQTT transport settings',
    },
    COAP: {
      id: 'pages.device-profiles.transport.COAPHint',
      defaultMessage: 'Enable advanced CoAP transport settings',
    },
    LWM2M: {
      id: 'pages.device-profiles.transport.LWM2MHint',
      defaultMessage: 'LWM2M transport type',
    },
    SNMP: {
      id: 'pages.device-profiles.transport.SNMPHint',
      defaultMessage: 'Specify SNMP transport configuration',
    },
  };
  const hint = hints[type];
  if (!hint) {
    return null;
  }
  return (
    <Typography.Text type="secondary">{formatMessage(hint)}</Typography.Text>
  );
}

/** Flatten the wire configuration into form values. */
function toFormValues(
  config: DeviceProfileTransportConfiguration,
  type: DeviceTransportType,
): TransportFormValues {
  const mqttPayload = config.transportPayloadTypeConfiguration;
  const coap = config.coapDeviceTypeConfiguration;
  const clientSettings = config.clientSettings;
  const base: TransportFormValues = {
    sparkplug: false,
    payloadType: TransportPayloadType.JSON,
    coapDeviceType: CoapTransportDeviceType.DEFAULT,
    coapPayloadType: TransportPayloadType.JSON,
    powerMode: CoapPowerMode.DRX,
  };
  if (type === 'MQTT') {
    return {
      ...base,
      telemetryTopic: config.deviceTelemetryTopic,
      attributesTopic: config.deviceAttributesTopic,
      attributesSubscribeTopic: config.deviceAttributesSubscribeTopic,
      sparkplug: config.sparkplug ?? false,
      sparkplugMetricNames: config.sparkplugAttributesMetricNames,
      sendAck: config.sendAckOnValidationException ?? false,
      payloadType:
        mqttPayload?.transportPayloadType ?? TransportPayloadType.JSON,
      compatJson:
        mqttPayload?.enableCompatibilityWithJsonPayloadFormat ?? false,
      useJsonDownlink:
        mqttPayload?.useJsonPayloadFormatForDefaultDownlinkTopics ?? false,
      protoTelemetry: mqttPayload?.deviceTelemetryProtoSchema,
      protoAttributes: mqttPayload?.deviceAttributesProtoSchema,
      protoRpcRequest: mqttPayload?.deviceRpcRequestProtoSchema,
      protoRpcResponse: mqttPayload?.deviceRpcResponseProtoSchema,
    };
  }
  if (type === 'COAP') {
    return {
      ...base,
      coapDeviceType: coap?.coapDeviceType ?? CoapTransportDeviceType.DEFAULT,
      coapPayloadType:
        coap?.transportPayloadTypeConfiguration?.transportPayloadType ??
        TransportPayloadType.JSON,
      protoTelemetry:
        coap?.transportPayloadTypeConfiguration?.deviceTelemetryProtoSchema,
      protoAttributes:
        coap?.transportPayloadTypeConfiguration?.deviceAttributesProtoSchema,
      protoRpcRequest:
        coap?.transportPayloadTypeConfiguration?.deviceRpcRequestProtoSchema,
      protoRpcResponse:
        coap?.transportPayloadTypeConfiguration?.deviceRpcResponseProtoSchema,
      powerMode: clientSettings?.powerMode ?? CoapPowerMode.DRX,
      edrxCycle: clientSettings?.edrxCycle,
      pagingTransmissionWindow: clientSettings?.pagingTransmissionWindow,
      psmActivityTimer: clientSettings?.psmActivityTimer,
    };
  }
  if (type === 'SNMP') {
    return {
      ...base,
      snmpTimeoutMs:
        typeof config.timeoutMs === 'number' ? config.timeoutMs : 500,
      snmpRetries: typeof config.retries === 'number' ? config.retries : 0,
      communicationConfigsJson: config.communicationConfigs
        ? JSON.stringify(config.communicationConfigs, null, 2)
        : '',
    };
  }
  if (type === 'LWM2M') {
    const { type: _wireType, ...rest } = config;
    void _wireType;
    return {
      ...base,
      lwm2mJson: Object.keys(rest).length ? JSON.stringify(rest, null, 2) : '',
    };
  }
  return base;
}

/** Dirty = the serialized form values differ from the baseline. */
function isTransportDirty(
  values: TransportFormValues,
  baseline: TransportFormValues,
): boolean {
  return JSON.stringify(values) !== JSON.stringify(baseline);
}

/** Build the wire transport configuration from the form values. */
function toSavePayload(
  values: TransportFormValues,
  type: DeviceTransportType,
  profile: DeviceProfile,
): DeviceProfile {
  const previous =
    profile.profileData?.transportConfiguration ??
    createDeviceProfileTransportConfiguration(type);
  let configuration: DeviceProfileTransportConfiguration;
  switch (type) {
    case 'MQTT':
      configuration = {
        ...previous,
        type,
        sparkplug: values.sparkplug ?? false,
      };
      if (values.sparkplug) {
        configuration.sparkplugAttributesMetricNames =
          values.sparkplugMetricNames;
      } else {
        configuration.deviceTelemetryTopic = values.telemetryTopic?.trim();
        configuration.deviceAttributesTopic = values.attributesTopic?.trim();
        configuration.deviceAttributesSubscribeTopic =
          values.attributesSubscribeTopic?.trim();
        configuration.transportPayloadTypeConfiguration = payloadConfig(
          values,
          previous.transportPayloadTypeConfiguration,
        );
        configuration.sendAckOnValidationException = values.sendAck ?? false;
      }
      break;
    case 'COAP':
      configuration = {
        ...previous,
        type,
        coapDeviceTypeConfiguration: {
          ...(previous.coapDeviceTypeConfiguration ?? {}),
          coapDeviceType: values.coapDeviceType,
          ...(values.coapDeviceType === CoapTransportDeviceType.DEFAULT
            ? {
                transportPayloadTypeConfiguration: payloadConfig(
                  { ...values, payloadType: values.coapPayloadType },
                  previous.coapDeviceTypeConfiguration
                    ?.transportPayloadTypeConfiguration,
                ),
              }
            : {}),
        },
        clientSettings: {
          ...(previous.clientSettings ?? {}),
          powerMode: values.powerMode ?? null,
          edrxCycle:
            values.powerMode === CoapPowerMode.E_DRX
              ? values.edrxCycle
              : undefined,
          pagingTransmissionWindow:
            values.powerMode === CoapPowerMode.E_DRX
              ? values.pagingTransmissionWindow
              : undefined,
          psmActivityTimer:
            values.powerMode === CoapPowerMode.PSM
              ? values.psmActivityTimer
              : undefined,
        },
      };
      break;
    case 'SNMP':
      configuration = {
        ...previous,
        type,
        timeoutMs: values.snmpTimeoutMs,
        retries: values.snmpRetries,
        communicationConfigs: values.communicationConfigsJson
          ? JSON.parse(values.communicationConfigsJson)
          : null,
      };
      break;
    case 'LWM2M': {
      const parsed = values.lwm2mJson
        ? (JSON.parse(values.lwm2mJson) as Record<string, unknown>)
        : {};
      configuration = { ...parsed, type };
      break;
    }
    default:
      configuration = { type: DeviceTransportType.DEFAULT };
      break;
  }
  return {
    ...profile,
    transportType: type,
    profileData: {
      ...profile.profileData,
      transportConfiguration: configuration,
    },
  };
}

/** Merge the payload-type block, preserving unknown server-side keys. */
function payloadConfig(
  values: TransportFormValues,
  previousPayload?: TransportPayloadTypeConfiguration,
): TransportPayloadTypeConfiguration {
  const payload: TransportPayloadTypeConfiguration = {
    ...(previousPayload ?? {}),
    transportPayloadType: values.payloadType,
    enableCompatibilityWithJsonPayloadFormat: values.compatJson ?? false,
    useJsonPayloadFormatForDefaultDownlinkTopics:
      values.useJsonDownlink ?? false,
  };
  if (values.payloadType === TransportPayloadType.PROTOBUF) {
    payload.deviceTelemetryProtoSchema = values.protoTelemetry;
    payload.deviceAttributesProtoSchema = values.protoAttributes;
    payload.deviceRpcRequestProtoSchema = values.protoRpcRequest;
    payload.deviceRpcResponseProtoSchema = values.protoRpcResponse;
  }
  return payload;
}
