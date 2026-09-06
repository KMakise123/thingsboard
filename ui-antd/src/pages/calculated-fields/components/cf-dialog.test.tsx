/**
 * CfDialog tests (M14 wave-4, spec 6.1-4..7/10): the type-switch rule in
 * the real dialog (SIMPLE→SCRIPT keeps the configuration, SIMPLE→wave-5
 * type clears it and mounts the placeholder with Save disabled), the
 * save precheck blocking on an envelope error and degrading the
 * TBEL-disabled 400 to a warning while still saving.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import zhCf from '@/locales/zh-CN/calculated-fields';

const intl = createIntl({ locale: 'zh-CN', messages: { ...zhCf } });

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

// Entity pickers inside the dialog / arguments table hit tenant-scoped
// search endpoints — silence them with empty pages.
vi.mock('@/services/tb/device', () => ({
  getTenantDevices: vi.fn().mockResolvedValue({ data: [], totalElements: 0 }),
  getDeviceById: vi.fn(),
}));
vi.mock('@/services/tb/asset', () => ({
  getTenantAssets: vi.fn().mockResolvedValue({ data: [], totalElements: 0 }),
  getAssetInfoById: vi.fn(),
}));
vi.mock('@/services/tb/customer', () => ({
  getCustomers: vi.fn().mockResolvedValue({ data: [], totalElements: 0 }),
  getCustomerById: vi.fn(),
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
vi.mock('@/services/tb/tenant', () => ({
  getTenantInfo: vi.fn().mockResolvedValue({ id: { id: 't-1' }, title: 'T' }),
}));

import CfDialog from './cf-dialog';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const EDIT_FIELD = {
  id: { entityType: 'CALCULATED_FIELD', id: 'cf-1' },
  createdTime: 1_700_000_000_000,
  entityId: { entityType: 'DEVICE', id: 'device-1' },
  name: 'fahrenheit',
  type: 'SIMPLE',
  debugSettings: { failuresEnabled: true, allEnabled: false },
  configuration: {
    type: 'SIMPLE',
    expression: '(temperatureF - 32) / 1.8',
    arguments: {
      temperatureF: {
        refEntityKey: { key: 'temperatureF', type: 'TS_LATEST' },
      },
    },
    useLatestTs: false,
    output: {
      type: 'TIME_SERIES',
      name: 'temperatureC',
      strategy: {
        type: 'IMMEDIATE',
        ttl: 0,
        saveTimeSeries: true,
        saveLatest: true,
        sendWsUpdate: true,
        processCfs: true,
      },
    },
  },
};

function renderDialog(field = EDIT_FIELD, mode = 'edit') {
  return render(
    <QueryClientProvider client={queryClient}>
      <RawIntlProvider value={intl}>
        <AntdApp>
          <CfDialog
            field={field as never}
            mode={mode as never}
            tenantId=""
            onClose={vi.fn()}
            onSaved={vi.fn()}
          />
        </AntdApp>
      </RawIntlProvider>
    </QueryClientProvider>,
  );
}

async function pickType(label: string) {
  // The type select is the one currently displaying a type label.
  const selects = Array.from(
    document.querySelectorAll<HTMLElement>('.ant-select'),
  );
  const typeSelect = selects.find((element) =>
    ['简单', '脚本', '属性传播', '关联实体聚合', '实体聚合', '地理围栏'].some(
      (type) => element.textContent?.includes(type),
    ),
  );
  expect(typeSelect).toBeTruthy();
  fireEvent.mouseDown(typeSelect as HTMLElement);
  fireEvent.click(
    await screen.findByText(label, {
      selector: '.ant-select-item-option-content',
    }),
  );
}

describe('CfDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicesMock.saveCalculatedField.mockResolvedValue(EDIT_FIELD);
    servicesMock.testCalculatedFieldScript.mockResolvedValue({ output: '{}' });
    servicesMock.getLatestCalculatedFieldDebugEvent.mockResolvedValue(null);
  });

  it('keeps the configuration on the SIMPLE→SCRIPT switch and clears it for a wave-5 type', async () => {
    renderDialog();
    // The argument row exists (SIMPLE field seeded with one argument).
    expect(screen.getAllByText('temperatureF').length).toBeGreaterThan(0);

    // SIMPLE→SCRIPT keeps the configuration (ngx setupTypeChange).
    await pickType('脚本');
    await waitFor(() => {
      expect(screen.getByText(/function calculate/)).toBeTruthy();
    });
    expect(screen.getAllByText('temperatureF').length).toBeGreaterThan(0);

    // SCRIPT→GEOFENCING clears it: the real configurator mounts (wave-5).
    await pickType('地理围栏');
    await waitFor(() => {
      expect(screen.getByTestId('cf-geofencing-latitude')).toBeTruthy();
    });
    expect(screen.getByTestId('cf-geofencing-longitude')).toBeTruthy();
    expect(screen.getAllByText('地理围栏区域组').length).toBeGreaterThan(0);
    expect(screen.queryByText('temperatureF')).toBeNull();
    // No placeholder — the Save button is enabled and validation gates it.
    const apply = screen
      .getAllByRole('button', { name: /应\s*用/ })
      .find((button) => !(button as HTMLButtonElement).disabled);
    expect(apply).toBeTruthy();
  });

  it('locks the target entity picker in edit mode', () => {
    renderDialog();
    // The entity-type select renders disabled for an existing field.
    const disabledSelects = document.querySelectorAll('.ant-select-disabled');
    expect(disabledSelects.length).toBeGreaterThan(0);
    expect(screen.getByText(/创建后不可更改目标实体/)).toBeTruthy();
  });

  it('blocks the save inline when the precheck reports an envelope error', async () => {
    servicesMock.testCalculatedFieldScript.mockResolvedValue({
      output: '',
      error: 'syntax boom',
    });
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /应\s*用/ }));
    await waitFor(() => {
      expect(screen.getByTestId('cf-precheck-error').textContent).toContain(
        'syntax boom',
      );
    });
    expect(servicesMock.saveCalculatedField).not.toHaveBeenCalled();
  });

  it('degrades the TBEL-disabled 400 to a warning and still saves', async () => {
    servicesMock.testCalculatedFieldScript.mockRejectedValue(
      new Error('TBEL script engine is disabled!'),
    );
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /应\s*用/ }));
    await waitFor(() => {
      expect(screen.getByText(/TBEL 脚本引擎未装配/)).toBeTruthy();
    });
    await waitFor(() => {
      expect(servicesMock.saveCalculatedField).toHaveBeenCalledTimes(1);
    });
  });

  it('saves after a passing precheck, replaying the stored field for edits', async () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: /应\s*用/ }));
    await waitFor(() => {
      expect(servicesMock.saveCalculatedField).toHaveBeenCalledTimes(1);
    });
    const payload = servicesMock.saveCalculatedField.mock.calls[0][0];
    expect(payload.id.id).toBe('cf-1');
    expect(payload.entityId).toEqual({ entityType: 'DEVICE', id: 'device-1' });
    expect(payload.name).toBe('fahrenheit');
    expect(payload.configuration.expression).toBe('(temperatureF - 32) / 1.8');
  });

  it('strips the id for copies (create semantics)', async () => {
    renderDialog(EDIT_FIELD, 'copy');
    // The modal footer's primary OK button ("Add" for non-edit modes).
    const ok = document.querySelector<HTMLElement>(
      '.ant-modal .ant-modal-footer .ant-btn-primary',
    );
    expect(ok).toBeTruthy();
    fireEvent.click(ok as HTMLElement);
    await waitFor(() => {
      expect(servicesMock.saveCalculatedField).toHaveBeenCalledTimes(1);
    });
    const payload = servicesMock.saveCalculatedField.mock.calls[0][0];
    expect(payload.id).toBeUndefined();
  });
});
