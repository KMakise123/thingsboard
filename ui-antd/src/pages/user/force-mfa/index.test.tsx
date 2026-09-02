import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp, ConfigProvider } from 'antd';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServerErrorError } from '@/core/http/server-error';
import type {
  AccountTwoFaSettings,
  TwoFaProviderType,
} from '@/types/tb/two-fa';

import ForceMfaPage from './index';

const historyMock = vi.hoisted(() => ({
  location: { pathname: '/user/force-mfa', search: '', hash: '' },
  replace: vi.fn(),
  push: vi.fn(),
}));

const servicesMock = vi.hoisted(() => ({
  logout: vi.fn(),
}));

const accountMock = vi.hoisted(() => ({
  getAvailableTwoFaProviderTypes: vi.fn(),
  getAccountTwoFaSettings: vi.fn(),
  generateTwoFaAccountConfig: vi.fn(),
  submitTwoFaAccountConfig: vi.fn(),
  verifyAndSaveTwoFaAccountConfig: vi.fn(),
}));

const tokenStoreMock = vi.hoisted(() => ({
  decodeTokenClaims: vi.fn<() => { sub?: string; scopes?: string[] } | null>(
    () => ({
      sub: 'tenant@thingsboard.org',
      scopes: ['MFA_CONFIGURATION_TOKEN'],
    }),
  ),
}));

vi.mock('@umijs/max', async () => {
  const { zhFormatMessage } = await import('../test-support');
  return {
    history: historyMock,
    useModel: () => ({
      initialState: { currentUser: null },
      setInitialState: vi.fn(),
    }),
    useIntl: () => ({ formatMessage: zhFormatMessage }),
    FormattedMessage: ({ id }: { id: string }) => zhFormatMessage({ id }),
    Helmet: ({ children }: { children: React.ReactNode }) => children,
    SelectLang: () => null,
    Link: ({ children }: { children: React.ReactNode }) => children,
  };
});

vi.mock('@/services/tb', () => servicesMock);
vi.mock('@/services/tb/two-fa-account', () => accountMock);
vi.mock('@/core/auth/token-store', () => ({ tokenStore: tokenStoreMock }));

const totpAuthUrl =
  'otpauth://totp/ThingsBoard:tenant%40thingsboard.org?secret=ABC234DEF567&issuer=ThingsBoard';

function renderForceMfa() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {/* motion off — jsdom never fires transitionend, so modal exits hang */}
      <ConfigProvider theme={{ token: { motion: false } }}>
        <AntdApp>
          <ForceMfaPage />
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

const emptySettings: AccountTwoFaSettings = { configs: {} };

async function openTotp(fresh: boolean): Promise<void> {
  accountMock.getAvailableTwoFaProviderTypes.mockResolvedValue([
    'TOTP',
    'SMS',
    'EMAIL',
    'BACKUP_CODE',
  ]);
  accountMock.getAccountTwoFaSettings.mockResolvedValue(emptySettings);
  accountMock.generateTwoFaAccountConfig.mockImplementation(
    async (providerType: TwoFaProviderType) => {
      if (providerType === 'TOTP') {
        return { providerType, authUrl: totpAuthUrl, useByDefault: fresh };
      }
      return {
        providerType,
        codes: ['ab12cd34', 'ef56ab78'],
        codesLeft: 2,
        useByDefault: fresh,
      };
    },
  );
  accountMock.verifyAndSaveTwoFaAccountConfig.mockResolvedValue(emptySettings);

  renderForceMfa();
  fireEvent.click(
    await screen.findByRole('button', { name: /认\s*证\s*应\s*用/ }),
  );
}

