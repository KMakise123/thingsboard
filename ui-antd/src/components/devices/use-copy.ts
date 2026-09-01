/**
 * Copy-to-clipboard hook with antd App-context toasts (ADR 0007: message
 * goes through App.useApp, never the static antd methods).
 */
import { App } from 'antd';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';

export function useCopy(): (text: string) => Promise<boolean> {
  const { message } = App.useApp();
  const { formatMessage } = useIntl();

  return useCallback(
    async (text: string) => {
      const ok = await writeClipboard(text);
      if (ok) {
        void message.success(
          formatMessage({
            id: 'pages.devices.list.credentialsCopied',
            defaultMessage: 'Copied to clipboard',
          }),
        );
      } else {
        void message.error(
          formatMessage({
            id: 'pages.devices.list.credentialsCopyFailed',
            defaultMessage: 'Copy failed, select and copy manually',
          }),
        );
      }
      return ok;
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
