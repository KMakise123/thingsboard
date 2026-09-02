/**
 * Global alarms page (spec 3.6): ui-ngx /alarms/alarms parity as a tabbed
 * page. Tab state lives in the URL (?tab=, RouterTabs shape); the alarm
 * rules tab is tenant-admin only (CU sees the alarms tab alone). All filter
 * / page state is owned by useAlarmsPageUrlState and passed down so both
 * tabs write one URL.
 */
import { Tabs } from 'antd';
import { useIntl } from 'react-intl';
import PageContainer from '@/components/layout/page-container';
import { useAuthority } from '@/components/shared/use-authority';
import AlarmsTab from './alarms-tab';
import {
  type AlarmsTab as AlarmsTabId,
  useAlarmsPageUrlState,
} from './url-state';

export default function AlarmsPage() {
  const { formatMessage } = useIntl();
  const { state, patch } = useAlarmsPageUrlState();
  const { authority } = useAuthority();
  // alarm-rules is TA-only (spec 3.6): CU always lands on the alarms tab.
  const tab: AlarmsTabId = authority === 'CUSTOMER_USER' ? 'alarms' : state.tab;

  return (
    <PageContainer>
      <Tabs
        activeKey={tab}
        onChange={(key) => patch({ tab: key as AlarmsTabId })}
        items={[
          {
            key: 'alarms',
            label: formatMessage({
              id: 'pages.alarms.tabAlarms',
              defaultMessage: 'Alarms',
            }),
            children: <AlarmsTab state={state} patch={patch} />,
          },
        ]}
        destroyOnHidden
      />
    </PageContainer>
  );
}
