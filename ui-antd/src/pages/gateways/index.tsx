/**
 * Gateways system-dashboard page (route `/entities/gateways`, brief §0.E):
 * fetch GET /api/resource/dashboard/system/gateways_dashboard.json (the
 * backend TbResource system dashboard — live-verified 200 application/json)
 * and render it through DashboardView (embedded, readonly). A missing
 * resource (404) surfaces its own message — the brief's fallback would only
 * trigger on a 404/non-JSON backend, which the live check did not hit.
 */
import { ReloadOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Spin } from 'antd';
import { useIntl } from 'react-intl';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { serverErrorText } from '@/components/entities/server-error-text';
import { useAuthority } from '@/components/shared/use-authority';
import { validateAndUpdateDashboard } from '@/core/dashboard/model';
import { getSystemResourceDashboard } from '@/services/tb/dashboard';
import type { Dashboard } from '@/types/tb/dashboard';

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error as { status?: unknown }).status === 404
  );
}

export default function GatewaysPage() {
  const { authority } = useAuthority();
  const { formatMessage } = useIntl();

  const query = useQuery({
    queryKey: ['dashboard', 'gatewaysSystemResource'],
    queryFn: () => getSystemResourceDashboard('gateways_dashboard.json'),
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
        message={
          isNotFound(query.error)
            ? formatMessage({
                id: 'dashboards.system.resourceMissing',
                defaultMessage:
                  'The system dashboard resource is missing on this backend.',
              })
            : formatMessage({
                id: 'dashboards.system.loadFailed',
                defaultMessage: 'Failed to load the system dashboard.',
              })
        }
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
