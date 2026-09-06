/**
 * Shared CalculatedFieldsTable dual-mode tests (M14 wave-5, R17, spec
 * 6.1-18): entity mode (detail-tab) fetches the entity-scoped endpoint,
 * renders NO filter header and adds the inline Edit action that opens the
 * same dialog; tenant mode (standalone page) fetches the tenant-wide
 * endpoint with the URL-carried filter state.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import zhCf from '@/locales/zh-CN/calculated-fields';
import type { CalculatedFieldInfo } from '@/types/tb/calculated-fields';
import { EntityType } from '@/types/tb/entity';

const intl = createIntl({ locale: 'zh-CN', messages: { ...zhCf } });

const servicesMock = vi.hoisted(() => ({
  getCalculatedFields: vi.fn(),
  getCalculatedFieldById: vi.fn(),
  getCalculatedFieldsByEntityId: vi.fn(),
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
vi.mock('./cf-dialog', () => ({
  default: (props: unknown) => {
    dialogSpy(props);
    return <div data-testid="cf-dialog-stub" />;
  },
}));

// EventsPanel pulls heavy deps — stub (modal only mounts on demand).
vi.mock('@/components/devices/detail/EventsPanel', () => ({
  default: () => <div data-testid="events-panel-stub" />,
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

vi.mock('@ant-design/pro-components', async () => {
  const { Table } = await import('antd');
  const ProTable = ({
    rowKey,
    ...rest
  }: React.ComponentProps<typeof Table>) => (
    <Table
      rowKey={
        typeof rowKey === 'string' && rowKey.includes('.')
          ? (row: unknown) => String(getByPath(row as Row, rowKey))
          : rowKey
      }
      {...rest}
    />
  );
  return { ProTable };
});

import CalculatedFieldsTable from './calculated-fields-table';

function cfRow(id: string): CalculatedFieldInfo {
  return {
    id: { entityType: EntityType.CALCULATED_FIELD, id },
    createdTime: 1_700_000_000_000,
    entityId: { entityType: EntityType.DEVICE, id: 'device-1' },
    entityName: 'Temp device',
    name: `cf-${id}`,
    type: 'SIMPLE',
    configuration: { type: 'SIMPLE' },
  } as unknown as CalculatedFieldInfo;
}

function renderTable(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <RawIntlProvider value={intl}>
        <AntdApp>{ui}</AntdApp>
      </RawIntlProvider>
    </QueryClientProvider>,
  );
}

describe('CalculatedFieldsTable — entity mode (detail tab)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicesMock.getCalculatedFieldsByEntityId.mockResolvedValue({
      data: [cfRow('cf-1')],
      totalElements: 1,
    });
  });

  it('fetches the entity-scoped endpoint with explicit createdTime DESC', async () => {
    renderTable(
      <CalculatedFieldsTable
        mode="entity"
        entityId={{ entityType: EntityType.DEVICE, id: 'device-1' }}
        tenantId="tenant-1"
      />,
    );
    await waitFor(() => {
      expect(servicesMock.getCalculatedFieldsByEntityId).toHaveBeenCalled();
    });
    const [entityId, pageLink] =
      servicesMock.getCalculatedFieldsByEntityId.mock.calls[0];
    expect(entityId).toEqual({ entityType: EntityType.DEVICE, id: 'device-1' });
    expect(pageLink.sortOrder).toEqual({
      property: 'createdTime',
      direction: 'DESC',
    });
    // The tab mode never hits the tenant-wide endpoint.
    expect(servicesMock.getCalculatedFields).not.toHaveBeenCalled();
  });

  it('renders no filter header and adds the inline Edit opening the dialog', async () => {
    renderTable(
      <CalculatedFieldsTable
        mode="entity"
        entityId={{ entityType: EntityType.DEVICE, id: 'device-1' }}
        tenantId="tenant-1"
      />,
    );
    await screen.findByText('cf-cf-1');
    // Tab mode: none of the three filter dimensions (spec 6.1-18).
    expect(screen.queryByPlaceholderText('搜索计算字段')).toBeNull();
    expect(screen.queryByText('按类型过滤')).toBeNull();
    expect(screen.queryByText('按实体类型过滤')).toBeNull();
    expect(screen.queryByText('按实体过滤')).toBeNull();
    // Inline Edit opens the SAME dialog in edit mode.
    fireEvent.click(screen.getByTestId('cf-row-edit'));
    await waitFor(() => {
      expect(screen.getByTestId('cf-dialog-stub')).toBeTruthy();
    });
    expect(dialogSpy.mock.calls.at(-1)?.[0]).toMatchObject({
      mode: 'edit',
    });
  });
});

describe('CalculatedFieldsTable — tenant mode (standalone page)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicesMock.getCalculatedFields.mockResolvedValue({
      data: [cfRow('cf-1')],
      totalElements: 1,
    });
  });

  it('fetches the tenant-wide endpoint with the URL-carried filters', async () => {
    renderTable(
      <CalculatedFieldsTable
        mode="tenant"
        tenantId="tenant-1"
        urlState={{
          page: 1,
          pageSize: 10,
          sortProperty: 'createdTime',
          sortDirection: 'DESC',
          textSearch: '',
          types: ['SIMPLE'],
          entityType: 'DEVICE',
          entities: ['device-1'],
        }}
        onUrlStateChange={vi.fn()}
      />,
    );
    await waitFor(() => {
      expect(servicesMock.getCalculatedFields).toHaveBeenCalled();
    });
    const [, filter] = servicesMock.getCalculatedFields.mock.calls[0];
    expect(filter).toEqual({
      types: ['SIMPLE'],
      entityType: 'DEVICE',
      entities: ['device-1'],
    });
    expect(servicesMock.getCalculatedFieldsByEntityId).not.toHaveBeenCalled();
  });

  it('opens the dialog from a row click (tenant page mode rowPointer)', async () => {
    renderTable(
      <CalculatedFieldsTable
        mode="tenant"
        tenantId="tenant-1"
        urlState={{
          page: 1,
          pageSize: 10,
          sortProperty: 'createdTime',
          sortDirection: 'DESC',
          textSearch: '',
          types: [],
          entityType: '',
          entities: [],
        }}
        onUrlStateChange={vi.fn()}
      />,
    );
    await screen.findByText('cf-cf-1');
    fireEvent.click(screen.getByText('cf-cf-1'));
    await waitFor(() => {
      expect(screen.getByTestId('cf-dialog-stub')).toBeTruthy();
    });
    expect(dialogSpy.mock.calls.at(-1)?.[0]).toMatchObject({ mode: 'edit' });
  });
});
