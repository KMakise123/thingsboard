/**
 * DashboardPage — the read-only dashboard renderer (brief §1.5, ui-ngx
 * dashboard-page.component v1 subset).
 *
 * Wires the M5 runtime together:
 *   states controller (default/entity) → current state layouts →
 *   TbGridLayout (desktop side-by-side main/right, mobile single stack with
 *   a toolbar fold for the right layout) → WidgetContainer per cell.
 *
 * Alias resolution re-runs on dashboard load, `?reload` (reloadKey prop),
 * and every state change (entity controller pops swap the state entity).
 *
 * v1 is strictly read-only: no edit FAB, no update-image, no filters or
 * entities-select, no dashboardCss injection (registered omission).
 */
import { Alert, Space, Typography } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { WidgetContainer } from '@/components/widgets/WidgetContainer';
import {
  type AliasResolution,
  resolveEntityAliases,
} from '@/core/dashboard/alias-resolver';
import type { StatesControllerMode } from '@/core/dashboard/states';
import type { Dashboard, DashboardLayout } from '@/types/tb/dashboard';
import {
  createDefaultDashboardTimewindow,
  type Timewindow,
} from '@/types/tb/timewindow';
import { DashboardToolbar, ToolbarCollapseToggle } from './DashboardToolbar';
import { TbGridLayout } from './grid/grid-layout';
import { useIsMobile } from './use-is-mobile';
import { useStatesController } from './use-states-controller';

export interface DashboardPageProps {
  /** validated dashboard (validateAndUpdateDashboard applied upstream). */
  dashboard: Dashboard;
  /** DashboardView embed (usage/gateways): readonly, minimal chrome. */
  embedded?: boolean;
  /** /dashboard/:id single-page (fullscreen) mode. */
  singlePageMode?: boolean;
  /** TENANT_ADMIN flag for toolbar affordances. */
  isTenantAdmin?: boolean;
  /** change key from the URL `?reload` param (forces alias re-resolution). */
  reloadKey?: string;
}

