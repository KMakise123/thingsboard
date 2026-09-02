/**
 * Widget-type registry + resolver (ADR 0003 §1.3).
 *
 * v1 builtin set = the anchor widgets (docs/spec M5 brief §6): the 7 fqns
 * used by the four demo dashboards + the gauge representative. Every entry
 * currently points at the pending placeholder; W2 replaces entries one by
 * one with `lazy(() => import('./<widget>'))` implementations — the registry
 * shape and the resolution chain below are stable.
 *
 * Resolution chain for an unknown fqn:
 *   GET /api/widgetType?fqn=… →
 *     descriptor.runtime === 'react-1' → 'unsupported-custom' (v2 editor
 *     compiles custom widgets; v1 never does)
 *     runtime missing (CE descriptors are Angular) → 'unsupported-angular'
 *     404 / probe failure → 'missing'
 */
import { type LazyExoticComponent, lazy } from 'react';

import type { WidgetComponent } from './contract';
import { PendingWidgetPlaceholder } from './placeholders';

export interface WidgetRegistryEntry {
  component: LazyExoticComponent<WidgetComponent>;
  meta?: {
    /** human label, walkthrough/debug aid. */
    label?: string;
    [key: string]: unknown;
  };
}

function pendingEntry(meta?: { label?: string }): WidgetRegistryEntry {
  return {
    component: lazy(async () => ({
      default: PendingWidgetPlaceholder as WidgetComponent,
    })),
    meta,
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
  | { kind: 'unsupported-angular'; fqn: string }
  | { kind: 'unsupported-custom'; fqn: string }
  | { kind: 'missing'; fqn: string };

export function builtinWidgetEntry(
  fqn: string,
): WidgetRegistryEntry | undefined {
  return WIDGET_REGISTRY[fqn];
}

/** Maps the /api/widgetType probe result onto a placeholder resolution. */
export function resolveProbedWidgetType(
  fqn: string,
  descriptor: { descriptor?: Record<string, unknown> } | undefined,
): WidgetResolution {
  const runtime = descriptor?.descriptor?.runtime;
  if (runtime === 'react-1') {
    return { kind: 'unsupported-custom', fqn };
  }
  return { kind: 'unsupported-angular', fqn };
}
