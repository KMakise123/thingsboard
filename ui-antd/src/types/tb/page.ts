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

/** Param-object shape consumed by core/http's `query` option. */
export type PageQueryParams = Record<
  string,
  string | number | boolean | undefined
>;

/**
 * Serialize a PageLink into a query-param object (spread into the HTTP
 * client's `query`), so paged calls keep ONE url/query source instead of
 * pre-baking a `?...` string that would double up on `?`.
 */
export function pageLinkToQueryParams(link: PageLink): PageQueryParams {
  const params: PageQueryParams = {
    pageSize: link.pageSize,
    page: link.page,
  };
  const text = link.textSearch?.trim();
  if (text) {
    params.textSearch = text;
  }
  if (link.sortOrder) {
    params.sortProperty = link.sortOrder.property;
    params.sortOrder = link.sortOrder.direction;
  }
  return params;
}
