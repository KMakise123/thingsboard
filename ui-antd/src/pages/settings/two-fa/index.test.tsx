/**
 * Render-level test for the 2FA settings page: a real antd Form + the page
 * component, with the services layer mocked. Guards the save path — a
 * provider toggled on in the UI must reach the saved payload (regression:
 * every save used to ship `providers: []` and wipe the server config).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp, ConfigProvider } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import common from '@/locales/zh-CN/common';
import settings from '@/locales/zh-CN/settings';
import type { PlatformTwoFaSettings } from '@/types/tb/two-fa';

import Page from './index';

const servicesMock = vi.hoisted(() => ({
  getTwoFaSettings: vi.fn(),
  saveTwoFaSettings: vi.fn(),
}));

vi.mock('@/services/tb/two-fa', () => servicesMock);

const messages = {
  ...common,
  ...settings,
} as Record<string, string>;

const intl = createIntl({ locale: 'zh-CN', messages });

/** Empty-platform snapshot: no providers configured yet. */
const emptySnapshot: PlatformTwoFaSettings = {
  providers: [],
  minVerificationCodeSendPeriod: 30,
  verificationCodeCheckRateLimit: undefined,
  maxVerificationFailuresBeforeUserLockout: undefined,
  totalAllowedTimeForVerification: 3600,
  enforceTwoFa: false,
  enforcedUsersFilter: { type: 'ALL_USERS' },
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {/* motion off — jsdom never fires transitionend, so modal exits hang */}
      <ConfigProvider theme={{ token: { motion: false } }}>
        <AntdApp>
          <RawIntlProvider value={intl}>
            <Page />
          </RawIntlProvider>
        </AntdApp>
      </ConfigProvider>
    </QueryClientProvider>,
  );
}

function providerSwitch(index: number): HTMLButtonElement {
  const el = document.querySelector(
    `#providers_${index}_enable`,
  ) as HTMLButtonElement | null;
  if (!el) {
    throw new Error(`provider switch #providers_${index}_enable not rendered`);
  }
  return el;
}

describe('settings two-fa page (save path)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicesMock.getTwoFaSettings.mockResolvedValue(emptySnapshot);
    servicesMock.saveTwoFaSettings.mockImplementation(
      async (payload: PlatformTwoFaSettings) => payload,
    );
  });

  it('keeps a toggled-on provider in the saved payload', async () => {
    renderPage();
    // Wait for the snapshot to load and hydrate the form.
    await screen.findByText('可用提供商');

    // Flip the TOTP switch on (index 0 of TWO_FA_PROVIDER_TYPES).
    const totpSwitch = providerSwitch(0);
    expect(totpSwitch.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(totpSwitch);
    expect(totpSwitch.getAttribute('aria-checked')).toBe('true');

    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(servicesMock.saveTwoFaSettings).toHaveBeenCalledTimes(1);
    });
    const payload = servicesMock.saveTwoFaSettings.mock.calls[0][0];
    expect(payload.providers).toEqual([
      { providerType: 'TOTP', issuerName: 'ThingsBoard' },
    ]);
  });

  it('keeps every enabled provider when several are toggled on', async () => {
    renderPage();
    await screen.findByText('可用提供商');

    fireEvent.click(providerSwitch(0)); // TOTP
    // BACKUP_CODE unlocks only after the TOTP toggle re-renders the card.
    await waitFor(() => {
      expect(providerSwitch(3).disabled).toBe(false);
    });
    fireEvent.click(providerSwitch(3)); // BACKUP_CODE
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(servicesMock.saveTwoFaSettings).toHaveBeenCalledTimes(1);
    });
    const payload = servicesMock.saveTwoFaSettings.mock.calls[0][0];
    expect(payload.providers).toEqual([
      { providerType: 'TOTP', issuerName: 'ThingsBoard' },
      { providerType: 'BACKUP_CODE', codesQuantity: 10 },
    ]);
  });

  it('re-hydrates the form from the saved server response', async () => {
    renderPage();
    await screen.findByText('可用提供商');

    fireEvent.click(providerSwitch(0));
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    // The save succeeded AND its onSuccess ran (toast) before we check that
    // the echoed server response kept the provider switched on.
    await screen.findByText('双因素认证设置已保存。');
    expect(providerSwitch(0).getAttribute('aria-checked')).toBe('true');
  });

  it('does not wipe a snapshot-loaded provider when saving untouched', async () => {
    // Server already has two providers configured; a save without touching
    // any switch must carry them through (regression of the double transform).
    servicesMock.getTwoFaSettings.mockResolvedValue({
      ...emptySnapshot,
      providers: [
        { providerType: 'TOTP', issuerName: 'Corp' },
        { providerType: 'BACKUP_CODE', codesQuantity: 5 },
      ],
    } satisfies PlatformTwoFaSettings);
    renderPage();
    await screen.findByText('可用提供商');
    expect(providerSwitch(0).getAttribute('aria-checked')).toBe('true');

    // The save button only enables when dirty — dirty the form via the
    // rate-limit switch (on then off) so no provider field is touched.
    const rateLimitSwitch = document.querySelector(
      '#verificationCodeCheckRateLimitEnable',
    ) as HTMLButtonElement;
    fireEvent.click(rateLimitSwitch);
    fireEvent.click(rateLimitSwitch);
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));
    await waitFor(() => {
      expect(servicesMock.saveTwoFaSettings).toHaveBeenCalledTimes(1);
    });
    const payload = servicesMock.saveTwoFaSettings.mock.calls[0][0];
    expect(payload.providers).toEqual([
      { providerType: 'TOTP', issuerName: 'Corp' },
      { providerType: 'BACKUP_CODE', codesQuantity: 5 },
    ]);
  });
});
