/**
 * Versions-table tests (M14 wave-6, spec 6.2-3): server query defaults
 * (branch fallback = the repo default, timestamp DESC), the 7-char id
 * truncation with the copy-full-hash affordance, the debounced text
 * search, and the read-only lock (create disabled, restore available).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ServerErrorError } from '@/core/http/server-error';
import zhVc from '@/locales/zh-CN/vc';

const servicesMock = vi.hoisted(() => ({
  listBranches: vi.fn(),
  listVersions: vi.fn(),
}));
vi.mock('@/services/tb/version-control', () => servicesMock);

import VersionsTable from './versions-table';

const intl = createIntl({ locale: 'zh-CN', messages: zhVc });

const version = {
  timestamp: 1_700_000_000_000,
  id: '12345678-90ab-cdef-1234-567890abcdef',
  name: 'v1',
  author: 'tenant@thingsboard.org',
};

function renderTable(props: { readOnly?: boolean } = { readOnly: false }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RawIntlProvider value={intl}>
        <VersionsTable
          readOnly={props.readOnly ?? false}
          onCreateVersion={() => {}}
          onRestore={() => {}}
        />
      </RawIntlProvider>
    </QueryClientProvider>,
  );
}

describe('versions table', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicesMock.listBranches.mockResolvedValue([
      { name: 'dev', default: false },
      { name: 'master', default: true },
    ]);
    servicesMock.listVersions.mockResolvedValue({
      data: [version],
      totalElements: 1,
      totalPages: 1,
      hasNext: false,
    });
  });

  it('renders the version row with truncated id + copyable full hash', async () => {
    renderTable();
    expect(await screen.findByText('v1')).toBeTruthy();
    // Truncation to 7 chars (R20), copy affordance carries the full hash.
    expect(screen.getByText('1234567')).toBeTruthy();
    const copyIcon = document.querySelector('.ant-typography-copy');
    expect(copyIcon?.getAttribute('aria-label')).toBeTruthy();
    expect(screen.getByText('tenant@thingsboard.org')).toBeTruthy();
  });

  it('defaults the branch to the repo default and sorts timestamp DESC', async () => {
    renderTable();
    await screen.findByText('v1');
    await waitFor(() =>
      expect(servicesMock.listVersions).toHaveBeenCalledWith(
        'master',
        expect.objectContaining({
          sortOrder: { property: 'timestamp', direction: 'DESC' },
        }),
      ),
    );
  });

  it('debounces the text search by 400ms into textSearch', async () => {
    renderTable();
    await screen.findByText('v1');
    const initialCalls = servicesMock.listVersions.mock.calls.length;

    fireEvent.change(screen.getByPlaceholderText('搜索版本'), {
      target: { value: 'snapshot' },
    });
    // Before the debounce window elapses no extra query is fired.
    fireEvent.change(screen.getByPlaceholderText('搜索版本'), {
      target: { value: 'snapshot ' },
    });
    await waitFor(
      () =>
        expect(servicesMock.listVersions.mock.calls.length).toBeGreaterThan(
          initialCalls,
        ),
      { timeout: 1500 },
    );
    const lastQuery = servicesMock.listVersions.mock.calls.at(-1)?.[1];
    expect(lastQuery).toMatchObject({ textSearch: 'snapshot' });
  });

  it('read-only repository: create disabled, restore available', async () => {
    renderTable({ readOnly: true });
    await screen.findByText('v1');

    const create = screen.getByRole('button', { name: /创建实体版本/ });
    expect((create as HTMLButtonElement).disabled).toBe(true);
    const restore = screen.getByRole('button', { name: '恢复版本' });
    expect((restore as HTMLButtonElement).disabled).toBe(false);
  });

  // Walkthrough B (M14 spec 6.2-3/6.7): a bare repo before its first commit
  // makes listVersions 500 ("Failed to resolve 'origin/main'"), which the
  // hidden-tab walkthrough environment cannot observe live (timers frozen)
  // — the error Alert with the verbatim server detail is pinned here.
  it('surfaces a load error with the verbatim server detail', async () => {
    servicesMock.listVersions.mockRejectedValue(
      new ServerErrorError({
        status: 500,
        errorCode: 2,
        titleKey: 'error.server',
        detail: "Failed to resolve 'origin/main'",
        timestamp: 0,
        message: "Failed to resolve 'origin/main'",
      } as never),
    );
    renderTable();

    expect(
      await screen.findByText(/版本列表加载失败|Failed to load versions/),
    ).toBeTruthy();
    expect(
      await screen.findByText("Failed to resolve 'origin/main'"),
    ).toBeTruthy();
  });
});
