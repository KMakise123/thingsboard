/**
 * Dashboard read-only page inside the app shell (route `/dashboards/:dashboardId`,
 * brief §0.B / §1.5). Loads + normalizes the dashboard, renders
 * DashboardPage with the full readonly toolbar (timewindow / export /
 * fullscreen / dashboards-select).
 */
import { history, useLocation, useParams } from '@umijs/max';
import { Alert, Spin } from 'antd';
import { useEffect } from 'react';
import { useIntl } from 'react-intl';
import { DashboardPage } from '@/components/dashboard/DashboardPage';
import { useDashboard } from '@/components/dashboard/use-dashboard';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import { useAuthority } from '@/components/shared/use-authority';

export default function DashboardsViewPage() {
  const { dashboardId } = useParams<{ dashboardId: string }>();
  const location = useLocation();
  const { formatMessage } = useIntl();
  const { authority } = useAuthority();
  const reloadKey =
    new URLSearchParams(location.search).get('reload') ?? undefined;

  const { query, dashboard } = useDashboard(dashboardId);

  // Empty dashboard auto-enters edit mode (spec §3.1) — tenant admins only;
  // the fullscreen route stays a pure display surface.
  useEffect(() => {
    if (
      authority === 'TENANT_ADMIN' &&
      dashboard &&
      Object.keys(dashboard.configuration?.widgets ?? {}).length === 0
    ) {
      history.replace(`/dashboards/${dashboardId}/editor`);
    }
  }, [authority, dashboard, dashboardId]);

  return (
    <PageContainer
      breadcrumbLabel={dashboard?.title}
      onBack={() => history.back()}
    >
      {query.isPending ? (
        <Spin
          style={{ display: 'block', margin: '64px auto' }}
          tip={formatMessage({
            id: 'dashboards.page.loading',
            defaultMessage: 'Loading dashboard…',
          })}
        >
          <div style={{ minHeight: 120 }} />
        </Spin>
      ) : query.isError ? (
        <Alert type="error" showIcon message={serverErrorText(query.error)} />
      ) : dashboard ? (
        <DashboardPage
          dashboard={dashboard}
          isTenantAdmin={authority === 'TENANT_ADMIN'}
          reloadKey={reloadKey}
        />
      ) : null}
    </PageContainer>
  );
}
