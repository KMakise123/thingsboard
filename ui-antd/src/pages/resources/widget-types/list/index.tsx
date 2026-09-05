/**
 * M11 波 1B 实现位 — wave-0 stub for the widget types list page.
 *
 * Title is passed explicitly (menu key + defaultMessage): PageContainer's
 * auto-resolution only handles dotted leaf names, not nested relative
 * names (pre-existing gap, also hits the settings family — reported to
 * the main session).
 */
import { useIntl } from 'react-intl';
import PageContainer from '@/components/layout/page-container';

export default function WidgetTypesListPage() {
  const { formatMessage } = useIntl();
  return (
    <PageContainer
      title={formatMessage({
        id: 'menu.resources.widgetTypes',
        defaultMessage: 'Widget types',
      })}
    />
  );
}
