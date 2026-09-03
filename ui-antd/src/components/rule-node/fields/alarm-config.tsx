/**
 * Alarm families (P0 family 5): create alarm (TbCreateAlarmNode) and clear
 * alarm (TbClearAlarmNode). The family takes the alarm-details script triple
 * (scriptLang / alarmDetailsBuildJs / alarmDetailsBuildTbel — shared
 * ScriptFields with the 'json' testScript profile) plus the alarm propagation
 * controls; simple scalar fields stay outside (create-alarm's alarmType is
 * rendered by FormPropertyForm from uiHints, clear-alarm's alarmType is part
 * of the family per the P0 field list).
 *
 * Conditional visibility mirrors ui-ngx create-alarm-config: overwrite flag
 * only under "use message alarm data"; details script hidden when message
 * alarm data is used without overwriting; severity select ↔ pattern input by
 * dynamicSeverity; relation types only when propagating.
 */
import { Input, Select, Switch, Typography } from 'antd';
import { useIntl } from 'react-intl';

import { AlarmSeverity } from '@/types/tb/alarm';

import type { RuleNodeConfigComponentProps } from '../registry';
import {
  ScriptFields,
  scriptFamilyProfileFor,
  useTbelEnabled,
} from './script-config';
import { StringItemsList } from './string-items-list';

const ALARM_SEVERITY_OPTIONS = Object.values(AlarmSeverity);

function Toggle({
  checked,
  onChange,
  label,
  disabled,
  testId,
}: {
  checked: boolean;
  onChange(next: boolean): void;
  label: string;
  disabled?: boolean;
  testId: string;
}) {
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}
      data-testid={testId}
    >
      <Switch
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        data-testid={`${testId}-switch`}
      />
      <Typography.Text>{label}</Typography.Text>
    </div>
  );
}

function FieldLabel({ text }: { text: string }) {
  return (
    <Typography.Text style={{ display: 'block', marginBottom: 2 }}>
      {text}
    </Typography.Text>
  );
}

