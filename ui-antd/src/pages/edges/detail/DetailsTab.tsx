/**
 * Edge details tab (spec §5.2): view/edit the edge entity fields with the
 * ui-ngx field set (edge.component parity) — name (required ≤255), type
 * (free-form subtype, required), label (≤255) and the free-form description.
 * `routingKey`/`secret` are connection credentials created client-side at
 * save time: always read-only, no regeneration entry (R08); the rows stay
 * hidden for CUSTOMER_USER like ui-ngx (defensive — the CU tab set does not
 * include details). The assigned-customer / public hints render as
 * read-only text (edge.component.html :137-146 parity). Saving posts the
 * full edge via saveEdge (partial PATCH is not a TB concept) and invalidates
 * nothing itself — the host page owns the detail query.
 */
import { useMutation } from '@tanstack/react-query';
import { App, Button, Col, Form, Input, Row, Typography } from 'antd';
import { useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import { saveEdge } from '@/services/tb/edge';
import type { Edge, EdgeInfo } from '@/types/tb/edge';

export interface EdgeDetailsFormValues {
  name: string;
  type: string;
  label: string;
  description: string;
}

const NULL_CUSTOMER_UUID = '13814000-1dd2-11b2-8080-808080808080';

function toFormValues(edge: EdgeInfo): EdgeDetailsFormValues {
  return {
    name: edge.name,
    type: edge.type,
    label: edge.label ?? '',
    description: edge.additionalInfo?.description ?? '',
  };
}

export function isEdgeDetailsDirty(
  values: EdgeDetailsFormValues,
  edge: EdgeInfo,
): boolean {
  const baseline = toFormValues(edge);
  return (
    values.name !== baseline.name ||
    values.type !== baseline.type ||
    values.label !== baseline.label ||
    values.description !== baseline.description
  );
}

export function toSaveEdgePayload(
  values: EdgeDetailsFormValues,
  edge: EdgeInfo,
): Edge {
  return {
    ...edge,
    name: values.name,
    type: values.type,
    label: values.label,
    additionalInfo: {
      ...(edge.additionalInfo ?? {}),
      description: values.description,
    },
  };
}

export default function DetailsTab({
  edge,
  readOnly,
  editing,
  onEditingChange,
  onDirtyChange,
}: {
  edge: EdgeInfo;
  readOnly: boolean;
  editing: boolean;
  onEditingChange: (editing: boolean) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const [form] = Form.useForm<EdgeDetailsFormValues>();

  const initialValues = useMemo(() => toFormValues(edge), [edge]);
  const values = Form.useWatch([], form);
  const dirty = editing && !!values && isEdgeDetailsDirty(values, edge);
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

  const formKey = useMemo(() => JSON.stringify(initialValues), [initialValues]);

  const saveMutation = useMutation({
    mutationFn: (formValues: EdgeDetailsFormValues) =>
      saveEdge(toSaveEdgePayload(formValues, edge)),
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.edge.toastSaved',
          defaultMessage: 'Edge saved.',
        }),
      );
      onEditingChange(false);
    },
    onError: (error) => {
      void message.error(
        formatMessage(
          {
            id: 'pages.edge.detail.saveFailed',
            defaultMessage: 'Failed to save the edge: {reason}',
          },
          { reason: serverErrorText(error) },
        ),
      );
    },
  });

  const assignedToCustomer =
    !!edge.customerId && edge.customerId.id !== NULL_CUSTOMER_UUID;

  const customerHint = assignedToCustomer ? (
    <Typography.Text type="secondary">
      {formatMessage(
        {
          id: 'pages.edge.detail.assignedToCustomer',
          defaultMessage: 'Edge is assigned to customer: {customer}',
        },
        { customer: edge.customerTitle || edge.customerId?.id },
      )}
    </Typography.Text>
  ) : null;
  const publicHint = edge.customerIsPublic ? (
    <Typography.Text type="secondary">
      {formatMessage({
        id: 'pages.edge.detail.publicHint',
        defaultMessage: 'Edge is public',
      })}
    </Typography.Text>
  ) : null;

  if (!editing) {
    return (
      <div className="flex flex-col gap-3">
        {customerHint}
        {publicHint}
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Typography.Text type="secondary">
              {formatMessage({
                id: 'pages.edge.name',
                defaultMessage: 'Name',
              })}
            </Typography.Text>
            <Typography.Paragraph>{edge.name}</Typography.Paragraph>
          </Col>
          <Col span={12}>
            <Typography.Text type="secondary">
              {formatMessage({
                id: 'pages.edge.type',
                defaultMessage: 'Edge type',
              })}
            </Typography.Text>
            <Typography.Paragraph>{edge.type}</Typography.Paragraph>
          </Col>
          <Col span={12}>
            <Typography.Text type="secondary">
              {formatMessage({
                id: 'pages.edge.label',
                defaultMessage: 'Label',
              })}
            </Typography.Text>
            <Typography.Paragraph>{edge.label || '-'}</Typography.Paragraph>
          </Col>
          {edge.additionalInfo?.description ? (
            <Col span={24}>
              <Typography.Text type="secondary">
                {formatMessage({
                  id: 'pages.edge.description',
                  defaultMessage: 'Description',
                })}
              </Typography.Text>
              <Typography.Paragraph>
                {edge.additionalInfo.description}
              </Typography.Paragraph>
            </Col>
          ) : null}
          {!readOnly && (
            <>
              <Col span={12}>
                <Typography.Text type="secondary">
                  {formatMessage({
                    id: 'pages.edge.routingKey',
                    defaultMessage: 'Edge key',
                  })}
                </Typography.Text>
                <Typography.Paragraph copyable>
                  {edge.routingKey}
                </Typography.Paragraph>
              </Col>
              <Col span={12}>
                <Typography.Text type="secondary">
                  {formatMessage({
                    id: 'pages.edge.secret',
                    defaultMessage: 'Edge secret',
                  })}
                </Typography.Text>
                <Typography.Paragraph copyable>
                  {edge.secret}
                </Typography.Paragraph>
              </Col>
            </>
          )}
        </Row>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {customerHint}
      {publicHint}
      <Form<EdgeDetailsFormValues>
        key={formKey}
        form={form}
        layout="vertical"
        initialValues={initialValues}
        onFinish={(formValues) => saveMutation.mutate(formValues)}
        disabled={saveMutation.isPending}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="name"
              label={formatMessage({
                id: 'pages.edge.name',
                defaultMessage: 'Name',
              })}
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: formatMessage({
                    id: 'pages.edge.nameRequired',
                    defaultMessage: 'Name is required.',
                  }),
                },
                {
                  max: 255,
                  message: formatMessage({
                    id: 'pages.edge.nameMaxLength',
                    defaultMessage: 'Name should be less than 256 characters.',
                  }),
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="type"
              label={formatMessage({
                id: 'pages.edge.type',
                defaultMessage: 'Edge type',
              })}
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: formatMessage({
                    id: 'pages.edge.typeRequired',
                    defaultMessage: 'Edge type is required.',
                  }),
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="label"
              label={formatMessage({
                id: 'pages.edge.label',
                defaultMessage: 'Label',
              })}
              rules={[
                {
                  max: 255,
                  message: formatMessage({
                    id: 'pages.edge.labelMaxLength',
                    defaultMessage: 'Label should be less than 256 characters.',
                  }),
                },
              ]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              name="description"
              label={formatMessage({
                id: 'pages.edge.description',
                defaultMessage: 'Description',
              })}
            >
              <Input.TextArea rows={3} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label={formatMessage({
                id: 'pages.edge.routingKey',
                defaultMessage: 'Edge key',
              })}
            >
              <Input value={edge.routingKey} disabled />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label={formatMessage({
                id: 'pages.edge.secret',
                defaultMessage: 'Edge secret',
              })}
            >
              <Input value={edge.secret} disabled />
            </Form.Item>
          </Col>
        </Row>
        <Button
          type="primary"
          htmlType="submit"
          loading={saveMutation.isPending}
          disabled={!dirty}
        >
          {formatMessage({
            id: 'pages.edge.detail.save',
            defaultMessage: 'Save',
          })}
        </Button>
      </Form>
    </div>
  );
}
