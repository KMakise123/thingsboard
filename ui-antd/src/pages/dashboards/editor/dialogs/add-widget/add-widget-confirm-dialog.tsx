/**
 * Add-widget confirm dialog (spec §3.2 添加 widget step 2): title +
 * placement (row/col/size) + target layout choice on multi-layout
 * dashboards. Confirming commits the addWidget recipe through the caller.
 */
import { Form, Input, InputNumber, Modal, Select } from 'antd';
import { useIntl } from 'react-intl';

export interface AddWidgetConfirmPayload {
  fqn: string;
  label: string;
  /** state the widget lands in (root state of the draft). */
  stateId: string;
  /** layouts offered for the target choice (multi-layout dashboards). */
  layouts: Array<{ id: string; name: string }>;
}

export interface AddWidgetConfirmResult {
  title?: string;
  row: number;
  col: number;
  sizeX: number;
  sizeY: number;
  layoutId: string;
}

export interface AddWidgetConfirmDialogProps {
  open: boolean;
  payload: AddWidgetConfirmPayload | null;
  onConfirm: (result: AddWidgetConfirmResult) => void;
  onClose: () => void;
}

interface ConfirmFormValues {
  title?: string;
  row: number;
  col: number;
  sizeX: number;
  sizeY: number;
  layoutId: string;
}

export function AddWidgetConfirmDialog({
  open,
  payload,
  onConfirm,
  onClose,
}: AddWidgetConfirmDialogProps) {
  const { formatMessage } = useIntl();
  const [form] = Form.useForm<ConfirmFormValues>();

  return (
    <Modal
      open={open && payload !== null}
      title={formatMessage({
        id: 'editor.dashboard.addWidget.confirmTitle',
        defaultMessage: 'Configure widget',
      })}
      okText={formatMessage({
        id: 'editor.dashboard.addWidget.add',
        defaultMessage: 'Add',
      })}
      cancelText={formatMessage({
        id: 'editor.common.cancel',
        defaultMessage: 'Cancel',
      })}
      onOk={() => {
        void form
          .validateFields()
          .then((values) => onConfirm(values as AddWidgetConfirmResult))
          .catch(() => undefined);
      }}
      onCancel={onClose}
      destroyOnHidden
      maskClosable={false}
      data-testid="add-widget-confirm"
    >
      {payload ? (
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            title: payload.label,
            row: 0,
            col: 0,
            sizeX: 8,
            sizeY: 6,
            layoutId: payload.layouts[0]?.id ?? 'main',
          }}
        >
          <Form.Item
            name="title"
            label={formatMessage({
              id: 'editor.dashboard.addWidget.field.title',
              defaultMessage: 'Title',
            })}
          >
            <Input />
          </Form.Item>
          {payload.layouts.length > 1 ? (
            <Form.Item
              name="layoutId"
              label={formatMessage({
                id: 'editor.dashboard.addWidget.field.layout',
                defaultMessage: 'Target layout',
              })}
            >
              <Select
                options={payload.layouts.map((layout) => ({
                  value: layout.id,
                  label: layout.name,
                }))}
              />
            </Form.Item>
          ) : null}
          <Form.Item
            name="sizeX"
            label={formatMessage({
              id: 'editor.dashboard.addWidget.field.sizeX',
              defaultMessage: 'Width (columns)',
            })}
            rules={[{ required: true }]}
          >
            <InputNumber min={1} max={24} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="sizeY"
            label={formatMessage({
              id: 'editor.dashboard.addWidget.field.sizeY',
              defaultMessage: 'Height (rows)',
            })}
            rules={[{ required: true }]}
          >
            <InputNumber min={1} max={30} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="row"
            label={formatMessage({
              id: 'editor.dashboard.addWidget.field.row',
              defaultMessage: 'Row',
            })}
            rules={[{ required: true }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="col"
            label={formatMessage({
              id: 'editor.dashboard.addWidget.field.col',
              defaultMessage: 'Column',
            })}
            rules={[{ required: true }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      ) : null}
    </Modal>
  );
}
