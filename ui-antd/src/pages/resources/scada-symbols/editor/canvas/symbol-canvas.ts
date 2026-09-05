/**
 * SymbolCanvas — the svg.js-backed symbol edit object (M11 wave-2D).
 * Framework-free; the React canvas component mounts it and renders the
 * hover panels it requests. Ported from ui-ngx
 * `pages/scada-symbol/scada-symbol-editor.models.ts` (ScadaSymbolEditObject
 * + ScadaSymbolElement), with the fork deltas registered in the M11 report:
 *   - hover panels are requested through `panelChanged` and rendered by the
 *     host as antd Popovers (upstream: jQuery tooltipster);
 *   - zoom steps are immediate, not animated (the 200ms tween is visual
 *     only upstream);
 *   - elements are registered regardless of measured bbox so zero-layout
 *     environments (tests) still exercise tagging; upstream gates
 *     registration on a non-empty bbox.
 *
 * Serialization discipline (ui-ngx getContent :130-149 parity): visibility
 * of every element is restored before serializing, editor-time artifacts
 * (`tb:inner`-marked helper nodes, the `tb-element`/`hovered` classes and
 * the svgjs:data attributes svg.js writes into the DOM) are stripped on
 * the serialization CLONE (never the live tree), then the current
 * show-hidden mode is re-applied. Two consecutive getContent() calls are
 * byte-identical (unit-tested anchor).
 */
import {
  type Box,
  type Rect,
  type Style,
  SVG,
  type Svg,
  type Element as SvgElement,
} from '@svgdotjs/svg.js';
// The plugin's ESM entry (the CJS dist expects a global SVG object).
import '@svgdotjs/svg.panzoom.js/src/svg.panzoom.js';

import {
  scadaSymbolContentData,
  svgRootFill,
  svgRootViewBox,
} from '@/core/scada/symbol-metadata';

export const MIN_SYMBOL_ZOOM = 0.75;
export const MAX_SYMBOL_ZOOM = 4;
const ZOOM_FACTOR = 0.34;

const GROUP_RECT_PADDING = 2;
const GROUP_RECT_STROKE = 2;

/** Overlap stagger geometry (px at scale 1) — ui-ngx :462-463 parity. */
const ELEMENT_PANEL_MIN_HEIGHT = 36 + 8;
const ELEMENT_PANEL_MIN_WIDTH = 100;

export type SymbolPanelPlacement = 'top' | 'left' | 'bottom' | 'right';

export interface SymbolPanelAnchor {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** A hover panel request emitted to the host component. */
export interface SymbolPanelState {
  /** Registry handle of the hovered element. */
  handle: number;
  elementId: string | null;
  elementType: string;
  tag: string | null;
  invisible: boolean;
  readonly: boolean;
  /** Client-space bounding box of the element. */
  anchor: SymbolPanelAnchor;
  /** Vertical stagger (px) for elements overlapping their neighbours. */
  offsetPx: number;
  placement: SymbolPanelPlacement;
}

export interface SymbolCanvasCallbacks {
  tagsUpdated: (tags: string[]) => void;
  dirtyChanged: (dirty: boolean) => void;
  hiddenElementsChanged: (hasHidden: boolean) => void;
  zoomChanged: () => void;
  panelChanged: (panel: SymbolPanelState | null) => void;
}

export interface SymbolCanvasTheme {
  /** Glow color behind the hovered element (light halo). */
  glowLight: string;
  /** Glow color bordering the light halo. */
  glowDark: string;
  /** Dashed group-highlight rectangle stroke. */
  groupStroke: string;
}

interface CanvasEntry {
  handle: number;
  element: SvgElement;
  tag: string | null;
  /** Parent chain hidden — the element is invisible regardless of itself. */
  invisible: boolean;
  origVisibility: boolean;
  box: Box | null;
  highlightRect: Rect | null;
  isGroup: boolean;
  highlighted: boolean;
  /** Vertical stagger slot computed from overlap groups (px). */
  offsetPx: number;
}

const CLIENT_ZERO = { left: 0, top: 0, width: 0, height: 0 };

export class SymbolCanvas {
  private svgShape: Svg | null = null;
  private svgRootNodePart = '';
  private symbolBox: Box | null = null;
  private entries: CanvasEntry[] = [];
  private handleSeq = 0;
  private showHidden = false;
  private fitScale = 1;
  private resizeObserver: ResizeObserver | null = null;
  private theme: SymbolCanvasTheme = {
    glowLight: '#ffffff',
    glowDark: '#000000',
    groupStroke: 'rgba(0, 0, 0, 0.38)',
  };
  private hoverStyle: Style | null = null;

