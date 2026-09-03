/**
 * ManageLayoutsDialog (spec §3.5/§3.6, ui-ngx
 * manage-dashboard-layouts-dialog): layout count + type control and the
 * breakpoint entries with their per-entry actions.
 *
 * ui-ngx semantics mirrored:
 *  - the layoutType radio IS the layout-count control: `default` / `scada`
 *    keep ONE (main) layout, `divider` keeps main + right (divider
 *    semantics: right column exists, main breakpoints are dropped);
 *  - save applies the type to main + every main breakpoint (ui-ngx save);
 *    switching away from divider deletes the right layout;
 *  - breakpoint entries live on layouts.main (default + xs..xl); each
 *    carries its own Layout settings entry; non-default entries can be
 *    deleted; `Add breakpoint` opens the add-breakpoint host dialog;
 *  - `Layout settings` reuses the dashboard-settings dialog in its
 *    layout-scoped (grid settings) mode via the host slot — the frozen
 *    host carries ONE dialog at a time (host.tsx contract), so the layouts
 *    dialog closes while the settings dialog is up.
 *
 * Payload (additive refinement): `{stateId?}` — defaults to the root state.
 * Each action commits ONE transaction group.
 */
import {
  DeleteOutlined,
  PlusOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { Button, List, Modal, Radio, Space, Typography } from 'antd';
import { useIntl } from 'react-intl';

import { BREAKPOINT_WIDTHS } from '@/components/dashboard/grid/grid-math';
import {
  createDefaultGridSettings,
  getRootStateId,
} from '@/core/dashboard/model';
import type {
  DashboardBreakpointId,
  DashboardConfiguration,
  DashboardLayoutId,
  GridSettings,
  GridSettingsLayoutType,
} from '@/types/tb/dashboard';
import type { EditorDialogProps } from './host';
import { DialogHost, useEditorDialogs } from './host';
import { useDialogSession } from './use-dialog-session';

export interface ManageLayoutsPayload {
  stateId?: string;
}

type LayoutMode = Extract<
  GridSettingsLayoutType,
  'default' | 'scada' | 'divider'
>;

const BREAKPOINT_ORDER: Exclude<DashboardBreakpointId, 'default'>[] = [
  'xl',
  'lg',
  'md',
  'sm',
  'xs',
];

/** ui-ngx getBreakpointSizeDescription equivalent. */
export function breakpointSizeDescription(
  breakpointId: DashboardBreakpointId,
): string {
  if (breakpointId === 'default') {
    return '';
  }
  return `max ${BREAKPOINT_WIDTHS[breakpointId]}px`;
}

export function ManageLayoutsDialog({
  open,
  payload,
  onClose,
}: EditorDialogProps) {
  const { formatMessage } = useIntl();
  const session = useDialogSession();
  const nestedDialogs = useEditorDialogs();
  const configuration = session.current;

  const scope = (payload ?? null) as ManageLayoutsPayload | null;
  const stateId = scope?.stateId ?? getRootStateId(configuration.states);
  const state = configuration.states[stateId];
  const layouts = state?.layouts ?? {};
  const main = layouts.main;
  const hasRight = Boolean(layouts.right);

  const initialMode: LayoutMode = hasRight
    ? 'divider'
    : ((main?.gridSettings?.layoutType as LayoutMode | undefined) ?? 'default');

  const breakpointIds: DashboardBreakpointId[] = [
    'default',
    ...BREAKPOINT_ORDER.filter((id) => main?.breakpoints?.[id] !== undefined),
  ];

  const saveMode = (mode: LayoutMode): void => {
    session.write('set layouts', (draft: DashboardConfiguration): void => {
      const target = draft.states[stateId];
      if (!target) {
        return;
      }
      const nextMain = target.layouts.main;
      if (!nextMain) {
        return;
      }
      // ui-ngx save(): the chosen type lands on main in every mode.
      nextMain.gridSettings.layoutType = mode;
      if (mode === 'divider') {
        if (!target.layouts.right) {
          target.layouts.right = {
            widgets: {},
            gridSettings: createDefaultGridSettings(),
          };
        }
        target.layouts.right.gridSettings.layoutType = 'divider';
        // ui-ngx save: divider drops main breakpoint overrides.
        delete nextMain.breakpoints;
      } else {
        delete target.layouts.right;
        const breakpoints = nextMain.breakpoints;
        if (breakpoints) {
          // NOTE: Omit<DashboardLayout,'breakpoints'> degrades to an index
          // signature — read the entry through a cast (dashboard-draft.ts
          // removeWidget precedent).
          for (const entry of Object.values(breakpoints) as Array<
            { gridSettings?: GridSettings } | undefined
          >) {
            const gridSettings = entry?.gridSettings;
            if (gridSettings) {
              gridSettings.layoutType = mode;
            }
          }
        }
      }
    });
    onClose();
  };

  const deleteBreakpoint = (breakpointId: DashboardBreakpointId): void => {
    if (breakpointId === 'default') {
      return;
    }
    session.write('remove breakpoint', (draft): void => {
      const mainLayout = draft.states[stateId]?.layouts.main;
      if (mainLayout?.breakpoints) {
        delete mainLayout.breakpoints[breakpointId];
        if (Object.keys(mainLayout.breakpoints).length === 0) {
          delete mainLayout.breakpoints;
        }
      }
    });
  };

  const layoutName = (layoutId: DashboardLayoutId): string =>
    layoutId === 'main'
      ? formatMessage({
          id: 'editor.dashboard.layout.main',
          defaultMessage: 'Main layout',
        })
      : formatMessage({
          id: 'editor.dashboard.layout.right',
          defaultMessage: 'Right layout',
        });

  const openLayoutSettings = (
    layoutId: DashboardLayoutId,
    breakpointId: DashboardBreakpointId,
  ): void => {
    // Layout settings reuse the dashboard-settings dialog in its
    // layout-scoped (grid settings) mode — mounted through this dialog's
    // local DialogHost (the same panel-local pattern WidgetConfigPanel
    // uses), so this dialog stays mounted underneath.
    nestedDialogs.openDialog('dashboard-settings', {
      stateId,
      layoutId,
      breakpointId,
    });
  };

  const openAddBreakpoint = (): void => {
    nestedDialogs.openDialog('add-breakpoint', { stateId });
  };

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'editor.dashboard.dialogs.layouts.title',
        defaultMessage: 'Manage layouts',
      })}
      footer={
        <Button type="primary" data-testid="layouts-close" onClick={onClose}>
          {formatMessage({
            id: 'editor.common.cancel',
            defaultMessage: 'Cancel',
          })}
        </Button>
      }
      onCancel={onClose}
      destroyOnHidden
      maskClosable={false}
      data-testid="manage-layouts-dialog"
    >
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        <div>
          <Typography.Paragraph style={{ marginBottom: 8 }}>
            {formatMessage({
              id: 'editor.dashboard.dialogs.layouts.type',
              defaultMessage: 'Layout type',
            })}
          </Typography.Paragraph>
          <Radio.Group
            value={initialMode}
            data-testid="layouts-mode"
            onChange={(event) => saveMode(event.target.value as LayoutMode)}
            options={[
              {
                value: 'default',
                label: formatMessage({
                  id: 'editor.dashboard.dialogs.layouts.default',
                  defaultMessage: 'Default',
                }),
              },
              {
                value: 'divider',
                label: formatMessage({
                  id: 'editor.dashboard.dialogs.layouts.divider',
                  defaultMessage: 'Divider (left + right)',
                }),
              },
              {
                value: 'scada',
                label: formatMessage({
                  id: 'editor.dashboard.dialogs.layouts.scada',
                  defaultMessage: 'SCADA',
                }),
              },
            ]}
          />
        </div>

        <div>
          <Typography.Paragraph style={{ marginBottom: 8 }}>
            {formatMessage({
              id: 'editor.dashboard.dialogs.layouts.layouts',
              defaultMessage: 'Layouts',
            })}
          </Typography.Paragraph>
          <List
            size="small"
            dataSource={(hasRight
              ? (['main', 'right'] as DashboardLayoutId[])
              : (['main'] as DashboardLayoutId[])
            ).map((layoutId) => ({
              layoutId,
              breakpointId: 'default' as DashboardBreakpointId,
              name: layoutName(layoutId),
              description: '',
            }))}
            renderItem={(entry) => (
              <List.Item
                actions={[
                  <Button
                    key="settings"
                    size="small"
                    icon={<SettingOutlined />}
                    data-testid={`layouts-settings-${entry.layoutId}`}
                    onClick={() =>
                      openLayoutSettings(entry.layoutId, entry.breakpointId)
                    }
                  >
                    {formatMessage({
                      id: 'editor.dashboard.dialogs.layouts.settings',
                      defaultMessage: 'Layout settings',
                    })}
                  </Button>,
                ]}
              >
                {entry.name}
              </List.Item>
            )}
          />
        </div>

        <div>
          <Typography.Paragraph style={{ marginBottom: 8 }}>
            {formatMessage({
              id: 'editor.dashboard.dialogs.layouts.breakpoints',
              defaultMessage: 'Breakpoints',
            })}
            {'  '}
            <Button
              size="small"
              icon={<PlusOutlined />}
              style={{ marginLeft: 8 }}
              data-testid="layouts-add-breakpoint"
              onClick={openAddBreakpoint}
            >
              {formatMessage({
                id: 'editor.dashboard.dialogs.layouts.addBreakpoint',
                defaultMessage: 'Add breakpoint',
              })}
            </Button>
          </Typography.Paragraph>
          <List
            size="small"
            dataSource={breakpointIds.map((breakpointId) => ({
              breakpointId,
              name:
                breakpointId === 'default'
                  ? formatMessage({
                      id: 'editor.dashboard.dialogs.layouts.defaultBreakpoint',
                      defaultMessage: 'Default',
                    })
                  : breakpointId.toUpperCase(),
              description: breakpointSizeDescription(breakpointId),
            }))}
            renderItem={(entry) => (
              <List.Item
                actions={[
                  <Button
                    key="settings"
                    size="small"
                    icon={<SettingOutlined />}
                    data-testid={`layouts-bp-settings-${entry.breakpointId}`}
                    onClick={() =>
                      openLayoutSettings('main', entry.breakpointId)
                    }
                  >
                    {formatMessage({
                      id: 'editor.dashboard.dialogs.layouts.settings',
                      defaultMessage: 'Layout settings',
                    })}
                  </Button>,
                  ...(entry.breakpointId === 'default'
                    ? []
                    : [
                        <Button
                          key="delete"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          data-testid={`layouts-bp-delete-${entry.breakpointId}`}
                          onClick={() => deleteBreakpoint(entry.breakpointId)}
                        />,
                      ]),
                ]}
              >
                <span>
                  {entry.name}
                  {entry.description ? (
                    <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                      {entry.description}
                    </Typography.Text>
                  ) : null}
                </span>
              </List.Item>
            )}
          />
        </div>
      </Space>
      <DialogHost controller={nestedDialogs} />
    </Modal>
  );
}
