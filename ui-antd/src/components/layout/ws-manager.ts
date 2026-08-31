import { tokenStore } from '@/core/auth/token-store';
import {
  createTokenRefresher,
  type UnauthorizedEvent,
} from '@/core/http/client';
import {
  createWsManager,
  setDefaultWsManager,
  type WsManager,
} from '@/core/ws';

/**
 * App-layer install of the process-wide WS manager (composition-root duty).
 *
 * core/ws's own default manager (hooks.getDefaultWsManager) has no
 * onUnauthorized exit, so the shell installs its own instance with the
 * unified auth handler wired. `resetWsManager` is the logout path: it
 * closes the live socket and reinstalls a fresh manager so the next
 * session keeps the unauthorized wiring.
 */

const refreshTokens = createTokenRefresher();

let unauthorizedHandler: ((event: UnauthorizedEvent) => void) | undefined;

function createAppWsManager(): WsManager {
  return createWsManager({
    // Same contract as core/ws hooks: serve a locally-valid JWT, otherwise
    // refresh first (shared single-flight refresher shape).
    ensureToken: async (forceRefresh?: boolean) => {
      if (!forceRefresh && tokenStore.isTokenValid('jwt')) {
        return tokenStore.getToken();
      }
      const refreshed = await refreshTokens();
      return refreshed ? tokenStore.getToken() : null;
    },
    onUnauthorized: (event) => unauthorizedHandler?.(event),
  });
}

/** Boot wiring: install the shell-owned manager with the auth exit. */
export function installAppWsManager(
  handler: (event: UnauthorizedEvent) => void,
): void {
  unauthorizedHandler = handler;
  setDefaultWsManager(createAppWsManager());
}

/** Logout wiring: close the socket, keep the unauthorized handler armed. */
export function resetWsManager(): void {
  setDefaultWsManager(createAppWsManager());
}
