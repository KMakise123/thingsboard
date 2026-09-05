import { useIntl } from 'react-intl';

import PageContainer from '@/components/layout/page-container';

/**
 * M12 templates placeholder (spec §4.6) — replaced by the wave-3b page agent.
 */
export default function TemplatesPage() {
  const { formatMessage } = useIntl();
  return (
    <PageContainer
      title={formatMessage({
        id: 'menu.notifications.templates',
        defaultMessage: 'Templates',
      })}
    >
      <div data-testid="notifications-templates-placeholder" />
    </PageContainer>
  );
}
