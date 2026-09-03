/**
 * DashboardSettingsDialog (spec §3.5/§3.6, ui-ngx
 * dashboard-settings-dialog) — dual mode behind one host id:
 *
 *  - DASHBOARD mode (no payload): `configuration.settings` form —
 *    stateControllerId, title / logo, toolbar visibility toggles and the
 *    dashboardCss editor. Commits ONE group via the updateDashboardSettings
 *    recipe. dashboardCss uses a plain textarea by design: the shared
 *    CodeEditor is JSON-only for M7 and no CSS language may be added.
 *  - LAYOUT-SCOPED mode (payload {stateId, layoutId?, breakpointId?}): the
 *    gridSettings form reused by manage-layouts「Layout settings」. Commits
 *    ONE group via the updateGridSettings recipe (breakpoint-scoped entries
 *    use an inline labeled recipe — no draft transform exists for them).
 *
 * SCADA parity (ui-ngx dashboard-settings-dialog.component.ts:203-239):
 * when the layout type is scada the margin / outerMargin / autofill /
 * row-height fields are forced + disabled and the columns control becomes a
 * 24-multiples select (24..1008); a stored illegal value is rounded UP to
 * the next multiple of 24 (max 1008) on save.
 *
 * Payload (additive refinement): DashboardSettingsPayload | GridSettingsPayload.
 */
import { Form, Input, InputNumber, Modal, Select, Switch } from 'antd';
import { useIntl } from 'react-intl';

import { getRootStateId } from '@/core/dashboard/model';
import {
  updateDashboardSettings,
  updateGridSettings,
  writeDraft,
} from '@/core/editor/dashboard-draft';
import type {
  DashboardBreakpointId,
  DashboardLayoutId,
  GridSettings,
} from '@/types/tb/dashboard';

import type { EditorDialogProps } from './host';
import { useDialogSession } from './use-dialog-session';

/** No payload keys → dashboard-settings mode (shell toolbar entry). */
export interface DashboardSettingsPayload {
  /** Reserved; the dashboard mode is the no-layoutId payload shape. */
  dashboard?: true;
}

/** Payload carrying a layoutId → layout-scoped grid-settings mode. */
export interface GridSettingsPayload {
  stateId?: string;
  layoutId?: DashboardLayoutId;
  breakpointId?: DashboardBreakpointId;
}

/** ui-ngx scadaColumns list (24..1008 step 24). */
export const SCADA_COLUMN_OPTIONS: number[] = (() => {
  const options: number[] = [];
  let columns = 24;
  while (columns <= 1008) {
    options.push(columns);
    columns += 24;
  }
  return options;
})();

/** ui-ngx save clamp: illegal scada columns round UP, capped at 1008. */
export function clampScadaColumns(columns: number): number {
  if (columns % 24 === 0) {
    return Math.min(1008, columns);
  }
  return Math.min(1008, 24 * Math.ceil(columns / 24));
}

interface SettingsFormValues {
  stateControllerId: string;
  showTitle: boolean;
  titleColor: string;
  showDashboardLogo: boolean;
  dashboardLogoUrl?: string;
  hideToolbar: boolean;
  toolbarAlwaysOpen: boolean;
  showDashboardsSelect: boolean;
  showEntitiesSelect: boolean;
  showFilters: boolean;
  showDashboardTimewindow: boolean;
  showDashboardExport: boolean;
  showUpdateDashboardImage: boolean;
  dashboardCss: string;
}

interface GridFormValues {
  columns: number;
  minColumns: number;
  margin: number;
  outerMargin: boolean;
  autoFillHeight: boolean;
  rowHeight: number;
  backgroundColor: string;
  backgroundImageUrl?: string;
  backgroundSizeMode: string;
  mobileAutoFillHeight: boolean;
  mobileRowHeight: number;
}

