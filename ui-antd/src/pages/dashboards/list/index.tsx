/**
 * Dashboards list route target (`/dashboards`, menu entry, brief §0.A).
 *
 * W3 dash-list owns the real face (table + operations + import/export +
 * customer scope). This placeholder only guarantees the W1 menu item and
 * route resolve to a viewable page in the interim.
 */
import { Alert } from 'antd';
import { useIntl } from 'react-intl';

import PageContainer from '@/components/layout/page-container';

export default function DashboardsListPage() {
  const { formatMessage } = useIntl();
  return (
    <PageContainer>
      <Alert
        type="info"
        showIcon
        message={formatMessage({
          id: 'dashboards.list.placeholder',
          defaultMessage: 'The dashboards list lands with the dash-list wave',
        })}
      />
    </PageContainer>
  );
}
