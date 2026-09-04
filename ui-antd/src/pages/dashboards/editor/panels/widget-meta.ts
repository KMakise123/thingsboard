/**
 * Widget-type metadata readers for the config panel (M7 wave K).
 *
 * Schema/metadata source precedence (spec §3.4 Appearance + basic mode):
 *   ① builtin registry `meta.settingsSchema` / `meta.basicMode` /
 *      `meta.actionSources` (src/components/widgets/registry.ts meta bag);
 *   ② probed react-1 custom descriptor — GET /api/widgetType?fqn digest with
 *      `descriptor.runtime === 'react-1'`, reading `descriptor.settingsForm`
 *      / `descriptor.basicMode` (upstream key names kept verbatim);
 *   ③ none — the caller renders the honest "no configurable schema" state
 *      (占位三态 rule: never promises future support).
 *
 * All readers validate defensively: registry metas and CE descriptor bodies
 * are `unknown`-shaped passthrough data, never trusted blindly.
 */
import type { FormProperty } from '@/components/form-property/types';

/** An action source a widget type declares (ui-ngx WidgetActionSource). */
export interface PanelActionSource {
  id: string;
  name: string;
  multiple: boolean;
}

/** Type-declared basic-mode configuration (ui-ngx basicModeDirective). */
export interface BasicModeMeta {
  /** FormProperty[] rendered over the WHOLE widget config. */
  form?: FormProperty[];
  /** custom-component registry id taking over the whole basic form. */
  customComponent?: string;
}

export const DEFAULT_ACTION_SOURCES: PanelActionSource[] = [
  { id: 'headerButton', name: 'headerButton', multiple: true },
];

export function isFormPropertyArray(value: unknown): value is FormProperty[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.every(
      (item) =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as FormProperty).id === 'string',
    )
  );
}

function readBasicMode(value: unknown): BasicModeMeta | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  const raw = value as { form?: unknown; customComponent?: unknown };
  const meta: BasicModeMeta = {};
  if (isFormPropertyArray(raw.form)) {
    meta.form = raw.form;
  }
  if (typeof raw.customComponent === 'string') {
    meta.customComponent = raw.customComponent;
  }
  return meta.form || meta.customComponent ? meta : null;
}

/** ① registry meta.settingsSchema (validated FormProperty[]). */
export function settingsSchemaFromMeta(meta: unknown): FormProperty[] | null {
  if (!meta || typeof meta !== 'object') {
    return null;
  }
  const schema = (meta as { settingsSchema?: unknown }).settingsSchema;
  return isFormPropertyArray(schema) ? schema : null;
}

/**
 * ② probed widget type (services/tb/widget-type getWidgetTypeByFullFqn).
 * Only react-1 descriptors carry a React-consumable settingsForm; CE
 * (Angular) bodies never qualify.
 */
export function settingsSchemaFromDigest(
  digest: unknown,
): FormProperty[] | null {
  const descriptor = (
    digest as { descriptor?: { runtime?: unknown; settingsForm?: unknown } }
  )?.descriptor;
  if (!descriptor || typeof descriptor !== 'object') {
    return null;
  }
  if (descriptor.runtime !== 'react-1') {
    return null;
  }
  return isFormPropertyArray(descriptor.settingsForm)
    ? descriptor.settingsForm
    : null;
}

/** ① registry meta.basicMode. */
export function basicModeFromMeta(meta: unknown): BasicModeMeta | null {
  if (!meta || typeof meta !== 'object') {
    return null;
  }
  return readBasicMode((meta as { basicMode?: unknown }).basicMode);
}

/** ② probed react-1 descriptor.basicMode. */
export function basicModeFromDigest(digest: unknown): BasicModeMeta | null {
  const descriptor = (
    digest as { descriptor?: { runtime?: unknown; basicMode?: unknown } }
  )?.descriptor;
  if (!descriptor || typeof descriptor !== 'object') {
    return null;
  }
  if (descriptor.runtime !== 'react-1') {
    return null;
  }
  return readBasicMode(descriptor.basicMode);
}

/** Action sources the type declares; absent/invalid → headerButton default. */
export function actionSourcesFromMeta(meta: unknown): PanelActionSource[] {
  if (!meta || typeof meta !== 'object') {
    return DEFAULT_ACTION_SOURCES;
  }
  const raw = (meta as { actionSources?: unknown }).actionSources;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return DEFAULT_ACTION_SOURCES;
  }
  const sources: PanelActionSource[] = [];
  for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object') {
      continue;
    }
    const source = value as { name?: unknown; multiple?: unknown };
    sources.push({
      id,
      name: typeof source.name === 'string' && source.name ? source.name : id,
      multiple: source.multiple !== false,
    });
  }
  return sources.length > 0 ? sources : DEFAULT_ACTION_SOURCES;
}
