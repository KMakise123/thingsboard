/**
 * Version-control panel tests: repo-not-configured hint + the wave-6
 * "go to settings" jump, version list + commit payload shape (default
 * version name, per-type flag visibility / force-false), AntD-ized diff
 * table, restore payload gated by the versioned-data flags.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhDetail from '@/locales/zh-CN/devices/detail';
import { EntityType } from '@/types/tb';

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('@umijs/max', () => ({ history: historyMock }));

import VersionControlPanel from './VersionControlPanel';

const servicesMock = vi.hoisted(() => ({
  getRepositorySettingsInfo: vi.fn(),
  listBranches: vi.fn(),
  listEntityVersions: vi.fn(),
  saveEntitiesVersion: vi.fn(),
  awaitVersionCreateResult: vi.fn(),
  compareEntityDataToVersion: vi.fn(),
  getEntityDataInfo: vi.fn(),
  loadEntitiesVersion: vi.fn(),
  awaitVersionLoadResult: vi.fn(),
  getAutoCommitSettings: vi.fn(),
  saveAutoCommitSettings: vi.fn(),
  deleteAutoCommitSettings: vi.fn(),
}));

vi.mock('@/services/tb/version-control', () => servicesMock);

const intl = createIntl({ locale: 'zh-CN', messages: zhDetail });

const deviceEntityId = { entityType: EntityType.DEVICE, id: 'dev-1' };

function renderPanel(
  overrides: {
    entityId?: typeof deviceEntityId;
    entityType?: EntityType;
    entityName?: string;
  } = {},
) {
  const {
    entityId = deviceEntityId,
    entityType = EntityType.DEVICE,
    entityName,
  } = overrides;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <VersionControlPanel
            entityId={entityId}
            entityType={entityType}
            entityName={entityName}
          />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('version control panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicesMock.getRepositorySettingsInfo.mockResolvedValue({
      configured: true,
    });
    servicesMock.listBranches.mockResolvedValue([
      { name: 'master', default: true },
    ]);
    servicesMock.listEntityVersions.mockResolvedValue({
      data: [
        {
          timestamp: 1_700_000_000_000,
          id: '12345678-90ab-cdef-1234-567890abcdef',
          name: 'v1',
          author: 'tenant@thingsboard.org',
        },
      ],
      totalElements: 1,
      totalPages: 1,
      hasNext: false,
    });
    servicesMock.getAutoCommitSettings.mockResolvedValue(null);
    servicesMock.saveEntitiesVersion.mockResolvedValue('req-1');
    servicesMock.awaitVersionCreateResult.mockResolvedValue({
      done: true,
      added: 0,
      modified: 1,
      removed: 0,
    });
    servicesMock.loadEntitiesVersion.mockResolvedValue('req-2');
    servicesMock.awaitVersionLoadResult.mockResolvedValue({
      done: true,
      result: [{ entityType: 'DEVICE', created: 0, updated: 1, deleted: 0 }],
    });
  });

  it('shows the v2 hint when no repository is configured', async () => {
    servicesMock.getRepositorySettingsInfo.mockResolvedValue({
      configured: false,
    });
    renderPanel();
    expect(await screen.findByText(/Git 仓库/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /提交到仓库/ })).toBeNull();
  });

  it('offers the go-to-settings jump when unconfigured (spec 6.2-10)', async () => {
    servicesMock.getRepositorySettingsInfo.mockResolvedValue({
      configured: false,
    });
    renderPanel();
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Configure it in the repository settings',
      }),
    );
    expect(historyMock.push).toHaveBeenCalledWith('/settings/repository');
  });

  it('defaults the commit version name to "<entityName> update"', async () => {
    renderPanel({ entityName: 'sensor-a' });
    await screen.findByText('v1');

    fireEvent.click(screen.getByRole('button', { name: /提交到仓库/ }));
    const nameInput = await screen.findByLabelText('版本名称');
    expect((nameInput as HTMLInputElement).value).toBe('sensor-a update');
  });

  it('lists versions and commits with the single-entity payload', async () => {
    renderPanel();
    expect(await screen.findByText('v1')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /提交到仓库/ }));
    fireEvent.change(await screen.findByLabelText('版本名称'), {
      target: { value: 'm1 snapshot' },
    });
    fireEvent.click(screen.getByRole('button', { name: '创建版本' }));

    await waitFor(() =>
      expect(servicesMock.saveEntitiesVersion).toHaveBeenCalled(),
    );
    expect(servicesMock.saveEntitiesVersion.mock.calls[0][0]).toEqual({
      type: 'SINGLE_ENTITY',
      branch: 'master',
      versionName: 'm1 snapshot',
      entityId: deviceEntityId,
      config: {
        saveCredentials: true,
        saveAttributes: true,
        saveRelations: true,
        saveCalculatedFields: true,
      },
    });
  });

  it('hides DEVICE-only flags for CUSTOMER and force-false hidden flags', async () => {
    renderPanel({
      entityId: { entityType: EntityType.CUSTOMER, id: 'cust-1' },
      entityType: EntityType.CUSTOMER,
      entityName: 'Acme',
    });
    await screen.findByText('v1');

    fireEvent.click(screen.getByRole('button', { name: /提交到仓库/ }));
    await screen.findByLabelText('版本名称');
    // Credentials are DEVICE-only; calculated fields cover CUSTOMER.
    expect(screen.queryByText('导出凭证')).toBeNull();
    expect(
      screen.getByText('Export calculated fields and alarm rules'),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '创建版本' }));
    await waitFor(() =>
      expect(servicesMock.saveEntitiesVersion).toHaveBeenCalled(),
    );
    const payload = servicesMock.saveEntitiesVersion.mock.calls[0][0];
    expect(payload.entityId).toEqual({
      entityType: EntityType.CUSTOMER,
      id: 'cust-1',
    });
    // Hidden flag travels as explicit false (ngx parity).
    expect(payload.config.saveCredentials).toBe(false);
    expect(payload.config.saveAttributes).toBe(true);
    expect(payload.config.saveRelations).toBe(true);
    expect(payload.config.saveCalculatedFields).toBe(true);
  });

  it('surfaces nothing-to-commit when the done terminal moved nothing', async () => {
    servicesMock.awaitVersionCreateResult.mockResolvedValue({
      done: true,
      added: 0,
      modified: 0,
      removed: 0,
    });
    renderPanel();
    await screen.findByText('v1');

    fireEvent.click(screen.getByRole('button', { name: /提交到仓库/ }));
    await screen.findByLabelText('版本名称');
    fireEvent.click(screen.getByRole('button', { name: '创建版本' }));
    expect(await screen.findByText('No changes to commit')).toBeTruthy();
  });

  it('renders the diff as a changed-fields table', async () => {
    servicesMock.compareEntityDataToVersion.mockResolvedValue({
      currentVersion: { name: 'sensor-a', label: 'old' },
      otherVersion: { name: 'sensor-a', label: 'new', added: true },
    });
    renderPanel();
    await screen.findByText('v1');

    fireEvent.click(screen.getByTitle('与当前对比'));
    expect(await screen.findByText('2 处差异')).toBeTruthy();
    expect(screen.getByText('label')).toBeTruthy();
    expect(screen.getByText('added')).toBeTruthy();
    expect(screen.getByText('修改')).toBeTruthy();
    expect(screen.getByText('新增')).toBeTruthy();
  });

  it('restores through the load request, flags gated by data info', async () => {
    servicesMock.getEntityDataInfo.mockResolvedValue({
      hasCredentials: true,
      hasAttributes: true,
      hasRelations: false,
      hasCalculatedFields: false,
    });
    renderPanel();
    await screen.findByText('v1');

    fireEvent.click(screen.getByTitle('恢复此版本'));
    expect(
      await screen.findByText(/恢复会用所选版本覆盖当前设备数据/),
    ).toBeTruthy();
    expect(await screen.findByText('加载凭证')).toBeTruthy();
    expect(screen.queryByText('加载关系')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '恢 复' }));
    await waitFor(() =>
      expect(servicesMock.loadEntitiesVersion).toHaveBeenCalled(),
    );
    expect(servicesMock.loadEntitiesVersion.mock.calls[0][0]).toEqual({
      type: 'SINGLE_ENTITY',
      versionId: '12345678-90ab-cdef-1234-567890abcdef',
      externalEntityId: deviceEntityId,
      config: {
        loadCredentials: true,
        loadAttributes: true,
        loadRelations: false,
        loadCalculatedFields: false,
      },
    });
  });
});
