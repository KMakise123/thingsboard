/**
 * Add/edit attribute dialog (SERVER_SCOPE / SHARED_SCOPE only — CLIENT scope
 * and latest telemetry are read-only device-side data, mirroring ui-ngx's
 * isClientSideTelemetryType guard).
 *
 * Value editing supports the four wire kinds (string / number / boolean /
 * JSON) with the initial kind detected from the current value.
 */
import { Form, Input, Modal, Select, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import {
  type AttributeValueKind,
  detectValueKind,
  formatAttributeValue,
  parseAttributeValue,
} from './attribute-value';

export interface AttributeValueModalProps {
  open: boolean;
  /** Null = create; otherwise the attribute being edited. */
  initial: { key: string; value: unknown } | null;
  onClose: () => void;
  onCommit: (key: string, value: unknown) => Promise<void>;
}

interface DialogFormValues {
  key: string;
  kind: AttributeValueKind;
  raw: string;
}

export default function AttributeValueModal({
  open,
  initial,
  onClose,
  onCommit,
}: AttributeValueModalProps) {
  const { formatMessage } = useIntl();
  const [form] = Form.useForm<DialogFormValues>();
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const kind = Form.useWatch('kind', form) ?? 'string';

  useEffect(() => {
    if (!open) {
      return;
    }
    setServerError(null);
    form.setFieldsValue({
      key: initial?.key ?? '',
      kind: initial ? detectValueKind(initial.value) : 'string',
      raw: initial ? formatAttributeValue(initial.value) : '',
    });
  }, [open, initial, form]);

  const commit = async (values: DialogFormValues) => {
    setSaving(true);
    try {
      await onCommit(
        values.key.trim(),
        parseAttributeValue(values.raw, values.kind),
      );
      onClose();
    } catch (commitError) {
      setServerError(String(commitError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={
        initial
          ? formatMessage(
              {
                id: 'pages.devices.detail.attrEditTitle',
                defaultMessage: 'Edit attribute: {key}',
              },
              { key: initial.key },
            )
          : formatMessage({
              id: 'pages.devices.detail.attrAddTitle',
              defaultMessage: 'Add attribute',
            })
      }
      onOk={() => form.submit()}
      onCancel={onClose}
      confirmLoading={saving}
      okText={formatMessage({
        id: 'pages.devices.detail.save',
        defaultMessage: 'Save',
      })}
      cancelText={formatMessage({
        id: 'pages.devices.detail.cancel',
        defaultMessage: 'Cancel',
      })}
      destroyOnHidden
    >
      <Form<DialogFormValues>
        form={form}
        layout="vertical"
        className="pt-2"
        onFinish={(values) => void commit(values)}
      >
        <Form.Item
          name="key"
          label={formatMessage({
            id: 'pages.devices.detail.attrKey',
            defaultMessage: 'Key',
          })}
          rules={[
            {
              required: true,
              whitespace: true,
              message: formatMessage({
                id: 'pages.devices.detail.attrKeyRequired',
                defaultMessage: 'Key is required.',
              }),
            },
          ]}
        >
          <Input disabled={!!initial} />
        </Form.Item>
        <Form.Item
          name="kind"
          label={formatMessage({
            id: 'pages.devices.detail.attrValueType',
            defaultMessage: 'Value type',
          })}
        >
          <Select
            options={[
              {
                value: 'string',
                label: formatMessage({
                  id: 'pages.devices.detail.attrTypeString',
                  defaultMessage: 'String',
                }),
              },
              {
                value: 'number',
                label: formatMessage({
                  id: 'pages.devices.detail.attrTypeNumber',
                  defaultMessage: 'Number',
                }),
              },
              {
                value: 'boolean',
                label: formatMessage({
                  id: 'pages.devices.detail.attrTypeBoolean',
                  defaultMessage: 'Boolean',
                }),
              },
              {
                value: 'json',
                label: formatMessage({
                  id: 'pages.devices.detail.attrTypeJson',
                  defaultMessage: 'JSON',
                }),
              },
            ]}
          />
        </Form.Item>
        <Form.Item
          name="raw"
          label={formatMessage({
            id: 'pages.devices.detail.attrValue',
            defaultMessage: 'Value',
          })}
          rules={[
            ({ getFieldValue }) => ({
              validator(_rule, value: string) {
                const selected = getFieldValue(
                  'kind',
                ) as DialogFormValues['kind'];
                if (selected === 'number' && Number.isNaN(Number(value))) {
                  return Promise.reject(
                    new Error(
                      formatMessage({
                        id: 'pages.devices.detail.attrValueInvalidNumber',
                        defaultMessage: 'Value must be a number.',
                      }),
                    ),
                  );
                }
                if (selected === 'json') {
                  try {
                    JSON.parse(value);
                  } catch {
                    return Promise.reject(
                      new Error(
                        formatMessage({
                          id: 'pages.devices.detail.attrValueInvalidJson',
                          defaultMessage: 'Value must be valid JSON.',
                        }),
                      ),
                    );
                  }
                }
                return Promise.resolve();
              },
            }),
          ]}
        >
          {kind === 'boolean' ? (
            <Select
              options={[
                { value: 'true', label: 'true' },
                { value: 'false', label: 'false' },
              ]}
            />
          ) : kind === 'string' ? (
            <Input />
          ) : (
            <Input.TextArea rows={kind === 'json' ? 4 : 1} />
          )}
        </Form.Item>
      </Form>
      {serverError ? (
        <Typography.Text type="danger" role="alert">
          {serverError}
        </Typography.Text>
      ) : null}
    </Modal>
  );
}
