/**
 * system.cards.html_value_card — HTML value card (brief §6).
 *
 * Anchor reality (firmware/software ×4+4, lead-adjudicated erratum on the
 * brief's §6 row): settings.cardHtml is an author template whose
 * `${key:decimals}` placeholders bind to the datasource value binding, and
 * settings.cardCss carries the card styles. The anchor datasources are
 * `entityCount` + filterId (live waiting/updating/updated/failed device
 * counts under fw_state keyFilters) — see useWidgetValues for the dual
 * channel; entity datasources fall back to latest telemetry.
 *
 * cardCss is author CSS: it is prefixed under a per-instance scope class so
 * one dashboard's card rules never leak into another (naive brace scoping;
 * at-rules keep their prelude and re-scope their bodies).
 */
import { useId, useMemo } from 'react';
import type { WidgetComponentProps } from './contract';
import { interpolateStateParams, useWidgetValues } from './hooks';

const VALUE_PATTERN = /\$\{([a-zA-Z][a-zA-Z0-9_.]*)(?::(-?\d+))?\}/g;

/**
 * Prefix every selector in the author CSS with the scope class.
 * At-rule preludes (@media …) are preserved and their bodies re-scoped.
 * Recursive descent over braces: declarations never contain braces, so the
 * grammar is selector-header + nested-or-flat body.
 */
export function scopeCss(css: string, scopeClass: string): string {
  const scope = `.${scopeClass}`;
  let index = 0;

  const parse = (nested: boolean): string => {
    let out = '';
    let header = '';
    while (index < css.length) {
      const char = css[index];
      if (char === '{') {
        index += 1;
        const body = parse(true);
        const trimmed = header.trim();
        if (trimmed.startsWith('@')) {
          out += `${trimmed} {${body}}`;
        } else {
          out += `${trimmed
            .split(',')
            .map((selector) => `${scope} ${selector.trim()}`)
            .join(', ')} {${body}}`;
        }
        header = '';
        continue;
      }
      if (char === '}') {
        index += 1;
        if (nested) {
          return out + (header.trim() ? ` ${header.trim()}` : '');
        }
        out += header;
        header = '';
        continue;
      }
      header += char;
      index += 1;
    }
    return out + header;
  };

  return parse(false);
}

function formatBound(value: unknown, decimals: number | undefined): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(numeric)) {
    return decimals === undefined ? String(value) : numeric.toFixed(decimals);
  }
  return String(value);
}

export default function HtmlValueCard({ ctx, widget }: WidgetComponentProps) {
  const values = useWidgetValues(ctx.datasources);
  const scopeClass = `tb-html-card-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`;

  const settings = (widget.config.settings ?? {}) as {
    cardHtml?: string;
    cardCss?: string;
  };

  const css = useMemo(
    () => (settings.cardCss ? scopeCss(settings.cardCss, scopeClass) : ''),
    [settings.cardCss, scopeClass],
  );

  const html = useMemo(() => {
    let template = settings.cardHtml ?? '';
    template = template.replace(
      VALUE_PATTERN,
      (fullMatch: string, key: string, decimals?: string) => {
        if (Object.hasOwn(values, key)) {
          return formatBound(
            values[key],
            decimals === undefined ? undefined : Number(decimals),
          );
        }
        const interpolated = interpolateStateParams(fullMatch, {
          entityName: ctx.states.currentStateParams.entityName,
          entityLabel: ctx.states.currentStateParams.entityLabel,
        });
        // entityName/entityLabel resolved; unknown placeholders stay literal
        return interpolated;
      },
    );
    return template;
  }, [settings.cardHtml, values, ctx.states.currentStateParams]);

  return (
    <div
      className={scopeClass}
      data-widget="system.cards.html_value_card"
      style={{ height: '100%', width: '100%', overflow: 'hidden' }}
    >
      {css ? <style>{css}</style> : null}
      {/* dashboard-author template (tenant-authored config, same trust as
          upstream TB rendering) */}
      <div
        style={{ height: '100%', width: '100%' }}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: author template
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
