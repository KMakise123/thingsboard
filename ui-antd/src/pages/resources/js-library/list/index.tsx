/**
 * JavaScript library list page (M11 wave-1A, spec §3.4; ui-ngx
 * js-library-table-config parity).
 *
 * resourceType is pinned to JS_MODULE and the subType filter
 * (EXTENSION/MODULE) rides the URL. MODULE create/edit is a content text
 * editor — saving auto-derives the `title + '.js'` file name (ui-ngx
 * js-resource.component.ts:106-120); EXTENSION create/edit uploads a .js
 * file. Delete flows through the shared resources-in-use dialog; system
 * rows (NULL tenant) are read-only for TENANT admins.
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
import { CodeEditor } from '@/components/code-editor';
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
  getResourceById,
  getResources,
  jsModuleFileName,
  jsModuleUploadRequest,
  ResourceReferencedError,
  updateResourceData,
  updateResourceInfo,
  uploadResource,
} from '@/services/tb/resource';
import type { TbResourceInfo } from '@/types/tb/resource';
import { ResourceSubType, ResourceType } from '@/types/tb/resource';
import { base64ToString } from './js-content';
import {
  JS_RESOURCE_SUB_TYPES,
  toPageLink,
  useJsLibraryUrlState,
} from './url-state';

const JS_LIBRARY_QUERY_KEY = ['resources', 'js-library'] as const;

/** resourceType pinned on every fetch of this page (spec §3.4). */
const JS_MODULE = ResourceType.JS_MODULE;

/** Table column key -> sortable server property. */
const SORTABLE_COLUMNS: Record<string, string> = {
  createdTime: 'createdTime',
  title: 'title',
};

const SEARCH_DEBOUNCE_MS = 400;

/** TB's null-tenant UUID — a NULL tenant id marks a system resource. */
const NULL_UUID = '13814000-1dd2-11b2-8080-808080808080';

const SUB_TYPE_NAME_KEYS: Record<ResourceSubType, string> = {
  [ResourceSubType.EXTENSION]: 'pages.resources.jsLibrary.subType.extension',
  [ResourceSubType.MODULE]: 'pages.resources.jsLibrary.subType.module',
  [ResourceSubType.IMAGE]: 'pages.resources.jsLibrary.subType.extension',
  [ResourceSubType.SCADA_SYMBOL]: 'pages.resources.jsLibrary.subType.module',
};

interface ScriptFormValues {
  title: string;
  resourceSubType: ResourceSubType;
  /** Mirrors the content editor value so the submit reads one shape. */
  content?: string;
}

