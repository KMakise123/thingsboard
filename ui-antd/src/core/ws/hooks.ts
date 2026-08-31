/**
 * React binding for the WS manager — useSyncExternalStore subscription hooks.
 *
 * M1 surface: device latest telemetry + attributes (CLIENT/SERVER/SHARED
 * scope) live updates. REST snapshots can be passed as `seed` (one-way: the
 * seed renders immediately, then the first WS snapshot replaces it wholesale).
 *
 * These hooks NEVER write queryClient.setQueryData — the only reverse channel
 * into the query cache is mutation-driven invalidation in the app layer.
 */

import { useEffect, useMemo, useSyncExternalStore } from 'react';

import { tokenStore } from '../auth/token-store';
import { createTokenRefresher } from '../http/client';
import type { AttributeData, AttributeScope } from '@/types/tb';

import {
  type AttributesParams,
  createWsManager,
  type LatestTelemetryParams,
  type WsManager,
  type WsStatus,
  type WsSubscription,
} from './manager';

let defaultManager: WsManager | null = null;
let defaultRefresher: ReturnType<typeof createTokenRefresher> | null = null;

/** Shared refresher so WS AUTH recovery and HTTP 401 share one flight. */
function getRefresher(): ReturnType<typeof createTokenRefresher> {
  if (!defaultRefresher) {
    defaultRefresher = createTokenRefresher();
  }
  return defaultRefresher;
}

/**
 * Process-wide manager (single multiplexed socket). ensureToken refreshes
 * first when the JWT is locally expired — including the forced refresh the
 * manager requests after an AUTH-rejected socket.
 */
export function getDefaultWsManager(): WsManager {
  if (!defaultManager) {
    defaultManager = createWsManager({
      ensureToken: async (forceRefresh?: boolean) => {
        if (!forceRefresh && tokenStore.isTokenValid('jwt')) {
          return tokenStore.getToken();
        }
        const refreshed = await getRefresher()();
        return refreshed ? tokenStore.getToken() : null;
      },
    });
  }
  return defaultManager;
}

/** Test/app seam: swap the process-wide manager (also resets nothing else). */
export function setDefaultWsManager(manager: WsManager | null): void {
  defaultManager?.close();
  defaultManager = manager;
}

export interface SubscriptionResult<T> {
  data: T;
  status: WsStatus;
}

export interface UseAttributesParams extends AttributesParams {
  /** Stable reference required (module pattern: memoize at the call site). */
  scope?: AttributeScope;
}

function useWsSubscription<T>(
  subscription: WsSubscription<T>,
): SubscriptionResult<T> {
  useEffect(
    () => () => {
      subscription.unsubscribe();
    },
    [subscription],
  );
  // subscribe/getSnapshot are stable properties of the subscription object.
  const data = useSyncExternalStore(
    (listener) => subscription.subscribe(listener),
    () => subscription.getSnapshot(),
  );
  return { data, status: subscription.getStatus() };
}

/** Live attribute table for an entity (attributes tab, scope switchable). */
export function useAttributeSubscription(
  params: UseAttributesParams,
): SubscriptionResult<AttributeData[]> {
  const manager = getDefaultWsManager();
  const entityType = params.entityId.entityType;
  const entityId = params.entityId.id;
  const scope = params.scope;
  const keys = params.keys?.join(',') ?? '';
  const seed = params.seed;

  const subscription = useMemo(() => {
    return manager.subscribeAttributes({
      entityId: { entityType, id: entityId },
      scope,
      keys: keys ? keys.split(',') : undefined,
      seed,
    });
  }, [manager, entityType, entityId, scope, keys, seed]);
  return useWsSubscription(subscription);
}

/** Live latest-telemetry table for an entity (latest telemetry tab). */
export function useLatestTelemetrySubscription(
  params: LatestTelemetryParams,
): SubscriptionResult<AttributeData[]> {
  const manager = getDefaultWsManager();
  const entityType = params.entityId.entityType;
  const entityId = params.entityId.id;
  const keys = params.keys?.join(',') ?? '';
  const timeWindowMs = params.timeWindowMs ?? 60_000;
  const seed = params.seed;

  const subscription = useMemo(() => {
    return manager.subscribeLatestTelemetry({
      entityId: { entityType, id: entityId },
      keys: keys ? keys.split(',') : undefined,
      timeWindowMs,
      seed,
    });
  }, [manager, entityType, entityId, keys, timeWindowMs, seed]);
  return useWsSubscription(subscription);
}
