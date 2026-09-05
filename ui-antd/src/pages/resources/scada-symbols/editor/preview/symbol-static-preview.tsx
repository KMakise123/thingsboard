/**
 * SymbolStaticPreview — the STATIC preview mode (M11 wave-2D, spec §3.3
 * as corrected 2026-09-05): the symbol SVG is rendered at the metadata
 * widget size with a zoom viewer. No dashboard, no data source bindings —
 * the live-preview upgrade is parked on the scada runtime renderer gap
 * (spec §3.8).
 *
 * Cell geometry follows the upstream widget preview convention
 * (scada-symbol.component.ts:442-444): one grid cell = 100px.
 */
import { ZoomInOutlined, ZoomOutOutlined } from '@ant-design/icons';
import { Button, Space, Tooltip, Typography } from 'antd';
import { useState } from 'react';
import { useIntl } from 'react-intl';

export interface SymbolStaticPreviewProps {
  /** Full symbol content (metadata included) — rendered as-is. */
  content: string;
  sizeX: number;
  sizeY: number;
  onBack: () => void;
}

const CELL_PX = 100;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 1.2;

export function SymbolStaticPreview({
  content,
  sizeX,
  sizeY,
  onBack,
}: SymbolStaticPreviewProps) {
  const { formatMessage } = useIntl();
  const [zoom, setZoom] = useState(1);
  const zoomButtons = (
    <Space>
      <Tooltip
        title={formatMessage({
          id: 'pages.resources.scadaSymbolEditor.zoomIn',
          defaultMessage: 'Zoom in',
        })}
      >
        <Button
          icon={<ZoomInOutlined />}
          onClick={() => setZoom((z) => Math.min(z * ZOOM_STEP, MAX_ZOOM))}
          disabled={zoom >= MAX_ZOOM}
          data-testid="scada-preview-zoom-in"
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
          onClick={() => setZoom((z) => Math.max(z / ZOOM_STEP, MIN_ZOOM))}
          disabled={zoom <= MIN_ZOOM}
          data-testid="scada-preview-zoom-out"
        />
      </Tooltip>
    </Space>
  );

  return (
    <div
      data-testid="scada-symbol-static-preview"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        height: '100%',
        minHeight: 0,
        padding: 16,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <Button onClick={onBack} data-testid="scada-preview-back">
            {formatMessage({
              id: 'pages.resources.scadaSymbolEditor.preview.back',
              defaultMessage: 'Back to editing',
            })}
          </Button>
          <Typography.Text type="secondary">
            {formatMessage(
              {
                id: 'pages.resources.scadaSymbolEditor.preview.size',
                defaultMessage:
                  'Rendered at the metadata size ({sizeX}×{sizeY} cells)',
              },
              { sizeX, sizeY },
            )}
          </Typography.Text>
        </Space>
        {zoomButtons}
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'auto',
        }}
      >
        <div
          style={{
            width: sizeX * CELL_PX,
            height: sizeY * CELL_PX,
            transform: `scale(${zoom})`,
            transformOrigin: 'center center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          data-testid="scada-preview-stage"
        >
          <div
            style={{ width: '100%', height: '100%' }}
            data-testid="scada-preview-svg"
            // The symbol content is the tenant's own stored SVG — rendered
            // inline exactly like the canvas face and the future widget
            // runtime do (script tags are inert via innerHTML).
            //
            // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted stored symbol content, see above
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </div>
    </div>
  );
}

export default SymbolStaticPreview;
