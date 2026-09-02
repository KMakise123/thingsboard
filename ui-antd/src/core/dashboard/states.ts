/**
 * Dashboard state-object machinery: URL (?state=) codec, stack validation
 * and breadcrumb naming.
 *
 * Semantics aligned with ui-ngx:
 *   - core/utils.ts:221-227 objToBase64 / base64toObj (percent-encoding
 *     folded into latin1 bytes, base64, UTF-8 round-trip);
 *   - default-state-controller.component.ts parseState :211-244 (single
 *     layer, invalid id → root);
 *   - entity-state-controller.component.ts parseState + updateLocation
 *     (full stack, root+empty params → URL param dropped).
 */

import type { DashboardState } from '@/types/tb/dashboard';
import { getRootStateId } from './model';

/** Params carried by one state layer (ui-ngx StateParams). */
export interface DashboardStateParams {
  entityName?: string;
  entityLabel?: string;
  targetEntityParamName?: string;
  entityId?: { entityType: string; id: string };
  [key: string]: unknown;
}

/** One layer of the navigation stack (ui-ngx StateObject). */
export interface DashboardStateObject {
  id?: string;
  params?: DashboardStateParams;
}

/** statesControllerId values (unknown ids fall back to 'default' upstream). */
export type StatesControllerMode = 'default' | 'entity';

/** ui-ngx core/utils.ts objToBase64 — byte-exact compatible with Angular URLs. */
export function objToBase64(obj: unknown): string {
  const json = JSON.stringify(obj);
  const folded = encodeURIComponent(json).replace(
    /%([0-9A-F]{2})/g,
    (_match, p1: string) => String.fromCharCode(Number(`0x${p1}`)),
  );
  return btoa(folded);
}

/** ui-ngx core/utils.ts base64toObj — throws on malformed input. */
export function base64ToObj<T>(raw: string): T {
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const text = new TextDecoder('UTF-8', { fatal: false }).decode(bytes);
  return JSON.parse(text) as T;
}

function isRecordArray(value: unknown): value is DashboardStateObject[] {
  return (
    Array.isArray(value) &&
    value.every((entry) => typeof entry === 'object' && entry !== null)
  );
}

/**
 * Decode + validate a `?state=` value against the dashboard states.
 *
 * Shared rules (both controllers): undecodable → [root]; entries whose id
 * is missing/unknown are dropped; an emptied stack or a missing first id
 * falls back to the root state.
 *
 * Mode differences:
 *   - default: the stack truncates to its LAST layer (single-layer semantics);
 *   - entity: the full stack survives.
 */
export function parseStateObject(
  raw: string | null | undefined,
  states: Record<string, DashboardState>,
  mode: StatesControllerMode,
): DashboardStateObject[] {
  let result: DashboardStateObject[];
  if (raw) {
    try {
      const decoded: unknown = base64ToObj(raw);
      result = isRecordArray(decoded) ? decoded : [];
    } catch {
      result = [];
    }
  } else {
    result = [];
  }
  if (result.length === 0) {
    result = [{ id: undefined, params: {} }];
  } else if (mode === 'default' && result.length > 1) {
    result = [result[result.length - 1]];
  }
  const rootStateId = getRootStateId(states);
  if (!result[0].id) {
    result[0].id = rootStateId;
  }
  if (!states[result[0].id]) {
    result[0].id = rootStateId;
  }
  let i = result.length;
  while (i--) {
    const entry = result[i];
    if (!entry || !entry.id || !states[entry.id]) {
      result.splice(i, 1);
    }
  }
  if (result.length === 0) {
    result = [{ id: rootStateId, params: {} }];
  }
  return result;
}

/** Params of the current (last) layer. */
export function currentStateParams(
  stack: DashboardStateObject[],
): DashboardStateParams {
  return stack[stack.length - 1]?.params ?? {};
}

/** Id of the current (last) layer. */
export function currentStateId(stack: DashboardStateObject[]): string {
  return stack[stack.length - 1]?.id ?? '';
}

/**
 * Entity-controller URL write-back: at the root with no params the
 * `?state=` param is dropped (ui-ngx updateLocation isDefaultState).
 */
export function serializeStateObject(
  stack: DashboardStateObject[],
  states: Record<string, DashboardState>,
  mode: StatesControllerMode,
): string | null {
  if (mode === 'default') {
    return objToBase64(stack);
  }
  const rootStateId = getRootStateId(states);
  if (
    stack.length === 1 &&
    stack[0].id === rootStateId &&
    (!stack[0].params || Object.keys(stack[0].params).length === 0)
  ) {
    return null;
  }
  return objToBase64(stack);
}

const VARS_REGEX = /\${([^}]*)}/g;

/** ui-ngx core/utils.ts insertVariable — replaces `${name}` occurrences. */
export function insertVariable(
  pattern: string,
  name: string,
  value: unknown,
): string {
  let result = pattern;
  let match = VARS_REGEX.exec(pattern);
  while (match !== null) {
    if (match[1] === name) {
      result = result.replace(match[0], String(value ?? ''));
    }
    match = VARS_REGEX.exec(pattern);
  }
  return result;
}

/**
 * Breadcrumb label of one stack layer: the state name with entityName /
 * entityLabel (and `param:entityName` variants) interpolated
 * (ui-ngx entity-state-controller getStateName).
 */
export function stateLayerName(
  state: DashboardState | undefined,
  params: DashboardStateParams | undefined,
): string {
  if (!state) {
    return '';
  }
  let result = state.name;
  const entityName = params?.entityName ?? '';
  const entityLabel = params?.entityLabel ?? '';
  result = insertVariable(result, 'entityName', entityName);
  result = insertVariable(result, 'entityLabel', entityLabel);
  if (params) {
    for (const prop of Object.keys(params)) {
      const value: unknown = params[prop];
      if (typeof value !== 'object' || value === null) {
        continue;
      }
      const nested = value as { entityName?: string; entityLabel?: string };
      if (nested.entityName) {
        result = insertVariable(
          result,
          `${prop}:entityName`,
          nested.entityName,
        );
      }
      if (nested.entityLabel) {
        result = insertVariable(
          result,
          `${prop}:entityLabel`,
          nested.entityLabel,
        );
      }
    }
  }
  return result;
}
