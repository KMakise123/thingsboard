import { render, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Authority, type User } from '@/types/tb';

import Entry from './entry';

const historyMock = vi.hoisted(() => ({
  location: { pathname: '/', search: '', hash: '' },
  replace: vi.fn(),
  push: vi.fn(),
}));

const tokenStoreMock = vi.hoisted(() => ({
  setTokens: vi.fn(),
  decodeTokenClaims: vi.fn(() => null),
}));

const modelMock = vi.hoisted(() => ({
  initialState: { currentUser: null as User | null },
  setInitialState: vi.fn(),
}));

const servicesMock = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
}));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useModel: () => modelMock,
}));

vi.mock('@/core/auth/token-store', () => ({ tokenStore: tokenStoreMock }));

vi.mock('@/services/tb', () => servicesMock);

// Apply updaters for real so the redirect effect can re-fire on the new state.
modelMock.setInitialState.mockImplementation(
  (updater: (state: unknown) => { currentUser: User | null }) => {
    modelMock.initialState = updater(modelMock.initialState);
  },
);

const tenantUser = {
  authority: Authority.TENANT_ADMIN,
  email: 'tenant@thingsboard.org',
} as User;

describe('home entry (oauth2 callback consumption)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    modelMock.initialState = { currentUser: null };
    modelMock.setInitialState.mockClear();
    modelMock.setInitialState.mockImplementation(
      (updater: (state: unknown) => { currentUser: User | null }) => {
        modelMock.initialState = updater(modelMock.initialState);
      },
    );
  });

  it('stores the callback token pair, clears the query and lands on the role page', async () => {
    window.history.pushState({}, '', '/?accessToken=a&refreshToken=b');
    servicesMock.getCurrentUser.mockResolvedValue(tenantUser);

    const { rerender } = render(<Entry />);

    await waitFor(() => {
      expect(tokenStoreMock.setTokens).toHaveBeenCalledWith('a', 'b');
    });
    await waitFor(() => {
      // Query stripped first (same path, no search)…
      expect(historyMock.replace).toHaveBeenCalledWith('/');
    });
    // setInitialState stores the user; the model update re-renders the page
    // (umi useModel) and the pre-existing redirect effect lands the role page.
    rerender(<Entry />);
    await waitFor(() => {
      expect(historyMock.replace).toHaveBeenCalledWith('/devices');
    });
    const updater = modelMock.setInitialState.mock.calls[0][0] as (
      state: unknown,
    ) => { currentUser: User };
    expect(updater({})).toEqual({ currentUser: tenantUser });
  });

  it('ignores a partial callback (missing refreshToken) and keeps waiting', () => {
    window.history.pushState({}, '', '/?accessToken=a');

    render(<Entry />);

    expect(tokenStoreMock.setTokens).not.toHaveBeenCalled();
    expect(servicesMock.getCurrentUser).not.toHaveBeenCalled();
    expect(historyMock.replace).not.toHaveBeenCalled();
  });

  it('does nothing on a plain / visit without callback params', () => {
    window.history.pushState({}, '', '/');
    const { container } = render(<Entry />);

    expect(tokenStoreMock.setTokens).not.toHaveBeenCalled();
    expect(servicesMock.getCurrentUser).not.toHaveBeenCalled();
    expect(container.querySelector('.ant-spin')).not.toBeNull();
  });
});
