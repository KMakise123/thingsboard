/**
 * system.input_widgets.update_multiple_attributes — attribute editor card
 * (brief §6, "v1 交付功能版").
 *
 * Anchor reality (thermostats ×1): one entity datasource (state alias) whose
 * dataKeys carry per-field input settings — dataKeyType 'server'
 * (SERVER_SCOPE), dataKeyValueType 'booleanCheckbox' | 'double', isEditable,
 * disabledOnDataKey, step — and widget settings {showActionButtons:false,
 * showResultMessage, fieldsInRow, groupTitle, widgetTitle}.
 *
 * Semantics follow ui-ngx multiple-input-widget: without action buttons each
 * changed field saves immediately (per-key SERVER_SCOPE attribute write;
 * number fields commit on blur/Enter, checkboxes on toggle); with them, one
 * save button writes every changed key. disabledOnDataKey disables a field
 * while the referenced key is falsy.
 */

import {
  App,
  Button,
  Checkbox,
  Form,
  InputNumber,
  Space,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { getAttributes, saveEntityAttributes } from '@/services/tb/attributes';
import { AttributeScope } from '@/types/tb';
import type { DataKey } from '@/types/tb/widget';
import type { WidgetComponentProps } from './contract';
import {
  interpolateStateParams,
  resolveI18nMessage,
} from './hooks/widget-text';

interface FieldSettings {
  dataKeyType?: string;
  dataKeyValueType?: string;
  isEditable?: string;
  disabledOnDataKey?: string;
  dataKeyHidden?: boolean;
  step?: number;
  minValue?: number;
  maxValue?: number;
}

interface MultipleInputSettings {
  showActionButtons?: boolean;
  showResultMessage?: boolean;
  fieldsInRow?: number;
  groupTitle?: string;
  widgetTitle?: string;
}

interface FieldSpec {
  name: string;
  label: string;
  valueType: string;
  editable: boolean;
  disabledOnDataKey?: string;
  step?: number;
  min?: number;
  max?: number;
}

function toFieldValue(raw: unknown, valueType: string): unknown {
  if (valueType === 'booleanCheckbox') {
    return raw === true || raw === 'true';
  }
  if (valueType === 'double' || valueType === 'integer') {
    const numeric = Number(raw);
    return Number.isFinite(numeric) ? numeric : undefined;
  }
  if (raw === null || raw === undefined) {
    return '';
  }
  return String(raw);
}

export default function UpdateMultipleAttributes({
  ctx,
  widget,
}: WidgetComponentProps) {
  const { formatMessage, locale } = useIntl();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const settings = (widget.config.settings ?? {}) as MultipleInputSettings;

  const entity = ctx.datasources[0]?.entities[0];
  const scope = AttributeScope.SERVER_SCOPE;

  const fields = useMemo<Array<FieldSpec>>(() => {
    const specs: Array<FieldSpec> = [];
    for (const key of ctx.datasources[0]?.dataKeys ?? []) {
      const fieldSettings = (key.settings ?? {}) as FieldSettings;
      if (fieldSettings.dataKeyHidden) {
        continue;
      }
      specs.push({
        name: key.name,
        label: key.label ?? key.name,
        valueType: fieldSettings.dataKeyValueType ?? 'string',
        editable: fieldSettings.isEditable !== 'disabled',
        disabledOnDataKey: fieldSettings.disabledOnDataKey || undefined,
        step: fieldSettings.step,
        min: fieldSettings.minValue,
        max: fieldSettings.maxValue,
      });
    }
    return specs;
  }, [ctx.datasources]);

  const [loading, setLoading] = useState(true);
  /** Mirror of form values: drives the disabledOnDataKey wiring. */
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!entity || fields.length === 0) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getAttributes(
      entity,
      scope,
      fields.map((field) => field.name),
    ).then(
      (attributes) => {
        if (cancelled) {
          return;
        }
        const initialValues: Record<string, unknown> = {};
        for (const field of fields) {
          const raw = attributes.find((entry) => entry.key === field.name);
          initialValues[field.name] = toFieldValue(raw?.value, field.valueType);
        }
        setFieldValues(initialValues);
        form.setFieldsValue(initialValues);
        console.log(
          '[attrs-debug] initialValues',
          JSON.stringify(initialValues),
          'get=',
          form.getFieldValue('temperatureAlarmThreshold'),
        );
        setLoading(false);
      },
      () => {
        if (!cancelled) {
          setLoading(false);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [entity, fields, form, scope]);

  const groupTitle = interpolateStateParams(
    resolveI18nMessage(settings.groupTitle ?? '', locale),
    ctx.states.currentStateParams,
  );
  const title =
    interpolateStateParams(
      resolveI18nMessage(settings.widgetTitle ?? '', locale),
      ctx.states.currentStateParams,
    ) ||
    interpolateStateParams(
      resolveI18nMessage(widget.config.title ?? '', locale),
      ctx.states.currentStateParams,
    );

  const showActionButtons = settings.showActionButtons !== false;

  const persist = async (names: Array<string>) => {
    if (!entity || names.length === 0) {
      return;
    }
    setSaving(true);
    try {
      await saveEntityAttributes(
        entity,
        scope,
        names.map((name) => ({
          key: name,
          value: form.getFieldValue(name),
        })),
      );
      if (settings.showResultMessage !== false) {
        message.success(
          formatMessage({
            id: 'dashboards.widget.attributes.saved',
            defaultMessage: 'Attributes saved',
          }),
        );
      }
    } catch {
      if (settings.showResultMessage !== false) {
        message.error(
          formatMessage({
            id: 'dashboards.widget.attributes.saveFailed',
            defaultMessage: 'Failed to save attributes',
          }),
        );
      }
    } finally {
      setSaving(false);
    }
  };

  /** Checkbox fields commit immediately; number fields commit on blur. */
  const onValuesChange = (changed: Record<string, unknown>) => {
    setFieldValues((previous) => ({ ...previous, ...changed }));
    const changedName = Object.keys(changed)[0];
    if (!showActionButtons && changedName) {
      const field = fields.find((candidate) => candidate.name === changedName);
      if (field?.valueType === 'booleanCheckbox') {
        void persist([changedName]);
      }
    }
  };

  const saveAll = () => {
    const changed = fields
      .filter(
        (field) => form.getFieldValue(field.name) !== fieldValues[field.name],
      )
      .map((field) => field.name);
    void persist(changed);
  };

  if (!entity) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 12,
        }}
        data-widget="system.input_widgets.update_multiple_attributes"
      >
        <Typography.Text type="secondary">
          {formatMessage({
            id: 'dashboards.widget.attributes.noEntity',
            defaultMessage: 'This widget has no resolved target entity',
          })}
        </Typography.Text>
      </div>
    );
  }

  const columns = settings.fieldsInRow ?? 1;

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        overflow: 'auto',
        padding: 8,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
      data-widget="system.input_widgets.update_multiple_attributes"
    >
      {title || groupTitle ? (
        <Typography.Text strong ellipsis>
          {title || groupTitle}
        </Typography.Text>
      ) : null}
      {title && groupTitle ? (
        <Typography.Text type="secondary" style={{ marginTop: -4 }}>
          {groupTitle}
        </Typography.Text>
      ) : null}
      <Form
        form={form}
        layout="vertical"
        disabled={loading}
        onValuesChange={onValuesChange}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
            gap: 12,
          }}
        >
          {fields.map((field) => {
            const disabledBy =
              field.disabledOnDataKey && !fieldValues[field.disabledOnDataKey];
            const disabled = !field.editable || Boolean(disabledBy);
            return (
              <Form.Item
                key={field.name}
                name={field.name}
                label={field.label}
                valuePropName={
                  field.valueType === 'booleanCheckbox' ? 'checked' : 'value'
                }
                style={{ marginBottom: 8 }}
              >
                {field.valueType === 'booleanCheckbox' ? (
                  <Checkbox disabled={disabled} />
                ) : (
                  <InputNumber
                    disabled={disabled}
                    step={field.step}
                    min={field.min}
                    max={field.max}
                    style={{ width: '100%' }}
                    onBlur={() => {
                      if (!showActionButtons) {
                        void persist([field.name]);
                      }
                    }}
                    onPressEnter={() => {
                      if (!showActionButtons) {
                        void persist([field.name]);
                      }
                    }}
                  />
                )}
              </Form.Item>
            );
          })}
        </div>
      </Form>
      {showActionButtons ? (
        <Space>
          <Button
            type="primary"
            size="small"
            loading={saving}
            onClick={saveAll}
          >
            {formatMessage({ id: 'action.save', defaultMessage: 'Save' })}
          </Button>
          <Button size="small" onClick={() => form.setFieldsValue(fieldValues)}>
            {formatMessage({ id: 'action.cancel', defaultMessage: 'Reset' })}
          </Button>
        </Space>
      ) : null}
    </div>
  );
}
