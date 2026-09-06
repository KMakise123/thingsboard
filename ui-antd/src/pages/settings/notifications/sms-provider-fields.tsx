/**
 * SMS-provider sub-forms (M14 wave-3, R25, ui-ngx sms-provider-configuration
 * + aws-sns/twilio/smpp parity). Bound to the PARENT form with flat field
 * paths; `type` switches the active sub-form (AWS_SNS / TWILIO / SMPP —
 * no smtp type, pinned by spec 6.3-3). The SMPP advanced groups fold into
 * a Collapse like the ngx mat-expansion-panels.
 */
import { Col, Collapse, Form, Input, InputNumber, Row, Select } from 'antd';
import { useIntl } from 'react-intl';
import { PHONE_NUMBER_PATTERN_TWILIO, SMS_PROVIDER_TYPES } from './data';

const PROVIDER_TYPE_LABEL_KEYS: Record<string, string> = {
  AWS_SNS: 'pages.settings.notifications.provider.awsSns',
  TWILIO: 'pages.settings.notifications.provider.twilio',
  SMPP: 'pages.settings.notifications.provider.smpp',
};

export const SMPP_VERSIONS = ['3.3', '3.4'] as const;

export const SMPP_BIND_TYPES = ['TX', 'RX', 'TRX'] as const;

/** ngx typeOfNumberMap — value pairs (label key, wire number). */
const SMPP_TON_OPTIONS: Array<{ value: number; key: string }> = [
  { value: 0, key: 'unknown' },
  { value: 1, key: 'international' },
  { value: 2, key: 'national' },
  { value: 3, key: 'networkSpecific' },
  { value: 4, key: 'subscriberNumber' },
  { value: 5, key: 'alphanumeric' },
  { value: 6, key: 'abbreviated' },
];

/** ngx numberingPlanIdentificationMap. */
const SMPP_NPI_OPTIONS: Array<{ value: number; key: string }> = [
  { value: 0, key: 'unknown' },
  { value: 1, key: 'isdn' },
  { value: 3, key: 'dataNumberingPlan' },
  { value: 4, key: 'telexNumberingPlan' },
  { value: 5, key: 'landMobile' },
  { value: 8, key: 'nationalNumberingPlan' },
  { value: 9, key: 'privateNumberingPlan' },
  { value: 10, key: 'ermesNumberingPlan' },
  { value: 13, key: 'internet' },
  { value: 18, key: 'wapClientId' },
];

/** ngx codingSchemesMap. */
const SMPP_CODING_SCHEMES: Array<{ value: number; key: string }> = [
  { value: 0, key: 'smsc' },
  { value: 1, key: 'ia5' },
  { value: 2, key: 'octetUnspecified2' },
  { value: 3, key: 'latin1' },
  { value: 4, key: 'octetUnspecified4' },
  { value: 5, key: 'jis' },
  { value: 6, key: 'cyrillic' },
  { value: 7, key: 'latinHebrew' },
  { value: 8, key: 'ucs2Utf16' },
  { value: 9, key: 'pictogramEncoding' },
  { value: 10, key: 'musicCodes' },
  { value: 13, key: 'extendedKanjiJis' },
  { value: 14, key: 'koreanGraphicCharacterSet' },
];

