/**
 * CustomWidgetHost — the bridge between the dashboard runtime and a compiled
 * react-1 widget (ADR 0004 §4).
 *
 * The dashboard side hands every widget component `WidgetComponentProps`
 * (fqn/widgetId/widget/layout/ctx, data via alias-expanded datasources);
 * a compiled custom component expects the CAPPED `CustomWidgetProps`
 * contract. This adapter maps between them WITHOUT breaking the runtime
 * contracts the builtin widgets live under:
 *   - data subscriptions reuse the shared hooks (10-cmd budget enforced by
 *     the WS manager; the signature-guarded effects never resubscribe on
 *     parent re-renders);
 *   - the timeseries channel carries the latest-value columns on the SAME
 *     cmd; the dedicated ENTITY_DATA channel runs only for latest-only
 *     widgets (no timeseries keys);
 *   - ctx.width/height come from a container ResizeObserver — widgets stay
 *     DOM-observation-free (props-driven contract);
 *   - styles mount through core/widget/style-scope: type css refcounted per
 *     fqn, instance css (`config.widgetCss`) per widgetId;
 *   - the compiled component renders inside a per-instance error boundary
 *     so one broken widget can never take a dashboard down.
 *
 * rpc stays undefined for now (optional in the frozen contract — no RPC
 * transport exists yet); ctx.updateTimewindow is a present-but-empty stub
 * for widgets that own a private timewindow (interface live, write-back
 * lands with M10 timewindow work).
 */
import { App, Typography } from 'antd';
import {
  Component,
  type ComponentType,
  createContext,
  type ReactNode,
  Suspense,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useIntl } from 'react-intl';
import type { ExpandedDatasource } from '@/core/dashboard/datasources';
import { mountWidgetStyle, widgetScopeClass } from '@/core/widget/style-scope';
import type { CustomWidgetCtx, CustomWidgetProps } from '@/core/widget/types';
import type { EntityTimeseriesRow } from '@/core/ws';
import type {
  SubscriptionData,
  SubscriptionDataEntry,
  TsValue,
} from '@/types/tb/telemetry';
import type { WidgetComponent, WidgetComponentProps } from './contract';
import { entityKeyTypeOfDataKey } from './hooks/entity-filter';
import { useEntityLatestData } from './hooks/use-entity-latest';
import { useEntityTimeseries } from './hooks/use-entity-timeseries';

/**
 * Dashboard edit-mode marker for `ctx.isEdit`. Provided by WidgetContainer
 * (context, not props: the resolution/host identity must stay stable when
 * the editor flips edit mode).
 */
export const CustomWidgetEditContext = createContext(false);

const EMPTY_DATASOURCES: Array<ExpandedDatasource> = [];

export interface CustomWidgetHostConfig {
  /** lazy-wrapped compiled component from the compile pipeline. */
  component: ComponentType<CustomWidgetProps>;
  /** type-layer css (descriptor source.css), undefined = none. */
  typeCss?: string;
}

function entryOf(point: TsValue): SubscriptionDataEntry {
  return point.count === undefined
    ? [point.ts, point.value]
    : [point.ts, point.value, point.count];
}

function targetSeriesOf(
  out: SubscriptionData,
  key: string,
): SubscriptionDataEntry[] {
  const existing = out[key];
  if (existing) {
    return existing;
  }
  const fresh: SubscriptionDataEntry[] = [];
  out[key] = fresh;
  return fresh;
}

function mergeTimeseries(rows: Array<EntityTimeseriesRow>): SubscriptionData {
  const out: SubscriptionData = {};
  for (const row of rows) {
    for (const [key, series] of Object.entries(row.timeseries ?? {})) {
      const target = targetSeriesOf(out, key);
      for (const point of series) {
        target.push(entryOf(point));
      }
    }
  }
  return out;
}

function mergeLatest(
  sources: Array<Record<string, Record<string, TsValue>> | undefined>,
): SubscriptionData {
  const out: SubscriptionData = {};
  for (const source of sources) {
    for (const perEntity of Object.values(source ?? {})) {
      for (const [key, point] of Object.entries(perEntity)) {
        const target = targetSeriesOf(out, key);
        target.push(entryOf(point));
      }
    }
  }
  return out;
}

/** Per-instance guard: a render-time crash degrades to a readable card. */
class CompiledWidgetBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          data-widget-broken="runtime"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: 8,
            textAlign: 'center',
          }}
        >
          <RuntimeErrorText error={this.state.error} />
        </div>
      );
    }
    return this.props.children;
  }
}

function RuntimeErrorText({ error }: { error: Error }) {
  const { formatMessage } = useIntl();
  return (
    <>
      <Typography.Text type="danger">
        {formatMessage({ id: 'editor.widgetKit.runtimeError' })}
      </Typography.Text>
      {/* compiled-widget error text is passthrough (ADR 0004 §6) */}
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {error.message}
      </Typography.Text>
    </>
  );
}

