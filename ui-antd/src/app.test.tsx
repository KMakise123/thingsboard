import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TOKEN_STORAGE_KEYS, tokenStore } from '@/core/auth/token-store';
import { Authority, type User } from '@/types/tb';

const historyMock = vi.hoisted(() => ({
  location: { pathname: '/', search: '', hash: '' },
  replace: vi.fn(),
  push: vi.fn(),
}));

const servicesMock = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  setTbLanguage: vi.fn(),
  setTbUnauthorizedHandler: vi.fn(),
}));

const wsMock = vi.hoisted(() => ({
  installAppWsManager: vi.fn(),
  resetWsManager: vi.fn(),
}));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  getLocale: () => 'zh-CN',
  Link: ({ children }: { children: unknown }) => children,
  useModel: () => ({ initialState: {}, setInitialState: vi.fn() }),
  useIntl: () => ({ formatMessage: ({ id }: { id: string }) => id }),
}));

vi.mock('@/services/tb', () => servicesMock);

vi.mock('@/components/layout/ws-manager', () => wsMock);

vi.mock('@/components', () => ({
  AvatarDropdown: () => null,
  ErrorBoundary: ({ children }: { children: unknown }) => children,
  Footer: () => null,
  LangDropdown: () => null,
  OfflineBanner: () => null,
}));

vi.mock('../config/defaultSettings', () => ({
  default: { navTheme: 'light' },
}));

/** Minimal decodable JWT (header.payload.sig) with iat/exp claims. */
function makeToken(ttlSeconds = 3600): string {
  const now = Math.floor(Date.now() / 1000);
  const b64url = (value: unknown) =>
    btoa(JSON.stringify(value))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  return `${b64url({ alg: 'none', typ: 'JWT' })}.${b64url({ iat: now, exp: now + ttlSeconds })}.sig`;
}

function seedSession(): void {
  tokenStore.setTokens(makeToken(), makeToken());
}

const tenantUser = {
  authority: Authority.TENANT_ADMIN,
  email: 'tenant@thingsboard.org',
} as User;

describe('app composition root', () => {
  beforeEach(() => {
    // app.tsx wires the composition root at module scope (runs once), so
    // only per-call mocks are reset — boot-time call counts must survive.
    servicesMock.getCurrentUser.mockReset();
    servicesMock.setTbLanguage.mockClear();
    historyMock.replace.mockClear();
    wsMock.resetWsManager.mockClear();
    localStorage.clear();
    historyMock.location = { pathname: '/', search: '', hash: '' };
  });

  describe('getInitialState', () => {
    it('returns null user without any local session and skips the network', async () => {
      const { getInitialState } = await import('./app');

      const state = await getInitialState();

      expect(state.currentUser).toBeNull();
      expect(servicesMock.getCurrentUser).not.toHaveBeenCalled();
      expect(state.fetchUserInfo).toBeDefined();
      expect(state.settings).toEqual({ navTheme: 'light' });
    });

    it('fetches the current user when a valid session exists', async () => {
      seedSession();
      servicesMock.getCurrentUser.mockResolvedValue(tenantUser);
      const { getInitialState } = await import('./app');

      const state = await getInitialState();

      expect(servicesMock.getCurrentUser).toHaveBeenCalledTimes(1);
      expect(state.currentUser).toEqual(tenantUser);
    });

    it('returns null user when the session cannot be resolved', async () => {
      seedSession();
      servicesMock.getCurrentUser.mockRejectedValue(new Error('401'));
      const { getInitialState } = await import('./app');

      const state = await getInitialState();

      expect(state.currentUser).toBeNull();
    });

    it('wires Accept-Language to the restored umi locale', async () => {
      const { getInitialState } = await import('./app');
      await getInitialState();

      expect(servicesMock.setTbLanguage).toHaveBeenCalled();
    });
  });

  describe('unified unauthorized exit', () => {
    async function registeredHandler(): Promise<(event: unknown) => void> {
      await import('./app');
      expect(servicesMock.setTbUnauthorizedHandler).toHaveBeenCalled();
      const calls = servicesMock.setTbUnauthorizedHandler.mock.calls;
      return calls[calls.length - 1][0];
    }

    it('clears tokens, recycles the socket and redirects with the current URL', async () => {
      const handler = await registeredHandler();
      seedSession();
      historyMock.location = {
        pathname: '/devices',
        search: '?page=2',
        hash: '',
      };

      handler({ source: 'http', reason: 'refresh-failed' });

      expect(tokenStore.getToken()).toBeNull();
      expect(localStorage.getItem(TOKEN_STORAGE_KEYS.refreshToken)).toBeNull();
      expect(wsMock.resetWsManager).toHaveBeenCalled();
      expect(historyMock.replace).toHaveBeenCalledWith(
        `/user/login?redirect=${encodeURIComponent('/devices?page=2')}`,
      );
    });

    it('does not redirect again while already in the login family', async () => {
      const handler = await registeredHandler();
      seedSession();
      historyMock.location = {
        pathname: '/user/login',
        search: '',
        hash: '',
      };

      handler({ source: 'ws' });

      expect(historyMock.replace).not.toHaveBeenCalled();
      expect(tokenStore.getToken()).toBeNull();
    });

    it('installs the shell-owned WS manager at boot', async () => {
      await import('./app');
      expect(wsMock.installAppWsManager).toHaveBeenCalledTimes(1);
    });
  });
});
