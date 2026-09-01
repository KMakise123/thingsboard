/**
 * Version-control tab panel (spec 3.3 `version-control`, TA only).
 *
 * Parity with ui-ngx's entity version-control tab, AntD-ized and in-place
 * (spec principle 4 — never navigates to the VC standalone page): commit
 * this device to the repository, version list, compare-with-current diff
 * (rendered as a changed-fields table) and restore. Plus the auto-commit
 * settings for DEVICE, scoped to its own settings entry.
 *
 * Without a configured repository the tab degrades to a hint (repository
 * settings belong to the v2 settings pages) instead of dead forms.
 */
import {
  CloudUploadOutlined,
  DiffOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  AutoComplete,
  Button,
  Card,
  Checkbox,
  Flex,
  Form,
  Input,
  Modal,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import type {
  BranchInfo,
  EntityDataDiff,
  EntityDataInfo,
  EntityVersion,
  VersionCreationResult,
  VersionLoadResult,
} from '@/services/tb/version-control';
import {
  awaitVersionCreateResult,
  awaitVersionLoadResult,
  compareEntityDataToVersion,
  deleteAutoCommitSettings,
  getAutoCommitSettings,
  getEntityDataInfo,
  getRepositorySettingsInfo,
  listBranches,
  listEntityVersions,
  loadEntitiesVersion,
  saveAutoCommitSettings,
  saveEntitiesVersion,
} from '@/services/tb/version-control';
import type { EntityId, EntityType } from '@/types/tb';

type DiffStatus = 'CHANGED' | 'ADDED' | 'REMOVED' | 'SAME';

const DIFF_COLOR: Record<DiffStatus, string> = {
  CHANGED: 'warning',
  ADDED: 'success',
  REMOVED: 'error',
  SAME: 'default',
};

interface DiffRow {
  path: string;
  status: DiffStatus;
  current?: unknown;
  other?: unknown;
}

/** Flatten export JSON into leaf `path → value` rows for the diff table. */
function flattenExport(
  value: unknown,
  prefix = '',
  rows: Map<string, unknown> = new Map(),
): Map<string, unknown> {
  if (value === null || value === undefined) {
    return rows;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      flattenExport(item, `${prefix}[${index}]`, rows);
    });
    return rows;
  }
  if (typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      flattenExport(item, prefix ? `${prefix}.${key}` : key, rows);
    }
    return rows;
  }
  rows.set(prefix, value);
  return rows;
}

/** Union of both export payloads as a changed-fields table, sorted by path. */
function buildDiffRows(diff: EntityDataDiff): Array<DiffRow> {
  const current = flattenExport(diff.currentVersion);
  const other = flattenExport(diff.otherVersion);
  const rows: Array<DiffRow> = [];
  for (const [path, value] of current) {
    if (!other.has(path)) {
      rows.push({ path, status: 'REMOVED', current: value });
    } else if (other.get(path) !== value) {
      rows.push({
        path,
        status: 'CHANGED',
        current: value,
        other: other.get(path),
      });
    } else {
      rows.push({ path, status: 'SAME', current: value, other: value });
    }
  }
  for (const [path, value] of other) {
    if (!current.has(path)) {
      rows.push({ path, status: 'ADDED', other: value });
    }
  }
  return rows.sort((a, b) => a.path.localeCompare(b.path));
}

const formatCellValue = (value: unknown): string =>
  value === undefined ? '—' : String(value);

export default function VersionControlPanel({
  entityId,
  entityType,
}: {
  /** Polymorphic entity reference (DEVICE / ASSET / ENTITY_VIEW / ...). */
  entityId: EntityId;
  /**
   * Domain of the entity — keys the tenant-wide auto-commit settings entry
   * (one branch/flags config per entity type, ui-ngx parity).
   */
  entityType: EntityType;
}) {
  const { formatMessage } = useIntl();

  const repoQuery = useQuery({
    queryKey: ['vc-repo-info'],
    queryFn: getRepositorySettingsInfo,
  });

  if (repoQuery.isPending) {
    return (
      <div className="flex justify-center py-10">
        <Spin />
      </div>
    );
  }
  if (repoQuery.isError) {
    return (
      <Alert
        type="error"
        showIcon
        message={formatMessage({
          id: 'pages.devices.detail.vcLoadFailed',
          defaultMessage: 'Version control is unavailable',
        })}
        description={serverErrorText(repoQuery.error)}
      />
    );
  }
  if (!repoQuery.data.configured) {
    return (
      <Alert
        type="info"
        showIcon
        message={formatMessage({
          id: 'pages.devices.detail.vcRepoNotConfigured',
          defaultMessage:
            'Version control needs a Git repository configured in system settings (provided in v2).',
        })}
      />
    );
  }
  return <VersionControlContent entityId={entityId} entityType={entityType} />;
}

