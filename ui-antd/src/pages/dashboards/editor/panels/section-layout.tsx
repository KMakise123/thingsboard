/**
 * Layout section (spec §3.4 slot 5): edits the widget's WidgetLayout via
 * updateWidgetLayout (breakpoint copies via the panel's inline recipe).
 *
 * Visibility matrix (spec 勘误定稿):
 *  - default breakpoint → resizable + preserveAspectRatio;
 *  - non-default breakpoints → mobile/list group (mobileHide / desktopHide /
 *    mobileOrder / mobileHeight) — the pair above stays visible too
 *    (等价底线: nothing removable);
 *  - scada layout (gridSettings.layoutType) → ONLY the resize pair, the
 *    breakpoint group is structurally absent.
 */
import { Segmented, Typography } from 'antd';
import { useState } from 'react';
import { useIntl } from 'react-intl';

import { writeDraft } from '@/core/editor/dashboard-draft';
import type { EditorSession } from '@/core/editor/session';
import type {
  DashboardBreakpointId,
  DashboardConfiguration,
} from '@/types/tb/dashboard';
import { PanelNumber, PanelRow, PanelSwitch } from './panel-fields';
import type { PanelSectionProps } from './section-data';
import {
  breakpointLayoutOf,
  panelGridSettingsOf,
  panelLayoutOf,
  updateWidgetBreakpointLayout,
} from './panel-target';

export function SectionLayout({
  session,
  configuration,
  target,
  widget,
}: PanelSectionProps) {
  const { formatMessage } = useIntl();
  const [breakpoint, setBreakpoint] = useState<DashboardBreakpointId>('default');

  const layout = panelLayoutOf(configuration, target);
  const gridSettings = panelGridSettingsOf(configuration, target);
  const isScada = gridSettings?.layoutType === 'scada';
  const breakpointIds = Object.keys(
    configuration.states[target.stateId]?.layouts[target.layoutId]
      ?.breakpoints ?? {},
  ) as DashboardBreakpointId[];

  const patchDefault = (patch: Record<string, unknown>) => {
    writeDraft(
      session,
      // updateWidgetLayout merges the non-geometry flag set on the default
      // placement entry; coalesceKey intentionally absent (discrete switches).
      {
        label: 'update widget layout',
        recipe: (draft: DashboardConfiguration) => {
          const entry =
            draft.states[target.stateId]?.layouts[target.layoutId]?.widgets[
              target.widgetId
            ];
          if (!entry) {
            throw new Error('widget layout entry disappeared');
          }
          Object.assign(entry, patch);
        },
      },
    );
  };

  const patchBreakpoint = (patch: Record<string, unknown>) => {
    writeDraft(
      session,
      updateWidgetBreakpointLayout({
        widgetId: target.widgetId,
        stateId: target.stateId,
        layoutId: target.layoutId,
        breakpoint,
        patch,
      }),
    );
  };

  const activeLayout =
    breakpoint === 'default'
      ? layout
      : breakpointLayoutOf(configuration, target, breakpoint);

  return (
    <div data-testid="panel-section-layout">
      <Typography.Text strong style={{ fontSize: 12 }}>
        {formatMessage({
          id: 'editor.dashboard.panel.layout.resizeOptions',
          defaultMessage: 'Resize options',
        })}
      </Typography.Text>
      <PanelSwitch
        label={formatMessage({
          id: 'editor.dashboard.panel.layout.resizable',
          defaultMessage: 'Resizable',
        })}
        checked={layout?.resizable !== false}
        testId="panel-layout-resizable"
        onEdit={(next) => patchDefault({ resizable: next })}
      />
      <PanelSwitch
        label={formatMessage({
          id: 'editor.dashboard.panel.layout.preserveAspectRatio',
          defaultMessage: 'Preserve aspect ratio',
        })}
        checked={layout?.preserveAspectRatio === true}
        testId="panel-layout-preserve-aspect-ratio"
        onEdit={(next) => patchDefault({ preserveAspectRatio: next })}
      />

      {!isScada ? (
        <>
          {breakpointIds.length > 0 ? (
            <div style={{ margin: '8px 0' }}>
              <Segmented<DashboardBreakpointId | string>
                size="small"
                block
                value={breakpoint}
                options={[
                  { value: 'default', label: 'default' },
                  ...breakpointIds.map((id) => ({ value: id, label: id })),
                ]}
                data-testid="panel-layout-breakpoint"
                onChange={(next) => setBreakpoint(next as DashboardBreakpointId)}
              />
            </div>
          ) : null}
          {breakpoint !== 'default' ? (
            <div data-testid="panel-layout-mobile-group">
              <Typography.Text strong style={{ fontSize: 12 }}>
                {formatMessage({
                  id: 'editor.dashboard.panel.layout.mobileGroup',
                  defaultMessage: 'Mobile / list layout',
                })}
              </Typography.Text>
              <PanelSwitch
                label={formatMessage({
                  id: 'editor.dashboard.panel.layout.mobileHide',
                  defaultMessage: 'Hide on mobile',
                })}
                checked={activeLayout?.mobileHide === true}
                testId="panel-layout-mobile-hide"
                onEdit={(next) => patchBreakpoint({ mobileHide: next })}
              />
              <PanelSwitch
                label={formatMessage({
                  id: 'editor.dashboard.panel.layout.desktopHide',
                  defaultMessage: 'Hide on desktop',
                })}
                checked={activeLayout?.desktopHide === true}
                testId="panel-layout-desktop-hide"
                onEdit={(next) => patchBreakpoint({ desktopHide: next })}
              />
              <PanelRow
                label={formatMessage({
                  id: 'editor.dashboard.panel.layout.mobileOrder',
                  defaultMessage: 'Mobile order',
                })}
              >
                <PanelNumber
                  value={activeLayout?.mobileOrder}
                  onEdit={(next) =>
                    patchBreakpoint({ mobileOrder: next ?? undefined })
                  }
                  testId="panel-layout-mobile-order"
                />
              </PanelRow>
              <PanelRow
                label={formatMessage({
                  id: 'editor.dashboard.panel.layout.mobileHeight',
                  defaultMessage: 'Mobile height',
                })}
              >
                <PanelNumber
                  value={activeLayout?.mobileHeight}
                  min={1}
                  onEdit={(next) =>
                    patchBreakpoint({ mobileHeight: next ?? undefined })
                  }
                  testId="panel-layout-mobile-height"
                />
              </PanelRow>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
