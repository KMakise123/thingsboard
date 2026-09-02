import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { App as AntdApp, ConfigProvider } from 'antd';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ServerErrorError,
  ThingsboardErrorCode,
} from '@/core/http/server-error';
import { Authority, type User } from '@/types/tb';
import type { TwoFaProviderInfo } from '@/types/tb/two-fa';

import MfaPage from './index';

const historyMock = vi.hoisted(() => ({
  location: { pathname: '/user/mfa', search: '', hash: '' },
  replace: vi.fn(),
  push: vi.fn(),
}));

const modelMock = vi.hoisted(() => ({
  initialState: { currentUser: null as User | null },
  setInitialState: vi.fn(),
}));

const servicesMock = vi.hoisted(() => ({
  getTwoFaLoginProviders: vi.fn(),
  sendTwoFaVerificationCode: vi.fn(),
  checkTwoFaVerificationCode: vi.fn(),
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
}));

const tokenStoreMock = vi.hoisted(() => ({
  decodeTokenClaims: vi.fn<() => { sub?: string; scopes?: string[] } | null>(
    () => ({ scopes: ['PRE_VERIFICATION_TOKEN'] }),
  ),
}));

vi.mock('@umijs/max', async () => {
  const { zhFormatMessage } = await import('../test-support');
  return {
    history: historyMock,
    useModel: () => modelMock,
    useIntl: () => ({ formatMessage: zhFormatMessage }),
    FormattedMessage: ({ id }: { id: string }) => zhFormatMessage({ id }),
    Helmet: ({ children }: { children: React.ReactNode }) => children,
    SelectLang: () => null,
    Link: ({ children }: { children: React.ReactNode }) => children,
  };
});

vi.mock('@/services/tb', () => servicesMock);
vi.mock('@/core/auth/token-store', () => ({ tokenStore: tokenStoreMock }));

const smsProvider: TwoFaProviderInfo = {
  type: 'SMS',
  default: true,
  contact: '+47****89',
  minVerificationCodeSendPeriod: 30,
};
const totpProvider: TwoFaProviderInfo = {
  type: 'TOTP',
  default: true,
  contact: '',
  minVerificationCodeSendPeriod: 0,
};
const emailProvider: TwoFaProviderInfo = {
  type: 'EMAIL',
  default: false,
  contact: 't***@example.org',
  minVerificationCodeSendPeriod: 30,
};
const backupProvider: TwoFaProviderInfo = {
  type: 'BACKUP_CODE',
  default: false,
  contact: '',
  minVerificationCodeSendPeriod: 30,
};

const tenantUser = {
  authority: Authority.TENANT_ADMIN,
  email: 'tenant@thingsboard.org',
} as User;

function renderMfa() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {/* motion off — jsdom never fires transitionend, so modal exits hang */}
      <ConfigProvider theme={{ token: { motion: false } }}>
        <AntdApp>
          <MfaPage />
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

async function typeAndSubmit(code: string): Promise<void> {
  await screen.findByPlaceholderText('短信验证码');
  fireEvent.change(screen.getByPlaceholderText('短信验证码'), {
    target: { value: code },
  });
  // antd inserts a space between two CJK button labels ("继 续").
  fireEvent.click(screen.getByRole('button', { name: /继\s*续/ }));
}

