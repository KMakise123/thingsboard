/**
 * Copy-to-clipboard hook with antd App-context toasts (ADR 0007: message
 * goes through App.useApp, never the static antd methods). The write itself
 * comes from the shared clipboard helper.
 */
import { App } from 'antd';
import { useCallback } from 'react';
import { useIntl } from 'react-intl';
import { writeClipboard } from '@/components/shared/clipboard';

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
