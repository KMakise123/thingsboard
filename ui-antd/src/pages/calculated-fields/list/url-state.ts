/**
 * Calculated-fields list URL state (OTA url-state 范式 + audit-logs multi
 * filter): page/pageSize/sort/textSearch plus the three filter dimensions
 * (types multi-select / entityType / entities multi-select) riding the URL
 * as comma-joined values.
 *
 * Sort whitelist is HARD `createdTime | name` — the backend dao has no
 * column mappings for anything else (entityName/type sorts 500, contract
 * #18), so out-of-whitelist columns get no sorter at all.
 */
import { useEffect, useState } from 'react';
import type { Direction, PageLink } from '@/types/tb';
import type { CalculatedFieldType } from '@/types/tb/calculated-fields';
import {
  CF_SUPPORTED_ENTITY_TYPES,
  type CfHostEntityType,
} from '../components/data';

/** Table column key → sortable server property (contract #18 whitelist). */
export const CF_SORTABLE_COLUMNS: Record<string, string> = {
  createdTime: 'createdTime',
  name: 'name',
};

export const CF_PAGE_SIZES = [10, 20, 30, 50, 100];

export interface CfListUrlState {
  /** 1-based UI page. */
  page: number;
  pageSize: number;
  sortProperty: string;
  sortDirection: Direction;
  textSearch: string;
  /** Type filter (6 page types, ALARM excluded by construction). */
  types: Array<CalculatedFieldType>;
  /** Target-entity-type filter (four host types). */
  entityType: CfHostEntityType | '';
  /** Target-entity id filter. */
  entities: Array<string>;
}

const DEFAULT_STATE: CfListUrlState = {
  page: 1,
  pageSize: 10,
  sortProperty: 'createdTime',
  sortDirection: 'DESC',
  textSearch: '',
  types: [],
  entityType: '',
  entities: [],
};

const PAGE_TYPE_SET = new Set<string>([
  'SIMPLE',
  'SCRIPT',
  'PROPAGATION',
  'RELATED_ENTITIES_AGGREGATION',
  'ENTITY_AGGREGATION',
  'GEOFENCING',
]);

function parseTypes(raw: string | null): Array<CalculatedFieldType> {
  return (raw ?? '')
    .split(',')
    .filter((value) => PAGE_TYPE_SET.has(value)) as Array<CalculatedFieldType>;
}

function parseEntities(raw: string | null): Array<string> {
  return (raw ?? '').split(',').filter(Boolean);
}

export function parseCfListUrlState(search: string): CfListUrlState {
  const params = new URLSearchParams(search);
  const page = Math.max(1, Number(params.get('page')) || 1);
  const rawPageSize = Number(params.get('pageSize')) || 10;
  const rawSort = params.get('sortProperty') ?? '';
  const rawEntityType = params.get('entityType') ?? '';
  return {
    page,
    pageSize: CF_PAGE_SIZES.includes(rawPageSize) ? rawPageSize : 10,
    sortProperty:
      rawSort in CF_SORTABLE_COLUMNS ? rawSort : DEFAULT_STATE.sortProperty,
    sortDirection: params.get('sortOrder') === 'ASC' ? 'ASC' : 'DESC',
    textSearch: params.get('textSearch') ?? '',
    types: parseTypes(params.get('types')),
    entityType: (CF_SUPPORTED_ENTITY_TYPES as ReadonlyArray<string>).includes(
      rawEntityType,
    )
      ? (rawEntityType as CfHostEntityType)
      : '',
    entities: parseEntities(params.get('entities')),
  };
}

export function serializeCfListUrlState(state: CfListUrlState): string {
  const params = new URLSearchParams();
  if (state.page !== DEFAULT_STATE.page) {
    params.set('page', String(state.page));
  }
  if (state.pageSize !== DEFAULT_STATE.pageSize) {
    params.set('pageSize', String(state.pageSize));
  }
  if (state.sortProperty !== DEFAULT_STATE.sortProperty) {
    params.set('sortProperty', state.sortProperty);
  }
  if (state.sortDirection !== DEFAULT_STATE.sortDirection) {
    params.set('sortOrder', state.sortDirection);
  }
  if (state.textSearch) {
    params.set('textSearch', state.textSearch);
  }
  if (state.types.length > 0) {
    params.set('types', state.types.join(','));
  }
  if (state.entityType) {
    params.set('entityType', state.entityType);
  }
  if (state.entities.length > 0) {
    params.set('entities', state.entities.join(','));
  }
  return params.toString();
}

/** Server PageLink (0-based page, explicit sort — backend default is id ASC). */
export function toPageLink(state: CfListUrlState): PageLink {
  const text = state.textSearch.trim();
  return {
    pageSize: state.pageSize,
    page: state.page - 1,
    textSearch: text || undefined,
    sortOrder: {
      property: state.sortProperty,
      direction: state.sortDirection,
    },
  };
}

/** URL-backed state hook (history.replaceState writes, popstate re-reads). */
export function useCfListUrlState(): {
  state: CfListUrlState;
  patch: (partial: Partial<CfListUrlState>) => void;
} {
  const [state, setState] = useState<CfListUrlState>(() =>
    parseCfListUrlState(window.location.search),
  );

  useEffect(() => {
    const onPopState = () => {
      setState(parseCfListUrlState(window.location.search));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const patch = (partial: Partial<CfListUrlState>) => {
    setState((previous) => {
      const next = { ...previous, ...partial };
      const query = serializeCfListUrlState(next);
      window.history.replaceState(
        window.history.state,
        '',
        `${window.location.pathname}${query ? `?${query}` : ''}`,
      );
      return next;
    });
  };

  return { state, patch };
}
