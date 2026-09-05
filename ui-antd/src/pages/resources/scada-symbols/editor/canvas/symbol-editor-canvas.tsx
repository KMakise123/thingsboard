/**
 * SymbolEditorCanvas — the React face of the symbol canvas (M11 wave-2D).
 *
 * Owns the svg/xml mode switch (ui-ngx ScadaSymbolEditorComponent :100-240
 * parity): svg mode drives the SymbolCanvas edit object, xml mode edits the
 * raw SVG in a CodeMirror surface; switching back validates the document
 * and re-mounts the canvas (invalid XML keeps the user in xml mode).
 * getTags/getContent are mode-aware — in xml mode tags come from the
 * tb:tag regex scan (upstream :177-191).
 *
 * The hover panels the canvas requests are rendered as antd Popovers
 * anchored to a zero-size span positioned over the hovered element
 * (upstream uses jQuery tooltipster — fork spec §3.8: no jQuery). A short
 * close grace keeps the panel alive while the pointer travels from the
 * SVG element into the panel (tooltipster's interactive behavior).
 */
import {
  CheckOutlined,
  CloseOutlined,
  TagOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from '@ant-design/icons';
import { Button, Input, Popover, Segmented, Space, Tooltip, theme } from 'antd';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { useIntl } from 'react-intl';

import { CodeEditor } from '@/components/code-editor';
import {
  parseScadaSymbolsTagsFromContent,
  validateSvgDocument,
} from '@/core/scada/symbol-metadata';

import {
  SymbolCanvas,
  type SymbolCanvasTheme,
  type SymbolPanelState,
} from './symbol-canvas';

export type SymbolEditorMode = 'svg' | 'xml';

export interface SymbolEditorCanvasHandle {
  getContent: () => string | null;
  getTags: () => string[];
  getMode: () => SymbolEditorMode;
}

export interface SymbolEditorCanvasProps {
  /** Saved content (metadata included; stripped for the canvas). */
  content: string;
  readonly: boolean;
  /** Any canvas or xml edit — the page flips its dirty flag. */
  onEdit: () => void;
  onTagsChanged: (tags: string[]) => void;
  /** Jump to the metadata tags tab for a tag's functions. */
  editTagStateRenderFunction?: (tag: string) => void;
  editTagClickAction?: (tag: string) => void;
}

const PANEL_CLOSE_GRACE_MS = 220;

export const SymbolEditorCanvas = forwardRef<
  SymbolEditorCanvasHandle,
  SymbolEditorCanvasProps
>(function SymbolEditorCanvas(
  {
    content,
    readonly,
    onEdit,
    onTagsChanged,
    editTagStateRenderFunction,
    editTagClickAction,
  }: SymbolEditorCanvasProps,
  ref,
) {
  const { formatMessage } = useIntl();
  const { token } = theme.useToken();

  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<SymbolCanvas | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const panelHoveredRef = useRef(false);
  const tagEditingRef = useRef(false);
  // Latest props for the mount-only canvas effect (stable listener refs).
  const propsRef = useRef({ readonly, onEdit, onTagsChanged });
  propsRef.current = { readonly, onEdit, onTagsChanged };

  const [mode, setMode] = useState<SymbolEditorMode>('svg');
  const [xmlContent, setXmlContent] = useState('');
  const [hasHidden, setHasHidden] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [zoomState, setZoomState] = useState({ in: false, out: true });
  const [panel, setPanel] = useState<SymbolPanelState | null>(null);
  const [panelClosing, setPanelClosing] = useState(false);
  const [panelHovered, setPanelHovered] = useState(false);
  const [tagEditing, setTagEditing] = useState(false);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    tagEditingRef.current = tagEditing;
  }, [tagEditing]);
  useEffect(() => {
    panelHoveredRef.current = panelHovered;
    if (panelHovered) {
      cancelPanelClose();
    }
  }, [panelHovered]);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const cancelPanelClose = useCallback(() => {
    clearCloseTimer();
    setPanelClosing(false);
  }, [clearCloseTimer]);

  const schedulePanelClose = useCallback(() => {
    clearCloseTimer();
    setPanelClosing(true);
    closeTimerRef.current = setTimeout(() => {
      closeTimerRef.current = null;
      if (!panelHoveredRef.current && !tagEditingRef.current) {
        setPanel(null);
      }
      setPanelClosing(false);
    }, PANEL_CLOSE_GRACE_MS);
  }, [clearCloseTimer]);

  const syncCanvasUiState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    setZoomState({
      in: canvas.zoomInDisabled(),
      out: canvas.zoomOutDisabled(),
    });
    setHasHidden(canvas.hasHiddenElements());
  }, []);

  // ---- canvas lifecycle (mount once; content updates flow separately) --
  useEffect(() => {
    if (!hostRef.current) {
      return;
    }
    const canvasTheme: SymbolCanvasTheme = {
      glowLight: token.colorBgContainer,
      glowDark: token.colorText,
      groupStroke: token.colorBorder,
    };
    const canvas = new SymbolCanvas(
      hostRef.current,
      {
        tagsUpdated: (tags) => propsRef.current.onTagsChanged(tags),
        dirtyChanged: () => propsRef.current.onEdit(),
        hiddenElementsChanged: (hidden) => setHasHidden(hidden),
        zoomChanged: () => syncCanvasUiState(),
        panelChanged: (state) => {
          if (state === null) {
            if (!tagEditingRef.current) {
              schedulePanelClose();
            }
            return;
          }
          if (propsRef.current.readonly) {
            return;
          }
          cancelPanelClose();
          setPanel(state);
        },
      },
      readonly,
    );
    canvas.applyTheme(canvasTheme);
    canvas.setContent(content);
    canvas.observeResize();
    canvasRef.current = canvas;
    syncCanvasUiState();
    return () => {
      clearCloseTimer();
      canvas.destroy();
      canvasRef.current = null;
    };
    // Mount/unmount only — content updates flow through the effect below.
  }, [content]);

  useEffect(() => {
    canvasRef.current?.setReadOnly(readonly);
  }, [readonly]);

  useImperativeHandle(ref, () => ({
    getContent: () => {
      if (mode === 'xml') {
        return xmlContent;
      }
      return canvasRef.current?.getContent() ?? null;
    },
    getTags: () => {
      if (mode === 'xml') {
        return parseScadaSymbolsTagsFromContent(xmlContent);
      }
      return canvasRef.current?.getTags() ?? [];
    },
    getMode: () => mode,
  }));

  const switchMode = (next: SymbolEditorMode) => {
    if (next === mode) {
      return;
    }
    if (next === 'xml') {
      setXmlContent(canvasRef.current?.getContent() ?? content);
      setMode('xml');
      return;
    }
    try {
      validateSvgDocument(xmlContent);
    } catch {
      // Stay in xml mode — the document must be fixed first (upstream
      // surfaces the same failure at save time; the fork also gates the
      // mode switch).
      return;
    }
    setMode('svg');
    canvasRef.current?.setContent(xmlContent);
    setShowHidden(false);
    syncCanvasUiState();
  };

  const toggleShowHidden = () => {
    const next = !showHidden;
    setShowHidden(next);
    canvasRef.current?.showHiddenElements(next);
  };

  // ---- hover panel actions ---------------------------------------------
  const refreshPanel = (handle: number) => {
    setPanel(canvasRef.current?.panelStateFor(handle) ?? null);
  };

  const applyTag = () => {
    if (!panel || !tagInput.trim()) {
      return;
    }
    canvasRef.current?.setTagForElement(panel.handle, tagInput.trim());
    setTagEditing(false);
    setTagInput('');
    refreshPanel(panel.handle);
  };

  const removeTag = () => {
    if (!panel) {
      return;
    }
    canvasRef.current?.clearTagForElement(panel.handle);
    refreshPanel(panel.handle);
  };

  const panelOpen =
    panel !== null && (!panelClosing || panelHovered || tagEditing);

  const anchorStyle: React.CSSProperties = panel
    ? {
        position: 'fixed',
        left: panel.anchor.left + panel.anchor.width / 2,
        top: panel.anchor.top + panel.anchor.height / 2 + panel.offsetPx,
        width: 0,
        height: 0,
      }
    : { display: 'none' };

  const hoverProps = {
    onMouseEnter: () => setPanelHovered(true),
    onMouseLeave: () => setPanelHovered(false),
  };

  const panelContent = () => {
    if (!panel) {
      return null;
    }
    if (tagEditing) {
      return (
        <Space.Compact data-testid="scada-tag-input-panel" {...hoverProps}>
          <Input
            autoFocus
            value={tagInput}
            placeholder={formatMessage({
              id: 'pages.resources.scadaSymbolEditor.panel.tagPlaceholder',
              defaultMessage: 'Tag name',
            })}
            onChange={(e) => setTagInput(e.target.value)}
            onPressEnter={applyTag}
            style={{ width: 140 }}
          />
          <Button
            icon={<CheckOutlined />}
            disabled={!tagInput.trim()}
            onClick={applyTag}
            data-testid="scada-tag-apply"
          />
          <Button
            icon={<CloseOutlined />}
            onClick={() => {
              setTagEditing(false);
              setTagInput('');
            }}
            data-testid="scada-tag-cancel"
          />
        </Space.Compact>
      );
    }
    return (
      <div
        data-testid="scada-canvas-panel"
        {...hoverProps}
        style={{ display: 'flex', alignItems: 'center', gap: 8 }}
      >
        <span>
          {panel.elementType}
          {panel.invisible
            ? ` (${formatMessage({
                id: 'pages.resources.scadaSymbolEditor.panel.hidden',
                defaultMessage: 'hidden',
              })})`
            : ''}
        </span>
        {panel.tag ? (
          <>
            <TagOutlined />
            <span data-testid="scada-panel-tag">{panel.tag}</span>
            <Button
              size="small"
              onClick={() => {
                setTagInput(panel.tag ?? '');
                setTagEditing(true);
              }}
              data-testid="scada-tag-update"
            >
              {formatMessage({
                id: 'pages.resources.scadaSymbolEditor.panel.updateTag',
                defaultMessage: 'Update tag',
              })}
            </Button>
            <Button
              size="small"
              danger
              onClick={removeTag}
              data-testid="scada-tag-remove"
            >
              {formatMessage({
                id: 'pages.resources.scadaSymbolEditor.panel.removeTag',
                defaultMessage: 'Remove tag',
              })}
            </Button>
            <Tooltip
              title={formatMessage({
                id: 'pages.resources.scadaSymbolEditor.panel.editStateRender',
                defaultMessage: 'Tag render function',
              })}
            >
              <Button
                size="small"
                onClick={() => editTagStateRenderFunction?.(panel.tag ?? '')}
              >
                f(x)
              </Button>
            </Tooltip>
            <Tooltip
              title={formatMessage({
                id: 'pages.resources.scadaSymbolEditor.panel.editClickAction',
                defaultMessage: 'Click action function',
              })}
            >
              <Button
                size="small"
                onClick={() => editTagClickAction?.(panel.tag ?? '')}
              >
                click
              </Button>
            </Tooltip>
          </>
        ) : (
          <Button
            size="small"
            type="primary"
            ghost
            icon={<TagOutlined />}
            onClick={() => {
              setTagInput('');
              setTagEditing(true);
            }}
            data-testid="scada-tag-add"
          >
            {formatMessage({
              id: 'pages.resources.scadaSymbolEditor.panel.addTag',
              defaultMessage: 'Add tag',
            })}
          </Button>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        overflow: 'hidden',
      }}
      data-testid="scada-symbol-editor-canvas"
    >
      <div
        style={{
          position: 'absolute',
          top: 8,
          left: 8,
          right: 8,
          display: 'flex',
          justifyContent: 'space-between',
          zIndex: 3,
          pointerEvents: 'none',
        }}
      >
        <Segmented
          value={mode}
          onChange={(value) => switchMode(value as SymbolEditorMode)}
          options={[
            {
              value: 'svg',
              label: formatMessage({
                id: 'pages.resources.scadaSymbolEditor.modeSvg',
                defaultMessage: 'Graphic',
              }),
            },
            {
              value: 'xml',
              label: formatMessage({
                id: 'pages.resources.scadaSymbolEditor.modeXml',
                defaultMessage: 'XML',
              }),
            },
          ]}
          style={{ pointerEvents: 'auto' }}
        />
        {mode === 'svg' ? (
          <Space style={{ pointerEvents: 'auto' }}>
            {hasHidden ? (
              <Button
                type={showHidden ? 'primary' : 'default'}
                onClick={toggleShowHidden}
                data-testid="scada-show-hidden"
              >
                {formatMessage({
                  id: 'pages.resources.scadaSymbolEditor.showHidden',
                  defaultMessage: 'Show hidden elements',
                })}
              </Button>
            ) : null}
            <Tooltip
              title={formatMessage({
                id: 'pages.resources.scadaSymbolEditor.zoomIn',
                defaultMessage: 'Zoom in',
              })}
            >
              <Button
                icon={<ZoomInOutlined />}
                disabled={zoomState.in}
                onClick={() => canvasRef.current?.zoomIn()}
                data-testid="scada-zoom-in"
              />
            </Tooltip>
            <Tooltip
              title={formatMessage({
                id: 'pages.resources.scadaSymbolEditor.zoomOut',
                defaultMessage: 'Zoom out',
              })}
            >
              <Button
                icon={<ZoomOutOutlined />}
                disabled={zoomState.out}
                onClick={() => canvasRef.current?.zoomOut()}
                data-testid="scada-zoom-out"
              />
            </Tooltip>
          </Space>
        ) : null}
      </div>

      {mode === 'svg' ? (
        <div
          ref={hostRef}
          data-testid="scada-canvas-host"
          style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}
        />
      ) : (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: 'auto',
            padding: 8,
            paddingTop: 48,
          }}
          data-testid="scada-xml-editor"
        >
          <CodeEditor
            value={xmlContent}
            height="100%"
            readOnly={readonly}
            onChange={(value) => {
              setXmlContent(value);
              propsRef.current.onEdit();
            }}
            data-testid="scada-xml-code"
          />
        </div>
      )}

      {/* Hover tag panel — anchored over the hovered SVG element. */}
      <Popover
        open={panelOpen}
        content={panelContent()}
        placement="top"
        arrow
        styles={{ body: { padding: '4px 8px' } }}
      >
        <span data-testid="scada-panel-anchor" style={anchorStyle} />
      </Popover>
    </div>
  );
});

export default SymbolEditorCanvas;
