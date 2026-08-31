import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Authority, type User } from '@/types/tb';

import { SetPasswordForm } from './set-password-form';

const historyMock = vi.hoisted(() => ({
  location: { pathname: '/user/reset-password', search: '', hash: '' },
  replace: vi.fn(),
  push: vi.fn(),
}));

const servicesMock = vi.hoisted(() => ({
  login: vi.fn(),
  getCurrentUser: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPasswordByToken: vi.fn(),
  activate: vi.fn(),
  getUserPasswordPolicy: vi.fn(),
}));

vi.mock('@umijs/max', async () => {
  const { zhFormatMessage } = await import('../test-support');
  return {
    history: historyMock,
    useModel: () => ({
      initialState: { currentUser: null as User | null },
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

const policy = {
  minimumLength: 8,
  minimumDigits: 2,
  allowWhitespaces: false,
};

function renderForm(
  props: Partial<React.ComponentProps<typeof SetPasswordForm>> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <SetPasswordForm
          mode="reset"
          token="the-token"
          submitLabel="重置密码"
          onSuccess={vi.fn()}
          {...props}
        />
      </AntdApp>
    </QueryClientProvider>,
  );
}

function fillPassword(value: string): void {
  fireEvent.change(screen.getByLabelText('新密码'), {
    target: { value },
  });
  fireEvent.change(screen.getByLabelText('确认新密码'), {
    target: { value },
  });
}

describe('set-password form (reset / create / expired)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicesMock.getUserPasswordPolicy.mockResolvedValue(policy);
    window.history.pushState(
      {},
      '',
      '/user/reset-password?resetToken=the-token',
    );
  });

  it('renders the fetched password policy as live hints', async () => {
    renderForm();
    await waitFor(() => {
      expect(screen.getByText('长度不少于 8 个字符')).toBeInTheDocument();
    });
    expect(screen.getByText('至少包含 2 个数字')).toBeInTheDocument();
    expect(screen.getByText('不能包含空白字符')).toBeInTheDocument();
    expect(servicesMock.getUserPasswordPolicy).toHaveBeenCalledTimes(1);
  });

  it('rejects a password that violates the policy before any request', async () => {
    const { container } = renderForm();
    await screen.findByText('长度不少于 8 个字符');

    fillPassword('short1');
    fireEvent.click(screen.getByRole('button', { name: '重置密码' }));

    // The joined policy violations surface as field errors (the same texts
    // also live in the hint list, so assert on the error slot instead).
    await waitFor(() => {
      expect(
        container.querySelectorAll('.ant-form-item-explain-error'),
      ).not.toHaveLength(0);
    });
    expect(servicesMock.resetPasswordByToken).not.toHaveBeenCalled();
  });

  it('flags mismatching confirmation before any request', async () => {
    renderForm();
    await screen.findByText('长度不少于 8 个字符');

    fireEvent.change(screen.getByLabelText('新密码'), {
      target: { value: 'Passw0rd12' },
    });
    fireEvent.change(screen.getByLabelText('确认新密码'), {
      target: { value: 'Passw0rd13' },
    });
    fireEvent.click(screen.getByRole('button', { name: '重置密码' }));

    await waitFor(() => {
      expect(screen.getByText('两次输入的密码不一致')).toBeInTheDocument();
    });
    expect(servicesMock.resetPasswordByToken).not.toHaveBeenCalled();
  });

  it('submits a policy-compliant reset and reports success', async () => {
    const onSuccess = vi.fn();
    renderForm({ onSuccess });
    await screen.findByText('长度不少于 8 个字符');
    servicesMock.resetPasswordByToken.mockResolvedValue(undefined);

    fillPassword('Passw0rd12');
    fireEvent.click(screen.getByRole('button', { name: '重置密码' }));

    await waitFor(() => {
      expect(servicesMock.resetPasswordByToken).toHaveBeenCalledWith(
        'the-token',
        'Passw0rd12',
      );
    });
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('falls back to plain required validation when the policy fetch fails', async () => {
    servicesMock.getUserPasswordPolicy.mockRejectedValue(new Error('net'));
    renderForm();
    // No policy hints, but the form still renders and submits.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '重置密码' })).toBeEnabled();
    });
    expect(screen.queryByText('密码策略')).not.toBeInTheDocument();
  });

  it('drops the session returned by activate and reports success (create-password flow)', async () => {
    // activate returns a session that spec §3.1 deliberately discards —
    // the user lands on the login page with the new password.
    servicesMock.activate.mockResolvedValue({
      token: 'fresh',
      refreshToken: 'pair',
      scope: Authority.TENANT_ADMIN,
    });
    const onSuccess = vi.fn();
    renderForm({ mode: 'activate', onSuccess });
    await screen.findByText('长度不少于 8 个字符');

    fillPassword('Passw0rd12');
    fireEvent.click(screen.getByRole('button', { name: '重置密码' }));

    await waitFor(() => {
      expect(servicesMock.activate).toHaveBeenCalledWith(
        'the-token',
        'Passw0rd12',
        true,
      );
    });
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
