/**
 * Data section (spec §3.4, five-section advanced panel — slot 1):
 * timewindow block (useDashboardTimewindow override toggle + picker,
 * TB semantics per effectiveWidgetTimewindow), alarm filter (alarm
 * widgets), datasources editor, RPC targetDevice, alarm source, page size.
 *
 * Widget-kind classification is SHAPE-DERIVED (v1 has no server widgetType
 * enum on our digests): alarmSource present → alarm; targetDevice present →
 * rpc; otherwise data. Reported as the 等价 mechanism in the M7 record.
 */
import { Button, Select, Space, Typography } from 'antd';
import { useIntl } from 'react-intl';

import { TimewindowPicker } from '@/components/dashboard/timewindow/TimewindowPicker';
import type { EditorSession } from '@/core/editor/session';
import type { DashboardConfiguration } from '@/types/tb/dashboard';
import {
  createDefaultDashboardTimewindow,
  type Timewindow,
} from '@/types/tb/timewindow';
import type { AlarmSource, Widget } from '@/types/tb/widget';
import type { EditorDialogsController } from '../dialogs/host';
import type { AliasDialogTrigger } from './datasources-editor';
import { DatasourcesEditor } from './datasources-editor';
import {
  PanelNumber,
  PanelRow,
  PanelSwitch,
  UndoSafeInput,
} from './panel-fields';
import type { PanelTarget } from './panel-target';
import { patchWidgetConfig } from './panel-target';

export type PanelWidgetKind = 'alarm' | 'rpc' | 'data';

export function widgetKindOf(widget: Widget): PanelWidgetKind {
  const config = widget.config ?? {};
  if (config.alarmSource) {
    return 'alarm';
  }
  if (config.targetDevice !== undefined) {
    return 'rpc';
  }
  return 'data';
}

export interface PanelSectionProps {
  session: EditorSession<DashboardConfiguration>;
  configuration: DashboardConfiguration;
  target: PanelTarget;
  widget: Widget;
  dialogs: Pick<EditorDialogsController, 'openDialog'>;
}

/** ui-ngx TargetDevice shape (config.targetDevice is `unknown` passthrough). */
interface RpcTargetDevice {
  type?: 'device' | 'entity';
  deviceId?: string;
  entityAliasId?: string;
  [key: string]: unknown;
}

const TARGET_DEVICE_TYPES: Array<'device' | 'entity'> = ['device', 'entity'];

function normalizeTargetDevice(raw: unknown): RpcTargetDevice {
  if (
    raw &&
    typeof raw === 'object' &&
    !Array.isArray(raw) &&
    ((raw as RpcTargetDevice).type === 'device' ||
      (raw as RpcTargetDevice).type === 'entity')
  ) {
    return raw as RpcTargetDevice;
  }
  return { type: 'device' };
}

