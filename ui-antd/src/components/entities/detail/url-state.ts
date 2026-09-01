/**
 * Generic `?tab=` URL state for entity detail pages (M2 shared shape).
 *
 * The active tab lives in the query string (`/devices/:id?tab=attributes`)
 * so a bookmark/refresh lands on the same tab. Same window.history approach
 * as the list pages (vitest-friendly, umi's router reads location at
 * navigation time so the two never diverge).
 *
 * Each domain keeps its own constants file (`pages/<domain>/detail/url-state.ts`)
 * that calls `createDetailTabUrlState` with its tab set + default:
 *   devices 10 tabs (default `details`), assets 8, customers 7 (no details
 *   tab — default `attributes`), entity views 6. Domain agents copy the
 *   device file and swap the constants.
 */
import { useEffect, useState } from 'react';

export const DETAIL_TAB_URL_KEY = 'tab';

export interface DetailTabUrlState<T extends string> {
  /** Parse `?tab=` and fall back to the domain default for unknown values. */
  parseDetailTab: (search: string) => T;
  /** Serialize the tab into a query string ('' for the default tab). */
  serializeDetailTab: (tab: T) => string;
  /** URL-backed active-tab state (replaceState writes, popstate reads). */
  useDetailTabUrlState: () => { tab: T; setTab: (tab: T) => void };
}

export function createDetailTabUrlState<T extends string>(
  tabs: readonly T[],
  defaultTab: T,
): DetailTabUrlState<T> {
  function parseDetailTab(search: string): T {
    const params = new URLSearchParams(search);
    const raw = params.get(DETAIL_TAB_URL_KEY);
    return (tabs as readonly string[]).includes(raw ?? '')
      ? (raw as T)
      : defaultTab;
  }

  function serializeDetailTab(tab: T): string {
    if (tab === defaultTab) {
      return '';
    }
    return `${DETAIL_TAB_URL_KEY}=${tab}`;
  }

  function useDetailTabUrlState(): { tab: T; setTab: (tab: T) => void } {
    const [tab, setTabState] = useState<T>(() =>
      parseDetailTab(window.location.search),
    );

    useEffect(() => {
      const onPopState = () => {
        setTabState(parseDetailTab(window.location.search));
      };
      window.addEventListener('popstate', onPopState);
      return () => window.removeEventListener('popstate', onPopState);
    }, []);

    const setTab = (next: T) => {
      setTabState(next);
      const query = serializeDetailTab(next);
      const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
      window.history.replaceState(window.history.state, '', url);
    };

    return { tab, setTab };
  }

  return { parseDetailTab, serializeDetailTab, useDetailTabUrlState };
}
