/**
 * System settings → Trendz page (M14 wave-2, spec 6.3-8, ui-ngx
 * trendz-settings parity).
 *
 * One settings card, three fields: enable switch, Trendz URL (required +
 * URL pattern only while enabled) and the API key (trimmed on save).
 *
 * Wire contract (contract #22): GET of an unconfigured tenant answers an
 * EMPTY OBJECT (never 404); the POST response echoes the request body.
 *
 * Global state bit (ui-ngx dispatches ActionAuthUpdateTrendzSettings after
 * save): antd has NO trendz menu/entry consumer (R29 — registering one is
 * out of scope), so the minimal equivalent stores the saved settings in the
 * login state (initialState.trendzSettings) for future consumers.
 */
import { useMutation, useQuery } from '@tanstack/react-query';
import { useModel } from '@umijs/max';
import { App, Checkbox, Form, Input } from 'antd';
import type { Rule } from 'antd/es/form';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import SettingsCard from '@/components/settings/SettingsCard';
import type { TrendzSettings } from '@/services/tb/trendz';
import { getTrendzSettings, saveTrendzSettings } from '@/services/tb/trendz';

/** ui-ngx trendz-settings URL pattern (verbatim). */
const TRENDZ_URL_PATTERN = /^(https?:\/\/)[^\s/$.?#].[^\s]*$/i;
/** ui-ngx apiKey pattern (verbatim): no whitespace. */
const API_KEY_PATTERN = /^\S+$/;

interface TrendzFormValues {
  isTrendzEnabled: boolean;
  trendzUrl?: string;
  apiKey?: string;
}

function toFormValue(settings: TrendzSettings | undefined): TrendzFormValues {
  return {
    isTrendzEnabled: settings?.enabled ?? false,
    trendzUrl: settings?.baseUrl,
    apiKey: settings?.apiKey,
  };
}

export default function SettingsTrendzPage() {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const { setInitialState } = useModel('@@initialState');

  const trendzQuery = useQuery({
    queryKey: ['settings', 'trendz'],
    queryFn: getTrendzSettings,
  });
  const snapshot = trendzQuery.data;

  const [form] = Form.useForm<TrendzFormValues>();
  const [dirty, setDirty] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const enabled = Form.useWatch('isTrendzEnabled', form);

  useEffect(() => {
    if (trendzQuery.isSuccess) {
      form.setFieldsValue(toFormValue(snapshot));
      setDirty(false);
    }
  }, [snapshot, trendzQuery.isSuccess, form]);

  const trendzSave = useMutation({
    mutationFn: (values: TrendzFormValues) => {
      const body: TrendzSettings = {
        enabled: values.isTrendzEnabled,
        baseUrl: values.trendzUrl,
        apiKey: values.apiKey?.trim(),
      };
      return saveTrendzSettings(body);
    },
    onSuccess: (saved) => {
      // The response echoes the request body — refill from it (ngx
      // setTrendzSettings(savedSettings) parity).
      form.setFieldsValue(toFormValue(saved));
      setDirty(false);
      // Minimal global-state equivalent (R29): store the bit in the login
      // state. There is no menu consumer to drive today.
      setInitialState((prev) => ({ ...prev, trendzSettings: saved }));
      void message.success(
        formatMessage({
          id: 'pages.settings.trendz.toastSaved',
          defaultMessage: 'Trendz settings saved.',
        }),
      );
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

  const urlRules: Array<Rule> = [
    ...(enabled
      ? [
          {
            required: true,
            message: formatMessage({
              id: 'pages.settings.trendz.urlRequired',
              defaultMessage: 'Trendz URL is required.',
            }),
          },
        ]
      : []),
    {
      pattern: TRENDZ_URL_PATTERN,
      message: formatMessage({
        id: 'pages.settings.trendz.urlPatternError',
        defaultMessage: 'Trendz URL is invalid.',
      }),
    },
  ];

  return (
    <SettingsCard
      title={formatMessage({
        id: 'pages.settings.trendz.title',
        defaultMessage: 'Trendz settings',
      })}
      loading={trendzQuery.isPending}
      dirty={dirty}
      invalid={invalid}
      saving={trendzSave.isPending}
      onUndo={() => {
        form.setFieldsValue(toFormValue(snapshot));
        setDirty(false);
      }}
      onSave={() => form.submit()}
    >
      <Form<TrendzFormValues>
        form={form}
        layout="vertical"
        initialValues={{ isTrendzEnabled: false }}
        onValuesChange={() => setDirty(true)}
        onFieldsChange={(_, allFields) =>
          setInvalid(allFields.some((field) => (field.errors ?? []).length > 0))
        }
        onFinish={(values) => trendzSave.mutate(values)}
      >
        <Form.Item
          name="isTrendzEnabled"
          valuePropName="checked"
          label={formatMessage({
            id: 'pages.settings.trendz.enable',
            defaultMessage: 'Enable Trendz',
          })}
        >
          <Checkbox />
        </Form.Item>
        <Form.Item
          name="trendzUrl"
          label={formatMessage({
            id: 'pages.settings.trendz.url',
            defaultMessage: 'Trendz URL',
          })}
          rules={urlRules}
        >
          <Input placeholder="http://localhost:8888" />
        </Form.Item>
        <Form.Item
          name="apiKey"
          label={formatMessage({
            id: 'pages.settings.trendz.apiKey',
            defaultMessage: 'Trendz API key',
          })}
          rules={[
            {
              pattern: API_KEY_PATTERN,
              message: formatMessage({
                id: 'pages.settings.trendz.apiKeyPatternError',
                defaultMessage: 'Trendz API key must not contain whitespace.',
              }),
            },
          ]}
        >
          <Input />
        </Form.Item>
      </Form>
    </SettingsCard>
  );
}
