/**
 * Device-profile detail page tests: the tab set follows ui-ngx
 * device-profile-tabs and each shared panel receives the profile id. Panels
 * are mocked — their internals have their own coverage.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhCommon from '@/locales/zh-CN/common';
import zhDeviceProfiles from '@/locales/zh-CN/device-profiles';
import { EntityType } from '@/types/tb';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhDeviceProfiles },
});

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));
const useParamsMock = vi.hoisted(() => vi.fn(() => ({ id: 'dp-1' })));
vi.mock('@umijs/max', () => ({
  history: historyMock,
  useParams: useParamsMock,
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

const servicesMock = vi.hoisted(() => ({
  getDeviceProfileById: vi.fn(),
  saveDeviceProfile: vi.fn(),
  getTenantRuleChains: vi.fn(),
  getRuleEngineQueues: vi.fn(),
  getOtaPackagesByDeviceProfile: vi.fn(),
}));
const dashboardsMock = vi.hoisted(() => ({ getTenantDashboards: vi.fn() }));
const deviceMock = vi.hoisted(() => ({
  countDevicesByOtaPackageType: vi.fn(),
}));

vi.mock('@/services/tb/device-profile', () => servicesMock);
vi.mock('@/services/tb/dashboard', () => dashboardsMock);
vi.mock('@/services/tb/device', () => deviceMock);

// pro-components cannot resolve antd locale imports under vite-node (M1
// known issue) — stub the PageContainer wrapper the page renders through.
vi.mock('@ant-design/pro-components', () => ({
  PageContainer: (props: {
    title?: React.ReactNode;
    tags?: React.ReactNode;
    extra?: React.ReactNode;
    content?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div>
      <h1 data-testid="pc-title">{props.title}</h1>
      <div data-testid="pc-tags">{props.tags}</div>
      <div data-testid="pc-extra">{props.extra}</div>
      <div data-testid="pc-content">{props.content}</div>
      {props.children}
    </div>
  ),
}));

const panelsMock = vi.hoisted(() => ({
  CalculatedFieldsTable: vi.fn(({ entityId }) => (
    <div data-testid="cf-panel">{entityId.id}</div>
  )),
  AlarmRulesPanel: vi.fn(({ entityId }) => (
    <div data-testid="ar-panel">{entityId.id}</div>
  )),
  AuditLogsPanel: vi.fn(({ entityId }) => (
    <div data-testid="audit-panel">{entityId.id}</div>
  )),
  VersionControlPanel: vi.fn(({ entityType }) => (
    <div data-testid="vc-panel">{entityType}</div>
  )),
}));

vi.mock('@/pages/calculated-fields/components/calculated-fields-table', () => ({
  default: panelsMock.CalculatedFieldsTable,
}));
vi.mock('@/components/entities/detail/AlarmRulesPanel', () => ({
  default: panelsMock.AlarmRulesPanel,
}));
vi.mock('@/components/entities/detail/AuditLogsPanel', () => ({
  default: panelsMock.AuditLogsPanel,
}));
vi.mock('@/components/entities/detail/VersionControlPanel', () => ({
  default: panelsMock.VersionControlPanel,
}));

import DeviceProfileDetailPage from './index';

const PROFILE = {
  id: { entityType: EntityType.DEVICE_PROFILE, id: 'dp-1' },
  createdTime: 1_700_000_000_000,
  tenantId: { entityType: EntityType.TENANT, id: 'tenant-1' },
  name: 'default-profile-name',
  description: 'test profile',
  default: true,
  type: 'DEFAULT',
  transportType: 'MQTT',
  provisionType: 'DISABLED',
  profileData: {
    configuration: { type: 'DEFAULT' },
    transportConfiguration: {
      type: 'MQTT',
      deviceTelemetryTopic: 'v1/devices/me/telemetry',
      deviceAttributesTopic: 'v1/devices/me/attributes',
      deviceAttributesSubscribeTopic: 'v1/devices/me/attributes',
      sparkplug: false,
      transportPayloadTypeConfiguration: { transportPayloadType: 'JSON' },
    },
    provisionConfiguration: { type: 'DISABLED' },
  },
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <DeviceProfileDetailPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('device profile detail page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/deviceProfiles/dp-1');
    servicesMock.getDeviceProfileById.mockResolvedValue(PROFILE);
    servicesMock.saveDeviceProfile.mockResolvedValue(PROFILE);
    servicesMock.getTenantRuleChains.mockResolvedValue({ data: [] });
    servicesMock.getRuleEngineQueues.mockResolvedValue({ data: [] });
    servicesMock.getOtaPackagesByDeviceProfile.mockResolvedValue({
      data: [{ id: { id: 'pkg-fw-1' }, title: 'FW pkg', version: '1.0' }],
      totalElements: 1,
    });
    dashboardsMock.getTenantDashboards.mockResolvedValue({ data: [] });
    deviceMock.countDevicesByOtaPackageType.mockResolvedValue(0);
  });

  it('renders the ui-ngx tab set and the general form fields', async () => {
    renderPage();

    expect(
      await screen.findByRole('tab', { name: '详情' }),
    ).toBeInTheDocument();
    for (const label of [
      '传输配置',
      '计算字段',
      '告警规则',
      '设备预配置',
      '审计日志',
      '版本控制',
    ]) {
      expect(screen.getByRole('tab', { name: label })).toBeInTheDocument();
    }
    // General form: name input prefilled + select-only mobile dashboard.
    const nameInput = await screen.findByDisplayValue('default-profile-name');
    expect(nameInput).toBeDisabled();
    expect(screen.getByText('移动端仪表板')).toBeInTheDocument();
    expect(screen.getByText('默认规则链')).toBeInTheDocument();
    // The header carries the default tag and the transport family.
    expect(screen.getAllByText('默认').length).toBeGreaterThan(0);
  });

  it('switches to the transport tab and shows the profile transport type', async () => {
    renderPage();
    await screen.findByRole('tab', { name: '传输配置' });
    fireEvent.click(screen.getByRole('tab', { name: '传输配置' }));

    // The transport type select shows the profile's MQTT family and the
    // topic filters from profileData.
    expect(await screen.findByText('遥测主题过滤器')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('v1/devices/me/telemetry'),
    ).toBeInTheDocument();
  });

  it('passes the profile entity id to the shared panels', async () => {
    renderPage();
    await screen.findByRole('tab', { name: '计算字段' });
    fireEvent.click(screen.getByRole('tab', { name: '计算字段' }));
    expect(await screen.findByTestId('cf-panel')).toHaveTextContent('dp-1');

    fireEvent.click(screen.getByRole('tab', { name: '告警规则' }));
    await waitFor(() => {
      expect(screen.getByTestId('ar-panel')).toHaveTextContent('dp-1');
    });

    fireEvent.click(screen.getByRole('tab', { name: '版本控制' }));
    await waitFor(() => {
      expect(screen.getByTestId('vc-panel')).toHaveTextContent(
        'DEVICE_PROFILE',
      );
    });

    fireEvent.click(screen.getByRole('tab', { name: '审计日志' }));
    await waitFor(() => {
      expect(screen.getByTestId('audit-panel')).toHaveTextContent('dp-1');
    });
  });

  // ---- M13 wave-6 save gate (ui-ngx confirmDialogUpdatePackage parity) ----

  async function editAndPickFirmware() {
    fireEvent.click(screen.getByRole('button', { name: /编\s*辑/ }));
    // The firmware picker enables on edit and loads this profile's packages.
    // antd v6 Selects carry no label association — locate the select inside
    // the firmware form item and mousedown to open the dropdown.
    await screen.findByText('固件');
    const formItem = screen.getByText('固件').closest('.ant-form-item');
    fireEvent.mouseDown(formItem?.querySelector('.ant-select') as HTMLElement);
    fireEvent.click(
      await screen.findByText('FW pkg (1.0)', {
        selector: '.ant-select-item-option-content',
      }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /保\s*存/ }),
      ).not.toBeDisabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));
  }

  it('counts affected devices and saves straight through when the count is zero', async () => {
    renderPage();
    await screen.findByRole('tab', { name: '详情' });

    await editAndPickFirmware();

    await waitFor(() => {
      expect(deviceMock.countDevicesByOtaPackageType).toHaveBeenCalledWith(
        'FIRMWARE',
        'dp-1',
      );
    });
    await waitFor(() => {
      expect(servicesMock.saveDeviceProfile).toHaveBeenCalledTimes(1);
    });
    expect(servicesMock.saveDeviceProfile.mock.calls[0][0].firmwareId).toEqual({
      entityType: EntityType.OTA_PACKAGE,
      id: 'pkg-fw-1',
    });
    // No affected devices -> no confirm dialog at all.
    expect(screen.queryAllByText('确定要更改 OTA 设置吗？')).toHaveLength(0);
  });

  it('confirms the affected-devices count and saves after Proceed', async () => {
    deviceMock.countDevicesByOtaPackageType.mockResolvedValue(7);
    renderPage();
    await screen.findByRole('tab', { name: '详情' });

    await editAndPickFirmware();

    expect(
      await screen.findByText('固件变更可能导致 7 台设备更新。'),
    ).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: /继\s*续/ }));
    await waitFor(() => {
      expect(servicesMock.saveDeviceProfile).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps the profile untouched when the OTA change is canceled', async () => {
    deviceMock.countDevicesByOtaPackageType.mockResolvedValue(7);
    renderPage();
    await screen.findByRole('tab', { name: '详情' });

    await editAndPickFirmware();

    expect(
      await screen.findByText('固件变更可能导致 7 台设备更新。'),
    ).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: /^取\s*消$/ }));
    // jsdom never fires the close animation end, so the dialog stays
    // mounted — assert on the wire effect instead of its disappearance.
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(servicesMock.saveDeviceProfile).not.toHaveBeenCalled();
  });
});
