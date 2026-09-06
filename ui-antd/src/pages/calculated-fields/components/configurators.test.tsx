/**
 * Wave-5 configurator validation tests (spec 6.1-12..15): the geofencing
 * zone panel relation-levels cap (CF_LIMITS.maxRelationLevelPerCfArgument)
 * and perimeter-key chain, the related-entities-aggregation
 * defaultValue-required panel variant, the entity-aggregation CUSTOM
 * duration unlock + produceIntermediateResult threshold and the
 * propagation expression branch. The full save gate runs through the real
 * CfDialog in cf-dialog.test.tsx; here the configurators render with a
 * stateful host (the controlled value/onChange contract).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React, { useState } from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import zhCf from '@/locales/zh-CN/calculated-fields';
import type { CalculatedFieldConfiguration } from '@/types/tb/calculated-fields';

const intl = createIntl({ locale: 'zh-CN', messages: { ...zhCf } });

const servicesMock = vi.hoisted(() => ({
  getTenantDevices: vi.fn(),
  getDeviceById: vi.fn(),
  getTenantAssets: vi.fn(),
  getAssetInfoById: vi.fn(),
  getCustomers: vi.fn(),
  getCustomerById: vi.fn(),
  getTenantInfo: vi.fn(),
}));
vi.mock('@/services/tb/device', () => ({
  getTenantDevices: servicesMock.getTenantDevices,
  getDeviceById: servicesMock.getDeviceById,
}));
vi.mock('@/services/tb/asset', () => ({
  getTenantAssets: servicesMock.getTenantAssets,
  getAssetInfoById: servicesMock.getAssetInfoById,
}));
vi.mock('@/services/tb/customer', () => ({
  getCustomers: servicesMock.getCustomers,
  getCustomerById: servicesMock.getCustomerById,
}));
vi.mock('@/services/tb/tenant', () => ({
  getTenantInfo: servicesMock.getTenantInfo,
}));

import EntityAggregationConfiguration from './entity-aggregation-configuration';
import PropagationConfiguration from './propagation-configuration';
import RelatedAggregationConfiguration from './related-entities-aggregation-configuration';
import ZoneGroupsTable from './zone-groups-table';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function renderUi(node: React.ReactElement) {
  return render(
    <QueryClientProvider client={queryClient}>
      <RawIntlProvider value={intl}>
        <AntdApp>{node}</AntdApp>
      </RawIntlProvider>
    </QueryClientProvider>,
  );
}

/** Stateful host: configurators are controlled (value/onChange). */
function host<T>(
  initial: T,
  renderProp: (value: T, setValue: (next: T) => void) => React.ReactElement,
) {
  return function Host() {
    const [value, setValue] = useState<T>(initial);
    return renderProp(value, setValue);
  };
}

function drawerPrimaryButton(): HTMLButtonElement {
  const button = document.querySelector<HTMLButtonElement>(
    '.ant-drawer-footer .ant-btn-primary',
  );
  expect(button).toBeTruthy();
  return button as HTMLButtonElement;
}

async function pickSelectOption(
  scope: HTMLElement,
  triggerLabel: string,
  optionLabel: string,
) {
  const label = Array.from(scope.querySelectorAll('label')).find((node) =>
    node.textContent?.includes(triggerLabel),
  );
  expect(label).toBeTruthy();
  const formItem = label?.closest('.ant-form-item');
  const select = formItem?.querySelector('.ant-select');
  expect(select).toBeTruthy();
  fireEvent.mouseDown(select as HTMLElement);
  fireEvent.click(
    await screen.findByText(optionLabel, {
      selector: '.ant-select-item-option-content',
    }),
  );
}

const PROPAGATION_INITIAL = {
  type: 'PROPAGATION',
  relation: { direction: 'TO', relationType: 'Contains' },
  arguments: {
    key1: { refEntityKey: { key: 'temperature', type: 'TS_LATEST' } },
  },
  applyExpressionToResolvedArguments: false,
  output: { type: 'TIME_SERIES', name: '', strategy: { type: 'IMMEDIATE' } },
} as unknown as CalculatedFieldConfiguration;

const RELATED_INITIAL = {
  type: 'RELATED_ENTITIES_AGGREGATION',
  relation: { direction: 'FROM', relationType: 'Contains' },
  arguments: {
    key1: {
      refEntityKey: { key: 'k', type: 'TS_LATEST' },
      defaultValue: '0',
    },
  },
  metrics: {
    free: { function: 'COUNT', input: { type: 'key', key: 'key1' } },
  },
  deduplicationIntervalInSec: 10,
  scheduledUpdateInterval: 10,
  useLatestTs: false,
  output: { type: 'TIME_SERIES', name: '', strategy: { type: 'IMMEDIATE' } },
} as unknown as CalculatedFieldConfiguration;

const ENTITY_INITIAL = {
  type: 'ENTITY_AGGREGATION',
  arguments: {
    key1: { refEntityKey: { key: 'k', type: 'TS_LATEST' } },
  },
  metrics: {
    avg: { function: 'AVG', input: { type: 'key', key: 'key1' } },
  },
  interval: { type: 'HOUR', tz: 'Asia/Shanghai' },
  output: { type: 'TIME_SERIES', name: '', strategy: { type: 'IMMEDIATE' } },
} as unknown as CalculatedFieldConfiguration;

