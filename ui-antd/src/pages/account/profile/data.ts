/**
 * Profile page transforms (account domain, brief §2-D) — pure functions
 * extracted from the ui-ngx profile.component: the language preference
 * lives in `additionalInfo.lang` where the empty/follow choice must DELETE
 * the key, and the form value maps the user entity's optional fields onto
 * strings.
 */
import type { AppLocale } from '@/locales/set-locale';
import type { User } from '@/types/tb';

/** The supported explicit languages; '' = follow (no additionalInfo.lang). */
export type ProfileLang = 'zh_CN' | 'en_US' | '';

interface ProfileAdditionalInfo {
  lang?: string;
  lastLoginTs?: number;
  [key: string]: unknown;
}

function additionalInfoOf(user?: User | null): ProfileAdditionalInfo {
  return (user?.additionalInfo ?? {}) as ProfileAdditionalInfo;
}

/** additionalInfo.lang → preference; anything unsupported means follow. */
export function userLanguagePreference(user?: User | null): ProfileLang {
  const lang = additionalInfoOf(user).lang;
  return lang === 'zh_CN' || lang === 'en_US' ? lang : '';
}

/**
 * Copy of the user with `additionalInfo.lang` set — or the key REMOVED
 * when the preference is follow (ui-ngx: `delete this.user.additionalInfo.lang`).
 */
export function applyLanguagePreference(user: User, lang: ProfileLang): User {
  const info = { ...additionalInfoOf(user) };
  if (lang) {
    info.lang = lang;
  } else {
    delete info.lang;
  }
  return { ...user, additionalInfo: info };
}

/** Preference → app locale; null = follow, the session locale stays. */
export function localeForPreference(lang: ProfileLang): AppLocale | null {
  if (lang === 'zh_CN') {
    return 'zh-CN';
  }
  if (lang === 'en_US') {
    return 'en-US';
  }
  return null;
}

export interface ProfileFormValue {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  language: ProfileLang;
}

/** User entity → form value (optional fields fall back to ''). */
export function profileFormValue(user?: User | null): ProfileFormValue {
  return {
    email: user?.email ?? '',
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: user?.phone ?? '',
    language: userLanguagePreference(user),
  };
}

/** Form value + user → the POST /api/user payload (language applied). */
export function mergeProfileForm(user: User, values: ProfileFormValue): User {
  const withFields: User = {
    ...user,
    email: values.email,
    firstName: values.firstName,
    lastName: values.lastName,
    phone: values.phone,
  };
  return applyLanguagePreference(withFields, values.language);
}

/** additionalInfo.lastLoginTs — shown only when the server sent one. */
export function userLastLoginTs(user?: User | null): number | undefined {
  const ts = additionalInfoOf(user).lastLoginTs;
  return typeof ts === 'number' ? ts : undefined;
}
