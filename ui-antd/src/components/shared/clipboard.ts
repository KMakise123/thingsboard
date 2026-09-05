/**
 * Clipboard write, the single shared implementation (M13 review: the
 * write-with-legacy-fallback body was copy-pasted across the per-domain
 * copy hooks — devices, users, account/security, edge detail, OTA, force
 * MFA). Toasts stay with the callers: each domain keeps its own locale
 * keys, this helper only answers "did the write succeed".
 */

/**
 * Writes `text` to the clipboard: navigator.clipboard when available,
 * else the hidden-textarea + execCommand fallback for non-secure contexts.
 * Resolves true on success, false when every path failed.
 */
export async function writeClipboard(text: string): Promise<boolean> {
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
