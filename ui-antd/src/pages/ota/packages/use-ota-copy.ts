/**
 * Copy-to-clipboard hook for the OTA pages (devices/use-copy parity, scoped
 * toast keys so the packages family does not borrow the devices locale).
 */
import { App } from 'antd';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';

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

async function writeClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}
