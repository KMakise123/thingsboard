/**
 * Latest telemetry panel tests: REST seed → WS table, history dialog opens
 * on key click and issues a getTimeseries read with the selected preset
 * window + aggregation. echarts is stubbed (canvas is unavailable under
 * happy-dom).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhDetail from '@/locales/zh-CN/devices/detail';

import { EntityType } from '@/types/tb';

import LatestTelemetryPanel, {
  latestTelemetrySeed,
} from './LatestTelemetryPanel';

const servicesMock = vi.hoisted(() => ({
  getLatestTelemetry: vi.fn(),
  getTimeseries: vi.fn(),
}));

const wsMock = vi.hoisted(() => ({
  useLatestTelemetrySubscription: vi.fn(),
}));

const echartsMock = vi.hoisted(() => {
  const chart = {
    setOption: vi.fn(),
    clear: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  };
  return { chart, init: vi.fn(() => chart), registerTheme: vi.fn() };
});

vi.mock('@/services/tb/attributes', () => servicesMock);
vi.mock('@/core/ws/hooks', () => wsMock);
vi.mock('echarts', () => echartsMock);

const intl = createIntl({ locale: 'zh-CN', messages: zhDetail });

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <LatestTelemetryPanel
            entityId={{ entityType: EntityType.DEVICE, id: 'dev-1' }}
          />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

function primeTelemetry(
  data: Record<string, Array<{ ts: number; value: string }>>,
) {
  servicesMock.getLatestTelemetry.mockResolvedValue(data);
  wsMock.useLatestTelemetrySubscription.mockImplementation(({ seed }) => ({
    data: seed ?? [],
    status: 'open',
  }));
}

describe('latest telemetry seed helper', () => {
  it('takes the newest point per key', () => {
    expect(
      latestTelemetrySeed({
        temperature: [
          { ts: 1, value: '20' },
          { ts: 2, value: '21.5' },
        ],
      }),
    ).toEqual([{ key: 'temperature', value: '21.5', lastUpdateTs: 2 }]);
  });
});

describe('latest telemetry panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    servicesMock.getTimeseries.mockResolvedValue({
      temperature: [
        { ts: 1, value: '20' },
        { ts: 2, value: '21' },
      ],
    });
  });

  it('renders the REST seed through the WS subscription', async () => {
    primeTelemetry({
      temperature: [{ ts: 1_700_000_000_000, value: '21.5' }],
      humidity: [{ ts: 1_700_000_000_001, value: '40' }],
    });
    renderPanel();
    expect(await screen.findByText('temperature')).toBeTruthy();
    expect(screen.getByText('21.5')).toBeTruthy();
    expect(screen.getByText('humidity')).toBeTruthy();
  });

  it('opens the history dialog on key click and reads getTimeseries', async () => {
    primeTelemetry({ temperature: [{ ts: 1_700_000_000_000, value: '21.5' }] });
    renderPanel();
    fireEvent.click(await screen.findByText('temperature'));

    await waitFor(() => expect(servicesMock.getTimeseries).toHaveBeenCalled());
    const [entityId, query] = servicesMock.getTimeseries.mock.calls[0] as [
      { entityType: string; id: string },
      Record<string, unknown>,
    ];
    expect(entityId).toEqual({ entityType: 'DEVICE', id: 'dev-1' });
    expect(query.keys).toEqual(['temperature']);
    expect(query.orderBy).toBe('ASC');
    expect(query.agg).toBe('NONE');
    // Default preset is 15 minutes.
    expect((query.endTs as number) - (query.startTs as number)).toBe(
      15 * 60 * 1000,
    );
  });

  it('sends the aggregation interval only for binned reads', async () => {
    primeTelemetry({ temperature: [{ ts: 1, value: '1' }] });
    renderPanel();
    fireEvent.click(await screen.findByText('temperature'));
    await waitFor(() => expect(servicesMock.getTimeseries).toHaveBeenCalled());
    expect(
      servicesMock.getTimeseries.mock.calls[0][1].interval,
    ).toBeUndefined();
  });
});