describe('force-mfa enrollment page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, '', '/user/force-mfa');
    servicesMock.logout.mockResolvedValue(undefined);
    accountMock.submitTwoFaAccountConfig.mockResolvedValue(undefined);
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      sub: 'tenant@thingsboard.org',
      scopes: ['MFA_CONFIGURATION_TOKEN'],
    });
  });

  it('logs out and returns to login when the token is not a configuration token', async () => {
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['PRE_VERIFICATION_TOKEN'],
    });

    renderForceMfa();

    await waitFor(() => {
      expect(servicesMock.logout).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(historyMock.replace).toHaveBeenCalledWith('/user/login');
    });
    expect(accountMock.getAccountTwoFaSettings).not.toHaveBeenCalled();
  });

  it('hides BACKUP_CODE for a fresh account and marks the required title', async () => {
    accountMock.getAvailableTwoFaProviderTypes.mockResolvedValue([
      'TOTP',
      'SMS',
      'EMAIL',
      'BACKUP_CODE',
    ]);
    accountMock.getAccountTwoFaSettings.mockResolvedValue(emptySettings);

    renderForceMfa();

    expect(await screen.findByText('需要两步验证')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /认\s*证\s*应\s*用/ }),
    ).toBeEnabled();
    expect(screen.getByRole('button', { name: /短\s*信/ })).toBeEnabled();
    expect(screen.getByRole('button', { name: /邮\s*箱/ })).toBeEnabled();
    expect(
      screen.queryByRole('button', { name: /备\s*份\s*码/ }),
    ).not.toBeInTheDocument();
  });

  it('keeps BACKUP_CODE and disables configured providers for an already-configured account', async () => {
    accountMock.getAvailableTwoFaProviderTypes.mockResolvedValue([
      'TOTP',
      'SMS',
      'EMAIL',
      'BACKUP_CODE',
    ]);
    accountMock.getAccountTwoFaSettings.mockResolvedValue({
      configs: {
        TOTP: {
          providerType: 'TOTP',
          authUrl: 'otpauth://x',
          useByDefault: true,
        },
      },
    });

    renderForceMfa();

    expect(await screen.findByText('两步验证')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /认\s*证\s*应\s*用/ }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: /备\s*份\s*码/ })).toBeEnabled();
  });

  it('runs the TOTP flow: generate, secret, code, activate and land on success', async () => {
    await openTotp(true);

    // generate + plain secret shown (QR rendering is W2's dependency)
    await waitFor(() => {
      expect(accountMock.generateTwoFaAccountConfig).toHaveBeenCalledWith(
        'TOTP',
      );
    });
    expect(await screen.findByText('ABC234DEF567')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /继\s*续/ }));
    const input = await screen.findByPlaceholderText('6 位验证码');
    fireEvent.change(input, { target: { value: '654321' } });
    fireEvent.click(screen.getByRole('button', { name: /确\s*认/ }));

    await waitFor(() => {
      expect(accountMock.verifyAndSaveTwoFaAccountConfig).toHaveBeenCalledWith(
        { providerType: 'TOTP', authUrl: totpAuthUrl, useByDefault: true },
        '654321',
      );
    });
    expect(await screen.findByText('认证应用已启用')).toBeInTheDocument();
  });

  it('marks a 400 as an incorrect-code field error without leaving the step', async () => {
    await openTotp(true);
    await screen.findByText('ABC234DEF567');
    fireEvent.click(screen.getByRole('button', { name: /继\s*续/ }));
    const input = await screen.findByPlaceholderText('6 位验证码');
    fireEvent.change(input, { target: { value: '000000' } });
    accountMock.verifyAndSaveTwoFaAccountConfig.mockRejectedValue(
      new ServerErrorError({
        status: 400,
        detail: 'Verification code is incorrect',
        titleKey: 'tb.error.badRequest',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: /确\s*认/ }));

    expect(await screen.findByText('验证码不正确')).toBeInTheDocument();
    expect(historyMock.replace).not.toHaveBeenCalled();
  });

  it('sends the SMS config and shows the phone in the code step', async () => {
    accountMock.getAvailableTwoFaProviderTypes.mockResolvedValue([
      'TOTP',
      'SMS',
      'EMAIL',
    ]);
    accountMock.getAccountTwoFaSettings.mockResolvedValue(emptySettings);

    renderForceMfa();
    fireEvent.click(await screen.findByRole('button', { name: /短\s*信/ }));

    const phone = await screen.findByPlaceholderText('+8613800138000');
    // invalid input keeps the send button disabled
    fireEvent.change(phone, { target: { value: '13800138000' } });
    expect(
      screen.getByRole('button', { name: /发\s*送\s*验\s*证\s*码/ }),
    ).toBeDisabled();
    fireEvent.change(phone, { target: { value: '+8613800138000' } });
    const sendButton = screen.getByRole('button', {
      name: /发\s*送\s*验\s*证\s*码/,
    });
    await waitFor(() => {
      expect(sendButton).toBeEnabled();
    });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(accountMock.submitTwoFaAccountConfig).toHaveBeenCalledWith({
        providerType: 'SMS',
        useByDefault: true,
        phoneNumber: '+8613800138000',
      });
    });
    expect(
      await screen.findByText('我们刚向 +8613800138000 发送了 6 位验证码'),
    ).toBeInTheDocument();
  });

  it('prefills the email from the token subject', async () => {
    accountMock.getAvailableTwoFaProviderTypes.mockResolvedValue([
      'TOTP',
      'EMAIL',
    ]);
    accountMock.getAccountTwoFaSettings.mockResolvedValue(emptySettings);

    renderForceMfa();
    fireEvent.click(await screen.findByRole('button', { name: /邮\s*箱/ }));

    const email = await screen.findByPlaceholderText('邮箱');
    expect(email).toHaveValue('tenant@thingsboard.org');
  });

  it('offers another provider on the success screen while slots remain', async () => {
    await openTotp(true);
    await screen.findByText('ABC234DEF567');
    fireEvent.click(screen.getByRole('button', { name: /继\s*续/ }));
    const input = await screen.findByPlaceholderText('6 位验证码');
    fireEvent.change(input, { target: { value: '654321' } });
    fireEvent.click(screen.getByRole('button', { name: /确\s*认/ }));

    await screen.findByText('认证应用已启用');
    expect(
      screen.getByRole('button', { name: '添加验证方式' }),
    ).toBeInTheDocument();

    // 登录 ends the flow with a logout back to the login page.
    fireEvent.click(screen.getByRole('button', { name: /登\s*录/ }));
    await waitFor(() => {
      expect(servicesMock.logout).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(historyMock.replace).toHaveBeenCalledWith('/user/login');
    });
  });
});
