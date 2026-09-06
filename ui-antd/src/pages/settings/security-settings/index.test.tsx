/**
 * Security-settings page tests (M14 wave-2, spec 6.4-1/2/3):
 *  - the password-policy front-end matrix is the only defense (contract
 *    #6): a maximumLength BELOW minimumLength blocks the save chain;
 *  - the JWT save chain requires a confirmation when issuer/key changed
 *    and CANCELING it sends nothing (cancel = no request);
 *  - confirming posts the settings and swaps the returned JwtPair into the
 *    token store (contract #5, in-place reissue).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { App as AntdApp, ConfigProvider } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhCommon from '@/locales/zh-CN/common';
import zhSettings from '@/locales/zh-CN/settings';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhSettings },
});

const routerMock = vi.hoisted(() => ({
  setInitialState: vi.fn(),
}));

vi.mock('@umijs/max', () => ({
  history: { push: vi.fn(), replace: vi.fn() },
  useModel: (_name: string) => ({
    initialState: { fetchUserInfo: vi.fn(async () => ({ name: 'sysadm' })) },
    setInitialState: routerMock.setInitialState,
  }),
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

const servicesMock = vi.hoisted(() => ({
  getSecuritySettings: vi.fn(),
  saveSecuritySettings: vi.fn(),
  getJwtSettings: vi.fn(),
  saveJwtSettings: vi.fn(),
}));

vi.mock('@/services/tb/admin', () => servicesMock);

const tokenStoreMock = vi.hoisted(() => ({
  setTokens: vi.fn(),
}));

vi.mock('@/core/auth/token-store', () => ({
  tokenStore: tokenStoreMock,
}));

import SettingsSecuritySettingsPage from './index';

const SECURITY_SNAPSHOT = {
  passwordPolicy: {
    minimumLength: 8,
    maximumLength: 32,
    minimumUppercaseLetters: 1,
    minimumLowercaseLetters: 1,
    minimumDigits: 1,
    minimumSpecialCharacters: 0,
    allowWhitespaces: true,
    forceUserToResetPasswordIfNotValid: false,
    passwordExpirationPeriodDays: 0,
    passwordReuseFrequencyDays: 0,
  },
  maxFailedLoginAttempts: 10,
  userLockoutNotificationEmail: 'ops@example.com',
  mobileSecretKeyLength: 24,
  userActivationTokenTtl: 24,
  passwordResetTokenTtl: 24,
};

const JWT_SNAPSHOT = {
  tokenIssuer: 'thingsboard.io',
  tokenSigningKey: btoa('a'.repeat(64)),
  tokenExpirationTime: 9000,
  refreshTokenExpTime: 604800,
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={{ token: { motion: false } }}>
        <AntdApp>
          <RawIntlProvider value={intl}>
            <SettingsSecuritySettingsPage />
          </RawIntlProvider>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

function saveButtons(): Array<HTMLButtonElement> {
  return screen
    .getAllByText(/保\s*存/)
    .map((label) => label.closest('button') as HTMLButtonElement);
}

/** rc-input-number needs an input event to parse and a blur to commit. */
async function numberInput(id: string): Promise<HTMLInputElement> {
  return waitFor(() => {
    const el = document.querySelector(`input[id='${id}']`);
    if (!el) {
      throw new Error(`input not found: ${id}`);
    }
    return el as HTMLInputElement;
  });
}

function fillNumber(input: HTMLInputElement, value: string) {
  fireEvent.input(input, { target: { value } });
  fireEvent.blur(input);
}

async function textInput(id: string): Promise<HTMLInputElement> {
  return numberInput(id);
}

async function confirmDialog(): Promise<HTMLElement> {
  return waitFor(() => {
    const dialog = document.querySelector('.ant-modal-confirm');
    if (!dialog) {
      throw new Error('confirm dialog not rendered yet');
    }
    return dialog as HTMLElement;
  });
}

describe('settings security-settings page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicesMock.getSecuritySettings.mockResolvedValue(SECURITY_SNAPSHOT);
    servicesMock.saveSecuritySettings.mockImplementation(
      async (body: unknown) => body,
    );
    servicesMock.getJwtSettings.mockResolvedValue(JWT_SNAPSHOT);
    servicesMock.saveJwtSettings.mockResolvedValue({
      token: 'fresh-token',
      refreshToken: 'fresh-refresh',
    });
  });

  it('renders both cards with independent save chains', async () => {
    renderPage();
    expect(await screen.findByText('安全设置')).toBeDefined();
    expect(await screen.findByText('JWT 安全设置')).toBeDefined();
    const buttons = saveButtons();
    expect(buttons).toHaveLength(2);
    // Pristine forms keep both save chains disabled.
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeDisabled();
  });

  it('blocks the save when maximumLength drops below minimumLength', async () => {
    renderPage();
    const maximum = await numberInput('passwordPolicy_maximumLength');

    fillNumber(maximum, '4');
    fireEvent.click(saveButtons()[0]);

    // The cross-field rule flags the form invalid → the chain stays shut
    // (the server would silently accept max ≤ min, contract #6).
    await waitFor(() => {
      const errors = document.querySelectorAll('.ant-form-item-explain-error');
      expect(errors.length).toBeGreaterThan(0);
    });
    expect(screen.getByText('最长密码长度必须大于最短密码长度')).toBeDefined();
    expect(servicesMock.saveSecuritySettings).not.toHaveBeenCalled();
  });

  it('cancelling the JWT confirmation sends nothing', async () => {
    renderPage();
    const issuer = await textInput('tokenIssuer');
    fireEvent.change(issuer, { target: { value: 'changed.example.com' } });
    fireEvent.click(saveButtons()[1]);

    // The confirm dialog appears first — the mutation stays idle. (The
    // title renders twice in antd's confirm DOM — assert via the confirm
    // title class.)
    const dialog = await confirmDialog();
    expect(dialog.querySelector('.ant-modal-confirm-title')?.textContent).toBe(
      '所有用户将被重新登录',
    );
    expect(servicesMock.saveJwtSettings).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByText('放弃更改'));
    // Cancel = no request at all (contract #5 chain).
    expect(servicesMock.saveJwtSettings).not.toHaveBeenCalled();
    expect(tokenStoreMock.setTokens).not.toHaveBeenCalled();
  });

  it('confirming the JWT dialog swaps the fresh token pair in place', async () => {
    renderPage();
    const issuer = await textInput('tokenIssuer');
    fireEvent.change(issuer, { target: { value: 'changed.example.com' } });
    fireEvent.click(saveButtons()[1]);
    const dialog = await confirmDialog();
    fireEvent.click(within(dialog).getByText(/确\s*认/));

    await waitFor(() => {
      expect(servicesMock.saveJwtSettings).toHaveBeenCalledWith({
        ...JWT_SNAPSHOT,
        tokenIssuer: 'changed.example.com',
      });
    });
    // In-place reissue (contract #5): the fresh pair lands in the token
    // store BEFORE any follow-up call refreshes the session user.
    expect(tokenStoreMock.setTokens).toHaveBeenCalledWith(
      'fresh-token',
      'fresh-refresh',
    );
  });
});
