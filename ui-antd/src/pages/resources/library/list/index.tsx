/**
 * Resources file library list page (M11 wave-1A, spec §3.5; ui-ngx
 * resources-library-table-config parity).
 *
 * Wave1 rules: ProTable renders useQuery data (no `request` prop); every
 * mutation success invalidates the query; server pages are 0-based with an
 * explicit sort; page/sort/search/type filter live in the URL.
 *
 * Delete flow (spec §1): delete with force=false; a 400 carrying
 * references opens the shared ResourcesInUseModal; confirming re-deletes
 * with force=true. System resources (NULL tenant) are read-only for
 * TENANT admins; SYS_ADMIN manages everything.
 */
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  InboxOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { UploadFile } from 'antd';
import {
  Alert,
  App,
  Button,
  Dropdown,
  Form,
  Input,
  Modal,
  Select,
  Space,
  type TableProps,
  Tag,
  Typography,
  Upload,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import { referencesToEntries } from '@/components/resources/reference-entries';
import {
  type ResourceInUseItem,
  ResourcesInUseModal,
} from '@/components/resources/resources-in-use';
import { BatchProgressModal } from '@/components/shared/BatchProgressModal';
import { useAuthority } from '@/components/shared/use-authority';
import { useBatchRun } from '@/components/shared/use-batch-run';
import {
  deleteResource,
  downloadResource,
  getResources,
  ResourceReferencedError,
  updateResourceInfo,
  uploadResources,
} from '@/services/tb/resource';
import type { TbResourceInfo } from '@/types/tb/resource';
import { ResourceType } from '@/types/tb/resource';
import {
  LIBRARY_RESOURCE_TYPES,
  toLibraryFilter,
  toPageLink,
  useLibraryUrlState,
} from './url-state';

const LIBRARY_QUERY_KEY = ['resources', 'library'] as const;

/** Table column key -> sortable server property. */
const SORTABLE_COLUMNS: Record<string, string> = {
  createdTime: 'createdTime',
  title: 'title',
};

const SEARCH_DEBOUNCE_MS = 400;

/** TB's null-tenant UUID — a NULL tenant id marks a system resource. */
const NULL_UUID = '13814000-1dd2-11b2-8080-808080808080';

const TYPE_NAME_KEYS: Record<ResourceType, string> = {
  [ResourceType.LWM2M_MODEL]: 'pages.resources.library.type.lwm2mModel',
  [ResourceType.PKCS_12]: 'pages.resources.library.type.pkcs12',
  [ResourceType.JKS]: 'pages.resources.library.type.jks',
  [ResourceType.GENERAL]: 'pages.resources.library.type.general',
  [ResourceType.JS_MODULE]: 'pages.resources.library.type.jsModule',
};

export default function LibraryListPage() {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { state: urlState, patch } = useLibraryUrlState();
  const { authority } = useAuthority();
  const isSysAdmin = authority === 'SYS_ADMIN';

  // ---- text search (server-side, debounced; URL carries the committed value)
  const [searchInput, setSearchInput] = useState(urlState.textSearch);
  useEffect(() => {
    setSearchInput(urlState.textSearch);
  }, [urlState.textSearch]);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      const next = searchInput.trim();
      if (next !== urlState.textSearch) {
        patch({ textSearch: next, page: 1 });
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(searchTimer.current);
  }, [searchInput, patch, urlState.textSearch]);

  // ---- the list itself
  const resourcesQuery = useQuery({
    queryKey: [
      ...LIBRARY_QUERY_KEY,
      urlState.page,
      urlState.pageSize,
      urlState.sortProperty,
      urlState.sortDirection,
      urlState.textSearch,
      urlState.resourceType,
    ],
    queryFn: () =>
      getResources(toPageLink(urlState), toLibraryFilter(urlState)),
    placeholderData: keepPreviousData,
  });
  const resources: Array<TbResourceInfo> = resourcesQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: LIBRARY_QUERY_KEY });

  // ---- selection & dialogs
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const selectedResources = resources.filter((resource) =>
    selectedRowKeys.includes(resource.id.id),
  );

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<Array<UploadFile>>([]);
  const [editTarget, setEditTarget] = useState<TbResourceInfo | null>(null);
  const [editForm] = Form.useForm<{ title: string }>();
  const [inUseItems, setInUseItems] = useState<Array<ResourceInUseItem>>([]);
  const [inUseMultiple, setInUseMultiple] = useState(false);

  const batch = useBatchRun();
  const [batchOpen, setBatchOpen] = useState(false);

  const isEditable = (resource: TbResourceInfo): boolean => {
    if (authority === 'TENANT_ADMIN') {
      return !!resource.tenantId && resource.tenantId.id !== NULL_UUID;
    }
    return isSysAdmin;
  };

  const typeName = (type: ResourceType): string =>
    formatMessage({ id: TYPE_NAME_KEYS[type], defaultMessage: type });

  // ---- downloads (blob → object URL, named after the resource file)
  const saveBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const download = async (resource: TbResourceInfo) => {
    try {
      const blob = await downloadResource(resource.id.id);
      saveBlob(blob, resource.fileName || resource.title || 'resource');
    } catch (error) {
      void message.error(serverErrorText(error));
    }
  };

  // ---- delete flows (single + batch share the referenced-dialog branch)
  const confirmForceDelete = (items: Array<ResourceInUseItem>) => {
    if (items.length === 1) {
      void (async () => {
        try {
          await deleteResource(items[0].id, true);
          setInUseItems([]);
          setSelectedRowKeys([]);
          void message.success(
            formatMessage({
              id: 'pages.resources.library.toastDeleted',
              defaultMessage: 'Resource deleted.',
            }),
          );
          void invalidate();
        } catch (error) {
          void message.error(serverErrorText(error));
        }
      })();
      return;
    }
    // Batch force delete: visible per-item progress (spec §1 batch rule).
    void (async () => {
      setBatchOpen(true);
      const summary = await batch.run(
        items,
        (item) => item.title,
        (item) => deleteResource(item.id, true),
      );
      setSelectedRowKeys([]);
      setInUseItems([]);
      void invalidate();
      void message.success(
        formatMessage(
          {
            id: 'pages.resources.library.batchResult',
            defaultMessage: '{ok} succeeded, {fail} failed.',
          },
          { ok: summary.ok, fail: summary.failed },
        ),
      );
    })();
  };

  const deleteWithFlow = async (
    targets: Array<TbResourceInfo>,
    onDeleted: () => void,
  ) => {
    const referenced: Array<ResourceInUseItem> = [];
    let anyDeleted = false;
    let otherError: unknown;
    for (const resource of targets) {
      try {
        await deleteResource(resource.id.id, false);
        anyDeleted = true;
      } catch (error) {
        if (error instanceof ResourceReferencedError) {
          referenced.push({
            id: resource.id.id,
            title: resource.title ?? resource.id.id,
            references: referencesToEntries(error.references, formatMessage),
          });
        } else {
          otherError = otherError ?? error;
        }
      }
    }
    if (anyDeleted) {
      onDeleted();
      void invalidate();
    }
    if (referenced.length > 0) {
      setInUseMultiple(referenced.length > 1);
      setInUseItems(referenced);
      return;
    }
    if (otherError) {
      void message.error(serverErrorText(otherError));
      return;
    }
    if (anyDeleted && targets.length === 1) {
      void message.success(
        formatMessage({
          id: 'pages.resources.library.toastDeleted',
          defaultMessage: 'Resource deleted.',
        }),
      );
    }
  };

  const confirmDeleteOne = (resource: TbResourceInfo) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.resources.library.deleteOneTitle',
          defaultMessage: "Delete the resource '{title}'?",
        },
        { title: resource.title ?? resource.id.id },
      ),
      content: formatMessage({
        id: 'pages.resources.library.deleteOneText',
        defaultMessage:
          'Be careful, after the confirmation the resource will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.resources.library.delete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.resources.library.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => deleteWithFlow([resource], () => setSelectedRowKeys([])),
    });
  };

  const confirmDeleteSelected = () => {
    if (selectedResources.length === 0) {
      return;
    }
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.resources.library.deleteManyTitle',
          defaultMessage:
            'Delete {count, plural, =1 {1 resource} other {# resources}}?',
        },
        { count: selectedResources.length },
      ),
      content: formatMessage({
        id: 'pages.resources.library.deleteManyText',
        defaultMessage: 'This cannot be undone.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.resources.library.delete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.resources.library.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () =>
        deleteWithFlow(selectedResources, () => setSelectedRowKeys([])),
    });
  };

  // ---- multi-file upload (batched server-side by uploadResources)
  const uploadMutation = useMutation({
    mutationFn: async () => {
      const requests = uploadFiles
        .flatMap((file) => (file.originFileObj ? [file.originFileObj] : []))
        .map((file) => ({
          file,
          // ui-ngx resources-library derives the title from the file name
          // (extension stripped).
          title: file.name.replace(/\.[^.]+$/, ''),
          resourceType: urlState.resourceType ?? ResourceType.GENERAL,
        }));
      const settled = await uploadResources(requests);
      const failed = settled.filter(
        (entry) => entry.status === 'rejected',
      ).length;
      return { ok: settled.length - failed, failed };
    },
    onSuccess: ({ ok, failed }) => {
      setUploadOpen(false);
      setUploadFiles([]);
      void invalidate();
      if (failed > 0) {
        void message.warning(
          formatMessage(
            {
              id: 'pages.resources.library.batchResult',
              defaultMessage: '{ok} succeeded, {fail} failed.',
            },
            { ok, failed },
          ),
        );
      } else {
        void message.success(
          formatMessage(
            {
              id: 'pages.resources.library.batchResult',
              defaultMessage: '{ok} succeeded, {fail} failed.',
            },
            { ok, failed },
          ),
        );
      }
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  // ---- edit info (title only — type/fileName are immutable upstream)
  const openEdit = (resource: TbResourceInfo) => {
    setEditTarget(resource);
    editForm.setFieldsValue({ title: resource.title ?? '' });
  };

  const saveEdit = async () => {
    const { title } = await editForm.validateFields();
    if (!editTarget) {
      return;
    }
    try {
      await updateResourceInfo(editTarget.id.id, { title });
      setEditTarget(null);
      void message.success(
        formatMessage({
          id: 'pages.resources.library.toastUpdated',
          defaultMessage: 'Resource info updated.',
        }),
      );
      void invalidate();
    } catch (error) {
      void message.error(serverErrorText(error));
    }
  };

  // ---- columns
  // biome-ignore lint/correctness/useExhaustiveDependencies: row-action handlers re-create per render by design
  const columns: ProColumns<TbResourceInfo>[] = useMemo(() => {
    const cols: ProColumns<TbResourceInfo>[] = [
      {
        title: formatMessage({
          id: 'pages.resources.library.createdTime',
          defaultMessage: 'Created time',
        }),
        dataIndex: 'createdTime',
        width: 170,
        sorter: true,
        sortOrder: sortOrderFor('createdTime'),
        render: (_, record) =>
          dayjs(record.createdTime).format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        title: formatMessage({
          id: 'pages.resources.library.title',
          defaultMessage: 'Title',
        }),
        dataIndex: 'title',
        sorter: true,
        sortOrder: sortOrderFor('title'),
      },
      {
        title: formatMessage({
          id: 'pages.resources.library.resourceType',
          defaultMessage: 'Resource type',
        }),
        dataIndex: 'resourceType',
        render: (_, record) =>
          record.resourceType ? typeName(record.resourceType) : '-',
      },
      {
        title: formatMessage({
          id: 'pages.resources.library.system',
          defaultMessage: 'System',
        }),
        dataIndex: 'system',
        width: 90,
        render: (_, record) =>
          record.tenantId?.id === NULL_UUID ? (
            <Tag color="blue">
              {formatMessage({
                id: 'pages.resources.library.system',
                defaultMessage: 'System',
              })}
            </Tag>
          ) : (
            '-'
          ),
      },
    ];
    cols.push({
      valueType: 'option',
      width: 150,
      fixed: 'right',
      render: (_, record) =>
        [
          <Button
            key="download"
            type="text"
            size="small"
            icon={<DownloadOutlined />}
            title={formatMessage({
              id: 'pages.resources.library.download',
              defaultMessage: 'Download',
            })}
            onClick={() => void download(record)}
          />,
          isEditable(record) ? (
            <Dropdown
              key="more"
              trigger={['click']}
              menu={{
                items: [
                  {
                    key: 'edit',
                    label: formatMessage({
                      id: 'pages.resources.library.edit',
                      defaultMessage: 'Edit info',
                    }),
                    icon: <EditOutlined />,
                    onClick: () => openEdit(record),
                  },
                  {
                    key: 'delete',
                    danger: true,
                    icon: <DeleteOutlined />,
                    label: formatMessage({
                      id: 'pages.resources.library.delete',
                      defaultMessage: 'Delete',
                    }),
                    onClick: () => confirmDeleteOne(record),
                  },
                ],
              }}
            >
              <Button type="text" size="small" icon={<MoreOutlined />} />
            </Dropdown>
          ) : null,
        ].filter(Boolean),
    });
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formatMessage,
    authority,
    urlState.sortProperty,
    urlState.sortDirection,
    resourcesQuery.data,
  ]);

  function sortOrderFor(property: string): 'ascend' | 'descend' | undefined {
    if (urlState.sortProperty !== property) {
      return undefined;
    }
    return urlState.sortDirection === 'ASC' ? 'ascend' : 'descend';
  }

  const onTableChange: TableProps<TbResourceInfo>['onChange'] = (
    pagination,
    _filters,
    sorter,
  ) => {
    const sort = Array.isArray(sorter) ? sorter[0] : sorter;
    const property = sort?.field
      ? SORTABLE_COLUMNS[sort.field as string]
      : undefined;
    if (property && sort.order) {
      patch({
        sortProperty: property,
        sortDirection: sort.order === 'ascend' ? 'ASC' : 'DESC',
        page: 1,
      });
    } else if (!sort?.order) {
      patch({ sortProperty: 'createdTime', sortDirection: 'DESC', page: 1 });
    }
    if (
      pagination.current &&
      pagination.pageSize &&
      (pagination.current !== urlState.page ||
        pagination.pageSize !== urlState.pageSize)
    ) {
      patch({ page: pagination.current, pageSize: pagination.pageSize });
    }
  };

  return (
    <PageContainer
      title={formatMessage({
        id: 'menu.resources.library',
        defaultMessage: 'Resources library',
      })}
      extra={
        <div className="flex flex-wrap items-center gap-3">
          <Input.Search
            allowClear
            className="w-64"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={formatMessage({
              id: 'pages.resources.library.search',
              defaultMessage: 'Search resources',
            })}
          />
          <Select
            allowClear
            className="w-48"
            value={urlState.resourceType}
            placeholder={formatMessage({
              id: 'pages.resources.library.typePlaceholder',
              defaultMessage: 'All resource types',
            })}
            options={LIBRARY_RESOURCE_TYPES.map((type) => ({
              label: typeName(type),
              value: type,
            }))}
            onChange={(value) =>
              patch({
                resourceType: value ?? undefined,
                page: 1,
              })
            }
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void resourcesQuery.refetch()}
          >
            {formatMessage({
              id: 'pages.resources.library.refresh',
              defaultMessage: 'Refresh',
            })}
          </Button>
          <div className="flex-1" />
          <Space>
            {selectedResources.length > 0 && (
              <>
                <Typography.Text type="secondary">
                  {formatMessage(
                    {
                      id: 'pages.resources.library.selectedCount',
                      defaultMessage: '{count} selected',
                    },
                    { count: selectedResources.length },
                  )}
                </Typography.Text>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={confirmDeleteSelected}
                >
                  {formatMessage({
                    id: 'pages.resources.library.batchDelete',
                    defaultMessage: 'Delete selected',
                  })}
                </Button>
              </>
            )}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setUploadOpen(true)}
            >
              {formatMessage({
                id: 'pages.resources.library.upload',
                defaultMessage: 'Upload resources',
              })}
            </Button>
          </Space>
        </div>
      }
    >
      {resourcesQuery.isError && (
        <Alert
          type="error"
          showIcon
          title={formatMessage({
            id: 'pages.resources.library.loadFailed',
            defaultMessage: 'Failed to load resources',
          })}
          description={serverErrorText(resourcesQuery.error)}
        />
      )}

      <ProTable<TbResourceInfo>
        rowKey={(record) => record.id.id}
        tableAlertRender={false}
        tableAlertOptionRender={false}
        columns={columns}
        dataSource={resources}
        loading={resourcesQuery.isPending}
        search={false}
        options={false}
        onChange={onTableChange}
        pagination={{
          current: urlState.page,
          pageSize: urlState.pageSize,
          total: resourcesQuery.data?.totalElements ?? 0,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 30, 50, 100],
          showTotal: (total) =>
            formatMessage(
              {
                id: 'pages.resources.library.total',
                defaultMessage: '{count} total',
              },
              { count: total },
            ),
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.resources.library.empty',
            defaultMessage: 'No resources',
          }),
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
          // System resources stay read-only for TENANT admins.
          getCheckboxProps: (record) => ({
            disabled: !isEditable(record),
          }),
        }}
      />

      <Modal
        open={uploadOpen}
        title={formatMessage({
          id: 'pages.resources.library.uploadTitle',
          defaultMessage: 'Upload files',
        })}
        okText={formatMessage({
          id: 'pages.resources.library.upload',
          defaultMessage: 'Upload resources',
        })}
        cancelText={formatMessage({
          id: 'pages.resources.library.cancel',
          defaultMessage: 'Cancel',
        })}
        okButtonProps={{
          disabled: uploadFiles.length === 0,
          loading: uploadMutation.isPending,
        }}
        onOk={() => uploadMutation.mutate()}
        onCancel={() => {
          setUploadOpen(false);
          setUploadFiles([]);
        }}
      >
        <Upload.Dragger
          multiple
          beforeUpload={() => false}
          fileList={uploadFiles}
          onChange={({ fileList }) => setUploadFiles(fileList)}
          accept=".xml,.p12,.pfx,.jks"
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">
            {formatMessage({
              id: 'pages.resources.library.uploadHint',
              defaultMessage: 'Click or drag files here to upload',
            })}
          </p>
        </Upload.Dragger>
      </Modal>

      <Modal
        open={!!editTarget}
        title={formatMessage({
          id: 'pages.resources.library.editTitle',
          defaultMessage: 'Edit resource info',
        })}
        okText={formatMessage({
          id: 'pages.resources.library.edit',
          defaultMessage: 'Edit info',
        })}
        cancelText={formatMessage({
          id: 'pages.resources.library.cancel',
          defaultMessage: 'Cancel',
        })}
        onOk={() => void saveEdit()}
        onCancel={() => setEditTarget(null)}
      >
        <Form form={editForm} layout="vertical">
          <Form.Item
            name="title"
            label={formatMessage({
              id: 'pages.resources.library.formTitle',
              defaultMessage: 'Title',
            })}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <ResourcesInUseModal
        open={inUseItems.length > 0}
        multiple={inUseMultiple}
        resources={inUseItems}
        title={formatMessage({
          id: inUseMultiple
            ? 'pages.resources.library.inUseManyTitle'
            : 'pages.resources.library.inUseTitle',
          defaultMessage: 'Resource is in use',
        })}
        message={formatMessage(
          {
            id: inUseMultiple
              ? 'pages.resources.library.inUseManyText'
              : 'pages.resources.library.inUseText',
            defaultMessage: 'The resource is still referenced.',
          },
          inUseMultiple ? {} : { title: inUseItems[0]?.title ?? '' },
        )}
        deleteText={formatMessage({
          id: 'pages.resources.library.deleteInUse',
          defaultMessage: 'Delete anyway',
        })}
        cancelText={formatMessage({
          id: 'pages.resources.library.cancel',
          defaultMessage: 'Cancel',
        })}
        titleColumnLabel={formatMessage({
          id: 'pages.resources.library.title',
          defaultMessage: 'Title',
        })}
        referencesColumnLabel={formatMessage({
          id: 'pages.resources.library.references',
          defaultMessage: 'References',
        })}
        onClose={() => setInUseItems([])}
        onConfirm={confirmForceDelete}
      />

      <BatchProgressModal
        open={batchOpen}
        state={batch.state}
        onClose={() => {
          setBatchOpen(false);
          batch.reset();
        }}
      />
    </PageContainer>
  );
}