function VersionControlContent({
  entityId,
  entityType,
}: {
  entityId: EntityId;
  entityType: EntityType;
}) {
  const { formatMessage } = useIntl();
  const queryClient = useQueryClient();

  const [branch, setBranch] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [commitOpen, setCommitOpen] = useState(false);
  const [diffVersion, setDiffVersion] = useState<EntityVersion | null>(null);
  const [restoreVersion, setRestoreVersion] = useState<EntityVersion | null>(
    null,
  );

  const branchesQuery = useQuery({
    queryKey: ['vc-branches'],
    queryFn: listBranches,
  });
  const branches = branchesQuery.data ?? [];

  // Default the working branch to the repo's default, else the first entry
  // (matches ui-ngx branch-autocomplete fallback).
  useEffect(() => {
    if (!branch && branches.length > 0) {
      const fallback =
        branches.find((entry) => entry.default)?.name ?? branches[0].name;
      setBranch(fallback);
    }
  }, [branch, branches]);

  const versionsQuery = useQuery({
    queryKey: ['vc-versions', entityId.id, branch, page, pageSize],
    queryFn: () =>
      listEntityVersions(entityId.entityType, entityId.id, branch, {
        pageSize,
        page: page - 1,
        sortOrder: { property: 'timestamp', direction: 'DESC' },
      }),
    enabled: !!branch,
  });

  const columns = [
    {
      title: formatMessage({
        id: 'pages.devices.detail.vcVersionCreatedTime',
        defaultMessage: 'Created time',
      }),
      dataIndex: 'timestamp',
      width: 170,
      render: (ts: number) => dayjs(ts).format('YYYY-MM-DD HH:mm:ss'),
    },
    {
      title: formatMessage({
        id: 'pages.devices.detail.vcVersionId',
        defaultMessage: 'Version id',
      }),
      dataIndex: 'id',
      width: 130,
      render: (id: string) => (
        <Typography.Text copyable={{ text: id, tooltips: false }}>
          {id.slice(0, 8)}
        </Typography.Text>
      ),
    },
    {
      title: formatMessage({
        id: 'pages.devices.detail.vcVersionName',
        defaultMessage: 'Version name',
      }),
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: formatMessage({
        id: 'pages.devices.detail.vcVersionAuthor',
        defaultMessage: 'Author',
      }),
      dataIndex: 'author',
      ellipsis: true,
      width: 180,
    },
    {
      title: formatMessage({
        id: 'pages.devices.detail.actions',
        defaultMessage: 'Actions',
      }),
      key: 'actions',
      width: 110,
      render: (_: unknown, version: EntityVersion) => (
        <Space size={0}>
          <Button
            type="text"
            size="small"
            icon={<DiffOutlined />}
            title={formatMessage({
              id: 'pages.devices.detail.vcDiff',
              defaultMessage: 'Compare with current',
            })}
            onClick={() => setDiffVersion(version)}
          />
          <Button
            type="text"
            size="small"
            icon={<HistoryOutlined />}
            title={formatMessage({
              id: 'pages.devices.detail.vcRestore',
              defaultMessage: 'Restore this version',
            })}
            onClick={() => setRestoreVersion(version)}
          />
        </Space>
      ),
    },
  ];

  const invalidateVersions = () =>
    queryClient.invalidateQueries({ queryKey: ['vc-versions'] });

  return (
    <Flex vertical gap={16}>
      <Space wrap align="center">
        <AutoComplete
          value={branch || undefined}
          onChange={(next) => {
            setBranch(next ?? '');
            setPage(1);
          }}
          style={{ minWidth: 200 }}
          options={branches.map((entry: BranchInfo) => ({
            value: entry.name,
            label: entry.default
              ? `${entry.name} (${formatMessage({ id: 'pages.devices.detail.vcDefaultBranch', defaultMessage: 'default' })})`
              : entry.name,
          }))}
          placeholder={formatMessage({
            id: 'pages.devices.detail.vcBranch',
            defaultMessage: 'Branch',
          })}
        />
        <div className="flex-1" />
        <Button
          type="primary"
          icon={<CloudUploadOutlined />}
          onClick={() => setCommitOpen(true)}
        >
          {formatMessage({
            id: 'pages.devices.detail.vcCommit',
            defaultMessage: 'Commit to repository',
          })}
        </Button>
      </Space>

      {versionsQuery.isError && (
        <Alert
          type="error"
          showIcon
          message={formatMessage({
            id: 'pages.devices.detail.vcLoadFailed',
            defaultMessage: 'Version control is unavailable',
          })}
          description={serverErrorText(versionsQuery.error)}
        />
      )}

      <Table<EntityVersion>
        rowKey={(record) => record.id}
        size="small"
        columns={columns}
        dataSource={versionsQuery.data?.data ?? []}
        loading={versionsQuery.isPending}
        pagination={{
          current: page,
          pageSize,
          total: versionsQuery.data?.totalElements ?? 0,
          showSizeChanger: true,
          onChange: (nextPage, nextSize) => {
            setPage(nextPage);
            setPageSize(nextSize);
          },
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.devices.detail.vcEmpty',
            defaultMessage: 'No versions',
          }),
        }}
      />

      <AutoCommitCard branches={branches} entityType={entityType} />

      <CommitModal
        open={commitOpen}
        branch={branch}
        branches={branches}
        entityId={entityId}
        onClose={() => setCommitOpen(false)}
        onCommitted={invalidateVersions}
      />

      <DiffModal
        version={diffVersion}
        entityId={entityId}
        onClose={() => setDiffVersion(null)}
      />

      <RestoreModal
        version={restoreVersion}
        entityId={entityId}
        onClose={() => setRestoreVersion(null)}
      />
    </Flex>
  );
}

