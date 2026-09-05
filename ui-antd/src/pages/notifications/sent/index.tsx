import { useIntl } from 'react-intl';

import PageContainer from '@/components/layout/page-container';

/**
 * M12 sent placeholder (spec §4.3) — replaced by the wave-3a page agent.
 */
export default function SentPage() {
  const { formatMessage } = useIntl();
  return (
    <PageContainer
      title={formatMessage({
        id: 'menu.notifications.sent',
        defaultMessage: 'Sent',
      })}
    >
      <div data-testid="notifications-sent-placeholder" />
    </PageContainer>
  );
}
