/**
 * Relations panel tests: direction switch flips the read endpoint,
 * entity-type filter narrows rows, delete confirms then hits the service,
 * read-only hides the editing surface.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhDetail from '@/locales/zh-CN/devices/detail';
import { EntityType } from '@/types/tb';

import RelationsPanel from './RelationsPanel';

const servicesMock = vi.hoisted(() => ({
  findRelationInfosByFrom: vi.fn(),
  findRelationInfosByTo: vi.fn(),
  saveRelation: vi.fn(),
  deleteRelation: vi.fn(),
  findEntitiesByNameFilter: vi.fn(),
}));

vi.mock('@/services/tb/relations', () => servicesMock);

const intl = createIntl({ locale: 'zh-CN', messages: zhDetail });

const deviceEntityId = { entityType: EntityType.DEVICE, id: 'dev-1' };

const FROM_ROWS = [
  {
    from: deviceEntityId,
    to: { entityType: EntityType.ASSET, id: 'a-1' },
    type: 'Contains',
    typeGroup: 'COMMON' as const,
    toName: '锅炉房',
  },
  {
    from: deviceEntityId,
    to: { entityType: EntityType.CUSTOMER, id: 'c-1' },
    type: 'Manages',
    typeGroup: 'COMMON' as const,
    toName: '工厂 A',
  },
];

function renderPanel(readOnly = false) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <RelationsPanel deviceEntityId={deviceEntityId} readOnly={readOnly} />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('relations panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicesMock.findRelationInfosByFrom.mockResolvedValue(FROM_ROWS);
    servicesMock.findRelationInfosByTo.mockResolvedValue([]);
    servicesMock.deleteRelation.mockResolvedValue({});
  });

  it('loads FROM relations with names', async () => {
    renderPanel();
    expect(await screen.findByText('Contains')).toBeTruthy();
    expect(screen.getByText('锅炉房')).toBeTruthy();
    expect(servicesMock.findRelationInfosByFrom).toHaveBeenCalledWith(
      deviceEntityId,
    );
  });

  it('switching direction re-reads the TO endpoint', async () => {
    renderPanel();
    await screen.findByText('Contains');
    fireEvent.click(screen.getByText('指向本设备'));
    await waitFor(() =>
      expect(servicesMock.findRelationInfosByTo).toHaveBeenCalledWith(
        deviceEntityId,
      ),
    );
  });

  it('filters rows by the other end entity type', async () => {
    renderPanel();
    await screen.findByText('锅炉房');
    fireEvent.mouseDown(screen.getAllByRole('combobox')[0]);
    fireEvent.click(
      await screen.findByText('资产', {
        selector: '.ant-select-item-option-content',
      }),
    );
    await waitFor(() => {
      expect(screen.getByText('锅炉房')).toBeTruthy();
      expect(screen.queryByText('工厂 A')).toBeNull();
    });
  });

  it('confirms then deletes a relation', async () => {
    renderPanel();
    await screen.findByText('Contains');
    const deleteButtons = screen.getAllByTitle('删除');
    fireEvent.click(deleteButtons[0]);
    const confirmButtons = await screen.findAllByRole('button', {
      name: '删 除',
    });
    fireEvent.click(confirmButtons[confirmButtons.length - 1]);
    await waitFor(() =>
      expect(servicesMock.deleteRelation).toHaveBeenCalledWith(FROM_ROWS[0]),
    );
  });

  it('hides add/delete for read-only users', async () => {
    renderPanel(true);
    await screen.findByText('Contains');
    expect(screen.queryByTitle('删除')).toBeNull();
    expect(screen.queryByRole('button', { name: /新增关系/ })).toBeNull();
  });
});
