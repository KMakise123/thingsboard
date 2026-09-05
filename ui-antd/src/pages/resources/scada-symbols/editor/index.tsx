/**
 * SCADA symbol editor page (M11 wave-2D, spec §3.3) — the heaviest M11
 * component. ui-ngx `pages/scada-symbol/scada-symbol.component.ts` parity:
 *
 *   - load: image info + symbol bytes (`getImageString` equivalent via the
 *     shared blob loader — the fork image service has no dedicated
 *     string endpoint; the GET /api/images/{type}/{key} body IS the svg);
 *   - save chain (:211-249): canvas getContent + metadata →
 *     updateScadaSymbolMetadataInContent → updateImage → optional
 *     updateImageInfo on title change → reload + re-parse;
 *   - readonly (:486-490): TENANT editing a system symbol (tenantId
 *     NULL_UUID) — every edit control disabled;
 *   - replace SVG (:358-377) via a plain file input (upstream opens its
 *     upload dialog; registered delta), download (:379-404), create
 *     widget (:406-465) with the controllerScript preview geometry
 *     rewrite, and the static preview (:255-298, spec勘误 2026-09-05);
 *   - dirty + controlled exit-confirm Modal (M10 D1 shape, page-owned
 *     state; PageContainer onBack is routed through the same modal).
 *
 * Load failure jumps back to the symbols list (resolver semantics,
 * spec §3.3 route line).
 */
