/**
 * OTA packages list — "Packages repository" (M13 wave-2, spec §5.5; ui-ngx
 * ota-update-table-config parity).
 *
 * Nine columns with in-cell copy buttons for direct-url/checksum; search/
 * paging/sorting ride the URL with an explicit createdTime DESC default.
 * Row actions: open detail (title link), Download (URL branch never reaches
 * the endpoint — the button is disabled for URL packages, ui-ngx parity) and
 * Delete (single + batch, confirm-quad; referenced packages surface the
 * backend 400 text through serverErrorText). No type filter, no JSON
 * export — pinned by spec §5.5 「无」 list.
 *
 * The create dialog mirrors ui-ngx's add form: tag auto-suggest while
 * pristine, required device-profile picker (the backend 500s on profile-less
 * uploads), binary-file vs external-URL branch, auto-generate checksum, and
 * the two-step save with rollback (saveOtaPackageWithFile).
 */
import {
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  InboxOutlined,
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
import { history } from '@umijs/max';
import {
  Alert,
  App,
  Button,
  Checkbox,
  Form,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  type TableProps,
  Typography,
  Upload,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import PageContainer from '@/components/layout/page-container';
import { BatchProgressModal } from '@/components/shared/BatchProgressModal';
import { downloadBlob } from '@/components/shared/download-blob';
import { useBatchRun } from '@/components/shared/use-batch-run';
import { getDeviceProfiles } from '@/services/tb/device';
import {
  deleteOtaPackage,
  downloadOtaPackage,
  getOtaPackages,
  saveOtaPackageInfo,
  saveOtaPackageWithFile,
} from '@/services/tb/ota';
import type { DeviceProfileInfo } from '@/types/tb';
import { EntityType } from '@/types/tb';
import {
  ChecksumAlgorithm,
  type ChecksumAlgorithm as ChecksumAlgorithmType,
  type OtaPackageInfo,
  OtaPackageType,
  type SaveOtaPackageInfoRequest,
} from '@/types/tb/ota';
import {
  autoTag,
  CHECKSUM_ALGORITHMS,
  checksumText,
  downloadDisabledFor,
  formatDataSize,
  openPackageExternalUrl,
  truncateCell,
} from '../package-view';
import { useOtaCopy } from '../use-ota-copy';
import {
  OTA_SORTABLE_COLUMNS,
  toPageLink,
  useOtaPackagesUrlState,
} from './url-state';

const OTA_QUERY_KEY = ['ota', 'packages'] as const;

const SEARCH_DEBOUNCE_MS = 400;
const PROFILE_SEARCH_DEBOUNCE_MS = 300;

const TYPE_NAME_KEYS: Record<OtaPackageType, string> = {
  [OtaPackageType.FIRMWARE]: 'pages.ota.type.firmware',
  [OtaPackageType.SOFTWARE]: 'pages.ota.type.software',
};

interface OtaPackageFormValues {
  title: string;
  version: string;
  tag?: string;
  profileId?: string;
  type: OtaPackageType;
  source: 'file' | 'url';
  checksumAuto: boolean;
  checksumAlgorithm?: ChecksumAlgorithmType;
  checksum?: string;
  url?: string;
}

export default function OtaPackagesListPage() {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const copy = useOtaCopy();
  const { state: urlState, patch } = useOtaPackagesUrlState();
  const [form] = Form.useForm<OtaPackageFormValues>();

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
  const packagesQuery = useQuery({
    queryKey: [
      ...OTA_QUERY_KEY,
      urlState.page,
      urlState.pageSize,
      urlState.sortProperty,
      urlState.sortDirection,
      urlState.textSearch,
    ],
    queryFn: () => getOtaPackages(toPageLink(urlState)),
    placeholderData: keepPreviousData,
  });
  const packages: Array<OtaPackageInfo> = packagesQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: OTA_QUERY_KEY });

  // ---- selection & dialogs
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const selectedPackages = packages.filter((pkg) =>
    selectedRowKeys.includes(pkg.id.id),
  );

  const [createOpen, setCreateOpen] = useState(false);
  // The File is captured in beforeUpload (ImportDashboardModal parity) —
  // it stashes the selection; the actual upload happens on save.
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  // ui-ngx keeps auto-suggesting the tag while it stays pristine; once the
  // user edits it, the suggestion never overwrites again. setFieldsValue
  // does not fire onValuesChange, so a ref tracks "user touched" reliably.
  const tagTouchedRef = useRef(false);

  const batch = useBatchRun();
  const [batchOpen, setBatchOpen] = useState(false);

  // ---- device-profile picker options (create dialog; DeviceWizardModal parity)
  const [profileSearch, setProfileSearch] = useState('');
  const [debouncedProfileSearch, setDebouncedProfileSearch] = useState('');
  const profileTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  useEffect(() => {
    clearTimeout(profileTimer.current);
    profileTimer.current = setTimeout(() => {
      setDebouncedProfileSearch(profileSearch.trim());
    }, PROFILE_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(profileTimer.current);
  }, [profileSearch]);

  const profilesQuery = useQuery({
    queryKey: ['device-profiles', 'ota-dialog', debouncedProfileSearch],
    queryFn: () =>
      getDeviceProfiles({
        pageSize: 50,
        page: 0,
        textSearch: debouncedProfileSearch || undefined,
        sortOrder: { property: 'name', direction: 'ASC' },
      }),
    enabled: createOpen,
  });
  const profiles: Array<DeviceProfileInfo> = profilesQuery.data?.data ?? [];

  // ---- downloads (URL branch opens the link, file branch streams the blob)
  const download = async (pkg: OtaPackageInfo) => {
    if (pkg.url) {
      openPackageExternalUrl(pkg);
      return;
    }
    try {
      const blob = await downloadOtaPackage(pkg.id.id);
      downloadBlob(blob, pkg.fileName || `${pkg.title}.bin`);
    } catch (error) {
      void message.error(serverErrorText(error));
    }
  };

  // ---- create dialog
  const openCreate = () => {
    setUploadedFile(null);
    setProfileSearch('');
    setDebouncedProfileSearch('');
    tagTouchedRef.current = false;
    form.resetFields();
    setCreateOpen(true);
  };

  /** ui-ngx auto-suggest: tag follows `(title + ' ' + version).trim()` while pristine. */
  const onFormValuesChange = (changed: Partial<OtaPackageFormValues>) => {
    if (changed.tag !== undefined) {
      tagTouchedRef.current = true;
      return;
    }
    if (
      (changed.title !== undefined || changed.version !== undefined) &&
      !tagTouchedRef.current
    ) {
      form.setFieldsValue({
        tag: autoTag(
          form.getFieldValue('title'),
          form.getFieldValue('version'),
        ),
      });
    }
  };

  const savePackage = async () => {
    const values = await form.validateFields();
    setSaving(true);
    try {
      // Create draft: the backend mints id/createdTime (DeviceWizardModal
      // parity — sending a blank EntityId fails deserialization).
      type OtaPackageDraft = Omit<
        SaveOtaPackageInfoRequest,
        'id' | 'createdTime'
      >;
      const info: OtaPackageDraft = {
        title: values.title.trim(),
        version: values.version.trim(),
        tag: values.tag?.trim() || undefined,
        deviceProfileId: {
          entityType: EntityType.DEVICE_PROFILE,
          id: values.profileId as string,
        },
        type: values.type,
        usesUrl: values.source === 'url',
        ...(values.source === 'url' ? { url: values.url?.trim() } : {}),
      };
      if (values.source === 'url') {
        await saveOtaPackageInfo(info as SaveOtaPackageInfoRequest);
      } else {
        if (!uploadedFile) {
          void message.error(
            formatMessage({
              id: 'pages.ota.fileRequired',
              defaultMessage: 'Package file is required.',
            }),
          );
          return;
        }
        const file = uploadedFile;
        // Two-step create with rollback; the checksum query param rides the
        // upload even when auto-generated (backend computes the value).
        // checksumAlgorithm is undefined while the auto-generate checkbox
        // hides its picker — that "no explicit choice" state IS the SHA256
        // default riding the multipart query.
        await saveOtaPackageWithFile(
          info as SaveOtaPackageInfoRequest,
          file,
          values.checksumAlgorithm ?? ChecksumAlgorithm.SHA256,
          values.checksumAuto
            ? undefined
            : values.checksum?.trim() || undefined,
        );
      }
      setCreateOpen(false);
      void message.success(
        formatMessage({
          id: 'pages.ota.toastSaved',
          defaultMessage: 'Package saved.',
        }),
      );
      void invalidate();
    } catch (error) {
      void message.error(serverErrorText(error));
    } finally {
      setSaving(false);
    }
  };

  // ---- delete flows (single + batch; referenced packages bubble the 400)
  const deleteOne = async (pkg: OtaPackageInfo) => {
    try {
      await deleteOtaPackage(pkg.id.id);
      setSelectedRowKeys([]);
      void message.success(
        formatMessage({
          id: 'pages.ota.toastDeleted',
          defaultMessage: 'Package deleted.',
        }),
      );
      void invalidate();
    } catch (error) {
      // Backend 400 when devices / device profiles still reference it.
      void message.error(serverErrorText(error));
    }
  };

  const confirmDeleteOne = (pkg: OtaPackageInfo) => {
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.ota.deleteOneTitle',
          defaultMessage:
            "Are you sure you want to delete the OTA update '{title}'?",
        },
        { title: pkg.title },
      ),
      content: formatMessage({
        id: 'pages.ota.deleteOneText',
        defaultMessage:
          'Be careful, after the confirmation the OTA update will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.ota.delete',
        defaultMessage: 'Delete package',
      }),
      cancelText: formatMessage({
        id: 'pages.ota.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => deleteOne(pkg),
    });
  };

  const runBatchDelete = async () => {
    const targets = [...selectedPackages];
    setBatchOpen(true);
    const summary = await batch.run(
      targets,
      (pkg) => pkg.title,
      (pkg) => deleteOtaPackage(pkg.id.id),
    );
    setSelectedRowKeys([]);
    void invalidate();
    void message.success(
      formatMessage(
        {
          id: 'pages.ota.batchResult',
          defaultMessage: '{ok} succeeded, {fail} failed.',
        },
        { ok: summary.ok, fail: summary.failed },
      ),
    );
  };

  const confirmDeleteSelected = () => {
    if (selectedPackages.length === 0) {
      return;
    }
    modal.confirm({
      title: formatMessage(
        {
          id: 'pages.ota.deleteManyTitle',
          defaultMessage:
            'Are you sure you want to delete {count, plural, =1 {1 OTA update} other {# OTA updates}}?',
        },
        { count: selectedPackages.length },
      ),
      content: formatMessage({
        id: 'pages.ota.deleteManyText',
        defaultMessage:
          'Be careful, after the confirmation all selected OTA updates will be removed.',
      }),
      okButtonProps: { danger: true },
      okText: formatMessage({
        id: 'pages.ota.delete',
        defaultMessage: 'Delete package',
      }),
      cancelText: formatMessage({
        id: 'pages.ota.cancel',
        defaultMessage: 'Cancel',
      }),
      onOk: () => runBatchDelete(),
    });
  };

  // ---- columns (ui-ngx nine-column parity)
  // biome-ignore lint/correctness/useExhaustiveDependencies: row-action handlers re-create per render by design
  const columns: ProColumns<OtaPackageInfo>[] = useMemo(() => {
    const cols: ProColumns<OtaPackageInfo>[] = [
      {
        title: formatMessage({
          id: 'pages.ota.createdTime',
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
          id: 'pages.ota.title',
          defaultMessage: 'Title',
        }),
        dataIndex: 'title',
        sorter: true,
        sortOrder: sortOrderFor('title'),
        render: (_, record) => (
          <Button
            type="link"
            size="small"
            className="px-0"
            onClick={() => history.push(`/otaPackages/${record.id.id}`)}
          >
            {record.title}
          </Button>
        ),
      },
      {
        title: formatMessage({
          id: 'pages.ota.version',
          defaultMessage: 'Version',
        }),
        dataIndex: 'version',
        sorter: true,
        sortOrder: sortOrderFor('version'),
        render: (_, record) => record.version ?? '-',
      },
      {
        title: formatMessage({
          id: 'pages.ota.tag',
          defaultMessage: 'Version tag',
        }),
        dataIndex: 'tag',
        sorter: true,
        sortOrder: sortOrderFor('tag'),
        render: (_, record) => record.tag || '-',
      },
      {
        title: formatMessage({
          id: 'pages.ota.type',
          defaultMessage: 'Package type',
        }),
        dataIndex: 'type',
        sorter: true,
        sortOrder: sortOrderFor('type'),
        render: (_, record) =>
          formatMessage({
            id: TYPE_NAME_KEYS[record.type],
            defaultMessage: record.type,
          }),
      },
      {
        title: formatMessage({
          id: 'pages.ota.directUrl',
          defaultMessage: 'Direct URL',
        }),
        dataIndex: 'url',
        width: 200,
        sorter: true,
        sortOrder: sortOrderFor('url'),
        render: (_, record) =>
          record.url ? (
            <Space size={4}>
              <Typography.Text>{truncateCell(record.url)}</Typography.Text>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                aria-label={formatMessage({
                  id: 'pages.ota.copyDirectUrl',
                  defaultMessage: 'Copy direct URL',
                })}
                onClick={() =>
                  void copy(record.url as string, {
                    id: 'pages.ota.copiedDirectUrl',
                    defaultMessage:
                      'Package direct URL has been copied to clipboard',
                  })
                }
              />
            </Space>
          ) : (
            '-'
          ),
      },
      {
        title: formatMessage({
          id: 'pages.ota.fileName',
          defaultMessage: 'File name',
        }),
        dataIndex: 'fileName',
        sorter: true,
        sortOrder: sortOrderFor('fileName'),
        render: (_, record) => record.fileName || '-',
      },
      {
        title: formatMessage({
          id: 'pages.ota.dataSize',
          defaultMessage: 'File size',
        }),
        dataIndex: 'dataSize',
        width: 100,
        sorter: true,
        sortOrder: sortOrderFor('dataSize'),
        render: (_, record) =>
          record.dataSize === undefined || record.dataSize === null
            ? '-'
            : formatDataSize(record.dataSize),
      },
      {
        title: formatMessage({
          id: 'pages.ota.checksum',
          defaultMessage: 'Checksum',
        }),
        dataIndex: 'checksum',
        width: 220,
        sorter: true,
        sortOrder: sortOrderFor('checksum'),
        render: (_, record) =>
          record.checksum ? (
            <Space size={4}>
              <Typography.Text>
                {truncateCell(checksumText(record))}
              </Typography.Text>
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                aria-label={formatMessage({
                  id: 'pages.ota.copyChecksum',
                  defaultMessage: 'Copy checksum',
                })}
                onClick={() =>
                  void copy(record.checksum as string, {
                    id: 'pages.ota.copiedChecksum',
                    defaultMessage:
                      'Package checksum has been copied to clipboard',
                  })
                }
              />
            </Space>
          ) : (
            '-'
          ),
      },
    ];
    cols.push({
      valueType: 'option',
      width: 100,
      fixed: 'right',
      render: (_, record) => [
        <Button
          key="download"
          type="text"
          size="small"
          icon={<DownloadOutlined />}
          disabled={downloadDisabledFor(record)}
          aria-label={formatMessage({
            id: 'pages.ota.download',
            defaultMessage: 'Download package',
          })}
          title={formatMessage({
            id: 'pages.ota.download',
            defaultMessage: 'Download package',
          })}
          onClick={() => void download(record)}
        />,
        <Button
          key="delete"
          danger
          type="text"
          size="small"
          icon={<DeleteOutlined />}
          aria-label={formatMessage({
            id: 'pages.ota.delete',
            defaultMessage: 'Delete package',
          })}
          title={formatMessage({
            id: 'pages.ota.delete',
            defaultMessage: 'Delete package',
          })}
          onClick={() => confirmDeleteOne(record)}
        />,
      ],
    });
    return cols;
  }, [formatMessage, urlState.sortProperty, urlState.sortDirection]);

  function sortOrderFor(property: string): 'ascend' | 'descend' | undefined {
    if (urlState.sortProperty !== property) {
      return undefined;
    }
    return urlState.sortDirection === 'ASC' ? 'ascend' : 'descend';
  }

  const onTableChange: TableProps<OtaPackageInfo>['onChange'] = (
    pagination,
    _filters,
    sorter,
  ) => {
    const sort = Array.isArray(sorter) ? sorter[0] : sorter;
    const property = sort?.field
      ? OTA_SORTABLE_COLUMNS[sort.field as string]
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
        id: 'menu.otaPackages',
        defaultMessage: 'OTA packages',
      })}
      extra={
        <div className="flex flex-wrap items-center gap-3">
          <Input.Search
            allowClear
            className="w-64"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder={formatMessage({
              id: 'pages.ota.search',
              defaultMessage: 'Search packages',
            })}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void packagesQuery.refetch()}
          >
            {formatMessage({
              id: 'pages.ota.refresh',
              defaultMessage: 'Refresh',
            })}
          </Button>
          <div className="flex-1" />
          <Space>
            {selectedPackages.length > 0 && (
              <>
                <Typography.Text type="secondary">
                  {formatMessage(
                    {
                      id: 'pages.ota.selectedCount',
                      defaultMessage: '{count} selected',
                    },
                    { count: selectedPackages.length },
                  )}
                </Typography.Text>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={confirmDeleteSelected}
                >
                  {formatMessage({
                    id: 'pages.ota.batchDelete',
                    defaultMessage: 'Delete selected',
                  })}
                </Button>
              </>
            )}
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              {formatMessage({
                id: 'pages.ota.add',
                defaultMessage: 'Add package',
              })}
            </Button>
          </Space>
        </div>
      }
    >
      {packagesQuery.isError && (
        <Alert
          type="error"
          showIcon
          title={formatMessage({
            id: 'pages.ota.loadFailed',
            defaultMessage: 'Failed to load packages',
          })}
          description={serverErrorText(packagesQuery.error)}
        />
      )}

      <ProTable<OtaPackageInfo>
        rowKey={(record) => record.id.id}
        tableAlertRender={false}
        tableAlertOptionRender={false}
        columns={columns}
        dataSource={packages}
        loading={packagesQuery.isPending}
        search={false}
        options={false}
        onChange={onTableChange}
        pagination={{
          current: urlState.page,
          pageSize: urlState.pageSize,
          total: packagesQuery.data?.totalElements ?? 0,
          showSizeChanger: true,
          pageSizeOptions: [10, 20, 30, 50, 100],
          showTotal: (total) =>
            formatMessage(
              {
                id: 'pages.ota.total',
                defaultMessage: '{count} total',
              },
              { count: total },
            ),
        }}
        locale={{
          emptyText: formatMessage({
            id: 'pages.ota.empty',
            defaultMessage: 'No packages found',
          }),
        }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
      />

      <Modal
        open={createOpen}
        title={formatMessage({
          id: 'pages.ota.add',
          defaultMessage: 'Add package',
        })}
        width={640}
        okText={formatMessage({
          id: 'pages.ota.add',
          defaultMessage: 'Add package',
        })}
        cancelText={formatMessage({
          id: 'pages.ota.cancel',
          defaultMessage: 'Cancel',
        })}
        confirmLoading={saving}
        onOk={() => void savePackage()}
        onCancel={() => setCreateOpen(false)}
      >
        <Form<OtaPackageFormValues>
          form={form}
          layout="vertical"
          onValuesChange={onFormValuesChange}
          initialValues={{
            type: OtaPackageType.FIRMWARE,
            source: 'file',
            checksumAuto: true,
            checksumAlgorithm: ChecksumAlgorithm.SHA256,
          }}
        >
          <Alert
            className="mb-4"
            type="warning"
            showIcon
            title={formatMessage({
              id: 'pages.ota.warningAfterUpload',
              defaultMessage:
                'Once the package is uploaded, you will not be able to modify title, version, device profile and package type.',
            })}
          />
          <Form.Item
            name="title"
            label={formatMessage({
              id: 'pages.ota.title',
              defaultMessage: 'Title',
            })}
            rules={[
              {
                required: true,
                whitespace: true,
                message: formatMessage({
                  id: 'pages.ota.titleRequired',
                  defaultMessage: 'Title is required.',
                }),
              },
              {
                max: 255,
                message: formatMessage({
                  id: 'pages.ota.titleMaxLength',
                  defaultMessage: 'Title should be less than 256 characters.',
                }),
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="version"
            label={formatMessage({
              id: 'pages.ota.version',
              defaultMessage: 'Version',
            })}
            rules={[
              {
                required: true,
                whitespace: true,
                message: formatMessage({
                  id: 'pages.ota.versionRequired',
                  defaultMessage: 'Version is required.',
                }),
              },
              {
                max: 255,
                message: formatMessage({
                  id: 'pages.ota.versionMaxLength',
                  defaultMessage: 'Version should be less than 256 characters.',
                }),
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="tag"
            label={formatMessage({
              id: 'pages.ota.tag',
              defaultMessage: 'Version tag',
            })}
            extra={formatMessage({
              id: 'pages.ota.tagHint',
              defaultMessage:
                'Custom tag should match the package version reported by your device.',
            })}
            rules={[
              {
                max: 255,
                message: formatMessage({
                  id: 'pages.ota.tagMaxLength',
                  defaultMessage: 'Tag should be less than 256 characters.',
                }),
              },
            ]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="profileId"
            label={formatMessage({
              id: 'pages.ota.profile',
              defaultMessage: 'Device profile',
            })}
            extra={formatMessage({
              id: 'pages.ota.profileHint',
              defaultMessage:
                'The uploaded package will be available only for devices with the chosen profile.',
            })}
            rules={[
              {
                required: true,
                message: formatMessage({
                  id: 'pages.ota.profileRequired',
                  defaultMessage: 'Device profile is required.',
                }),
              },
            ]}
          >
            <Select
              showSearch
              filterOption={false}
              onSearch={setProfileSearch}
              loading={profilesQuery.isPending}
              placeholder={formatMessage({
                id: 'pages.ota.profilePlaceholder',
                defaultMessage: 'Search and select a device profile',
              })}
              options={profiles.map((profile) => ({
                label: profile.name,
                value: profile.id.id,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="type"
            label={formatMessage({
              id: 'pages.ota.type',
              defaultMessage: 'Package type',
            })}
          >
            <Radio.Group
              options={[
                {
                  label: formatMessage({
                    id: 'pages.ota.type.firmware',
                    defaultMessage: 'Firmware',
                  }),
                  value: OtaPackageType.FIRMWARE,
                },
                {
                  label: formatMessage({
                    id: 'pages.ota.type.software',
                    defaultMessage: 'Software',
                  }),
                  value: OtaPackageType.SOFTWARE,
                },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="source"
            label={formatMessage({
              id: 'pages.ota.packageFile',
              defaultMessage: 'Package file',
            })}
          >
            <Radio.Group
              options={[
                {
                  label: formatMessage({
                    id: 'pages.ota.sourceFile',
                    defaultMessage: 'Upload binary file',
                  }),
                  value: 'file',
                },
                {
                  label: formatMessage({
                    id: 'pages.ota.sourceUrl',
                    defaultMessage: 'Use external URL',
                  }),
                  value: 'url',
                },
              ]}
            />
          </Form.Item>
          <Form.Item noStyle shouldUpdate>
            {({ getFieldValue }) =>
              getFieldValue('source') === 'url' ? (
                <Form.Item
                  name="url"
                  label={formatMessage({
                    id: 'pages.ota.directUrl',
                    defaultMessage: 'Direct URL',
                  })}
                  rules={[
                    {
                      required: true,
                      whitespace: true,
                      message: formatMessage({
                        id: 'pages.ota.urlRequired',
                        defaultMessage: 'Direct URL is required',
                      }),
                    },
                  ]}
                >
                  <Input />
                </Form.Item>
              ) : (
                <>
                  <Form.Item
                    label={formatMessage({
                      id: 'pages.ota.packageFile',
                      defaultMessage: 'Package file',
                    })}
                  >
                    <Upload.Dragger
                      multiple={false}
                      maxCount={1}
                      showUploadList={!!uploadedFile}
                      fileList={
                        uploadedFile
                          ? [
                              {
                                uid: 'ota-file',
                                name: uploadedFile.name,
                                status: 'done' as const,
                              },
                            ]
                          : []
                      }
                      beforeUpload={(file) => {
                        setUploadedFile(file);
                        return false;
                      }}
                      onRemove={() => setUploadedFile(null)}
                    >
                      <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                      </p>
                      <p className="ant-upload-text">
                        {formatMessage({
                          id: 'pages.ota.dropFile',
                          defaultMessage:
                            'Drop a package file or click to select a file to upload.',
                        })}
                      </p>
                    </Upload.Dragger>
                  </Form.Item>
                  <Form.Item name="checksumAuto" valuePropName="checked">
                    <Checkbox>
                      {formatMessage({
                        id: 'pages.ota.autoChecksum',
                        defaultMessage: 'Auto-generate checksum',
                      })}
                    </Checkbox>
                  </Form.Item>
                  <Form.Item noStyle shouldUpdate>
                    {({ getFieldValue: get }) =>
                      !get('checksumAuto') ? (
                        <>
                          <Form.Item
                            name="checksumAlgorithm"
                            label={formatMessage({
                              id: 'pages.ota.checksumAlgorithm',
                              defaultMessage: 'Checksum algorithm',
                            })}
                          >
                            <Select
                              options={CHECKSUM_ALGORITHMS.map((algorithm) => ({
                                label: algorithm,
                                value: algorithm,
                              }))}
                            />
                          </Form.Item>
                          <Form.Item
                            name="checksum"
                            label={formatMessage({
                              id: 'pages.ota.checksum',
                              defaultMessage: 'Checksum',
                            })}
                            extra={formatMessage({
                              id: 'pages.ota.checksumHint',
                              defaultMessage:
                                'If checksum is empty, it will be generated automatically',
                            })}
                            rules={[
                              {
                                max: 1020,
                                message: formatMessage({
                                  id: 'pages.ota.checksumMaxLength',
                                  defaultMessage:
                                    'Checksum should be less than 1021 characters.',
                                }),
                              },
                            ]}
                          >
                            <Input />
                          </Form.Item>
                        </>
                      ) : null
                    }
                  </Form.Item>
                </>
              )
            }
          </Form.Item>
        </Form>
      </Modal>

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
