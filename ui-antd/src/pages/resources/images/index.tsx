/**
 * M11 波 2C 实现位 — wave-0 stub for the images gallery page.
 *
 * Title is passed explicitly (menu key + defaultMessage): PageContainer's
 * auto-resolution only handles dotted leaf names, not nested relative
 * names (pre-existing gap, also hits the settings family — reported to
 * the main session).
 */
import { useIntl } from 'react-intl';
import PageContainer from '@/components/layout/page-container';

export default function ImagesPage() {
  const { formatMessage } = useIntl();
  return (
    <PageContainer
      title={formatMessage({
        id: 'menu.resources.images',
        defaultMessage: 'Images',
      })}
    />
  );
}