/** Shared checkbox row bound to a boolean form field. */
function FlagCheckbox({
  name,
  labelId,
  defaultMessage,
}: {
  name: string;
  labelId: string;
  defaultMessage: string;
}) {
  const { formatMessage } = useIntl();
  return (
    <Form.Item name={name} valuePropName="checked" noStyle>
      <Checkbox>{formatMessage({ id: labelId, defaultMessage })}</Checkbox>
    </Form.Item>
  );
}

interface CommitFormValues {
  branch: string;
  versionName: string;
  saveCredentials: boolean;
  saveAttributes: boolean;
  saveRelations: boolean;
  saveCalculatedFields: boolean;
}

/** Commit-this-device dialog: branch + version name + per-family flags. */
function CommitModal({
  open,
  branch,
  branches,
  entityId,
  onClose,
  onCommitted,
}: {
  open: boolean;
  branch: string;
  branches: Array<BranchInfo>;
  entityId: EntityId;
  onClose: () => void;
  onCommitted: () => void;
}) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const [form] = Form.useForm<CommitFormValues>();

  useEffect(() => {
    if (open) {
      form.resetFields();
      form.setFieldsValue({
        branch,
        saveCredentials: true,
        saveAttributes: true,
        saveRelations: true,
        saveCalculatedFields: true,
      });
    }
  }, [open, branch, form]);

  const commitMutation = useMutation({
    mutationFn: async (values: CommitFormValues) => {
      const requestId = await saveEntitiesVersion({
        type: 'SINGLE_ENTITY',
        branch: values.branch,
        versionName: values.versionName,
        entityId: entityId,
        config: {
          saveCredentials: values.saveCredentials,
          saveAttributes: values.saveAttributes,
          saveRelations: values.saveRelations,
          saveCalculatedFields: values.saveCalculatedFields,
        },
      });
      return awaitVersionCreateResult(requestId);
    },
    onSuccess: (result: VersionCreationResult) => {
      if (result.error) {
        void message.error(result.error);
      } else {
        void message.success(
          formatMessage(
            {
              id: 'pages.devices.detail.vcCommitDone',
              defaultMessage:
                'Version created (added {added}, modified {modified}, removed {removed}).',
            },
            {
              added: result.added ?? 0,
              modified: result.modified ?? 0,
              removed: result.removed ?? 0,
            },
          ),
        );
      }
      onClose();
      onCommitted();
    },
    onError: (error) => void message.error(serverErrorText(error)),
  });

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'pages.devices.detail.vcCommitTitle',
        defaultMessage: 'Commit device to repository',
      })}
      onOk={() => form.submit()}
      onCancel={onClose}
      confirmLoading={commitMutation.isPending}
      okText={formatMessage({
        id: 'pages.devices.detail.vcCreate',
        defaultMessage: 'Create version',
      })}
      cancelText={formatMessage({
        id: 'pages.devices.detail.cancel',
        defaultMessage: 'Cancel',
      })}
      destroyOnHidden
    >
      <Form<CommitFormValues>
        form={form}
        layout="vertical"
        className="pt-2"
        onFinish={(values) => commitMutation.mutate(values)}
      >
        <Form.Item
          name="branch"
          label={formatMessage({
            id: 'pages.devices.detail.vcBranch',
            defaultMessage: 'Branch',
          })}
          rules={[
            {
              required: true,
              whitespace: true,
              message: formatMessage({
                id: 'pages.devices.detail.vcBranchRequired',
                defaultMessage: 'Branch is required.',
              }),
            },
          ]}
        >
          <AutoComplete
            options={branches.map((entry: BranchInfo) => ({
              value: entry.name,
              label: entry.default
                ? `${entry.name} (${formatMessage({ id: 'pages.devices.detail.vcDefaultBranch', defaultMessage: 'default' })})`
                : entry.name,
            }))}
          />
        </Form.Item>
        <Form.Item
          name="versionName"
          label={formatMessage({
            id: 'pages.devices.detail.vcVersionName',
            defaultMessage: 'Version name',
          })}
          rules={[
            {
              required: true,
              whitespace: true,
              message: formatMessage({
                id: 'pages.devices.detail.vcVersionNameRequired',
                defaultMessage: 'Version name is required.',
              }),
            },
          ]}
        >
          <Input maxLength={255} />
        </Form.Item>
        <Flex vertical gap={8}>
          <FlagCheckbox
            name="saveCredentials"
            labelId="pages.devices.detail.vcSaveCredentials"
            defaultMessage="Export credentials"
          />
          <FlagCheckbox
            name="saveAttributes"
            labelId="pages.devices.detail.vcSaveAttributes"
            defaultMessage="Export attributes"
          />
          <FlagCheckbox
            name="saveRelations"
            labelId="pages.devices.detail.vcSaveRelations"
            defaultMessage="Export relations"
          />
          <FlagCheckbox
            name="saveCalculatedFields"
            labelId="pages.devices.detail.vcSaveCalculatedFields"
            defaultMessage="Export calculated fields"
          />
        </Flex>
      </Form>
    </Modal>
  );
}

