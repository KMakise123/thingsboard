/**
 * WidgetPreview — the same-page live preview of the widget editor (M9 brief
 * §3 wave 3 P; spec §5.1/§5.4/§5.5). FROZEN CONTRACT: PreviewPaneProps' prop
 * shapes are wave-S frozen — this file owns the implementation body only.
 *
 * Same-page preview motivations (spec §5.1), each with its landing point:
 *   - compile throws BEFORE mount — compileWidget runs synchronously in the
 *     RUN window (mount + every ctrl+enter) and transform/execute failures
 *     surface through onError({kind:'compile'}) without rendering;
 *   - two-layer style namespace — the type layer (descriptor css) mounts
 *     through core/widget/style-scope under the editor-preview scope key
 *     (single preview per editor page, so one key suffices); the instance
 *     layer is dashboard-only (no widgetId here);
 *   - independent hook lifecycles — everything stateful (compiled component,
 *     function-datasource subscription, data state) lives inside
 *     PreviewRunHost, rendered with key={runId}: a ctrl+enter remounts the
 *     whole subtree and restarts the subscription from scratch.
 *
 * Error closure (spec §5.5), three channels:
 *   - compile errors  → onError({kind:'compile', line}) for the CM gutter;
 *   - runtime errors  → the per-instance boundary (componentDidCatch) maps
 *     the stack back via resolveRuntimeErrorLocation and reports
 *     onError({kind:'runtime', line}); broken funcBodies ride the same
 *     channel (no source line — they are data-layer, not module code);
 *   - typing clears   — ANY change of tsx/css/settingsForm/defaultConfig
 *     clears the stale error (onError(null)); re-running stays on
 *     ctrl+enter (spec semantics — typing never recompiles).
 *
 * Console capture windows (see console-capture.ts for the honest boundary):
 *   RUN window — compile + defaultConfig parse + initial series; TICK
 *   window — every subscription round; RENDER window — the compiled
 *   component's render pass, released at the nearest microtask checkpoint.
 *   Console output outside those windows reaches the host console
 *   untouched.
 *
 * WYSIWYG settings (spec §5.4) stay OUTSIDE the keyed subtree: edits merge
 * into the defaultConfig JSON string via onDefaultConfigChange (no
 * recompile, no runId bump — the widget re-renders from props).
 */

import { App, Empty, Typography } from 'antd';
import {
  type ReactNode,
  type RefObject,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useIntl } from 'react-intl';
import type { FormProperty } from '@/components/form-property/types';
import type { CompiledWidget } from '@/core/widget/compile';
import {
  compileWidget,
  resolveRuntimeErrorLocation,
} from '@/core/widget/compile';
import { mountWidgetStyle, widgetScopeClass } from '@/core/widget/style-scope';
import type { CustomWidgetProps } from '@/core/widget/types';
import type { SubscriptionData } from '@/types/tb/telemetry';
import type { WidgetConfig } from '@/types/tb/widget';

import type { WidgetConsoleLevel } from './console';
import {
  type ConsoleSink,
  captureConsoleSync,
  enterConsoleCaptureForMicrotask,
} from './console-capture';
import { WidgetRuntimeBoundary } from './error-boundary';
import {
  createFunctionSubscription,
  type WrapWindow,
} from './function-subscription';
import { parseDefaultConfig } from './parse-config';
import { PreviewSettingsForm } from './settings-form';

export type { WidgetConsoleEntry, WidgetConsoleLevel } from './console';

/** Structured error channel — `null` clears the current error surface. */
export interface WidgetPreviewError {
  kind: 'compile' | 'runtime';
  message: string;
  /** 1-based source line for the CM gutter (P1 line parity). */
  line?: number;
}

/** Console capture channel entry (the shell owns the pane + entry list). */
export interface WidgetConsoleEntryInput {
  level: WidgetConsoleLevel;
  text: string;
}

export interface PreviewPaneProps {
  /** current TSX source (pre-compile, straight from the session draft). */
  tsx: string;
  /** current CSS source ('' = none — the style scope prefixes it). */
  css: string;
  /** settings schema for the WYSIWYG settings form. */
  settingsForm: FormProperty[];
  /**
   * default widget config as a JSON STRING (draft passthrough discipline —
   * parse inside, never re-store parsed).
   */
  defaultConfig: string;
  /**
   * bump to force a full remount (ctrl+enter run) — the hook subscriptions
   * restart with a fresh lifecycle.
   */
  runId: number;
  /** structured error surface (compile → CM diagnostics, runtime → here). */
  onError: (error: WidgetPreviewError | null) => void;
  /** console capture (host renders ConsolePane from the collected list). */
  onConsoleEntry: (entry: WidgetConsoleEntryInput) => void;
  /** settings WYSIWYG write-back — JSON string, never parsed storage. */
  onDefaultConfigChange: (nextDefaultConfig: string) => void;
}

