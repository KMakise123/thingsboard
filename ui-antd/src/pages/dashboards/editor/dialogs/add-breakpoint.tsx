/**
 * AddBreakpointDialog (spec §3.5, ui-ngx add-new-breakpoint-dialog +
 * manage-dashboard-layouts createdNewBreakpoint): pick a breakpoint that is
 * not defined yet plus the breakpoint to copy from, and commit the copy as
 * ONE transaction group.
 *
 * ui-ngx copy semantics mirrored (createdNewBreakpoint):
 *  - source = the main layout itself for `default`, else
 *    `layouts.main.breakpoints[copyFrom]`;
 *  - gridSettings + widgets are deep-copied;
 *  - copying from `default` into a mobile bucket (maxWidth < 960 → xs)
 *    adapts rowHeight/autoFillHeight from the mobile arm and strips
 *    desktopHide/mobileHide from the copied widget layouts;
 *  - the resulting entry is written to `layouts.main.breakpoints[id]`
 *    (breakpoint overrides live on the main layout, exactly like ui-ngx
 *    layoutData).
 *
 * Payload (additive refinement): `{stateId?}` — defaults to the root state.
 */
import { Form, Modal, Select } from 'antd';
import { useIntl } from 'react-intl';

import { BREAKPOINT_WIDTHS } from '@/components/dashboard/grid/grid-math';
import { getRootStateId } from '@/core/dashboard/model';
import type {
  DashboardBreakpointId,
  DashboardConfiguration,
  DashboardLayout,
  WidgetLayout,
} from '@/types/tb/dashboard';

import type { EditorDialogProps } from './host';
import { useDialogSession } from './use-dialog-session';

export interface AddBreakpointPayload {
  stateId?: string;
}

type NonDefaultBreakpoint = Exclude<DashboardBreakpointId, 'default'>;

const ALL_BREAKPOINTS = Object.keys(
  BREAKPOINT_WIDTHS,
) as NonDefaultBreakpoint[];

interface AddBreakpointFormValues {
  newBreakpointId: NonDefaultBreakpoint;
  copyFrom: DashboardBreakpointId;
}

export function breakpointLabel(
  breakpointId: DashboardBreakpointId,
  formatMessage: ReturnType<typeof useIntl>['formatMessage'],
): string {
  if (breakpointId === 'default') {
    return formatMessage({
      id: 'editor.dashboard.dialogs.layouts.defaultBreakpoint',
      defaultMessage: 'Default',
    });
  }
  return `${breakpointId.toUpperCase()} (max ${BREAKPOINT_WIDTHS[breakpointId]}px)`;
}

export function AddBreakpointDialog({
  open,
  payload,
  onClose,
}: EditorDialogProps) {
  const { formatMessage } = useIntl();
  const session = useDialogSession();
  const [form] = Form.useForm<AddBreakpointFormValues>();

  const scope = (payload ?? null) as AddBreakpointPayload | null;
  const stateId = scope?.stateId ?? getRootStateId(session.current.states);
  const main = session.current.states[stateId]?.layouts.main;
  const existing: DashboardBreakpointId[] = main?.breakpoints
    ? (Object.keys(main.breakpoints) as DashboardBreakpointId[])
    : [];
  const allowed = ALL_BREAKPOINTS.filter((id) => !existing.includes(id));
  const copySources: DashboardBreakpointId[] = ['default', ...existing];

  const onOk = (): void => {
    void form
      .validateFields()
      .then((values) => {
        session.write(
          'add breakpoint',
          (draft: DashboardConfiguration): void => {
            const mainLayout: DashboardLayout | undefined =
              draft.states[stateId]?.layouts.main;
            if (!mainLayout) {
              return;
            }
            const source: DashboardLayout | undefined =
              values.copyFrom === 'default'
                ? mainLayout
                : (mainLayout.breakpoints?.[values.copyFrom] as
                    | DashboardLayout
                    | undefined);
            if (!source) {
              return;
            }
            // JSON deep copy — structuredClone cannot read immer draft proxies.
            const gridSettings = JSON.parse(
              JSON.stringify(source.gridSettings),
            ) as DashboardLayout['gridSettings'];
            const widgets = JSON.parse(
              JSON.stringify(source.widgets),
            ) as Record<string, WidgetLayout>;
            if (
              values.copyFrom === 'default' &&
              BREAKPOINT_WIDTHS[values.newBreakpointId] < 960
            ) {
              // ui-ngx mobile adaptation for xs copies (maxWidth < 960).
              if (typeof gridSettings.mobileRowHeight === 'number') {
                gridSettings.rowHeight = gridSettings.mobileRowHeight;
              }
              if (gridSettings.mobileAutoFillHeight !== undefined) {
                gridSettings.autoFillHeight = gridSettings.mobileAutoFillHeight;
              }
              for (const layout of Object.values(widgets)) {
                delete layout.desktopHide;
                delete layout.mobileHide;
              }
            }
            mainLayout.breakpoints ??= {};
            mainLayout.breakpoints[values.newBreakpointId] = {
              gridSettings,
              widgets,
            };
          },
        );
        onClose();
      })
      .catch(() => undefined);
  };

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'editor.dashboard.dialogs.breakpoint.title',
        defaultMessage: 'Add new breakpoint',
      })}
      okText={formatMessage({
        id: 'editor.common.save',
        defaultMessage: 'Save',
      })}
      cancelText={formatMessage({
        id: 'editor.common.cancel',
        defaultMessage: 'Cancel',
      })}
      okButtonProps={{
        disabled: allowed.length === 0,
        'data-testid': 'add-breakpoint-ok',
      }}
      cancelButtonProps={{ 'data-testid': 'add-breakpoint-cancel' }}
      onOk={onOk}
      onCancel={onClose}
      destroyOnHidden
      maskClosable={false}
      data-testid="add-breakpoint-dialog"
    >
      {allowed.length === 0 ? (
        <p data-testid="add-breakpoint-exhausted">
          {formatMessage({
            id: 'editor.dashboard.dialogs.breakpoint.exhausted',
            defaultMessage: 'All breakpoints are already defined.',
          })}
        </p>
      ) : null}
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          newBreakpointId: allowed[0],
          copyFrom: 'default' as DashboardBreakpointId,
        }}
      >
        <Form.Item
          name="newBreakpointId"
          label={formatMessage({
            id: 'editor.dashboard.dialogs.breakpoint.breakpoint',
            defaultMessage: 'Breakpoint',
          })}
          rules={[{ required: true }]}
        >
          <Select
            disabled={allowed.length === 1}
            options={allowed.map((id) => ({
              value: id,
              label: breakpointLabel(id, formatMessage),
            }))}
          />
        </Form.Item>
        <Form.Item
          name="copyFrom"
          label={formatMessage({
            id: 'editor.dashboard.dialogs.breakpoint.copyFrom',
            defaultMessage: 'Copy from',
          })}
          rules={[{ required: true }]}
        >
          <Select
            disabled={copySources.length === 1}
            options={copySources.map((id) => ({
              value: id,
              label: breakpointLabel(id, formatMessage),
            }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
