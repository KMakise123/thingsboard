/**
 * Activation-link dialog tests: TTL formatting and the copy affordance
 * (ui-ngx activation-link-dialog parity — link text + copy + expiry).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import zhUsers from '@/locales/zh-CN/users';

const intl = createIntl({ locale: 'zh-CN', messages: zhUsers });

import { ActivationLinkDialog, formatTtl } from './ActivationLinkDialog';

function renderDialog(
  props: Partial<React.ComponentProps<typeof ActivationLinkDialog>> = {},
) {
  return render(
    <AntdApp>
      <RawIntlProvider value={intl}>
        <ActivationLinkDialog open onClose={vi.fn()} {...props} />
      </RawIntlProvider>
    </AntdApp>,
  );
}

describe('formatTtl', () => {
  const formatMessage = intl.formatMessage;

  it('formats the largest nonzero units and joins with a space', () => {
    expect(formatTtl(90 * 60 * 1000, formatMessage)).toBe('1 小时 30 分钟');
    expect(formatTtl(26 * 60 * 60 * 1000, formatMessage)).toBe('1 天 2 小时');
  });

  it('renders a dash for unknown TTLs', () => {
    expect(formatTtl(undefined, formatMessage)).toBe('-');
    expect(formatTtl(Number.NaN, formatMessage)).toBe('-');
  });
});

describe('ActivationLinkDialog', () => {
  const LINK =
    'http://localhost:8080/api/noauth/activate?activateToken=token-abc';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the link and the expiry sentence', () => {
    renderDialog({ link: LINK, ttlMs: 24 * 60 * 60 * 1000 });

    expect(screen.getByText('用户激活链接')).toBeInTheDocument();
    expect(screen.getByText(LINK)).toBeInTheDocument();
    expect(
      screen.getByText(/要激活用户，请使用以下激活链接（1 天后过期）：/),
    ).toBeInTheDocument();
  });

  it('copies the link through the App-context clipboard path', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    renderDialog({ link: LINK, ttlMs: 3_600_000 });

    fireEvent.click(screen.getByTitle('复制激活链接'));
    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(LINK);
    });
    expect(
      await screen.findByText('用户激活链接已复制到剪贴板'),
    ).toBeInTheDocument();
  });
});
