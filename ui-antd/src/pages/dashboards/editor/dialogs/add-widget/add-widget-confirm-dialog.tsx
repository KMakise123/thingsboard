/**
 * Add-widget confirm dialog (spec §3.2 添加 widget step 2): title +
 * placement (row/col/size) + target layout choice on multi-layout
 * dashboards. Confirming commits the addWidget recipe through the caller.
 *
 * SCADA target parity (spec §3.6 差异表, ui-ngx
 * dashboard-utils.service.ts prepareWidgetForScadaLayout:403-424): when the
 * chosen target layout is a scada layout the layout-config fields are
 * SKIPPED (the widget lands at the default 8x6@0,0 — no placement step)
 * and the confirm result carries `scadaDefaults` — the auto-instrumentation
 * defaults (no title / no shadow / transparent background / aspect ratio
 * locked). The caller merges them into the widget config.
 */
import { Form, Input, InputNumber, Modal, Select } from 'antd';
import { useIntl } from 'react-intl';

export interface AddWidgetConfirmPayload {
  fqn: string;
  label: string;
  /** state the widget lands in (root state of the draft). */
  stateId: string;
  /** layouts offered for the target choice (multi-layout dashboards). */
  layouts: Array<{ id: string; name: string; layoutType?: string }>;
}

export interface AddWidgetConfirmResult {
  title?: string;
  row: number;
  col: number;
  sizeX: number;
  sizeY: number;
  layoutId: string;
  /**
   * Set when the chosen target layout is scada: the auto-instrumentation
   * defaults to merge into the widget config (ui-ngx
   * prepareWidgetForScadaLayout — no title, no shadow, transparent
   * background, aspect ratio locked, zero padding).
   */
  scadaDefaults?: {
    showTitle: false;
    dropShadow: false;
    backgroundColor: 'rgba(0,0,0,0)';
    preserveAspectRatio: true;
    padding: '0';
    margin: '0';
  };
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
  const layoutIdWatch: string =
    Form.useWatch('layoutId', form) ?? payload?.layouts[0]?.id ?? 'main';
  const isScadaTarget =
    payload?.layouts.find((layout) => layout.id === layoutIdWatch)
      ?.layoutType === 'scada';

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
          .then((values) => {
            onConfirm({
              ...values,
              // scada skips the layout-config step: the widget lands at the
              // default 8x6@0,0 placement and carries the instrumentation
              // defaults instead of a title.
              row: isScadaTarget ? 0 : values.row,
              col: isScadaTarget ? 0 : values.col,
              sizeX: isScadaTarget ? 8 : values.sizeX,
              sizeY: isScadaTarget ? 6 : values.sizeY,
              title: isScadaTarget ? undefined : values.title,
              ...(isScadaTarget
                ? {
                    scadaDefaults: {
                      showTitle: false,
                      dropShadow: false,
                      backgroundColor: 'rgba(0,0,0,0)',
                      preserveAspectRatio: true,
                      padding: '0',
                      margin: '0',
                    },
                  }
                : {}),
            });
          })
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
          {!isScadaTarget ? (
            <Form.Item
              name="title"
              label={formatMessage({
                id: 'editor.dashboard.addWidget.field.title',
                defaultMessage: 'Title',
              })}
            >
              <Input />
            </Form.Item>
          ) : null}
          {!isScadaTarget ? (
            <>
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
            </>
          ) : null}
        </Form>
      ) : null}
    </Modal>
  );
}