/**
 * Type-layer style scope key for the preview. The editor page renders ONE
 * preview at a time, so a single stable key cannot collide; released on
 * unmount/css-clear through the style-scope refcount.
 */
const PREVIEW_STYLE_SCOPE = 'editor-preview';

/** Error + console channels, kept fresh through a ref (stable subscriptions). */
interface PreviewChannels {
  onError: (error: WidgetPreviewError | null) => void;
  onConsoleEntry: (entry: WidgetConsoleEntryInput) => void;
}

/**
 * One compiled RUN of the preview. Kept as an atomic pair so a runId bump
 * never renders the previous run's component under the new key.
 */
interface PreviewRun {
  id: number;
  compiled: CompiledWidget | null;
}

/**
 * JSON-stable reference: same serialized content ⇒ the SAME object
 * identity across re-renders. The render-phase ref write follows the
 * session-mirror pattern already used by the shell's SchemaTab (the
 * undo-safe-value idea) — only the parse-fresh-substitute changes it.
 */
function useStableJson<T>(value: T): T {
  const slot = useRef<{ text: string; value: T }>({ text: '', value });
  const text = JSON.stringify(value);
  if (slot.current.text !== text) {
    slot.current = { text, value };
  }
  return slot.current.value;
}

/**
 * Series-level equality for the subscription snapshots: same keys with the
 * same lengths and the same latest point means NO new data — skip the
 * setState (a tick with no new points must not re-render the widget).
 */
function sameData(prev: SubscriptionData, next: SubscriptionData): boolean {
  const prevKeys = Object.keys(prev);
  if (prevKeys.length !== Object.keys(next).length) {
    return false;
  }
  for (const key of prevKeys) {
    const a = prev[key];
    const b = next[key];
    if (!a || !b || a.length !== b.length) {
      return false;
    }
    if (a.length > 0) {
      const lastA = a[a.length - 1];
      const lastB = b[b.length - 1];
      if (lastA[0] !== lastB[0] || lastA[1] !== lastB[1]) {
        return false;
      }
    }
  }
  return true;
}

