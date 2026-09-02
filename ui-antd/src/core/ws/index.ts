/**
 * src/core/ws — the /api/ws subscription manager (first-class M1 deliverable).
 *
 * Public surface:
 *   protocol.ts  wire types for the command families + server updates
 *                (M5 W2: typed EntityDataCmd tsCmd/historyCmd payloads)
 *   manager.ts   createWsManager — single socket, AUTH, reconnect, buffers
 *                (M5 W2: subscribeEntityTimeseries — typed ENTITY_DATA
 *                tsCmd/historyCmd stream per alias-matched entity set)
 *   hooks.ts     useAttributeSubscription / useLatestTelemetrySubscription
 *                (useSyncExternalStore) + default manager wiring
 *
 * Rules:
 *   - Only this module talks to /api/ws.
 *   - NEVER call queryClient.setQueryData from WS data (per-subscription
 *     buffers only); the query cache is invalidated by mutations, not fed
 *     by the socket.
 *   - AUTH failures converge on the same unauthorized-event shape the HTTP
 *     client emits ({ source: 'ws' } vs { source: 'http' }).
 */

export * from './hooks';
export * from './manager';
export * from './protocol';
