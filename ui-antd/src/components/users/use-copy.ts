/**
 * Copy-to-clipboard hook with antd App-context toasts (ADR 0007: message
 * goes through App.useApp, never the static antd methods). Local user-domain
 * variant of the devices hook — the toast wording is the activation-link
 * copy from ui-ngx, and users must not reach into the devices tree for it.
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
            id: 'pages.users.activation.copied',
            defaultMessage: 'User activation link has been copied to clipboard',
          }),
        );
      } else {
        void message.error(
          formatMessage({
            id: 'pages.users.activation.copyFailed',
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
