/**
 * Widget-type registry + resolver (ADR 0003 §1.3; M9 wave-2 react-1 upgrade).
 *
 * v1 builtin set = the anchor widgets (docs/spec M5 brief §6): the 7 fqns
 * used by the four demo dashboards + the gauge representative.
 *
 * Resolution chain for an unknown fqn (ADR 0003, upgraded by ADR 0004 §4):
 *   GET /api/widgetType?fqn=… (typed transport, full fqn) →
 *     404 / fetch failure            → 'missing'
 *     descriptor.runtime missing     → 'unsupported-angular' (CE descriptors)
 *     runtime === 'react-1'          → compile (`fqn@version` cached) →
 *                                      'custom' with the CustomWidgetHost
 *                                      adapter wrapped lazy — the SAME
 *                                      registration face as builtins
 *     react-1 but compile failed     → 'custom-broken' (readable error,
 *                                      dashboard never crashes on it)
 *
 * Placeholder copy stays centralized in placeholders.tsx (dashboards locale
 * domain); the compile-broken state carries its own copy in the widget-kit
 * locale domain because it is a fork-widget state, not an ADR 0003 state.
 */
import { type LazyExoticComponent, lazy } from 'react';

import type { WidgetCompileError } from '@/core/widget/compile';
import { compileWidgetCached } from '@/core/widget/resolve-cache';
import type { WidgetType } from '@/types/tb/widget-type';
import type { WidgetComponent } from './contract';
import { createCustomWidgetHost } from './custom-widget-host';

export interface WidgetRegistryEntry {
  component: LazyExoticComponent<WidgetComponent>;
  meta?: {
    /** human label, walkthrough/debug aid. */
    label?: string;
    [key: string]: unknown;
  };
}

/**
 * The v1 builtin registry. Keys are exact typeFullFqn strings as stored in
 * dashboard JSONs (`system.` prefix = system-scope widget types).
 */
export const WIDGET_REGISTRY: Record<string, WidgetRegistryEntry> = {
  'system.time_series_chart': {
    component: lazy(() => import('./timeseries-chart')),
    meta: { label: 'Time series chart' },
  },
  'system.cards.entities_table': {
    component: lazy(() => import('./entities-table')),
    meta: { label: 'Entities table' },
  },
  'system.cards.timeseries_table': {
    component: lazy(() => import('./timeseries-table')),
    meta: { label: 'Timeseries table' },
  },
  'system.cards.html_value_card': {
    component: lazy(() => import('./html-value-card')),
    meta: { label: 'HTML value card' },
  },
  'system.alarm_widgets.alarms_table': {
    component: lazy(() => import('./alarms-table')),
    meta: { label: 'Alarms table' },
  },
  'system.map': {
    component: lazy(() => import('./map')),
    meta: { label: 'Map' },
  },
  'system.input_widgets.update_multiple_attributes': {
    component: lazy(() => import('./update-multiple-attributes')),
    meta: { label: 'Update multiple attributes' },
  },
  'system.analogue_gauges.radial_gauge': {
    component: lazy(() => import('./radial-gauge')),
    meta: { label: 'Radial gauge' },
  },
};

/** Result of resolving an fqn through the registry + probe chain. */
export type WidgetResolution =
  | { kind: 'builtin'; component: LazyExoticComponent<WidgetComponent> }
  | { kind: 'pending'; component: LazyExoticComponent<WidgetComponent> }
  | {
      /** compiled react-1 custom widget, adapter-wrapped (WidgetComponentProps in, CustomWidgetProps mapped). */
      kind: 'custom';
      component: LazyExoticComponent<WidgetComponent>;
      fqn: string;
    }
  | {
      /** react-1 widget whose source does not compile — readable error, no crash. */
      kind: 'custom-broken';
      fqn: string;
      error: WidgetCompileError;
    }
  | { kind: 'unsupported-angular'; fqn: string }
  | { kind: 'missing'; fqn: string };

export function builtinWidgetEntry(
  fqn: string,
): WidgetRegistryEntry | undefined {
  return WIDGET_REGISTRY[fqn];
}

/**
 * Map a fetched widget type onto a resolution. Synchronous — the compile
 * itself is synchronous (Sucrase + new Function); caching happens inside
 * `compileWidgetCached` (`fqn@version`).
 */
export function resolveWidgetTypeResolution(
  fqn: string,
  widgetType: WidgetType | undefined,
): WidgetResolution {
  if (!widgetType) {
    return { kind: 'missing', fqn };
  }
  const descriptor = widgetType.descriptor;
  if (descriptor?.runtime !== 'react-1') {
    // CE/upstream descriptors are Angular script payloads (runtime absent)
    return { kind: 'unsupported-angular', fqn };
  }
  const source = descriptor.source?.tsx;
  if (!source) {
    return {
      kind: 'custom-broken',
      fqn,
      error: {
        stage: 'transform',
        message:
          'descriptor.runtime is "react-1" but descriptor.source.tsx is missing — the type was not saved by the widget editor.',
      },
    };
  }
  const compiled = compileWidgetCached(fqn, widgetType.version, source);
  if ('error' in compiled) {
    return { kind: 'custom-broken', fqn, error: compiled.error };
  }
  const host = hostForCompiled(compiled, descriptor.source?.css);
  return {
    kind: 'custom',
    fqn,
    component: lazy(async () => ({ default: host as WidgetComponent })),
  };
}

/**
 * One host component per cached compiled module — N dashboard containers
 * of the same `fqn@version` share the registered component identity (same
 * registration face semantics as the builtin registry entries).
 */
const hostPerCompiled = new WeakMap<object, WidgetComponent>();

function hostForCompiled(
  compiled: {
    component: Parameters<typeof createCustomWidgetHost>[0]['component'];
  },
  typeCss: string | undefined,
): WidgetComponent {
  const cached = hostPerCompiled.get(compiled.component);
  if (cached) {
    return cached;
  }
  const host = createCustomWidgetHost({
    component: compiled.component,
    typeCss,
  });
  hostPerCompiled.set(compiled.component, host);
  return host;
}
