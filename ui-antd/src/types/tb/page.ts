/**
 * Pagination types (handwritten, authoritative).
 *
 * Wire contract (every paged endpoint, e.g. GET /api/tenant/deviceInfos):
 *   query:  ?pageSize=&page=&textSearch=&sortProperty=&sortOrder=ASC|DESC
 *   result: { data, totalPages, totalElements, hasNext }
 *
 * Page numbers are **0-based** on the server (ui-ngx PageLink semantics);
 * UI pages are 1-based and convert at the page layer.
 */

export type Direction = 'ASC' | 'DESC';

/** Server-side sort order for classic REST paged endpoints. */
export interface SortOrder {
  /** Wire field name, e.g. `createdTime`, `name`, `deviceProfileName`. */
  property: string;
  direction: Direction;
}

/** Query params for classic REST paged endpoints. Sort is always explicit. */
export interface PageLink {
  pageSize: number;
  /** 0-based page index. */
  page: number;
  textSearch?: string;
  /** Optional but typed: callers that omit it get the backend default order. */
  sortOrder?: SortOrder;
}

/** Server response envelope for classic REST paged endpoints. */
export interface PageData<T> {
  data: T[];
  totalPages: number;
  totalElements: number;
  hasNext: boolean;
}

export function emptyPageData<T>(): PageData<T> {
  return { data: [], totalPages: 0, totalElements: 0, hasNext: false };
}

/** Serialize a PageLink into URL query params (no leading `?`). */
export function pageLinkToQuery(link: PageLink): string {
  const params = new URLSearchParams();
  params.set('pageSize', String(link.pageSize));
  params.set('page', String(link.page));
  const text = link.textSearch?.trim();
  if (text) {
    params.set('textSearch', text);
  }
  if (link.sortOrder) {
    params.set('sortProperty', link.sortOrder.property);
    params.set('sortOrder', link.sortOrder.direction);
  }
  return params.toString();
}
