/**
 * Widget text + value helpers (W2).
 *
 * - `{i18n:key}` placeholders ship inside system widget-bundle configs (demo
 *   anchors: api-usage labels, map layer labels). ui-ngx resolves them via
 *   translate.instant (utils.service customTranslation); we carry the exact
 *   anchor key set locally instead of a full locale bundle (v1 scope).
 * - `${entityName}` / `${entityLabel}` interpolation mirrors ui-ngx
 *   insertVariable against the current state params.
 * - Value formatting follows dataKey units/decimals.
 */

const I18N_PATTERN = /\{i18n:([^}]+)\}/g;

/** Anchor-verified i18n keys (demo dashboards only; unknown keys stay raw). */
const I18N_MESSAGES: Record<string, Record<'zh' | 'en', string>> = {
  'api-usage.queue-stats': { zh: '队列统计', en: 'Queue Stats' },
  'api-usage.successful': {
    zh: '${entityName} 成功',
    en: '${entityName} Successful',
  },
  'api-usage.processing-timeouts': {
    zh: '${entityName} 处理超时',
    en: '${entityName} Processing Timeouts',
  },
  'api-usage.processing-failures': {
    zh: '${entityName} 处理失败',
    en: '${entityName} Processing Failures',
  },
  'api-usage.processing-failures-and-timeouts': {
    zh: '处理失败和超时',
    en: 'Processing Failures and Timeouts',
  },
  'api-usage.permanent-timeouts': {
    zh: '${entityName} 永久超时',
    en: '${entityName} Permanent Timeouts',
  },
  'api-usage.permanent-failures': {
    zh: '${entityName} 永久失败',
    en: '${entityName} Permanent Failures',
  },
  'widgets.maps.layer.roadmap': { zh: '路线图', en: 'Roadmap' },
  'widgets.maps.layer.satellite': { zh: '卫星图', en: 'Satellite' },
  'widgets.maps.layer.hybrid': { zh: '混合图', en: 'Hybrid' },
};

function isChineseLocale(locale: string): boolean {
  return locale.toLowerCase().startsWith('zh');
}

/** Replace every `{i18n:key}` occurrence; unknown keys degrade to the key. */
export function resolveI18nMessage(
  text: string | undefined,
  locale: string,
): string {
  if (!text) {
    return '';
  }
  const lang = isChineseLocale(locale) ? 'zh' : 'en';
  return text.replace(I18N_PATTERN, (fullMatch, key: string) => {
    const entry = I18N_MESSAGES[key];
    return entry ? entry[lang] : fullMatch;
  });
}

const VARIABLE_PATTERN = /\$\{([a-zA-Z][a-zA-Z0-9_]*)(?::(-?\d+))?\}/g;

/**
 * Interpolate `${entityName}` / `${entityLabel}` (ui-ngx insertVariable
 * semantics). `${key:decimals}` value placeholders are NOT handled here —
 * they are data-bound and resolved by the value widgets themselves.
 */
export function interpolateStateParams(
  text: string | undefined,
  params: { entityName?: string; entityLabel?: string } | undefined,
): string {
  if (!text) {
    return '';
  }
  return text.replace(VARIABLE_PATTERN, (fullMatch, name: string) => {
    if (name === 'entityName') {
      return params?.entityName ?? fullMatch;
    }
    if (name === 'entityLabel') {
      return params?.entityLabel ?? params?.entityName ?? fullMatch;
    }
    return fullMatch;
  });
}

/** TB number formatting: `value` wire strings become decimals-aware text. */
export function formatWidgetValue(
  value: unknown,
  decimals?: number | null,
  units?: string | null,
): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  let text: string;
  const numeric = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(numeric) && typeof value !== 'boolean') {
    text =
      decimals === null || decimals === undefined
        ? String(value)
        : numeric.toFixed(decimals);
  } else {
    text = String(value);
  }
  return units ? `${text} ${units}` : text;
}
