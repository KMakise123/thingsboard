import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Authority, type User } from '@/types/tb';

import Entry from './index';

const historyMock = vi.hoisted(() => ({
  location: { pathname: '/settings', search: '', hash: '' },
  replace: vi.fn(),
  push: vi.fn(),
}));

const modelMock = vi.hoisted(() => ({
  initialState: { currentUser: null as User | null },
}));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useModel: () => modelMock,
}));

const sysAdmin = {
  authority: Authority.SYS_ADMIN,
  email: 'sysadmin@thingsboard.org',
} as User;
const tenantAdmin = {
  authority: Authority.TENANT_ADMIN,
  email: 'tenant@thingsboard.org',
} as User;

describe('settings entry (role-aware landing, M14 R01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    modelMock.initialState = { currentUser: null };
  });

  it('sends the sys admin to general settings', async () => {
    modelMock.initialState = { currentUser: sysAdmin };
    render(<Entry />);
    await waitFor(() => {
      expect(historyMock.replace).toHaveBeenCalledWith('/settings/general');
    });
  });

  it('sends the tenant admin to the home settings tab', async () => {
    modelMock.initialState = { currentUser: tenantAdmin };
    render(<Entry />);
    await waitFor(() => {
      expect(historyMock.replace).toHaveBeenCalledWith('/settings/home');
    });
  });

  it('waits (spinner) while the session is still loading', () => {
    const { container } = render(<Entry />);
    expect(historyMock.replace).not.toHaveBeenCalled();
    expect(container.querySelector('.ant-spin')).not.toBeNull();
  });
});
