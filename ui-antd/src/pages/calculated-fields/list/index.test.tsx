/**
 * Calculated-fields list page tests (M14 wave-4, R33): the three filter
 * dimensions ride into the service query from the URL, the sort whitelist
 * leaves non-whitelisted columns without a sorter (contract #18), default
 * query is explicit createdTime DESC, the create button opens the edit
 * dialog, and row delete goes through the confirm-four-piece flow.
 * Services are mocked at the module boundary; pro-components is replaced
 * by antd Table with a prop spy (sent-page workaround).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import zhCf from '@/locales/zh-CN/calculated-fields';
import type { CalculatedFieldInfo } from '@/types/tb/calculated-fields';
import { EntityType } from '@/types/tb/entity';

const intl = createIntl({ locale: 'zh-CN', messages: { ...zhCf } });

vi.mock('@umijs/max', () => ({
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
  useModel: () => ({
    initialState: {
      currentUser: {
        authority: 'TENANT_ADMIN',
        tenantId: { entityType: 'TENANT', id: 'tenant-1' },
      },
    },
  }),
}));

const servicesMock = vi.hoisted(() => ({
  getCalculatedFields: vi.fn(),
  getCalculatedFieldById: vi.fn(),
  getCalculatedFieldsByEntityId: vi.fn(),
  getCalculatedFieldNames: vi.fn(),
  getLatestCalculatedFieldDebugEvent: vi.fn(),
  saveCalculatedField: vi.fn(),
  deleteCalculatedField: vi.fn(),
  testCalculatedFieldScript: vi.fn(),
}));
vi.mock('@/services/tb/calculated-fields', () => servicesMock);

vi.mock('@/services/tb/device', () => ({
  getTenantDevices: vi.fn().mockResolvedValue({ data: [], totalElements: 0 }),
  getDeviceById: vi.fn(),
}));
vi.mock('@/services/tb/asset', () => ({
  getTenantAssets: vi.fn().mockResolvedValue({ data: [], totalElements: 0 }),
  getAssetInfoById: vi.fn(),
}));
vi.mock('@/services/tb/device-profile', () => ({
  getDeviceProfileList: vi
    .fn()
    .mockResolvedValue({ data: [], totalElements: 0 }),
  getDeviceProfileById: vi.fn(),
}));
vi.mock('@/services/tb/asset-profile', () => ({
  getAssetProfileList: vi
    .fn()
    .mockResolvedValue({ data: [], totalElements: 0 }),
  getAssetProfileById: vi.fn(),
}));

// The edit dialog is covered by cf-dialog.test.tsx — stub it here.
const dialogSpy = vi.hoisted(() => vi.fn());
vi.mock('../components/cf-dialog', () => ({
  default: (props: unknown) => {
    dialogSpy(props);
    return <div data-testid="cf-dialog-stub" />;
  },
}));

type Row = Record<string, unknown>;
const getByPath = (row: Row, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (value, key) =>
        value && typeof value === 'object' ? (value as Row)[key] : undefined,
      row,
    );

const proTableSpy = vi.hoisted(() => vi.fn());
vi.mock('@ant-design/pro-components', async () => {
  const { Table } = await import('antd');
  const ProTable = ({
    rowKey,
    ...rest
  }: React.ComponentProps<typeof Table>) => {
    proTableSpy(rest);
    return (
      <Table
        rowKey={
          typeof rowKey === 'string' && rowKey.includes('.')
            ? (row: unknown) => String(getByPath(row as Row, rowKey))
            : rowKey
        }
        {...rest}
      />
    );
  };
  return {
    ProTable,
    PageContainer: (props: {
      extra?: React.ReactNode;
      children?: React.ReactNode;
    }) => (
      <div>
        {props.extra}
        {props.children}
      </div>
    ),
  };
});

import CalculatedFieldsListPage from './index';

function cfRow(id: string, overrides: Partial<CalculatedFieldInfo> = {}) {
  return {
    id: { entityType: EntityType.CALCULATED_FIELD, id },
    createdTime: 1_700_000_000_000 + Number(id.slice(-1)),
    entityId: { entityType: EntityType.DEVICE, id: 'device-1' },
    entityName: 'Temp device',
    name: `cf-${id}`,
    type: 'SIMPLE',
    configuration: { type: 'SIMPLE' },
    ...overrides,
  } as unknown as CalculatedFieldInfo;
}

const ROWS = [cfRow('cf-1'), cfRow('cf-2')];

async function renderPage(search = '') {
  window.history.replaceState(
    window.history.state,
    '',
    `/calculatedFields${search}`,
  );
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={queryClient}>
      <RawIntlProvider value={intl}>
        <AntdApp>
          <CalculatedFieldsListPage />
        </AntdApp>
      </RawIntlProvider>
    </QueryClientProvider>,
  );
  return view;
}

describe('CalculatedFieldsListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicesMock.getCalculatedFields.mockResolvedValue({
      data: ROWS,
      totalElements: 2,
    });
    servicesMock.deleteCalculatedField.mockResolvedValue(true);
  });

  afterEach(() => {
    window.history.replaceState(window.history.state, '', '/calculatedFields');
  });

  it('queries with explicit createdTime DESC and no filters by default', async () => {
    await renderPage();
    await waitFor(() => {
      expect(servicesMock.getCalculatedFields).toHaveBeenCalled();
    });
    const [pageLink, filter] = servicesMock.getCalculatedFields.mock.calls[0];
    expect(pageLink).toMatchObject({
      page: 0,
      pageSize: 10,
      sortOrder: { property: 'createdTime', direction: 'DESC' },
    });
    expect(filter).toEqual({});
  });

  it('carries the three filter dimensions from the URL into the query', async () => {
    await renderPage(
      '?types=SIMPLE,SCRIPT&entityType=DEVICE&entities=device-1',
    );
    await waitFor(() => {
      expect(servicesMock.getCalculatedFields).toHaveBeenCalled();
    });
    const [, filter] = servicesMock.getCalculatedFields.mock.calls[0];
    expect(filter).toEqual({
      types: ['SIMPLE', 'SCRIPT'],
      entityType: 'DEVICE',
      entities: ['device-1'],
    });
  });

  it('hard-limits the sort whitelist: entityType/entityName/type columns get no sorter', async () => {
    await renderPage();
    await screen.findByText('cf-cf-1');
    const tableProps = proTableSpy.mock.calls.at(-1)?.[0] as
      | {
          columns: Array<{
            key?: string;
            dataIndex?: string;
            sorter?: unknown;
          }>;
        }
      | undefined;
    const columns = tableProps?.columns ?? [];
    expect(columns.find((c) => c.dataIndex === 'createdTime')?.sorter).toBe(
      true,
    );
    expect(columns.find((c) => c.dataIndex === 'name')?.sorter).toBe(true);
    // Out-of-whitelist columns carry no sorter at all (the entityName alias
    // / type would 500 server-side, contract #18).
    expect(columns.find((c) => c.key === 'entityType')?.sorter).toBeFalsy();
    expect(columns.find((c) => c.key === 'entityName')?.sorter).toBeFalsy();
    expect(columns.find((c) => c.key === 'type')?.sorter).toBeFalsy();
  });

  it('opens the create dialog from the header button', async () => {
    await renderPage();
    fireEvent.click(
      await screen.findByRole('button', {
        name: /新\s*增\s*计\s*算\s*字\s*段/,
      }),
    );
    await waitFor(() => {
      expect(screen.getByTestId('cf-dialog-stub')).toBeTruthy();
    });
    expect(dialogSpy.mock.calls.at(-1)?.[0]).toMatchObject({ mode: 'create' });
  });

  it('deletes a row through the confirm four-piece flow', async () => {
    await renderPage();
    const deleteButton = (await screen.findAllByTitle('删除'))[0];
    fireEvent.click(deleteButton);
    const confirms =
      await screen.findAllByText(/确定要删除计算字段“cf-cf-1”吗/);
    expect(confirms.length).toBeGreaterThan(0);
    // The confirm dialog's danger OK button.
    const okButton = document.querySelector<HTMLElement>(
      '.ant-modal-confirm-btns .ant-btn-dangerous',
    );
    expect(okButton).toBeTruthy();
    fireEvent.click(okButton as HTMLElement);
    await waitFor(() => {
      expect(servicesMock.deleteCalculatedField).toHaveBeenCalledWith('cf-1');
    });
  });
});