  readonly: boolean;

  constructor(
    private rootElement: HTMLElement,
    private callbacks: SymbolCanvasCallbacks,
    readonly: boolean,
  ) {
    this.readonly = readonly;
  }

  setReadOnly(readonly: boolean): void {
    this.readonly = readonly;
  }

  /** Theme-driven stroke/glow colors (spec §3.7: no raw colors in UI). */
  applyTheme(theme: SymbolCanvasTheme): void {
    this.theme = theme;
    if (this.svgShape) {
      this.updateHoverFilterStyle();
    }
    for (const entry of this.entries) {
      if (entry.highlightRect) {
        entry.highlightRect.attr('stroke', theme.groupStroke);
      }
    }
  }

  setContent(svgContent: string): void {
    this.destroyShape();
    this.showHidden = false;
    this.fitScale = 1;
    const contentData = scadaSymbolContentData(svgContent);
    this.svgRootNodePart = contentData.svgRootNode;
    const shape = SVG().svg(contentData.innerSvg) as Svg;
    this.svgShape = shape;
    shape.node.style.overflow = 'visible';
    (shape.node.style as CSSStyleDeclaration & { 'user-select'?: string })[
      'user-select'
    ] = 'none';
    this.symbolBox = this.resolveSymbolBox(shape, contentData.svgRootNode);
    const rootFill = svgRootFill(contentData.svgRootNode);
    if (rootFill) {
      shape.fill(rootFill);
    }
    shape.size(this.symbolBox.width, this.symbolBox.height);
    shape.viewbox(`0 0 ${this.symbolBox.width} ${this.symbolBox.height}`);
    // The injected style sheet + highlight rects are marked tb:inner so
    // getContent()'s serializer drops them.
    shape
      .style()
      .attr('tb:inner', true)
      .rule('.tb-element', { cursor: 'pointer' });
    shape.addTo(this.rootElement);
    this.updateHoverFilterStyle();
    this.setupZoomPan(shape);
    this.setupElements();
  }

  getContent(): string | null {
    const shape = this.svgShape;
    if (!shape) {
      return null;
    }
    for (const entry of this.entries) {
      this.restoreOrigVisibility(entry);
    }
    // The serializer callback must return `false` (drop node) or
    // `undefined` (keep) — svg.js treats any other truthy value as a node
    // replacement.
    const svgContent = shape.svg((e: SvgElement): boolean | undefined => {
      if (e.node.hasAttribute?.('tb:inner')) {
        return false;
      }
      e.node.classList?.remove('tb-element', 'hovered');
      if (e.node.classList && e.node.classList.length === 0) {
        e.node.removeAttribute('class');
      }
      e.attr('svgjs:data', null);
      return undefined;
    }, false);
    this.showHiddenElements(this.showHidden);
    return `${this.svgRootNodePart}\n${svgContent}\n</svg>`;
  }

  getTags(): string[] {
    return this.entries
      .filter((e) => !!e.tag)
      .map((e) => e.tag as string)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();
  }

  hasHiddenElements(): boolean {
    return this.entries.some((e) => e.invisible);
  }

  zoomIn(): void {
    this.zoomTo(
      Math.min((1 + ZOOM_FACTOR) ** 1.2 * this.currentZoom(), MAX_SYMBOL_ZOOM),
    );
  }

  zoomOut(): void {
    this.zoomTo(
      Math.max((1 + ZOOM_FACTOR) ** -1.2 * this.currentZoom(), MIN_SYMBOL_ZOOM),
    );
  }

  zoomInDisabled(): boolean {
    return Number(this.currentZoom().toFixed(5)) >= MAX_SYMBOL_ZOOM;
  }

  zoomOutDisabled(): boolean {
    return Number(this.currentZoom().toFixed(5)) <= MIN_SYMBOL_ZOOM;
  }

  showHiddenElements(show: boolean): void {
    this.showHidden = show;
    for (const entry of this.entries) {
      if (entry.invisible) {
        if (show) {
          entry.element.show();
        } else {
          entry.element.hide();
        }
      }
    }
  }

