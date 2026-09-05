/**
 * Clipboard write for the account/security page (toast-free on purpose:
 * the JWT card and the TOTP key copy need different wording, so the caller
 * picks the message from its own locale keys). The write itself comes from
 * the shared clipboard helper.
 */
import { useCallback } from 'react';

import { writeClipboard } from '@/components/shared/clipboard';

export function useCopy(): (text: string) => Promise<boolean> {
  return useCallback(async (text: string) => writeClipboard(text), []);
}
