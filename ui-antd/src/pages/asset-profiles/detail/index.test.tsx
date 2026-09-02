/**
 * Asset-profile detail page tests: the ui-ngx asset-profile-tabs set —
 * details / calculated fields / alarm rules / audit logs / version control,
 * with NO transport or provisioning tab. Panels are mocked.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import zhAssetProfiles from '@/locales/zh-CN/asset-profiles';
import zhCommon from '@/locales/zh-CN/common';
import { EntityType } from '@/types/tb';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhCommon, ...zhAssetProfiles },
});

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));
const useParamsMock = vi.hoisted(() => vi.fn(() => ({ id: 'ap-1' })));
vi.mock('@umijs/max', () => ({
  history: historyMock,
  useParams: useParamsMock,
  useSelectedRoutes: () => [],
  useAppData: () => ({ clientRoutes: [] }),
}));

const servicesMock = vi.hoisted(() => ({
  getAssetProfileById: vi.fn(),
  saveAssetProfile: vi.fn(),
  getTenantRuleChains: vi.fn(),
  getRuleEngineQueues: vi.fn(),
}));
const dashboardsMock = vi.hoisted(() => ({ getTenantDashboards: vi.fn() }));

vi.mock('@/services/tb/asset-profile', () => servicesMock);
vi.mock('@/services/tb/dashboard', () => dashboardsMock);

// pro-components cannot resolve antd locale imports under vite-node (M1
// known issue) — stub the PageContainer wrapper the page renders through.
vi.mock('@ant-design/pro-components', () => ({
  PageContainer: (props: {
    title?: React.ReactNode;
    extra?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div>
      <h1 data-testid="pc-title">{props.title}</h1>
      <div data-testid="pc-extra">{props.extra}</div>
      {props.children}
    </div>
  ),
}));

const panelsMock = vi.hoisted(() => ({
  CalculatedFieldsPanel: vi.fn(({ entityId }) => (
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

vi.mock('@/components/entities/detail/CalculatedFieldsPanel', () => ({
  default: panelsMock.CalculatedFieldsPanel,
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

import AssetProfileDetailPage from './index';

const PROFILE = {
  id: { entityType: EntityType.ASSET_PROFILE, id: 'ap-1' },
  createdTime: 1_700_000_000_000,
  tenantId: { entityType: EntityType.TENANT, id: 'tenant-1' },
  name: 'asset-profile-name',
  description: '',
  default: false,
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <AssetProfileDetailPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('asset profile detail page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/assetProfiles/ap-1');
    servicesMock.getAssetProfileById.mockResolvedValue(PROFILE);
    servicesMock.saveAssetProfile.mockResolvedValue(PROFILE);
    servicesMock.getTenantRuleChains.mockResolvedValue({ data: [] });
    servicesMock.getRuleEngineQueues.mockResolvedValue({ data: [] });
    dashboardsMock.getTenantDashboards.mockResolvedValue({ data: [] });
  });

  it('renders the five-tab set without transport or provisioning', async () => {
    renderPage();

    expect(
      await screen.findByRole('tab', { name: '详情' }),
    ).toBeInTheDocument();
    for (const label of ['计算字段', '告警规则', '审计日志', '版本控制']) {
      expect(screen.getByRole('tab', { name: label })).toBeInTheDocument();
    }
    expect(
      screen.queryByRole('tab', { name: '传输配置' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('tab', { name: '设备预配置' }),
    ).not.toBeInTheDocument();
    // General form shows the stored name and the mobile dashboard picker.
    expect(
      await screen.findByDisplayValue('asset-profile-name'),
    ).toBeInTheDocument();
    expect(screen.getByText('移动端仪表板')).toBeInTheDocument();
  });

  it('passes the profile entity id to the shared panels', async () => {
    renderPage();
    await screen.findByRole('tab', { name: '计算字段' });
    fireEvent.click(screen.getByRole('tab', { name: '计算字段' }));
    expect(await screen.findByTestId('cf-panel')).toHaveTextContent('ap-1');

    fireEvent.click(screen.getByRole('tab', { name: '告警规则' }));
    await waitFor(() => {
      expect(screen.getByTestId('ar-panel')).toHaveTextContent('ap-1');
    });

    fireEvent.click(screen.getByRole('tab', { name: '版本控制' }));
    await waitFor(() => {
      expect(screen.getByTestId('vc-panel')).toHaveTextContent('ASSET_PROFILE');
    });

    fireEvent.click(screen.getByRole('tab', { name: '审计日志' }));
    await waitFor(() => {
      expect(screen.getByTestId('audit-panel')).toHaveTextContent('ap-1');
    });
  });
});