/** TbCreateAlarmNode. */
export function CreateAlarmConfig({
  configuration,
  onChange,
  disabled = false,
  testIdPrefix = 'node-config',
}: RuleNodeConfigComponentProps) {
  const intl = useIntl();
  const tbelEnabled = useTbelEnabled();
  const profile = scriptFamilyProfileFor(
    'org.thingsboard.rule.engine.action.TbCreateAlarmNode',
  );
  if (!profile) {
    return null;
  }
  const useMessageAlarmData = configuration.useMessageAlarmData === true;
  const overwriteAlarmDetails = configuration.overwriteAlarmDetails === true;
  const dynamicSeverity = configuration.dynamicSeverity === true;
  const propagate = configuration.propagate === true;
  const severity =
    typeof configuration.severity === 'string' ? configuration.severity : '';
  const prefix = `${testIdPrefix}-create-alarm`;

  return (
    <div data-testid={prefix}>
      <Toggle
        checked={useMessageAlarmData}
        onChange={(next) => onChange({ useMessageAlarmData: next })}
        label={intl.formatMessage({
          id: 'editor.ruleNode.createAlarm.useMessageAlarmData',
        })}
        disabled={disabled}
        testId={`${prefix}-use-message-alarm-data`}
      />
      {useMessageAlarmData && (
        <Toggle
          checked={overwriteAlarmDetails}
          onChange={(next) => onChange({ overwriteAlarmDetails: next })}
          label={intl.formatMessage({
            id: 'editor.ruleNode.createAlarm.overwriteAlarmDetails',
          })}
          disabled={disabled}
          testId={`${prefix}-overwrite-alarm-details`}
        />
      )}
      {(!useMessageAlarmData || overwriteAlarmDetails) && (
        <ScriptFields
          profile={profile}
          configuration={configuration}
          onChange={onChange}
          tbelEnabled={tbelEnabled}
          disabled={disabled}
          testIdPrefix={`${prefix}-details-script`}
        />
      )}
      {!useMessageAlarmData && (
        <>
          <Toggle
            checked={dynamicSeverity}
            onChange={(next) => onChange({ dynamicSeverity: next })}
            label={intl.formatMessage({
              id: 'editor.ruleNode.createAlarm.dynamicSeverity',
            })}
            disabled={disabled}
            testId={`${prefix}-dynamic-severity`}
          />
          {dynamicSeverity ? (
            <div>
              <FieldLabel
                text={intl.formatMessage({
                  id: 'editor.ruleNode.createAlarm.severity',
                })}
              />
              <Input
                value={severity}
                disabled={disabled}
                data-testid={`${prefix}-severity-pattern`}
                onChange={(e) => onChange({ severity: e.target.value })}
              />
            </div>
          ) : (
            <div>
              <FieldLabel
                text={intl.formatMessage({
                  id: 'editor.ruleNode.createAlarm.severity',
                })}
              />
              <Select
                value={severity || undefined}
                disabled={disabled}
                style={{ width: '100%' }}
                data-testid={`${prefix}-severity`}
                onChange={(next) => onChange({ severity: next })}
                options={ALARM_SEVERITY_OPTIONS.map((value) => ({
                  value,
                  label: intl.formatMessage({
                    id: `editor.ruleNode.option.severity.${value.toLowerCase()}`,
                  }),
                }))}
              />
            </div>
          )}
          <div style={{ marginTop: 6 }}>
            <Toggle
              checked={propagate}
              onChange={(next) => onChange({ propagate: next })}
              label={intl.formatMessage({
                id: 'editor.ruleNode.createAlarm.propagate',
              })}
              disabled={disabled}
              testId={`${prefix}-propagate`}
            />
            {propagate && (
              <div>
                <FieldLabel
                  text={intl.formatMessage({
                    id: 'editor.ruleNode.createAlarm.relationTypes',
                  })}
                />
                <StringItemsList
                  value={
                    Array.isArray(configuration.relationTypes)
                      ? configuration.relationTypes
                      : []
                  }
                  onChange={(next) => onChange({ relationTypes: next })}
                  disabled={disabled}
                  testIdPrefix={`${prefix}-relation-types`}
                />
              </div>
            )}
            <Toggle
              checked={configuration.propagateToOwner === true}
              onChange={(next) => onChange({ propagateToOwner: next })}
              label={intl.formatMessage({
                id: 'editor.ruleNode.createAlarm.propagateToOwner',
              })}
              disabled={disabled}
              testId={`${prefix}-propagate-to-owner`}
            />
            <Toggle
              checked={configuration.propagateToTenant === true}
              onChange={(next) => onChange({ propagateToTenant: next })}
              label={intl.formatMessage({
                id: 'editor.ruleNode.createAlarm.propagateToTenant',
              })}
              disabled={disabled}
              testId={`${prefix}-propagate-to-tenant`}
            />
          </div>
        </>
      )}
    </div>
  );
}

/** TbClearAlarmNode — alarmType + the details script triple. */
export function ClearAlarmConfig({
  configuration,
  onChange,
  disabled = false,
  testIdPrefix = 'node-config',
}: RuleNodeConfigComponentProps) {
  const intl = useIntl();
  const tbelEnabled = useTbelEnabled();
  const profile = scriptFamilyProfileFor(
    'org.thingsboard.rule.engine.action.TbClearAlarmNode',
  );
  if (!profile) {
    return null;
  }
  const alarmType =
    typeof configuration.alarmType === 'string' ? configuration.alarmType : '';
  const prefix = `${testIdPrefix}-clear-alarm`;
  return (
    <div data-testid={prefix}>
      <div>
        <FieldLabel
          text={intl.formatMessage({ id: 'editor.ruleNode.field.alarmType' })}
        />
        <Input
          value={alarmType}
          disabled={disabled}
          data-testid={`${prefix}-alarm-type`}
          onChange={(e) => onChange({ alarmType: e.target.value })}
        />
      </div>
      <div style={{ marginTop: 8 }}>
        <ScriptFields
          profile={profile}
          configuration={configuration}
          onChange={onChange}
          tbelEnabled={tbelEnabled}
          disabled={disabled}
          testIdPrefix={`${prefix}-details-script`}
        />
      </div>
    </div>
  );
}
