import { useIntl } from 'react-intl';

import PageContainer from '@/components/layout/page-container';

/**
 * M12 rules placeholder (spec §4.5) — replaced by the wave-3a page agent.
 */
export default function RulesPage() {
  const { formatMessage } = useIntl();
  return (
    <PageContainer
      title={formatMessage({
        id: 'menu.notifications.rules',
        defaultMessage: 'Rules',
      })}
    >
      <div data-testid="notifications-rules-placeholder" />
    </PageContainer>
  );
}
