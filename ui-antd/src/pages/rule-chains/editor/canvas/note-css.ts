/**
 * Note CSS namespacing (ui-ngx cssjs.applyNamespacing parity, reduced to
 * the rule-chain note surface): every selector of a user-provided CSS
 * fragment is prefixed with the note's scope class so custom styles cannot
 * leak across notes or into the app shell. At-rules (@media/@supports) are
 * kept as wrappers and their inner selectors prefixed too; font-face /
 * keyframes blocks pass through untouched.
 */

/** ui-ngx FC_RULE_NOTE_DEFAULT_BACKGROUND_COLOR. */
export const NOTE_DEFAULT_BACKGROUND_COLOR = '#FFF9C4';

export function namespaceNoteCss(css: string, scope: string): string {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return withoutComments
    .split('}')
    .map((rule) => rule.trim())
    .filter(Boolean)
    .map((rule) => {
      const brace = rule.indexOf('{');
      if (brace <= 0) {
        return `${rule}}`;
      }
      const selectors = rule.slice(0, brace).trim();
      const body = rule.slice(brace + 1).trim();
      if (selectors.startsWith('@')) {
        if (/^@(font-face|keyframes|property)\b/i.test(selectors)) {
          return `${selectors}{${body}}`;
        }
        // nested at-rule (media/supports): prefix the inner rules
        const inner = namespaceNoteCss(body, scope);
        return `${selectors}{${inner}}`;
      }
      const prefixed = selectors
        .split(',')
        .map((selector) => `${scope} ${selector.trim()}`)
        .join(', ');
      return `${prefixed}{${body}}`;
    })
    .join('\n');
}