/** Compare-with-current diff, rendered as a changed-fields table. */
function DiffModal({
  version,
  entityId,
  onClose,
}: {
  version: EntityVersion | null;
  entityId: EntityId;
  onClose: () => void;
}) {
  const { formatMessage } = useIntl();
  const [showAll, setShowAll] = useState(false);

  const diffQuery = useQuery({
    queryKey: ['vc-diff', entityId.id, version?.id],
    queryFn: () =>
      compareEntityDataToVersion(
        entityId.entityType,
        entityId.id,
        version?.id as string,
      ),
    enabled: !!version,
  });

  const allRows = useMemo(
    () => (diffQuery.data ? buildDiffRows(diffQuery.data) : []),
    [diffQuery.data],
  );
  const rows = showAll
    ? allRows
    : allRows.filter((row) => row.status !== 'SAME');

  const columns = [
    {
      title: formatMessage({
        id: 'pages.devices.detail.vcDiffPath',
        defaultMessage: 'Field',
      }),
      dataIndex: 'path',
      ellipsis: true,
    },
    {
      title: formatMessage({
        id: 'pages.devices.detail.vcDiffStatus',
        defaultMessage: 'Change',
      }),
      dataIndex: 'status',
      width: 110,
      render: (status: DiffStatus) => (
        <Tag color={DIFF_COLOR[status]}>
          {formatMessage({
            id: `pages.devices.detail.vcDiff.${status}`,
            defaultMessage: status,
          })}
        </Tag>
      ),
    },
    {
      title: formatMessage({
        id: 'pages.devices.detail.vcDiffCurrent',
        defaultMessage: 'Current',
      }),
      key: 'current',
      ellipsis: true,
      render: (_: unknown, row: DiffRow) => (
        <Typography.Text
          type={row.status === 'REMOVED' ? 'danger' : undefined}
          code
        >
          {formatCellValue(row.current)}
        </Typography.Text>
      ),
    },
    {
      title: formatMessage({
        id: 'pages.devices.detail.vcDiffOther',
        defaultMessage: 'Version',
      }),
      key: 'other',
      ellipsis: true,
      render: (_: unknown, row: DiffRow) => (
        <Typography.Text
          type={row.status === 'ADDED' ? 'success' : undefined}
          code
        >
          {formatCellValue(row.other)}
        </Typography.Text>
      ),
    },
  ];

  return (
    <Modal
      open={!!version}
      title={formatMessage(
        {
          id: 'pages.devices.detail.vcDiffTitle',
          defaultMessage: 'Compare with version: {name}',
        },
        { name: version?.name ?? version?.id ?? '' },
      )}
      onCancel={onClose}
      footer={null}
      width={860}
      destroyOnHidden
    >
      <Space className="mb-2" wrap>
        <Tag>
          {formatMessage(
            {
              id: 'pages.devices.detail.vcDiffCount',
              defaultMessage: '{count} difference(s)',
            },
            {
              count: allRows.filter((row) => row.status !== 'SAME').length,
            },
          )}
        </Tag>
        <Checkbox
          checked={showAll}
          onChange={(event) => setShowAll(event.target.checked)}
        >
          {formatMessage({
            id: 'pages.devices.detail.vcDiffShowAll',
            defaultMessage: 'Show identical fields',
          })}
        </Checkbox>
      </Space>
      {diffQuery.isError && (
        <Alert
          type="error"
          showIcon
          message={formatMessage({
            id: 'pages.devices.detail.vcDiffLoadFailed',
            defaultMessage: 'Failed to load the diff',
          })}
          description={serverErrorText(diffQuery.error)}
        />
      )}
      <Table<DiffRow>
        rowKey="path"
        size="small"
        columns={columns}
        dataSource={rows}
        loading={diffQuery.isPending}
        pagination={{ pageSize: 20, showSizeChanger: false }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.devices.detail.vcDiffNoDifferences',
            defaultMessage: 'No differences',
          }),
        }}
      />
    </Modal>
  );
}

