/**
 * CreateWidgetDialog — "create widget from symbol" (M11 wave-2D, ui-ngx
 * scada-symbol.component.ts:406-465 parity): name + optional widgets
 * bundle, then the page clones the `system.scada_symbol` template,
 * injects the symbol link/size/preview geometry and saves the widget
 * type. The dialog only collects input — the cloning chain stays in the
 * page (single owner for the service calls).
 */
import { Form, Input, Modal, Select } from 'antd';
import { useEffect } from 'react';
import { useIntl } from 'react-intl';

import type { WidgetsBundle } from '@/types/tb/widgets-bundle';

export interface CreateWidgetDialogProps {
  open: boolean;
  defaultName: string;
  bundles: WidgetsBundle[] | undefined;
  confirmLoading: boolean;
  onCreate: (values: { widgetName: string; widgetBundleId?: string }) => void;
  onClose: () => void;
}

export interface CreateWidgetValues {
  widgetName: string;
  widgetBundleId?: string;
}

export function CreateWidgetDialog({
  open,
  defaultName,
  bundles,
  confirmLoading,
  onCreate,
  onClose,
}: CreateWidgetDialogProps) {
  const { formatMessage } = useIntl();
  const [form] = Form.useForm<CreateWidgetValues>();

  useEffect(() => {
    if (open) {
      form.setFieldsValue({ widgetName: defaultName });
    }
  }, [open, defaultName, form]);

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'pages.resources.scadaSymbolEditor.createWidget.title',
        defaultMessage: 'Create widget from symbol',
      })}
      okText={formatMessage({
        id: 'pages.resources.scadaSymbolEditor.createWidget.ok',
        defaultMessage: 'Create',
      })}
      cancelText={formatMessage({
        id: 'pages.common.cancel',
        defaultMessage: 'Cancel',
      })}
      confirmLoading={confirmLoading}
      okButtonProps={{ 'data-testid': 'scada-create-widget-ok' }}
      cancelButtonProps={{ 'data-testid': 'scada-create-widget-cancel' }}
      onCancel={onClose}
      onOk={async () => {
        const values = await form.validateFields();
        onCreate(values);
      }}
      destroyOnHidden
      maskClosable={false}
      data-testid="scada-create-widget-dialog"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="widgetName"
          label={formatMessage({
            id: 'pages.resources.scadaSymbolEditor.createWidget.name',
            defaultMessage: 'Widget name',
          })}
          rules={[
            {
              required: true,
              message: formatMessage({
                id: 'pages.resources.scadaSymbolEditor.createWidget.nameRequired',
                defaultMessage: 'Widget name is required',
              }),
            },
          ]}
        >
          <Input data-testid="scada-create-widget-name" />
        </Form.Item>
        <Form.Item
          name="widgetBundleId"
          label={formatMessage({
            id: 'pages.resources.scadaSymbolEditor.createWidget.bundle',
            defaultMessage: 'Add to widgets bundle (optional)',
          })}
        >
          <Select
            allowClear
            placeholder={formatMessage({
              id: 'pages.resources.scadaSymbolEditor.createWidget.bundlePlaceholder',
              defaultMessage: 'No bundle',
            })}
            options={(bundles ?? []).map((bundle) => ({
              value: bundle.id?.id,
              label: bundle.title,
            }))}
            data-testid="scada-create-widget-bundle"
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export default CreateWidgetDialog;
