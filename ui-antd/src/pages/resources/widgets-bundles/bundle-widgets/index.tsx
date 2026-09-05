/**
 * Bundle widgets manager (routes /resources/widgets-bundles/:bundleId, M11
 * wave 1B — spec §3.1, ui-ngx widgets-bundle-widgets.component.ts parity).
 *
 * The bundle's widget-type membership loads ONCE (fixed 1024 infos page)
 * into local state; add / remove / reorder (up-down moves — the cdk drag
 * list's keyboard-operable equivalent) mutate the LOCAL array and the save
 * posts the whole ordered id list to
 * POST /api/widgetsBundle/{id}/widgetTypes (SET replacement — exactly the
 * upstream save semantics). Cancel re-reads the server list. An empty,
 * editable bundle enters edit mode automatically (upstream behavior).
 *
 * Tenants opening a system bundle (tenantId NULL_UUID) get the read-only
 * face (§1); the route back returns to the bundles list.
 *
 * V1-1 (X wave): the backend only ever accepts tenant-owned widget types
 * into a tenant bundle — system ids are dropped silently (upstream
 * WidgetsBundleController.updateWidgetsBundleWidgetTypes filters
 * candidates by tenant-strict existence). The add picker therefore
 * requests tenantOnly rows for TENANT admins and says so in the dialog.
 */
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { history, useParams } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Empty,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import { useAuthority } from '@/components/shared/use-authority';
import { getWidgetTypes } from '@/services/tb/widget-type';
import {
  getBundleWidgetTypeInfoList,
  getWidgetsBundleById,
  updateWidgetsBundleWidgetTypes,
} from '@/services/tb/widgets-bundle';
import type { WidgetTypeInfo } from '@/types/tb/widget-type';

/** TB's null-tenant UUID (EntityId.NULL_UUID) — the system marker. */
const NULL_UUID = '13814000-1dd2-11b2-8080-808080808080';