export function SectionData({
  session,
  configuration,
  target,
  widget,
  dialogs,
}: PanelSectionProps) {
  const { formatMessage } = useIntl();
  const config = widget.config ?? {};
  const kind = widgetKindOf(widget);

  const aliasTrigger: AliasDialogTrigger = {
    createAlias: (apply) => {
      // Frozen payload contract {aliasId?, onSaved?}: create mode sends no
      // aliasId; the dialog's onSaved hands back the persisted alias (the
      // panel tolerates argument-less calls too).
      dialogs.openDialog('alias', {
        onSaved: (saved?: unknown) => {
          const alias = saved as { id?: unknown } | undefined;
          if (alias && typeof alias.id === 'string') {
            apply(alias.id);
          }
        },
      });
    },
    editAlias: (aliasId) => {
      dialogs.openDialog('alias', { aliasId });
    },
  };

  const entityAliasOptions = Object.values(
    configuration.entityAliases ?? {},
  ).map((alias) => ({ value: alias.id, label: alias.alias }));

  const timewindowBlock =
    kind === 'alarm' ? null : (
      <div
        data-testid="panel-data-timewindow"
        style={{
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: '1px solid rgba(128,128,128,0.2)',
        }}
      >
        <Typography.Text strong style={{ fontSize: 12 }}>
          {formatMessage({
            id: 'editor.dashboard.panel.data.timewindow',
            defaultMessage: 'Timewindow',
          })}
        </Typography.Text>
        <PanelSwitch
          label={formatMessage({
            id: 'editor.dashboard.panel.data.useDashboardTimewindow',
            defaultMessage: 'Use dashboard timewindow',
          })}
          checked={config.useDashboardTimewindow !== false}
          testId="panel-timewindow-override"
          onEdit={(next) => {
            if (next) {
              patchWidgetConfig(session, target.widgetId, {
                useDashboardTimewindow: true,
              });
              return;
            }
            // TB semantics: switching OFF adopts the dashboard window as the
            // widget-private baseline (ui-ngx initModelFromDefaultTimewindow).
            patchWidgetConfig(session, target.widgetId, {
              useDashboardTimewindow: false,
              timewindow:
                config.timewindow ??
                configuration.timewindow ??
                createDefaultDashboardTimewindow(),
            });
          }}
        />
        {config.useDashboardTimewindow === false ? (
          <>
            <PanelRow
              label={formatMessage({
                id: 'editor.dashboard.panel.data.timewindowValue',
                defaultMessage: 'Window',
              })}
            >
              <TimewindowPicker
                value={config.timewindow ?? createDefaultDashboardTimewindow()}
                onChange={(next: Timewindow) =>
                  patchWidgetConfig(session, target.widgetId, {
                    timewindow: next,
                  })
                }
              />
            </PanelRow>
            <PanelSwitch
              label={formatMessage({
                id: 'editor.dashboard.panel.data.displayTimewindow',
                defaultMessage: 'Display timewindow',
              })}
              checked={config.displayTimewindow !== false}
              testId="panel-display-timewindow"
              onEdit={(next) =>
                patchWidgetConfig(session, target.widgetId, {
                  displayTimewindow: next,
                })
              }
            />
          </>
        ) : null}
      </div>
    );

  const alarmFilterBlock =
    kind !== 'alarm' ? null : (
      <div style={{ marginBottom: 12 }}>
        <PanelRow
          label={formatMessage({
            id: 'editor.dashboard.panel.data.alarmFilter',
            defaultMessage: 'Alarm filter',
          })}
        >
          <Space size={4} style={{ width: '100%' }}>
            <Select<string | null>
              size="small"
              style={{ flex: 1, minWidth: 0 }}
              value={
                typeof config.alarmFilterConfig === 'string'
                  ? config.alarmFilterConfig
                  : config.alarmFilterConfig == null
                    ? null
                    : '__inline__'
              }
              options={[
                {
                  value: null,
                  label: formatMessage({
                    id: 'editor.dashboard.panel.data.alarmFilterNone',
                    defaultMessage: 'No filter',
                  }),
                },
                ...Object.values(configuration.filters ?? {}).map((filter) => ({
                  value: filter.id,
                  label: filter.filter,
                })),
                ...(config.alarmFilterConfig != null &&
                typeof config.alarmFilterConfig === 'object'
                  ? [
                      {
                        value: '__inline__',
                        label: formatMessage({
                          id: 'editor.dashboard.panel.data.alarmFilterInline',
                          defaultMessage: 'Inline filter (from dashboard JSON)',
                        }),
                      },
                    ]
                  : []),
              ]}
              data-testid="panel-alarm-filter"
              onChange={(next) =>
                patchWidgetConfig(session, target.widgetId, {
                  alarmFilterConfig: next === '__inline__' ? null : next,
                })
              }
            />
            <Button
              size="small"
              data-testid="panel-alarm-filter-new"
              onClick={() => {
                dialogs.openDialog('filters', {
                  onSaved: (saved?: unknown) => {
                    const filter = saved as { id?: unknown } | undefined;
                    if (filter && typeof filter.id === 'string') {
                      patchWidgetConfig(session, target.widgetId, {
                        alarmFilterConfig: filter.id,
                      });
                    }
                  },
                });
              }}
            >
              {formatMessage({
                id: 'editor.dashboard.panel.data.alarmFilterNew',
                defaultMessage: 'New filter',
              })}
            </Button>
          </Space>
        </PanelRow>
      </div>
    );

  const datasourcesBlock =
    kind === 'data' ? (
      <DatasourcesEditor
        datasources={config.datasources ?? []}
        onChange={(next) =>
          patchWidgetConfig(session, target.widgetId, { datasources: next })
        }
        entityAliases={configuration.entityAliases ?? {}}
        aliasTrigger={aliasTrigger}
        testIdPrefix="panel-datasources"
      />
    ) : null;

  const alarmSourceBlock =
    kind === 'alarm' ? (
      <DatasourcesEditor
        datasources={[config.alarmSource as AlarmSource]}
        onChange={(next) => {
          const first = next[0];
          if (!first) {
            // TB keeps an alarmSource row; an emptied editor resets keys only.
            patchWidgetConfig(session, target.widgetId, {
              alarmSource: { type: 'alarm', dataKeys: [] },
            });
            return;
          }
          patchWidgetConfig(session, target.widgetId, {
            alarmSource: { ...first, type: 'alarm' } as AlarmSource,
          });
        }}
        entityAliases={configuration.entityAliases ?? {}}
        aliasTrigger={aliasTrigger}
        alarmMode
        testIdPrefix="panel-alarm-source"
      />
    ) : null;

  const targetDeviceBlock =
    kind !== 'rpc'
      ? null
      : (() => {
          const device = normalizeTargetDevice(config.targetDevice);
          return (
            <div data-testid="panel-target-device" style={{ marginBottom: 12 }}>
              <PanelRow
                label={formatMessage({
                  id: 'editor.dashboard.panel.data.targetDevice',
                  defaultMessage: 'Target device',
                })}
              >
                <Select<(typeof TARGET_DEVICE_TYPES)[number]>
                  size="small"
                  style={{ width: '100%' }}
                  value={device.type ?? 'device'}
                  options={TARGET_DEVICE_TYPES.map((type) => ({
                    value: type,
                    label: type,
                  }))}
                  data-testid="panel-target-device-type"
                  onChange={(next) =>
                    patchWidgetConfig(session, target.widgetId, {
                      targetDevice: { type: next } satisfies RpcTargetDevice,
                    })
                  }
                />
              </PanelRow>
              {device.type === 'entity' ? (
                <PanelRow
                  label={formatMessage({
                    id: 'editor.dashboard.panel.data.alias',
                    defaultMessage: 'Alias',
                  })}
                >
                  <Space size={4} style={{ width: '100%' }}>
                    <Select
                      size="small"
                      style={{ flex: 1, minWidth: 0 }}
                      value={device.entityAliasId}
                      allowClear
                      placeholder={formatMessage({
                        id: 'editor.dashboard.panel.data.aliasPlaceholder',
                        defaultMessage: 'Entity alias',
                      })}
                      options={entityAliasOptions}
                      data-testid="panel-target-device-alias"
                      onChange={(next) =>
                        patchWidgetConfig(session, target.widgetId, {
                          targetDevice: {
                            ...device,
                            type: 'entity',
                            entityAliasId: next,
                          },
                        })
                      }
                    />
                    <Button
                      size="small"
                      data-testid="panel-target-device-alias-new"
                      onClick={() =>
                        aliasTrigger.createAlias((aliasId) =>
                          patchWidgetConfig(session, target.widgetId, {
                            targetDevice: {
                              ...device,
                              type: 'entity',
                              entityAliasId: aliasId,
                            },
                          }),
                        )
                      }
                    >
                      {formatMessage({
                        id: 'editor.dashboard.panel.data.newAliasShort',
                        defaultMessage: 'New',
                      })}
                    </Button>
                  </Space>
                </PanelRow>
              ) : (
                <PanelRow
                  label={formatMessage({
                    id: 'editor.dashboard.panel.data.deviceId',
                    defaultMessage: 'Device',
                  })}
                >
                  <UndoSafeInput
                    value={
                      typeof device.deviceId === 'string' ? device.deviceId : ''
                    }
                    onEdit={(next) =>
                      patchWidgetConfig(session, target.widgetId, {
                        targetDevice: {
                          ...device,
                          type: 'device',
                          deviceId: next,
                        },
                      })
                    }
                    testId="panel-target-device-value"
                  />
                </PanelRow>
              )}
            </div>
          );
        })();

  const pageSizeBlock =
    kind === 'data' ? (
      <PanelRow
        label={formatMessage({
          id: 'editor.dashboard.panel.data.pageSize',
          defaultMessage: 'Page size',
        })}
      >
        <PanelNumber
          value={config.pageSize}
          min={1}
          onEdit={(next) =>
            patchWidgetConfig(session, target.widgetId, {
              pageSize: next ?? undefined,
            })
          }
          testId="panel-page-size"
        />
      </PanelRow>
    ) : null;

  return (
    <div data-testid="panel-section-data">
      {timewindowBlock}
      {alarmFilterBlock}
      {datasourcesBlock}
      {alarmSourceBlock}
      {targetDeviceBlock}
      {pageSizeBlock}
    </div>
  );
}
