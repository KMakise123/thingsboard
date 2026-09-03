/**
 * Rule-node custom-component registry (M8 brief §3 wave-2 K).
 *
 * The P0 five families are TREE-LEVEL components: they consume a slice of the
 * whole configuration (multi-field families like the script triple cannot be
 * expressed as single-field controls). This file is the FROZEN seam:
 *  - RULE_NODE_COMPONENT_IDS / RULE_NODE_CLAZZES (re-exported from clazzes.ts)
 *  - ruleNodeComponentIdFor / ruleNodeComponentFor (clazz → family def, with
 *    the TbJsSwitchNode 'switch' alias handled at resolver level)
 *  - RuleNodeConfigContext — the explicit NodeConfigForm bypass: the tree
 *    contract lives NEXT TO the M7 single-field channel (CustomFieldProps),
 *    never inside it.
 *
 * registerRuleNodeComponents() (idempotent, runs at module load of
 * NodeConfigForm) does two things:
 *  1. fills the id → def table NodeConfigForm renders from;
 *  2. registers a thin ADAPTER per frozen id into the M7 GLOBAL custom
 *     registry (components/form-property/registry). The adapter renders the
 *     family component from the context, so any property whose
 *     hint.customComponent names a frozen id gets the family UI through the
 *     ordinary M7 resolution order — the composition seam for wave-3 K2.
 *     Rendered without a NodeConfigForm ancestor the adapter yields nothing
 *     (there is no tree to patch).
 */
import type { ComponentType } from 'react';
import { createContext, createElement, useContext } from 'react';

import {
  type CustomComponentRegistry,
  type CustomFieldProps,
  registerCustomComponent,
} from '@/components/form-property/registry';

import {
  RULE_NODE_CLAZZES,
  RULE_NODE_COMPONENT_IDS,
  type RuleNodeComponentId,
} from './clazzes';
import { ClearAlarmConfig, CreateAlarmConfig } from './fields/alarm-config';
import {
  CopyKeysConfig,
  DeleteKeysConfig,
  RenameKeysConfig,
} from './fields/key-ops-config';
import { ScriptFamilyConfig } from './fields/script-config';
import {
  SaveAttributesConfig,
  SaveTimeseriesConfig,
} from './fields/telemetry-config';

export type { RuleNodeComponentId };
export { RULE_NODE_CLAZZES, RULE_NODE_COMPONENT_IDS };

/**
 * Tree-level contract (the documented NodeConfigForm bypass). `onChange` is
 * a SHALLOW PATCH: pass only the keys you manage, NodeConfigForm merges them
 * into the configuration tree — unknown keys can never be dropped by a
 * family component.
 */
export interface RuleNodeConfigContextValue {
  /** Node implementation class full name (wire clazz). */
  clazz: string;
  /** The whole configuration tree (read side). */
  configuration: Record<string, unknown>;
  /** Shallow patch — merged into the configuration by NodeConfigForm. */
  onChange(next: Record<string, unknown>): void;
  disabled?: boolean;
  testIdPrefix?: string;
}

export type RuleNodeConfigComponentProps = RuleNodeConfigContextValue;

/** Provided by NodeConfigForm; null outside it (adapters render nothing). */
export const RuleNodeConfigContext =
  createContext<RuleNodeConfigContextValue | null>(null);

/** Where the family section renders relative to the simple fields. */
export interface RuleNodeCustomComponentDef {
  id: RuleNodeComponentId;
  /** Top-level configuration keys this component EXCLUSIVELY manages. */
  fields: readonly string[];
  /** 'first' (default) or 'last' relative to the FormPropertyForm section. */
  placement: 'first' | 'last';
  component: ComponentType<RuleNodeConfigComponentProps>;
}

// --- clazz → family resolution (frozen) -------------------------------------

const CLAZZ_COMPONENT_IDS: Record<string, RuleNodeComponentId> = {
  [RULE_NODE_CLAZZES.jsFilter]: RULE_NODE_COMPONENT_IDS.script,
  [RULE_NODE_CLAZZES.jsSwitch]: RULE_NODE_COMPONENT_IDS.switch,
  [RULE_NODE_CLAZZES.transformMsg]: RULE_NODE_COMPONENT_IDS.script,
  [RULE_NODE_CLAZZES.log]: RULE_NODE_COMPONENT_IDS.script,
  [RULE_NODE_CLAZZES.msgGenerator]: RULE_NODE_COMPONENT_IDS.script,
  [RULE_NODE_CLAZZES.copyKeys]: RULE_NODE_COMPONENT_IDS.copyKeys,
  [RULE_NODE_CLAZZES.deleteKeys]: RULE_NODE_COMPONENT_IDS.deleteKeys,
  [RULE_NODE_CLAZZES.renameKeys]: RULE_NODE_COMPONENT_IDS.renameKeys,
  [RULE_NODE_CLAZZES.msgTimeseries]: RULE_NODE_COMPONENT_IDS.saveTimeseries,
  [RULE_NODE_CLAZZES.msgAttributes]: RULE_NODE_COMPONENT_IDS.saveAttributes,
  [RULE_NODE_CLAZZES.createAlarm]: RULE_NODE_COMPONENT_IDS.createAlarm,
  [RULE_NODE_CLAZZES.clearAlarm]: RULE_NODE_COMPONENT_IDS.clearAlarm,
};

/** ui-ngx order parity: the generator's params precede its script section. */
const PLACEMENT_OVERRIDES: Record<string, 'first' | 'last'> = {
  [RULE_NODE_CLAZZES.msgGenerator]: 'last',
};

