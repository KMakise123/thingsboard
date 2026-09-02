/**
 * Security page tests (hoisted-mock convention): the JWT card copy/expiry
 * behavior, the change-password card (dirty gating, group validation,
 * submit + server-detail error grading) and the 2FA card (empty state,
 * rows, default-method selector, switch → dialog / confirm flows).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServerErrorError } from '@/core/http/server-error';
import zhAccount from '@/locales/zh-CN/account';
import zhCommon from '@/locales/zh-CN/common';
import zhSettings from '@/locales/zh-CN/settings';
import type {
  AccountTwoFaSettings,
  TwoFaProviderType,
} from '@/types/tb/two-fa';

const messages: Record<string, string> = {
  ...zhCommon,
  ...zhSettings,
  ...zhAccount,
  'pages.password.required': '请输入密码。',
  'pages.password.policy.title': '密码要求',
};

const format = (
  descriptor: { id: string },
  values?: Record<string, unknown>,
): string =>
  (messages[descriptor.id] ?? descriptor.id).replace(
    /\{(\w+)\}/g,
    (_match, key: string) => String(values?.[key] ?? ''),
  );

const intlMock = { formatMessage: format };

vi.mock('@umijs/max', () => ({
  useIntl: () => intlMock,
  useModel: () => ({
    initialState: { currentUser: { email: 'tenant@thingsboard.org' } },
    setInitialState: vi.fn(),
  }),
  useSelectedRoutes: vi.fn(() => []),
  useAppData: vi.fn(() => ({ clientRoutes: [] })),
  history: { push: vi.fn(), replace: vi.fn() },
}));

vi.mock('react-intl', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-intl')>();
  return { ...actual, useIntl: () => intlMock };
});

// PageContainer pulls pro-components; render through plain antd to keep the
// vitest module graph resolvable (users-page finding).
vi.mock('@ant-design/pro-components', async () => {
  const { Card } = await import('antd');
  return {
    PageContainer: (props: { children?: React.ReactNode }) => (
      <Card>{props.children}</Card>
    ),
  };
});

const tokenStoreMock = vi.hoisted(() => ({
  tokenStore: {
    getToken: vi.fn(() => 'jwt-1'),
    isTokenValid: vi.fn(() => true),
  },
  TOKEN_STORAGE_KEYS: {
    jwtToken: 'jwt_token',
    jwtTokenExpiration: 'jwt_token_expiration',
    refreshToken: 'refresh_token',
    refreshTokenExpiration: 'refresh_token_expiration',
  },
}));

const authMock = vi.hoisted(() => ({
  changePassword: vi.fn(),
  getUserPasswordPolicy: vi.fn(),
}));

const twoFaMock = vi.hoisted(() => ({
  getAccountTwoFaSettings: vi.fn(),
  getAvailableTwoFaProviderTypes: vi.fn(),
  generateTwoFaAccountConfig: vi.fn(),
  submitTwoFaAccountConfig: vi.fn(),
  verifyAndSaveTwoFaAccountConfig: vi.fn(),
  updateTwoFaAccountConfig: vi.fn(),
  deleteTwoFaAccountConfig: vi.fn(),
}));

vi.mock('@/core/auth/token-store', () => tokenStoreMock);
vi.mock('@/services/tb/auth', () => authMock);
vi.mock('@/services/tb', () => ({
  getUserPasswordPolicy: authMock.getUserPasswordPolicy,
}));
vi.mock('@/services/tb/two-fa-account', () => twoFaMock);

import SecurityPage from './index';

const writeText = vi.fn().mockResolvedValue(undefined);
// happy-dom exposes clipboard as getter-only — replace it once via defineProperty.
Object.defineProperty(navigator, 'clipboard', {
  value: { writeText },
  configurable: true,
});

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <SecurityPage />
      </AntdApp>
    </QueryClientProvider>,
  );
}

function typeInto(input: HTMLElement, value: string) {
  fireEvent.change(input, { target: { value } });
}

describe('security page — JWT card', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('jwt_token', 'jwt-1');
    localStorage.setItem('jwt_token_expiration', String(Date.now() + 60_000));
    tokenStoreMock.tokenStore.isTokenValid.mockReturnValue(true);
    authMock.getUserPasswordPolicy.mockResolvedValue({ minimumLength: 8 });
    authMock.changePassword.mockResolvedValue({
      token: 't',
      refreshToken: 'r',
    });
    twoFaMock.getAvailableTwoFaProviderTypes.mockResolvedValue([]);
  });

  it('shows the formatted expiration and copies the bearer token', async () => {
    localStorage.setItem(
      'jwt_token_expiration',
      String(new Date('2030-01-01T12:34:56').getTime()),
    );
    renderPage();

    expect(await screen.findByText(/Token 有效期至/)).toBeInTheDocument();
    expect(screen.getByText('2030-01-01 12:34:56')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /复制 JWT Token/ }));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('Bearer jwt-1');
    });
    expect(
      await screen.findByText('JWT Token 已复制到剪贴板'),
    ).toBeInTheDocument();
  });

  it('warns instead of copying when the token is expired', async () => {
    tokenStoreMock.tokenStore.isTokenValid.mockReturnValue(false);
    renderPage();
    await screen.findByText(/Token 有效期至/);

    fireEvent.click(screen.getByRole('button', { name: /复制 JWT Token/ }));

    expect(
      await screen.findByText('JWT Token 已过期！请刷新页面。'),
    ).toBeInTheDocument();
    expect(writeText).not.toHaveBeenCalled();
  });
});

describe('security page — change password card', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    tokenStoreMock.tokenStore.isTokenValid.mockReturnValue(true);
    authMock.getUserPasswordPolicy.mockResolvedValue({ minimumLength: 8 });
    authMock.changePassword.mockResolvedValue({
      token: 't',
      refreshToken: 'r',
    });
    twoFaMock.getAvailableTwoFaProviderTypes.mockResolvedValue([]);
  });

  it('gates the actions behind dirty and rejects mismatched confirmation', async () => {
    renderPage();
    await screen.findByText('修改密码');
    // Pristine: no discard/submit buttons in the password card.
    expect(
      screen.queryByRole('button', { name: /^修改密码$/ }),
    ).not.toBeInTheDocument();

    const passwordFields = document.querySelectorAll('input[type="password"]');
    typeInto(passwordFields[0] as HTMLElement, 'current-1');
    // Actions appear once dirty.
    expect(
      await screen.findByRole('button', { name: /^修改密码$/ }),
    ).toBeInTheDocument();

    typeInto(passwordFields[1] as HTMLElement, 'NewPass1!');
    typeInto(passwordFields[2] as HTMLElement, 'NewPass1!-different');
    fireEvent.click(screen.getByRole('button', { name: /^修改密码$/ }));

    expect(
      await screen.findByText('两次输入的新密码不一致'),
    ).toBeInTheDocument();
    expect(authMock.changePassword).not.toHaveBeenCalled();
  });

  it('submits a valid change and resets the form', async () => {
    renderPage();
    await screen.findByText('修改密码');
    const passwordFields = document.querySelectorAll('input[type="password"]');
    typeInto(passwordFields[0] as HTMLElement, 'current-1');
    typeInto(passwordFields[1] as HTMLElement, 'NewPass1!');
    typeInto(passwordFields[2] as HTMLElement, 'NewPass1!');
    fireEvent.click(screen.getByRole('button', { name: /^修改密码$/ }));

    await waitFor(() => {
      expect(authMock.changePassword).toHaveBeenCalledWith(
        'current-1',
        'NewPass1!',
      );
    });
    expect(await screen.findByText('密码修改成功。')).toBeInTheDocument();
  });

  it('rejects a new password identical to the current one', async () => {
    renderPage();
    await screen.findByText('修改密码');
    const passwordFields = document.querySelectorAll('input[type="password"]');
    typeInto(passwordFields[0] as HTMLElement, 'current-1');
    typeInto(passwordFields[1] as HTMLElement, 'current-1');
    typeInto(passwordFields[2] as HTMLElement, 'current-1');
    fireEvent.click(screen.getByRole('button', { name: /^修改密码$/ }));

    expect(
      await screen.findByText('新密码不能与当前密码相同'),
    ).toBeInTheDocument();
    expect(authMock.changePassword).not.toHaveBeenCalled();
  });

  it('grades the wrong-current-password detail onto the current field', async () => {
    authMock.changePassword.mockRejectedValue(
      new ServerErrorError({
        status: 400,
        detail: "Current password doesn't match!",
        titleKey: 'tb.error.badRequest',
      }),
    );
    renderPage();
    await screen.findByText('修改密码');
    const passwordFields = document.querySelectorAll('input[type="password"]');
    typeInto(passwordFields[0] as HTMLElement, 'wrong');
    typeInto(passwordFields[1] as HTMLElement, 'NewPass1!');
    typeInto(passwordFields[2] as HTMLElement, 'NewPass1!');
    fireEvent.click(screen.getByRole('button', { name: /^修改密码$/ }));

    expect(
      await screen.findByText('当前密码不正确，请重试'),
    ).toBeInTheDocument();
  });
});

describe('security page — two-factor auth card', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    tokenStoreMock.tokenStore.isTokenValid.mockReturnValue(true);
    authMock.getUserPasswordPolicy.mockResolvedValue({});
    authMock.changePassword.mockResolvedValue({
      token: 't',
      refreshToken: 'r',
    });
  });

  it('hides the whole card when the platform enables no providers', async () => {
    twoFaMock.getAvailableTwoFaProviderTypes.mockResolvedValue([]);
    renderPage();

    await screen.findByText(/Token 有效期至/);
    expect(screen.queryByText('双因素认证')).not.toBeInTheDocument();
    expect(twoFaMock.getAccountTwoFaSettings).not.toHaveBeenCalled();
  });

  it('renders provider rows with the interpolated activation hints', async () => {
    twoFaMock.getAvailableTwoFaProviderTypes.mockResolvedValue([
      'EMAIL',
      'TOTP',
    ] as Array<TwoFaProviderType>);
    twoFaMock.getAccountTwoFaSettings.mockResolvedValue({
      configs: {
        TOTP: {
          providerType: 'TOTP',
          authUrl: 'otpauth://x',
          useByDefault: true,
        },
        EMAIL: {
          providerType: 'EMAIL',
          email: 'me@acme.io',
          useByDefault: false,
        },
      },
    } as AccountTwoFaSettings);
    renderPage();

    // Rows appear once BOTH the providers and the settings queries settle.
    expect(
      await screen.findByText('验证码将通过 Email 发送到“me@acme.io”'),
    ).toBeInTheDocument();
    expect(await screen.findByText('双因素认证')).toBeInTheDocument();
    // Rows follow the canonical provider order and show the interpolated data.
    expect(screen.getByText('认证器应用已为你的账户启用')).toBeInTheDocument();
    // Two non-BACKUP_CODE providers active → the main-method selector shows.
    const checkboxes = screen.getAllByRole('checkbox', {
      name: /设为主要双因素认证方式/,
    });
    expect(checkboxes).toHaveLength(2);
  });

  it('confirms and deletes through the switch-off flow', async () => {
    twoFaMock.getAvailableTwoFaProviderTypes.mockResolvedValue(['TOTP']);
    twoFaMock.getAccountTwoFaSettings.mockResolvedValue({
      configs: {
        TOTP: {
          providerType: 'TOTP',
          authUrl: 'otpauth://x',
          useByDefault: true,
        },
      },
    });
    twoFaMock.deleteTwoFaAccountConfig.mockResolvedValue({ configs: {} });
    renderPage();
    await screen.findByText('双因素认证');
    const rowSwitch = await screen.findByRole('switch');

    fireEvent.click(rowSwitch);
    // The confirm title is mirrored by antd for a11y — scope to the modal.
    const confirm = await screen.findByText('确定要停用“认证器应用”吗？', {
      selector: '.ant-modal-title',
    });
    expect(confirm).toBeInTheDocument();
    fireEvent.click(within(document.body).getByRole('button', { name: /OK/ }));

    await waitFor(() => {
      expect(twoFaMock.deleteTwoFaAccountConfig).toHaveBeenCalledWith('TOTP');
    });
  });

  it('opens the SMS enable dialog and submits the phone for a code', async () => {
    twoFaMock.getAvailableTwoFaProviderTypes.mockResolvedValue(['SMS']);
    twoFaMock.getAccountTwoFaSettings.mockResolvedValue({ configs: {} });
    twoFaMock.submitTwoFaAccountConfig.mockResolvedValue(undefined);
    twoFaMock.verifyAndSaveTwoFaAccountConfig.mockResolvedValue({
      configs: {},
    });
    renderPage();
    await screen.findByText('双因素认证');
    const rowSwitch = await screen.findByRole('switch');

    fireEvent.click(rowSwitch);
    expect(await screen.findByText('启用短信验证')).toBeInTheDocument();

    typeInto(screen.getByLabelText('手机号码'), '+8613800000000');
    fireEvent.click(screen.getByRole('button', { name: /下一步/ }));

    await waitFor(() => {
      expect(twoFaMock.submitTwoFaAccountConfig).toHaveBeenCalledWith({
        providerType: 'SMS',
        phoneNumber: '+8613800000000',
        useByDefault: true,
      });
    });
    // The verification-code step appears after a successful submission.
    expect(
      await screen.findByText(/输入刚刚发送到“\+8613800000000”的 6 位验证码/),
    ).toBeInTheDocument();
  });

  it('keeps the BACKUP_CODE dialog open to show the one-time codes', async () => {
    twoFaMock.getAvailableTwoFaProviderTypes.mockResolvedValue([
      'TOTP',
      'BACKUP_CODE',
    ] as Array<TwoFaProviderType>);
    // TOTP already active → the BACKUP_CODE switch is unlocked.
    twoFaMock.getAccountTwoFaSettings.mockResolvedValue({
      configs: {
        TOTP: {
          providerType: 'TOTP',
          authUrl: 'otpauth://x',
          useByDefault: true,
        },
      },
    });
    twoFaMock.generateTwoFaAccountConfig.mockResolvedValue({
      providerType: 'BACKUP_CODE',
      codes: ['aaaa-bbbb', 'cccc-dddd'],
    });
    twoFaMock.verifyAndSaveTwoFaAccountConfig.mockResolvedValue({
      configs: {
        TOTP: {
          providerType: 'TOTP',
          authUrl: 'otpauth://x',
          useByDefault: true,
        },
        BACKUP_CODE: {
          providerType: 'BACKUP_CODE',
          codesLeft: 2,
          useByDefault: false,
        },
      },
    });
    renderPage();
    await screen.findByText('双因素认证');
    // Wait for the provider rows to render (both queries settled).
    await screen.findByText('认证器应用已为你的账户启用');
    const switches = screen.getAllByRole('switch');

    fireEvent.click(switches[1]); // BACKUP_CODE
    expect(await screen.findByText('获取备用验证码')).toBeInTheDocument();

    // generate → verifyAndSave both succeed; the codes must be displayed
    // while the dialog STAYS open (one-time display contract).
    await waitFor(() => {
      expect(twoFaMock.verifyAndSaveTwoFaAccountConfig).toHaveBeenCalled();
    });
    expect(await screen.findByText('aaaa-bbbb')).toBeInTheDocument();
    expect(screen.getByText('cccc-dddd')).toBeInTheDocument();
    // Dialog still open: title + download/print actions reachable.
    expect(
      screen.getByRole('button', { name: /下载（txt）/ }),
    ).toBeInTheDocument();
    // Only the user's OK closes it.
    fireEvent.click(screen.getByRole('button', { name: /^OK$/ }));
    await waitFor(() => {
      expect(screen.queryByText('获取备用验证码')).not.toBeInTheDocument();
    });
  });

  it('shows the regenerated backup codes after the confirm dialog', async () => {
    twoFaMock.getAvailableTwoFaProviderTypes.mockResolvedValue([
      'BACKUP_CODE',
    ] as Array<TwoFaProviderType>);
    twoFaMock.getAccountTwoFaSettings.mockResolvedValue({
      configs: {
        BACKUP_CODE: {
          providerType: 'BACKUP_CODE',
          codesLeft: 8,
          useByDefault: true,
        },
      },
    });
    twoFaMock.deleteTwoFaAccountConfig.mockResolvedValue({ configs: {} });
    twoFaMock.generateTwoFaAccountConfig.mockResolvedValue({
      providerType: 'BACKUP_CODE',
      codes: ['1111-2222'],
    });
    twoFaMock.verifyAndSaveTwoFaAccountConfig.mockResolvedValue({
      configs: {
        BACKUP_CODE: {
          providerType: 'BACKUP_CODE',
          codesLeft: 10,
          useByDefault: true,
        },
      },
    });
    renderPage();
    await screen.findByText('双因素认证');

    fireEvent.click(
      await screen.findByRole('button', { name: '获取新的备用验证码' }),
    );
    // The confirm asks before invalidating the remaining codes.
    fireEvent.click(
      await screen.findByRole('button', { name: '获取新验证码' }),
    );

    await waitFor(() => {
      expect(twoFaMock.deleteTwoFaAccountConfig).toHaveBeenCalledWith(
        'BACKUP_CODE',
      );
    });
    expect(await screen.findByText('1111-2222')).toBeInTheDocument();
    // Still open until the user confirms.
    expect(screen.getByText('获取备用验证码')).toBeInTheDocument();
  });
});
