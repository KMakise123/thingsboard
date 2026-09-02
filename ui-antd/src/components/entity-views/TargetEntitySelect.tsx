/**
 * Target-entity selector (spec 3.4 entity-selector-form parity): the
 * entity-view form's `{entityType, id}` pair rendered the tb-entity-select
 * way — an entity-type select (DEVICE | ASSET only, ui-ngx
 * allowedEntityTypes) beside a server-searched entity autocomplete. Changing
 * the type clears the picked entity (ui-ngx resets the autocomplete with it).
 *
 * Form contract: two fields on the shared form instance —
 * `targetEntityType` (EntityType) and `targetEntityId` (string id).
 */
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Col, Form, Row, Select } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { getTenantAssets } from '@/services/tb/asset';
import { getTenantDevices } from '@/services/tb/device';
import type { DeviceInfo, PageData } from '@/types/tb';
import { EntityType } from '@/types/tb';
import { TARGET_ENTITY_TYPES } from './entity-view-form';

const SEARCH_DEBOUNCE_MS = 300;

type SelectorRow = DeviceInfo | { id: { id: string }; name: string };

function useEntityOptions(entityType: EntityType, search: string) {
  return useQuery({
    queryKey: ['entity-selector', entityType, search],
    queryFn: async (): Promise<PageData<SelectorRow>> => {
      const pageLink = {
        pageSize: 50,
        page: 0,
        textSearch: search || undefined,
        sortOrder: { property: 'name', direction: 'ASC' as const },
      };
      return entityType === EntityType.ASSET
        ? getTenantAssets(pageLink)
        : getTenantDevices(pageLink);
    },
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export default function TargetEntitySelect() {
  const { formatMessage } = useIntl();
  const form = Form.useFormInstance();
  const entityType =
    Form.useWatch('targetEntityType', form) ?? EntityType.DEVICE;

  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(
      () => setDebounced(search.trim()),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer.current);
  }, [search]);

  const entitiesQuery = useEntityOptions(entityType, debounced);
  const currentId = Form.useWatch('targetEntityId', form);
  const options = (entitiesQuery.data?.data ?? []).map((row) => ({
    label: row.name,
    value: row.id.id,
  }));
  // Keep the already-picked entity selectable even when it is not in the
  // current search page (same pattern as the device details profile select).
  if (currentId && !options.some((option) => option.value === currentId)) {
    options.unshift({ label: currentId, value: currentId });
  }

  return (
    <Row gutter={16}>
      <Col span={8}>
        <Form.Item
          name="targetEntityType"
          label={formatMessage({
            id: 'pages.entityViews.form.targetEntityType',
            defaultMessage: 'Target entity type',
          })}
          rules={[
            {
              required: true,
              message: formatMessage({
                id: 'pages.entityViews.form.targetEntityRequired',
                defaultMessage: 'Target entity is required.',
              }),
            },
          ]}
        >
          <Select
            options={TARGET_ENTITY_TYPES.map((type) => ({
              value: type,
              label: formatMessage({
                id:
                  type === EntityType.ASSET
                    ? 'pages.entityViews.form.assetOption'
                    : 'pages.entityViews.form.deviceOption',
                defaultMessage: type === EntityType.ASSET ? 'Asset' : 'Device',
              }),
            }))}
            onChange={() => {
              // The autocomplete's data source switches with the type, so
              // the stale id must go (ui-ngx entity-select behavior).
              form.setFieldValue('targetEntityId', undefined);
            }}
          />
        </Form.Item>
      </Col>
      <Col span={16}>
        <Form.Item
          name="targetEntityId"
          label={formatMessage({
            id: 'pages.entityViews.form.targetEntity',
            defaultMessage: 'Target entity',
          })}
          rules={[
            {
              required: true,
              message: formatMessage({
                id: 'pages.entityViews.form.targetEntityRequired',
                defaultMessage: 'Target entity is required.',
              }),
            },
          ]}
        >
          <Select
            showSearch
            allowClear
            filterOption={false}
            placeholder={formatMessage({
              id: 'pages.entityViews.form.targetEntityPlaceholder',
              defaultMessage: 'Search and select a device or asset',
            })}
            loading={entitiesQuery.isFetching}
            onSearch={setSearch}
            options={options}
            notFoundContent={
              entitiesQuery.isFetching
                ? undefined
                : formatMessage({
                    id: 'pages.entityViews.form.targetEntityPlaceholder',
                    defaultMessage: 'Search and select a device or asset',
                  })
            }
          />
        </Form.Item>
      </Col>
    </Row>
  );
}
