/**
 * Widget editor shared contracts — FROZEN after M9 wave 1 (F).
 *
 * Waves 2/3 (compile pipeline, editor shell, preview, contract IO) all code
 * against this file; renames or reshapes here are breaking changes and must
 * go through the brief's stability-entry discipline (简报 §3).
 *
 * Sources (do not diverge):
 *   - docs/adr/0004-editor-suite.md §4 — CustomWidgetProps narrow contract
 *     (capped), descriptor increments (`runtime` / `schemaVersion` / `source`),
 *     compile pipeline boundary.
 *   - docs/spec/v2-m9-implementation-brief.md §2 — WidgetEditorDraft shape,
 *     descriptor write shape, undo boundaries.
 *
 * Reuse rules: dashboard-side `WidgetConfig` / `Datasource` / data types come
 * from `@/types/tb/widget` and `@/types/tb/telemetry`; `FormProperty` is the
 * upstream-mirrored model in `components/form-property/types`. Nothing here
 * duplicates an existing type.
 */

import type { FormProperty } from '@/components/form-property/types';
import type { Uuid } from '@/types/tb/entity';
import type { SubscriptionData } from '@/types/tb/telemetry';
import type { Timewindow } from '@/types/tb/timewindow';
import type { Datasource, WidgetConfig } from '@/types/tb/widget';
import type {
  WidgetActionSource,
  WidgetTypeDescriptor,
  WidgetTypeKind,
  WidgetTypeParameters,
} from '@/types/tb/widget-type';

// ---------------------------------------------------------------------------
// Descriptor: fork runtime marker + write shape
// ---------------------------------------------------------------------------

/**
 * Fork descriptor schema version. Written on every fork-widget save; bump
 * ONLY when widget-kit itself takes a breaking major (never for editor
 * features) — stored widgets cannot be recompiled in place (ADR 0004 §4).
 */
export const WIDGET_DESCRIPTOR_SCHEMA_VERSION = 1;

/**
 * Descriptor write shape for fork widgets: the free-form upstream descriptor
 * plus the three fork increments as REQUIRED fields. The editor save path
 * and import/export produce this; legacy Angular widgets never carry
 * `runtime` (its absence IS the Angular marker).
 */
export interface ReactWidgetDescriptor extends WidgetTypeDescriptor {
  runtime: 'react-1';
  schemaVersion: number;
  source: {
    tsx: string;
    /** absent = no custom css. Empty strings are normalized away on save. */
    css?: string;
  };
}

// ---------------------------------------------------------------------------
// WidgetEditorDraft — the editor session document
// ---------------------------------------------------------------------------

/** Editor-side source bundle. `css` is always a string; empty = no css. */
export interface WidgetSourceCode {
  tsx: string;
  css: string;
}

/**
 * Metadata sidebar fields (descriptor `type` / `sizeX` / `sizeY` /
 * `typeParameters` / `actionSources`). Optional members may be absent on
 * legacy/derived drafts; saving fills them from the sidebar defaults.
 */
export interface WidgetEditorMeta {
  type: WidgetTypeKind;
  /** default cell width, grid columns. */
  sizeX: number;
  /** default cell height, grid rows. */
  sizeY: number;
  typeParameters?: WidgetTypeParameters;
  actionSources?: Record<string, WidgetActionSource>;
}

/**
 * The EditorSession<WidgetEditorDraft> document (brief §2). This is the
 * normalized editor view of a WidgetTypeDetails — one stable shape for the
 * shell tabs, metadata sidebar, preview and save path.
 *
 * - `fqn` is the SHORT scope-less name (wire `WidgetType.fqn`); the
 *   scope-qualified form is derived for display/lookup, never stored here.
 * - `defaultConfig` stays a JSON STRING end-to-end (backend helper depends
 *   on the string form) — parse for preview only, never re-store parsed.
 * - Descriptor keys not represented by a field (templateHtml, resources,
 *   controllerScript, unknown future keys…) are preserved via the draft's
 *   passthrough channel in the save conversion (round-trip must not lose
 *   them; the wire side is `WidgetTypeDescriptor`'s index signature).
 */
export interface WidgetEditorDraft {
  /** existing type uuid, null while creating (server assigns on save). */
  widgetTypeId: Uuid | null;
  /**
   * SHORT fqn (no `system.`/`tenant.` prefix). On create it may be empty —
   * the backend derives one from `name` and dedupes; on update it is
   * immutable server-side.
   */
  fqn: string;
  name: string;
  source: WidgetSourceCode;
  /** settings schema in the upstream FormProperty[] format (zero-conversion). */
  settingsForm: FormProperty[];
  /** default widget config as a JSON string (see class doc — keep string). */
  defaultConfig: string;
  meta: WidgetEditorMeta;
  /**
   * optimistic-lock version of the loaded entity; null while creating.
   * Save sends it back and re-binds the returned version (409 = conflict
   * dialog, brief §2).
   */
  version: number | null;
}

// ---------------------------------------------------------------------------
// CustomWidgetProps — the capped runtime contract (ADR 0004 §4)
// ---------------------------------------------------------------------------

/** Toast severities the widget ctx may request. */
export type CustomWidgetToastType = 'info' | 'success' | 'warning' | 'error';

/** RPC handle handed to widgets whose type enables the rpc action source. */
export interface CustomWidgetRpc {
  /** fire-and-forget server-side RPC; resolves on HTTP accept. */
  sendOneWay(method: string, params?: unknown): Promise<void>;
  /** resolves with the server's response payload. */
  sendTwoWay(method: string, params?: unknown): Promise<unknown>;
}

/**
 * Ambient info + capability surface of the widget instance. `width`/`height`
 * are CSS pixels tracked by the container's ResizeObserver (props-driven —
 * widgets never observe the DOM themselves). `locale` is the active app
 * locale tag (e.g. `zh-CN`).
 */
export interface CustomWidgetCtx {
  width: number;
  height: number;
  /** dashboard is in edit mode. */
  isEdit: boolean;
  /** rendering inside the widget editor preview. */
  isPreview: boolean;
  locale: string;
  /** host toast; routes into the editor console while previewing. */
  toast: (message: string, type?: CustomWidgetToastType) => void;
  /** present only when the widget owns a private timewindow. */
  updateTimewindow?: (timewindow: Timewindow) => void;
}

/**
 * The ONLY contract a compiled custom widget may rely on (ADR 0004 §4,
 * capped): props-driven data in, no lifecycle callbacks, no direct store/
 * transport access. New capabilities go through versioned widget-kit
 * additions, NEVER by widening this interface.
 *
 * Data shape: `SubscriptionData` (key → rows of `[ts, value, count?]`), the
 * same series model the dashboard runtime feeds built-in widgets.
 */
export interface CustomWidgetProps {
  /** the widget instance config (settings payload, title, units…). */
  config: WidgetConfig;
  /** parsed `config.settings` (the settings-form values). */
  settings: Record<string, unknown>;
  /** resolved datasources (entities/keys; function datasources for preview). */
  datasources: Datasource[];
  /** timeseries series keyed by data key. */
  data: SubscriptionData;
  /** latest-value series keyed by data key (empty when not subscribed). */
  latestData: SubscriptionData;
  /** active timewindow; null when the widget runs without one. */
  timewindow: Timewindow | null;
  /** configured widget action descriptors, keyed by action source id. */
  actions: Record<string, unknown>;
  /** present only when the widget type carries the `headerButton`-style rpc usage. */
  rpc?: CustomWidgetRpc;
  ctx: CustomWidgetCtx;
}
