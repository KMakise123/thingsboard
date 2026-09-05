/**
 * Shared notification message editor (M12 wave 3-B) — ui-ngx
 * tb-template-configuration parity, page-agnostic for reuse by the send
 * wizard (wave 3-B) and the templates dialog (wave 3-C).
 *
 * Contract: `value` is the deliveryMethodsTemplates map
 * (`Partial<Record<NotificationDeliveryMethod, DeliveryMethodNotificationTemplate>>`).
 * Like ngx, the enable toggles live OUTSIDE the editor (the hosts' Setup
 * steps bind them); this component renders exactly the enabled methods and
 * always emits `enabled` + `method` on every entry. Disabled (not-enabled)
 * methods therefore contribute no editable fields at all, which is the same
 * net effect as ngx disabling their form groups (they are not rendered).
 *
 * Field limits per method (150/250/50 subject, 250/320/150 body, button text
 * 50, link 300) and rules come from ./template-fields — the single source
 * shared with the wizard step gate.
 */

import { BellOutlined } from '@ant-design/icons';
import { Form, Input, Select, Switch, theme } from 'antd';
import { useEffect, useMemo, useRef } from 'react';
import { useIntl } from 'react-intl';
import {
  type MobileAppTemplateAdditionalConfig,
  type NotificationButtonConfig,
  NotificationDeliveryMethod,
  NotificationType,
} from '@/types/tb/notification';
import { ActionButtonConfiguration } from './action-button-configuration';
import {
  actionButtonOf,
  bodyMaxLength,
  buttonHidesText,
  emptyButtonConfig,
  emptyMethodTemplate,
  hasSubjectField,
  subjectMaxLength,
  subjectRequired,
  supportsActionButton,
  supportsIcon,
  type TemplateValue,
  templateIconConfig,
  templateSubject,
  templateThemeColor,
  templateValueSignature,
  validateActionButton,
} from './template-fields';
import { TemplateParamsHelpButton } from './template-params-help';

export interface TemplateConfigurationProps {
  value?: TemplateValue;
  onChange?: (value: TemplateValue) => void;
  notificationType: NotificationType;
  /** Restrict rendering to these methods (hosts pass their enabled set). */
  enabledMethods?: Array<NotificationDeliveryMethod>;
  disabled?: boolean;
}

/** Shape of the internal per-method form group. */
interface MethodFormValues {
  subject?: string;
  body?: string;
  iconEnabled?: boolean;
  icon?: string;
  iconColor?: string;
  themeColor?: string;
  button?: NotificationButtonConfig;
}

const METHOD_NAME_KEYS: Record<NotificationDeliveryMethod, string> = {
  [NotificationDeliveryMethod.WEB]:
    'pages.notifications.sent.deliveryMethod.web',
  [NotificationDeliveryMethod.EMAIL]:
    'pages.notifications.sent.deliveryMethod.email',
  [NotificationDeliveryMethod.SMS]:
    'pages.notifications.sent.deliveryMethod.sms',
  [NotificationDeliveryMethod.SLACK]:
    'pages.notifications.sent.deliveryMethod.slack',
  [NotificationDeliveryMethod.MICROSOFT_TEAMS]:
    'pages.notifications.sent.deliveryMethod.microsoftTeams',
  [NotificationDeliveryMethod.MOBILE_APP]:
    'pages.notifications.sent.deliveryMethod.mobileApp',
};

/** Icon options aligned with the fork's customIconComponent alias set. */
const ICON_OPTIONS = [
  'notifications',
  'warning',
  'error_outline',
  'comment',
  'devices',
  'device_hub',
  'phonelink_off',
  'assignment_turned_in',
  'insert_chart',
  'data_thresholding',
  'settings_ethernet',
];

function valueToFormValues(
  value: TemplateValue | undefined,
): Record<string, MethodFormValues> {
  const out: Record<string, MethodFormValues> = {};
  for (const method of Object.values(NotificationDeliveryMethod)) {
    const template = value?.[method];
    if (!template?.enabled) {
      continue;
    }
    const icon = templateIconConfig(template);
    out[method] = {
      subject: templateSubject(template),
      body: template.body ?? '',
      iconEnabled: icon?.enabled === true,
      icon: icon?.icon || 'notifications',
      iconColor: icon?.color || '#757575',
      themeColor: templateThemeColor(template),
      button:
        (actionButtonOf(template) as NotificationButtonConfig | undefined) ??
        emptyButtonConfig(),
    };
  }
  return out;
}