import {
  DownloadOutlined,
  EyeOutlined,
  SaveOutlined,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { history, useModel, useParams } from '@umijs/max';
import { App, Button, Drawer, Modal, Space, Spin, Tooltip } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

import PageContainer from '@/components/layout/page-container';
import { downloadBlob } from '@/components/shared/download-blob';
import {
  parseScadaSymbolMetadataFromContent,
  type ScadaSymbolMetadata,
  updateScadaSymbolMetadataInContent,
} from '@/core/scada/symbol-metadata';
import {
  getImageInfo,
  loadImageBlob,
  updateImage,
  updateImageInfo,
} from '@/services/tb/image';
import {
  getWidgetTypeByFullFqn,
  saveWidgetType,
} from '@/services/tb/widget-type';
import {
  addWidgetFqnToWidgetsBundle,
  getAllWidgetsBundles,
} from '@/services/tb/widgets-bundle';
import type { ImageResourceInfo } from '@/types/tb/image';
import { Authority } from '@/types/tb/user';
import type { WidgetTypeDetails } from '@/types/tb/widget-type';
import type { SymbolEditorCanvasHandle } from './canvas/symbol-editor-canvas';
import { SymbolEditorCanvas } from './canvas/symbol-editor-canvas';
import { CreateWidgetDialog } from './create-widget-dialog';
import { MetadataPanel } from './metadata/metadata-panel';
import { isMetadataValid } from './metadata/metadata-valid';
import { SymbolStaticPreview } from './preview/symbol-static-preview';

/** TB's null-tenant UUID (the system marker; ui-ngx NULL_UUID). */
const NULL_UUID = '13814000-1dd2-11b2-8080-808080808080';

const SYMBOL_LIST_ROUTE = '/resources/scada-symbols';

export default function ScadaSymbolEditorPage() {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const params = useParams<{ type: string; key: string }>();
  const { initialState } = useModel('@@initialState');

  const type = imageScopeFromParam(params.type);
  const resourceKey = decodeURIComponent(params.key ?? '');

  const canvasRef = useRef<SymbolEditorCanvasHandle | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  const [imageInfo, setImageInfo] = useState<ImageResourceInfo | null>(null);
  const [content, setContent] = useState('');
  const [metadata, setMetadata] = useState<ScadaSymbolMetadata>(() => ({
    title: '',
    widgetSizeX: 3,
    widgetSizeY: 3,
    tags: [],
    behavior: [],
    properties: [],
  }));
  const [canvasTags, setCanvasTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirtyContent, setDirtyContent] = useState(false);
  const [dirtyMetadata, setDirtyMetadata] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('general');
  const [exitConfirmOpen, setExitConfirmOpen] = useState(false);
  const [createWidgetOpen, setCreateWidgetOpen] = useState(false);
  const [creatingWidget, setCreatingWidget] = useState(false);

  const dirty = dirtyContent || dirtyMetadata;

  const authority = initialState?.currentUser?.authority;
  const readonly = useMemo(() => {
    if (authority === Authority.SYS_ADMIN) {
      return false;
    }
    if (authority === Authority.TENANT_ADMIN) {
      return imageInfo?.tenantId?.id === NULL_UUID;
    }
    return true;
  }, [authority, imageInfo]);

  const bundlesQuery = useQuery({
    queryKey: ['scada-editor', 'bundles'],
    queryFn: getAllWidgetsBundles,
    enabled: createWidgetOpen,
  });

  // ---- load (resolver semantics: failure → back to the list) -----------
  const applyLoaded = useCallback((info: ImageResourceInfo, svg: string) => {
    setImageInfo(info);
    setContent(svg);
    setMetadata(parseScadaSymbolMetadataFromContent(svg));
    setDirtyContent(false);
    setDirtyMetadata(false);
    setPreviewMode(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const info = await getImageInfo(type, resourceKey);
        const blob = await loadImageBlob(
          info.link ?? `/api/images/${type}/${encodeURIComponent(resourceKey)}`,
        );
        const svg = await blob.text();
        if (!cancelled) {
          applyLoaded(info, svg);
        }
      } catch {
        if (!cancelled) {
          message.error(
            formatMessage({
              id: 'pages.resources.scadaSymbolEditor.loadFailed',
              defaultMessage:
                'Failed to load the symbol; returning to the list.',
            }),
          );
          history.push(SYMBOL_LIST_ROUTE);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // Reloads when the route entity changes; message/formatMessage/
    // applyLoaded are stable identities.
  }, [type, resourceKey, message, formatMessage, applyLoaded]);

  // Hard-navigation guard (SPA exits are handled by the controlled Modal).
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty) {
        return;
      }
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  // ---- save chain -------------------------------------------------------
  const prepareContent = (): string => {
    const svgContent = canvasRef.current?.getContent();
    if (!svgContent) {
      throw new Error('The symbol content is not loaded.');
    }
    return updateScadaSymbolMetadataInContent(svgContent, metadata);
  };

  const reloadFromServer = async (info: ImageResourceInfo) => {
    const fresh = await getImageInfo(type, info.resourceKey ?? resourceKey);
    const blob = await loadImageBlob(
      fresh.link ?? `/api/images/${type}/${encodeURIComponent(resourceKey)}`,
    );
    applyLoaded(fresh, await blob.text());
  };

  const handleSave = async () => {
    if (!imageInfo) {
      return;
    }
    if (!isMetadataValid(metadata)) {
      setDrawerOpen(true);
      message.error(
        formatMessage({
          id: 'pages.resources.scadaSymbolEditor.metadataInvalid',
          defaultMessage:
            'The metadata panel has validation errors; fix them first.',
        }),
      );
      return;
    }
    setSaving(true);
    try {
      const full = prepareContent();
      const mediaType = imageInfo.descriptor?.mediaType ?? 'image/svg+xml';
      const file = new File(
        [full],
        imageInfo.fileName ?? `${resourceKey}.svg`,
        { type: mediaType },
      );
      let info = await updateImage(
        type,
        imageInfo.resourceKey ?? resourceKey,
        file,
      );
      if (metadata.title !== imageInfo.title) {
        info = await updateImageInfo({ ...info, title: metadata.title });
      }
      await reloadFromServer(info);
      message.success(
        formatMessage({
          id: 'pages.resources.scadaSymbolEditor.saveSuccess',
          defaultMessage: 'Symbol saved',
        }),
      );
    } catch (e) {
      message.error(
        formatMessage(
          {
            id: 'pages.resources.scadaSymbolEditor.saveFailed',
            defaultMessage: 'Failed to save the symbol: {message}',
          },
          { message: e instanceof Error ? e.message : String(e) },
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  // ---- download / replace ----------------------------------------------
  const triggerDownload = (full: string) => {
    const blob = new Blob([full], {
      type: imageInfo?.descriptor?.mediaType ?? 'image/svg+xml',
    });
    downloadBlob(blob, imageInfo?.fileName ?? `${resourceKey}.svg`);
  };

  const handleDownload = () => {
    try {
      triggerDownload(prepareContent());
    } catch (e) {
      message.error(
        formatMessage(
          {
            id: 'pages.resources.scadaSymbolEditor.saveFailed',
            defaultMessage: 'Failed to save the symbol: {message}',
          },
          { message: e instanceof Error ? e.message : String(e) },
        ),
      );
    }
  };

  const handleReplaceFile = async (file: File) => {
    const svg = await file.text();
    setContent(svg);
    setMetadata(parseScadaSymbolMetadataFromContent(svg));
    setDirtyContent(true);
  };

  // ---- preview ----------------------------------------------------------
  const enterPreview = () => {
    try {
      setPreviewContent(prepareContent());
      setPreviewMode(true);
    } catch (e) {
      message.error(
        formatMessage(
          {
            id: 'pages.resources.scadaSymbolEditor.saveFailed',
            defaultMessage: 'Failed to save the symbol: {message}',
          },
          { message: e instanceof Error ? e.message : String(e) },
        ),
      );
    }
  };

  // ---- create widget ----------------------------------------------------
  const handleCreateWidget = async (values: {
    widgetName: string;
    widgetBundleId?: string;
  }) => {
    if (!imageInfo) {
      return;
    }
    setCreatingWidget(true);
    try {
      const template = await getWidgetTypeByFullFqn('system.scada_symbol');
      const symbolUrl = `tb-image;${imageInfo.link}`;
      // Clone through JSON: the template's server-assigned fields (fqn,
      // id) must not leak into the create call (upstream :422-431).
      const widget = JSON.parse(JSON.stringify(template)) as WidgetTypeDetails;
      widget.image = symbolUrl;
      widget.description = metadata.description;
      widget.tags = metadata.searchTags;
      // The scope-qualified fqn and the server id must not leak into the
      // create call (upstream :429-430).
      (widget as { fqn?: string }).fqn = undefined;
      widget.id = undefined;
      (widget as { name?: string }).name = values.widgetName;
      const descriptor = widget.descriptor ?? {};
      descriptor.sizeX = metadata.widgetSizeX;
      descriptor.sizeY = metadata.widgetSizeY;
      const rawController = descriptor.controllerScript;
      const controllerScript =
        typeof rawController === 'string'
          ? rawController
          : ((rawController as { body?: string } | undefined)?.body ?? '');
      descriptor.controllerScript = controllerScript
        .replaceAll(
          /previewWidth: '\d*px'/gm,
          `previewWidth: '${metadata.widgetSizeX * 100}px'`,
        )
        .replaceAll(
          /previewHeight: '\d*px'/gm,
          `previewHeight: '${metadata.widgetSizeY * 100 + 20}px'`,
        );
      const config = JSON.parse(descriptor.defaultConfig || '{}') as {
        title?: string;
        settings?: Record<string, unknown>;
      };
      config.title = values.widgetName;
      config.settings = config.settings ?? {};
      config.settings.scadaSymbolUrl = symbolUrl;
      descriptor.defaultConfig = JSON.stringify(config);
      widget.descriptor = descriptor;
      const saved = await saveWidgetType(widget);
      if (values.widgetBundleId && saved.fqn) {
        await addWidgetFqnToWidgetsBundle(values.widgetBundleId, saved.fqn);
      }
      message.success(
        formatMessage({
          id: 'pages.resources.scadaSymbolEditor.createWidget.success',
          defaultMessage: 'Widget created',
        }),
      );
      setCreateWidgetOpen(false);
    } catch {
      message.error(
        formatMessage({
          id: 'pages.resources.scadaSymbolEditor.createWidget.failed',
          defaultMessage: 'Failed to create the widget',
        }),
      );
    } finally {
      setCreatingWidget(false);
    }
  };

  // ---- exit -------------------------------------------------------------
  const requestExit = useCallback(() => {
    if (dirty) {
      setExitConfirmOpen(true);
      return;
    }
    history.push(SYMBOL_LIST_ROUTE);
  }, [dirty]);

  const focusTagFunctions = (tag: string) => {
    setDrawerOpen(true);
    setActiveTab('tags');
    void tag;
  };

  const title = imageInfo?.title || resourceKey;

  const toolbar = (
    <Space wrap>
      <Tooltip
        title={
          readonly
            ? formatMessage({
                id: 'pages.resources.scadaSymbolEditor.readonlyHint',
                defaultMessage:
                  'System symbols are read-only for tenants; editing controls are disabled.',
              })
            : undefined
        }
      >
        <Button
          icon={<UploadOutlined />}
          disabled={readonly}
          onClick={() => replaceInputRef.current?.click()}
          data-testid="scada-replace"
        >
          {formatMessage({
            id: 'pages.resources.scadaSymbolEditor.replaceSvg',
            defaultMessage: 'Replace SVG',
          })}
        </Button>
      </Tooltip>
      <Button
        icon={<DownloadOutlined />}
        disabled={loading}
        onClick={handleDownload}
        data-testid="scada-download"
      >
        {formatMessage({
          id: 'pages.resources.scadaSymbolEditor.download',
          defaultMessage: 'Download symbol',
        })}
      </Button>
      <Button
        icon={<UserOutlined />}
        disabled={loading}
        onClick={() => setCreateWidgetOpen(true)}
        data-testid="scada-create-widget"
      >
        {formatMessage({
          id: 'pages.resources.scadaSymbolEditor.createWidget',
          defaultMessage: 'Create widget from symbol',
        })}
      </Button>
      <Button
        icon={<EyeOutlined />}
        disabled={loading}
        onClick={enterPreview}
        data-testid="scada-preview"
      >
        {formatMessage({
          id: 'pages.resources.scadaSymbolEditor.preview',
          defaultMessage: 'Preview',
        })}
      </Button>
      <Button
        type="primary"
        icon={<SaveOutlined />}
        loading={saving}
        disabled={readonly || loading || !dirty}
        onClick={handleSave}
        data-testid="scada-save"
      >
        {formatMessage({
          id: 'pages.resources.scadaSymbolEditor.save',
          defaultMessage: 'Save',
        })}
      </Button>
    </Space>
  );

  return (
    <PageContainer
      title={title}
      breadcrumbLabel={title}
      onBack={requestExit}
      extra={toolbar}
    >
      <div style={{ display: 'none' }}>
        <input
          ref={replaceInputRef}
          type="file"
          accept=".svg,image/svg+xml"
          data-testid="scada-replace-input"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) {
              void handleReplaceFile(file);
            }
          }}
        />
      </div>
      {loading ? (
        <div
          style={{ display: 'flex', justifyContent: 'center', padding: 80 }}
          data-testid="scada-editor-loading"
        >
          <Spin size="large" />
        </div>
      ) : previewMode ? (
        <SymbolStaticPreview
          content={previewContent}
          sizeX={metadata.widgetSizeX}
          sizeY={metadata.widgetSizeY}
          onBack={() => setPreviewMode(false)}
        />
      ) : (
        <div
          style={{
            display: 'flex',
            gap: 8,
            height: 'calc(100vh - 190px)',
            minHeight: 320,
          }}
          data-testid="scada-editor-workspace"
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <SymbolEditorCanvas
              ref={canvasRef}
              content={content}
              readonly={readonly}
              onEdit={() => setDirtyContent(true)}
              onTagsChanged={setCanvasTags}
              editTagStateRenderFunction={focusTagFunctions}
              editTagClickAction={focusTagFunctions}
            />
          </div>
          <Drawer
            placement="right"
            open={drawerOpen}
            mask={false}
            width={560}
            onClose={() => setDrawerOpen(false)}
            title={formatMessage({
              id: 'pages.resources.scadaSymbolEditor.metadata',
              defaultMessage: 'Metadata panel',
            })}
            data-testid="scada-metadata-drawer"
          >
            <MetadataPanel
              metadata={metadata}
              onChange={(next) => {
                setMetadata(next);
                setDirtyMetadata(true);
              }}
              canvasTags={canvasTags}
              disabled={readonly}
              activeTab={activeTab}
              onActiveTabChange={setActiveTab}
            />
          </Drawer>
        </div>
      )}

      {/* M10 D1 family: controlled exit confirm owned by this page —
          never an imperative App-context confirm. */}
      <Modal
        open={exitConfirmOpen}
        title={formatMessage({
          id: 'pages.resources.scadaSymbolEditor.exitDirtyTitle',
          defaultMessage: 'Unsaved changes',
        })}
        okText={formatMessage({
          id: 'pages.resources.scadaSymbolEditor.exitDirtyOk',
          defaultMessage: 'Discard changes',
        })}
        okButtonProps={{ danger: true, 'data-testid': 'scada-exit-confirm-ok' }}
        cancelText={formatMessage({
          id: 'pages.common.cancel',
          defaultMessage: 'Cancel',
        })}
        cancelButtonProps={{ 'data-testid': 'scada-exit-confirm-cancel' }}
        onOk={() => {
          setExitConfirmOpen(false);
          history.push(SYMBOL_LIST_ROUTE);
        }}
        onCancel={() => setExitConfirmOpen(false)}
        maskClosable={false}
        data-testid="scada-exit-confirm"
      >
        {formatMessage({
          id: 'pages.resources.scadaSymbolEditor.exitDirtyText',
          defaultMessage:
            'The editor has unsaved changes; leaving discards them.',
        })}
      </Modal>

      <CreateWidgetDialog
        open={createWidgetOpen}
        defaultName={metadata.title}
        bundles={bundlesQuery.data}
        confirmLoading={creatingWidget}
        onCreate={(values) => {
          void handleCreateWidget(values);
        }}
        onClose={() => setCreateWidgetOpen(false)}
      />
    </PageContainer>
  );
}

/** Normalize the route scope param to `tenant|system` (defensive). */
function imageScopeFromParam(scope: string | undefined): 'tenant' | 'system' {
  return scope === 'system' ? 'system' : 'tenant';
}
