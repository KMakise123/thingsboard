/**
 * NodeConfigForm — rule-node configuration form (M8 brief §2; props FROZEN
 * for wave-3 K2/R).
 *
 * Pipeline (ADR 0004 §3): descriptor defaultConfiguration VALUE TREE →
 * getFormProperties (generator) → M7 FormPropertyForm, with uiHintsFor(clazz)
 * layered over it and the P0 tree-level family components rendered by THIS
 * component around the renderer:
 *   - the family's exclusive fields (registry def.fields) are REMOVED from
 *     the generated property list — the family owns them;
 *   - the family renders before ('first', default) or after ('last', the
 *     generator's params) the renderer section, per its def;
 *   - the family's onChange is a SHALLOW PATCH: NodeConfigForm merges it
 *     into the configuration tree, so keys outside the family's slice can
 *     never be dropped by a family component (round-trip hard gate).
 *
 * The M7 single-field channel stays intact for everything else: simple
 * string/number/boolean fields keep rendering from uiHints/inference with
 * the per-field JSON source fallback, and rule-nodeCustomFieldComponents()
 * is passed as the per-instance customComponents map (frozen ids → tree
 * adapters) per the wave-2 contract.
 *
 * Fully controlled like M7: configuration in → onChange(next) out, no
 * internal copy (the EditorSession draft stays the single source of truth).
 */

import { useMemo } from 'react';
import { useIntl } from 'react-intl';

import { FormPropertyForm } from '@/components/form-property/FormPropertyForm';
import type { CustomComponentRegistry } from '@/components/form-property/registry';
import type { UiHints } from '@/components/form-property/ui-hints';
import { getFormProperties } from '@/core/rulechain/form-properties';
import { localizeUiHintLabels, uiHintsFor } from '@/core/rulechain/ui-hints';
import type { RuleNodeComponentDescriptor } from '@/types/tb/rule-chain';

import {
  RuleNodeConfigContext,
  type RuleNodeConfigContextValue,
  type RuleNodeCustomComponentDef,
  registerRuleNodeComponents,
  ruleNodeComponentFor,
  ruleNodeCustomFieldComponents,
} from './registry';

// Module-load registration (idempotent — see registry module doc).
registerRuleNodeComponents();

export interface NodeConfigFormProps {
  descriptor: RuleNodeComponentDescriptor;
  configuration: Record<string, unknown>;
  onChange(next: Record<string, unknown>): void;
  disabled?: boolean;
  testIdPrefix?: string;
}

export function NodeConfigForm({
  descriptor,
  configuration,
  onChange,
  disabled = false,
  testIdPrefix = 'node-config',
}: NodeConfigFormProps) {
  const intl = useIntl();
  const clazz = descriptor.clazz;

  const hints = useMemo<UiHints>(
    () =>
      localizeUiHintLabels(uiHintsFor(clazz), (id) =>
        intl.formatMessage({ id }),
      ),
    [clazz, intl],
  );

  const defaultConfiguration =
    descriptor.configurationDescriptor?.nodeDefinition?.defaultConfiguration ??
    {};

  const def = ruleNodeComponentFor(clazz);

  const restProperties = useMemo(() => {
    const properties = getFormProperties(clazz, defaultConfiguration, hints);
    const familyFields = new Set(def?.fields ?? []);
    return properties.filter((property) => !familyFields.has(property.id));
  }, [clazz, defaultConfiguration, hints, def]);

  const treeContext = useMemo<RuleNodeConfigContextValue>(
    () => ({
      clazz,
      configuration,
      // Shallow patch: the family component passes only its own keys.
      onChange: (patch) => onChange({ ...configuration, ...patch }),
      disabled,
      testIdPrefix,
    }),
    [clazz, configuration, onChange, disabled, testIdPrefix],
  );

  const customComponents = useMemo<CustomComponentRegistry>(
    () => ruleNodeCustomFieldComponents(),
    [],
  );

  const family = (familyDef: RuleNodeCustomComponentDef) => (
    <familyDef.component
      clazz={treeContext.clazz}
      configuration={treeContext.configuration}
      onChange={treeContext.onChange}
      disabled={treeContext.disabled}
      testIdPrefix={treeContext.testIdPrefix}
    />
  );

  return (
    <RuleNodeConfigContext.Provider value={treeContext}>
      <div data-testid={`${testIdPrefix}-form`}>
        {def && def.placement === 'first' && family(def)}
        <FormPropertyForm
          properties={restProperties.map((property) =>
            disabled ? { ...property, disabled: true } : property,
          )}
          value={configuration}
          onChange={onChange}
          uiHints={hints}
          customComponents={customComponents}
        />
        {def && def.placement === 'last' && family(def)}
      </div>
    </RuleNodeConfigContext.Provider>
  );
}
