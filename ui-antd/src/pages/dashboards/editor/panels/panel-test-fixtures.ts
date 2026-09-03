/**
 * Shared fixtures for the config-panel tests (M7 wave K). House pattern:
 * validateAndUpdateDashboard normalization + a real EditorSession over the
 * normalized baseline, zh-CN panel messages (labels render in Chinese —
 * interaction/assertion goes through data-testids).
 */
import { createIntl } from 'react-intl';

import { validateAndUpdateDashboard } from '@/core/dashboard/model';
import { EditorSession } from '@/core/editor/session';
import zhEditor from '@/locales/zh-CN/editor';
import zhEditorDashboard from '@/locales/zh-CN/editor-dashboard';
import zhPanel from '@/locales/zh-CN/editor-dashboard-panel';
import type { Dashboard, DashboardConfiguration } from '@/types/tb/dashboard';

export const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhEditor, ...zhEditorDashboard, ...zhPanel },
});

export function dataDashboardJson(): Dashboard {
  return {
    id: { entityType: 'DASHBOARD', id: 'd1' },
    title: 'Demo',
    configuration: {
      timewindow: {
        selectedTab: 'REALTIME',
        realtime: { timewindowMs: 60_000 },
      },
      widgets: {
        w1: {
          typeFullFqn: 'system.time_series_chart',
          config: {
            title: 'Old title',
            useDashboardTimewindow: true,
            datasources: [
              {
                type: 'entity',
                entityAliasId: 'alias1',
                dataKeys: [
                  {
                    name: 'temperature',
                    type: 'timeseries',
                    label: 'temperature',
                    color: '#2196f3',
                  },
                ],
              },
            ],
            settings: { customKey: { nested: 1 } },
          },
        },
        wAlarm: {
          typeFullFqn: 'system.alarm_widgets.alarms_table',
          config: {
            alarmSource: {
              type: 'alarm',
              dataKeys: [
                { name: 'severity', type: 'alarm', label: 'Severity' },
              ],
            },
          },
        },
        wRpc: {
          typeFullFqn: 'system.input_widgets.update_multiple_attributes',
          config: {
            targetDevice: { type: 'device', deviceId: 'device-1' },
          },
        },
      },
      states: {
        default: {
          name: 'Root',
          root: true,
          layouts: {
            main: {
              widgets: {
                w1: { sizeX: 4, sizeY: 3, row: 0, col: 0 },
                wAlarm: { sizeX: 4, sizeY: 3, row: 0, col: 4 },
                wRpc: { sizeX: 4, sizeY: 3, row: 0, col: 8 },
              },
              gridSettings: { columns: 24, margin: 10 },
            },
          },
        },
      },
      entityAliases: {
        alias1: {
          id: 'alias1',
          alias: 'Thermostats',
          filter: { type: 'deviceType' },
        },
      },
      filters: {
        f1: { id: 'f1', filter: 'High alarms', keyFilters: [] },
      },
    },
  } as unknown as Dashboard;
}

/** Layout whose main layout carries one non-default breakpoint copy. */
export function breakpointDashboardJson(): Dashboard {
  const json = dataDashboardJson();
  const main = (
    (json.configuration as DashboardConfiguration).states.default as {
      layouts: { main: Record<string, unknown> };
    }
  ).layouts.main;
  main.breakpoints = {
    lg: {
      widgets: {
        w1: { sizeX: 8, sizeY: 4, row: 0, col: 0, mobileHide: true },
      },
      gridSettings: { columns: 12, margin: 4 },
    },
  };
  return json;
}

/** Layout with gridSettings.layoutType 'scada' AND a breakpoint copy. */
export function scadaDashboardJson(): Dashboard {
  const json = breakpointDashboardJson();
  const main = (
    (json.configuration as DashboardConfiguration).states.default as {
      layouts: { main: { gridSettings: Record<string, unknown> } };
    }
  ).layouts.main;
  main.gridSettings = { columns: 24, margin: 10, layoutType: 'scada' };
  return json;
}

export interface PanelTestSetup {
  session: EditorSession<DashboardConfiguration>;
  configuration: DashboardConfiguration;
}

export function setupPanelSession(
  json: Dashboard = dataDashboardJson(),
): PanelTestSetup {
  const configuration = validateAndUpdateDashboard(json)
    .configuration as DashboardConfiguration;
  const session = new EditorSession<DashboardConfiguration>({
    baseline: configuration,
  });
  return { session, configuration };
}

/** Deep-ish JSON read for assertions on the (frozen) live draft. */
export function configOf(setup: PanelTestSetup): {
  [key: string]: unknown;
  datasources?: Array<Record<string, unknown>>;
} {
  return setup.session.current.widgets.w1.config as never;
}
