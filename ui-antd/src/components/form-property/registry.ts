/**
 * Custom-field component registry for the FormProperty renderer (ADR 0004
 * §3 bullet 1). High-frequency complex controls (M8 rule-chain P0 set:
 * script family, switch node, key-operations, save/clear alarms…) register
 * here and win over uiHints/type inference for the matching property.
 *
 * Shape mirrors the widget registry style (src/components/widgets/registry.ts):
 * a plain Record + module-level map + resolver functions. Hosts may also pass
 * a per-instance override map via FormPropertyFormProps.customComponents,
 * which takes precedence over this global registry (test isolation + composition).
 */
import type { ComponentType } from 'react';
import type { FormProperty } from './types';
import type { UiHint } from './ui-hints';

/**
 * Contract a custom field component must fulfill: dumb controlled field —
 * value in, onChange out, plus the resolved property/hint for context.
 */
export interface CustomFieldProps {
  property: FormPropertyLike;
  hint?: UiHint;
  value: unknown;
  onChange: (next: unknown) => void;
  disabled?: boolean;
}

/**
 * Minimal structural slice of FormProperty the registry contract needs —
 * keeps consumers decoupled from the full upstream intersection type.
 */
export type FormPropertyLike = {
  id: string;
  name: string;
  type: FormProperty['type'];
  default: unknown;
};

export type CustomComponentRegistry = Record<
  string,
  ComponentType<CustomFieldProps>
>;

const REGISTRY: CustomComponentRegistry = {};

/** Registers (or replaces) a custom component under a registry id. */
export function registerCustomComponent(
  id: string,
  component: ComponentType<CustomFieldProps>,
): void {
  REGISTRY[id] = component;
}

export function getCustomComponent(
  id: string,
): ComponentType<CustomFieldProps> | undefined {
  return REGISTRY[id];
}

/** Clears the global registry (test isolation / hot reload). */
export function resetCustomComponents(): void {
  for (const key of Object.keys(REGISTRY)) {
    delete REGISTRY[key];
  }
}

/**
 * Resolution step ① for a property: explicit hint.customComponent id first,
 * then the property id itself. `override` (per-instance map) wins over the
 * global registry.
 */
export function resolveCustomComponent(
  property: FormPropertyLike,
  hint?: UiHint,
  override?: CustomComponentRegistry,
): ComponentType<CustomFieldProps> | undefined {
  const ids = hint?.customComponent
    ? [hint.customComponent, property.id]
    : [property.id];
  for (const id of ids) {
    const fromOverride = override?.[id];
    if (fromOverride) {
      return fromOverride;
    }
    const fromGlobal = REGISTRY[id];
    if (fromGlobal) {
      return fromGlobal;
    }
  }
  return undefined;
}
