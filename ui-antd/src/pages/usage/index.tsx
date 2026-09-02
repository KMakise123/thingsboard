/**
 * Usage page (route `/usage`, brief §0.D) — W1 minimal face: fetch the
 * frontend asset api_usage.json and render it through DashboardView
 * (embedded, readonly).
 *
 * W3 owns this page's upgrade path (asset copy into public/static,
 * getUsageInfo card, page polish).
 */
import { useQuery } from '@tanstack/react-query';
import { Alert, Spin } from 'antd';

import { DashboardView } from '@/components/dashboard/DashboardView';
import { serverErrorText } from '@/components/entities/server-error-text';
import { useAuthority } from '@/components/shared/use-authority';
import { validateAndUpdateDashboard } from '@/core/dashboard/model';
import type { Dashboard } from '@/types/tb/dashboard';

const API_USAGE_ASSET = '/static/dashboard/api_usage.json';

export default function UsagePage() {
  const { authority } = useAuthority();

  const query = useQuery({
    queryKey: ['dashboard', 'usageAsset'],
    queryFn: async (): Promise<Dashboard> => {
      const response = await fetch(API_USAGE_ASSET);
      if (!response.ok) {
        throw Object.assign(new Error(`api_usage asset ${response.status}`), {
          status: response.status,
        });
      }
      return (await response.json()) as Dashboard;
    },
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
