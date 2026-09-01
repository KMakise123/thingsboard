/**
 * Device-detail URL state: the active tab lives in the query string
 * (`/devices/:id?tab=attributes`) so a bookmark/refresh lands on the same tab.
 *
 * Same window.history approach as the list page (vitest-friendly, umi's
 * router reads location at navigation time so the two never diverge).
 */
import { useEffect, useState } from 'react';

export const DETAIL_TABS = [
  'details',
  'attributes',
  'latest-telemetry',
  'calculated-fields',
  'alarm-rules',
  'alarms',
  'events',
  'relations',
  'audit-logs',
  'version-control',
] as const;

export type DetailTab = (typeof DETAIL_TABS)[number];

/** Tabs that exist only for TENANT_ADMIN (hidden for CU like ui-ngx). */
export const TA_ONLY_DETAIL_TABS: ReadonlySet<DetailTab> = new Set([
  'calculated-fields',
  'alarm-rules',
  'version-control',
] as const);

export function isTaOnlyDetailTab(tab: DetailTab): boolean {
  return TA_ONLY_DETAIL_TABS.has(tab);
}

export const DETAIL_TAB_URL_KEY = 'tab';

const DEFAULT_TAB: DetailTab = 'details';

/** Parse `?tab=` and fall back to the details tab for unknown values. */
export function parseDetailTab(search: string): DetailTab {
  const params = new URLSearchParams(search);
  const raw = params.get(DETAIL_TAB_URL_KEY);
  return (DETAIL_TABS as readonly string[]).includes(raw ?? '')
    ? (raw as DetailTab)
    : DEFAULT_TAB;
}

/** Serialize the tab into a query string ('' for the default tab). */
export function serializeDetailTab(tab: DetailTab): string {
  if (tab === DEFAULT_TAB) {
    return '';
  }
  return `${DETAIL_TAB_URL_KEY}=${tab}`;
}

/** URL-backed active-tab state (replaceState writes, popstate reads). */
export function useDetailTabUrlState(): {
  tab: DetailTab;
  setTab: (tab: DetailTab) => void;
} {
  const [tab, setTabState] = useState<DetailTab>(() =>
    parseDetailTab(window.location.search),
  );

  useEffect(() => {
    const onPopState = () => {
      setTabState(parseDetailTab(window.location.search));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const setTab = (next: DetailTab) => {
    setTabState(next);
    const query = serializeDetailTab(next);
    const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
    window.history.replaceState(window.history.state, '', url);
  };

  return { tab, setTab };
}
