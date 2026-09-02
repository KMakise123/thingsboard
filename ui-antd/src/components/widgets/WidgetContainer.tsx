/**
 * WidgetContainer — the runtime shell around one widget instance
 * (ADR 0003). Responsibilities:
 *   - resolve the widget type: builtin registry → lazy component; otherwise
 *     probe GET /api/widgetType?fqn and map to one of the three placeholder
 *     states (unsupported-angular / unsupported-custom / missing);
 *   - compute the widget runtime context (effective timewindow, expanded
 *     datasources) so W2 widget components only consume `ctx`;
 *   - render inside Suspense while lazy chunks load.
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
import { getWidgetTypeByFqn } from '@/services/tb/dashboard';
import type { DashboardFilter } from '@/types/tb/dashboard';
import type { Timewindow } from '@/types/tb/timewindow';
import type { Widget, WidgetLayout } from '@/types/tb/widget';
import {
  effectiveWidgetTimewindow,
  type WidgetComponentProps,
  type WidgetRuntimeContext,
} from './contract';
import { WidgetPlaceholder } from './placeholders';
import { builtinWidgetEntry, resolveProbedWidgetType } from './registry';

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
}: WidgetContainerProps) {
  const fqn = widget.typeFullFqn;
  const entry = builtinWidgetEntry(fqn);

  const probe = useQuery({
    queryKey: ['widgetType', fqn],
    queryFn: () => getWidgetTypeByFqn(fqn),
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
    const resolution = resolveProbedWidgetType(fqn, probe.data);
    if (resolution.kind === 'unsupported-custom') {
      return <WidgetPlaceholder reason="unsupported-custom" fqn={fqn} />;
    }
    return <WidgetPlaceholder reason="unsupported-angular" fqn={fqn} />;
  })();

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Suspense fallback={<Spin size="small" />}>{body}</Suspense>
    </div>
  );
}
