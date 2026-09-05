/**
 * JS-resource base64 codec (ui-ngx core/utils stringToBase64 /
 * base64toString parity): TbResource.data carries the script as base64
 * TEXT, while the editor works in plain text. UTF-8 safe both ways.
 */

/** Text → base64 (UTF-8 bytes, latin1-folded before btoa). */
export function stringToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

/** base64 → text (UTF-8 decoded; invalid sequences degrade, never throw). */
export function base64ToString(raw: string): string {
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder('UTF-8', { fatal: false }).decode(bytes);
}