export default function JsLibraryListPage() {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { state: urlState, patch } = useJsLibraryUrlState();
  const { authority } = useAuthority();
  const isSysAdmin = authority === 'SYS_ADMIN';
  const [form] = Form.useForm<ScriptFormValues>();

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
      ...JS_LIBRARY_QUERY_KEY,
      urlState.page,
      urlState.pageSize,
      urlState.sortProperty,
      urlState.sortDirection,
      urlState.textSearch,
      urlState.resourceSubType,
    ],
    queryFn: () =>
      getResources(toPageLink(urlState), {
        resourceType: JS_MODULE,
        resourceSubType: urlState.resourceSubType,
      }),
    placeholderData: keepPreviousData,
  });
  const resources: Array<TbResourceInfo> = resourcesQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: JS_LIBRARY_QUERY_KEY });

  // ---- selection & dialogs
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const selectedResources = resources.filter((resource) =>
    selectedRowKeys.includes(resource.id.id),
  );

  const [editorOpen, setEditorOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TbResourceInfo | null>(null);
  const [editorLoading, setEditorLoading] = useState(false);
  const [content, setContent] = useState('');
  const [uploadedFile, setUploadedFile] = useState<UploadFile | null>(null);
  const [saving, setSaving] = useState(false);
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

  const subTypeName = (subType: ResourceSubType): string =>
    formatMessage({
      id: SUB_TYPE_NAME_KEYS[subType],
      defaultMessage: subType,
    });

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
      saveBlob(blob, resource.fileName || `${resource.title}.js`);
    } catch (error) {
      void message.error(serverErrorText(error));
    }
  };

  // ---- create/edit editor (MODULE → content text, EXTENSION → file upload)
  const openEditor = async (resource: TbResourceInfo | null) => {
    setEditTarget(resource);
    setUploadedFile(null);
    setContent('');
    setEditorOpen(true);
    form.setFieldsValue({
      title: resource?.title ?? '',
      resourceSubType: resource?.resourceSubType ?? ResourceSubType.EXTENSION,
      content: undefined,
    });
    if (resource) {
      setEditorLoading(true);
      try {
        // ui-ngx loadEntity: MODULE edits need the full entity to decode
        // the current source out of the base64 payload.
        if (resource.resourceSubType === ResourceSubType.MODULE) {
          const full = await getResourceById(resource.id.id);
          const text = full.data ? base64ToString(full.data) : '';
          setContent(text);
          form.setFieldsValue({ content: text });
        }
      } catch (error) {
        void message.error(serverErrorText(error));
      } finally {
        setEditorLoading(false);
      }
    }
  };

  const saveScript = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      if (!editTarget) {
        if (values.resourceSubType === ResourceSubType.MODULE) {
          // MODULE create: the .js file name derives from the title.
          await uploadResource(
            jsModuleUploadRequest(values.title, values.content ?? ''),
          );
        } else {
          const file = uploadedFile?.originFileObj;
          if (!file) {
            void message.error(
              formatMessage({
                id: 'pages.resources.jsLibrary.uploadHint',
                defaultMessage: 'Click or drag a .js file here to upload',
              }),
            );
            return;
          }
          await uploadResource({
            file,
            title: values.title,
            resourceType: JS_MODULE,
            resourceSubType: ResourceSubType.EXTENSION,
          });
        }
      } else {
        // Update: metadata first, payload only when it actually changed.
        await updateResourceInfo(editTarget.id.id, { title: values.title });
        if (values.resourceSubType === ResourceSubType.MODULE) {
          if (values.content !== undefined && values.content !== content) {
            await updateResourceData(
              editTarget.id.id,
              new File(
                [values.content],
                editTarget.fileName || jsModuleFileName(values.title),
                { type: 'text/javascript' },
              ),
            );
          }
        } else if (uploadedFile?.originFileObj) {
          await updateResourceData(
            editTarget.id.id,
            uploadedFile.originFileObj,
          );
        }
      }
      setEditorOpen(false);
      void message.success(
        formatMessage({
          id: 'pages.resources.jsLibrary.toastSaved',
          defaultMessage: 'Script saved.',
        }),
      );
      void invalidate();
    } catch (error) {
      void message.error(serverErrorText(error));
    } finally {
      setSaving(false);
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
              id: 'pages.resources.jsLibrary.toastDeleted',
              defaultMessage: 'Script deleted.',
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
            id: 'pages.resources.jsLibrary.batchResult',
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
          id: 'pages.resources.jsLibrary.toastDeleted',
          defaultMessage: 'Script deleted.',
        }),
      );
    }
  };

  const confirmDeleteOne = (resource: TbResourceInfo) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.resources.jsLibrary.deleteOneTitle',
          defaultMessage: "Delete the script '{title}'?",
        },
        { title: resource.title ?? resource.id.id },
      ),
      content: formatMessage({
        id: 'pages.resources.jsLibrary.deleteOneText',
        defaultMessage:
          'Be careful, after the confirmation the script will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.resources.jsLibrary.delete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.resources.jsLibrary.cancel',
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
          id: 'pages.resources.jsLibrary.deleteManyTitle',
          defaultMessage:
            'Delete {count, plural, =1 {1 script} other {# scripts}}?',
        },
        { count: selectedResources.length },
      ),
      content: formatMessage({
        id: 'pages.resources.jsLibrary.deleteManyText',
        defaultMessage: 'This cannot be undone.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.resources.jsLibrary.delete',
        defaultMessage: 'Delete',
      }),
      cancelText: formatMessage({
        id: 'pages.resources.jsLibrary.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () =>
        deleteWithFlow(selectedResources, () => setSelectedRowKeys([])),
    });
  };

  // ---- columns
  // biome-ignore lint/correctness/useExhaustiveDependencies: row-action handlers re-create per render by design
  const columns: ProColumns<TbResourceInfo>[] = useMemo(() => {
    const cols: ProColumns<TbResourceInfo>[] = [
      {
        title: formatMessage({
          id: 'pages.resources.jsLibrary.createdTime',
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
          id: 'pages.resources.jsLibrary.title',
          defaultMessage: 'Title',
        }),
        dataIndex: 'title',
        sorter: true,
        sortOrder: sortOrderFor('title'),
      },
      {
        title: formatMessage({
          id: 'pages.resources.jsLibrary.scriptType',
          defaultMessage: 'Script type',
        }),
        dataIndex: 'resourceSubType',
        render: (_, record) =>
          record.resourceSubType ? subTypeName(record.resourceSubType) : '-',
      },
      {
        title: formatMessage({
          id: 'pages.resources.jsLibrary.system',
          defaultMessage: 'System',
        }),
        dataIndex: 'system',
        width: 90,
        render: (_, record) =>
          record.tenantId?.id === NULL_UUID ? (
            <Tag color="blue">
              {formatMessage({
                id: 'pages.resources.jsLibrary.system',
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
              id: 'pages.resources.jsLibrary.download',
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
                      id: 'pages.resources.jsLibrary.edit',
                      defaultMessage: 'Edit script',
                    }),
                    icon: <EditOutlined />,
                    onClick: () => void openEditor(record),
                  },
                  {
                    key: 'delete',
                    danger: true,
                    icon: <DeleteOutlined />,
                    label: formatMessage({
                      id: 'pages.resources.jsLibrary.delete',
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
  }, [formatMessage, authority, urlState.sortProperty, urlState.sortDirection]);

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
        id: 'menu.resources.jsLibrary',
        defaultMessage: 'JS library',
      })}
      extra={
        <div className="flex flex-wrap items-center gap-3">
          <Input.Search
            allowClear
            className="w-64"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={formatMessage({
              id: 'pages.resources.jsLibrary.search',
              defaultMessage: 'Search scripts',
            })}
          />
          <Select
            allowClear
            className="w-40"
            value={urlState.resourceSubType}
            placeholder={formatMessage({
              id: 'pages.resources.jsLibrary.subTypePlaceholder',
              defaultMessage: 'All script types',
            })}
            options={JS_RESOURCE_SUB_TYPES.map((subType) => ({
              label: subTypeName(subType),
              value: subType,
            }))}
            onChange={(value) =>
              patch({ resourceSubType: value ?? undefined, page: 1 })
            }
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void resourcesQuery.refetch()}
          >
            {formatMessage({
              id: 'pages.resources.jsLibrary.refresh',
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
                      id: 'pages.resources.jsLibrary.selectedCount',
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
                    id: 'pages.resources.jsLibrary.batchDelete',
                    defaultMessage: 'Delete selected',
                  })}
                </Button>
              </>
            )}
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => void openEditor(null)}
            >
              {formatMessage({
                id: 'pages.resources.jsLibrary.add',
                defaultMessage: 'Add script',
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
            id: 'pages.resources.jsLibrary.loadFailed',
            defaultMessage: 'Failed to load scripts',
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
                id: 'pages.resources.jsLibrary.total',
                defaultMessage: '{count} total',
              },
              { count: total },
            ),
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.resources.jsLibrary.empty',
            defaultMessage: 'No scripts',
          }),
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
          getCheckboxProps: (record) => ({
            disabled: !isEditable(record),
          }),
        }}
      />

      <Modal
        open={editorOpen}
        title={formatMessage({
          id: editTarget
            ? 'pages.resources.jsLibrary.edit'
            : 'pages.resources.jsLibrary.add',
          defaultMessage: editTarget ? 'Edit script' : 'Add script',
        })}
        okText={formatMessage({
          id: 'pages.resources.jsLibrary.save',
          defaultMessage: 'Save',
        })}
        cancelText={formatMessage({
          id: 'pages.resources.jsLibrary.cancel',
          defaultMessage: 'Cancel',
        })}
        confirmLoading={saving || editorLoading}
        onOk={() => void saveScript()}
        onCancel={() => setEditorOpen(false)}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="title"
            label={formatMessage({
              id: 'pages.resources.jsLibrary.fieldTitle',
              defaultMessage: 'Title',
            })}
            rules={[
              {
                required: true,
                message: formatMessage({
                  id: 'pages.resources.jsLibrary.titleRequired',
                  defaultMessage: 'Title is required',
                }),
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="resourceSubType"
            label={formatMessage({
              id: 'pages.resources.jsLibrary.fieldSubType',
              defaultMessage: 'Script type',
            })}
          >
            <Select
              // ui-ngx: the sub type is fixed after creation.
              disabled={!!editTarget}
              options={JS_RESOURCE_SUB_TYPES.map((subType) => ({
                label: subTypeName(subType),
                value: subType,
              }))}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) =>
              getFieldValue('resourceSubType') === ResourceSubType.MODULE ? (
                <div>
                  <Typography.Text>
                    {formatMessage({
                      id: 'pages.resources.jsLibrary.fieldContent',
                      defaultMessage: 'Code',
                    })}
                  </Typography.Text>
                  <CodeEditor
                    language="javascript"
                    height="300px"
                    value={content}
                    onChange={(value) => {
                      setContent(value);
                      form.setFieldsValue({ content: value });
                    }}
                  />
                </div>
              ) : (
                <Upload.Dragger
                  multiple={false}
                  accept=".js,text/javascript"
                  beforeUpload={() => false}
                  fileList={uploadedFile ? [uploadedFile] : []}
                  onChange={({ fileList }) =>
                    setUploadedFile(fileList[0] ?? null)
                  }
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <p className="ant-upload-text">
                    {formatMessage({
                      id: 'pages.resources.jsLibrary.uploadHint',
                      defaultMessage: 'Click or drag a .js file here to upload',
                    })}
                  </p>
                </Upload.Dragger>
              )
            }
          </Form.Item>
        </Form>
      </Modal>

      <ResourcesInUseModal
        open={inUseItems.length > 0}
        multiple={inUseMultiple}
        resources={inUseItems}
        title={formatMessage({
          id: inUseMultiple
            ? 'pages.resources.jsLibrary.inUseManyTitle'
            : 'pages.resources.jsLibrary.inUseTitle',
          defaultMessage: 'Script is in use',
        })}
        message={formatMessage(
          {
            id: inUseMultiple
              ? 'pages.resources.jsLibrary.inUseManyText'
              : 'pages.resources.jsLibrary.inUseText',
            defaultMessage: 'The script is still referenced.',
          },
          inUseMultiple ? {} : { title: inUseItems[0]?.title ?? '' },
        )}
        deleteText={formatMessage({
          id: 'pages.resources.jsLibrary.deleteInUse',
          defaultMessage: 'Delete anyway',
        })}
        cancelText={formatMessage({
          id: 'pages.resources.jsLibrary.cancel',
          defaultMessage: 'Cancel',
        })}
        titleColumnLabel={formatMessage({
          id: 'pages.resources.jsLibrary.title',
          defaultMessage: 'Title',
        })}
        referencesColumnLabel={formatMessage({
          id: 'pages.resources.jsLibrary.references',
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
