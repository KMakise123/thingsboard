/**
 * uiHints — the frontend-side static UI-metadata map (ADR 0004 §3 bullet 1).
 *
 * TB descriptors carry values (and, for settingsForm, the upstream
 * FormProperty[] with control types) but no human-facing UI hints beyond the
 * property name. The uiHints map is keyed by property id and layered over
 * the descriptor data by the renderer; it never enters the value tree, so it
 * needs no i18n keys (labels are data).
 */
import type { FormProperty, FormSelectItem } from './types';

/**
 * Widget kinds the renderer can overlay onto a property. 'json' forces the
 * JSON source editor for the field (spec §4.5: any field can switch to a
 * JSON source editor).
 */
export type UiWidgetKind =
  | 'input'
  | 'textarea'
  | 'password'
  | 'number'
  | 'switch'
  | 'select'
  | 'json';

/** UI metadata layered onto a single property. */
export interface UiHint {
  /** Field label; falls back to property.name, then property.id. */
  label?: string;
  /** Widget override — wins over the declared/inferred control. */
  widget?: UiWidgetKind;
  /** Custom-component registry id — wins over everything (registry hit). */
  customComponent?: string;
  /** Enum options making a string render as a Select (or narrowing items). */
  enumOptions?: FormSelectItem[];
  placeholder?: string;
  /** Group label override for this property's section. */
  group?: string;
  /** Section ordering across groups (lower first; default = first appearance). */
  groupOrder?: number;
  /** Field ordering inside its group (lower first; default = declaration order). */
  order?: number;
  /** Force this field into JSON source mode regardless of control. */
  jsonSource?: boolean;
  /** textarea row hint. */
  rows?: number;
}

/** Static uiHints map keyed by property id. */
export type UiHints = Record<string, UiHint>;

/** Resolves the hint for a property (undefined-safe). */
export function resolveUiHint(
  uiHints: UiHints | undefined,
  property: FormProperty,
): UiHint | undefined {
  return uiHints?.[property.id];
}

/** Field label resolution: hint label → property name → property id. */
export function resolveFieldLabel(
  property: FormProperty,
  hint?: UiHint,
): string {
  return hint?.label ?? property.name ?? property.id;
}

/** Enum/select options: hint enumOptions override the declared items. */
export function resolveEnumOptions(
  property: FormProperty,
  hint?: UiHint,
): FormSelectItem[] | undefined {
  return hint?.enumOptions ?? property.items;
}

export interface UiPropertyGroup {
  title?: string;
  /** Members in render order (hint.order first, declaration order second). */
  members: Array<{ property: FormProperty; hint?: UiHint }>;
}

/**
 * Groups ordered properties into titled sections. Group identity comes from
 * hint.group (wins) or property.group; groups sort by the smallest
 * hint.groupOrder among members (untitled group pinned first), fields sort
 * stably by hint.order. Properties with visible === false are dropped.
 */
export function groupProperties(
  properties: FormProperty[],
  uiHints?: UiHints,
): UiPropertyGroup[] {
  const groups = new Map<string, UiPropertyGroup & { order: number }>();
  const untitled: UiPropertyGroup & { order: number } = {
    order: Number.NEGATIVE_INFINITY,
    members: [],
  };

  properties.forEach((property) => {
    if (property.visible === false) {
      return;
    }
    const hint = resolveUiHint(uiHints, property);
    const title = hint?.group ?? property.group;
    if (!title) {
      untitled.members.push({ property, hint });
      return;
    }
    let group = groups.get(title);
    if (!group) {
      group = { title, order: Number.POSITIVE_INFINITY, members: [] };
      groups.set(title, group);
    }
    group.order = Math.min(
      group.order,
      hint?.groupOrder ?? Number.POSITIVE_INFINITY,
    );
    group.members.push({ property, hint });
  });

  const result: Array<UiPropertyGroup & { order: number }> = [];
  if (untitled.members.length > 0) {
    result.push(untitled);
  }
  result.push(...groups.values());
  result.sort((a, b) => a.order - b.order);
  for (const group of result) {
    const sorted = group.members
      .map((member, index) => ({ member, index }))
      .sort(
        (a, b) =>
          (a.member.hint?.order ?? a.index) - (b.member.hint?.order ?? b.index),
      );
    group.members = sorted.map((entry) => entry.member);
  }
  return result;
}
