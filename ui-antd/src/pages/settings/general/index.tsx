/**
 * System settings → General page (spec 3.7, ui-ngx general-settings parity).
 *
 * Two independently saved settings buckets (ui-ngx saves per card):
 *   - key `general`: baseUrl (required) + prohibitDifferentUrl switch;
 *   - key `connectivity`: the six device-connectivity rows grouped into
 *     three protocol tabs (HTTP(s)/MQTT(s)/COAP(s)) — each row is
 *     {enabled, host, port(1..65535)} and its host/port unlock with the
 *     enable switch (empty host/port fall back to protocol defaults
 *     server-side, per the ui-ngx hint).
 *
 * Save merges the form over the server jsonValue snapshot (only the
 * payload fields travel; the AdminSettings envelope is preserved).
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  App,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Segmented,
  Switch,
  Typography,
} from 'antd';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import SettingsCard from '@/components/settings/SettingsCard';
import { getAdminSettings, saveAdminSettings } from '@/services/tb/admin';
import type {
  AdminSettings,
  DeviceConnectivityInfo,
  DeviceConnectivityProtocol,
  GeneralSettings,
} from '@/types/tb/admin';

type GeneralFormValues = GeneralSettings;
type ConnectivityFormValues = Record<
  DeviceConnectivityProtocol,
  DeviceConnectivityInfo
>;

interface ProtocolGroup {
  key: 'http' | 'mqtt' | 'coap';
  plain: DeviceConnectivityProtocol;
  secure: DeviceConnectivityProtocol;
}

const PROTOCOL_GROUPS: Array<ProtocolGroup> = [
  { key: 'http', plain: 'http', secure: 'https' },
  { key: 'mqtt', plain: 'mqtt', secure: 'mqtts' },
  { key: 'coap', plain: 'coap', secure: 'coaps' },
];

export default function SettingsGeneralPage() {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();

  // ---- card 1: general bucket
  const generalQuery = useQuery({
    queryKey: ['settings', 'general'],
    queryFn: () => getAdminSettings<GeneralSettings>('general'),
  });
  const generalSnapshot = generalQuery.data;
  const [generalForm] = Form.useForm<GeneralFormValues>();
  const [generalDirty, setGeneralDirty] = useState(false);
  const [generalInvalid, setGeneralInvalid] = useState(false);

  useEffect(() => {
    if (generalSnapshot) {
      generalForm.setFieldsValue(
        generalSnapshot.jsonValue as GeneralFormValues,
      );
      setGeneralDirty(false);
    }
  }, [generalSnapshot, generalForm]);

  const generalSave = useMutation({
    mutationFn: (values: GeneralFormValues) => {
      const body: AdminSettings<GeneralSettings> = {
        key: 'general',
        jsonValue: { ...generalSnapshot?.jsonValue, ...values },
      };
      return saveAdminSettings<GeneralSettings>(body);
    },
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.settings.general.toastSaved',
          defaultMessage: 'General settings saved.',
        }),
      );
      setGeneralDirty(false);
      void generalQuery.refetch();
    },
    onError: () => {
      void message.error(
        formatMessage({
          id: 'pages.settings.common.saveFailed',
          defaultMessage: 'Failed to save the settings.',
        }),
      );
    },
  });

  // ---- card 2: connectivity bucket
  const connectivityQuery = useQuery({
    queryKey: ['settings', 'connectivity'],
    queryFn: () => getAdminSettings<ConnectivityFormValues>('connectivity'),
  });
  const connectivitySnapshot = connectivityQuery.data;
  const [connectivityForm] = Form.useForm<ConnectivityFormValues>();
  const [connectivityDirty, setConnectivityDirty] = useState(false);
  const [protocolGroup, setProtocolGroup] =
    useState<ProtocolGroup['key']>('http');

  useEffect(() => {
    if (connectivitySnapshot) {
      connectivityForm.setFieldsValue(connectivitySnapshot.jsonValue);
      setConnectivityDirty(false);
    }
  }, [connectivitySnapshot, connectivityForm]);

  const connectivitySave = useMutation({
    mutationFn: (values: ConnectivityFormValues) => {
      const body: AdminSettings<ConnectivityFormValues> = {
        key: 'connectivity',
        jsonValue: { ...connectivitySnapshot?.jsonValue, ...values },
      };
      return saveAdminSettings<ConnectivityFormValues>(body);
    },
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.settings.general.toastConnectivitySaved',
          defaultMessage: 'Device connectivity settings saved.',
        }),
      );
      setConnectivityDirty(false);
      void connectivityQuery.refetch();
    },
    onError: () => {
      void message.error(
        formatMessage({
          id: 'pages.settings.common.saveFailed',
          defaultMessage: 'Failed to save the settings.',
        }),
      );
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <SettingsCard
        title={formatMessage({
          id: 'pages.settings.general.generalTitle',
          defaultMessage: 'General settings',
        })}
        loading={generalQuery.isPending}
        dirty={generalDirty}
        invalid={generalInvalid}
        saving={generalSave.isPending}
        onUndo={() => {
          if (generalSnapshot) {
            generalForm.setFieldsValue(
              generalSnapshot.jsonValue as GeneralFormValues,
            );
          }
          setGeneralDirty(false);
        }}
        onSave={() => generalForm.submit()}
      >
        <Form<GeneralFormValues>
          form={generalForm}
          layout="vertical"
          onValuesChange={() => setGeneralDirty(true)}
          onFieldsChange={(_, allFields) =>
            setGeneralInvalid(
              allFields.some((field) => (field.errors ?? []).length > 0),
            )
          }
          onFinish={(values) => generalSave.mutate(values)}
        >
          <Form.Item
            name="baseUrl"
            label={formatMessage({
              id: 'pages.settings.general.baseUrl',
              defaultMessage: 'Base URL',
            })}
            rules={[
              {
                required: true,
                message: formatMessage({
                  id: 'pages.settings.general.baseUrlRequired',
                  defaultMessage: 'Base URL is required.',
                }),
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="prohibitDifferentUrl"
            label={formatMessage({
              id: 'pages.settings.general.prohibitDifferentUrl',
              defaultMessage: 'Prohibit hostname from client request headers',
            })}
            valuePropName="checked"
            tooltip={formatMessage({
              id: 'pages.settings.general.prohibitDifferentUrlHint',
              defaultMessage:
                'This setting should be enabled in production. Disabling it may lead to security issues.',
            })}
          >
            <Switch />
          </Form.Item>
        </Form>
      </SettingsCard>

      <SettingsCard
        title={formatMessage({
          id: 'pages.settings.general.connectivityTitle',
          defaultMessage: 'Device connectivity',
        })}
        loading={connectivityQuery.isPending}
        dirty={connectivityDirty}
        invalid={false}
        saving={connectivitySave.isPending}
        onUndo={() => {
          if (connectivitySnapshot) {
            connectivityForm.setFieldsValue(connectivitySnapshot.jsonValue);
          }
          setConnectivityDirty(false);
        }}
        onSave={() => connectivityForm.submit()}
      >
        <Row className="mb-4">
          <Col>
            <Segmented<ProtocolGroup['key']>
              value={protocolGroup}
              onChange={(value) => setProtocolGroup(value)}
              options={PROTOCOL_GROUPS.map((group) => ({
                label: formatMessage({
                  id: `pages.settings.general.group.${group.key}`,
                  defaultMessage: `${group.key.toUpperCase()}(s)`,
                }),
                value: group.key,
              }))}
            />
          </Col>
        </Row>
        <Typography.Text type="secondary" className="mb-4 block">
          {formatMessage({
            id: 'pages.settings.general.connectivityHint',
            defaultMessage:
              'If the host or port fields are empty, the default protocol values will be used.',
          })}
        </Typography.Text>
        <Form<ConnectivityFormValues>
          form={connectivityForm}
          layout="vertical"
          onValuesChange={() => setConnectivityDirty(true)}
          onFinish={(values) => connectivitySave.mutate(values)}
        >
          {PROTOCOL_GROUPS.filter((group) => group.key === protocolGroup)
            .flatMap((group) => [group.plain, group.secure])
            .map((protocol) => (
              <ConnectivityBlock key={protocol} protocol={protocol} />
            ))}
        </Form>
      </SettingsCard>
    </div>
  );
}

/** One protocol row: enable switch + host/port that unlock with it. */
function ConnectivityBlock({
  protocol,
}: {
  protocol: DeviceConnectivityProtocol;
}) {
  const { formatMessage } = useIntl();
  const enabled = Form.useWatch([protocol, 'enabled']) as boolean | undefined;
  const labelId = `pages.settings.general.protocol.${protocol}`;
  return (
    <Card
      size="small"
      title={formatMessage({ id: labelId, defaultMessage: protocol })}
      className="mb-4"
    >
      <Form.Item
        name={[protocol, 'enabled']}
        valuePropName="checked"
        className="mb-2"
      >
        <Switch />
      </Form.Item>
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            name={[protocol, 'host']}
            label={formatMessage({
              id: 'pages.settings.general.host',
              defaultMessage: 'Host',
            })}
            className="mb-2"
          >
            <Input disabled={!enabled} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            name={[protocol, 'port']}
            label={formatMessage({
              id: 'pages.settings.general.port',
              defaultMessage: 'Port',
            })}
            className="mb-0"
            rules={[
              {
                type: 'number',
                min: 1,
                max: 65535,
                message: formatMessage({
                  id: 'pages.settings.general.portRange',
                  defaultMessage: 'Port should be in the range 1 to 65535.',
                }),
              },
            ]}
          >
            <InputNumber
              min={1}
              max={65535}
              precision={0}
              className="w-full"
              disabled={!enabled}
            />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );
}
