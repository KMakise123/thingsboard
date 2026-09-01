/**
 * Audit logs panel tests: entity-scoped read, column set (createdTime /
 * actionType / actionStatus / userName), debounced server search.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhDetail from '@/locales/zh-CN/devices/detail';
import { EntityType } from '@/types/tb';

import AuditLogsPanel from './AuditLogsPanel';

const servicesMock = vi.hoisted(() => ({
  getAuditLogsByEntityId: vi.fn(),
  getAuditLogsByCustomerId: vi.fn(),
}));

vi.mock('@/services/tb/audit-log', () => servicesMock);

const intl = createIntl({ locale: 'zh-CN', messages: zhDetail });

const entityId = { entityType: EntityType.DEVICE, id: 'dev-1' };

function renderPanel(
  props: Partial<React.ComponentProps<typeof AuditLogsPanel>> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <AuditLogsPanel entityId={entityId} {...props} />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('audit logs panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicesMock.getAuditLogsByEntityId.mockResolvedValue({
      data: [
        {
          id: { entityType: 'AUDIT_LOG', id: 'l-1' },
          createdTime: 1_700_000_000_000,
          actionType: 'ADDED',
          actionStatus: 'SUCCESS',
          userName: 'tenant@thingsboard.org',
          actionData: { name: 'x' },
        },
      ],
      totalElements: 1,
    });
  });

  it('renders the spec column set with localized action types', async () => {
    renderPanel();
    expect(await screen.findByText('新增')).toBeTruthy();
    expect(screen.getByText('SUCCESS')).toBeTruthy();
    expect(screen.getByText('tenant@thingsboard.org')).toBeTruthy();
    expect(servicesMock.getAuditLogsByEntityId).toHaveBeenCalledWith(
      entityId,
      expect.objectContaining({
        page: 0,
        sortOrder: { property: 'createdTime', direction: 'DESC' },
      }),
    );
  });

  it('debounces the server-side search', async () => {
    renderPanel();
    await screen.findByText('新增');
    fireEvent.change(screen.getByPlaceholderText('搜索审计日志'), {
      target: { value: 'provision' },
    });
    await waitFor(
      () =>
        expect(servicesMock.getAuditLogsByEntityId).toHaveBeenLastCalledWith(
          entityId,
          expect.objectContaining({ textSearch: 'provision', page: 0 }),
        ),
      { timeout: 3000 },
    );
  });

  it('shows the empty state', async () => {
    servicesMock.getAuditLogsByEntityId.mockResolvedValue({
      data: [],
      totalElements: 0,
    });
    renderPanel();
    expect(await screen.findByText('暂无审计日志')).toBeTruthy();
  });

  it('switches to the customer-scope read when customerId is present', async () => {
    servicesMock.getAuditLogsByCustomerId.mockResolvedValue({
      data: [
        {
          id: { entityType: 'AUDIT_LOG', id: 'l-2' },
          createdTime: 1_700_000_000_000,
          actionType: 'LOGIN',
          actionStatus: 'SUCCESS',
          userName: 'cu@thingsboard.org',
        },
      ],
      totalElements: 1,
      totalPages: 1,
    });
    renderPanel({ customerId: 'cust-1' });
    await screen.findByText('cu@thingsboard.org');
    expect(servicesMock.getAuditLogsByCustomerId).toHaveBeenCalledWith(
      'cust-1',
      expect.objectContaining({ page: 0, pageSize: 10 }),
    );
    expect(servicesMock.getAuditLogsByEntityId).not.toHaveBeenCalled();
  });
});