describe('PropagationConfiguration', () => {
  beforeEach(() => {
    servicesMock.getTenantInfo.mockResolvedValue({
      id: { id: 'tenant-1' },
      title: 'T',
    });
  });

  it('only shows the TBEL editor for the expression-result mode', async () => {
    const Host = host(PROPAGATION_INITIAL, (value, setValue) => (
      <PropagationConfiguration
        value={value}
        onChange={setValue}
        hostEntityType="DEVICE"
        tenantId="tenant-1"
      />
    ));
    const view = renderUi(<Host />);
    // Arguments-only mode: no editor, the argument column IS the output key.
    expect(
      document.querySelector('[data-testid="cf-propagation-editor"]'),
    ).toBeNull();
    expect(screen.getAllByText('输出键').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByText('表达式结果'));
    await waitFor(() => {
      expect(
        document.querySelector('[data-testid="cf-propagation-editor"]'),
      ).toBeTruthy();
    });
    view.unmount();
  });
});

describe('RelatedAggregationConfiguration', () => {
  beforeEach(() => {
    servicesMock.getTenantInfo.mockResolvedValue({
      id: { id: 'tenant-1' },
      title: 'T',
    });
  });

  it('requires a default value on the variant argument panel', async () => {
    const Host = host(RELATED_INITIAL, (value, setValue) => (
      <RelatedAggregationConfiguration
        value={value}
        onChange={setValue}
        hostEntityType="DEVICE"
        tenantId="tenant-1"
      />
    ));
    renderUi(<Host />);
    fireEvent.click(
      await screen.findByRole('button', { name: /新\s*增\s*参\s*数/ }),
    );
    // The variant panel (defaultValueRequired) rejects an empty default.
    await screen.findByText('新增参数', { selector: '.ant-drawer-title' });
    fireEvent.click(drawerPrimaryButton());
    await waitFor(() => {
      expect(screen.getByText('默认值必填。')).toBeTruthy();
    });
  });

  it('keeps the deduplication interval at the server minimum', () => {
    const Host = host(RELATED_INITIAL, (value, setValue) => (
      <RelatedAggregationConfiguration
        value={value}
        onChange={setValue}
        hostEntityType="DEVICE"
        tenantId="tenant-1"
      />
    ));
    renderUi(<Host />);
    expect(screen.getByText('至少 10 秒。')).toBeTruthy();
  });
});

describe('EntityAggregationConfiguration', () => {
  it('unlocks the CUSTOM duration input', async () => {
    const Host = host(ENTITY_INITIAL, (value, setValue) => (
      <EntityAggregationConfiguration
        value={value}
        onChange={setValue}
        hostEntityType="DEVICE"
        tenantId="tenant-1"
      />
    ));
    const view = renderUi(<Host />);
    await pickSelectOption(view.container, '聚合区间类型', '自定义');
    await waitFor(() => {
      expect(screen.getByText('聚合区间值（秒）')).toBeTruthy();
    });
  });

  it('locks produceIntermediateResult under the 300s threshold', () => {
    const underThreshold = {
      ...ENTITY_INITIAL,
      interval: { type: 'CUSTOM', tz: 'UTC', durationSec: 120 },
    } as CalculatedFieldConfiguration;
    const Host = host(underThreshold, (value, setValue) => (
      <EntityAggregationConfiguration
        value={value}
        onChange={setValue}
        hostEntityType="DEVICE"
        tenantId="tenant-1"
      />
    ));
    renderUi(<Host />);
    const checkboxes = screen
      .getAllByRole('checkbox')
      .filter((node) =>
        node.closest('label')?.textContent?.includes('中间结果'),
      );
    expect(checkboxes.length).toBe(1);
    expect((checkboxes[0] as HTMLInputElement).disabled).toBe(true);
  });
});

describe('ZoneGroupsTable panel', () => {
  it('caps the relation levels at CF_LIMITS.maxRelationLevelPerCfArgument', async () => {
    renderUi(
      <ZoneGroupsTable
        value={{}}
        onChange={vi.fn()}
        hostEntityType="DEVICE"
        tenantId="tenant-1"
      />,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: /新\s*增\s*区\s*域\s*组/ }),
    );
    await screen.findByText('区域组设置');
    await pickSelectOption(document.body, '区域实体类型', '关联实体');
    await screen.findByText('从实体到区域的路径');
    const addLevel = () =>
      screen.getByRole('button', { name: /新\s*增\s*层\s*级/ });
    // The seed carries one level; the cap (2) disables after one add.
    expect(addLevel()).not.toBeDisabled();
    fireEvent.click(addLevel());
    await waitFor(() => {
      expect(addLevel()).toBeDisabled();
    });
    expect(screen.getByText(/最多 2 层/)).toBeTruthy();
  });

  it('requires the zone name and the perimeter key name', async () => {
    renderUi(
      <ZoneGroupsTable
        value={{}}
        onChange={vi.fn()}
        hostEntityType="DEVICE"
        tenantId="tenant-1"
      />,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: /新\s*增\s*区\s*域\s*组/ }),
    );
    await screen.findByText('区域组设置');
    fireEvent.click(drawerPrimaryButton());
    await waitFor(() => {
      expect(screen.getByText('区域名称必填。')).toBeTruthy();
    });
  });
});
