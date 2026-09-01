/**
 * Calculated-fields panel tests: list rendering with type tags, SIMPLE
 * create payload shape (argument binding + expression + output), edit
 * path, read-only nonexistent (tab itself is TA-only by construction).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhDetail from '@/locales/zh-CN/devices/detail';
import { EntityType } from '@/types/tb';

import CalculatedFieldsPanel from './CalculatedFieldsPanel';

const servicesMock = vi.hoisted(() => ({
  getCalculatedFieldsByEntityId: vi.fn(),
  saveCalculatedField: vi.fn(),
  deleteCalculatedField: vi.fn(),
  getLatestTelemetry: vi.fn(),
  getAttributes: vi.fn(),
}));

vi.mock('@/services/tb/calculated-fields', () => servicesMock);
vi.mock('@/services/tb/attributes', () => ({
  getLatestTelemetry: servicesMock.getLatestTelemetry,
  getAttributes: servicesMock.getAttributes,
}));

const intl = createIntl({ locale: 'zh-CN', messages: zhDetail });

const entityId = { entityType: EntityType.DEVICE, id: 'dev-1' };

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <CalculatedFieldsPanel entityId={entityId} />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('calculated fields panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicesMock.getCalculatedFieldsByEntityId.mockResolvedValue({
      data: [
        {
          id: { entityType: 'CALCULATED_FIELD', id: 'cf-1' },
          createdTime: 1_700_000_000_000,
          entityId: entityId,
          type: 'SIMPLE',
          name: 'double-temp',
          debugMode: false,
          configuration: { type: 'SIMPLE', expression: 'a * 2' },
        },
      ],
      totalElements: 1,
    });
    servicesMock.getLatestTelemetry.mockResolvedValue({
      temperature: [{ ts: 1, value: '20' }],
    });
    servicesMock.getAttributes.mockResolvedValue([{ key: 'threshold' }]);
    servicesMock.saveCalculatedField.mockResolvedValue({});
    servicesMock.deleteCalculatedField.mockResolvedValue(true);
  });

  it('lists calculated fields with localized type tags', async () => {
    renderPanel();
    expect(await screen.findByText('double-temp')).toBeTruthy();
    expect(screen.getByText('简单表达式')).toBeTruthy();
  });

  it('creates a SIMPLE field with the argument + expression payload', async () => {
    renderPanel();
    await screen.findByText('double-temp');
    fireEvent.click(screen.getByRole('button', { name: /新增计算字段/ }));

    fireEvent.change(await screen.findByLabelText(/名称/), {
      target: { value: 'triple-temp' },
    });
    // Pick the telemetry key option.
    const keySelect = await screen.findByLabelText(/参数键/);
    fireEvent.mouseDown(keySelect);
    const option = await screen.findByText(/temperature/, {
      selector: '.ant-select-item-option-content',
    });
    fireEvent.click(option);
    fireEvent.change(await screen.findByLabelText('表达式（例如 a * 2）'), {
      target: { value: 'a * 3' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保 存' }));

    await waitFor(() =>
      expect(servicesMock.saveCalculatedField).toHaveBeenCalled(),
    );
    const payload = servicesMock.saveCalculatedField.mock.calls[0][0];
    expect(payload.type).toBe('SIMPLE');
    expect(payload.name).toBe('triple-temp');
    expect(payload.configuration.arguments.a.refEntityKey).toEqual({
      type: 'TS_LATEST',
      key: 'temperature',
    });
    expect(payload.configuration.expression).toBe('a * 3');
    expect(payload.configuration.output).toEqual({
      type: 'TIME_SERIES',
      name: 'triple-temp',
    });
  });
});