export function WidgetPreview({
  runId,
  tsx,
  css,
  settingsForm,
  defaultConfig,
  onError,
  onConsoleEntry,
  onDefaultConfigChange,
}: PreviewPaneProps) {
  const { formatMessage } = useIntl();

  // Copy is memoized per message: formatMessage re-invocation on every
  // render is pure waste, and a MISSING key (test harnesses with partial
  // message sets) makes react-intl log once per call — keep it at one.
  const copy = useMemo(
    () => ({
      title: formatMessage({
        id: 'editor.widget.editor.preview.title',
        defaultMessage: 'Preview',
      }),
      runIdLabel: formatMessage({
        id: 'editor.widget.editor.preview.runId',
        defaultMessage: 'Run',
      }),
      empty: formatMessage({
        id: 'editor.widget.editor.preview.empty',
        defaultMessage: 'Fix the error and press ctrl+enter to re-run',
      }),
      compileError: formatMessage({
        id: 'editor.widget.editor.preview.compileError',
        defaultMessage: 'Compile failed',
      }),
    }),
    [formatMessage],
  );

  // Latest source + channels for the runId-scoped effects (the run effect
  // must NOT re-run when sources change — recompiling is ctrl+enter's job).
  const sourceRef = useRef({ tsx });
  sourceRef.current = { tsx };
  const channelsRef = useRef<PreviewChannels>({ onError, onConsoleEntry });
  channelsRef.current = { onError, onConsoleEntry };

  const consoleRoute = useCallback<ConsoleSink>((level, text) => {
    channelsRef.current.onConsoleEntry({ level, text });
  }, []);

  // defaultConfig parses ONCE per string change; the settings form, the
  // subscription and the widget props all consume this one result.
  const parsed = useMemo(
    () => parseDefaultConfig(defaultConfig),
    [defaultConfig],
  );

  const [run, setRun] = useState<PreviewRun>({ id: runId, compiled: null });

  // RUN window: compile + report (or clear). Re-runs ONLY on runId.
  useEffect(() => {
    captureConsoleSync(consoleRoute, () => {
      const result = compileWidget(sourceRef.current.tsx, {
        name: 'preview',
      });
      if ('error' in result) {
        const error: WidgetPreviewError = {
          kind: 'compile',
          message: result.error.message,
          ...(result.error.line === undefined
            ? {}
            : { line: result.error.line }),
        };
        channelsRef.current.onError(error);
        channelsRef.current.onConsoleEntry({
          level: 'error',
          text: `${copy.compileError}: ${result.error.message}${
            result.error.line === undefined
              ? ''
              : ` (line ${result.error.line})`
          }`,
        });
        setRun({ id: runId, compiled: null });
        return;
      }
      // a fresh successful run clears whatever error preceded it
      channelsRef.current.onError(null);
      setRun({ id: runId, compiled: result });
    });
  }, [runId, consoleRoute, copy]);

  // Typing clears stale errors (spec §5.5): ANY source input change clears
  // the error surface; re-running stays on ctrl+enter. Layout effect so the
  // clear lands BEFORE the same commit's runtime reports (child passive
  // effects run after parent layout effects).
  const inputsRef = useRef({ tsx, css, settingsForm, defaultConfig });
  useLayoutEffect(() => {
    const prev = inputsRef.current;
    const changed =
      prev.tsx !== tsx ||
      prev.css !== css ||
      prev.settingsForm !== settingsForm ||
      prev.defaultConfig !== defaultConfig;
    inputsRef.current = { tsx, css, settingsForm, defaultConfig };
    if (changed) {
      channelsRef.current.onError(null);
    }
  });

  // defaultConfig that fails to parse = runtime-channel error (brief §2:
  // 解析失败走错误闭环). Reported only for an established run — a compile
  // failure already owns the error surface.
  useEffect(() => {
    if (parsed.ok || run.id !== runId || run.compiled === null) {
      return;
    }
    channelsRef.current.onError({ kind: 'runtime', message: parsed.message });
    channelsRef.current.onConsoleEntry({
      level: 'error',
      text: parsed.message,
    });
  }, [parsed, run, runId]);

  const handleSettingsChange = useCallback(
    (nextSettings: Record<string, unknown>) => {
      if (!parsed.ok) {
        return;
      }
      onDefaultConfigChange(
        JSON.stringify({ ...parsed.config, settings: nextSettings }, null, 2),
      );
    },
    [parsed, onDefaultConfigChange],
  );

  const runEstablished = run.id === runId && run.compiled !== null;

  return (
    <div
      data-testid="widget-preview"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        height: '100%',
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Typography.Text strong>{copy.title}</Typography.Text>
        <Typography.Text
          type="secondary"
          data-testid="widget-preview-run-id"
        >{`${copy.runIdLabel}: ${runId}`}</Typography.Text>
      </div>
      <div style={{ flex: 1, minHeight: 120, position: 'relative' }}>
        {runEstablished && parsed.ok ? (
          <PreviewRunHost
            key={runId}
            compiled={run.compiled as CompiledWidget}
            css={css}
            config={parsed.config}
            settings={parsed.settings}
            consoleRoute={consoleRoute}
            channelsRef={channelsRef}
          />
        ) : (
          <div
            data-testid="widget-preview-empty"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={parsed.ok ? copy.empty : parsed.message}
            />
          </div>
        )}
      </div>
      {parsed.ok ? (
        <PreviewSettingsForm
          settingsForm={settingsForm}
          settings={parsed.settings}
          onChange={handleSettingsChange}
        />
      ) : null}
    </div>
  );
}

/**
 * One keyed RUN of the preview: subscription + data state + the compiled
 * component under its per-instance boundary. Everything stateful lives
 * here so the runId remount restarts the hook lifecycles from scratch.
 */