  isShowHidden(): boolean {
    return this.showHidden;
  }

  /** Host-driven fit resize (ResizeObserver callback). */
  resize(): void {
    const shape = this.svgShape;
    const symbolBox = this.symbolBox;
    if (!shape || !symbolBox) {
      return;
    }
    const rect = this.rootElement.getBoundingClientRect();
    const targetWidth = rect.width;
    const targetHeight = rect.height;
    if (!targetWidth || !targetHeight) {
      return;
    }
    const svgAspect = symbolBox.width / symbolBox.height;
    const shapeAspect = targetWidth / targetHeight;
    const scale =
      svgAspect > shapeAspect
        ? targetWidth / symbolBox.width
        : targetHeight / symbolBox.height;
    if (scale !== this.fitScale) {
      this.fitScale = scale;
      shape.node.style.transform = `scale(${scale})`;
      this.updateHoverFilterStyle();
    }
  }

  /**
   * Attach/detach the fit ResizeObserver — split from the constructor so
   * environments without ResizeObserver can still run the canvas.
   */
  observeResize(): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    this.resizeObserver?.disconnect();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.rootElement);
  }

  /** Apply (or change) the tag of a registered element. */
  setTagForElement(handle: number, tag: string): void {
    const entry = this.entries.find((e) => e.handle === handle);
    if (!entry) {
      return;
    }
    entry.tag = tag;
    entry.element.attr('tb:tag', tag);
    this.callbacks.dirtyChanged(true);
    this.updateTags();
  }

  clearTagForElement(handle: number): void {
    const entry = this.entries.find((e) => e.handle === handle);
    if (!entry) {
      return;
    }
    entry.tag = null;
    entry.element.attr('tb:tag', null);
    this.callbacks.dirtyChanged(true);
    this.updateTags();
  }

  /** Fresh panel state for a handle (after tag edits, visibility flips…). */
  panelStateFor(handle: number): SymbolPanelState | null {
    const entry = this.entries.find((e) => e.handle === handle);
    return entry ? this.buildPanelState(entry) : null;
  }

  closePanel(): void {
    this.callbacks.panelChanged(null);
  }

  destroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.destroyShape();
  }

  // ------------------------------------------------------------------
  // internals

  private destroyShape(): void {
    this.closePanel();
    this.entries = [];
    if (this.svgShape) {
      try {
        (
          this.svgShape as unknown as { panZoom: (value: false) => void }
        ).panZoom(false);
      } catch {
        // panZoom(false) on a shape without panzoom is a no-op guard.
      }
      this.svgShape.remove();
      this.svgShape = null;
    }
    this.symbolBox = null;
    this.hoverStyle = null;
  }

  private currentZoom(): number {
    const shape = this.svgShape as unknown as { zoom?: () => number } | null;
    return typeof shape?.zoom === 'function' ? shape.zoom() : 1;
  }

  private zoomTo(level: number): void {
    const shape = this.svgShape;
    if (!shape) {
      return;
    }
    const clamped = Math.min(Math.max(level, MIN_SYMBOL_ZOOM), MAX_SYMBOL_ZOOM);
    (shape as unknown as { zoom: (level: number) => void }).zoom(clamped);
    this.restrictToMargins();
    this.callbacks.zoomChanged();
  }

  private setupZoomPan(shape: Svg): void {
    (
      shape as unknown as {
        panZoom: (options: {
          zoomMin: number;
          zoomMax: number;
          zoomFactor: number;
        }) => void;
      }
    ).panZoom({
      zoomMin: MIN_SYMBOL_ZOOM,
      zoomMax: MAX_SYMBOL_ZOOM,
      zoomFactor: ZOOM_FACTOR,
    });
    shape.on('panStart', () => {
      this.closePanel();
      shape.node.style.cursor = 'grab';
    });
    shape.on('panEnd', () => {
      shape.node.style.cursor = 'default';
    });
    shape.on('panning', () => {
      this.restrictToMargins();
    });
    shape.on('zoom', () => {
      this.restrictToMargins();
      this.callbacks.zoomChanged();
    });
    (shape as unknown as { zoom: (level: number) => void }).zoom(
      MIN_SYMBOL_ZOOM,
    );
    this.callbacks.zoomChanged();
  }

  /** Clamp the viewbox panning to the symbol bounds (+ margins) :248-262. */
  private restrictToMargins(): void {
    const shape = this.svgShape;
    const symbolBox = this.symbolBox;
    if (!shape || !symbolBox) {
      return;
    }
    const box = shape.viewbox() as Box;
    const marginX = Math.max(box.width - symbolBox.width, 0);
    const marginY = Math.max(box.height - symbolBox.height, 0);
    let { x, y } = box;
    if (x < -marginX) {
      x = -marginX;
    } else if (x + box.width > symbolBox.width + marginX) {
      x = symbolBox.width + marginX - box.width;
    }
    if (y < -marginY) {
      y = -marginY;
    } else if (y + box.height > symbolBox.height + marginY) {
      y = symbolBox.height + marginY - box.height;
    }
    shape.viewbox(x, y, box.width, box.height);
  }

  private resolveSymbolBox(shape: Svg, svgRootNode: string): Box {
    const viewBox = svgRootViewBox(svgRootNode);
    if (viewBox?.width && viewBox?.height) {
      return {
        x: viewBox.x,
        y: viewBox.y,
        width: viewBox.width,
        height: viewBox.height,
      } as Box;
    }
    try {
      const box = shape.bbox();
      if (box.width && box.height) {
        return box;
      }
    } catch {
      // No layout engine — fall through to the default box.
    }
    return { x: 0, y: 0, width: 300, height: 300 } as Box;
  }

  private updateHoverFilterStyle(): void {
    if (this.hoverStyle) {
      this.hoverStyle.remove();
      this.hoverStyle = null;
    }
    const shape = this.svgShape;
    if (!shape) {
      return;
    }
    const whiteBlur = (2.8 / (this.fitScale * this.currentZoom() || 1)).toFixed(
      2,
    );
    const blackBlur = (1.2 / (this.fitScale * this.currentZoom() || 1)).toFixed(
      2,
    );
    this.hoverStyle = shape
      .style()
      .attr('tb:inner', true)
      .rule('.hovered', {
        filter: `drop-shadow(0px 0px ${whiteBlur}px ${this.theme.glowLight}) drop-shadow(0px 0px ${whiteBlur}px ${this.theme.glowLight}) drop-shadow(0px 0px ${blackBlur}px ${this.theme.glowDark})`,
      });
  }

  private setupElements(): void {
    const shape = this.svgShape;
    if (!shape) {
      return;
    }
    for (const child of shape.children()) {
      this.addElement(child as SvgElement, false);
    }
    this.assignOverlapOffsets();
    for (const entry of this.entries) {
      this.initEntry(entry);
    }
    this.updateTags();
    this.callbacks.hiddenElementsChanged(this.hasHiddenElements());
  }

  private addElement(element: SvgElement, parentInvisible: boolean): void {
    const invisible = parentInvisible || !this.isVisible(element);
    const entry: CanvasEntry = {
      handle: this.handleSeq++,
      element,
      tag: (element.attr('tb:tag') as string | undefined) ?? null,
      invisible,
      origVisibility: this.isVisible(element),
      box: this.safeBbox(element),
      highlightRect: null,
      isGroup: element.type === 'g',
      highlighted: false,
      offsetPx: 0,
    };
    this.entries.push(entry);
    for (const child of element.children()) {
      const childEl = child as SvgElement;
      if (childEl.type === 'tspan' && element.type === 'text') {
        continue;
      }
      this.addElement(childEl, invisible);
    }
  }

  /**
   * Hidden-element detection. svg.js `visible()` only reads the inline
   * style; TB symbols hide elements via the `display="none"` ATTRIBUTE,
   * so both sources are checked.
   */
  private isVisible(element: SvgElement): boolean {
    try {
      if (!element.visible()) {
        return false;
      }
      return element.attr('display') !== 'none';
    } catch {
      return true;
    }
  }

  private safeBbox(element: SvgElement): Box | null {
    try {
      return element.bbox() as Box;
    } catch {
      return null;
    }
  }

  /**
   * Overlap groups (ui-ngx :268-309): leaf elements whose centers sit
   * within the panel footprint of each other get staggered vertical
   * offsets so their hover panels never fully cover one another.
   */
  private assignOverlapOffsets(): void {
    const leaves = this.entries.filter((e) => !e.isGroup);
    const groups: CanvasEntry[][] = [];
    for (const entry of leaves) {
      for (const other of leaves) {
        if (entry === other || !this.overlappingCenters(entry, other)) {
          continue;
        }
        let group = groups.find((g) => g.includes(entry) || g.includes(other));
        if (!group) {
          group = [entry, other];
          groups.push(group);
        } else {
          if (!group.includes(entry)) {
            group.push(entry);
          }
          if (!group.includes(other)) {
            group.push(other);
          }
        }
      }
    }
    for (const group of groups) {
      const slots = group.length % 2 === 0 ? group.length + 1 : group.length;
      let offset =
        -(ELEMENT_PANEL_MIN_HEIGHT * slots) / 2 + ELEMENT_PANEL_MIN_HEIGHT / 2;
      for (const entry of group) {
        entry.offsetPx = offset;
        offset += ELEMENT_PANEL_MIN_HEIGHT;
      }
    }
  }

  private overlappingCenters(entry: CanvasEntry, other: CanvasEntry): boolean {
    const a = entry.box;
    const b = other.box;
    if (!a || !b) {
      return false;
    }
    return (
      Math.abs(a.cx - b.cx) * this.fitScale < ELEMENT_PANEL_MIN_WIDTH &&
      Math.abs(a.cy - b.cy) * this.fitScale < ELEMENT_PANEL_MIN_HEIGHT
    );
  }

  private initEntry(entry: CanvasEntry): void {
    if (entry.origVisibility === false || entry.invisible) {
      // Keep hidden elements rendered while editing (upstream setup), the
      // show-hidden toggle decides their final visibility.
      entry.element.show();
    }
    if (entry.isGroup && entry.box) {
      entry.highlightRect = this.svgShape
        ?.rect(
          entry.box.width + GROUP_RECT_PADDING * 2,
          entry.box.height + GROUP_RECT_PADDING * 2,
        )
        .x(entry.box.x - GROUP_RECT_PADDING)
        .y(entry.box.y - GROUP_RECT_PADDING)
        .attr({
          'tb:inner': true,
          fill: 'none',
          rx: 6,
          stroke: this.theme.groupStroke,
          'stroke-dasharray': '1',
          'stroke-width': GROUP_RECT_STROKE,
          opacity: 0,
        }) as Rect;
      entry.highlightRect?.hide();
    } else {
      entry.element.addClass('tb-element');
    }
    entry.element.on('mouseenter', () => {
      this.highlightEntry(entry);
      this.callbacks.panelChanged(this.buildPanelState(entry));
    });
    entry.element.on('mouseleave', () => {
      this.unhighlightEntry(entry);
      this.callbacks.panelChanged(null);
    });
    if (entry.invisible) {
      entry.element.hide();
    }
  }

  private highlightEntry(entry: CanvasEntry): void {
    if (entry.highlighted) {
      return;
    }
    entry.highlighted = true;
    if (entry.highlightRect) {
      entry.highlightRect.attr({ rx: 6, 'stroke-width': GROUP_RECT_STROKE });
      entry.highlightRect.show();
      entry.highlightRect.attr('opacity', 1);
    } else {
      entry.element.addClass('hovered');
    }
  }

  private unhighlightEntry(entry: CanvasEntry): void {
    if (!entry.highlighted) {
      return;
    }
    entry.highlighted = false;
    if (entry.highlightRect) {
      entry.highlightRect.attr('opacity', 0);
      entry.highlightRect.hide();
    } else {
      entry.element.removeClass('hovered');
    }
  }

  private buildPanelState(entry: CanvasEntry): SymbolPanelState {
    let anchor: SymbolPanelAnchor = CLIENT_ZERO;
    try {
      const rect = entry.element.node.getBoundingClientRect();
      anchor = {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
    } catch {
      anchor = CLIENT_ZERO;
    }
    return {
      handle: entry.handle,
      elementId: entry.element.node.id || null,
      elementType: entry.element.type,
      tag: entry.tag,
      invisible: entry.invisible,
      readonly: this.readonly,
      anchor,
      offsetPx: entry.offsetPx,
      placement: entry.isGroup ? 'top' : 'top',
    };
  }

  private restoreOrigVisibility(entry: CanvasEntry): void {
    if (entry.origVisibility) {
      entry.element.show();
    } else {
      entry.element.hide();
    }
  }

  private updateTags(): void {
    this.callbacks.tagsUpdated(this.getTags());
  }
}

export { svgRootFill };
