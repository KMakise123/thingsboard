/**
 * Tenant-profile detail page tests: the General form prefills from the
 * fetched profile, the isolated toggle reveals the queues editor (with the
 * stock queue preset), save posts the merged profile payload, and the read
 * mode renders the three tabs (attributes / latest telemetry / audit-logs).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { App as AntdApp } from 'antd';
import React from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import zhCommon from '@/locales/zh-CN/common';
import zhTenantProfiles from '@/locales/zh-CN/tenant-profiles';
import zhTenants from '@/locales/zh-CN/tenants';

const intl = createIntl({
  locale: 'zh-CN',
  // The Edit/Cancel header buttons reuse the tenants-domain wording.
  messages: { ...zhCommon, ...zhTenants, ...zhTenantProfiles },
});

const historyMock = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useParams: vi.fn(() => ({ id: 'profile-1' })),
  useSelectedRoutes: () => [
    { route: {}, pathname: '/' },
    {
      route: { name: 'tenantProfiles.detail' },
      pathname: '/tenantProfiles/profile-1',
    },
  ],
  useAppData: () => ({
    clientRoutes: [{ name: 'tenantProfiles', path: '/tenantProfiles' }],
  }),
}));

import TenantProfileDetailPage from './index';

const servicesMock = vi.hoisted(() => ({
  getTenantProfileById: vi.fn(),
  saveTenantProfile: vi.fn(),
  deleteTenantProfile: vi.fn(),
}));

vi.mock('@/services/tb/tenant-profile', () => servicesMock);
vi.mock('@/core/ws/hooks', () => ({
  useAttributeSubscription: () => ({ data: [], status: 'connected' }),
  useLatestTelemetrySubscription: () => ({ data: [], status: 'connected' }),
}));

// pro-components cannot resolve antd locale imports under vite-node (M1
// known issue) — stub PageContainer while keeping the wrapper's contract.
vi.mock('@ant-design/pro-components', () => ({
  PageContainer: (props: {
    title?: React.ReactNode;
    extra?: React.ReactNode;
    content?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div>
      <h1 data-testid="pc-title">{props.title}</h1>
      <div data-testid="pc-extra">{props.extra}</div>
      <div data-testid="pc-content">{props.content}</div>
      {props.children}
    </div>
  ),
}));

function profile() {
  return {
    id: { entityType: 'TENANT_PROFILE', id: 'profile-1' },
    createdTime: 1_700_000_000_000,
    name: 'Gold',
    description: 'gold tenants',
    default: false,
    isolatedTbRuleEngine: false,
    profileData: {
      configuration: {
        type: 'DEFAULT',
        maxDevices: 0,
        maxAssets: 0,
        maxCustomers: 0,
        maxUsers: 0,
        maxDashboards: 0,
        maxRuleChains: 0,
        maxEdges: 0,
        maxResourcesInBytes: 0,
        maxOtaPackagesInBytes: 0,
        maxResourceSize: 0,
        maxTransportMessages: 0,
        maxTransportDataPoints: 0,
        maxREExecutions: 0,
        maxJSExecutions: 0,
        maxTbelExecutions: 0,
        maxDPStorageDays: 0,
        maxRuleNodeExecutionsPerMessage: 0,
        maxEmails: 0,
        maxSms: 0,
        smsEnabled: true,
        maxCreatedAlarms: 0,
        maxDebugModeDurationMinutes: 15,
        tenantServerRestLimitsConfiguration: '',
        customerServerRestLimitsConfiguration: '',
        maxWsSessionsPerTenant: 0,
        maxWsSessionsPerCustomer: 0,
        maxWsSessionsPerRegularUser: 0,
        maxWsSessionsPerPublicUser: 0,
        wsMsgQueueLimitPerSession: 0,
        maxWsSubscriptionsPerTenant: 0,
        maxWsSubscriptionsPerCustomer: 0,
        maxWsSubscriptionsPerRegularUser: 0,
        maxWsSubscriptionsPerPublicUser: 0,
        wsUpdatesPerSessionRateLimit: '',
        defaultStorageTtlDays: 0,
        alarmsTtlDays: 0,
        rpcTtlDays: 0,
        queueStatsTtlDays: 0,
        ruleEngineExceptionsTtlDays: 0,
        maxCalculatedFieldsPerEntity: 5,
        maxArgumentsPerCF: 10,
        maxRelationLevelPerCfArgument: 2,
        minAllowedDeduplicationIntervalInSecForCF: 10,
        minAllowedAggregationIntervalInSecForCF: 60,
        maxRelatedEntitiesToReturnPerCfArgument: 100,
        minAllowedScheduledUpdateIntervalInSecForCF: 10,
        intermediateAggregationIntervalInSecForCF: 300,
        cfReevaluationCheckInterval: 60,
        alarmsReevaluationInterval: 60,
        maxDataPointsPerRollingArg: 1000,
        maxStateSizeInKBytes: 32,
        maxSingleValueArgumentSizeInKBytes: 2,
        calculatedFieldDebugEventsRateLimit: '',
      },
      queueConfiguration: null,
    },
  };
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AntdApp>
        <RawIntlProvider value={intl}>
          <TenantProfileDetailPage />
        </RawIntlProvider>
      </AntdApp>
    </QueryClientProvider>,
  );
}

describe('tenant-profile detail page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/tenantProfiles/profile-1');
    servicesMock.getTenantProfileById.mockResolvedValue(profile());
    servicesMock.saveTenantProfile.mockImplementation(
      async (saved: { name: string }) => ({
        ...profile(),
        name: saved.name,
      }),
    );
    servicesMock.deleteTenantProfile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    window.history.replaceState({}, '', '/tenantProfiles');
  });

  it('prefills the general form and hides tabs while editing', async () => {
    renderPage();

    // Read mode first: the tab bar shows the three read tabs.
    expect(await screen.findByText('属性')).toBeInTheDocument();
    expect(screen.getByText('审计日志')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /编\s*辑/ }));

    const nameInput = await screen.findByDisplayValue('Gold');
    expect(nameInput).toBeInTheDocument();
    expect(screen.getByText('配置')).toBeInTheDocument();
    // Read tabs are replaced by the form while editing.
    expect(screen.queryByText('属性')).not.toBeInTheDocument();
  });

  it('reveals the queues editor only for the isolated toggle', async () => {
    renderPage();
    await screen.findByText('属性');

    fireEvent.click(screen.getByRole('button', { name: /编\s*辑/ }));
    await screen.findByDisplayValue('Gold');
    expect(screen.queryByText('队列')).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('checkbox', {
        name: /使用隔离的 ThingsBoard 规则引擎队列/,
      }),
    );

    await waitFor(() => {
      expect(screen.getByText('队列')).toBeInTheDocument();
    });
    // The stock Main queue preset is seeded.
    expect(screen.getByText('Queue #1')).toBeInTheDocument();
    expect(screen.getByText('添加队列')).toBeInTheDocument();
  });

  it('saves the edited name through the profile endpoint', async () => {
    renderPage();
    await screen.findByText('属性');

    fireEvent.click(screen.getByRole('button', { name: /编\s*辑/ }));
    const nameInput = await screen.findByDisplayValue('Gold');
    fireEvent.change(nameInput, { target: { value: 'Platinum' } });
    fireEvent.click(screen.getByRole('button', { name: /保\s*存/ }));

    await waitFor(() => {
      expect(servicesMock.saveTenantProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Platinum',
          profileData: expect.objectContaining({
            configuration: expect.objectContaining({ type: 'DEFAULT' }),
          }),
        }),
      );
    });
  });
});
