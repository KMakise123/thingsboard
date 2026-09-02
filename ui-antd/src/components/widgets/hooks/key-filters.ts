/**
 * dashboard filter keyFilters → WS wire KeyFilter conversion (W4 fix).
 *
 * `configuration.filters[*].keyFilters` entries in the dashboard JSON use the
 * ui-ngx FRONTEND shape: `predicates: [{ keyFilterPredicate: {...},
 * userInfo: {...} }]`. The WS wire contract (server-side Jackson KeyFilter,
 * TbWebSocketHandler ENTITY_DATA/ENTITY_COUNT queries) expects a single
 * flattened `predicate` — no wrapper object, no userInfo. Sending the
 * frontend shape gets the socket closed with 1007 "The given string value
 * cannot be transformed to Json object", which the ws manager then treats as
 * an auth failure (unified unauthorized exit). Live repro: the gateways
 * system dashboard's "Gateway" filter (additionalInfo CONTAINS "gateway":true).
 */

/** Wire KeyFilter: predicate flattened, userInfo dropped, no wrapper key. */
export type WireKeyFilter = {
  key: Record<string, unknown>;
  valueType: unknown;
  predicate?: Record<string, unknown>;
};

/** ui-ngx dashboard predicate entry: real predicate behind `keyFilterPredicate`. */
interface DashboardPredicateEntry {
  keyFilterPredicate?: Record<string, unknown>;
  userInfo?: unknown;
  [k: string]: unknown;
}

/**
 * Flatten one predicate: unwrap a possible `keyFilterPredicate` wrapper and
 * recurse into COMPLEX predicates' nested list; already-wire-shaped
 * predicates (no wrapper) pass through untouched.
 */
function toWirePredicate(
  predicate: unknown,
): Record<string, unknown> | undefined {
  if (predicate === null || typeof predicate !== 'object') {
    return undefined;
  }
  const entry = predicate as DashboardPredicateEntry;
  const inner = (entry.keyFilterPredicate ?? entry) as Record<string, unknown>;
  if (
    inner.type === 'COMPLEX' &&
    Array.isArray((inner as { predicates?: unknown }).predicates)
  ) {
    return {
      type: inner.type,
      operation: inner.operation,
      predicates: (inner.predicates as unknown[]).map(toWirePredicate),
    };
  }
  const wire: Record<string, unknown> = {
    operation: inner.operation,
    value: inner.value,
    type: inner.type,
  };
  if (inner.ignoreCase !== undefined) {
    wire.ignoreCase = inner.ignoreCase;
  }
  return wire;
}

/** Drop null value fields (wire omits them; `dynamicValue: null` is noise). */
function toWireValue(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  const { defaultValue, dynamicValue } = value as Record<string, unknown>;
  return dynamicValue !== undefined && dynamicValue !== null
    ? { defaultValue, dynamicValue }
    : { defaultValue };
}

/**
 * Convert dashboard-shaped keyFilters to the wire contract. Entries that
 * carry no predicates (already-wire or key-only passthrough, e.g. the
 * firmware html_value_card fw_state filter) keep their shape.
 */
export function toWireKeyFilters(
  keyFilters: ReadonlyArray<Record<string, unknown>> | null | undefined,
): Array<WireKeyFilter> {
  const result: Array<WireKeyFilter> = [];
  for (const keyFilter of keyFilters ?? []) {
    const { key, valueType } = keyFilter;
    const raw = Array.isArray(keyFilter.predicates)
      ? keyFilter.predicates[0]
      : keyFilter.predicate;
    const wire: WireKeyFilter = { key, valueType } as WireKeyFilter;
    const predicate = toWirePredicate(raw);
    if (predicate) {
      predicate.value = toWireValue(predicate.value);
      wire.predicate = predicate;
    }
    result.push(wire);
  }
  return result;
}
