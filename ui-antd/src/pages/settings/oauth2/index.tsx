/**
 * System settings → OAuth2 page (spec 3.7): the ui-ngx oauth2 router-tabs
 * collapsed into one AntD page — Domains (sys-admin scope) and Clients.
 * The active tab lives in `?tab=` (shared detail-tab factory) so a
 * bookmark lands on the same section.
 */
import { Card, Tabs } from 'antd';
import { useIntl } from 'react-intl';
import { createDetailTabUrlState } from '@/components/entities/detail/url-state';
import ClientsTab from './clients-tab';
import DomainsTab from './domains-tab';

const OAUTH2_TABS = ['domains', 'clients'] as const;
type Oauth2Tab = (typeof OAUTH2_TABS)[number];

const { useDetailTabUrlState } = createDetailTabUrlState<Oauth2Tab>(
  OAUTH2_TABS,
  'domains',
);

export default function SettingsOauth2Page() {
  const { formatMessage } = useIntl();
  const { tab, setTab } = useDetailTabUrlState();

  return (
    <Card>
      <Tabs
        activeKey={tab}
        onChange={(key) => setTab(key as Oauth2Tab)}
        destroyOnHidden
        items={[
          {
            key: 'domains',
            label: formatMessage({
              id: 'pages.settings.oauth2.domains',
              defaultMessage: 'Domains',
            }),
            children: <DomainsTab />,
          },
          {
            key: 'clients',
            label: formatMessage({
              id: 'pages.settings.oauth2.clients',
              defaultMessage: 'Clients',
            }),
            children: <ClientsTab />,
          },
        ]}
      />
    </Card>
  );
}