function formValuesToWire(
  formValues: Record<string, MethodFormValues>,
  seed: TemplateValue | undefined,
): TemplateValue {
  const wire: TemplateValue = {};
  for (const method of Object.values(NotificationDeliveryMethod)) {
    if (!seed?.[method]?.enabled) {
      continue;
    }
    const fields = formValues[method] ?? {};
    const body = fields.body ?? '';
    const icon = () => ({
      enabled: fields.iconEnabled === true,
      icon: fields.icon || 'notifications',
      color: fields.iconColor || '#757575',
    });
    switch (method) {
      case NotificationDeliveryMethod.WEB:
        wire[method] = {
          method,
          enabled: true,
          subject: fields.subject ?? '',
          body,
          additionalConfig: {
            icon: icon(),
            ...(fields.button
              ? {
                  // JsonNode passthrough — the fork's bell renders the full
                  // NotificationButtonConfig (incl. DASHBOARD) from this key.
                  actionButtonConfig: fields.button,
                }
              : {}),
          },
        };
        break;
      case NotificationDeliveryMethod.EMAIL:
        wire[method] = {
          method,
          enabled: true,
          subject: fields.subject ?? '',
          body,
        };
        break;
      case NotificationDeliveryMethod.SMS:
      case NotificationDeliveryMethod.SLACK:
        wire[method] = { method, enabled: true, body };
        break;
      case NotificationDeliveryMethod.MICROSOFT_TEAMS:
        wire[method] = {
          method,
          enabled: true,
          subject: fields.subject ?? '',
          body,
          themeColor: fields.themeColor ?? '',
          ...(fields.button ? { button: fields.button } : {}),
        };
        break;
      case NotificationDeliveryMethod.MOBILE_APP:
        wire[method] = {
          method,
          enabled: true,
          subject: fields.subject ?? '',
          body,
          // icon rides as a JsonNode passthrough (the fork's MOBILE
          // additionalConfig type only declares onClick).
          additionalConfig: {
            icon: icon(),
            ...(fields.button ? { onClick: fields.button } : {}),
          } as MobileAppTemplateAdditionalConfig,
        };
        break;
    }
  }
  return wire;
}

export function TemplateConfiguration({
  value,
  onChange,
  notificationType,
  enabledMethods,
  disabled = false,
}: TemplateConfigurationProps) {
  const { formatMessage } = useIntl();
  const { token } = theme.useToken();
  const [form] = Form.useForm<Record<string, MethodFormValues>>();
  const lastEmitted = useRef<string | null>(null);

  const visibleMethods = useMemo(
    () =>
      Object.values(NotificationDeliveryMethod).filter(
        (method) =>
          value?.[method]?.enabled === true &&
          (!enabledMethods || enabledMethods.includes(method)),
      ),
    [value, enabledMethods],
  );

  // Re-seed only on external value changes (the wizard toggling a method on,
  // a prefilled template, …) — not when the parent merely echoes our own
  // onChange payload back.
  const seedKey = templateValueSignature(value);
  useEffect(() => {
    if (seedKey === lastEmitted.current) {
      return;
    }
    lastEmitted.current = null;
    form.resetFields();
    form.setFieldsValue(valueToFormValues(value));
  }, [seedKey, value, form]);

  const emit = () => {
    const wire = formValuesToWire(
      form.getFieldsValue(true) as Record<string, MethodFormValues>,
      value,
    );
    lastEmitted.current = templateValueSignature(wire);
    onChange?.(wire);
  };

  const label = (id: string, defaultMessage: string) =>
    formatMessage({ id, defaultMessage });

  return (
    <div data-testid="template-configuration">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[16px] font-medium">
          {label(
            'pages.notifications.sent.templateConfig.customizeMessages',
            'Customize messages',
          )}
        </span>
        <TemplateParamsHelpButton notificationType={notificationType} />
        <span
          className="text-[13px]"
          style={{ color: token.colorTextSecondary }}
        >
          {label(
            'pages.notifications.sent.templateConfig.templatizationHint',
            'Input fields support templatization.',
          )}
        </span>
      </div>

      <Form
        form={form}
        component={false}
        disabled={disabled}
        onValuesChange={emit}
      >
        <div className="flex flex-col gap-4">
          {visibleMethods.map((method) => (
            <section
              key={method}
              className="rounded-md border border-solid p-4"
              style={{ borderColor: token.colorBorderSecondary }}
              data-testid={`template-method-${method}`}
            >
              <div className="mb-3 flex items-center gap-2">
                <BellOutlined style={{ color: token.colorPrimary }} />
                <span className="text-[15px] font-medium">
                  {label(METHOD_NAME_KEYS[method], method)}
                </span>
              </div>
              <MethodFields
                method={method}
                label={label}
                formatValues={formatMessage}
                notificationType={notificationType}
              />
            </section>
          ))}
        </div>
      </Form>
    </div>
  );
}

