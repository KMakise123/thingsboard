/**
 * Dashboard single-page (fullscreen) route `/dashboard/:dashboardId`
 * (brief §0.C): no app shell (layout:false), readonly, singlePageMode
 * chrome — the toolbar's fullscreen button becomes "exit".
 */
import { useLocation, useParams } from '@umijs/max';
import { Alert, Spin } from 'antd';
import { useIntl } from 'react-intl';

import { DashboardPage } from '@/components/dashboard/DashboardPage';
import { useDashboard } from '@/components/dashboard/use-dashboard';
import { serverErrorText } from '@/components/entities/server-error-text';
import { useAuthority } from '@/components/shared/use-authority';

export default function DashboardFullscreenPage() {
  const { dashboardId } = useParams<{ dashboardId: string }>();
  const location = useLocation();
  const { formatMessage } = useIntl();
  const { authority } = useAuthority();
  const reloadKey =
    new URLSearchParams(location.search).get('reload') ?? undefined;

  const { query, dashboard } = useDashboard(dashboardId);

  if (query.isPending) {
    return (
      <Spin
        style={{ display: 'block', margin: '25vh auto' }}
        tip={formatMessage({
          id: 'dashboards.page.loading',
          defaultMessage: 'Loading dashboard…',
        })}
      >
        <div style={{ minHeight: 120 }} />
      </Spin>
    );
  }
  if (query.isError) {
    return (
      <Alert
        style={{ margin: 24 }}
        type="error"
        showIcon
        message={serverErrorText(query.error)}
      />
    );
  }
  if (!dashboard) {
    return null;
  }
  return (
    <div style={{ padding: 12 }}>
      <DashboardPage
        dashboard={dashboard}
        singlePageMode
        isTenantAdmin={authority === 'TENANT_ADMIN'}
        reloadKey={reloadKey}
      />
    </div>
  );
}