function PreviewRunHost({
  compiled,
  css,
  config,
  settings,
  consoleRoute,
  channelsRef,
}: {
  compiled: CompiledWidget;
  css: string;
  config: WidgetConfig;
  settings: Record<string, unknown>;
  consoleRoute: ConsoleSink;
  channelsRef: RefObject<PreviewChannels>;
}) {
  const intl = useIntl();
  const { message } = App.useApp();
  const { locale } = intl;

  // --- runtime error reporting (structured channel + console entry) ---
  const reportRuntimeError = useCallback(
    (
      error: unknown,
      meta: Pick<CompiledWidget, 'sourceURL' | 'lineOffset'>,
    ) => {
      const text = error instanceof Error ? error.message : String(error);
      const location =
        error instanceof Error
          ? resolveRuntimeErrorLocation(error, meta)
          : undefined;
      channelsRef.current.onError({
        kind: 'runtime',
        message: text,
        ...(location === undefined ? {} : { line: location.line }),
      });
      channelsRef.current.onConsoleEntry({
        level: 'error',
        text: `${intl.formatMessage({
          id: 'editor.widget.editor.preview.runtimeError',
          defaultMessage: 'Runtime error',
        })}: ${text}${
          location === undefined ? '' : ` (line ${location.line})`
        }`,
      });
    },
    [channelsRef, intl],
  );

  // --- container size (props-driven ctx, CustomWidgetHost parity) ---
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const element = rootRef.current;
    if (!element || typeof ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer = new ResizeObserver((entries) => {
      const rect = entries[entries.length - 1]?.contentRect;
      if (rect) {
        const width = Math.round(rect.width);
        const height = Math.round(rect.height);
        setSize((prev) =>
          prev.width === width && prev.height === height
            ? prev
            : { width, height },
        );
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // --- type-layer style namespace (style-scope, refcounted) ---
  useEffect(() => {
    if (!css) {
      return undefined;
    }
    const handle = mountWidgetStyle('type', PREVIEW_STYLE_SCOPE, css);
    return () => handle.release();
  }, [css]);

  // --- function-datasource subscription (spec §5.4) ---
  const [data, setData] = useState<SubscriptionData>({});
  const [latestData, setLatestData] = useState<SubscriptionData>({});

  const wrapWindow = useCallback<WrapWindow>(
    (fn) => captureConsoleSync(consoleRoute, fn),
    [consoleRoute],
  );

  // The subscription restarts only when the DATASOURCES change — WYSIWYG
  // settings edits re-render the widget but must not reset the series.
  // Parsing mints a fresh config object per defaultConfig edit, so the
  // effect consumes a JSON-stable datasources reference (same content ⇒
  // same identity): the gate stays exhaustive AND the series survive
  // settings-only edits.
  const stableDatasources = useStableJson(config.datasources ?? []);
  useEffect(() => {
    const subscription = createFunctionSubscription(
      { datasources: stableDatasources },
      {
        onData: (next) =>
          setData((prev) => (sameData(prev, next) ? prev : next)),
        onLatest: (next) =>
          setLatestData((prev) => (sameData(prev, next) ? prev : next)),
        onError: (error) => {
          reportRuntimeError(error, compiled);
        },
      },
      { wrapWindow },
    );
    subscription.start();
    return () => subscription.stop();
  }, [stableDatasources, compiled, reportRuntimeError, wrapWindow]);

  // --- the capped CustomWidgetProps assembly (ADR 0004 §4) ---
  const widgetProps = useMemo<CustomWidgetProps>(
    () => ({
      config,
      settings,
      datasources: config.datasources ?? [],
      data,
      latestData,
      timewindow:
        config.useDashboardTimewindow === false && config.timewindow
          ? config.timewindow
          : null,
      actions: config.actions ?? {},
      ctx: {
        width: size.width,
        height: size.height,
        isEdit: false,
        isPreview: true,
        locale,
        toast: (text, type = 'info') => {
          message[type](text);
        },
        // updateTimewindow stays ABSENT — the frozen contract marks it
        // optional and the preview owns no timewindow write-back target
      },
    }),
    [config, settings, data, latestData, size, locale, message],
  );

  const Compiled = compiled.component;

  return (
    <div
      ref={rootRef}
      className={widgetScopeClass('type', PREVIEW_STYLE_SCOPE)}
      style={{ width: '100%', height: '100%', overflow: 'auto' }}
    >
      <WidgetRuntimeBoundary
        resetKeys={[config, settings]}
        onRuntimeError={(error) => reportRuntimeError(error, compiled)}
      >
        {/* the compiled component is React.lazy — it needs a Suspense
            boundary INSIDE the per-instance boundary, exactly like the
            dashboard's CustomWidgetHost */}
        <Suspense fallback={null}>
          <RenderCapture consoleRoute={consoleRoute}>
            <Compiled {...widgetProps} />
          </RenderCapture>
        </Suspense>
      </WidgetRuntimeBoundary>
    </div>
  );
}

/**
 * RENDER window bracket: opened at the render phase of the compiled
 * subtree, released at the nearest microtask checkpoint (honest boundary in
 * console-capture.ts). An exception mid-render cannot leak the patch — the
 * microtask fires regardless.
 */
function RenderCapture({
  consoleRoute,
  children,
}: {
  consoleRoute: ConsoleSink;
  children: ReactNode;
}) {
  enterConsoleCaptureForMicrotask(consoleRoute);
  return <>{children}</>;
}