describe('mfa verification page', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.clearAllMocks();
    window.history.pushState({}, '', '/user/mfa');
    modelMock.initialState.currentUser = null;
    servicesMock.sendTwoFaVerificationCode.mockResolvedValue(undefined);
    servicesMock.logout.mockResolvedValue(undefined);
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['PRE_VERIFICATION_TOKEN'],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('logs out and returns to login when the token is not a pre-verification token', async () => {
    tokenStoreMock.decodeTokenClaims.mockReturnValue({
      scopes: ['TENANT_ADMIN'],
    });

    renderMfa();

    await waitFor(() => {
      expect(servicesMock.logout).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(historyMock.replace).toHaveBeenCalledWith('/user/login');
    });
    expect(servicesMock.getTwoFaLoginProviders).not.toHaveBeenCalled();
  });

  it('auto-sends a code for a non-TOTP default provider and interpolates the contact', async () => {
    servicesMock.getTwoFaLoginProviders.mockResolvedValue([smsProvider]);

    renderMfa();

    await waitFor(() => {
      expect(servicesMock.sendTwoFaVerificationCode).toHaveBeenCalledWith(
        'SMS',
      );
    });
    expect(
      await screen.findByText('安全码已发送至你的手机 +47****89。'),
    ).toBeInTheDocument();
    // The resend cooldown from the provider info is running.
    expect(await screen.findByText('30 秒后可重新发送')).toBeInTheDocument();
  });

  it('shows no send/resend for a TOTP default provider', async () => {
    servicesMock.getTwoFaLoginProviders.mockResolvedValue([totpProvider]);

    renderMfa();

    expect(
      await screen.findByText('请输入认证应用中的安全码。'),
    ).toBeInTheDocument();
    expect(servicesMock.sendTwoFaVerificationCode).not.toHaveBeenCalled();
    expect(screen.queryByText('重新发送验证码')).not.toBeInTheDocument();
  });

  it('lands on the role page after a correct code', async () => {
    servicesMock.getTwoFaLoginProviders.mockResolvedValue([smsProvider]);
    servicesMock.checkTwoFaVerificationCode.mockResolvedValue({
      token: 't',
      refreshToken: 'r',
    });
    servicesMock.getCurrentUser.mockResolvedValue(tenantUser);

    renderMfa();
    await typeAndSubmit('123456');

    await waitFor(() => {
      expect(servicesMock.checkTwoFaVerificationCode).toHaveBeenCalledWith(
        'SMS',
        '123456',
      );
    });
    await waitFor(() => {
      expect(historyMock.replace).toHaveBeenCalledWith('/devices');
    });
    const updater = modelMock.setInitialState.mock.calls[0][0] as (
      state: unknown,
    ) => { currentUser: User };
    expect(updater({})).toEqual({ currentUser: tenantUser });
  });

  it('honours a safe ?redirect target after the code is checked', async () => {
    window.history.pushState({}, '', '/user/mfa?redirect=%2Falarms');
    servicesMock.getTwoFaLoginProviders.mockResolvedValue([smsProvider]);
    servicesMock.checkTwoFaVerificationCode.mockResolvedValue({
      token: 't',
      refreshToken: 'r',
    });
    servicesMock.getCurrentUser.mockResolvedValue(tenantUser);

    renderMfa();
    await typeAndSubmit('123456');

    await waitFor(() => {
      expect(historyMock.replace).toHaveBeenCalledWith('/alarms');
    });
  });

  it('marks the field incorrect on a 400 and toasts verbatim otherwise', async () => {
    servicesMock.getTwoFaLoginProviders.mockResolvedValue([smsProvider]);
    servicesMock.checkTwoFaVerificationCode.mockRejectedValue(
      new ServerErrorError({
        status: 400,
        errorCode: ThingsboardErrorCode.INVALID_ARGUMENTS,
        detail: 'Verification code is incorrect',
        titleKey: 'tb.error.badRequest',
      }),
    );

    renderMfa();
    await typeAndSubmit('000000');

    expect(await screen.findByText('验证码不正确')).toBeInTheDocument();
    expect(historyMock.replace).not.toHaveBeenCalled();

    servicesMock.checkTwoFaVerificationCode.mockRejectedValue(
      new ServerErrorError({
        status: 503,
        detail: 'Backend on fire',
        titleKey: 'tb.error.server',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: /继\s*续/ }));
    await waitFor(() => {
      expect(document.body.textContent).toContain('Backend on fire');
    });
  });

  it('shows the rate-limit error and clears it after five seconds', async () => {
    servicesMock.getTwoFaLoginProviders.mockResolvedValue([smsProvider]);
    servicesMock.checkTwoFaVerificationCode.mockRejectedValue(
      new ServerErrorError({
        status: 429,
        errorCode: ThingsboardErrorCode.TOO_MANY_REQUESTS,
        detail: 'Too many requests',
        titleKey: 'tb.error.tooManyRequests',
      }),
    );

    renderMfa();
    await typeAndSubmit('000000');

    expect(
      await screen.findByText('验证码校验请求过多，请稍后再试'),
    ).toBeInTheDocument();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5100);
    });
    await waitFor(() => {
      expect(
        screen.queryByText('验证码校验请求过多，请稍后再试'),
      ).not.toBeInTheDocument();
    });
  });

  it('switches to another way and sends for the chosen provider', async () => {
    servicesMock.getTwoFaLoginProviders.mockResolvedValue([
      smsProvider,
      emailProvider,
      backupProvider,
    ]);

    renderMfa();

    // SMS is the default → code form first; switch to the provider list.
    await screen.findByPlaceholderText('短信验证码');
    fireEvent.click(screen.getByRole('button', { name: '试试其他方式' }));
    fireEvent.click(await screen.findByRole('button', { name: /邮\s*箱/ }));
    await waitFor(() => {
      expect(servicesMock.sendTwoFaVerificationCode).toHaveBeenCalledWith(
        'EMAIL',
      );
    });
    expect(
      await screen.findByPlaceholderText('邮箱验证码'),
    ).toBeInTheDocument();
  });

  it('accepts 8 hex chars for backup codes but rejects digits-only longer input', async () => {
    servicesMock.getTwoFaLoginProviders.mockResolvedValue([
      smsProvider,
      backupProvider,
    ]);

    renderMfa();
    await screen.findByPlaceholderText('短信验证码');
    fireEvent.click(screen.getByRole('button', { name: '试试其他方式' }));
    fireEvent.click(await screen.findByRole('button', { name: '备份码' }));

    const input = await screen.findByPlaceholderText('备份码');
    expect(input).toHaveAttribute('maxlength', '8');
    expect(input).toHaveAttribute('inputmode', 'text');
    expect(input).toHaveAttribute('autocomplete', 'one-time-code');
    fireEvent.change(input, { target: { value: 'deadbeef01' } });
    expect(input).toHaveValue('deadbeef');
  });

  it('cancels back to the login page with a logout', async () => {
    servicesMock.getTwoFaLoginProviders.mockResolvedValue([smsProvider]);

    renderMfa();
    await screen.findByPlaceholderText('短信验证码');
    fireEvent.click(screen.getByRole('button', { name: '返回' }));

    await waitFor(() => {
      expect(servicesMock.logout).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(historyMock.replace).toHaveBeenCalledWith('/user/login');
    });
  });
});
