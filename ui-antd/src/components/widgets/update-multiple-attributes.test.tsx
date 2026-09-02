/**
 * system.input_widgets.update_multiple_attributes against the REAL anchor
 * config shape (thermostats.json "Termostat settings"): state-entity
 * datasource, four SERVER_SCOPE attribute fields (booleanCheckbox + double
 * pairs wired through disabledOnDataKey), showActionButtons:false (immediate
 * per-key save) and groupTitle ${entityName}.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { StatesController } from '@/components/dashboard/use-states-controller';
import type { DashboardStateParams } from '@/core/dashboard/states';
import zhDashboards from '@/locales/zh-CN/dashboards';
import { EntityType } from '@/types/tb/entity';
import type { Widget, WidgetLayout } from '@/types/tb/widget';

const attributesMock = vi.hoisted(() => ({
  getAttributes: vi.fn(),
  saveEntityAttributes: vi.fn(),
}));
vi.mock('@/services/tb/attributes', () => attributesMock);

import UpdateMultipleAttributes from './update-multiple-attributes';

// --- anchor fixture (thermostats.json widget c4631f94, trimmed) --------------

function anchorWidget(): Widget {
  return {
    typeFullFqn: 'system.input_widgets.update_multiple_attributes',
    sizeX: 6,
    sizeY: 6,
    row: 0,
    col: 0,
    config: {
      title: 'New Update Multiple Attributes',
      showTitle: true,
      useDashboardTimewindow: true,
      datasources: [
        {
          type: 'entity',
          entityAliasId: 'thermostat',
          dataKeys: [
            {
              name: 'temperatureAlarmFlag',
              type: 'attribute',
              label: 'High temperature alarm',
              settings: {
                dataKeyType: 'server',
                dataKeyValueType: 'booleanCheckbox',
                required: false,
                isEditable: 'editable',
                dataKeyHidden: false,
                step: 1,
              },
            },
            {
              name: 'temperatureAlarmThreshold',
              type: 'attribute',
              label: 'High temperature threshold, °C',
              settings: {
                dataKeyType: 'server',
                dataKeyValueType: 'double',
                required: false,
                isEditable: 'editable',
                dataKeyHidden: false,
                step: 1,
                disabledOnDataKey: 'temperatureAlarmFlag',
              },
            },
            {
              name: 'humidityAlarmFlag',
              type: 'attribute',
              label: 'Low humidity alarm',
              settings: {
                dataKeyType: 'server',
                dataKeyValueType: 'booleanCheckbox',
                required: false,
                isEditable: 'editable',
                dataKeyHidden: false,
                step: 1,
              },
            },
            {
              name: 'humidityAlarmThreshold',
              type: 'attribute',
              label: 'Low humidity threshold, %',
              settings: {
                dataKeyType: 'server',
                dataKeyValueType: 'double',
                required: false,
                isEditable: 'editable',
                dataKeyHidden: false,
                step: 1,
                disabledOnDataKey: 'humidityAlarmFlag',
              },
            },
          ],
        },
      ],
      settings: {
        showActionButtons: false,
        showResultMessage: true,
        fieldsAlignment: 'column',
        fieldsInRow: 2,
        groupTitle: '${entityName}',
        widgetTitle: 'Termostat settings',
      },
    },
  };
}

const layout: WidgetLayout = { sizeX: 6, sizeY: 6, row: 0, col: 0 };

const statesStub: StatesController = {
  mode: 'entity',
  stateObject: [{ id: 'default', params: {} }],
  currentStateId: 'default',
  currentStateParams: { entityName: 'Thermostat A' } as DashboardStateParams,
  breadcrumbs: [],
  openState: vi.fn(),
  navigatePrev: vi.fn(),
  resetState: vi.fn(),
};

const intl = createIntl({ locale: 'zh-CN', messages: { ...zhDashboards } });

function renderWidget(widget: Widget) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <UpdateMultipleAttributes
            fqn="system.input_widgets.update_multiple_attributes"
            widgetId="w-attrs"
            widget={widget}
            layout={layout}
            ctx={{
              effectiveTimewindow: { selectedTab: 'REALTIME' },
              aliases: {},
              datasources: [
                {
                  type: 'entity',
                  entities: [
                    {
                      entityType: EntityType.DEVICE,
                      id: 'therm-1',
                      name: 'Thermostat A',
                    },
                  ],
                  dataKeys: widget.config.datasources?.[0]?.dataKeys ?? [],
                },
              ],
              states: statesStub,
              isMobile: false,
            }}
          />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  attributesMock.getAttributes.mockResolvedValue([
    { key: 'temperatureAlarmFlag', value: 'false' },
    { key: 'temperatureAlarmThreshold', value: '75' },
    { key: 'humidityAlarmFlag', value: 'true' },
    { key: 'humidityAlarmThreshold', value: '20' },
  ]);
  attributesMock.saveEntityAttributes.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('update_multiple_attributes (anchor: thermostats settings card)', () => {
  it('renders the real component (no placeholder) with current attribute values', async () => {
    renderWidget(anchorWidget());
    expect(document.querySelector('[data-widget-placeholder]')).toBeNull();
    await waitFor(() => {
      expect(screen.getByText('Termostat settings')).toBeInTheDocument();
    });
    // groupTitle interpolated from state params
    expect(screen.getByText('Thermostat A')).toBeInTheDocument();
    await waitFor(() => {
      expect(
        screen.getByRole('checkbox', { name: 'Low humidity alarm' }),
      ).toBeChecked();
    });
    // threshold reads the wire string value through the double coercion
    const threshold = await screen.findByRole('spinbutton', {
      name: 'High temperature threshold, °C',
    });
    await waitFor(() => {
      expect((threshold as HTMLInputElement).value).toBe('75');
    });
  });

  it('saves a toggled checkbox immediately per key (SERVER_SCOPE)', async () => {
    renderWidget(anchorWidget());
    await waitFor(() => {
      expect(
        screen.getByRole('checkbox', { name: 'High temperature alarm' }),
      ).not.toBeChecked();
    });
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'High temperature alarm' }),
    );
    await waitFor(() => {
      expect(attributesMock.saveEntityAttributes).toHaveBeenCalled();
    });
    expect(attributesMock.saveEntityAttributes).toHaveBeenCalledWith(
      { entityType: 'DEVICE', id: 'therm-1', name: 'Thermostat A' },
      'SERVER_SCOPE',
      [{ key: 'temperatureAlarmFlag', value: true }],
    );
  });

  it('disables the threshold field while its flag data key is falsy', async () => {
    renderWidget(anchorWidget());
    await waitFor(() => {
      expect(screen.getByText('Termostat settings')).toBeInTheDocument();
    });
    const threshold = await screen.findByRole('spinbutton', {
      name: 'High temperature threshold, °C',
    });
    // temperatureAlarmFlag loaded as false → threshold disabled
    await waitFor(() => {
      expect(threshold).toBeDisabled();
    });
    // flip the flag → threshold becomes enabled
    fireEvent.click(
      screen.getByRole('checkbox', { name: 'High temperature alarm' }),
    );
    await waitFor(() => {
      expect(threshold).not.toBeDisabled();
    });
  });

  it('renders the no-entity state when the alias resolves to nothing', () => {
    const widget = anchorWidget();
    render(
      <AntdApp>
        <RawIntlProvider value={intl}>
          <UpdateMultipleAttributes
            fqn="system.input_widgets.update_multiple_attributes"
            widgetId="w-attrs"
            widget={widget}
            layout={layout}
            ctx={{
              effectiveTimewindow: { selectedTab: 'REALTIME' },
              aliases: {},
              datasources: [
                {
                  type: 'entity',
                  entities: [],
                  dataKeys: widget.config.datasources?.[0]?.dataKeys ?? [],
                },
              ],
              states: statesStub,
              isMobile: false,
            }}
          />
        </RawIntlProvider>
      </AntdApp>,
    );
    expect(screen.getByText('该组件未解析到目标实体')).toBeInTheDocument();
  });
});
