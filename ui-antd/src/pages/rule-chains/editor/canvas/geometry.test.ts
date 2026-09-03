import { describe, expect, it } from 'vitest';

import {
  CANVAS_EXPAND_THRESHOLD_PX,
  canvasContentBounds,
  canvasExtent,
} from './geometry';
import { emptyDraft, node, rowDraft } from './test-helpers';

describe('canvasExtent — adjustCanvasSize semantics (dragStop one-shot)', () => {
  it('covers the viewport plus threshold on an empty canvas', () => {
    const extent = canvasExtent(emptyDraft(), { width: 800, height: 600 });
    expect(extent[0][0]).toBe(0 - CANVAS_EXPAND_THRESHOLD_PX);
    expect(extent[0][1]).toBe(0 - CANVAS_EXPAND_THRESHOLD_PX);
    expect(extent[1][0]).toBe(800 + CANVAS_EXPAND_THRESHOLD_PX);
    expect(extent[1][1]).toBe(600 + CANVAS_EXPAND_THRESHOLD_PX);
  });

  it('expands beyond content by the 100px threshold', () => {
    const draft = rowDraft(2);
    draft.nodes['local-1'].x = 1000;
    draft.nodes['local-1'].y = -50;
    const bounds = canvasContentBounds(draft);
    expect(bounds.maxX).toBe(1000 + 170); // ui-ngx node width
    expect(bounds.minY).toBe(-50);
    const extent = canvasExtent(draft, { width: 800, height: 600 });
    expect(extent[1][0]).toBe(1000 + 170 + CANVAS_EXPAND_THRESHOLD_PX);
    expect(extent[0][1]).toBe(-50 - CANVAS_EXPAND_THRESHOLD_PX);
  });

  it('keeps imported negative coordinates pannable', () => {
    const draft = emptyDraft();
    draft.nodes.neg = node('neg', -3000, -2000);
    const extent = canvasExtent(draft, { width: 800, height: 600 });
    expect(extent[0][0]).toBe(-3000 - CANVAS_EXPAND_THRESHOLD_PX);
    expect(extent[0][1]).toBe(-2000 - CANVAS_EXPAND_THRESHOLD_PX);
  });

  it('includes note rectangles in the content bounds', () => {
    const draft = rowDraft(1);
    draft.notes.push({
      uid: 'note0',
      x: 500,
      y: 500,
      width: 200,
      height: 120,
    });
    const extent = canvasExtent(draft, { width: 800, height: 600 });
    expect(extent[1][1]).toBe(500 + 120 + CANVAS_EXPAND_THRESHOLD_PX);
  });
});