export function DashboardSettingsDialog({
  open,
  payload,
  onClose,
}: EditorDialogProps) {
  const { formatMessage } = useIntl();
  const session = useDialogSession();
  const configuration = session.current;

  const scope = (payload ?? null) as
    | DashboardSettingsPayload
    | GridSettingsPayload
    | null;
  // Layout-scoped mode is inferred from the payload shape (presence of a
  // layoutId) — the shell toolbar opens the same host id with no payload
  // for the dashboard-settings form.
  const gridMode = scope !== null && 'layoutId' in scope;

  const stateId =
    scope && 'stateId' in scope
      ? (scope.stateId ?? getRootStateId(configuration.states))
      : getRootStateId(configuration.states);
  const layoutId =
    scope && 'layoutId' in scope ? (scope.layoutId ?? 'main') : 'main';
  const breakpointId =
    scope && 'breakpointId' in scope
      ? (scope.breakpointId ?? 'default')
      : 'default';

  const layout = configuration.states[stateId]?.layouts[layoutId];
  // Omit<DashboardLayout,'breakpoints'> degrades to an index signature, so
  // breakpoint entries are read through a cast (same as dashboard-draft.ts).
  const gridSettings: GridSettings =
    breakpointId === 'default'
      ? (layout?.gridSettings ?? {})
      : ((
          layout?.breakpoints?.[breakpointId] as
            | { gridSettings?: GridSettings }
            | undefined
        )?.gridSettings ?? {});

  const isScada = gridSettings.layoutType === 'scada';
  const settings = configuration.settings ?? {};
  const [settingsForm] = Form.useForm<SettingsFormValues>();
  const [gridForm] = Form.useForm<GridFormValues>();

  const saveDashboardSettings = (values: SettingsFormValues): void => {
    writeDraft(
      session,
      updateDashboardSettings({
        settings: {
          stateControllerId: values.stateControllerId,
          showTitle: values.showTitle,
          titleColor: values.titleColor,
          showDashboardLogo: values.showDashboardLogo,
          dashboardLogoUrl: values.dashboardLogoUrl || undefined,
          hideToolbar: values.hideToolbar,
          toolbarAlwaysOpen: values.toolbarAlwaysOpen,
          showDashboardsSelect: values.showDashboardsSelect,
          showEntitiesSelect: values.showEntitiesSelect,
          showFilters: values.showFilters,
          showDashboardTimewindow: values.showDashboardTimewindow,
          showDashboardExport: values.showDashboardExport,
          showUpdateDashboardImage: values.showUpdateDashboardImage,
          dashboardCss: values.dashboardCss,
        },
      }),
    );
    onClose();
  };

  const saveGridSettings = (values: GridFormValues): void => {
    const next: Partial<GridSettings> = {
      columns: isScada ? clampScadaColumns(values.columns) : values.columns,
      minColumns: values.minColumns,
      margin: isScada ? 0 : values.margin,
      outerMargin: isScada ? false : values.outerMargin,
      autoFillHeight: isScada ? false : values.autoFillHeight,
      rowHeight: values.rowHeight,
      backgroundColor: values.backgroundColor,
      backgroundImageUrl: values.backgroundImageUrl || undefined,
      backgroundSizeMode: values.backgroundSizeMode,
      mobileAutoFillHeight: isScada ? false : values.mobileAutoFillHeight,
      mobileRowHeight: values.mobileRowHeight,
    };
    if (breakpointId === 'default') {
      writeDraft(
        session,
        updateGridSettings({ stateId, layoutId, gridSettings: next }),
      );
    } else {
      // Breakpoint-scoped entries have no dashboard-draft.ts recipe — inline
      // labeled recipe (one group).
      session.write('update breakpoint grid settings', (draft): void => {
        const mainLayout = draft.states[stateId]?.layouts.main;
        const entry = mainLayout?.breakpoints?.[breakpointId] as
          | { gridSettings?: GridSettings }
          | undefined;
        if (entry) {
          entry.gridSettings = { ...(entry.gridSettings ?? {}), ...next };
        }
      });
    }
    onClose();
  };

  const title = gridMode
    ? formatMessage({
        id: 'editor.dashboard.dialogs.gridSettings.title',
        defaultMessage: 'Layout settings',
      })
    : formatMessage({
        id: 'editor.dashboard.dialogs.settings.title',
        defaultMessage: 'Dashboard settings',
      });

  return (
    <Modal
      open={open}
      title={title}
      okText={formatMessage({
        id: 'editor.common.save',
        defaultMessage: 'Save',
      })}
      cancelText={formatMessage({
        id: 'editor.common.cancel',
        defaultMessage: 'Cancel',
      })}
      okButtonProps={{ 'data-testid': 'dashboard-settings-ok' }}
      cancelButtonProps={{ 'data-testid': 'dashboard-settings-cancel' }}
      onOk={() => {
        if (gridMode) {
          void gridForm
            .validateFields()
            .then(saveGridSettings)
            .catch(() => undefined);
        } else {
          void settingsForm
            .validateFields()
            .then(saveDashboardSettings)
            .catch(() => undefined);
        }
      }}
      onCancel={onClose}
      destroyOnHidden
      maskClosable={false}
      data-testid="dashboard-settings-dialog"
    >
      {gridMode ? (
        <Form
          form={gridForm}
          layout="vertical"
          initialValues={{
            columns: isScada
              ? clampScadaColumns(gridSettings.columns ?? 24)
              : (gridSettings.columns ?? 24),
            minColumns: gridSettings.minColumns ?? gridSettings.columns ?? 24,
            margin: gridSettings.margin ?? 10,
            outerMargin: gridSettings.outerMargin ?? true,
            autoFillHeight: gridSettings.autoFillHeight ?? false,
            rowHeight: gridSettings.rowHeight ?? 70,
            backgroundColor: gridSettings.backgroundColor ?? '#eeeeee',
            backgroundImageUrl: gridSettings.backgroundImageUrl ?? '',
            backgroundSizeMode: gridSettings.backgroundSizeMode ?? '100%',
            mobileAutoFillHeight: gridSettings.mobileAutoFillHeight ?? false,
            mobileRowHeight: gridSettings.mobileRowHeight ?? 70,
          }}
        >
          <Form.Item
            name="columns"
            label={formatMessage({
              id: 'editor.dashboard.dialogs.gridSettings.columns',
              defaultMessage: 'Columns',
            })}
            rules={[{ required: true }]}
          >
            {isScada ? (
              <Select
                options={SCADA_COLUMN_OPTIONS.map((value) => ({
                  value,
                  label: String(value),
                }))}
              />
            ) : (
              <InputNumber min={10} max={1008} style={{ width: '100%' }} />
            )}
          </Form.Item>
          <Form.Item
            name="minColumns"
            label={formatMessage({
              id: 'editor.dashboard.dialogs.gridSettings.minColumns',
              defaultMessage: 'Minimum columns',
            })}
            rules={[{ required: true }]}
          >
            <InputNumber
              min={10}
              max={1008}
              style={{ width: '100%' }}
              disabled={isScada}
            />
          </Form.Item>
          <Form.Item
            name="margin"
            label={formatMessage({
              id: 'editor.dashboard.dialogs.gridSettings.margin',
              defaultMessage: isScada
                ? 'Margin (forced 0 for SCADA)'
                : 'Margin',
            })}
            rules={[{ required: true }]}
          >
            <InputNumber
              min={0}
              max={50}
              style={{ width: '100%' }}
              disabled={isScada}
            />
          </Form.Item>
          <Form.Item
            name="outerMargin"
            label={formatMessage({
              id: 'editor.dashboard.dialogs.gridSettings.outerMargin',
              defaultMessage: 'Outer margin',
            })}
            valuePropName="checked"
          >
            <Switch disabled={isScada} />
          </Form.Item>
          <Form.Item
            name="autoFillHeight"
            label={formatMessage({
              id: 'editor.dashboard.dialogs.gridSettings.autoFillHeight',
              defaultMessage: 'Auto fill height',
            })}
            valuePropName="checked"
          >
            <Switch disabled={isScada} />
          </Form.Item>
          <Form.Item
            name="rowHeight"
            label={formatMessage({
              id: 'editor.dashboard.dialogs.gridSettings.rowHeight',
              defaultMessage: 'Row height',
            })}
            rules={[{ required: true }]}
          >
            <InputNumber
              min={5}
              max={200}
              style={{ width: '100%' }}
              disabled={isScada}
            />
          </Form.Item>
          <Form.Item
            name="backgroundColor"
            label={formatMessage({
              id: 'editor.dashboard.dialogs.gridSettings.backgroundColor',
              defaultMessage: 'Background color',
            })}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="backgroundImageUrl"
            label={formatMessage({
              id: 'editor.dashboard.dialogs.gridSettings.backgroundImageUrl',
              defaultMessage: 'Background image URL',
            })}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="backgroundSizeMode"
            label={formatMessage({
              id: 'editor.dashboard.dialogs.gridSettings.backgroundSizeMode',
              defaultMessage: 'Background size mode',
            })}
          >
            <Select
              options={['100%', 'cover', 'contain', 'auto'].map((value) => ({
                value,
                label: value,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="mobileAutoFillHeight"
            label={formatMessage({
              id: 'editor.dashboard.dialogs.gridSettings.mobileAutoFillHeight',
              defaultMessage: 'Mobile auto fill height',
            })}
            valuePropName="checked"
          >
            <Switch disabled={isScada} />
          </Form.Item>
          <Form.Item
            name="mobileRowHeight"
            label={formatMessage({
              id: 'editor.dashboard.dialogs.gridSettings.mobileRowHeight',
              defaultMessage: 'Mobile row height',
            })}
            rules={[{ required: true }]}
          >
            <InputNumber
              min={5}
              max={200}
              style={{ width: '100%' }}
              disabled={isScada}
            />
          </Form.Item>
        </Form>
      ) : (
        <Form
          form={settingsForm}
          layout="vertical"
          initialValues={{
            stateControllerId: settings.stateControllerId ?? 'entity',
            showTitle: settings.showTitle ?? true,
            titleColor: settings.titleColor ?? 'rgba(0, 0, 0, 0.87)',
            showDashboardLogo: settings.showDashboardLogo ?? false,
            dashboardLogoUrl: settings.dashboardLogoUrl ?? '',
            hideToolbar: settings.hideToolbar ?? false,
            toolbarAlwaysOpen: settings.toolbarAlwaysOpen ?? true,
            showDashboardsSelect: settings.showDashboardsSelect ?? true,
            showEntitiesSelect: settings.showEntitiesSelect ?? true,
            showFilters: settings.showFilters ?? true,
            showDashboardTimewindow: settings.showDashboardTimewindow ?? true,
            showDashboardExport: settings.showDashboardExport ?? true,
            showUpdateDashboardImage: settings.showUpdateDashboardImage ?? true,
            dashboardCss: settings.dashboardCss ?? '',
          }}
        >
          <Form.Item
            name="stateControllerId"
            label={formatMessage({
              id: 'editor.dashboard.dialogs.settings.stateController',
              defaultMessage: 'State controller',
            })}
          >
            <Select
              options={[
                {
                  value: 'default',
                  label: formatMessage({
                    id: 'editor.dashboard.dialogs.settings.controllerDefault',
                    defaultMessage: 'Default',
                  }),
                },
                {
                  value: 'entity',
                  label: formatMessage({
                    id: 'editor.dashboard.dialogs.settings.controllerEntity',
                    defaultMessage: 'Entity',
                  }),
                },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="showTitle"
            label={formatMessage({
              id: 'editor.dashboard.dialogs.settings.showTitle',
              defaultMessage: 'Show dashboard title',
            })}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="titleColor"
            label={formatMessage({
              id: 'editor.dashboard.dialogs.settings.titleColor',
              defaultMessage: 'Title color',
            })}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="showDashboardLogo"
            label={formatMessage({
              id: 'editor.dashboard.dialogs.settings.showLogo',
              defaultMessage: 'Show dashboard logo',
            })}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="dashboardLogoUrl"
            label={formatMessage({
              id: 'editor.dashboard.dialogs.settings.logoUrl',
              defaultMessage: 'Logo image URL',
            })}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="hideToolbar"
            label={formatMessage({
              id: 'editor.dashboard.dialogs.settings.hideToolbar',
              defaultMessage: 'Hide toolbar',
            })}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="toolbarAlwaysOpen"
            label={formatMessage({
              id: 'editor.dashboard.dialogs.settings.toolbarAlwaysOpen',
              defaultMessage: 'Toolbar always open',
            })}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="showDashboardsSelect"
            label={formatMessage({
              id: 'editor.dashboard.dialogs.settings.showDashboardsSelect',
              defaultMessage: 'Show dashboards select',
            })}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="showEntitiesSelect"
            label={formatMessage({
              id: 'editor.dashboard.dialogs.settings.showEntitiesSelect',
              defaultMessage: 'Show entities select',
            })}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="showFilters"
            label={formatMessage({
              id: 'editor.dashboard.dialogs.settings.showFilters',
              defaultMessage: 'Show filters',
            })}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="showDashboardTimewindow"
            label={formatMessage({
              id: 'editor.dashboard.dialogs.settings.showTimewindow',
              defaultMessage: 'Display timewindow',
            })}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="showDashboardExport"
            label={formatMessage({
              id: 'editor.dashboard.dialogs.settings.showExport',
              defaultMessage: 'Display export',
            })}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="showUpdateDashboardImage"
            label={formatMessage({
              id: 'editor.dashboard.dialogs.settings.showUpdateImage',
              defaultMessage: 'Display update dashboard image',
            })}
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="dashboardCss"
            label={formatMessage({
              id: 'editor.dashboard.dialogs.settings.dashboardCss',
              defaultMessage: 'Dashboard CSS',
            })}
            tooltip={formatMessage({
              id: 'editor.dashboard.dialogs.settings.dashboardCssHint',
              defaultMessage:
                'Plain CSS applied to the dashboard. Added to the page as a style sheet.',
            })}
          >
            <Input.TextArea rows={6} data-testid="dashboard-settings-css" />
          </Form.Item>
        </Form>
      )}
    </Modal>
  );
}
