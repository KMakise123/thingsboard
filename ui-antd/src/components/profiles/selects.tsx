/**
 * Profile-form server-searched selects (ui-ngx autocomplete parity for the
 * device/asset profile General forms):
 *
 *   RuleChainSelect   — tb-rule-chain-autocomplete (GET /api/ruleChains?type=)
 *   DashboardSelect   — tb-dashboard-autocomplete (GET /api/tenant/dashboards)
 *   QueueNameSelect   — tb-queue-autocomplete (GET /api/queues?serviceType=TB_RULE_ENGINE)
 *   OtaPackageSelect  — tb-ota-package-autocomplete (GET /api/otaPackages/{profileId}/{type})
 *
 * All are plain antd Selects whose value is the entity UUID (or the queue
 * name), so they drop straight into a Form.Item. Options fetch server-side
 * on search (filterOption=false), 50 rows, name-ordered — the ui-ngx
 * autocomplete page size.
 */
import { useQuery } from '@tanstack/react-query';
import { Select } from 'antd';
import { useMemo, useState } from 'react';
import { getTenantDashboards } from '@/services/tb/dashboard';
import {
  getOtaPackagesByDeviceProfile,
  getRuleEngineQueues,
  getTenantRuleChains,
} from '@/services/tb/device-profile';
import type {
  OtaPackageType,
  RuleChainTypeFilter,
} from '@/types/tb/device-profile';

const PAGE_SIZE = 50;

const nameSort = {
  pageSize: PAGE_SIZE,
  page: 0,
  sortOrder: { property: 'name', direction: 'ASC' as const },
};

/** Default rule chain / default edge rule chain picker. */
export function RuleChainSelect({
  value,
  onChange,
  disabled,
  ruleChainType = 'CORE',
  placeholder,
}: {
  value?: string;
  onChange?: (value?: string) => void;
  disabled?: boolean;
  ruleChainType?: RuleChainTypeFilter;
  placeholder?: string;
}) {
  const [search, setSearch] = useState('');
  const chainsQuery = useQuery({
    queryKey: ['rule-chains', 'select', ruleChainType, search],
    queryFn: () =>
      getTenantRuleChains(
        { ...nameSort, textSearch: search || undefined },
        ruleChainType,
      ),
  });
  return (
    <Select
      allowClear
      showSearch
      value={value || undefined}
      onChange={(next) => onChange?.(next ?? undefined)}
      onSearch={setSearch}
      filterOption={false}
      disabled={disabled}
      loading={chainsQuery.isPending}
      options={(chainsQuery.data?.data ?? []).map((chain) => ({
        label: chain.name,
        value: chain.id.id,
      }))}
      placeholder={placeholder ?? 'Select a rule chain'}
      style={{ width: '100%' }}
    />
  );
}

/** Mobile default-dashboard picker (tenant dashboards, select-only). */
export function DashboardSelect({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value?: string;
  onChange?: (value?: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [search, setSearch] = useState('');
  const dashboardsQuery = useQuery({
    queryKey: ['dashboards', 'select', search],
    queryFn: () =>
      getTenantDashboards({ ...nameSort, textSearch: search || undefined }),
  });
  return (
    <Select
      allowClear
      showSearch
      value={value || undefined}
      onChange={(next) => onChange?.(next ?? undefined)}
      onSearch={setSearch}
      filterOption={false}
      disabled={disabled}
      loading={dashboardsQuery.isPending}
      options={(dashboardsQuery.data?.data ?? []).map((dashboard) => ({
        label: dashboard.title,
        value: dashboard.id.id,
      }))}
      placeholder={placeholder ?? 'Select a dashboard'}
      style={{ width: '100%' }}
    />
  );
}

/** Default rule-engine queue picker (value is the queue name). */
export function QueueNameSelect({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value?: string;
  onChange?: (value?: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [search, setSearch] = useState('');
  const queuesQuery = useQuery({
    queryKey: ['queues', 'select', search],
    queryFn: () =>
      getRuleEngineQueues({ ...nameSort, textSearch: search || undefined }),
  });
  return (
    <Select
      allowClear
      showSearch
      value={value || undefined}
      onChange={(next) => onChange?.(next ?? undefined)}
      onSearch={setSearch}
      filterOption={false}
      disabled={disabled}
      loading={queuesQuery.isPending}
      options={(queuesQuery.data?.data ?? []).map((queue) => ({
        label: queue.name,
        value: queue.name,
      }))}
      placeholder={placeholder ?? 'Select a queue'}
      style={{ width: '100%' }}
    />
  );
}

/**
 * Firmware / software package picker scoped to the profile (the endpoint
 * needs an existing profile id, so it stays disabled until then — ui-ngx
 * fetchPackages returns an empty page without one).
 */
export function OtaPackageSelect({
  value,
  onChange,
  disabled,
  deviceProfileId,
  otaPackageType,
  placeholder,
}: {
  value?: string;
  onChange?: (value?: string) => void;
  disabled?: boolean;
  deviceProfileId?: string;
  otaPackageType: OtaPackageType;
  placeholder?: string;
}) {
  const [search, setSearch] = useState('');
  const enabled = !!deviceProfileId && !disabled;
  const packagesQuery = useQuery({
    queryKey: [
      'ota-packages',
      'select',
      deviceProfileId,
      otaPackageType,
      search,
    ],
    queryFn: () =>
      getOtaPackagesByDeviceProfile(deviceProfileId as string, otaPackageType, {
        pageSize: PAGE_SIZE,
        page: 0,
        textSearch: search || undefined,
        sortOrder: { property: 'title', direction: 'ASC' },
      }),
    enabled,
  });
  const options = useMemo(
    () =>
      (packagesQuery.data?.data ?? []).map((pkg) => ({
        // ui-ngx displayPackageFn: "title (version)".
        label: `${pkg.title} (${pkg.version})`,
        value: pkg.id.id,
      })),
    [packagesQuery.data],
  );
  return (
    <Select
      allowClear
      showSearch
      value={value || undefined}
      onChange={(next) => onChange?.(next ?? undefined)}
      onSearch={setSearch}
      filterOption={false}
      disabled={!enabled}
      loading={packagesQuery.isPending}
      options={options}
      placeholder={placeholder ?? 'Select an OTA package'}
      style={{ width: '100%' }}
    />
  );
}