interface RestoreFormValues {
  loadCredentials: boolean;
  loadAttributes: boolean;
  loadRelations: boolean;
  loadCalculatedFields: boolean;
}

const RESTORE_FLAGS: Array<{
  name: keyof RestoreFormValues;
  info: keyof EntityDataInfo;
  labelId: string;
  defaultMessage: string;
}> = [
  {
    name: 'loadCredentials',
    info: 'hasCredentials',
    labelId: 'pages.devices.detail.vcLoadCredentials',
    defaultMessage: 'Load credentials',
  },
  {
    name: 'loadAttributes',
    info: 'hasAttributes',
    labelId: 'pages.devices.detail.vcLoadAttributes',
    defaultMessage: 'Load attributes',
  },
  {
    name: 'loadRelations',
    info: 'hasRelations',
    labelId: 'pages.devices.detail.vcLoadRelations',
    defaultMessage: 'Load relations',
  },
  {
    name: 'loadCalculatedFields',
    info: 'hasCalculatedFields',
    labelId: 'pages.devices.detail.vcLoadCalculatedFields',
    defaultMessage: 'Load calculated fields',
  },
];

/** Restore dialog: per-family checkboxes gated by the version's data flags. */
function RestoreModal({
  version,
  entityId,
  onClose,
}: {
  version: EntityVersion | null;
  entityId: EntityId;
  onClose: () => void;
}) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<RestoreFormValues>();

  const infoQuery = useQuery({
    queryKey: ['vc-info', entityId.id, version?.id],
    queryFn: () => getEntityDataInfo(version?.id as string, entityId),
    enabled: !!version,
  });
  const info: EntityDataInfo | undefined = infoQuery.data;

  useEffect(() => {
    if (info) {
      form.setFieldsValue({
        loadCredentials: info.hasCredentials ?? false,
        loadAttributes: info.hasAttributes ?? false,
        loadRelations: info.hasRelations ?? false,
        loadCalculatedFields: info.hasCalculatedFields ?? false,
      });
    }
  }, [info, form]);

  const restoreMutation = useMutation({
    mutationFn: async (values: RestoreFormValues) => {
      const requestId = await loadEntitiesVersion({
        type: 'SINGLE_ENTITY',
        versionId: version?.id as string,
        externalEntityId: entityId,
        config: values,
      });
      return awaitVersionLoadResult(requestId);
    },
    onSuccess: (result: VersionLoadResult) => {
      const totals = (result.result ?? []).reduce(
        (acc, entry) => ({
          created: acc.created + (entry.created ?? 0),
          updated: acc.updated + (entry.updated ?? 0),
          deleted: acc.deleted + (entry.deleted ?? 0),
        }),
        { created: 0, updated: 0, deleted: 0 },
      );
      if (result.error) {
        void message.error(String(result.error.message ?? result.error.type));
      } else {
        void message.success(
          formatMessage(
            {
              id: 'pages.devices.detail.vcRestoreDone',
              defaultMessage:
                'Version restored (created {created}, updated {updated}, deleted {deleted}).',
            },
            totals,
          ),
        );
      }
      onClose();
      // Restore can rewrite the device, attributes, relations and calculated
      // fields at once — refresh everything this session has cached.
      void queryClient.invalidateQueries();
    },
    onError: (error) => void message.error(serverErrorText(error)),
  });

  return (
    <Modal
      open={!!version}
      title={formatMessage(
        {
          id: 'pages.devices.detail.vcRestoreTitle',
          defaultMessage: 'Restore device from version: {name}',
        },
        { name: version?.name ?? version?.id ?? '' },
      )}
      onOk={() => form.submit()}
      onCancel={onClose}
      confirmLoading={restoreMutation.isPending}
      okText={formatMessage({
        id: 'pages.devices.detail.vcRestoreOk',
        defaultMessage: 'Restore',
      })}
      okButtonProps={{ danger: true }}
      cancelText={formatMessage({
        id: 'pages.devices.detail.cancel',
        defaultMessage: 'Cancel',
      })}
      destroyOnHidden
    >
      <Alert
        className="!mb-3"
        type="warning"
        showIcon
        message={formatMessage({
          id: 'pages.devices.detail.vcRestoreWarning',
          defaultMessage:
            'Restoring overwrites the current device data with the selected version.',
        })}
      />
      {infoQuery.isPending && <Spin />}
      {infoQuery.isError && (
        <Alert
          type="error"
          showIcon
          message={formatMessage({
            id: 'pages.devices.detail.vcInfoLoadFailed',
            defaultMessage: 'Failed to load the versioned data info',
          })}
          description={serverErrorText(infoQuery.error)}
        />
      )}
      {info && (
        <Form<RestoreFormValues>
          form={form}
          layout="vertical"
          className="pt-2"
          onFinish={(values) =>
            // Unmounted flags (family absent in that version) stay explicit
            // false in the wire payload.
            restoreMutation.mutate({
              loadCredentials: values.loadCredentials ?? false,
              loadAttributes: values.loadAttributes ?? false,
              loadRelations: values.loadRelations ?? false,
              loadCalculatedFields: values.loadCalculatedFields ?? false,
            })
          }
        >
          <Flex vertical gap={8}>
            {RESTORE_FLAGS.map((flag) =>
              info[flag.info] ? (
                <FlagCheckbox
                  key={flag.name}
                  name={flag.name}
                  labelId={flag.labelId}
                  defaultMessage={flag.defaultMessage}
                />
              ) : null,
            )}
          </Flex>
        </Form>
      )}
    </Modal>
  );
}

