import { setLocale as umiSetLocale } from '@umijs/max';

/**
 * The ONLY place the app locale may be switched (ADR 0007). umi's
 * setLocale is bypass-friendly (realReload flag, localStorage key), so all
 * call sites must go through here to keep persistence behavior uniform.
 * Business code: import { changeLocale } from '@/locales/set-locale'.
 */
export type AppLocale = 'zh-CN' | 'en-US';

export function changeLocale(locale: AppLocale): void {
  umiSetLocale(locale, false);
}
