/**
 * Rule-chain canvas geometry (M8 brief §2): canvas auto-expansion with the
 * ui-ngx `adjustCanvasSize` semantics (rulechain-page: the canvas grows when
 * content approaches/outgrows the current bounds, threshold 100 px) carried
 * by React Flow's `translateExtent`.
 *
 * Expansion timing — dragStop one-shot: the extent is re-derived from the
 * DRAFT on every session change (add/move/delete all commit at dragStop or
 * dialog confirm), so content beyond the current bound + threshold expands
 * the pannable area right after the draft lands. Progressive mid-drag
 * expansion was deliberately NOT chosen: RF already auto-pans the viewport
 * during a drag (autoPanOnNodeDrag), and one-shot expansion keeps the
 * extent a pure function of the draft (no interaction feedback loop).
 */
import type { CoordinateExtent } from '@xyflow/system';

import type { CanvasRuleChain } from '@/core/rulechain/types';

/** ui-ngx adjustCanvasSize threshold (px of slack before the canvas grows). */
export const CANVAS_EXPAND_THRESHOLD_PX = 100;

/** ui-ngx rule node card size (brief §1: 节点 170×50). */
export const RULE_NODE_WIDTH = 170;
export const RULE_NODE_HEIGHT = 50;

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Union of every element's rectangle plus the flow origin (0,0). */
export function canvasContentBounds(draft: CanvasRuleChain): Bounds {
  const bounds: Bounds = { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  const grow = (minX: number, minY: number, maxX: number, maxY: number) => {
    bounds.minX = Math.min(bounds.minX, minX);
    bounds.minY = Math.min(bounds.minY, minY);
    bounds.maxX = Math.max(bounds.maxX, maxX);
    bounds.maxY = Math.max(bounds.maxY, maxY);
  };
  for (const node of Object.values(draft.nodes)) {
    grow(node.x, node.y, node.x + RULE_NODE_WIDTH, node.y + RULE_NODE_HEIGHT);
  }
  for (const note of draft.notes) {
    grow(note.x, note.y, note.x + note.width, note.y + note.height);
  }
  return bounds;
}

/**
 * The pannable extent: content bounds padded by the expansion threshold,
 * always covering at least the visible viewport measured from the origin.
 */
export function canvasExtent(
  draft: CanvasRuleChain,
  viewport: { width: number; height: number },
): CoordinateExtent {
  const bounds = canvasContentBounds(draft);
  const t = CANVAS_EXPAND_THRESHOLD_PX;
  const minX = Math.min(0 - t, bounds.minX - t);
  const minY = Math.min(0 - t, bounds.minY - t);
  const maxX = Math.max(viewport.width + t, bounds.maxX + t);
  const maxY = Math.max(viewport.height + t, bounds.maxY + t);
  return [
    [minX, minY],
    [maxX, maxY],
  ];
}
