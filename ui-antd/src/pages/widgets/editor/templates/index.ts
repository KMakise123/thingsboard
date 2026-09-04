/**
 * The five React starter templates of the create path (spec §5.6 — the
 * ui-ngx select-widget-type buckets latest-values / timeseries / rpc /
 * alarm / static). Built-in FRONTEND static assets: the upstream
 * `getWidgetTemplate` system templates are Angular widgets and are NOT
 * reusable (ADR 0004 §4), so each starter ships its own tsx/css/
 * settingsForm/defaultConfig/meta five-piece bundle.
 *
 * Contract pinned by templates.test:
 *   - every starter compiles through the REAL pipeline with zero errors
 *     (which also proves it only requires the whitelist: react / widget-kit
 *     — `import type` lines are erased by the TypeScript transform);
 *   - every defaultConfig parses AND carries a `type: 'function'`
 *     datasource with a funcBody, so the editor preview has random data out
 *     of the box (§5.4 walkthrough);
 *   - components tolerate EMPTY data — the save chain's smoke render
 *     mounts them without subscriptions.
 */

import type { FormProperty } from '@/components/form-property/types';
import type { WidgetEditorMeta } from '@/core/widget/types';
import { emptyWidgetEditorDoc, type WidgetEditorDoc } from '../draft-convert';
import type { WidgetStarterKind } from '../new-dialog';
import { alarmStarter } from './alarm';
import { latestValuesStarter } from './latest-values';
import { rpcStarter } from './rpc';
import { staticStarter } from './static';
import { timeseriesStarter } from './timeseries';

/** One starter's static source bundle (the editor five-piece). */
export interface WidgetStarterTemplate {
  kind: WidgetStarterKind;
  tsx: string;
  /** '' = the starter ships no custom css. */
  css: string;
  settingsForm: FormProperty[];
  /** JSON STRING (keep-string discipline — parse for preview, never re-store). */
  defaultConfig: string;
  meta: WidgetEditorMeta;
}

export const WIDGET_STARTER_TEMPLATES: Record<
  WidgetStarterKind,
  WidgetStarterTemplate
> = {
  latest: latestValuesStarter,
  timeseries: timeseriesStarter,
  rpc: rpcStarter,
  alarm: alarmStarter,
  static: staticStarter,
};

/** Ordered for the picker UI (ui-ngx dialog order). */
export const STARTER_KIND_ORDER: WidgetStarterKind[] = [
  'latest',
  'timeseries',
  'rpc',
  'alarm',
  'static',
];

/**
 * Builds the create-path draft from a starter: a fresh `emptyWidgetEditorDoc`
 * (no id / fqn / version — the server mints identity on the first save)
 * filled with the template bundle.
 */
export function starterToDoc(kind: WidgetStarterKind): WidgetEditorDoc {
  const template = WIDGET_STARTER_TEMPLATES[kind];
  const doc = emptyWidgetEditorDoc();
  return {
    ...doc,
    source: { tsx: template.tsx, css: template.css },
    settingsForm: template.settingsForm.map((property) => ({ ...property })),
    defaultConfig: template.defaultConfig,
    meta: { ...template.meta },
  };
}