export default function BundleWidgetsPage() {
  const { bundleId } = useParams<{ bundleId: string }>();
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const { authority } = useAuthority();
  const isTenantAdmin = authority === 'TENANT_ADMIN';

  // ---- the bundle itself
  const bundleQuery = useQuery({
    queryKey: ['widgets-bundle', bundleId],
    queryFn: () => getWidgetsBundleById(bundleId as string),
    enabled: Boolean(bundleId),
    retry: false,
  });
  const bundle = bundleQuery.data;
  const readOnly = isTenantAdmin
    ? !bundle || bundle.tenantId?.id === NULL_UUID
    : authority !== 'SYS_ADMIN';

  // ---- membership (server read + local working copy)
  const [revision, setRevision] = useState(0);
  const membersQuery = useQuery({
    queryKey: ['widgets-bundle', bundleId, 'members', revision],
    queryFn: () => getBundleWidgetTypeInfoList(bundleId as string),
    enabled: Boolean(bundleId),
    retry: false,
  });
  const [widgets, setWidgets] = useState<Array<WidgetTypeInfo>>([]);
  const [loaded, setLoaded] = useState<Array<WidgetTypeInfo>>([]);
  useEffect(() => {
    if (membersQuery.data) {
      setWidgets(membersQuery.data);
      setLoaded(membersQuery.data);
    }
  }, [membersQuery.data]);

  const [editMode, setEditMode] = useState(false);
  useEffect(() => {
    // upstream: an editable EMPTY bundle opens straight in edit mode.
    if (!readOnly && membersQuery.isSuccess && membersQuery.data.length === 0) {
      setEditMode(true);
    }
  }, [readOnly, membersQuery.isSuccess, membersQuery.data]);

  const dirty = useMemo(
    () =>
      JSON.stringify(widgets.map((row) => row.id?.id)) !==
      JSON.stringify(loaded.map((row) => row.id?.id)),
    [widgets, loaded],
  );

  // ---- add dialog (server-searched widget types, minus current members)
  const [addOpen, setAddOpen] = useState(false);
  const [addSearch, setAddSearch] = useState('');
  const [addDebounced, setAddDebounced] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setAddDebounced(addSearch.trim()), 300);
    return () => clearTimeout(timer);
  }, [addSearch]);

  const optionsQuery = useQuery({
    queryKey: [
      'widget-types',
      'bundle-add-options',
      addDebounced,
      isTenantAdmin,
    ],
    queryFn: () =>
      getWidgetTypes(
        {
          pageSize: 50,
          page: 0,
          textSearch: addDebounced || undefined,
          sortOrder: { property: 'name', direction: 'ASC' },
        },
        // V1-1: a tenant bundle accepts only tenant-owned widget types —
        // the backend silently drops system ids (tenant-strict existence
        // check in WidgetsBundleController.updateWidgetsBundleWidgetTypes),
        // so the picker must not offer them in the first place.
        isTenantAdmin
          ? { deprecatedFilter: 'ALL', tenantOnly: true }
          : { deprecatedFilter: 'ALL' },
      ),
    enabled: addOpen,
    placeholderData: (previous) => previous,
  });
  const memberIds = useMemo(
    () => new Set(widgets.map((row) => row.id?.id)),
    [widgets],
  );
  const addOptions = (optionsQuery.data?.data ?? []).filter(
    (row) => !memberIds.has(row.id?.id),
  );

  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateWidgetsBundleWidgetTypes(
        bundleId as string,
        widgets.map((row) => row.id?.id ?? ''),
      );
      setRevision((value) => value + 1);
      setEditMode(false);
      void message.success(
        formatMessage({
          id: 'pages.resources.bundleWidgets.toastSaved',
          defaultMessage: 'Bundle widgets saved.',
        }),
      );
    } catch (error) {
      void message.error(serverErrorText(error));
    } finally {
      setSaving(false);
    }
  };

  const cancel = () => {
    setWidgets(loaded);
    setEditMode(false);
  };

  const move = (index: number, offset: -1 | 1) => {
    setWidgets((previous) => {
      const next = [...previous];
      const target = index + offset;
      if (target < 0 || target >= next.length) {
        return previous;
      }
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  if (bundleQuery.isPending || membersQuery.isPending) {
    return (
      <PageContainer>
        <Spin
          style={{ display: 'block', margin: '64px auto' }}
          tip={formatMessage({
            id: 'pages.resources.bundleWidgets.loading',
            defaultMessage: 'Loading widgets bundle…',
          })}
        >
          <div style={{ minHeight: 120 }} />
        </Spin>
      </PageContainer>
    );
  }
  if (bundleQuery.error || !bundle) {
    return (
      <PageContainer>
        <Alert
          type="error"
          showIcon
          message={serverErrorText(bundleQuery.error)}
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={bundle.title}
      dirty={dirty && editMode}
      onBack={() => history.push('/resources/widgets-bundles')}
      extra={
        <Space>
          {editMode ? (
            <>
              <Button onClick={cancel}>
                {formatMessage({
                  id: 'pages.resources.bundleWidgets.cancel',
                  defaultMessage: 'Cancel',
                })}
              </Button>
              <Button
                type="primary"
                loading={saving}
                disabled={!dirty}
                onClick={() => void save()}
                data-testid="bundle-widgets-save"
              >
                {formatMessage({
                  id: 'pages.resources.bundleWidgets.save',
                  defaultMessage: 'Save',
                })}
              </Button>
            </>
          ) : (
            !readOnly && (
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => setEditMode(true)}
                data-testid="bundle-widgets-edit"
              >
                {formatMessage({
                  id: 'pages.resources.bundleWidgets.edit',
                  defaultMessage: 'Edit',
                })}
              </Button>
            )
          )}
        </Space>
      }
    >
      <div className="flex flex-col gap-3">
        {bundle.description ? (
          <Typography.Text type="secondary">
            {bundle.description}
          </Typography.Text>
        ) : null}
        {readOnly ? (
          <Alert
            type="info"
            showIcon
            message={formatMessage({
              id: 'pages.resources.bundleWidgets.readOnly',
              defaultMessage:
                'This widgets bundle is a system resource — read-only for your session.',
            })}
          />
        ) : null}

        {widgets.length === 0 ? (
          <Empty
            description={formatMessage({
              id: 'pages.resources.bundleWidgets.empty',
              defaultMessage: 'No widget types in this bundle yet.',
            })}
          />
        ) : (
          <div
            className="flex flex-col gap-2"
            data-testid="bundle-widgets-list"
          >
            {widgets.map((row, index) => (
              <div
                key={row.id?.id ?? row.name}
                className="flex items-center gap-3 rounded-md border border-solid px-3 py-2"
                style={{ borderColor: 'var(--ant-color-border)' }}
              >
                <Typography.Text strong className="flex-1">
                  {row.name}
                </Typography.Text>
                <Typography.Text code type="secondary">
                  {row.fqn}
                </Typography.Text>
                {row.widgetType ? <Tag>{row.widgetType}</Tag> : null}
                {editMode ? (
                  <Space size={0}>
                    <Button
                      type="text"
                      size="small"
                      icon={<ArrowUpOutlined />}
                      disabled={index === 0}
                      aria-label={formatMessage({
                        id: 'pages.resources.bundleWidgets.moveUp',
                        defaultMessage: 'Move up',
                      })}
                      onClick={() => move(index, -1)}
                    />
                    <Button
                      type="text"
                      size="small"
                      icon={<ArrowDownOutlined />}
                      disabled={index === widgets.length - 1}
                      aria-label={formatMessage({
                        id: 'pages.resources.bundleWidgets.moveDown',
                        defaultMessage: 'Move down',
                      })}
                      onClick={() => move(index, 1)}
                    />
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      aria-label={formatMessage({
                        id: 'pages.resources.bundleWidgets.remove',
                        defaultMessage: 'Remove',
                      })}
                      data-testid={`bundle-widgets-remove-${row.id?.id ?? ''}`}
                      onClick={() =>
                        setWidgets((previous) =>
                          previous.filter(
                            (candidate) => candidate.id?.id !== row.id?.id,
                          ),
                        )
                      }
                    />
                  </Space>
                ) : null}
              </div>
            ))}
          </div>
        )}

        {editMode ? (
          <div>
            <Button
              icon={<PlusOutlined />}
              onClick={() => {
                setAddSearch('');
                setAddOpen(true);
              }}
              data-testid="bundle-widgets-add"
            >
              {formatMessage({
                id: 'pages.resources.bundleWidgets.add',
                defaultMessage: 'Add widget type',
              })}
            </Button>
          </div>
        ) : null}
      </div>

      <Modal
        open={addOpen}
        title={formatMessage({
          id: 'pages.resources.bundleWidgets.addTitle',
          defaultMessage: 'Add widget type to bundle',
        })}
        footer={null}
        onCancel={() => setAddOpen(false)}
        destroyOnHidden
        data-testid="bundle-widgets-add-dialog"
      >
        {isTenantAdmin ? (
          <Alert
            className="mb-3"
            type="info"
            showIcon
            message={formatMessage({
              id: 'pages.resources.bundleWidgets.addTenantHint',
              defaultMessage:
                'System widget types cannot join a tenant-owned bundle — the picker lists your own types only.',
            })}
          />
        ) : null}
        <Select<WidgetTypeInfo>
          style={{ width: '100%' }}
          showSearch
          filterOption={false}
          onSearch={setAddSearch}
          loading={optionsQuery.isFetching}
          placeholder={formatMessage({
            id: 'pages.resources.bundleWidgets.addPlaceholder',
            defaultMessage: 'Search widget types by name',
          })}
          notFoundContent={
            optionsQuery.isFetching ? <Spin size="small" /> : undefined
          }
          value={null}
          options={addOptions.map((row) => ({
            value: row.id?.id ?? '',
            label: row.name ?? row.fqn ?? '',
            row,
          }))}
          onSelect={(_value, option) => {
            setWidgets((previous) => [...previous, option.row]);
            setAddOpen(false);
          }}
          data-testid="bundle-widgets-add-select"
        />
      </Modal>
    </PageContainer>
  );
}
