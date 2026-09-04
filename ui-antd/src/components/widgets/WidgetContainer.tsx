/**
 * WidgetContainer — the runtime shell around one widget instance
 * (ADR 0003; M9 wave-2 resolution-driven). Responsibilities:
 *   - resolve the widget type: builtin registry → lazy component; otherwise
 *     fetch the type through the typed transport (getWidgetTypeByFullFqn)
 *     and map it to a resolution: compiled custom widget ('custom'),
 *     compile-broken card ('custom-broken'), or the placeholder states
 *     (unsupported-angular / missing);
 *   - compute the widget runtime context (effective timewindow, expanded
 *     datasources) so widget components only consume `ctx`;
 *   - render inside Suspense while lazy chunks load;
 *   - publish the edit-mode marker to compiled custom widgets via context
 *     (the resolution identity must not change when edit mode flips).
 *
 * The container knows nothing about grid geometry (TbGridLayout positions
 * it) or copy (placeholders read the dashboards locale domain).
 */
import { useQuery } from '@tanstack/react-query';
import { Spin } from 'antd';
import { Suspense, useMemo } from 'react';
import type { StatesController } from '@/components/dashboard/use-states-controller';
import type { AliasResolution } from '@/core/dashboard/alias-resolver';
import { expandWidgetDatasources } from '@/core/dashboard/datasources';
import { getWidgetTypeByFullFqn } from '@/services/tb/widget-type';
import type { DashboardFilter } from '@/types/tb/dashboard';
import type { Timewindow } from '@/types/tb/timewindow';
import type { Widget, WidgetLayout } from '@/types/tb/widget';
import {
  effectiveWidgetTimewindow,
  type WidgetComponentProps,
  type WidgetRuntimeContext,
} from './contract';
import { CustomWidgetBrokenPanel } from './custom-widget-broken';
import { CustomWidgetEditContext } from './custom-widget-host';
import { WidgetPlaceholder } from './placeholders';
import { builtinWidgetEntry, resolveWidgetTypeResolution } from './registry';

export interface WidgetContainerProps {
  widgetId: string;
  widget: Widget;
  layout: WidgetLayout;
  /** dashboard global timewindow (configuration.timewindow). */
  dashboardTimewindow: Timewindow;
  aliases: AliasResolution;
  filters?: Record<string, DashboardFilter>;
  states: StatesController;
  isMobile: boolean;
  /** dashboard edit-mode marker surfaced to compiled custom widget ctx. */
  isEdit?: boolean;
}

function isNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    (error as { status?: unknown }).status === 404
  );
}

export function WidgetContainer({
  widgetId,
  widget,
  layout,
  dashboardTimewindow,
  aliases,
  filters,
  states,
  isMobile,
  isEdit = false,
}: WidgetContainerProps) {
  const fqn = widget.typeFullFqn;
  const entry = builtinWidgetEntry(fqn);

  const probe = useQuery({
    queryKey: ['widgetType', fqn],
    queryFn: () => getWidgetTypeByFullFqn(fqn),
    enabled: !entry,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });

  const ctx = useMemo<WidgetRuntimeContext>(
    () => ({
      effectiveTimewindow: effectiveWidgetTimewindow(
        widget,
        dashboardTimewindow,
      ),
      aliases,
      datasources: expandWidgetDatasources(widget, aliases, filters),
      states,
      isMobile,
    }),
    [widget, dashboardTimewindow, aliases, filters, states, isMobile],
  );

  const resolution = useMemo(
    () =>
      probe.data === undefined
        ? undefined
        : resolveWidgetTypeResolution(fqn, probe.data),
    [fqn, probe.data],
  );

  const body = (() => {
    if (entry) {
      const Component = entry.component;
      const props: WidgetComponentProps = {
        fqn,
        widgetId,
        widget,
        layout,
        ctx,
      };
      return <Component {...props} />;
    }
    if (probe.isPending) {
      return <Spin size="small" />;
    }
    if (probe.isError) {
      if (!isNotFound(probe.error)) {
        console.warn(
          `[dashboard] widget type probe failed for ${fqn}:`,
          probe.error,
        );
      }
      return <WidgetPlaceholder reason="missing" fqn={fqn} />;
    }
    if (!resolution) {
      return <Spin size="small" />;
    }
    switch (resolution.kind) {
      case 'custom': {
        const Component = resolution.component;
        return (
          <Component
            fqn={fqn}
            widgetId={widgetId}
            widget={widget}
            layout={layout}
            ctx={ctx}
          />
        );
      }
      case 'custom-broken':
        return (
          <CustomWidgetBrokenPanel
            fqn={resolution.fqn}
            error={resolution.error}
          />
        );
      case 'unsupported-angular':
        return <WidgetPlaceholder reason="unsupported-angular" fqn={fqn} />;
      default:
        return <WidgetPlaceholder reason="missing" fqn={fqn} />;
    }
  })();

  return (
    <CustomWidgetEditContext.Provider value={isEdit}>
      <div style={{ height: '100%', width: '100%' }}>
        <Suspense fallback={<Spin size="small" />}>{body}</Suspense>
      </div>
    </CustomWidgetEditContext.Provider>
  );
}
