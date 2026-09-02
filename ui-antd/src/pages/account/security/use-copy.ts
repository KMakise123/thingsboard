/**
 * Clipboard write for the account/security page (local variant of the
 * devices/users use-copy convention). Toast-free on purpose: the JWT card
 * and the TOTP key copy need different wording, so the caller picks the
 * message from its own locale keys.
 */
import { useCallback } from 'react';

export function useCopy(): (text: string) => Promise<boolean> {
  return useCallback(async (text: string) => {
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
  }, []);
}