interface AutoCommitFormValues {
  enabled: boolean;
  branch?: string;
  saveCredentials: boolean;
  saveAttributes: boolean;
  saveRelations: boolean;
  saveCalculatedFields: boolean;
}

/**
 * Auto-commit settings for the panel's entity type (the tenant-wide store
 * keeps other entity types' entries; this card only reads/writes its own
 * entry, and deletes the whole settings object once the map would be empty).
 */
function AutoCommitCard({
  branches,
  entityType,
}: {
  branches: Array<BranchInfo>;
  entityType: EntityType;
}) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<AutoCommitFormValues>();

  const settingsQuery = useQuery({
    queryKey: ['vc-autocommit'],
    queryFn: getAutoCommitSettings,
  });
  const settings = settingsQuery.data ?? {};
  const domainEntry = settings[entityType];

  useEffect(() => {
    form.setFieldsValue({
      enabled: !!domainEntry,
      branch: domainEntry?.branch,
      saveCredentials: domainEntry?.saveCredentials ?? true,
      saveAttributes: domainEntry?.saveAttributes ?? true,
      saveRelations: domainEntry?.saveRelations ?? true,
      saveCalculatedFields: domainEntry?.saveCalculatedFields ?? true,
    });
  }, [domainEntry, form]);

  const saveMutation = useMutation({
    mutationFn: async (values: AutoCommitFormValues) => {
      const { [entityType]: _removed, ...others } = settings;
      if (!values.enabled) {
        if (Object.keys(others).length > 0) {
          return saveAutoCommitSettings(others);
        }
        return deleteAutoCommitSettings();
      }
      return saveAutoCommitSettings({
        ...others,
        [entityType]: {
          branch: values.branch,
          saveCredentials: values.saveCredentials,
          saveAttributes: values.saveAttributes,
          saveRelations: values.saveRelations,
          saveCalculatedFields: values.saveCalculatedFields,
        },
      });
    },
    onSuccess: () => {
      void message.success(
        formatMessage({
          id: 'pages.devices.detail.vcAutoCommitSaved',
          defaultMessage: 'Auto-commit settings saved.',
        }),
      );
      void queryClient.invalidateQueries({ queryKey: ['vc-autocommit'] });
    },
    onError: (error) => void message.error(serverErrorText(error)),
  });

  const enabled = Form.useWatch('enabled', form);

  return (
    <Card
      size="small"
      title={formatMessage({
        id: 'pages.devices.detail.vcAutoCommitTitle',
        defaultMessage: 'Auto-commit settings',
      })}
    >
      {settingsQuery.isError && (
        <Alert
          className="!mb-3"
          type="error"
          showIcon
          message={formatMessage({
            id: 'pages.devices.detail.vcAutoCommitLoadFailed',
            defaultMessage: 'Failed to load auto-commit settings',
          })}
          description={serverErrorText(settingsQuery.error)}
        />
      )}
      <Form<AutoCommitFormValues>
        form={form}
        layout="vertical"
        onFinish={(values) => saveMutation.mutate(values)}
      >
        <Form.Item name="enabled" valuePropName="checked" noStyle>
          <Checkbox>
            {formatMessage({
              id: 'pages.devices.detail.vcAutoCommitEnable',
              defaultMessage: 'Auto-commit this device on save',
            })}
          </Checkbox>
        </Form.Item>
        {enabled && (
          <Flex vertical gap={8} className="pt-3">
            <Form.Item
              name="branch"
              label={formatMessage({
                id: 'pages.devices.detail.vcBranch',
                defaultMessage: 'Branch',
              })}
              className="!mb-0"
            >
              <AutoComplete
                allowClear
                style={{ maxWidth: 240 }}
                placeholder={formatMessage({
                  id: 'pages.devices.detail.vcAutoCommitDefaultBranch',
                  defaultMessage: 'Repository default branch',
                })}
                options={branches.map((entry: BranchInfo) => ({
                  value: entry.name,
                  label: entry.name,
                }))}
              />
            </Form.Item>
            <Space wrap>
              <Form.Item name="saveCredentials" valuePropName="checked" noStyle>
                <Checkbox>
                  {formatMessage({
                    id: 'pages.devices.detail.vcSaveCredentials',
                    defaultMessage: 'Export credentials',
                  })}
                </Checkbox>
              </Form.Item>
              <Form.Item name="saveAttributes" valuePropName="checked" noStyle>
                <Checkbox>
                  {formatMessage({
                    id: 'pages.devices.detail.vcSaveAttributes',
                    defaultMessage: 'Export attributes',
                  })}
                </Checkbox>
              </Form.Item>
              <Form.Item name="saveRelations" valuePropName="checked" noStyle>
                <Checkbox>
                  {formatMessage({
                    id: 'pages.devices.detail.vcSaveRelations',
                    defaultMessage: 'Export relations',
                  })}
                </Checkbox>
              </Form.Item>
              <Form.Item
                name="saveCalculatedFields"
                valuePropName="checked"
                noStyle
              >
                <Checkbox>
                  {formatMessage({
                    id: 'pages.devices.detail.vcSaveCalculatedFields',
                    defaultMessage: 'Export calculated fields',
                  })}
                </Checkbox>
              </Form.Item>
            </Space>
          </Flex>
        )}
        <Button
          type="primary"
          htmlType="submit"
          loading={saveMutation.isPending}
          className="mt-3"
        >
          {formatMessage({
            id: 'pages.devices.detail.save',
            defaultMessage: 'Save',
          })}
        </Button>
      </Form>
    </Card>
  );
}
