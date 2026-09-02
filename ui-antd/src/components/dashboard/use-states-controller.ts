/**
 * React states controller for dashboards (brief §1.5) — the hook replaces
 * ui-ngx's default-state-controller / entity-state-controller component
 * pair. The `?state=` URL param is the single source of truth: the hook
 * parses it into the navigation stack, every navigation writes it back
 * (merge + history replace), so deep-links and refresh restore the view.
 *
 * default mode: single-layer stack (openState replaces).
 * entity mode:  push-down stack (openState appends, breadcrumbs navigate);
 *               at the param-less root the URL param is dropped.
 *
 * Pure codec/stack rules live in core/dashboard/states.ts (tested there);
 * this hook adds routing mechanics + entity-name resolution.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getRootStateId } from '@/core/dashboard/model';
import {
  currentStateId,
  currentStateParams,
  type DashboardStateObject,
  type DashboardStateParams,
  objToBase64,
  parseStateObject,
  type StatesControllerMode,
  serializeStateObject,
  stateLayerName,
} from '@/core/dashboard/states';
import { findEntitiesByFilter } from '@/services/tb/dashboard';
import type { DashboardState } from '@/types/tb/dashboard';

export interface StateBreadcrumb {
  index: number;
  id: string;
  name: string;
}

export interface StatesController {
  mode: StatesControllerMode;
  stateObject: DashboardStateObject[];
  currentStateId: string;
  currentStateParams: DashboardStateParams;
  breadcrumbs: StateBreadcrumb[];
  /** entity mode: appends a layer; default mode: replaces the layer. */
  openState: (id: string, params?: DashboardStateParams) => void;
  /** entity mode: truncate the stack to `index` (breadcrumb click). */
  navigatePrev: (index: number) => void;
  resetState: () => void;
}

function readStateParam(): string | null {
  return new URLSearchParams(window.location.search).get('state');
}

function writeStateParam(serialized: string | null) {
  const params = new URLSearchParams(window.location.search);
  if (serialized === null) {
    params.delete('state');
  } else {
    params.set('state', serialized);
  }
  const query = params.toString();
  const url = `${window.location.pathname}${query ? `?${query}` : ''}`;
  window.history.replaceState(window.history.state, '', url);
}

/**
 * Fill missing entityName/entityLabel for freshly-navigated params using
 * the generic entity query (singleEntity filter, name/label projection).
 * Best-effort: resolution failure keeps the params untouched.
 */
async function resolveEntityParams(
  params: DashboardStateParams,
): Promise<DashboardStateParams> {
  if (
    !params ||
    typeof params.entityName === 'string' ||
    !params.entityId ||
    typeof params.entityId.id !== 'string'
  ) {
    return params;
  }
  try {
    const result = await findEntitiesByFilter(
      {
        type: 'singleEntity',
        singleEntity: params.entityId,
      },
      { pageSize: 1, page: 0 },
    );
    const row = result.data?.[0];
    const name = row?.latest?.ENTITY_FIELD?.name?.value;
    const label = row?.latest?.ENTITY_FIELD?.label?.value;
    return {
      ...params,
      entityName: name ?? String(params.entityId.id),
      entityLabel: label ?? name,
    };
  } catch {
    return params;
  }
}

export function useStatesController(args: {
  states: Record<string, DashboardState>;
  mode: StatesControllerMode;
}): StatesController {
  const { states, mode } = args;

  const [stateParam, setStateParam] = useState<string | null>(() =>
    typeof window === 'undefined' ? null : readStateParam(),
  );

  useEffect(() => {
    const onPopState = () => {
      setStateParam(readStateParam());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const stateObject = useMemo(
    () => parseStateObject(stateParam, states, mode),
    [stateParam, states, mode],
  );

  const writeStack = useCallback(
    (next: DashboardStateObject[]) => {
      const serialized = serializeStateObject(next, states, mode);
      writeStateParam(serialized ?? null);
      setStateParam(serialized ?? null);
    },
    [states, mode],
  );

  const openState = useCallback(
    (id: string, params?: DashboardStateParams) => {
      if (!states[id]) {
        return;
      }
      const newLayer: DashboardStateObject = { id, params: params ?? {} };
      if (mode === 'entity') {
        void resolveEntityParams(newLayer.params ?? {}).then((resolved) => {
          // re-read in case the stack moved while resolving
          const fresh = parseStateObject(readStateParam(), states, mode);
          writeStack([...fresh, { ...newLayer, params: resolved }]);
        });
      } else {
        writeStack([newLayer]);
      }
    },
    [states, mode, writeStack],
  );

  const navigatePrev = useCallback(
    (index: number) => {
      if (mode !== 'entity') {
        return;
      }
      if (index < 0 || index >= stateObject.length - 1) {
        return;
      }
      writeStack(stateObject.slice(0, index + 1));
    },
    [mode, stateObject, writeStack],
  );

  const resetState = useCallback(() => {
    writeStack([{ id: getRootStateId(states), params: {} }]);
  }, [states, writeStack]);

  const breadcrumbs = useMemo<StateBreadcrumb[]>(
    () =>
      stateObject.map((layer, index) => ({
        index,
        id: layer.id ?? '',
        name: stateLayerName(states[layer.id ?? ''], layer.params),
      })),
    [stateObject, states],
  );

  return {
    mode,
    stateObject,
    currentStateId: currentStateId(stateObject),
    currentStateParams: currentStateParams(stateObject),
    breadcrumbs,
    openState,
    navigatePrev,
    resetState,
  };
}

/** Exposed for tests of the merge-write contract. */
export const __testing = { writeStateParam, objToBase64 };
