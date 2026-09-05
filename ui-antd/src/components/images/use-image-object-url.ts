/**
 * Authenticated image display (M11 wave-2C).
 *
 * The TB image endpoints require the Authorization header, so <img src>
 * must NEVER point at them directly. This hook resolves an image link into
 * a blob objectURL for the lifetime of the consuming component:
 *   - the network fetch is shared/deduped by the transport layer
 *     (services/tb/image.ts loadImageBlob in-flight map);
 *   - each hook instance creates its OWN objectURL and revokes it when the
 *     link changes or the component unmounts.
 * Load failures keep the upstream 1×1 transparent-GIF placeholder
 * (ui-ngx NO_IMAGE_DATA_URI parity) so cells never break.
 */
import { useEffect, useState } from 'react';

import { loadImageBlob } from '@/services/tb/image';

export const NO_IMAGE_DATA_URI =
  'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

export function useImageObjectUrl(
  link: string | undefined,
  preview = false,
): string {
  const [url, setUrl] = useState<string>(NO_IMAGE_DATA_URI);

  useEffect(() => {
    if (!link) {
      setUrl(NO_IMAGE_DATA_URI);
      return undefined;
    }
    let cancelled = false;
    let created: string | undefined;
    setUrl(NO_IMAGE_DATA_URI);
    loadImageBlob(link, preview)
      .then((blob) => {
        if (cancelled) {
          return;
        }
        created = URL.createObjectURL(blob);
        // Guard non-URL return values (e.g. test environments): keep the
        // placeholder instead of putting undefined into src.
        setUrl(created ?? NO_IMAGE_DATA_URI);
      })
      .catch(() => {
        // Placeholder stays (ui-ngx error parity).
      });
    return () => {
      cancelled = true;
      if (created) {
        URL.revokeObjectURL(created);
      }
    };
  }, [link, preview]);

  return url;
}
