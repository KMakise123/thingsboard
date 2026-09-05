/**
 * M11 波 2D 实现位 — wave-0 stub for the SCADA symbol editor page (the
 * svg.js canvas + metadata tabs). The route has no menu name, so the title
 * is passed explicitly until the real editor lands.
 */
import { useIntl } from 'react-intl';
import PageContainer from '@/components/layout/page-container';

export default function ScadaSymbolEditorPage() {
  const { formatMessage } = useIntl();
  return (
    <PageContainer
      title={formatMessage({
        id: 'pages.resources.scadaSymbolEditor.title',
        defaultMessage: 'SCADA symbol editor',
      })}
    />
  );
}
