/**
 * DashboardToolbar — read-only toolbar subset (brief §1.5/§3; ui-ngx
 * dashboard-toolbar minus every edit element).
 *
 * Rendered elements (each gated by its settings flag):
 *   - state breadcrumbs (entity controller) or the state jump Select
 *     (default controller with >1 states);
 *   - global timewindow picker (showDashboardTimewindow, default on);
 *   - dashboards-select (showDashboardsSelect, default on; tenant admin
 *     only, not embedded);
 *   - right-layout switch on mobile when the state has a right layout;
 *   - export (showDashboardExport, default on; not embedded);
 *   - fullscreen toggle (shell page enters, fullscreen page exits);
 *   - collapse / expand button (toolbarAlwaysOpen seeds the initial state).
 *
 * Never rendered in v1: edit FAB, update-image, filters, entities-select,
 * powered-by footer (embedded only anyway).
 */
import {
  DownloadOutlined,
  ExpandOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  RightCircleOutlined,
  ShrinkOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { history } from '@umijs/max';
import { Button, Select, Space, Tooltip, Typography } from 'antd';
import { useIntl } from 'react-intl';

import { exportDashboard, getTenantDashboards } from '@/services/tb/dashboard';
import type { DashboardSettings } from '@/types/tb/dashboard';
import type { Timewindow } from '@/types/tb/timewindow';
import { TimewindowPicker } from './timewindow/TimewindowPicker';
import type { StateBreadcrumb } from './use-states-controller';

export interface DashboardToolbarProps {
  title: string;
  settings: DashboardSettings;
  dashboardId: string;
  /** global timewindow + change sink. */
  timewindow: Timewindow;
  onTimewindowChange: (next: Timewindow) => void;
  /** breadcrumbs of the active states controller. */
  breadcrumbs: Array<StateBreadcrumb>;
  /** entity controller: click crumb #i pops the stack; default: jump select. */
  onBreadcrumbClick?: (index: number) => void;
  onStateSelect?: (stateId: string) => void;
  stateOptions?: Array<{ id: string; name: string }>;
  onOpenState?: (stateId: string) => void;
  hasRightLayout: boolean;
  isMobile: boolean;
  showRightLayout: boolean;
  onToggleRightLayout: () => void;
  /** /dashboard/:id fullscreen page — renders "exit fullscreen". */
  singlePageMode: boolean;
  /** DashboardView embed (usage/gateways) — hides export/fullscreen/dashboards-select. */
  embedded: boolean;
  isTenantAdmin: boolean;
}

export function DashboardToolbar({
  title,
  settings,
  dashboardId,
  timewindow,
  onTimewindowChange,
  breadcrumbs,
  onBreadcrumbClick,
  onStateSelect,
  stateOptions,
  hasRightLayout,
  isMobile,
  showRightLayout,
  onToggleRightLayout,
  singlePageMode,
  embedded,
  isTenantAdmin,
}: DashboardToolbarProps) {
  const { formatMessage } = useIntl();

  const dashboardsSelect = useQuery({
    queryKey: ['dashboard', 'toolbarSelect'],
    queryFn: () =>
      getTenantDashboards({ pageSize: 20, page: 0, textSearch: '' }),
    enabled:
      isTenantAdmin && !embedded && settings.showDashboardsSelect !== false,
  });

  const onExport = async () => {
    const payload = await exportDashboard(dashboardId);
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title || 'dashboard'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Space
      wrap
      align="center"
      style={{ width: '100%', justifyContent: 'space-between' }}
    >
      <Space wrap align="center" size={4}>
        {breadcrumbs.map((crumb) => (
          <span
            key={`${crumb.id}:${crumb.name}:${crumb.index}`}
            style={{ display: 'inline' }}
          >
            {crumb.index > 0 ? (
              <Typography.Text type="secondary"> / </Typography.Text>
            ) : null}
            {breadcrumbs.length > 1 && crumb.index < breadcrumbs.length - 1 ? (
              <Button
                type="link"
                size="small"
                onClick={() => onBreadcrumbClick?.(crumb.index)}
              >
                {crumb.name || title}
              </Button>
            ) : (
              <Typography.Text strong>{crumb.name || title}</Typography.Text>
            )}
          </span>
        ))}
        {breadcrumbs.length === 1 &&
        stateOptions &&
        stateOptions.length > 1 &&
        onStateSelect ? (
          <Select<string>
            size="small"
            variant="borderless"
            value={breadcrumbs[0].id}
            onChange={onStateSelect}
            options={stateOptions.map((option) => ({
              value: option.id,
              label: option.name,
            }))}
          />
        ) : null}
      </Space>

      <Space wrap align="center" size={4}>
        {isMobile && hasRightLayout ? (
          <Button
            size="small"
            type={showRightLayout ? 'primary' : 'default'}
            icon={<RightCircleOutlined />}
            onClick={onToggleRightLayout}
          />
        ) : null}
        {settings.showDashboardTimewindow !== false ? (
          <TimewindowPicker value={timewindow} onChange={onTimewindowChange} />
        ) : null}
        {settings.showDashboardsSelect !== false &&
        !embedded &&
        isTenantAdmin ? (
          <Select
            showSearch
            allowClear
            size="small"
            style={{ minWidth: 160 }}
            placeholder={formatMessage({
              id: 'dashboards.toolbar.dashboardSelect',
              defaultMessage: 'Dashboards',
            })}
            optionFilterProp="label"
            options={(dashboardsSelect.data?.data ?? []).map((info) => ({
              value: info.id?.id,
              label: info.title,
            }))}
            onSearch={(search) => {
              void dashboardsSelect.refetch();
              void search;
            }}
            onSelect={(value) => {
              history.push(`/dashboards/${value}`);
            }}
          />
        ) : null}
        {settings.showDashboardExport !== false && !embedded ? (
          <Tooltip
            title={formatMessage({
              id: 'dashboards.toolbar.export',
              defaultMessage: 'Export dashboard',
            })}
          >
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => void onExport()}
            />
          </Tooltip>
        ) : null}
        {!embedded ? (
          <Tooltip
            title={
              singlePageMode
                ? formatMessage({
                    id: 'dashboards.toolbar.exitFullscreen',
                    defaultMessage: 'Exit fullscreen',
                  })
                : formatMessage({
                    id: 'dashboards.toolbar.fullscreen',
                    defaultMessage: 'Fullscreen',
                  })
            }
          >
            <Button
              size="small"
              icon={singlePageMode ? <ShrinkOutlined /> : <ExpandOutlined />}
              onClick={() =>
                history.push(
                  singlePageMode
                    ? `/dashboards/${dashboardId}`
                    : `/dashboard/${dashboardId}`,
                )
              }
            />
          </Tooltip>
        ) : null}
      </Space>
    </Space>
  );
}

/** Collapse/expand pair is exposed separately so the page owns the state. */
export function ToolbarCollapseToggle({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      size="small"
      type="text"
      icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
      onClick={onToggle}
    />
  );
}
