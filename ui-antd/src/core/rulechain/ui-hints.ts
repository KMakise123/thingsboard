/**
 * ui-hints — rule-node UI metadata static map (M8 brief §2; wave-2 K covers
 * the P0 start-up set: the script family + the nodes whose SIMPLE fields
 * render beside a custom-family component — brief §3 波2).
 *
 * Keying: the source table is keyed by clazz; each slice is keyed by the
 * field's dotted path FROM THE CONFIGURATION ROOT — together they realize
 * the "clazz + 字段路径" addressing of the brief. `getFormProperties` also
 * accepts `clazz`-prefixed keys directly, so this table (or a slice of it)
 * can be passed in either shape.
 *
 * Locale contract: labels and enumOptions labels are i18n keys under
 * `editor.ruleNode.*`; NodeConfigForm localizes them through
 * {@link localizeUiHintLabels} at render time (M7 renders UiHint labels as
 * data, so the static table itself stays locale-free). Non-`editor.`
 * labels pass through verbatim, keeping plain-text wave-3 tables usable.
 *
 * 宁缺勿错: nodes outside the table get NO hints — the generator infers from
 * the value shapes and every field keeps its JSON source-mode fallback.
 * Field facts: brief §1 backend field table + the config classes under
 * rule-engine/rule-engine-components (read 2026-09); control shapes mirror
 * the ui-ngx `*-config.component.html` equivalents.
 */
import type { UiHints } from '@/components/form-property/ui-hints';

/** The P0 start-up set — wave-3 K2 extends this table (76-node target). */
const HINT_SOURCE: Record<string, UiHints> = {
  // script family — simple fields only (the script triple is the family's)
  'org.thingsboard.rule.engine.debug.TbMsgGeneratorNode': {
    msgCount: { label: 'editor.ruleNode.field.msgCount' },
    periodInSeconds: { label: 'editor.ruleNode.field.periodInSeconds' },
    originatorType: {
      label: 'editor.ruleNode.field.originatorType',
      enumOptions: [
        { value: 'DEVICE', label: 'editor.ruleNode.option.entityType.device' },
        { value: 'ASSET', label: 'editor.ruleNode.option.entityType.asset' },
        {
          value: 'ENTITY_VIEW',
          label: 'editor.ruleNode.option.entityType.entityView',
        },
        {
          value: 'CUSTOMER',
          label: 'editor.ruleNode.option.entityType.customer',
        },
        { value: 'USER', label: 'editor.ruleNode.option.entityType.user' },
        {
          value: 'DASHBOARD',
          label: 'editor.ruleNode.option.entityType.dashboard',
        },
        { value: 'TENANT', label: 'editor.ruleNode.option.entityType.tenant' },
        {
          value: 'RULE_NODE',
          label: 'editor.ruleNode.option.entityType.ruleNode',
        },
      ],
    },
    originatorId: { label: 'editor.ruleNode.field.originatorId' },
  },

  // save time series — processingSettings is the family's; these stay simple
  'org.thingsboard.rule.engine.telemetry.TbMsgTimeseriesNode': {
    defaultTTL: { label: 'editor.ruleNode.field.defaultTTL' },
    useServerTs: { label: 'editor.ruleNode.field.useServerTs' },
  },

  // save attributes — scope/toggles stay simple, processingSettings is family
  'org.thingsboard.rule.engine.telemetry.TbMsgAttributesNode': {
    scope: {
      label: 'editor.ruleNode.field.scope',
      enumOptions: [
        { value: 'SERVER_SCOPE', label: 'editor.ruleNode.option.scope.server' },
        { value: 'SHARED_SCOPE', label: 'editor.ruleNode.option.scope.shared' },
        { value: 'CLIENT_SCOPE', label: 'editor.ruleNode.option.scope.client' },
      ],
    },
    notifyDevice: { label: 'editor.ruleNode.field.notifyDevice' },
    sendAttributesUpdatedNotification: {
      label: 'editor.ruleNode.field.sendAttributesUpdatedNotification',
    },
    updateAttributesOnlyOnValueChange: {
      label: 'editor.ruleNode.field.updateAttributesOnlyOnValueChange',
    },
  },

  // create alarm — everything except alarmType is the family's
  'org.thingsboard.rule.engine.action.TbCreateAlarmNode': {
    alarmType: { label: 'editor.ruleNode.field.alarmType' },
  },

  // family-only nodes (script triple / key operations / clear alarm) have no
  // FormPropertyForm-rendered fields — no entries, uiHintsFor → {}
};

/** Per-clazz hint slice; unknown clazzes get `{}` (never a wrong hint). */
export function uiHintsFor(clazz: string): UiHints {
  return HINT_SOURCE[clazz] ?? {};
}

const I18N_KEY_PREFIX = 'editor.';

/**
 * Resolves i18n-key labels (label + enumOptions labels + placeholder) for
 * rendering. Keys not starting with `editor.` pass through untouched, so a
 * hint table that carries plain-text labels needs no localization pass.
 * Pure — returns a new map, the source table is never mutated.
 */
export function localizeUiHintLabels(
  hints: UiHints,
  formatMessage: (id: string) => string,
): UiHints {
  const localize = (label: string | undefined): string | undefined => {
    if (label === undefined) {
      return undefined;
    }
    return label.startsWith(I18N_KEY_PREFIX) ? formatMessage(label) : label;
  };
  const result: UiHints = {};
  for (const [path, hint] of Object.entries(hints)) {
    result[path] = {
      ...hint,
      label: localize(hint.label),
      placeholder: localize(hint.placeholder),
      ...(hint.enumOptions
        ? {
            enumOptions: hint.enumOptions.map((option) => ({
              ...option,
              label: localize(option.label) ?? option.label,
            })),
          }
        : {}),
    };
  }
  return result;
}
