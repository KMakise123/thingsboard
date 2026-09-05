/**
 * ImageGallery — the shared images/SCADA-symbols library face (M11 wave-2C,
 * spec §3.2 + §3.3; ui-ngx image-gallery.component.ts parity).
 *
 * One component, two domain forms via `imageSubType` (a SCADA symbol IS an
 * image with imageSubType=SCADA_SYMBOL):
 *   - IMAGE form: upload / info-edit / view / download / export / import /
 *     embed public-link / delete flows;
 *   - SCADA form: symbol wording, embed hidden, edit navigates through the
 *     `onEditImage` hook (the editor page is wave 2D), upload success hands
 *     to `onUploadSuccess` (the page jumps into the editor).
 *
 * Behaviors carried here:
 *   - list/grid view modes; page/pageSize/sort/search/mode/include-system
 *     ride the URL (components/images/url-state.ts) unless embedded;
 *   - TENANT sessions may include system images (NULL tenant) — they stay
 *     read-only (no info save, no delete);
 *   - single + batch delete run force=false first; a 400 carrying
 *     references opens the SHARED resources-in-use modal (wave-1A
 *     components — consumed as-is) and force-deletes on confirm;
 *   - selectionMode (embedded Modal form): row click picks, actions hide,
 *     upload/import emit the picked image;
 *   - thumbnails resolve through the authenticated blob loader — never
 *     <img src> against the protected endpoints.
 */
import {
  CheckCircleFilled,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  ExportOutlined,
  ImportOutlined,
  LinkOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import type { ProColumns } from '@ant-design/pro-components';
import { ProTable } from '@ant-design/pro-components';
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Pagination,
  Segmented,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import { EmbedImageDialog } from '@/components/images/embed-image-dialog';
import { ImageDetailsDialog } from '@/components/images/image-details-dialog';
import {
  exportImageToFile,
  ImageImportError,
  importImageFromFile,
} from '@/components/images/image-import-export';
import {
  formatFileSize,
  formatResolution,
} from '@/components/images/image-utils';
import { UploadImageDialog } from '@/components/images/upload-image-dialog';
import {
  type GalleryViewMode,
  toPageLink,
  useImageGalleryUrlState,
} from '@/components/images/url-state';
import { useImageObjectUrl } from '@/components/images/use-image-object-url';
import { referencesToEntries } from '@/components/resources/reference-entries';
import {
  type ResourceInUseItem,
  ResourcesInUseModal,
} from '@/components/resources/resources-in-use';
import { useAuthority } from '@/components/shared/use-authority';
import { useBatchRun } from '@/components/shared/use-batch-run';
import {
  deleteImage,
  downloadImage,
  getImages,
  ImageReferencedError,
} from '@/services/tb/image';
import type { ImageResourceInfo } from '@/types/tb/image';
import { ResourceSubType } from '@/types/tb/resource';

/** The SCADA-form sub-type this gallery supports. */
const SCADA = ResourceSubType.SCADA_SYMBOL;

/** TB's null-tenant UUID — a NULL tenant id marks a system image. */
const NULL_UUID = '13814000-1dd2-11b2-8080-808080808080';

const SEARCH_DEBOUNCE_MS = 400;

/** Table column key -> sortable server property (backend-allowed subset). */
const SORTABLE_COLUMNS: Record<string, string> = {
  createdTime: 'createdTime',
  title: 'title',
};

export interface ImageGalleryProps {
  imageSubType: ResourceSubType.IMAGE | ResourceSubType.SCADA_SYMBOL;
  /** Embedded (selection) form: no URL writes, actions hidden, click picks. */
  selectionMode?: boolean;
  /** Selection-mode pick (row click, upload, import). */
  onImageSelected?: (image: ImageResourceInfo) => void;
  /**
   * SCADA upload prefill: the owning page's light SVG metadata reader —
   * kept page-side so the full parser stays with the editor wave (2D).
   */
  extractUploadTitle?: (file: File) => Promise<string | undefined>;
  /** Fired after a successful non-selection upload/import (SCADA: jump to editor). */
  onUploadSuccess?: (image: ImageResourceInfo) => void;
  /**
   * SCADA edit hook (row click / edit action) — the page navigates to the
   * editor route. IMAGE form ignores it and opens the details dialog.
   */
  onEditImage?: (image: ImageResourceInfo) => void;
}

/** Per-row thumbnail (hook-per-row lives in a cell component). */
function ImageThumb({
  image,
  className,
}: {
  image: ImageResourceInfo;
  className?: string;
}) {
  const url = useImageObjectUrl(image.link, true);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={image.title ?? ''}
      loading="lazy"
      className={`object-contain ${className ?? ''}`}
    />
  );
}