export function SmsProviderFields() {
  const { formatMessage } = useIntl();
  const type = Form.useWatch('type') as
    | (typeof SMS_PROVIDER_TYPES)[number]
    | undefined;
  const msg = (
    id: string,
    defaultMessage: string,
  ): { required: boolean; message: string } => ({
    required: true,
    message: formatMessage({ id, defaultMessage }),
  });

  return (
    <div className="flex flex-col gap-4">
      <Form.Item
        name="type"
        label={formatMessage({
          id: 'pages.settings.notifications.smsProviderType',
          defaultMessage: 'SMS provider type',
        })}
        rules={[
          msg(
            'pages.settings.notifications.smsProviderTypeRequired',
            'SMS provider type is required.',
          ),
        ]}
      >
        <Select
          options={SMS_PROVIDER_TYPES.map((value) => ({
            value,
            label: formatMessage({
              id: PROVIDER_TYPE_LABEL_KEYS[value],
              defaultMessage: value,
            }),
          }))}
        />
      </Form.Item>

      {type === 'AWS_SNS' && (
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              name="accessKeyId"
              label={formatMessage({
                id: 'pages.settings.notifications.aws.accessKeyId',
                defaultMessage: 'AWS Access Key ID',
              })}
              rules={[
                msg(
                  'pages.settings.notifications.aws.accessKeyIdRequired',
                  'AWS Access Key ID is required',
                ),
              ]}
            >
              <Input autoComplete="off" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="secretAccessKey"
              label={formatMessage({
                id: 'pages.settings.notifications.aws.secretAccessKey',
                defaultMessage: 'AWS Secret Access Key',
              })}
              rules={[
                msg(
                  'pages.settings.notifications.aws.secretAccessKeyRequired',
                  'AWS Secret Access Key is required',
                ),
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="region"
              label={formatMessage({
                id: 'pages.settings.notifications.aws.region',
                defaultMessage: 'AWS Region',
              })}
              rules={[
                msg(
                  'pages.settings.notifications.aws.regionRequired',
                  'AWS Region is required',
                ),
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
        </Row>
      )}

      {type === 'TWILIO' && (
        <Row gutter={16}>
          <Col xs={24} md={8}>
            <Form.Item
              name="numberFrom"
              label={formatMessage({
                id: 'pages.settings.notifications.twilio.numberFrom',
                defaultMessage: 'Phone Number From',
              })}
              extra={formatMessage({
                id: 'pages.settings.notifications.twilio.numberFromHint',
                defaultMessage:
                  "Phone Number in E.164 format/Phone Number's SID/Messaging Service SID, ex. +19995550123/PNXXX/MGXXX",
              })}
              rules={[
                msg(
                  'pages.settings.notifications.twilio.numberFromRequired',
                  'Phone Number From is required.',
                ),
                {
                  pattern: PHONE_NUMBER_PATTERN_TWILIO,
                  message: formatMessage({
                    id: 'pages.settings.notifications.twilio.numberFromPattern',
                    defaultMessage:
                      "Invalid phone number. Should be in E.164 format/Phone Number's SID/Messaging Service SID, ex. +19995550123/PNXXX/MGXXX.",
                  }),
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="accountSid"
              label={formatMessage({
                id: 'pages.settings.notifications.twilio.accountSid',
                defaultMessage: 'Twilio Account SID',
              })}
              rules={[
                msg(
                  'pages.settings.notifications.twilio.accountSidRequired',
                  'Twilio Account SID is required',
                ),
              ]}
            >
              <Input autoComplete="off" />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name="accountToken"
              label={formatMessage({
                id: 'pages.settings.notifications.twilio.accountToken',
                defaultMessage: 'Twilio Account Token',
              })}
              rules={[
                msg(
                  'pages.settings.notifications.twilio.accountTokenRequired',
                  'Twilio Account Token is required',
                ),
              ]}
            >
              <Input.Password autoComplete="new-password" />
            </Form.Item>
          </Col>
        </Row>
      )}

      {type === 'SMPP' && <SmppFields />}
    </div>
  );
}

function SmppFields() {
  const { formatMessage } = useIntl();
  const msg = (
    id: string,
    defaultMessage: string,
  ): { required: boolean; message: string } => ({
    required: true,
    message: formatMessage({ id, defaultMessage }),
  });
  const tonOptions = SMPP_TON_OPTIONS.map((option) => ({
    value: option.value,
    label: formatMessage({
      id: `pages.settings.notifications.smpp.ton.${option.key}`,
      defaultMessage: String(option.value),
    }),
  }));
  const npiOptions = SMPP_NPI_OPTIONS.map((option) => ({
    value: option.value,
    label: formatMessage({
      id: `pages.settings.notifications.smpp.npi.${option.key}`,
      defaultMessage: String(option.value),
    }),
  }));
  const schemeOptions = SMPP_CODING_SCHEMES.map((option) => ({
    value: option.value,
    label: formatMessage({
      id: `pages.settings.notifications.smpp.scheme.${option.key}`,
      defaultMessage: String(option.value),
    }),
  }));

  return (
    <div className="flex flex-col gap-4">
      <Row gutter={16}>
        <Col xs={24} md={6}>
          <Form.Item
            name="protocolVersion"
            label={formatMessage({
              id: 'pages.settings.notifications.smpp.version',
              defaultMessage: 'SMPP version',
            })}
            rules={[
              msg(
                'pages.settings.notifications.smpp.versionRequired',
                'SMPP version is required',
              ),
            ]}
          >
            <Select options={SMPP_VERSIONS.map((value) => ({ value }))} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="host"
            label={formatMessage({
              id: 'pages.settings.notifications.smpp.host',
              defaultMessage: 'SMPP host',
            })}
            rules={[
              msg(
                'pages.settings.notifications.smpp.hostRequired',
                'SMPP host is required',
              ),
            ]}
          >
            <Input />
          </Form.Item>
        </Col>
        <Col xs={24} md={6}>
          <Form.Item
            name="port"
            label={formatMessage({
              id: 'pages.settings.notifications.smpp.port',
              defaultMessage: 'SMPP port',
            })}
            rules={[
              msg(
                'pages.settings.notifications.smpp.portRequired',
                'SMPP port is required',
              ),
            ]}
          >
            <InputNumber className="w-full" precision={0} min={1} />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            name="systemId"
            label={formatMessage({
              id: 'pages.settings.notifications.smpp.systemId',
              defaultMessage: 'System ID',
            })}
            rules={[
              msg(
                'pages.settings.notifications.smpp.systemIdRequired',
                'System ID is required',
              ),
            ]}
          >
            <Input autoComplete="off" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name="password"
            label={formatMessage({
              id: 'pages.settings.notifications.smpp.password',
              defaultMessage: 'Password',
            })}
            rules={[
              msg(
                'pages.settings.notifications.smpp.passwordRequired',
                'Password is required',
              ),
            ]}
          >
            <Input.Password autoComplete="new-password" />
          </Form.Item>
        </Col>
      </Row>
      <Collapse
        className="mb-2"
        items={[
          {
            key: 'type',
            label: formatMessage({
              id: 'pages.settings.notifications.smpp.group.typeSettings',
              defaultMessage: 'Type settings',
            }),
            children: (
              <>
                <Form.Item
                  name="systemType"
                  label={formatMessage({
                    id: 'pages.settings.notifications.smpp.systemType',
                    defaultMessage: 'System type',
                  })}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name="bindType"
                  label={formatMessage({
                    id: 'pages.settings.notifications.smpp.bindType',
                    defaultMessage: 'Bind type',
                  })}
                >
                  <Select
                    options={SMPP_BIND_TYPES.map((value) => ({
                      value,
                      label: formatMessage({
                        id: `pages.settings.notifications.smpp.bind.${value.toLowerCase()}`,
                        defaultMessage: value,
                      }),
                    }))}
                  />
                </Form.Item>
                <Form.Item
                  name="serviceType"
                  label={formatMessage({
                    id: 'pages.settings.notifications.smpp.serviceType',
                    defaultMessage: 'Service type',
                  })}
                >
                  <Input />
                </Form.Item>
              </>
            ),
          },
          {
            key: 'source',
            label: formatMessage({
              id: 'pages.settings.notifications.smpp.group.sourceSettings',
              defaultMessage: 'Source settings',
            }),
            children: (
              <>
                <Form.Item
                  name="sourceAddress"
                  label={formatMessage({
                    id: 'pages.settings.notifications.smpp.sourceAddress',
                    defaultMessage: 'Source address',
                  })}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name="sourceTon"
                  label={formatMessage({
                    id: 'pages.settings.notifications.smpp.sourceTon',
                    defaultMessage: 'Source TON',
                  })}
                >
                  <Select options={tonOptions} />
                </Form.Item>
                <Form.Item
                  name="sourceNpi"
                  label={formatMessage({
                    id: 'pages.settings.notifications.smpp.sourceNpi',
                    defaultMessage: 'Source NPI',
                  })}
                >
                  <Select options={npiOptions} />
                </Form.Item>
              </>
            ),
          },
          {
            key: 'destination',
            label: formatMessage({
              id: 'pages.settings.notifications.smpp.group.destinationSettings',
              defaultMessage: 'Destination settings',
            }),
            children: (
              <>
                <Form.Item
                  name="destinationTon"
                  label={formatMessage({
                    id: 'pages.settings.notifications.smpp.destinationTon',
                    defaultMessage: 'Destination TON (Type of Number)',
                  })}
                >
                  <Select options={tonOptions} />
                </Form.Item>
                <Form.Item
                  name="destinationNpi"
                  label={formatMessage({
                    id: 'pages.settings.notifications.smpp.destinationNpi',
                    defaultMessage:
                      'Destination NPI (Numbering Plan Identification)',
                  })}
                >
                  <Select options={npiOptions} />
                </Form.Item>
              </>
            ),
          },
          {
            key: 'additional',
            label: formatMessage({
              id: 'pages.settings.notifications.smpp.group.additionalSettings',
              defaultMessage: 'Additional settings',
            }),
            children: (
              <>
                <Form.Item
                  name="addressRange"
                  label={formatMessage({
                    id: 'pages.settings.notifications.smpp.addressRange',
                    defaultMessage: 'Address range',
                  })}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  name="codingScheme"
                  label={formatMessage({
                    id: 'pages.settings.notifications.smpp.codingScheme',
                    defaultMessage: 'Coding scheme',
                  })}
                >
                  <Select options={schemeOptions} />
                </Form.Item>
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
