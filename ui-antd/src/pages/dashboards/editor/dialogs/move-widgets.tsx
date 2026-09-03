/**
 * MoveWidgetsDialog — shifts EVERY widget of the current state + layout by a
 * cols/rows offset (spec §3.3, ui-ngx move-widgets-dialog +
 * dashboard-utils.service moveWidgets:927). One OK = ONE transaction group.
 *
 * Semantics mirrored from ui-ngx moveWidgets: offsets are rounded; a
 * negative offset clamps so no widget lands left of / above column 0 / row 0.
 * The editor edits the default (base) layout set, so the shift targets the
 * base layout widgets (breakpoint copies are separate viewport-specific
 * sets, exactly like ui-ngx per-breakpoint layoutData).
 *
 * The displayGrid 'always' force while this dialog is open is wired
 * shell-side through EditorCanvasContext (`displayGridAlways`) and asserted
 * in move-widgets.test.tsx.
 *
 * Payload (additive refinement): `{stateId?}` — defaults to the root state.
 */
import { Form, InputNumber, Modal, Select } from 'antd';
import { useIntl } from 'react-intl';

import { getRootStateId } from '@/core/dashboard/model';
import {
  type DashboardDraftWrite,
  writeDraft,
} from '@/core/editor/dashboard-draft';
import type {
  DashboardConfiguration,
  DashboardLayoutId,
} from '@/types/tb/dashboard';

import type { EditorDialogProps } from './host';
import { useDialogSession } from './use-dialog-session';

export interface MoveWidgetsPayload {
  stateId?: string;
}

interface MoveFormValues {
  cols: number;
  rows: number;
  layoutId: DashboardLayoutId;
}

export function MoveWidgetsDialog({
  open,
  payload,
  onClose,
}: EditorDialogProps) {
  const { formatMessage } = useIntl();
  const session = useDialogSession();
  const [form] = Form.useForm<MoveFormValues>();

  const configuration = session.current;
  const scope = (payload ?? null) as MoveWidgetsPayload | null;
  const stateId = scope?.stateId ?? getRootStateId(configuration.states);
  const layoutIds = Object.keys(
    configuration.states[stateId]?.layouts ?? {},
  ) as DashboardLayoutId[];
  const defaultLayoutId: DashboardLayoutId = layoutIds.includes('main')
    ? 'main'
    : (layoutIds[0] ?? 'main');
  const layoutIdWatch: DashboardLayoutId =
    Form.useWatch('layoutId', form) ?? defaultLayoutId;

  const widgetCount = (layoutId: DashboardLayoutId): number =>
    Object.keys(configuration.states[stateId]?.layouts[layoutId]?.widgets ?? {})
      .length;
  const hasWidgets = widgetCount(layoutIdWatch) > 0;

  const onOk = (): void => {
    void form
      .validateFields()
      .then((values) => {
        const layoutId = values.layoutId ?? defaultLayoutId;
        const write: DashboardDraftWrite = {
          label: 'move widgets',
          recipe: (draft: DashboardConfiguration): void => {
            const layout = draft.states[stateId]?.layouts[layoutId];
            if (!layout) {
              return;
            }
            let cols = Math.round(values.cols ?? 0);
            let rows = Math.round(values.rows ?? 0);
            if (cols < 0 || rows < 0) {
              let minCol = Number.POSITIVE_INFINITY;
              let minRow = Number.POSITIVE_INFINITY;
              for (const entry of Object.values(layout.widgets)) {
                minCol = Math.min(minCol, entry?.col ?? 0);
                minRow = Math.min(minRow, entry?.row ?? 0);
              }
              if (Number.isFinite(minCol) && cols + minCol < 0) {
                cols = -minCol;
              }
              if (Number.isFinite(minRow) && rows + minRow < 0) {
                rows = -minRow;
              }
            }
            for (const entry of Object.values(layout.widgets)) {
              entry.col = (entry.col ?? 0) + cols;
              entry.row = (entry.row ?? 0) + rows;
            }
          },
        };
        writeDraft(session, write);
        onClose();
      })
      .catch(() => undefined);
  };

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'editor.dashboard.dialogs.moveWidgets.title',
        defaultMessage: 'Move all widgets',
      })}
      okText={formatMessage({
        id: 'editor.dashboard.dialogs.moveWidgets.move',
        defaultMessage: 'Move',
      })}
      cancelText={formatMessage({
        id: 'editor.common.cancel',
        defaultMessage: 'Cancel',
      })}
      onOk={onOk}
      onCancel={onClose}
      okButtonProps={{ disabled: !hasWidgets, 'data-testid': 'move-widgets-ok' }}
      cancelButtonProps={{ 'data-testid': 'move-widgets-cancel' }}
      destroyOnHidden
      maskClosable={false}
      data-testid="move-widgets-dialog"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ cols: 0, rows: 0, layoutId: defaultLayoutId }}
      >
        {layoutIds.length > 1 ? (
          <Form.Item
            name="layoutId"
            label={formatMessage({
              id: 'editor.dashboard.dialogs.moveWidgets.layout',
              defaultMessage: 'Layout',
            })}
          >
            <Select
              options={layoutIds.map((id) => ({
                value: id,
                label:
                  id === 'main'
                    ? formatMessage({
                        id: 'editor.dashboard.layout.main',
                        defaultMessage: 'Main layout',
                      })
                    : formatMessage({
                        id: 'editor.dashboard.layout.right',
                        defaultMessage: 'Right layout',
                      }),
              }))}
            />
          </Form.Item>
        ) : null}
        <Form.Item
          name="cols"
          label={formatMessage({
            id: 'editor.dashboard.dialogs.moveWidgets.cols',
            defaultMessage: 'Columns offset',
          })}
          rules={[{ required: true }]}
        >
          <InputNumber style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item
          name="rows"
          label={formatMessage({
            id: 'editor.dashboard.dialogs.moveWidgets.rows',
            defaultMessage: 'Rows offset',
          })}
          rules={[{ required: true }]}
        >
          <InputNumber style={{ width: '100%' }} />
        </Form.Item>
        {!hasWidgets ? (
          <p data-testid="move-widgets-empty">
            {formatMessage({
              id: 'editor.dashboard.dialogs.moveWidgets.empty',
              defaultMessage: 'The layout has no widgets to move.',
            })}
          </p>
        ) : null}
      </Form>
    </Modal>
  );
}
