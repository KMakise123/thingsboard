/**
 * Copy-to-clipboard hook for the OTA pages (devices/use-copy parity, scoped
 * toast keys so the packages family does not borrow the devices locale).
 * The write itself comes from the shared clipboard helper.
 */
import { App } from 'antd';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';
import { writeClipboard } from '@/components/shared/clipboard';

export interface CopyToast {
  id: string;
  defaultMessage: string;
}

export function useOtaCopy(): (
  text: string,
  toast: CopyToast,
) => Promise<void> {
  const { message } = App.useApp();
  const { formatMessage } = useIntl();

  return useCallback(
    async (text, toast) => {
      const ok = await writeClipboard(text);
      if (ok) {
        void message.success(
          formatMessage({ id: toast.id, defaultMessage: toast.defaultMessage }),
        );
      } else {
        void message.error(
          formatMessage({
            id: 'pages.ota.copyFailed',
            defaultMessage: 'Copy failed, select and copy manually',
          }),
        );
      }
    },
    [formatMessage, message],
  );
}
