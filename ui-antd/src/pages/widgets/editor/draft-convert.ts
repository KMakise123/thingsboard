/**
 * WidgetType wire ↔ WidgetEditorDraft conversion (M9 brief §3 wave S item 3).
 *
 * Pure functions in BOTH directions; the round-trip is lossless:
 *   - descriptor keys no draft field represents (templateHtml, controller
 *     scripts, resources, dataKeySettingsForm, unknown future keys…) ride
 *     along in `WidgetEditorDoc.descriptorPassthrough` and are re-merged
 *     verbatim on save — this is the passthrough channel the frozen
 *     WidgetEditorDraft doc comment promises (core/widget/types.ts);
 *   - `defaultConfig` stays a JSON STRING end-to-end;
 *   - `settingsForm` narrows once here: the wire side is a free
 *     `Array<Record<string, unknown>>` (types/tb must not import UI types),
 *     the draft side is `FormProperty[]` — asserted exactly once, at this
 *     boundary (M9 brief revision record, wave-1 F erratum);
 *   - `fqn` is the SHORT scope-less wire name;
 *   - empty css normalizes away on save (`source.css` absent = no css).
 *
 * The conversion accepts ANY descriptor (including legacy Angular ones,
 * whose legacy keys land in the passthrough) — the restricted-derivation
 * path (wave-3 D) reuses it; the editor page itself refuses to OPEN a
 * non-react-1 type for source editing.
 */

import type { FormProperty } from '@/components/form-property/types';
import type { WidgetEditorDraft, WidgetEditorMeta } from '@/core/widget/types';
import { WIDGET_DESCRIPTOR_SCHEMA_VERSION } from '@/core/widget/types';
import { EntityType } from '@/types/tb/entity';
import type {
  WidgetSettingsFormWire,
  WidgetTypeDescriptor,
  WidgetTypeDetails,
  WidgetTypeKind,
} from '@/types/tb/widget-type';

/**
 * The editor session document: the frozen WidgetEditorDraft plus the
 * descriptor passthrough channel. Every wave-2/3 consumer typed against
 * `EditorSession<WidgetEditorDraft>` keeps working — WidgetEditorDoc is a
 * structural subtype (only additive fields).
 */
export interface WidgetEditorDoc extends WidgetEditorDraft {
  /** see module doc — never edited by the UI, re-merged verbatim on save. */
  descriptorPassthrough: Record<string, unknown>;
}

/**
 * Meta fallback when the descriptor omits the keys — the upstream
 * defaults (`MissingWidgetType`, ui-ngx widget-component.models.ts):
 * latest / 8×6.
 */
export const DEFAULT_WIDGET_META: WidgetEditorMeta = {
  type: 'latest',
  sizeX: 8,
  sizeY: 6,
};

/** Empty draft for the create path (new-dialog deliverer, wave-3 D). */
export function emptyWidgetEditorDoc(): WidgetEditorDoc {
  return {
    widgetTypeId: null,
    fqn: '',
    name: '',
    source: { tsx: '', css: '' },
    settingsForm: [],
    defaultConfig: '{}',
    meta: { ...DEFAULT_WIDGET_META },
    version: null,
    descriptorPassthrough: {},
  };
}

/**
 * wire WidgetTypeDetails → editor draft. Legacy Angular descriptors convert
 * fine (their keys land in the passthrough; source comes back empty).
 */
export function widgetTypeToDraft(details: WidgetTypeDetails): WidgetEditorDoc {
  const descriptor = details.descriptor ?? {};
  const {
    type,
    sizeX,
    sizeY,
    typeParameters,
    actionSources,
    settingsForm,
    defaultConfig,
    runtime: _runtime,
    schemaVersion: _schemaVersion,
    source,
    ...passthrough
  } = descriptor;
  return {
    widgetTypeId: details.id?.id ?? null,
    fqn: details.fqn ?? '',
    name: details.name ?? '',
    source: { tsx: source?.tsx ?? '', css: source?.css ?? '' },
    settingsForm: assertSettingsForm(settingsForm),
    defaultConfig:
      typeof defaultConfig === 'string'
        ? defaultConfig
        : defaultConfig === undefined || defaultConfig === null
          ? '{}'
          : // defensive: a non-string defaultConfig is corrupted upstream data
            JSON.stringify(defaultConfig),
    meta: {
      type: (type ?? DEFAULT_WIDGET_META.type) as WidgetTypeKind,
      sizeX: sizeX ?? DEFAULT_WIDGET_META.sizeX,
      sizeY: sizeY ?? DEFAULT_WIDGET_META.sizeY,
      ...(typeParameters ? { typeParameters } : {}),
      ...(actionSources ? { actionSources } : {}),
    },
    version: details.version ?? null,
    descriptorPassthrough: passthrough,
  };
}

/**
 * editor draft → wire WidgetTypeDetails (the POST upsert body). With id =
 * update (fqn must echo the immutable value), without = create (server
 * derives a unique fqn from the name).
 */
export function draftToWidgetType(doc: WidgetEditorDoc): WidgetTypeDetails {
  const { source } = doc;
  const descriptor: WidgetTypeDescriptor = {
    ...doc.descriptorPassthrough,
    runtime: 'react-1',
    schemaVersion: WIDGET_DESCRIPTOR_SCHEMA_VERSION,
    source: source.css
      ? { tsx: source.tsx, css: source.css }
      : { tsx: source.tsx },
    type: doc.meta.type,
    sizeX: doc.meta.sizeX,
    sizeY: doc.meta.sizeY,
    ...(doc.meta.typeParameters
      ? { typeParameters: doc.meta.typeParameters }
      : {}),
    ...(doc.meta.actionSources
      ? { actionSources: doc.meta.actionSources }
      : {}),
    settingsForm: doc.settingsForm.map((property) => ({
      ...property,
    })) as WidgetSettingsFormWire,
    defaultConfig: doc.defaultConfig,
  };
  return {
    ...(doc.widgetTypeId
      ? {
          id: { entityType: EntityType.WIDGET_TYPE, id: doc.widgetTypeId },
          // immutable on update — echo it back untouched
          fqn: doc.fqn,
        }
      : {}),
    name: doc.name,
    ...(doc.version === null ? {} : { version: doc.version }),
    descriptor,
  };
}

/**
 * The ONE narrowing point: wire settingsForm (free record array) →
 * FormProperty[]. Throws a readable error on shapes that could never be a
 * form recipe — saving must not silently drop the schema.
 */
function assertSettingsForm(
  wire: WidgetSettingsFormWire | undefined,
): FormProperty[] {
  if (wire === undefined) {
    return [];
  }
  const malformed = !Array.isArray(wire)
    ? true
    : wire.some(
        (property) =>
          property === null ||
          typeof property !== 'object' ||
          Array.isArray(property),
      );
  if (malformed) {
    throw new Error(
      'widget descriptor settingsForm is not a FormProperty[] array',
    );
  }
  // the runtime assertion above is the narrowing proof; TS needs the hop
  return wire as unknown as FormProperty[];
}
