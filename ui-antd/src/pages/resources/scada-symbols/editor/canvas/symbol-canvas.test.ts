/**
 * SymbolCanvas tests (M11 wave-2D). happy-dom has no layout engine, so
 * geometry-dependent behavior (fit scale, anchor rects) is asserted only
 * structurally — the serialization discipline, tag management, hidden
 * element handling and zoom clamps are the load-bearing contract here.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SymbolCanvas } from './symbol-canvas';

const SYMBOL_CONTENT =
  '<svg xmlns:tb="https://thingsboard.io/svg" viewBox="0 0 200 100">\n' +
  '<tb:metadata>\n<![CDATA[{"title":"Pump","widgetSizeX":2,"widgetSizeY":1}]]></tb:metadata>\n' +
  '<rect id="r1" tb:tag="valve" x="0" y="0" width="50" height="50"/>\n' +
  '<g id="g1"><circle id="c1" r="10"/></g>\n' +
  '<rect id="rh" tb:tag="hidden-tag" display="none"/>\n' +
  '</svg>';

const liveHosts: HTMLDivElement[] = [];

function createCanvas(
  content = SYMBOL_CONTENT,
  overrides: Partial<Record<string, ReturnType<typeof vi.fn>>> = {},
) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  liveHosts.push(host);
  const callbacks = {
    tagsUpdated: vi.fn(),
    dirtyChanged: vi.fn(),
    hiddenElementsChanged: vi.fn(),
    zoomChanged: vi.fn(),
    panelChanged: vi.fn(),
    ...overrides,
  };
  const canvas = new SymbolCanvas(host, callbacks, false);
  canvas.setContent(content);
  canvas.observeResize();
  return { canvas, host, callbacks };
}

describe('SymbolCanvas', () => {
  afterEach(() => {
    for (const host of liveHosts.splice(0)) {
      host.remove();
    }
  });

  it('getContent is byte-identical across consecutive calls', () => {
    const { canvas } = createCanvas();
    const first = canvas.getContent();
    const second = canvas.getContent();
    expect(first).toBeTruthy();
    expect(first).toBe(second);
  });

  it('getContent drops the metadata block and keeps tags and shapes', () => {
    const { canvas } = createCanvas();
    const content = canvas.getContent() as string;
    expect(content).not.toContain('tb:metadata');
    expect(content).toContain('tb:tag="valve"');
    expect(content).toContain('id="c1"');
    expect(content).toContain('viewBox="0 0 200 100"');
    expect(content.trim().endsWith('</svg>')).toBe(true);
  });

  it('strips editor-time classes from the serialized output', () => {
    const { canvas } = createCanvas();
    const content = canvas.getContent() as string;
    expect(content).not.toContain('tb-element');
    expect(content).not.toContain('svgjs:data');
    expect(content).not.toContain('class=""');
  });

  it('registers tags and reports them sorted and unique', () => {
    const { canvas, callbacks } = createCanvas();
    expect(canvas.getTags()).toEqual(['hidden-tag', 'valve']);
    expect(callbacks.tagsUpdated).toHaveBeenCalledWith(
      expect.arrayContaining(['valve', 'hidden-tag']),
    );
  });

  it('setTagForElement adds the tb:tag attribute and marks dirty', () => {
    const { canvas, callbacks } = createCanvas('<svg><rect id="r1"/></svg>');
    callbacks.dirtyChanged.mockClear();
    const state = canvas.panelStateFor(0);
    expect(state).not.toBeNull();
    canvas.setTagForElement(0, 'pump');
    expect(callbacks.dirtyChanged).toHaveBeenCalledWith(true);
    expect(canvas.getTags()).toEqual(['pump']);
    const content = canvas.getContent() as string;
    expect(content).toContain('tb:tag="pump"');
  });

  it('clearTagForElement removes the tag from the element', () => {
    const { canvas } = createCanvas('<svg><rect id="r1" tb:tag="old"/></svg>');
    canvas.clearTagForElement(0);
    expect(canvas.getTags()).toEqual([]);
    expect(canvas.getContent()).not.toContain('tb:tag="old"');
  });

  it('keeps originally hidden elements hidden in serialized output', () => {
    const { canvas, callbacks } = createCanvas();
    expect(callbacks.hiddenElementsChanged).toHaveBeenCalledWith(true);
    const content = canvas.getContent() as string;
    // The hidden element must stay hidden (display none survives).
    expect(content).toMatch(/display="none"|display: none/);
    // Enabling the show-hidden aid must NOT leak into the content either.
    canvas.showHiddenElements(true);
    const contentWhileShown = canvas.getContent() as string;
    expect(contentWhileShown).toBe(content);
    canvas.showHiddenElements(false);
  });

  it('clamps zoom to the 0.75–4 domain and reports state changes', () => {
    const { canvas, callbacks } = createCanvas();
    callbacks.zoomChanged.mockClear();
    expect(canvas.zoomOutDisabled()).toBe(true);
    for (let i = 0; i < 20; i++) {
      canvas.zoomIn();
    }
    expect(canvas.zoomInDisabled()).toBe(true);
    for (let i = 0; i < 40; i++) {
      canvas.zoomOut();
    }
    expect(canvas.zoomOutDisabled()).toBe(true);
    expect(callbacks.zoomChanged).toHaveBeenCalled();
  });

  it('emits a hover panel state on mouseenter and closes on mouseleave', () => {
    const { canvas, callbacks } = createCanvas();
    callbacks.panelChanged.mockClear();
    const rect = document.getElementById('r1') as SVGElement;
    rect.dispatchEvent(new MouseEvent('mouseenter'));
    expect(callbacks.panelChanged).toHaveBeenCalledTimes(1);
    const panel = callbacks.panelChanged.mock.calls[0][0];
    expect(panel.tag).toBe('valve');
    expect(panel.elementId).toBe('r1');
    expect(panel.readonly).toBe(false);
    rect.dispatchEvent(new MouseEvent('mouseleave'));
    expect(callbacks.panelChanged).toHaveBeenLastCalledWith(null);
    expect(canvas.panelStateFor(0)?.tag).toBe('valve');
  });

  it('readonly canvas reports readonly panel state', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    liveHosts.push(host);
    const canvas = new SymbolCanvas(
      host,
      {
        tagsUpdated: vi.fn(),
        dirtyChanged: vi.fn(),
        hiddenElementsChanged: vi.fn(),
        zoomChanged: vi.fn(),
        panelChanged: vi.fn(),
      },
      true,
    );
    canvas.setContent(SYMBOL_CONTENT);
    const panel = canvas.panelStateFor(0);
    expect(panel?.readonly).toBe(true);
  });

  it('destroys the mounted svg and detaches from the host', () => {
    const { canvas, host } = createCanvas();
    canvas.destroy();
    expect(host.querySelector('svg')).toBeNull();
    expect(canvas.getContent()).toBeNull();
  });
});
