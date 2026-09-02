/**
 * Usage page (route `/usage`, brief §0.D): fetch the frontend asset
 * api_usage.json (verbatim copy of the ui-ngx asset, public/static/
 * dashboard/) and render it through DashboardView (embedded, readonly) —
 * 11 states, 31 widget entries; system.api_usage renders through the ADR
 * 0003 placeholder (registered omission).
 */
import { ReloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Spin } from 'antd';
import { useIntl } from 'react-intl';

import { DashboardView } from '@/components/dashboard/DashboardView';
import { serverErrorText } from '@/components/entities/server-error-text';
import { useAuthority } from '@/components/shared/use-authority';
import { validateAndUpdateDashboard } from '@/core/dashboard/model';
import type { Dashboard } from '@/types/tb/dashboard';

const API_USAGE_ASSET = '/static/dashboard/api_usage.json';

export default function UsagePage() {
  const { authority } = useAuthority();
  const { formatMessage } = useIntl();

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
    retry: false,
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
        message={formatMessage({
          id: 'dashboards.system.loadFailed',
          defaultMessage: 'Failed to load the system dashboard.',
        })}
        description={serverErrorText(query.error)}
        action={
          <Button
            size="small"
            danger
            icon={<ReloadOutlined />}
            onClick={() => void query.refetch()}
          >
            {formatMessage({
              id: 'dashboards.system.retry',
              defaultMessage: 'Retry',
            })}
          </Button>
        }
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
