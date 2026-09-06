/**
 * Repository-wide versions table (M14 wave-6, R20, spec 6.2-3) — the
 * plural mode of the ui-ngx entity-versions-table: branch selector
 * (selection mode — existing branches only), 400ms-debounced text search,
 * timestamp/id/name/author columns, 10/20/30 pagination, and the
 * read-only gate on the create action. The id column truncates to the
 * first 7 chars (R20) with a copy-the-full-hash affordance (ngx
 * tb-copy-button).
 *
 * The single-entity mode of ngx's shared table stays in the v1 detail
 * panel (DiffModal/RestoreModal accepted shape, R05/R21) — this table is
 * the standalone-page face only.
 */
import {
  CloudUploadOutlined,
  ReloadOutlined,
  UndoOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Input, Space, Table, Tooltip, Typography } from 'antd';
import type { ColumnsType, TablePaginationConfig } from 'antd/es/table';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import type { BranchInfo, EntityVersion } from '@/services/tb/version-control';
import { listBranches, listVersions } from '@/services/tb/version-control';
import type { PageLink } from '@/types/tb';
import BranchSelect from './branch-select';

type SortDirection = 'ASC' | 'DESC';

export default function VersionsTable({
  readOnly,
  onCreateVersion,
  onRestore,
  onBranchChange,
  refreshSignal = 0,
}: {
  /** Repository read-only → create disabled (restore stays available). */
  readOnly: boolean;
  onCreateVersion: () => void;
  onRestore: (version: EntityVersion) => void;
  /** Reports the working branch (the create modal's starting value). */
  onBranchChange?: (branch: string) => void;
  /** Bump to refetch (e.g. after a commit/restore finished). */
  refreshSignal?: number;
}) {
  const { formatMessage } = useIntl();

  const branchesQuery = useQuery({
    queryKey: ['vc-branches'],
    queryFn: listBranches,
  });
  const branches: Array<BranchInfo> = branchesQuery.data ?? [];

  const [branch, setBranch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [direction, setDirection] = useState<SortDirection>('DESC');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // Default the working branch to the repo's default, else the first entry.
  useEffect(() => {
    if (!branch && branches.length > 0) {
      const fallback =
        branches.find((entry) => entry.default)?.name ?? branches[0].name;
      setBranch(fallback);
      onBranchChange?.(fallback);
    }
  }, [branch, branches, onBranchChange]);

  // ngx debounceTime(400) on the search box.
  useEffect(() => {
    const timer = setTimeout(() => {
      const next = searchInput.trim();
      setSearch((previous) => {
        if (previous !== next) {
          setPage(1);
        }
        return next;
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const versionsQuery = useQuery({
    queryKey: [
      'vc-versions-tenant',
      branch,
      page,
      pageSize,
      direction,
      search,
      refreshSignal,
    ],
    queryFn: () => {
      const pageLink: PageLink = {
        pageSize,
        page: page - 1,
        textSearch: search || undefined,
        sortOrder: { property: 'timestamp', direction },
      };
      return listVersions(branch, pageLink);
    },
    enabled: !!branch,
    placeholderData: (previous) => previous,
  });

  const columns: ColumnsType<EntityVersion> = useMemo(
    () => [
      {
        title: formatMessage({
          id: 'pages.versionControl.versions.createdTime',
          defaultMessage: 'Created time',
        }),
        dataIndex: 'timestamp',
        width: 180,
        // The only sortable column server-side (service-layer JSDoc).
        sorter: true,
        sortDirections: ['descend', 'ascend'],
        sortOrder: direction === 'DESC' ? 'descend' : 'ascend',
        render: (ts: number) => dayjs(ts).format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        title: formatMessage({
          id: 'pages.versionControl.versions.versionId',
          defaultMessage: 'Version id',
        }),
        dataIndex: 'id',
        width: 150,
        render: (id: string) => (
          <Typography.Text copyable={{ text: id, tooltips: false }}>
            {id.slice(0, 7)}
          </Typography.Text>
        ),
      },
      {
        title: formatMessage({
          id: 'pages.versionControl.versions.versionName',
          defaultMessage: 'Version name',
        }),
        dataIndex: 'name',
        ellipsis: true,
      },
      {
        title: formatMessage({
          id: 'pages.versionControl.versions.author',
          defaultMessage: 'Author',
        }),
        dataIndex: 'author',
        ellipsis: true,
        width: 220,
      },
      {
        title: formatMessage({
          id: 'pages.versionControl.versions.actions',
          defaultMessage: 'Actions',
        }),
        key: 'actions',
        width: 70,
        render: (_: unknown, version: EntityVersion) => (
          <Tooltip
            title={formatMessage({
              id: 'pages.versionControl.restoreVersion',
              defaultMessage: 'Restore version',
            })}
          >
            <Button
              type="text"
              size="small"
              icon={<UndoOutlined />}
              aria-label={formatMessage({
                id: 'pages.versionControl.restoreVersion',
                defaultMessage: 'Restore version',
              })}
              onClick={() => onRestore(version)}
            />
          </Tooltip>
        ),
      },
    ],
    [direction, formatMessage, onRestore],
  );

  const onChangeTable = (
    pagination: TablePaginationConfig,
    _filters: unknown,
    sorter: unknown,
  ) => {
    setPage(pagination.current ?? 1);
    setPageSize(pagination.pageSize ?? 10);
    const order = sorter as { order?: 'ascend' | 'descend' } | null;
    setDirection(order?.order === 'ascend' ? 'ASC' : 'DESC');
  };

  const total = versionsQuery.data?.totalElements ?? 0;

  return (
    <div className="flex flex-col gap-3">
      <Space wrap align="center">
        <Typography.Title level={4} className="!mb-0">
          {formatMessage({
            id: 'pages.versionControl.versions.title',
            defaultMessage: 'Versions',
          })}
        </Typography.Title>
        <BranchSelect
          branches={branches}
          value={branch}
          onChange={(next) => {
            setBranch(next ?? '');
            setPage(1);
            onBranchChange?.(next ?? '');
          }}
          disabled={versionsQuery.isFetching}
          placeholder={formatMessage({
            id: 'pages.versionControl.selectBranch',
            defaultMessage: 'Select branch',
          })}
        />
        <div className="flex-1" />
        <Input
          allowClear
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={formatMessage({
            id: 'pages.versionControl.versions.search',
            defaultMessage: 'Search versions',
          })}
          className="w-56"
        />
        <Button
          icon={<ReloadOutlined />}
          onClick={() => void versionsQuery.refetch()}
        />
        <Button
          type="primary"
          icon={<CloudUploadOutlined />}
          disabled={readOnly}
          onClick={onCreateVersion}
        >
          {formatMessage({
            id: 'pages.versionControl.complexCreate.title',
            defaultMessage: 'Create entities version',
          })}
        </Button>
      </Space>

      {versionsQuery.isError && (
        <Alert
          type="error"
          showIcon
          message={formatMessage({
            id: 'pages.versionControl.versions.loadFailed',
            defaultMessage: 'Failed to load versions',
          })}
          description={serverErrorText(versionsQuery.error)}
        />
      )}

      <Table<EntityVersion>
        rowKey={(record) => record.id}
        size="small"
        columns={columns}
        dataSource={versionsQuery.data?.data ?? []}
        loading={versionsQuery.isPending || branchesQuery.isPending}
        onChange={onChangeTable}
        pagination={{
          current: page,
          pageSize,
          total,
          pageSizeOptions: [10, 20, 30],
          showSizeChanger: true,
          showTotal: (count) =>
            formatMessage(
              {
                id: 'pages.versionControl.versions.total',
                defaultMessage: '{total} items',
              },
              { total: count },
            ),
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.versionControl.versions.empty',
            defaultMessage: 'No versions found',
          }),
        }}
      />
    </div>
  );
}
