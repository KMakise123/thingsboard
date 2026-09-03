/**
 * Telemetry families (P0 family 4): save timeseries (TbMsgTimeseriesNode) and
 * save attributes (TbMsgAttributesNode). The custom component takes over the
 * complex polymorphic `processingSettings` object only — defaultTTL /
 * useServerTs (timeseries) and scope/toggles (attributes) stay simple fields
 * rendered by FormPropertyForm from uiHints (定制组件只接管复杂控件).
 * Advanced strategy keys follow ui-ngx: timeseries → timeseries/latest/
 * webSockets/calculatedFields, attributes → attributes/webSockets/
 * calculatedFields.
 */
import type { RuleNodeConfigComponentProps } from '../registry';
import {
  ProcessingSettingsField,
  type ProcessingStrategyKey,
} from './processing-settings';

const TIMESERIES_STRATEGY_KEYS: readonly ProcessingStrategyKey[] = [
  {
    key: 'timeseries',
    labelKey: 'editor.ruleNode.processing.advanced.timeseries',
  },
  { key: 'latest', labelKey: 'editor.ruleNode.processing.advanced.latest' },
  {
    key: 'webSockets',
    labelKey: 'editor.ruleNode.processing.advanced.webSockets',
  },
  {
    key: 'calculatedFields',
    labelKey: 'editor.ruleNode.processing.advanced.calculatedFields',
  },
];

const ATTRIBUTES_STRATEGY_KEYS: readonly ProcessingStrategyKey[] = [
  {
    key: 'attributes',
    labelKey: 'editor.ruleNode.processing.advanced.attributes',
  },
  {
    key: 'webSockets',
    labelKey: 'editor.ruleNode.processing.advanced.webSockets',
  },
  {
    key: 'calculatedFields',
    labelKey: 'editor.ruleNode.processing.advanced.calculatedFields',
  },
];

/** TbMsgTimeseriesNode — the processingSettings slice. */
export function SaveTimeseriesConfig({
  configuration,
  onChange,
  disabled = false,
  testIdPrefix = 'node-config',
}: RuleNodeConfigComponentProps) {
  return (
    <ProcessingSettingsField
      value={configuration.processingSettings}
      onChange={(next) => onChange({ processingSettings: next })}
      advancedKeys={TIMESERIES_STRATEGY_KEYS}
      disabled={disabled}
      testIdPrefix={`${testIdPrefix}-save-timeseries-processing`}
    />
  );
}

/** TbMsgAttributesNode — the processingSettings slice. */
export function SaveAttributesConfig({
  configuration,
  onChange,
  disabled = false,
  testIdPrefix = 'node-config',
}: RuleNodeConfigComponentProps) {
  return (
    <ProcessingSettingsField
      value={configuration.processingSettings}
      onChange={(next) => onChange({ processingSettings: next })}
      advancedKeys={ATTRIBUTES_STRATEGY_KEYS}
      disabled={disabled}
      testIdPrefix={`${testIdPrefix}-save-attributes-processing`}
    />
  );
}
