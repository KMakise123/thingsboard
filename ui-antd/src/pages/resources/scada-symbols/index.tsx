/**
 * SCADA symbols library page (routes /resources/scada-symbols, M11 wave-2C
 * — spec §3.3 library-list part). The gallery in its SCADA form: symbol
 * wording, SVG metadata title prefill on upload (the page-scoped light
 * reader below — the full parser ships with the editor wave 2D), and row
 * click / upload success jumping into the editor route
 * /resources/scada-symbols/{type}/{key} (ui-ngx image-gallery
 * editImage/uploadImage navigation parity).
 *
 * Title is passed explicitly (menu key + defaultMessage): PageContainer's
 * auto-resolution only handles dotted leaf names, not nested relative
 * names (pre-existing gap, also hits the settings family — reported to
 * the main session).
 */
import { history } from '@umijs/max';
import { useIntl } from 'react-intl';
import { ImageGallery } from '@/components/images/image-gallery';
import PageContainer from '@/components/layout/page-container';
import { imageResourceType } from '@/services/tb/image';
import type { ImageResourceInfo } from '@/types/tb/image';
import { ResourceSubType } from '@/types/tb/resource';

import { extractScadaSymbolTitleFromFile } from './svg-metadata-title';

function editorRoute(image: ImageResourceInfo): string {
  return `/resources/scada-symbols/${imageResourceType(image)}/${encodeURIComponent(image.resourceKey ?? '')}`;
}

export default function ScadaSymbolsPage() {
  const { formatMessage } = useIntl();
  return (
    <PageContainer
      title={formatMessage({
        id: 'menu.resources.scadaSymbols',
        defaultMessage: 'SCADA symbols',
      })}
    >
      <ImageGallery
        imageSubType={ResourceSubType.SCADA_SYMBOL}
        extractUploadTitle={extractScadaSymbolTitleFromFile}
        onEditImage={(image) => history.push(editorRoute(image))}
        onUploadSuccess={(image) => history.push(editorRoute(image))}
      />
    </PageContainer>
  );
}
