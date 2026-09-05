/**
 * Images library page (routes /resources/images, M11 wave-2C — spec §3.2).
 * A thin shell over the shared gallery pinned to the IMAGE sub-type; all
 * behaviors live in components/images.
 *
 * Title is passed explicitly (menu key + defaultMessage): PageContainer's
 * auto-resolution only handles dotted leaf names, not nested relative
 * names (pre-existing gap, also hits the settings family — reported to
 * the main session).
 */
import { useIntl } from 'react-intl';
import { ImageGallery } from '@/components/images/image-gallery';
import PageContainer from '@/components/layout/page-container';
import { ResourceSubType } from '@/types/tb/resource';

export default function ImagesPage() {
  const { formatMessage } = useIntl();
  return (
    <PageContainer
      title={formatMessage({
        id: 'menu.resources.images',
        defaultMessage: 'Images',
      })}
    >
      <ImageGallery imageSubType={ResourceSubType.IMAGE} />
    </PageContainer>
  );
}
