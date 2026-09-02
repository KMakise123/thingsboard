/**
 * Avatar dropdown menu tests (M4): the profile/security entries navigate
 * into the /account family and sign-out keeps its M1 behavior.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhCommon from '@/locales/zh-CN/common';
import zhMenu from '@/locales/zh-CN/menu';

const messages: Record<string, string> = { ...zhCommon, ...zhMenu };

const dropdownMock = vi.hoisted(() => ({
  history: { push: vi.fn(), replace: vi.fn() },
  setInitialState: vi.fn(),
  resetWsManager: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('@umijs/max', () => ({
  history: dropdownMock.history,
  useModel: () => ({
    initialState: { currentUser: { email: 'tenant@thingsboard.org' } },
    setInitialState: dropdownMock.setInitialState,
  }),
  useIntl: () => ({
    formatMessage: ({ id }: { id: string }) => messages[id] ?? id,
  }),
}));

vi.mock('@/services/tb', () => dropdownMock);
vi.mock('@/components/layout/ws-manager', () => ({
  resetWsManager: dropdownMock.resetWsManager,
}));

import { AvatarDropdown } from './AvatarDropdown';

function renderMenu() {
  return render(
    <AntdApp>
      <AvatarDropdown>
        <span>avatar</span>
      </AvatarDropdown>
    </AntdApp>,
  );
}

describe('avatar dropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dropdownMock.logout.mockResolvedValue(undefined);
  });

  async function openMenu() {
    renderMenu();
    fireEvent.mouseEnter(screen.getByText('avatar'));
    return screen.findByText('个人资料');
  }

  it('lists the profile, security and logout entries', async () => {
    await openMenu();
    expect(screen.getByText('安全设置')).toBeInTheDocument();
    expect(screen.getByText('退出登录')).toBeInTheDocument();
  });

  it('navigates to the account pages from the new entries', async () => {
    await openMenu();
    fireEvent.click(screen.getByText('个人资料'));
    await waitFor(() => {
      expect(dropdownMock.history.push).toHaveBeenCalledWith(
        '/account/profile',
      );
    });

    fireEvent.click(screen.getByText('安全设置'));
    await waitFor(() => {
      expect(dropdownMock.history.push).toHaveBeenCalledWith(
        '/account/security',
      );
    });
    expect(dropdownMock.logout).not.toHaveBeenCalled();
  });

  it('keeps sign-out wired to logout + login redirect', async () => {
    await openMenu();
    dropdownMock.history.replace.mockClear();
    fireEvent.click(screen.getByText('退出登录'));

    await waitFor(() => {
      expect(dropdownMock.logout).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(dropdownMock.history.replace).toHaveBeenCalledWith(
        expect.stringContaining('/user/login'),
      );
    });
    expect(dropdownMock.resetWsManager).toHaveBeenCalled();
  });
});
