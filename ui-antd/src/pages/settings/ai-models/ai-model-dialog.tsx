/**
 * AI-model add/edit dialog (M14 wave-3, R27, ngx ai-model-dialog parity,
 * ~860px). Field sets are DRIVEN BY AI_MODEL_PROVIDER_MAP:
 *   - provider switch resets modelId + config fields and re-seeds the
 *     OPENAI base URL default;
 *   - OPENAI baseUrl special case — a non-official base makes the API key
 *     optional (isOpenAiApiKeyOptional);
 *   - OLLAMA carries the NONE/BASIC/TOKEN auth segment with conditional
 *     username/password/token fields;
 *   - modelId is a searchable select over the static candidate list, free
 *     input when the provider has none;
 *   - sampling rows render from the modelFieldsList whitelist.
 *
 * The title distinguishes add vs edit (an upstream ngx quirk keeps one
 * generic title — deliberately not replicated). "Check connectivity" works
 * with UNSAVED form values and is disabled while the form is invalid.
 */

import { InfoCircleOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  App,
  AutoComplete,
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Segmented,
  Select,
  Tooltip,
} from 'antd';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import { saveAiModel } from '@/services/tb/ai-model';
import type {
  AiModel,
  AiModelField,
  AiProviderField,
  OllamaAuthType,
} from '@/types/tb/ai-model';
import { AI_MODEL_PROVIDER_MAP } from '@/types/tb/ai-model';
import CheckConnectivityDialog from './check-connectivity';
import {
  AI_MODEL_FIELD_CONSTRAINTS,
  AI_MODEL_FIELD_HINT_KEYS,
  AI_MODEL_FIELD_LABEL_KEYS,
  AI_PROVIDER_FIELD_LABEL_KEYS,
  AI_PROVIDER_LABEL_KEYS,
  AI_PROVIDERS,
  type AiModelFormValues,
  isOpenAiApiKeyOptional,
  OPENAI_OFFICIAL_BASE_URL,
  toAiModelFormValue,
  toAiModelPayload,
} from './data';

const OLLAMA_AUTH_TYPES: Array<OllamaAuthType> = ['NONE', 'BASIC', 'TOKEN'];

const OLLAMA_AUTH_LABEL_KEYS: Record<OllamaAuthType, string> = {
  NONE: 'pages.aiModels.authType.none',
  BASIC: 'pages.aiModels.authType.basic',
  TOKEN: 'pages.aiModels.authType.token',
};

export interface AiModelDialogProps {
  open: boolean;
  /** Present = edit mode (title + payload echo the stored row). */
  model?: AiModel | null;
  onClose: () => void;
}