export function DashboardPage({
  dashboard,
  embedded = false,
  singlePageMode = false,
  isTenantAdmin = false,
  reloadKey,
}: DashboardPageProps) {
  const { formatMessage } = useIntl();
  const isMobile = useIsMobile();
  const configuration = dashboard.configuration;
  const settings = configuration?.settings ?? {};

  const mode: StatesControllerMode =
    settings.stateControllerId === 'default' ? 'default' : 'entity';
  const states = useStatesController({
    states: configuration?.states ?? {},
    mode,
  });

  const [timewindow, setTimewindow] = useState<Timewindow>(() =>
    createDefaultDashboardTimewindow(),
  );
  // adopt the dashboard timewindow when a different dashboard loads
  useEffect(() => {
    setTimewindow(
      configuration?.timewindow ?? createDefaultDashboardTimewindow(),
    );
  }, [configuration]);

  const [aliases, setAliases] = useState<AliasResolution>({});
  const [aliasError, setAliasError] = useState(false);
  const stateEntityKey = JSON.stringify(
    states.currentStateParams.entityId ?? null,
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: stateEntityKey covers every field of states.currentStateParams the resolver reads; reloadKey forces re-parse on ?reload
  useEffect(() => {
    if (!configuration) {
      return;
    }
    let cancelled = false;
    setAliasError(false);
    resolveEntityAliases({
      entityAliases: configuration.entityAliases,
      stateParams: states.currentStateParams,
    }).then(
      (resolution) => {
        if (!cancelled) {
          setAliases(resolution);
        }
      },
      () => {
        if (!cancelled) {
          setAliasError(true);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [configuration, stateEntityKey, reloadKey]);

  const [collapsed, setCollapsed] = useState(
    settings.toolbarAlwaysOpen === false,
  );
  const [showRightLayout, setShowRightLayout] = useState(false);

  const hasWidgets = useMemo(
    () => Object.keys(configuration?.widgets ?? {}).length > 0,
    [configuration],
  );

  if (!configuration) {
    return (
      <Alert
        type="warning"
        showIcon
        message={formatMessage({
          id: 'dashboards.page.emptyConfiguration',
          defaultMessage: 'This dashboard has no configuration yet',
        })}
      />
    );
  }

  const currentState = configuration.states[states.currentStateId];

  const renderLayout = (layout: DashboardLayout) => (
    <TbGridLayout
      layout={layout}
      widgets={configuration.widgets}
      isMobile={isMobile}
      backgroundColor={layout.gridSettings?.backgroundColor}
      backgroundImageUrl={layout.gridSettings?.backgroundImageUrl ?? null}
      renderWidget={(widgetId) => {
        const widget = configuration.widgets[widgetId];
        const widgetLayout = layout.widgets[widgetId];
        if (!widget || !widgetLayout) {
          return null;
        }
        return (
          <WidgetContainer
            widgetId={widgetId}
            widget={widget}
            layout={widgetLayout}
            dashboardTimewindow={timewindow}
            aliases={aliases}
            filters={configuration.filters}
            states={states}
            isMobile={isMobile}
          />
        );
      }}
    />
  );

  const mainLayout = currentState?.layouts?.main;
  const rightLayout = currentState?.layouts?.right;

  const gridArea = (() => {
    if (!mainLayout) {
      return (
        <Alert
          type="warning"
          showIcon
          message={formatMessage({
            id: 'dashboards.page.emptyState',
            defaultMessage: 'This page has no layout yet',
          })}
        />
      );
    }
    if (isMobile) {
      // mobile: the right layout folds behind the toolbar switch
      const useRight = showRightLayout && Boolean(rightLayout);
      const active = useRight ? (rightLayout as DashboardLayout) : mainLayout;
      return renderLayout(active);
    }
    if (rightLayout) {
      return (
        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
          <div style={{ flex: 1, minWidth: 0 }}>{renderLayout(mainLayout)}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {renderLayout(rightLayout)}
          </div>
        </div>
      );
    }
    return renderLayout(mainLayout);
  })();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minHeight: '100%',
      }}
      data-dashboard-page={dashboard.id?.id}
      data-dashboard-readonly="true"
    >
      {settings.showTitle ? (
        <Typography.Title
          level={4}
          style={{ color: settings.titleColor, margin: 0 }}
        >
          {dashboard.title}
        </Typography.Title>
      ) : null}

      {settings.hideToolbar ? null : collapsed ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <ToolbarCollapseToggle
            collapsed
            onToggle={() => setCollapsed(false)}
          />
        </div>
      ) : (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginBottom: 4,
            }}
          >
            <ToolbarCollapseToggle
              collapsed={false}
              onToggle={() => setCollapsed(true)}
            />
          </div>
          <DashboardToolbar
            title={dashboard.title}
            settings={settings}
            dashboardId={dashboard.id?.id ?? ''}
            timewindow={timewindow}
            onTimewindowChange={setTimewindow}
            breadcrumbs={states.breadcrumbs}
            onBreadcrumbClick={(index) => states.navigatePrev(index)}
            onStateSelect={(stateId) => states.openState(stateId)}
            stateOptions={
              mode === 'default'
                ? Object.entries(configuration.states).map(([id, state]) => ({
                    id,
                    name: state.name,
                  }))
                : undefined
            }
            hasRightLayout={Boolean(rightLayout)}
            isMobile={isMobile}
            showRightLayout={showRightLayout}
            onToggleRightLayout={() => setShowRightLayout((value) => !value)}
            singlePageMode={singlePageMode}
            embedded={embedded}
            isTenantAdmin={isTenantAdmin}
          />
        </div>
      )}

      {aliasError ? (
        <Alert
          type="warning"
          showIcon
          message={formatMessage({
            id: 'dashboards.page.aliasError',
            defaultMessage: 'Some data sources failed to resolve',
          })}
        />
      ) : null}

      {hasWidgets ? (
        <Space orientation="vertical" style={{ width: '100%' }}>
          {gridArea}
        </Space>
      ) : (
        <Alert
          type="info"
          showIcon
          message={formatMessage({
            id: 'dashboards.page.noWidgets',
            defaultMessage: 'This dashboard has no widgets yet',
          })}
        />
      )}
    </div>
  );
}