type LabelFn = (id: string, defaultMessage: string) => string;

function MethodFields({
  method,
  label,
  formatValues,
  notificationType,
}: {
  method: NotificationDeliveryMethod;
  label: LabelFn;
  formatValues: (
    descriptor: { id: string; defaultMessage: string },
    values?: Record<string, string | number>,
  ) => string;
  notificationType: NotificationType;
}) {
  const subjectMax = subjectMaxLength(method);
  const bodyMax = bodyMaxLength(method);
  const tapAction =
    method === NotificationDeliveryMethod.MOBILE_APP &&
    (notificationType === NotificationType.ALARM ||
      notificationType === NotificationType.ALARM_ASSIGNMENT ||
      notificationType === NotificationType.ALARM_COMMENT);

  const maxLengthMessage = (
    id: string,
    defaultMessage: string,
    length: number,
  ) => formatValues({ id, defaultMessage }, { length });

  const buttonValidator = {
    validator: (_: unknown, buttonValue: NotificationButtonConfig) => {
      const violations = validateActionButton(buttonValue, {
        hideButtonText: buttonHidesText(method),
      });
      return violations.length === 0
        ? Promise.resolve()
        : Promise.reject(
            new Error(
              label(
                'pages.notifications.sent.templateConfig.buttonInvalid',
                'The action button configuration is incomplete',
              ),
            ),
          );
    },
  };

  return (
    <div className="flex flex-col gap-3">
      {hasSubjectField(method) && (
        <Form.Item
          name={[method, 'subject']}
          label={label(
            'pages.notifications.sent.templateConfig.subject',
            'Subject',
          )}
          rules={[
            {
              required: subjectRequired(method),
              message: label(
                'pages.notifications.sent.templateConfig.subjectRequired',
                'Subject is required',
              ),
            },
            ...(subjectMax
              ? [
                  {
                    max: subjectMax,
                    message: maxLengthMessage(
                      'pages.notifications.sent.templateConfig.subjectMaxLength',
                      'Subject should be less than or equal to {length} characters',
                      subjectMax,
                    ),
                  },
                ]
              : []),
          ]}
        >
          <Input maxLength={subjectMax} showCount={Boolean(subjectMax)} />
        </Form.Item>
      )}

      <Form.Item
        name={[method, 'body']}
        label={label(
          'pages.notifications.sent.templateConfig.message',
          'Message',
        )}
        extra={
          method === NotificationDeliveryMethod.EMAIL
            ? label(
                'pages.notifications.sent.templateConfig.emailBodyHtmlHint',
                'Email body is HTML.',
              )
            : undefined
        }
        rules={[
          {
            required: true,
            message: label(
              'pages.notifications.sent.templateConfig.messageRequired',
              'Message is required',
            ),
          },
          ...(bodyMax
            ? [
                {
                  max: bodyMax,
                  message: maxLengthMessage(
                    'pages.notifications.sent.templateConfig.messageMaxLength',
                    'Message should be less than or equal to {length} characters',
                    bodyMax,
                  ),
                },
              ]
            : []),
        ]}
      >
        <Input.TextArea
          autoSize={{ minRows: 2, maxRows: 10 }}
          maxLength={bodyMax}
          showCount={Boolean(bodyMax)}
          data-testid={`template-body-${method}`}
        />
      </Form.Item>

      {supportsIcon(method) && (
        <Form.Item
          noStyle
          shouldUpdate={(prev, next) =>
            prev[method]?.iconEnabled !== next[method]?.iconEnabled
          }
        >
          {({ getFieldValue }) => {
            const iconOn = getFieldValue([method, 'iconEnabled']) === true;
            return (
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2">
                  <Form.Item
                    name={[method, 'iconEnabled']}
                    valuePropName="checked"
                    noStyle
                  >
                    <Switch size="small" />
                  </Form.Item>
                  <span>
                    {label(
                      'pages.notifications.sent.templateConfig.icon',
                      'Icon',
                    )}
                  </span>
                </span>
                <Form.Item name={[method, 'icon']} noStyle>
                  <Select
                    style={{ width: 220 }}
                    disabled={!iconOn}
                    options={ICON_OPTIONS.map((name) => ({
                      value: name,
                      label: name,
                    }))}
                    data-testid={`template-icon-${method}`}
                  />
                </Form.Item>
                <Form.Item name={[method, 'iconColor']} noStyle>
                  <Input
                    style={{ width: 110 }}
                    disabled={!iconOn}
                    placeholder="#757575"
                    data-testid={`template-icon-color-${method}`}
                  />
                </Form.Item>
              </div>
            );
          }}
        </Form.Item>
      )}

      {method === NotificationDeliveryMethod.MICROSOFT_TEAMS && (
        <div className="flex items-center gap-3">
          <span>
            {label(
              'pages.notifications.sent.templateConfig.themeColor',
              'Theme color',
            )}
          </span>
          <Form.Item name={[method, 'themeColor']} noStyle>
            <Input style={{ width: 110 }} placeholder="#0072C6" />
          </Form.Item>
        </div>
      )}

      {supportsActionButton(method) && (
        <Form.Item
          name={[method, 'button']}
          rules={[buttonValidator]}
          label={
            method === NotificationDeliveryMethod.MOBILE_APP
              ? label(
                  'pages.notifications.sent.templateConfig.notificationTapAction',
                  'Notification tap action',
                )
              : label(
                  'pages.notifications.sent.templateConfig.actionButton',
                  'Action button',
                )
          }
          extra={
            tapAction
              ? label(
                  'pages.notifications.sent.templateConfig.notificationTapActionHint',
                  'If not enabled, the default alarm dashboard will be used',
                )
              : undefined
          }
        >
          <ActionButtonConfigurationBound
            label={label}
            hideButtonText={buttonHidesText(method)}
            hint={
              tapAction
                ? label(
                    'pages.notifications.sent.templateConfig.notificationTapActionHint',
                    'If not enabled, the default alarm dashboard will be used',
                  )
                : undefined
            }
          />
        </Form.Item>
      )}
    </div>
  );
}

/**
 * Glue: the parent Form.Item injects value/onChange; we pass the localized
 * title + hint through to the shared controlled component.
 */
function ActionButtonConfigurationBound({
  value,
  onChange,
  label,
  hideButtonText,
  hint,
}: {
  value?: NotificationButtonConfig;
  onChange?: (value: NotificationButtonConfig) => void;
  label: LabelFn;
  hideButtonText: boolean;
  hint?: string;
}) {
  const title = hideButtonText
    ? label(
        'pages.notifications.sent.templateConfig.notificationTapAction',
        'Notification tap action',
      )
    : label(
        'pages.notifications.sent.templateConfig.actionButton',
        'Action button',
      );
  return (
    <ActionButtonConfiguration
      value={value}
      onChange={onChange}
      title={title}
      hint={hint}
      hideButtonText={hideButtonText}
    />
  );
}

/** Convenience re-export for hosts that seed a fresh method entry. */
export { emptyMethodTemplate };
