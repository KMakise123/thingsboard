/**
 * Gateways system-dashboard page (route `/entities/gateways`, brief §0.E) —
 * W1 minimal face: fetch GET
 * /api/resource/dashboard/system/gateways_dashboard.json and render through
 * DashboardView (embedded, readonly).
 *
 * W3 owns the upgrade (404 fallback deliberation, polish) per brief §2.
 */
import { useQuery } from '@tanstack/react-query';
import { Alert, Spin } from 'antd';

import { DashboardView } from '@/components/dashboard/DashboardView';
import { serverErrorText } from '@/components/entities/server-error-text';
import { useAuthority } from '@/components/shared/use-authority';
import { validateAndUpdateDashboard } from '@/core/dashboard/model';
import { getSystemResourceDashboard } from '@/services/tb/dashboard';

export default function GatewaysPage() {
  const { authority } = useAuthority();

  const query = useQuery({
    queryKey: ['dashboard', 'gatewaysSystemResource'],
    queryFn: () => getSystemResourceDashboard('gateways_dashboard.json'),
    staleTime: Number.POSITIVE_INFINITY,
  });

  if (query.isPending) {
    return <Spin style={{ display: 'block', margin: '25vh auto' }} />;
  }
  if (query.isError || !query.data) {
    return (
      <Alert
        style={{ margin: 24 }}
        type="error"
        showIcon
        message={serverErrorText(query.error)}
      />
    );
  }
  const dashboard = validateAndUpdateDashboard(query.data);
  return (
    <DashboardView
      dashboard={dashboard}
      isTenantAdmin={authority === 'TENANT_ADMIN'}
    />
  );
}
