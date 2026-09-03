/**
 * ProcessingSettingsField — the polymorphic save-processing settings editor
 * shared by save timeseries / save attributes (backend
 * telemetry/settings/ProcessingSettings: JSON type-discriminated
 * ON_EVERY_MESSAGE | WEBSOCKETS_ONLY | DEDUPLICATE(interval) | ADVANCED(strategies)).
 * Wire shape is preserved verbatim: basic mode writes
 * `{type, deduplicationIntervalSecs?}`, advanced mode writes
 * `{type:'ADVANCED', <strategyKey>: {type, deduplicationIntervalSecs?}}` —
 * the same mapping ui-ngx performs in timeseries-config prepareOutputConfig.
 *
 * Advanced strategy keys differ per node (timeseries: timeseries/latest/
 * webSockets/calculatedFields; attributes: attributes/webSockets/
 * calculatedFields — ui-ngx tb-advanced-processing-settings usage) and are
 * injected by the caller.
 */
import { InputNumber, Segmented, Select, Typography } from 'antd';
import { useIntl } from 'react-intl';

export interface ProcessingStrategyKey {
  /** Configuration key inside the ADVANCED object. */
  key: string;
  /** i18n key of the strategy label. */
  labelKey: string;
}

export function ProcessingSettingsField({
  value,
  onChange,
  advancedKeys,
  disabled = false,
  testIdPrefix = 'processing-settings',
}: {
  value: unknown;
  onChange(next: Record<string, unknown>): void;
  advancedKeys: readonly ProcessingStrategyKey[];
  disabled?: boolean;
  testIdPrefix?: string;
}) {
  const intl = useIntl();
  const record = isRecord(value) ? value : {};
  const isAdvanced = record.type === 'ADVANCED';
  const basicType =
    record.type === 'DEDUPLICATE' || record.type === 'WEBSOCKETS_ONLY'
      ? record.type
      : 'ON_EVERY_MESSAGE';
  const interval =
    typeof record.deduplicationIntervalSecs === 'number'
      ? record.deduplicationIntervalSecs
      : 60;

  const setMode = (mode: string | number) => {
    if (mode === 'advanced') {
      const strategies: Record<string, unknown> = {};
      for (const { key } of advancedKeys) {
        strategies[key] = { type: 'ON_EVERY_MESSAGE' };
      }
      onChange({ type: 'ADVANCED', ...strategies });
      return;
    }
    // basicType is never 'ADVANCED' here (narrowed at derivation above).
    onChange({ type: basicType });
  };

  const setBasicType = (next: string) => {
    onChange(
      next === 'DEDUPLICATE'
        ? { type: next, deduplicationIntervalSecs: interval }
        : { type: next },
    );
  };

  const setInterval = (next: number | null) => {
    onChange({
      type: 'DEDUPLICATE',
      deduplicationIntervalSecs: typeof next === 'number' ? next : 1,
    });
  };

  const setStrategy = (key: string, next: string, previous: unknown) => {
    const previousInterval = isRecord(previous)
      ? previous.deduplicationIntervalSecs
      : undefined;
    const strategy =
      next === 'DEDUPLICATE'
        ? {
            type: next,
            deduplicationIntervalSecs:
              typeof previousInterval === 'number' ? previousInterval : 60,
          }
        : { type: next };
    onChange({ ...record, [key]: strategy });
  };

  const setStrategyInterval = (key: string, next: number | null) => {
    onChange({
      ...record,
      [key]: {
        type: 'DEDUPLICATE',
        deduplicationIntervalSecs: typeof next === 'number' ? next : 1,
      },
    });
  };

  return (
    <div data-testid={testIdPrefix}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 4,
        }}
      >
        <Typography.Text strong>
          {intl.formatMessage({ id: 'editor.ruleNode.processing.title' })}
        </Typography.Text>
        <Segmented
          disabled={disabled}
          value={isAdvanced ? 'advanced' : 'basic'}
          data-testid={`${testIdPrefix}-mode`}
          onChange={setMode}
          options={[
            {
              value: 'basic',
              label: intl.formatMessage({
                id: 'editor.ruleNode.processing.mode.basic',
              }),
            },
            {
              value: 'advanced',
              label: intl.formatMessage({
                id: 'editor.ruleNode.processing.mode.advanced',
              }),
            },
          ]}
        />
      </div>

      {!isAdvanced ? (
        <div>
          <Typography.Text>
            {intl.formatMessage({ id: 'editor.ruleNode.processing.strategy' })}
          </Typography.Text>
          <Select
            value={basicType}
            disabled={disabled}
            style={{ width: '100%' }}
            data-testid={`${testIdPrefix}-type`}
            onChange={setBasicType}
            options={[
              {
                value: 'ON_EVERY_MESSAGE',
                label: intl.formatMessage({
                  id: 'editor.ruleNode.option.processing.onEveryMessage',
                }),
              },
              {
                value: 'DEDUPLICATE',
                label: intl.formatMessage({
                  id: 'editor.ruleNode.option.processing.deduplicate',
                }),
              },
              {
                value: 'WEBSOCKETS_ONLY',
                label: intl.formatMessage({
                  id: 'editor.ruleNode.option.processing.webSocketsOnly',
                }),
              },
            ]}
          />
          {basicType === 'DEDUPLICATE' && (
            <div style={{ marginTop: 4 }}>
              <Typography.Text>
                {intl.formatMessage({
                  id: 'editor.ruleNode.processing.deduplicationInterval',
                })}
              </Typography.Text>
              <InputNumber
                min={1}
                value={interval}
                disabled={disabled}
                style={{ width: '100%' }}
                data-testid={`${testIdPrefix}-interval`}
                onChange={setInterval}
              />
            </div>
          )}
        </div>
      ) : (
        <div style={{ paddingLeft: 16 }}>
          <Typography.Text strong>
            {intl.formatMessage({ id: 'editor.ruleNode.processing.advanced' })}
          </Typography.Text>
          {advancedKeys.map(({ key, labelKey }) => {
            const strategy = isRecord(record[key]) ? record[key] : {};
            const strategyType =
              strategy.type === 'DEDUPLICATE' || strategy.type === 'SKIP'
                ? strategy.type
                : 'ON_EVERY_MESSAGE';
            const strategyInterval =
              typeof strategy.deduplicationIntervalSecs === 'number'
                ? strategy.deduplicationIntervalSecs
                : 60;
            return (
              <div key={key} style={{ marginTop: 4 }}>
                <Typography.Text>
                  {intl.formatMessage({ id: labelKey })}
                </Typography.Text>
                <Select
                  value={strategyType}
                  disabled={disabled}
                  style={{ width: '100%' }}
                  data-testid={`${testIdPrefix}-${key}`}
                  onChange={(next) => setStrategy(key, next, record[key])}
                  options={[
                    {
                      value: 'ON_EVERY_MESSAGE',
                      label: intl.formatMessage({
                        id: 'editor.ruleNode.option.strategy.onEveryMessage',
                      }),
                    },
                    {
                      value: 'DEDUPLICATE',
                      label: intl.formatMessage({
                        id: 'editor.ruleNode.option.strategy.deduplicate',
                      }),
                    },
                    {
                      value: 'SKIP',
                      label: intl.formatMessage({
                        id: 'editor.ruleNode.option.strategy.skip',
                      }),
                    },
                  ]}
                />
                {strategyType === 'DEDUPLICATE' && (
                  <InputNumber
                    min={1}
                    value={strategyInterval}
                    disabled={disabled}
                    style={{ width: '100%', marginTop: 2 }}
                    data-testid={`${testIdPrefix}-${key}-interval`}
                    onChange={(next) => setStrategyInterval(key, next)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}