export function ImageGallery({
  imageSubType,
  selectionMode = false,
  onImageSelected,
  extractUploadTitle,
  onUploadSuccess,
  onEditImage,
}: ImageGalleryProps) {
  const { formatMessage } = useIntl();
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const { authority } = useAuthority();
  const isSysAdmin = authority === 'SYS_ADMIN';
  const isScada = imageSubType === SCADA;

  /** Namespace resolver: identical base keys in images/scadaSymbols files. */
  const k = (base: string) =>
    `pages.resources.${isScada ? 'scadaSymbols' : 'images'}.${base}`;
  const t = (base: string, defaultMessage: string) =>
    formatMessage({ id: k(base), defaultMessage });

  // ---- URL-backed list state (URL-less when embedded) ----
  const { state: urlState, patch } = useImageGalleryUrlState(!selectionMode);

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
  const GALLERY_QUERY_KEY = ['images-gallery', imageSubType] as const;
  const galleryQuery = useQuery({
    queryKey: [
      ...GALLERY_QUERY_KEY,
      urlState.page,
      urlState.pageSize,
      urlState.sortProperty,
      urlState.sortDirection,
      urlState.textSearch,
      urlState.mode,
      urlState.includeSystemImages,
      selectionMode,
    ],
    queryFn: () =>
      getImages(
        toPageLink(urlState),
        urlState.includeSystemImages,
        imageSubType,
      ),
    placeholderData: keepPreviousData,
  });
  const images: Array<ImageResourceInfo> = galleryQuery.data?.data ?? [];
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: GALLERY_QUERY_KEY });

  const isSystem = (image: ImageResourceInfo): boolean =>
    image.tenantId?.id === NULL_UUID;
  const isReadonly = (image: ImageResourceInfo): boolean =>
    !isSysAdmin && isSystem(image);
  const isDeletable = (image: ImageResourceInfo): boolean =>
    isSysAdmin || !isSystem(image);

  // ---- selection (batch delete in the manage form; picking in selection form)
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const selectedImages = images.filter((image) =>
    selectedRowKeys.includes(image.resourceKey ?? image.id.id),
  );

  const toggleSelected = (image: ImageResourceInfo) => {
    const key = image.resourceKey ?? image.id.id;
    setSelectedRowKeys((previous) =>
      previous.includes(key)
        ? previous.filter((entry) => entry !== key)
        : [...previous, key],
    );
  };

  // ---- dialogs
  const [uploadOpen, setUploadOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [detailsTarget, setDetailsTarget] = useState<ImageResourceInfo>();
  const [embedTarget, setEmbedTarget] = useState<ImageResourceInfo>();

  // ---- shared in-use delete flow (single + batch)
  const [inUseItems, setInUseItems] = useState<Array<ResourceInUseItem>>([]);
  const [inUseMultiple, setInUseMultiple] = useState(false);
  const [inUseLoading, setInUseLoading] = useState(false);
  const batch = useBatchRun();
  const [batchOpen, setBatchOpen] = useState(false);
  /** key -> original row: force delete needs the scope (tenant|system). */
  const targetIndex = useRef(new Map<string, ImageResourceInfo>());

  const scopeOf = (image: ImageResourceInfo) =>
    isSystem(image) ? ('system' as const) : ('tenant' as const);

  const deleteWithFlow = async (
    targets: Array<ImageResourceInfo>,
    onDeleted: () => void,
  ) => {
    const referenced: Array<ResourceInUseItem> = [];
    let anyDeleted = false;
    let otherError: unknown;
    for (const image of targets) {
      const key = image.resourceKey ?? image.id.id;
      targetIndex.current.set(key, image);
      try {
        await deleteImage(scopeOf(image), image.resourceKey ?? '', false);
        anyDeleted = true;
      } catch (error) {
        if (error instanceof ImageReferencedError) {
          referenced.push({
            id: key,
            title: image.title ?? image.resourceKey ?? image.id.id,
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
    if (anyDeleted) {
      void message.success(t('toastDeleted', 'Image deleted.'));
    }
  };

  const clearSelection = () => setSelectedRowKeys([]);

  const confirmForceDelete = (items: Array<ResourceInUseItem>) => {
    if (items.length === 1) {
      void (async () => {
        setInUseLoading(true);
        try {
          const image = targetIndex.current.get(items[0].id);
          await deleteImage(
            image ? scopeOf(image) : 'tenant',
            items[0].id,
            true,
          );
          setInUseItems([]);
          clearSelection();
          void invalidate();
          void message.success(t('toastDeleted', 'Image deleted.'));
        } catch (error) {
          void message.error(serverErrorText(error));
        } finally {
          setInUseLoading(false);
        }
      })();
      return;
    }
    // Batch force delete: visible per-item progress (spec §1 batch rule).
    void (async () => {
      setInUseLoading(false);
      setBatchOpen(true);
      const summary = await batch.run(
        items,
        (item) => targetIndex.current.get(item.id)?.title ?? item.title,
        (item) => {
          const image = targetIndex.current.get(item.id);
          return deleteImage(image ? scopeOf(image) : 'tenant', item.id, true);
        },
      );
      clearSelection();
      setInUseItems([]);
      void invalidate();
      void message.success(
        formatMessage(
          {
            id: k('batchResult'),
            defaultMessage: '{ok} succeeded, {fail} failed.',
          },
          { ok: summary.ok, fail: summary.failed },
        ),
      );
    })();
  };

  const confirmDeleteOne = (image: ImageResourceInfo) => {
    modal.confirm({
      title: formatMessage(
        {
          id: k('deleteTitle'),
          defaultMessage:
            "Are you sure you want to delete the image '{title}'?",
        },
        { title: image.title ?? image.resourceKey },
      ),
      content: formatMessage({
        id: k('deleteText'),
        defaultMessage:
          'Be careful, after the confirmation the image will become unrecoverable.',
      }),
      okButtonProps: { danger: true },
      okText: t('delete', 'Delete'),
      cancelText: t('cancel', 'Cancel'),
      onOk: () => deleteWithFlow([image], clearSelection),
    });
  };

  const confirmDeleteSelected = () => {
    if (selectedImages.length === 0) {
      return;
    }
    modal.confirm({
      title: formatMessage(
        {
          id: k('deleteManyTitle'),
          defaultMessage:
            'Delete {count, plural, =1 {1 image} other {# images}}?',
        },
        { count: selectedImages.length },
      ),
      content: formatMessage({
        id: k('deleteManyText'),
        defaultMessage: 'This cannot be undone.',
      }),
      okButtonProps: { danger: true },
      okText: t('delete', 'Delete'),
      cancelText: t('cancel', 'Cancel'),
      onOk: () => deleteWithFlow(selectedImages, () => setSelectedRowKeys([])),
    });
  };

  // ---- row actions
  const download = async (image: ImageResourceInfo) => {
    try {
      const blob = await downloadImage(
        isSystem(image) ? 'system' : 'tenant',
        image.resourceKey ?? '',
      );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = image.fileName || `${image.title}.img`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      void message.error(serverErrorText(error));
    }
  };

  const openEdit = (image: ImageResourceInfo) => {
    if (isScada && onEditImage) {
      onEditImage(image);
      return;
    }
    setDetailsTarget(image);
  };

  const onUploadedOrImported = (image: ImageResourceInfo) => {
    if (selectionMode) {
      onImageSelected?.(image);
      return;
    }
    void invalidate();
    onUploadSuccess?.(image);
  };

  const runImport = async (file: File) => {
    try {
      const saved = await importImageFromFile(file);
      setImportOpen(false);
      void message.success(
        formatMessage(
          {
            id: k('toastImported'),
            defaultMessage: "Image '{title}' imported.",
          },
          { title: saved.title ?? '' },
        ),
      );
      onUploadedOrImported(saved);
    } catch (error) {
      if (error instanceof ImageImportError) {
        void message.error(
          formatMessage({
            id: error.localeKey,
            defaultMessage:
              'Unable to import image from JSON: invalid image JSON data structure.',
          }),
        );
      } else {
        void message.error(serverErrorText(error));
      }
    }
  };

  /** The click semantics of a row / card (upstream rowClick parity). */
  const activateImage = (image: ImageResourceInfo) => {
    if (selectionMode) {
      onImageSelected?.(image);
      return;
    }
    if (isScada) {
      openEdit(image);
      return;
    }
    if (isDeletable(image)) {
      toggleSelected(image);
    }
  };

  // ---- sort plumbing (URL-backed)
  const sortOrderFor = (property: string): 'ascend' | 'descend' | undefined => {
    if (urlState.sortProperty !== property) {
      return undefined;
    }
    return urlState.sortDirection === 'ASC' ? 'ascend' : 'descend';
  };

  /** Action buttons of one row/card (download/export/embed/edit/delete). */
  const renderActions = (image: ImageResourceInfo) => {
    const readonly = isReadonly(image);
    return [
      <Tooltip key="download" title={t('download', 'Download image')}>
        <Button
          type="text"
          size="small"
          icon={<DownloadOutlined />}
          aria-label={t('download', 'Download image')}
          onClick={(event) => {
            event.stopPropagation();
            void download(image);
          }}
        />
      </Tooltip>,
      <Tooltip key="export" title={t('export', 'Export image to JSON')}>
        <Button
          type="text"
          size="small"
          icon={<ExportOutlined />}
          aria-label={t('export', 'Export image to JSON')}
          onClick={(event) => {
            event.stopPropagation();
            void (async () => {
              try {
                await exportImageToFile(image);
              } catch (cause) {
                void message.error(serverErrorText(cause));
              }
            })();
          }}
        />
      </Tooltip>,
      !isScada ? (
        <Tooltip key="embed" title={t('embed', 'Embed image')}>
          <Button
            type="text"
            size="small"
            icon={<LinkOutlined />}
            aria-label={t('embed', 'Embed image')}
            onClick={(event) => {
              event.stopPropagation();
              setEmbedTarget(image);
            }}
          />
        </Tooltip>
      ) : null,
      <Tooltip
        key="edit"
        title={
          readonly
            ? t('details', 'Image details')
            : isScada
              ? t('edit', 'Edit SCADA symbol')
              : t('edit', 'Edit image')
        }
      >
        <Button
          type="text"
          size="small"
          icon={<EditOutlined />}
          aria-label={
            readonly
              ? t('details', 'Image details')
              : isScada
                ? t('edit', 'Edit SCADA symbol')
                : t('edit', 'Edit image')
          }
          onClick={(event) => {
            event.stopPropagation();
            openEdit(image);
          }}
        />
      </Tooltip>,
      isDeletable(image) && !selectionMode ? (
        <Tooltip key="delete" title={t('delete', 'Delete image')}>
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            aria-label={t('delete', 'Delete image')}
            onClick={(event) => {
              event.stopPropagation();
              confirmDeleteOne(image);
            }}
          />
        </Tooltip>
      ) : null,
    ].filter(Boolean);
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: action closures re-create per render by design; these deps change the rendered columns
  const columns: ProColumns<ImageResourceInfo>[] = useMemo(() => {
    const cols: ProColumns<ImageResourceInfo>[] = [
      {
        title: t('preview', 'Preview'),
        dataIndex: 'link',
        width: 84,
        render: (_, record) => (
          <ImageThumb image={record} className="h-10 w-16" />
        ),
      },
      {
        title: t('name', 'Name'),
        dataIndex: 'title',
        sorter: true,
        sortOrder: sortOrderFor('title'),
        render: (_, record) => (
          <Typography.Text strong ellipsis className="max-w-64">
            {record.title}
          </Typography.Text>
        ),
      },
      {
        title: t('createdTime', 'Created time'),
        dataIndex: 'createdTime',
        width: 170,
        sorter: true,
        sortOrder: sortOrderFor('createdTime'),
        render: (_, record) =>
          dayjs(record.createdTime).format('YYYY-MM-DD HH:mm:ss'),
      },
      {
        title: t('resolution', 'Resolution'),
        dataIndex: 'descriptor',
        width: 100,
        render: (_, record) => formatResolution(record.descriptor),
      },
      {
        title: t('size', 'Size'),
        dataIndex: 'size',
        width: 90,
        render: (_, record) => formatFileSize(record.descriptor?.size),
      },
    ];
    if (!isSysAdmin && urlState.includeSystemImages) {
      cols.push({
        title: t('system', 'System'),
        dataIndex: 'tenantId',
        width: 90,
        align: 'center',
        render: (_, record) =>
          isSystem(record) ? (
            <Tag color="blue">{t('system', 'System')}</Tag>
          ) : (
            '-'
          ),
      });
    }
    if (!selectionMode) {
      cols.push({
        title: '',
        valueType: 'option',
        width: 180,
        fixed: 'right',
        render: (_, record) => renderActions(record),
      });
    }
    return cols;
  }, [
    formatMessage,
    urlState.sortProperty,
    urlState.sortDirection,
    urlState.includeSystemImages,
    isSysAdmin,
    selectionMode,
    isScada,
    galleryQuery.data,
  ]);

  const onTableChange = (
    pagination: { current?: number; pageSize?: number },
    sorter: { field?: unknown; order?: unknown },
  ) => {
    const property = sorter.field
      ? SORTABLE_COLUMNS[sorter.field as string]
      : undefined;
    if (property && sorter.order) {
      patch({
        sortProperty: property,
        sortDirection: sorter.order === 'ascend' ? 'ASC' : 'DESC',
        page: 1,
      });
    } else if (!sorter.order) {
      // Sort cleared -> back to the default order (createdTime DESC).
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

  // ---- grid mode (scrollable card grid + shared pagination)
  const grid = (
    <div className="flex flex-col gap-3">
      {images.length === 0 && !galleryQuery.isPending ? (
        <Empty description={t('empty', 'No images found')} />
      ) : (
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          }}
          data-testid="image-gallery-grid"
        >
          {images.map((image) => {
            const key = image.resourceKey ?? image.id.id;
            const selected = selectedRowKeys.includes(key);
            return (
              <Card
                key={key}
                size="small"
                hoverable
                data-testid="image-card"
                onClick={() => activateImage(image)}
                styles={{ body: { padding: 12 } }}
                {...(selected ? { 'data-selected': 'true' } : {})}
              >
                <div className="relative">
                  {selected ? (
                    <CheckCircleFilled
                      className="absolute right-1 top-1 z-10 text-xl"
                      data-testid="image-card-selected"
                    />
                  ) : null}
                  <div className="flex h-28 items-center justify-center overflow-hidden">
                    <ImageThumb image={image} className="max-h-28 max-w-full" />
                  </div>
                </div>
                <Typography.Text
                  strong
                  ellipsis
                  className="mt-2 block"
                  title={image.title ?? ''}
                >
                  {image.title}
                </Typography.Text>
                <div className="mt-1 flex items-center justify-between">
                  <Typography.Text type="secondary" className="text-xs">
                    {formatResolution(image.descriptor)}
                  </Typography.Text>
                  {!selectionMode ? (
                    <Space
                      size={0}
                      onClick={(event) => event.stopPropagation()}
                    >
                      {renderActions(image)}
                    </Space>
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}
      <div className="flex justify-end">
        <Pagination
          current={urlState.page}
          pageSize={urlState.pageSize}
          total={galleryQuery.data?.totalElements ?? 0}
          showSizeChanger
          pageSizeOptions={[10, 20, 30, 50, 100]}
          showTotal={(total) =>
            formatMessage(
              { id: k('total'), defaultMessage: '{count} total' },
              { count: total },
            )
          }
          onChange={(page, pageSize) => patch({ page, pageSize })}
        />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-3">
      {galleryQuery.isError && (
        <Alert
          type="error"
          showIcon
          title={t('loadFailed', 'Failed to load images')}
          description={serverErrorText(galleryQuery.error)}
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Segmented<GalleryViewMode>
          value={urlState.mode}
          data-testid="image-gallery-mode"
          onChange={(value) => patch({ mode: value, page: 1 })}
          options={[
            { value: 'list', label: t('listMode', 'List view') },
            { value: 'grid', label: t('gridMode', 'Grid view') },
          ]}
        />
        {!isSysAdmin ? (
          <Space size={6}>
            <Switch
              checked={urlState.includeSystemImages}
              data-testid="image-gallery-include-system"
              onChange={(value) =>
                patch({ includeSystemImages: value, page: 1 })
              }
            />
            <Typography.Text>
              {t('includeSystemImages', 'Include system images')}
            </Typography.Text>
          </Space>
        ) : null}
        <Input
          allowClear
          prefix={<SearchOutlined />}
          className="w-64"
          value={searchInput}
          data-testid="image-gallery-search"
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder={t('search', 'Search image')}
        />
        <Button
          icon={<ReloadOutlined />}
          onClick={() => void galleryQuery.refetch()}
        >
          {t('refresh', 'Refresh')}
        </Button>
        <div className="flex-1" />
        {!selectionMode && selectedRowKeys.length > 0 ? (
          <>
            <Typography.Text data-testid="image-gallery-selected-count">
              {formatMessage(
                {
                  id: k('selectedImages'),
                  defaultMessage:
                    '{count, plural, =1 {1 image} other {# images}} selected',
                },
                { count: selectedRowKeys.length },
              )}
            </Typography.Text>
            <Button
              danger
              icon={<DeleteOutlined />}
              data-testid="image-gallery-batch-delete"
              onClick={confirmDeleteSelected}
            >
              {t('batchDelete', 'Delete selected')}
            </Button>
          </>
        ) : null}
        <Space>
          <Button
            icon={<ImportOutlined />}
            data-testid="image-gallery-import"
            onClick={() => setImportOpen(true)}
          >
            {t('import', 'Import image from JSON')}
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            data-testid="image-gallery-create"
            onClick={() => setUploadOpen(true)}
          >
            {t('upload', 'Upload image')}
          </Button>
        </Space>
      </div>

      {urlState.mode === 'grid' ? (
        grid
      ) : (
        <ProTable<ImageResourceInfo>
          rowKey={(record) => record.resourceKey ?? record.id.id}
          tableAlertRender={false}
          tableAlertOptionRender={false}
          columns={columns}
          dataSource={images}
          loading={galleryQuery.isPending}
          search={false}
          options={false}
          onRow={(record) => ({
            style: { cursor: 'pointer' },
            onClick: () => activateImage(record),
          })}
          onChange={(pagination, _filters, sorter) =>
            onTableChange(
              pagination,
              Array.isArray(sorter) ? sorter[0] : sorter,
            )
          }
          rowSelection={
            !selectionMode && !isScada
              ? {
                  selectedRowKeys,
                  onChange: (keys) => setSelectedRowKeys(keys),
                }
              : undefined
          }
          pagination={{
            current: urlState.page,
            pageSize: urlState.pageSize,
            total: galleryQuery.data?.totalElements ?? 0,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 30, 50, 100],
            showTotal: (total) =>
              formatMessage(
                { id: k('total'), defaultMessage: '{count} total' },
                { count: total },
              ),
          }}
          locale={{
            emptyText: <Empty description={t('empty', 'No images found')} />,
          }}
        />
      )}

      <UploadImageDialog
        open={uploadOpen}
        imageSubType={imageSubType}
        extractUploadTitle={extractUploadTitle}
        onClose={() => setUploadOpen(false)}
        onUploaded={(image) => {
          setUploadOpen(false);
          onUploadedOrImported(image);
        }}
      />

      <Modal
        open={importOpen}
        title={t('import', 'Import image from JSON')}
        destroyOnHidden
        footer={null}
        onCancel={() => setImportOpen(false)}
        data-testid="image-import-dialog"
      >
        <Alert
          type="info"
          showIcon
          className="mb-3"
          title={formatMessage({
            id: k('importHint'),
            defaultMessage: 'Select an exported image JSON file to import.',
          })}
        />
        <input
          type="file"
          accept=".json,application/json"
          data-testid="image-import-file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void runImport(file);
            }
          }}
        />
      </Modal>

      <ImageDetailsDialog
        open={Boolean(detailsTarget)}
        image={detailsTarget}
        readonly={detailsTarget ? isReadonly(detailsTarget) : false}
        onClose={() => setDetailsTarget(undefined)}
        onSaved={() => {
          setDetailsTarget(undefined);
          void invalidate();
          void message.success(t('toastSaved', 'Image saved.'));
        }}
      />

      <EmbedImageDialog
        open={Boolean(embedTarget)}
        image={embedTarget}
        readonly={embedTarget ? isReadonly(embedTarget) : false}
        onClose={() => setEmbedTarget(undefined)}
        onUpdated={() => {
          setEmbedTarget(undefined);
          void invalidate();
        }}
      />

      <ResourcesInUseModal
        open={inUseItems.length > 0}
        multiple={inUseMultiple}
        resources={inUseItems}
        title={
          inUseMultiple
            ? t('inUseManyTitle', 'Images are used by other entities')
            : t('inUseTitle', 'Image is used by other entities')
        }
        message={
          inUseMultiple
            ? t(
                'inUseManyText',
                'Not all images have been deleted because they are used by other entities. Select them below and force-delete if needed.',
              )
            : formatMessage(
                {
                  id: k('inUseText'),
                  defaultMessage:
                    "The image '{title}' was not deleted because it is used by the following entities:",
                },
                { title: inUseItems[0]?.title ?? '' },
              )
        }
        deleteText={t('deleteInUse', 'Delete anyway')}
        cancelText={t('cancel', 'Cancel')}
        titleColumnLabel={t('name', 'Name')}
        referencesColumnLabel={t('references', 'References')}
        confirmLoading={inUseLoading || batchOpen}
        onClose={() => setInUseItems([])}
        onConfirm={confirmForceDelete}
      />
    </div>
  );
}
