/**
 * Calculated fields — standalone tenant-wide list (M14 wave-4/5, R12,
 * spec 6.1-1..3). Since R17 the table itself (columns, row actions,
 * dialogs, import/export) lives in the shared `CalculatedFieldsTable`
 * (tenant mode); this page keeps the pageMode-only shell: title, search,
 * refresh and the three filter dimensions (R12 sanctioned toolbar form —
 * the ngx header component only mounts in page mode).
 */
import { ReloadOutlined } from '@ant-design/icons';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useModel } from '@umijs/max';
import { Button, Input, Select, Space } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import PageContainer from '@/components/layout/page-container';
import { getTenantAssets } from '@/services/tb/asset';
import { getAssetProfileList } from '@/services/tb/asset-profile';
import { getTenantDevices } from '@/services/tb/device';
import { getDeviceProfileList } from '@/services/tb/device-profile';
import CalculatedFieldsTable from '../components/calculated-fields-table';
import {
  CF_PAGE_TYPES,
  CF_SUPPORTED_ENTITY_TYPES,
  type CfHostEntityType,
} from '../components/data';
import { useCfListUrlState } from './url-state';

const SEARCH_DEBOUNCE_MS = 400;

export default function CalculatedFieldsListPage() {
  const { formatMessage } = useIntl();
  const { initialState } = useModel('@@initialState');
  const tenantId = initialState?.currentUser?.tenantId?.id ?? '';

  const { state, patch } = useCfListUrlState();
  const [refreshSignal, setRefreshSignal] = useState(0);

  const [searchInput, setSearchInput] = useState(state.textSearch);
  useEffect(() => {
    setSearchInput(state.textSearch);
  }, [state.textSearch]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: the debounced write goes through patch (a stable writer); urlState.textSearch re-syncs the input each commit
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      const next = searchInput.trim();
      if (next !== state.textSearch) {
        patch({ textSearch: next, page: 1 });
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(searchTimer.current);
  }, [searchInput]);

  return (
    <PageContainer
      title={formatMessage({
        id: 'menu.calculatedFields',
        defaultMessage: 'Calculated fields',
      })}
      extra={
        <div className="flex flex-wrap items-center gap-3">
          <Input.Search
            allowClear
            className="w-56"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={formatMessage({
              id: 'pages.calculatedFields.search',
              defaultMessage: 'Search calculated fields',
            })}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => setRefreshSignal((signal) => signal + 1)}
          >
            {formatMessage({
              id: 'pages.calculatedFields.refresh',
              defaultMessage: 'Refresh',
            })}
          </Button>
          <div className="flex-1" />
          <Space wrap>
            <Select
              mode="multiple"
              maxTagCount={1}
              className="min-w-44"
              value={state.types}
              allowClear
              placeholder={formatMessage({
                id: 'pages.calculatedFields.filter.types',
                defaultMessage: 'Filter by types',
              })}
              onChange={(next) => patch({ types: next, page: 1 })}
              options={CF_PAGE_TYPES.map((type) => ({
                value: type,
                label: formatMessage({
                  id: `pages.calculatedFields.type.${type}`,
                  defaultMessage: type,
                }),
              }))}
            />
            <Select
              className="w-44"
              value={state.entityType || undefined}
              allowClear
              placeholder={formatMessage({
                id: 'pages.calculatedFields.filter.entityType',
                defaultMessage: 'Filter by entity type',
              })}
              onChange={(next) =>
                patch({
                  entityType: (next ?? '') as CfHostEntityType | '',
                  entities: [],
                  page: 1,
                })
              }
              options={CF_SUPPORTED_ENTITY_TYPES.map((entityType) => ({
                value: entityType,
                label: formatMessage({
                  id: `pages.calculatedFields.entityType.${entityType}`,
                  defaultMessage: entityType,
                }),
              }))}
            />
            <EntitiesFilterSelect
              entityType={state.entityType}
              value={state.entities}
              onChange={(next) => patch({ entities: next, page: 1 })}
            />
          </Space>
        </div>
      }
    >
      <CalculatedFieldsTable
        mode="tenant"
        tenantId={tenantId}
        urlState={state}
        onUrlStateChange={patch}
        refreshSignal={refreshSignal}
      />
    </PageContainer>
  );
}

/** Entities filter select — server search within the chosen entityType. */
function EntitiesFilterSelect({
  entityType,
  value,
  onChange,
}: {
  entityType: CfHostEntityType | '';
  value?: Array<string>;
  onChange?: (value: Array<string>) => void;
}) {
  const { formatMessage } = useIntl();
  const [search, setSearch] = useState('');
  const enabled = entityType !== '';
  const rowsQuery = useQuery({
    queryKey: ['cf-filter-entities', entityType, search],
    queryFn: async () => {
      const text = search || undefined;
      switch (entityType) {
        case 'DEVICE':
          return getTenantDevices({ pageSize: 50, page: 0, textSearch: text });
        case 'ASSET':
          return getTenantAssets({ pageSize: 50, page: 0, textSearch: text });
        case 'DEVICE_PROFILE':
          return getDeviceProfileList({
            pageSize: 50,
            page: 0,
            textSearch: text,
          });
        default:
          return getAssetProfileList({
            pageSize: 50,
            page: 0,
            textSearch: text,
          });
      }
    },
    enabled,
    placeholderData: keepPreviousData,
  });
  return (
    <Select
      mode="multiple"
      className="min-w-56"
      maxTagCount={2}
      value={value ?? []}
      disabled={!enabled}
      showSearch
      filterOption={false}
      onSearch={setSearch}
      loading={rowsQuery.isFetching}
      onChange={(next) => onChange?.(next)}
      options={(rowsQuery.data?.data ?? []).map((row) => ({
        label: row.name,
        // row.id is the EntityId object ({entityType, id}) — the wire UUID
        // is row.id.id; a raw object value would crash the options render.
        value: row.id.id,
      }))}
      placeholder={
        enabled
          ? formatMessage({
              id: 'pages.calculatedFields.filter.entitiesPlaceholder',
              defaultMessage: 'Filter by entities',
            })
          : formatMessage({
              id: 'pages.calculatedFields.filter.entitiesNeedType',
              defaultMessage: 'Pick an entity type first',
            })
      }
      allowClear
    />
  );
}
