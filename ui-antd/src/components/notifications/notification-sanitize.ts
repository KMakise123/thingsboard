/**
 * Notification HTML sanitizer — subject/text arrive as HTML fragments from
 * notification templates and are NEVER trusted raw (same posture as the
 * rule-node help tab): DOMPurify allowlist pass plus a deterministic
 * forbidden-tag sweep. Under happy-dom the DOMPurify parser strips event
 * handler attributes but can leave <script>/<style> nodes in place (verified
 * 2026-09) — the sweep removes exactly those so tests and browsers see the
 * same allowlist. In a real browser the sweep is a no-op.
 */
import DOMPurify from 'dompurify';

/** Tags never acceptable in notification copy, regardless of the profile. */
const FORBIDDEN_TAGS = [
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'link',
  'meta',
  'base',
] as const;

export function sanitizeNotificationHtml(html: string): string {
  const clean = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    FORBID_TAGS: [...FORBIDDEN_TAGS],
  });
  const holder = document.createElement('div');
  holder.innerHTML = clean;
  for (const element of [
    ...holder.querySelectorAll(FORBIDDEN_TAGS.join(',')),
  ]) {
    element.remove();
  }
  // Event-handler attributes are DOMPurify's job in a real browser; strip
  // them deterministically too (happy-dom's parser is not trustworthy here).
  for (const element of [...holder.querySelectorAll('*')]) {
    for (const attribute of [...element.attributes]) {
      if (/^on/i.test(attribute.name)) {
        element.removeAttribute(attribute.name);
      }
    }
  }
  return holder.innerHTML;
}