/** Frozen resolver: clazz → registry id (the switch alias resolves here). */
export function ruleNodeComponentIdFor(
  clazz: string,
): RuleNodeComponentId | undefined {
  return CLAZZ_COMPONENT_IDS[clazz];
}

// --- id → def table ----------------------------------------------------------

const DEFS: Partial<Record<RuleNodeComponentId, RuleNodeCustomComponentDef>> =
  {};

/** Family def lookup (undefined outside the P0 set / before registration). */
export function componentById(
  id: RuleNodeComponentId,
): RuleNodeCustomComponentDef | undefined {
  return DEFS[id];
}

/** Frozen resolver: clazz → full family def. */
export function ruleNodeComponentFor(
  clazz: string,
): RuleNodeCustomComponentDef | undefined {
  const id = CLAZZ_COMPONENT_IDS[clazz];
  if (!id) {
    return undefined;
  }
  const def = DEFS[id];
  if (!def) {
    return undefined;
  }
  const placement = PLACEMENT_OVERRIDES[clazz] ?? def.placement;
  return placement === def.placement ? def : { ...def, placement };
}

let registered = false;

/**
 * Idempotent registration: fills the def table AND registers the M7 global
 * adapters (see module doc). Called at NodeConfigForm module load; exported
 * for tests and for hosts that render family components standalone.
 */
export function registerRuleNodeComponents(): void {
  if (registered) {
    return;
  }
  registered = true;

  DEFS[RULE_NODE_COMPONENT_IDS.script] = {
    id: RULE_NODE_COMPONENT_IDS.script,
    fields: ['scriptLang', 'jsScript', 'tbelScript'],
    placement: 'first',
    component: ScriptFamilyConfig,
  };
  DEFS[RULE_NODE_COMPONENT_IDS.switch] = {
    id: RULE_NODE_COMPONENT_IDS.switch,
    fields: ['scriptLang', 'jsScript', 'tbelScript'],
    placement: 'first',
    component: ScriptFamilyConfig,
  };
  DEFS[RULE_NODE_COMPONENT_IDS.copyKeys] = {
    id: RULE_NODE_COMPONENT_IDS.copyKeys,
    fields: ['copyFrom', 'keys'],
    placement: 'first',
    component: CopyKeysConfig,
  };
  DEFS[RULE_NODE_COMPONENT_IDS.deleteKeys] = {
    id: RULE_NODE_COMPONENT_IDS.deleteKeys,
    fields: ['deleteFrom', 'keys'],
    placement: 'first',
    component: DeleteKeysConfig,
  };
  DEFS[RULE_NODE_COMPONENT_IDS.renameKeys] = {
    id: RULE_NODE_COMPONENT_IDS.renameKeys,
    fields: ['renameIn', 'renameKeysMapping'],
    placement: 'first',
    component: RenameKeysConfig,
  };
  DEFS[RULE_NODE_COMPONENT_IDS.saveTimeseries] = {
    id: RULE_NODE_COMPONENT_IDS.saveTimeseries,
    fields: ['processingSettings'],
    placement: 'first',
    component: SaveTimeseriesConfig,
  };
  DEFS[RULE_NODE_COMPONENT_IDS.saveAttributes] = {
    id: RULE_NODE_COMPONENT_IDS.saveAttributes,
    fields: ['processingSettings'],
    placement: 'first',
    component: SaveAttributesConfig,
  };
  DEFS[RULE_NODE_COMPONENT_IDS.createAlarm] = {
    id: RULE_NODE_COMPONENT_IDS.createAlarm,
    fields: [
      'scriptLang',
      'alarmDetailsBuildJs',
      'alarmDetailsBuildTbel',
      'severity',
      'dynamicSeverity',
      'propagate',
      'propagateToOwner',
      'propagateToTenant',
      'relationTypes',
      'useMessageAlarmData',
      'overwriteAlarmDetails',
    ],
    placement: 'first',
    component: CreateAlarmConfig,
  };
  DEFS[RULE_NODE_COMPONENT_IDS.clearAlarm] = {
    id: RULE_NODE_COMPONENT_IDS.clearAlarm,
    fields: [
      'alarmType',
      'scriptLang',
      'alarmDetailsBuildJs',
      'alarmDetailsBuildTbel',
    ],
    placement: 'first',
    component: ClearAlarmConfig,
  };

  for (const id of Object.values(RULE_NODE_COMPONENT_IDS)) {
    registerCustomComponent(id, treeAdapter(id));
  }
}

/** Test isolation / hot reload. */
export function resetRuleNodeComponents(): void {
  registered = false;
  for (const id of Object.keys(DEFS)) {
    delete DEFS[id as RuleNodeComponentId];
  }
}

/**
 * The M7-channel adapter for a tree-level family: ignores the single-field
 * value/onChange (the family owns its whole slice) and renders from the
 * NodeConfigForm-provided context instead. Null without context.
 */
function treeAdapter(id: RuleNodeComponentId): ComponentType<CustomFieldProps> {
  function RuleNodeTreeAdapter() {
    const ctx = useContext(RuleNodeConfigContext);
    const def = DEFS[id];
    if (!ctx || !def) {
      return null;
    }
    return createElement(def.component, { ...ctx });
  }
  return RuleNodeTreeAdapter;
}

/**
 * Per-instance override map for FormPropertyFormProps.customComponents —
 * the adapters keyed by the frozen ids (per-instance wins over the global
 * registry, test isolation included).
 */
export function ruleNodeCustomFieldComponents(): CustomComponentRegistry {
  const map: CustomComponentRegistry = {};
  for (const id of Object.values(RULE_NODE_COMPONENT_IDS)) {
    map[id] = treeAdapter(id);
  }
  return map;
}
