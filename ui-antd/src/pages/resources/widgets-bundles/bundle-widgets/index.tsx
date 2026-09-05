/**
 * M11 波 1B 实现位 — wave-0 stub for the bundle widgets management page
 * (add/remove widget types in one widgets bundle). The route has no menu
 * name, so the title is passed explicitly until the real page lands.
 */
import { useIntl } from 'react-intl';
import PageContainer from '@/components/layout/page-container';

export default function BundleWidgetsPage() {
  const { formatMessage } = useIntl();
  return (
    <PageContainer
      title={formatMessage({
        id: 'pages.resources.bundleWidgets.title',
        defaultMessage: 'Bundle widgets',
      })}
    />
  );
}