export default function AiModelDialog({
  open,
  model,
  onClose,
}: AiModelDialogProps) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<AiModelFormValues>();
  const [invalid, setInvalid] = useState(false);
  const [connectivityOpen, setConnectivityOpen] = useState(false);
  /** Validated UNSAVED form values for the connectivity probe. */
  const [connectivityFormValues, setConnectivityFormValues] =
    useState<AiModelFormValues>();

  const provider = Form.useWatch('provider', form) as
    | AiModelFormValues['provider']
    | undefined;
  const baseUrl = Form.useWatch('baseUrl', form) as string | undefined;
  const authType = Form.useWatch('authType', form) as
    | OllamaAuthType
    | undefined;

  const activeProvider = provider ?? 'OPENAI';
  const whitelist = AI_MODEL_PROVIDER_MAP[activeProvider];
  const apiKeyOptional =
    activeProvider === 'OPENAI' && isOpenAiApiKeyOptional(baseUrl);

  useEffect(() => {
    if (open) {
      form.setFieldsValue(toAiModelFormValue(model));
      setInvalid(false);
    }
  }, [open, model, form]);

  const saveMutation = useMutation({
    mutationFn: (values: AiModelFormValues) =>
      saveAiModel(toAiModelPayload(values, model)),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.aiModels.toastSaved',
          defaultMessage: 'AI model saved.',
        }),
      );
      void queryClient.invalidateQueries({ queryKey: ['ai-models'] });
      onClose();
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  const label = (id: string, defaultMessage: string) =>
    formatMessage({ id, defaultMessage });
  const msg = (id: string, defaultMessage: string) => ({
    required: true,
    message: label(id, defaultMessage),
  });
  const nonBlank = (id: string, defaultMessage: string) => ({
    pattern: /\S/,
    message: label(id, defaultMessage),
  });

  /** The providerConfig field row for one whitelist entry. */
  const providerFieldRow = (field: AiProviderField) => {
    const name = field as keyof AiModelFormValues;
    const labelId = AI_PROVIDER_FIELD_LABEL_KEYS[field];
    const requiredByDefault = field !== 'baseUrl' && field !== 'serviceVersion';
    const apiKeyRule =
      field === 'apiKey' && apiKeyOptional
        ? []
        : [
            nonBlank(
              'pages.aiModels.fields.apiKeyRequired',
              'API key is required.',
            ),
          ];
    const rules =
      field === 'apiKey'
        ? apiKeyRule
        : requiredByDefault
          ? [
              msg(
                `pages.aiModels.fields.${field}Required`,
                `${field} is required.`,
              ),
            ]
          : [];
    return (
      <Form.Item
        key={field}
        name={name as string}
        label={label(labelId, field)}
        rules={rules}
      >
        {field === 'serviceAccountKey' || field === 'secretAccessKey' ? (
          <Input.TextArea rows={2} />
        ) : (
          <Input autoComplete="off" />
        )}
      </Form.Item>
    );
  };

  const modelFieldRow = (field: AiModelField) => {
    const constraints = AI_MODEL_FIELD_CONSTRAINTS[field];
    return (
      <Form.Item
        key={field}
        name={field as keyof AiModelFormValues as string}
        label={
          <span className="inline-flex items-center gap-1">
            {label(AI_MODEL_FIELD_LABEL_KEYS[field as never], field)}
            <Tooltip
              title={label(AI_MODEL_FIELD_HINT_KEYS[field as never], field)}
            >
              <InfoCircleOutlined className="text-[rgba(0,0,0,0.45)]" />
            </Tooltip>
          </span>
        }
        rules={[
          ...(constraints.min !== undefined
            ? [
                {
                  type: 'number' as const,
                  min: constraints.min,
                  message: label(
                    'pages.aiModels.fieldMin',
                    'Must be greater than or equal to the minimum.',
                  ),
                },
              ]
            : []),
          ...(constraints.max !== undefined
            ? [
                {
                  type: 'number' as const,
                  max: constraints.max,
                  message: label(
                    'pages.aiModels.fieldMax',
                    'Must be less than or equal to the maximum.',
                  ),
                },
              ]
            : []),
        ]}
      >
        <InputNumber
          className="w-full"
          min={constraints.min}
          max={constraints.max}
        />
      </Form.Item>
    );
  };

  return (
    <Modal
      open={open}
      title={
        model
          ? label('pages.aiModels.editModel', 'Edit AI model')
          : label('pages.aiModels.addModel', 'Add model')
      }
      width={860}
      okText={formatMessage({
        id: 'pages.settings.common.save',
        defaultMessage: 'Save',
      })}
      cancelText={formatMessage({
        id: 'pages.common.cancel',
        defaultMessage: 'Cancel',
      })}
      confirmLoading={saveMutation.isPending}
      onOk={() => {
        void form
          .validateFields()
          .then((values) => saveMutation.mutate(values))
          .catch(() => {
            // Field errors render on the inputs themselves.
          });
      }}
      onCancel={onClose}
      destroyOnHidden
    >
      <Form<AiModelFormValues> form={form} layout="vertical">
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name="name"
              label={label('pages.aiModels.fields.name', 'Name')}
              rules={[
                msg('pages.aiModels.fields.nameRequired', 'Name is required.'),
                nonBlank(
                  'pages.aiModels.fields.nameRequired',
                  'Name is required.',
                ),
              ]}
            >
              <Input autoComplete="off" maxLength={255} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name="provider"
              label={label('pages.aiModels.fields.aiProvider', 'AI provider')}
              rules={[
                msg(
                  'pages.aiModels.fields.aiProviderRequired',
                  'AI provider is required.',
                ),
              ]}
            >
              <Select
                options={AI_PROVIDERS.map((value) => ({
                  value,
                  label: label(AI_PROVIDER_LABEL_KEYS[value], value),
                }))}
                onChange={(nextProvider: AiModelFormValues['provider']) => {
                  // ngx parity: switching provider resets the model + config
                  // and re-seeds the OPENAI base URL default.
                  form.setFieldsValue({
                    modelId: '',
                    apiKey: undefined,
                    personalAccessToken: undefined,
                    projectId: undefined,
                    location: undefined,
                    serviceAccountKey: undefined,
                    fileName: undefined,
                    endpoint: undefined,
                    serviceVersion: undefined,
                    region: undefined,
                    accessKeyId: undefined,
                    secretAccessKey: undefined,
                    baseUrl:
                      nextProvider === 'OPENAI'
                        ? OPENAI_OFFICIAL_BASE_URL
                        : undefined,
                    authType: 'NONE',
                    authUsername: undefined,
                    authPassword: undefined,
                    authToken: undefined,
                  });
                }}
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          {whitelist.providerFieldsList.map((field) => (
            <Col key={field} xs={24} md={12}>
              {providerFieldRow(field)}
            </Col>
          ))}
        </Row>

        {activeProvider === 'OLLAMA' && (
          <>
            <Form.Item
              name="authType"
              label={label('pages.aiModels.authentication', 'Authentication')}
            >
              <Segmented
                options={OLLAMA_AUTH_TYPES.map((value) => ({
                  value,
                  label: label(OLLAMA_AUTH_LABEL_KEYS[value], value),
                }))}
                onChange={() => {
                  form.setFieldsValue({
                    authUsername: undefined,
                    authPassword: undefined,
                    authToken: undefined,
                  });
                }}
              />
            </Form.Item>
            {authType === 'BASIC' && (
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="authUsername"
                    label={label('pages.aiModels.fields.username', 'Username')}
                    rules={[
                      msg(
                        'pages.aiModels.fields.usernameRequired',
                        'Username is required.',
                      ),
                    ]}
                  >
                    <Input autoComplete="off" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="authPassword"
                    label={label('pages.aiModels.fields.password', 'Password')}
                    rules={[
                      msg(
                        'pages.aiModels.fields.passwordRequired',
                        'Password is required.',
                      ),
                    ]}
                  >
                    <Input.Password autoComplete="new-password" />
                  </Form.Item>
                </Col>
              </Row>
            )}
            {authType === 'TOKEN' && (
              <Form.Item
                name="authToken"
                label={label('pages.aiModels.fields.token', 'Token')}
                rules={[
                  msg(
                    'pages.aiModels.fields.tokenRequired',
                    'Token is required.',
                  ),
                ]}
              >
                <Input.Password autoComplete="new-password" />
              </Form.Item>
            )}
          </>
        )}

        <Form.Item
          name="modelId"
          label={label('pages.aiModels.fields.modelId', 'Model ID')}
          rules={[
            msg(
              'pages.aiModels.fields.modelIdRequired',
              'Model ID is required.',
            ),
          ]}
          extra={
            whitelist.modelList.length === 0
              ? label(
                  'pages.aiModels.modelIdFreeInput',
                  'This provider has no static candidate list — type the model ID.',
                )
              : undefined
          }
        >
          {whitelist.modelList.length > 0 ? (
            <Select
              showSearch
              options={whitelist.modelList.map((value) => ({ value }))}
            />
          ) : (
            <AutoComplete />
          )}
        </Form.Item>

        <Row gutter={16}>
          {whitelist.modelFieldsList.map((field) => (
            <Col key={field} xs={24} md={12}>
              {modelFieldRow(field)}
            </Col>
          ))}
        </Row>
      </Form>

      <div className="flex items-center justify-end gap-2">
        <Button
          disabled={invalid}
          onClick={() => {
            void form
              .validateFields()
              .then((values) => {
                setConnectivityFormValues(values);
                setConnectivityOpen(true);
              })
              .catch(() => {
                // Field errors render on the inputs themselves.
              });
          }}
        >
          {label('pages.aiModels.checkConnectivity', 'Check connectivity')}
        </Button>
      </div>

      <CheckConnectivityDialog
        open={connectivityOpen}
        configuration={
          connectivityFormValues
            ? toAiModelPayload(connectivityFormValues, model).configuration
            : undefined
        }
        onClose={() => setConnectivityOpen(false)}
      />
    </Modal>
  );
}
