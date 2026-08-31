/**
 * src/core/ws — the /api/ws subscription manager (first-class M1 deliverable).
 *
 * Public surface:
 *   protocol.ts  wire types for the 8 command families + server updates
 *   manager.ts   createWsManager — single socket, AUTH, reconnect, buffers
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

export * from './protocol';
export * from './manager';
export * from './hooks';