function HostInner({
  fqn,
  widgetId,
  widget,
  ctx,
  component: Compiled,
  typeCss,
}: WidgetComponentProps & {
  component: ComponentType<CustomWidgetProps>;
  typeCss?: string;
}) {
  const { locale } = useIntl();
  const { message } = App.useApp();
  const isEdit = useContext(CustomWidgetEditContext);

  // container size — the widget sees props, never a ResizeObserver
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
        setSize((prev) => {
          const width = Math.round(rect.width);
          const height = Math.round(rect.height);
          return prev.width === width && prev.height === height
            ? prev
            : { width, height };
        });
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // --- data channels (shared hooks; budget + memo contracts preserved) ---
  const entities = useMemo(
    () => ctx.datasources.flatMap((datasource) => datasource.entities),
    [ctx.datasources],
  );
  const timeseriesKeys = useMemo(
    () => [
      ...new Set(
        ctx.datasources.flatMap((datasource) =>
          (datasource.dataKeys ?? [])
            .filter((key) => key.type === 'timeseries')
            .map((key) => key.name),
        ),
      ),
    ],
    [ctx.datasources],
  );
  const latestKeys = useMemo(() => {
    const seen = new Set<string>();
    const keys: Array<{ type: string; key: string }> = [];
    for (const datasource of ctx.datasources) {
      for (const key of datasource.dataKeys ?? []) {
        if (key.type !== 'attribute' && key.type !== 'timeseries') {
          continue;
        }
        const mapped = {
          type: entityKeyTypeOfDataKey(key.type),
          key: key.name,
        };
        const id = `${mapped.type}:${mapped.key}`;
        if (!seen.has(id)) {
          seen.add(id);
          keys.push(mapped);
        }
      }
    }
    return keys;
  }, [ctx.datasources]);

  const timeseries = useEntityTimeseries({
    entities,
    timeseriesKeys,
    latestKeys,
    effectiveTimewindow: ctx.effectiveTimewindow,
  });
  // when the ts channel runs, latest values ride the SAME cmd (no extra
  // cmds); the dedicated ENTITY_DATA channel is for latest-only widgets
  const latestOnlyDatasources =
    timeseriesKeys.length > 0 ? EMPTY_DATASOURCES : ctx.datasources;
  const latestOnly = useEntityLatestData(latestOnlyDatasources);

  const data = useMemo(
    () => mergeTimeseries(timeseries.rows),
    [timeseries.rows],
  );
  const latestData = useMemo(
    () =>
      timeseriesKeys.length > 0
        ? mergeLatest(timeseries.rows.map((row) => row.latest))
        : mergeLatest(latestOnly.entries.map((entry) => entry.row.latest)),
    [timeseries.rows, latestOnly.entries, timeseriesKeys.length],
  );

  // --- styles: type layer refcounted per fqn, instance layer per widgetId ---
  useEffect(() => {
    if (!typeCss) {
      return undefined;
    }
    const handle = mountWidgetStyle('type', fqn, typeCss);
    return () => handle.release();
  }, [fqn, typeCss]);
  const instanceCss =
    typeof widget.config.widgetCss === 'string' ? widget.config.widgetCss : '';
  useEffect(() => {
    if (!instanceCss) {
      return undefined;
    }
    const handle = mountWidgetStyle('instance', widgetId, instanceCss);
    return () => handle.release();
  }, [widgetId, instanceCss]);

  const customProps = useMemo<CustomWidgetProps>(
    () => ({
      config: widget.config,
      settings: widget.config.settings ?? {},
      datasources: ctx.datasources.map((datasource, index) => {
        const raw = widget.config.datasources?.[index];
        const entity = datasource.entities[0];
        return {
          ...raw,
          type: datasource.type,
          name: datasource.entityName ?? datasource.name ?? raw?.name ?? null,
          entityId: entity
            ? { entityType: entity.entityType, id: entity.id }
            : raw?.entityId,
          dataKeys: datasource.dataKeys,
          latestDataKeys: datasource.latestDataKeys,
        };
      }),
      data,
      latestData,
      timewindow: ctx.effectiveTimewindow,
      actions: widget.config.actions ?? {},
      ctx: {
        width: size.width,
        height: size.height,
        isEdit,
        isPreview: false,
        locale,
        toast: (text, type = 'info') => {
          message[type](text);
        },
        // present-but-empty stub for private-timewindow widgets (M10 wires
        // the write-back); absent for dashboard-timewindow widgets
        ...(widget.config.useDashboardTimewindow === false
          ? { updateTimewindow: () => {} }
          : {}),
      } satisfies CustomWidgetCtx,
    }),
    [
      widget.config,
      ctx.datasources,
      ctx.effectiveTimewindow,
      data,
      latestData,
      size,
      isEdit,
      locale,
      message,
    ],
  );

  return (
    <div
      ref={rootRef}
      className={widgetScopeClass('type', fqn)}
      style={{ width: '100%', height: '100%', overflow: 'hidden' }}
    >
      <div
        className={widgetScopeClass('instance', widgetId)}
        style={{ width: '100%', height: '100%' }}
      >
        <CompiledWidgetBoundary>
          <Suspense fallback={null}>
            <Compiled {...customProps} />
          </Suspense>
        </CompiledWidgetBoundary>
      </div>
    </div>
  );
}

/**
 * Build the dashboard-side component for one compiled custom widget type.
 * Called by the registry resolver once per resolution (cache-stable); the
 * returned component consumes the standard `WidgetComponentProps`.
 */
export function createCustomWidgetHost(
  config: CustomWidgetHostConfig,
): WidgetComponent {
  function CustomWidgetHost(props: WidgetComponentProps) {
    return (
      <HostInner
        {...props}
        component={config.component}
        typeCss={config.typeCss}
      />
    );
  }
  CustomWidgetHost.displayName = 'CustomWidgetHost';
  return CustomWidgetHost;
}
