import { useIntl } from 'react-intl';

import PageContainer from '@/components/layout/page-container';

/**
 * M12 recipients placeholder (spec §4.4) — replaced by the wave-3a page agent.
 */
export default function RecipientsPage() {
  const { formatMessage } = useIntl();
  return (
    <PageContainer
      title={formatMessage({
        id: 'menu.notifications.recipients',
        defaultMessage: 'Recipients',
      })}
    >
      <div data-testid="notifications-recipients-placeholder" />
    </PageContainer>
  );
}
