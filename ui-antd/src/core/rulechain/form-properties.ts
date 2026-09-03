/**
 * form-properties — rule-node configuration FORM GENERATOR (M8 brief §2:
 * ADR 0004 §3 定案路线 — the per-node Angular directives of ui-ngx are
 * replaced by "generator + uiHints + custom-component registry").
 *
 * Input: a component descriptor's `defaultConfiguration` VALUE TREE (the only
 * field-fact source the backend guarantees). Output: FormProperty[] for the
 * M7 renderer (components/form-property).
 *
 * Inference is by VALUE SHAPE, hints always win:
 *   boolean → switch · number → number · string → text
 *   string + hint.enumOptions → select(items)
 *   primitive array → array(text|number tag list) · other array → array(json)
 *   nested object → fieldset (recursive) · null → json fallback
 *
 * Identity contract (frozen for wave-3 K2/R):
 *  - property.id is the PATH SEGMENT (fieldset children are relative to
 *    their parent object, matching FormPropertyForm's fieldset recursion).
 *  - hints are looked up by full dotted path FROM THE CONFIGURATION ROOT;
 *    a bare-path key and a `${clazz}.${path}` key both resolve (the flat
 *    "clazz + 字段路径" keying of ui-hints.ts works as-is).
 *  - hint.label / enumOptions are baked into name/items at generation time,
 *    so the generated list is self-contained; render-time hints are still
 *    passed for group/order layout.
 *
 * Fidelity contract (100%-editable-rate foundation, spec §4.5): EVERY key of
 * the value tree gets exactly one property and the original value is carried
 * in `default`; {@link hydrateConfiguration} is the canonical "values back"
 * half of the round-trip and preserves keys the generator does not know.
 */
import {
  type FormProperty,
  FormPropertyType,
  type FormSelectItem,
} from '@/components/form-property/types';
import type { UiHints } from '@/components/form-property/ui-hints';

export function getFormProperties(
  clazz: string,
  defaultConfiguration: Record<string, unknown> | undefined,
  hints?: UiHints,
): FormProperty[] {
  if (!defaultConfiguration) {
    return [];
  }
  return Object.entries(defaultConfiguration).map(([key, value]) =>
    propertyForPath(clazz, key, key, value, hints),
  );
}

function propertyForPath(
  clazz: string,
  id: string,
  path: string,
  value: unknown,
  hints: UiHints | undefined,
): FormProperty {
  const hint = hints?.[path] ?? hints?.[`${clazz}.${path}`];
  const base: FormProperty = {
    id,
    name: hint?.label ?? id,
    type: FormPropertyType.json,
    default: value,
    ...(hint?.group ? { group: hint.group } : {}),
    ...(hint?.rows !== undefined ? { rows: hint.rows } : {}),
  };

  // Control resolution: hint widget > hint enumOptions > value shape.
  if (hint?.widget) {
    switch (hint.widget) {
      case 'number':
        return { ...base, type: FormPropertyType.number };
      case 'switch':
        return { ...base, type: FormPropertyType.switch };
      case 'password':
        return { ...base, type: FormPropertyType.password };
      case 'textarea':
        return { ...base, type: FormPropertyType.textarea };
      case 'select':
        return selectProperty(base, hint.enumOptions ?? []);
      case 'json':
        return base;
      case 'input':
        return { ...base, type: FormPropertyType.text };
    }
  }
  if (hint?.enumOptions?.length) {
    return selectProperty(base, hint.enumOptions);
  }

  if (typeof value === 'boolean') {
    return { ...base, type: FormPropertyType.switch };
  }
  if (typeof value === 'number') {
    return { ...base, type: FormPropertyType.number };
  }
  if (typeof value === 'string') {
    return { ...base, type: FormPropertyType.text };
  }
  if (Array.isArray(value)) {
    return { ...base, type: FormPropertyType.array, ...arrayItemShape(value) };
  }
  if (value !== null && typeof value === 'object') {
    const properties = Object.entries(value as Record<string, unknown>).map(
      ([childKey, childValue]) =>
        propertyForPath(
          clazz,
          childKey,
          `${path}.${childKey}`,
          childValue,
          hints,
        ),
    );
    return { ...base, type: FormPropertyType.fieldset, properties };
  }
  // null / undefined / anything exotic → JSON source fallback (M7 renders it
  // as an editable JSON field — the spec's per-field source-mode semantics).
  return base;
}

function selectProperty(
  base: FormProperty,
  items: FormSelectItem[],
): FormProperty {
  return { ...base, type: FormPropertyType.select, items };
}

function arrayItemShape(value: unknown[]): {
  arrayItemName?: string;
  arrayItemType?: FormPropertyType;
} {
  if (value.every((item) => typeof item === 'string')) {
    return { arrayItemName: 'item', arrayItemType: FormPropertyType.text };
  }
  if (value.every((item) => typeof item === 'number')) {
    return { arrayItemName: 'item', arrayItemType: FormPropertyType.number };
  }
  return { arrayItemName: 'item', arrayItemType: FormPropertyType.json };
}

/**
 * The "values back" half of the generator round-trip: walks the generated
 * properties over `source` and returns the configuration tree. Keys absent
 * from `source` are seeded from `property.default`; keys NOT covered by the
 * properties are carried over untouched at every nesting level — the hard
 * fidelity gate behind the 100%-editable-rate criterion (spec §4.5).
 * Pure: `source` is never mutated.
 */
export function hydrateConfiguration(
  properties: FormProperty[],
  source: Record<string, unknown>,
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...source };
  for (const property of properties) {
    if (property.type === FormPropertyType.fieldset && property.properties) {
      const nested =
        source[property.id] !== undefined &&
        typeof source[property.id] === 'object' &&
        source[property.id] !== null &&
        !Array.isArray(source[property.id])
          ? (source[property.id] as Record<string, unknown>)
          : {};
      result[property.id] = hydrateConfiguration(property.properties, nested);
      continue;
    }
    if (source[property.id] === undefined) {
      result[property.id] = property.default;
    }
  }
  // Reference stability: when nothing was actually changed relative to the
  // source, return the SOURCE object itself — untouched subtrees keep their
  // identity (the M7 renderer's spread semantics and the EditorSession's
  // reference-based change detection both rely on this).
  if (shallowSame(result, source)) {
    return source;
  }
  return result;
}

function shallowSame(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  if (a === b) {
    return true;
  }
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) {
    return false;
  }
  return aKeys.every((key) => bKeys.includes(key) && a[key] === b[key]);
}
