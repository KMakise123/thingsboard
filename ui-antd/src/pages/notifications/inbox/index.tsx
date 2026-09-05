import { useIntl } from 'react-intl';

import PageContainer from '@/components/layout/page-container';

/**
 * M12 inbox placeholder (spec §4.1) — replaced by the wave-3b page agent.
 */
export default function InboxPage() {
  const { formatMessage } = useIntl();
  return (
    <PageContainer
      title={formatMessage({
        id: 'menu.notifications.inbox',
        defaultMessage: 'Inbox',
      })}
    >
      <div data-testid="notifications-inbox-placeholder" />
    </PageContainer>
  );
}
