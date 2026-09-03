/**
 * React Flow edge type component (M8 brief §3 wave C): the aggregated
 * rule-chain link — bezier path, labels joined ' / ', hover round buttons
 * (edit → link-labels dialog / × → delete) rendered through
 * EdgeLabelRenderer. INPUT virtual edges carry no labels and no edit button.
 *
 * Buttons appear while the edge is hovered OR selected (the hover channel
 * is the canvas-level `hoveredEdgeId`; CSS cannot cross the svg→overlay
 * boundary of EdgeLabelRenderer).
 */

import { CloseOutlined, EditOutlined } from '@ant-design/icons';
import type { EdgeProps } from '@xyflow/react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react';
import { Button, Space, theme } from 'antd';
import { memo } from 'react';

import type { CanvasFlowEdge } from './reconcile';

function RuleChainEdgeView({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<CanvasFlowEdge>) {
  const { token } = theme.useToken();
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const label = data?.labels.join(' / ');
  const showButtons = Boolean(data?.hovered || selected);
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: selected ? token.colorPrimary : token.colorBorder,
          strokeWidth: selected ? 2 : 1.4,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 2,
          }}
          className="nodrag nopan"
          data-testid="rc-edge-label"
        >
          {label ? (
            <span
              style={{
                fontSize: token.fontSizeSM,
                background: token.colorBgContainer,
                border: `1px solid ${token.colorBorder}`,
                borderRadius: token.borderRadiusSM,
                padding: '0 6px',
                color: token.colorText,
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </span>
          ) : null}
          {showButtons ? (
            <Space size={2} data-testid="rc-edge-buttons">
              {data && !data.isInputEdge ? (
                <Button
                  size="small"
                  shape="circle"
                  icon={<EditOutlined />}
                  aria-label="edit-link-labels"
                  data-testid="rc-edge-edit"
                  onClick={(event) => {
                    event.stopPropagation();
                    data?.onEditLabels?.(id);
                  }}
                />
              ) : null}
              <Button
                size="small"
                shape="circle"
                danger
                icon={<CloseOutlined />}
                aria-label="delete-link"
                data-testid="rc-edge-delete"
                onClick={(event) => {
                  event.stopPropagation();
                  data?.onDelete?.(id);
                }}
              />
            </Space>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const RuleChainEdgeViewComponent = memo(RuleChainEdgeView);

/** Module-level edgeTypes constant (stable identity — never inline). */
export const RULE_CHAIN_EDGE_TYPES = {
  ruleChainEdge: RuleChainEdgeViewComponent,
};
