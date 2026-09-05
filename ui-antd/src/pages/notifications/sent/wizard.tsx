/**
 * Send-notification wizard (M12 wave 3-B, spec §4.3) — ui-ngx
 * sent-notification-dialog parity: Setup → Compose (from-scratch only) →
 * Review, with the step gate on all validity, delivery-method availability
 * probing, the WEB-always-on rule, scheduled sending (timezone →
 * sendingDelayInSec), a live preview via POST request/preview and the shared
 * RecipientDialog as the inline "create new" entry.
 *
 * Mounted by the sent list (toolbar + row "notify again") and by
 * SendNotificationButton for other pages.
 */

import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  DatePicker,
  Divider,
  Form,
  Modal,
  Radio,
  Select,
  Steps,
  Switch,
  Tag,
  Typography,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import { sanitizeNotificationHtml } from '@/components/notifications/notification-sanitize';
import RecipientDialog from '@/components/notifications/recipient-dialog';
import { RecipientEntitySelect } from '@/components/notifications/recipient-entity-select';
import { TemplateConfiguration } from '@/components/notifications/template-configuration';
import {
  emptyMethodTemplate,
  hasEnabledMethod,
  type TemplateValue,
  validateTemplateConfiguration,
} from '@/components/notifications/template-configuration/template-fields';
import {
  getAvailableDeliveryMethods,
  getNotificationRequestPreview,
  getNotificationTargetById,
  getNotificationTargetsByNotificationType,
  getNotificationTemplates,
  sendNotificationRequest,
} from '@/services/tb/notification';
import {
  NotificationDeliveryMethod,
  type NotificationRequest,
  type NotificationRequestInfo,
  NotificationType,
} from '@/types/tb/notification';
import {
  buildNotificationRequest,
  defaultTimezone,
  emptyWizardPrefill,
  listTimezones,
  prefillFromRequest,
  scheduleWithinRange,
  sendingDelayInSeconds,
  type WizardPrefill,
  withMethodEnabled,
} from './send-logic';
import { SENT_REQUESTS_QUERY_KEY } from './url-state';

export interface SendNotificationWizardProps {
  open: boolean;
  onClose: () => void;
  /** "Notify again" seed: pre-fills targets/template/methods. */
  prefilledRequest?: NotificationRequest | NotificationRequestInfo | null;
}

interface SetupFormValues {
  useTemplate: boolean;
  templateId?: string;
  targetIds: Array<string>;
  scheduleEnabled: boolean;
  timezone: string;
  scheduledAt?: Dayjs;
}

const TEMPLATE_PAGE_SORT = {
  pageSize: 200,
  page: 0,
  sortOrder: { property: 'name', direction: 'ASC' as const },
};

const TARGET_PAGE_SORT = {
  pageSize: 50,
  page: 0,
  sortOrder: { property: 'createdTime', direction: 'DESC' as const },
};

const ALL_METHODS = Object.values(NotificationDeliveryMethod);

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

const PREVIEW_TITLE_KEYS: Record<NotificationDeliveryMethod, string> = {
  [NotificationDeliveryMethod.WEB]:
    'pages.notifications.sent.wizard.webPreview',
  [NotificationDeliveryMethod.EMAIL]:
    'pages.notifications.sent.wizard.emailPreview',
  [NotificationDeliveryMethod.SMS]:
    'pages.notifications.sent.wizard.smsPreview',
  [NotificationDeliveryMethod.SLACK]:
    'pages.notifications.sent.wizard.slackPreview',
  [NotificationDeliveryMethod.MICROSOFT_TEAMS]:
    'pages.notifications.sent.wizard.microsoftTeamsPreview',
  [NotificationDeliveryMethod.MOBILE_APP]:
    'pages.notifications.sent.wizard.mobileAppPreview',
};

export function SendNotificationWizard({
  open,
  onClose,
  prefilledRequest,
}: SendNotificationWizardProps) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<SetupFormValues>();

  const [prefill, setPrefill] = useState<WizardPrefill>(emptyWizardPrefill());
  const [templateValue, setTemplateValue] = useState<TemplateValue>({});
  const [stepIndex, setStepIndex] = useState(0);
  const [gateError, setGateError] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();
  const [sending, setSending] = useState(false);
  const [recipientDialogOpen, setRecipientDialogOpen] = useState(false);

  const label = (id: string, defaultMessage: string) =>
    formatMessage({ id, defaultMessage });

  // ---- re-seed per open (new dialog vs notify-again) -----------------------
  const prefillKey = prefilledRequest?.id?.id ?? 'new';
  const lastSeedKey = useRef<string | null>(null);
  useEffect(() => {
    // Guard on the request id: a background refetch re-creates the row
    // object (new identity, same id) and must NOT reset an open wizard.
    if (!open || lastSeedKey.current === prefillKey) {
      return;
    }
    lastSeedKey.current = prefillKey;
    const seed = prefilledRequest
      ? prefillFromRequest(prefilledRequest)
      : {
          ...emptyWizardPrefill(),
          // WEB is always on for a fresh from-scratch send (ngx parity).
          templateValue: {
            [NotificationDeliveryMethod.WEB]: emptyMethodTemplate(
              NotificationDeliveryMethod.WEB,
            ),
          },
        };
    setPrefill(seed);
    setTemplateValue(seed.templateValue);
    setStepIndex(0);
    setGateError(undefined);
    setSubmitError(undefined);
    form.setFieldsValue({
      useTemplate: seed.useTemplate,
      templateId: seed.templateId,
      targetIds: seed.targetIds,
      scheduleEnabled: false,
      timezone: defaultTimezone(),
      scheduledAt: undefined,
    });
  }, [open, prefillKey, prefilledRequest, form.setFieldsValue, lastSeedKey]);

  const useTemplate = Form.useWatch('useTemplate', form) ?? prefill.useTemplate;
  const scheduleEnabled = Form.useWatch('scheduleEnabled', form) ?? false;
  const scheduleTimezone = Form.useWatch('timezone', form) ?? defaultTimezone();

  // ---- availability probing + catalogs -------------------------------------
  const methodsQuery = useQuery({
    queryKey: ['notifications', 'delivery-methods'],
    queryFn: getAvailableDeliveryMethods,
    enabled: open,
  });
  const availableMethods = useMemo(
    () => new Set(methodsQuery.data ?? []),
    [methodsQuery.data],
  );
  const hasUnavailable = ALL_METHODS.some(
    (method) => !availableMethods.has(method),
  );

  const templatesQuery = useQuery({
    queryKey: ['notifications', 'wizard-templates'],
    queryFn: () =>
      getNotificationTemplates(TEMPLATE_PAGE_SORT, [NotificationType.GENERAL]),
    enabled: open && useTemplate,
  });

  // ---- step layout ----------------------------------------------------------
  const steps = useTemplate
    ? ['setup', 'review']
    : ['setup', 'compose', 'review'];
  const composeIndex = useTemplate ? -1 : 1;
  const reviewIndex = steps.length - 1;

  // ---- preview (Review step) -------------------------------------------------
  const previewRequest = useMemo(() => {
    if (stepIndex !== reviewIndex) {
      return undefined;
    }
    const values = form.getFieldsValue();
    const delay =
      values.scheduleEnabled && values.scheduledAt
        ? sendingDelayInSeconds(values.timezone, values.scheduledAt)
        : 0;
    return buildNotificationRequest({
      targetIds: values.targetIds ?? [],
      useTemplate: values.useTemplate,
      templateId: values.templateId,
      templateValue,
      sendingDelayInSec: delay,
    });
    // Recomputed on step entry and when the composed template changed.
  }, [stepIndex, reviewIndex, templateValue, form]);

  const previewQuery = useQuery({
    queryKey: [
      'notifications',
      'send-preview',
      previewRequest ? JSON.stringify(previewRequest) : '',
    ],
    queryFn: () =>
      getNotificationRequestPreview(previewRequest as NotificationRequest, 20),
    enabled: Boolean(previewRequest),
    placeholderData: keepPreviousData,
  });

  // ---- step gating ------------------------------------------------------------
  const validateSetup = async (): Promise<boolean> => {
    try {
      await form.validateFields();
    } catch {
      return false;
    }
    if (!useTemplate) {
      if (!hasEnabledMethod(templateValue)) {
        setGateError(
          label(
            'pages.notifications.sent.wizard.atLeastOneMethod',
            'At least one delivery method should be selected',
          ),
        );
        return false;
      }
      if (validateTemplateConfiguration(templateValue).length > 0) {
        setGateError(
          label(
            'pages.notifications.sent.wizard.composeIncomplete',
            'Complete every enabled message before continuing.',
          ),
        );
        return false;
      }
    }
    setGateError(undefined);
    return true;
  };

  const validateCompose = (): boolean => {
    if (validateTemplateConfiguration(templateValue).length > 0) {
      setGateError(
        label(
          'pages.notifications.sent.wizard.composeIncomplete',
          'Complete every enabled message before continuing.',
        ),
      );
      return false;
    }
    setGateError(undefined);
    return true;
  };

  const send = async () => {
    const values = form.getFieldsValue();
    const delay =
      values.scheduleEnabled && values.scheduledAt
        ? sendingDelayInSeconds(values.timezone, values.scheduledAt)
        : 0;
    setSending(true);
    setSubmitError(undefined);
    try {
      await sendNotificationRequest(
        buildNotificationRequest({
          targetIds: values.targetIds ?? [],
          useTemplate: values.useTemplate,
          templateId: values.templateId,
          templateValue,
          sendingDelayInSec: delay,
        }),
      );
      void message.success(
        label(
          'pages.notifications.sent.wizard.toastSent',
          'Notification request sent.',
        ),
      );
      void queryClient.invalidateQueries({ queryKey: SENT_REQUESTS_QUERY_KEY });
      onClose();
    } catch (error) {
      setSubmitError(serverErrorText(error));
    } finally {
      setSending(false);
    }
  };

  const handleNext = async () => {
    if (stepIndex === 0 && !(await validateSetup())) {
      return;
    }
    if (stepIndex === composeIndex && !validateCompose()) {
      return;
    }
    if (stepIndex >= reviewIndex) {
      await send();
      return;
    }
    setStepIndex(stepIndex + 1);
  };

  const toggleMethod = (
    method: NotificationDeliveryMethod,
    enabled: boolean,
  ) => {
    setTemplateValue((previous) =>
      withMethodEnabled(previous, method, enabled),
    );
  };

  // ---- schedule picker bounds (ngx minDate/maxDate :287-295) -----------------
  const scheduleMin = dayjs();
  const scheduleMax = dayjs().add(8, 'day');

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={860}
      title={
        prefilledRequest
          ? label('pages.notifications.sent.wizard.againTitle', 'Send again')
          : label(
              'pages.notifications.sent.wizard.newTitle',
              'New notification',
            )
      }
      footer={
        <div className="flex items-center gap-3">
          {stepIndex > 0 && (
            <Button onClick={() => setStepIndex(stepIndex - 1)}>
              {label('pages.notifications.sent.wizard.back', 'Back')}
            </Button>
          )}
          <div className="flex-1" />
          {submitError && (
            <Typography.Text type="danger" data-testid="wizard-submit-error">
              {submitError}
            </Typography.Text>
          )}
          <Button
            type="primary"
            loading={sending}
            onClick={() => void handleNext()}
            data-testid="wizard-next"
          >
            {stepIndex >= reviewIndex
              ? label('pages.notifications.sent.wizard.send', 'Send')
              : label('pages.notifications.sent.wizard.next', 'Next')}
          </Button>
        </div>
      }
      destroyOnHidden
      mask={{ closable: false }}
    >
      <Steps
        size="small"
        className="mb-4"
        current={stepIndex}
        items={steps.map((step) => ({
          title: label(
            step === 'setup'
              ? 'pages.notifications.sent.wizard.step.setup'
              : step === 'compose'
                ? 'pages.notifications.sent.wizard.step.compose'
                : 'pages.notifications.sent.wizard.step.review',
            step,
          ),
        }))}
      />

      {gateError && (
        <Alert type="error" showIcon title={gateError} className="mb-3" />
      )}

      {/* ---- Setup ---- */}
      <div
        className={stepIndex === 0 ? '' : 'hidden'}
        data-testid="wizard-step-setup"
      >
        <Form form={form} layout="vertical" component={false}>
          <Form.Item name="useTemplate" className="mb-4">
            <Radio.Group
              options={[
                {
                  value: false,
                  label: label(
                    'pages.notifications.sent.wizard.startFromScratch',
                    'Start from scratch',
                  ),
                },
                {
                  value: true,
                  label: label(
                    'pages.notifications.sent.wizard.useTemplate',
                    'Use template',
                  ),
                },
              ]}
              optionType="button"
              buttonStyle="solid"
            />
          </Form.Item>

          {useTemplate && (
            <Form.Item
              name="templateId"
              label={label(
                'pages.notifications.sent.wizard.template',
                'Template',
              )}
              rules={[
                {
                  required: true,
                  message: label(
                    'pages.notifications.sent.wizard.templateRequired',
                    'Template is required',
                  ),
                },
              ]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                loading={templatesQuery.isPending}
                options={(templatesQuery.data?.data ?? []).map((template) => ({
                  value: template.id.id,
                  label: template.name,
                }))}
                placeholder={label(
                  'pages.notifications.sent.wizard.templateSearch',
                  'Search template',
                )}
              />
            </Form.Item>
          )}

          <Form.Item
            name="targetIds"
            label={label(
              'pages.notifications.sent.wizard.recipients',
              'Recipients',
            )}
            rules={[
              {
                required: true,
                message: label(
                  'pages.notifications.sent.wizard.recipientsRequired',
                  'Recipients are required',
                ),
              },
            ]}
          >
            <RecipientEntitySelect
              queryKey={['notifications', 'wizard-targets']}
              mode="multiple"
              fetchPage={(textSearch) =>
                getNotificationTargetsByNotificationType(
                  NotificationType.GENERAL,
                  {
                    ...TARGET_PAGE_SORT,
                    textSearch: textSearch || undefined,
                  },
                )
              }
              toOption={(target) => ({
                label: target.name,
                value: target.id.id,
              })}
              resolveOne={async (id) => {
                const target = await getNotificationTargetById(id);
                return { label: target.name, value: id };
              }}
              placeholder={label(
                'pages.notifications.sent.wizard.searchRecipients',
                'Search recipients',
              )}
            />
          </Form.Item>

          <div className="mb-4">
            <Button
              type="link"
              size="small"
              className="px-0"
              icon={<PlusOutlined />}
              onClick={(event) => {
                event.stopPropagation();
                setRecipientDialogOpen(true);
              }}
            >
              {label(
                'pages.notifications.sent.wizard.createRecipient',
                'Create new',
              )}
            </Button>
          </div>

          {!useTemplate && (
            <div className="mb-4">
              <div className="mb-1 flex items-center gap-2">
                <Typography.Text strong>
                  {label(
                    'pages.notifications.sent.deliveryMethod.deliveryMethod',
                    'Delivery method',
                  )}
                </Typography.Text>
                {hasUnavailable && (
                  <Button
                    type="text"
                    size="small"
                    icon={<ReloadOutlined />}
                    title={label(
                      'pages.notifications.sent.wizard.refreshDeliveryMethods',
                      'Refresh available delivery methods',
                    )}
                    onClick={() => void methodsQuery.refetch()}
                  />
                )}
              </div>
              <Typography.Text type="secondary">
                {label(
                  'pages.notifications.sent.wizard.atLeastOneMethod',
                  'At least one delivery method should be selected',
                )}
              </Typography.Text>
              <div className="mt-2 flex flex-wrap gap-2">
                {ALL_METHODS.map((method) => {
                  const enabled = templateValue[method]?.enabled === true;
                  const web = method === NotificationDeliveryMethod.WEB;
                  const available = availableMethods.has(method);
                  return (
                    <span
                      key={method}
                      className="inline-flex items-center gap-2 rounded-md border border-solid px-3 py-2"
                      style={{ opacity: available || web ? 1 : 0.6 }}
                      data-testid={`wizard-method-${method}`}
                    >
                      <Switch
                        size="small"
                        checked={enabled}
                        // WEB is the in-app bell: always on, never unconfigured.
                        disabled={web || (!available && !enabled)}
                        onChange={(checked) => toggleMethod(method, checked)}
                      />
                      <Typography.Text>
                        {label(METHOD_NAME_KEYS[method], method)}
                      </Typography.Text>
                      {web ? (
                        <Typography.Text
                          type="secondary"
                          style={{ fontSize: 12 }}
                        >
                          {label(
                            'pages.notifications.sent.wizard.webAlwaysOn',
                            'Web notifications are always delivered to the notification bell.',
                          )}
                        </Typography.Text>
                      ) : !available ? (
                        <Typography.Text
                          type="warning"
                          style={{ fontSize: 12 }}
                        >
                          {label(
                            'pages.notifications.sent.wizard.deliveryMethodNotConfigured',
                            'Delivery method is not configured. Contact your system administrator.',
                          )}
                        </Typography.Text>
                      ) : null}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          <div className="rounded-md border border-solid p-3">
            <Form.Item name="scheduleEnabled" valuePropName="checked" noStyle>
              <Switch
                data-testid="wizard-schedule-switch"
                checkedChildren={label(
                  'pages.notifications.sent.wizard.scheduleLater',
                  'Schedule for later',
                )}
                unCheckedChildren={label(
                  'pages.notifications.sent.wizard.scheduleLater',
                  'Schedule for later',
                )}
              />
            </Form.Item>
            {scheduleEnabled && (
              <div className="mt-3 flex flex-wrap items-start gap-3">
                <Form.Item
                  name="timezone"
                  label={label(
                    'pages.notifications.sent.wizard.scheduleTimezone',
                    'Timezone',
                  )}
                  rules={[
                    {
                      required: true,
                      message: label(
                        'pages.notifications.sent.wizard.scheduleTimezoneRequired',
                        'Timezone is required',
                      ),
                    },
                  ]}
                >
                  <Select
                    showSearch
                    style={{ width: 260 }}
                    options={listTimezones().map((tz) => ({
                      value: tz,
                      label: tz,
                    }))}
                  />
                </Form.Item>
                <Form.Item
                  name="scheduledAt"
                  label={label(
                    'pages.notifications.sent.wizard.scheduleTime',
                    'Time',
                  )}
                  rules={[
                    {
                      required: true,
                      message: label(
                        'pages.notifications.sent.wizard.scheduleTimeRequired',
                        'Time is required',
                      ),
                    },
                    {
                      validator: (_, value: Dayjs) =>
                        !value || scheduleWithinRange(scheduleTimezone, value)
                          ? Promise.resolve()
                          : Promise.reject(
                              new Error(
                                label(
                                  'pages.notifications.sent.wizard.scheduleRangeHint',
                                  'Pick a time between now and 7 days ahead.',
                                ),
                              ),
                            ),
                    },
                  ]}
                >
                  <DatePicker
                    showTime
                    format="YYYY-MM-DD HH:mm"
                    disabledDate={(date) =>
                      date.isBefore(scheduleMin, 'day') ||
                      date.isAfter(scheduleMax, 'day')
                    }
                  />
                </Form.Item>
              </div>
            )}
          </div>
        </Form>
      </div>

      {/* ---- Compose (from scratch only) ---- */}
      {composeIndex >= 0 && (
        <div
          className={stepIndex === composeIndex ? '' : 'hidden'}
          data-testid="wizard-step-compose"
        >
          <TemplateConfiguration
            value={templateValue}
            onChange={setTemplateValue}
            notificationType={NotificationType.GENERAL}
            enabledMethods={ALL_METHODS.filter(
              (method) =>
                method === NotificationDeliveryMethod.WEB ||
                availableMethods.has(method),
            )}
          />
        </div>
      )}

      {/* ---- Review ---- */}
      <div
        className={stepIndex === reviewIndex ? '' : 'hidden'}
        data-testid="wizard-step-review"
      >
        {previewQuery.isPending && (
          <Typography.Text type="secondary">…</Typography.Text>
        )}
        {previewQuery.isError && (
          <Alert
            type="error"
            showIcon
            title={label(
              'pages.notifications.sent.wizard.previewFailed',
              'Failed to build the preview',
            )}
            description={serverErrorText(previewQuery.error)}
          />
        )}
        {previewQuery.data && (
          <div className="flex flex-col gap-4" data-testid="wizard-review">
            <section className="rounded-md border border-solid p-3">
              <Typography.Text strong>
                {formatMessage(
                  {
                    id: 'pages.notifications.sent.wizard.reviewTotalRecipients',
                    defaultMessage:
                      '{count, plural, =1 {1 recipient} other {# recipients}}',
                  },
                  {
                    count: previewQuery.data.totalRecipientsCount ?? 0,
                  },
                )}
              </Typography.Text>
              {Object.entries(previewQuery.data.recipientsCountByTarget ?? {})
                .length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(
                    previewQuery.data.recipientsCountByTarget ?? {},
                  ).map(([target, count]) => (
                    <Tag key={target}>
                      {target}: {count}
                    </Tag>
                  ))}
                </div>
              )}
              <Divider className="my-2" />
              <div className="flex flex-wrap gap-1">
                {(previewQuery.data.recipientsPreview ?? []).map(
                  (recipient) => (
                    <Tag key={recipient}>{recipient}</Tag>
                  ),
                )}
              </div>
            </section>

            {Object.values(NotificationDeliveryMethod).map((method) => {
              const processed = previewQuery.data.processedTemplates?.[method];
              if (!processed?.enabled) {
                return null;
              }
              return (
                <section
                  key={method}
                  className="rounded-md border border-solid p-3"
                  data-testid={`wizard-preview-${method}`}
                >
                  <Typography.Text strong>
                    {label(PREVIEW_TITLE_KEYS[method], method)}
                  </Typography.Text>
                  <MethodPreview method={method} template={processed} />
                </section>
              );
            })}
          </div>
        )}
      </div>

      <RecipientDialog
        open={recipientDialogOpen}
        onClose={() => setRecipientDialogOpen(false)}
        onSaved={() => {
          setRecipientDialogOpen(false);
          void queryClient.invalidateQueries({
            queryKey: ['notifications', 'wizard-targets'],
          });
        }}
      />
    </Modal>
  );
}

/** Per-method preview body (ngx review blocks :202-274). */
function MethodPreview({
  method,
  template,
}: {
  method: NotificationDeliveryMethod;
  template: { subject?: string; body?: string; themeColor?: string };
}) {
  if (method === NotificationDeliveryMethod.EMAIL) {
    return (
      <div className="mt-2">
        {template.subject && (
          <>
            <Typography.Text strong>{template.subject}</Typography.Text>
            <Divider className="my-2" />
          </>
        )}
        {/* Server-processed template body; sanitized like the inbox render. */}
        <div
          data-testid="wizard-preview-email-body"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized template HTML, DOMPurify allowlist + forbidden-tag sweep
          dangerouslySetInnerHTML={{
            __html: sanitizeNotificationHtml(template.body ?? ''),
          }}
        />
      </div>
    );
  }
  return (
    <div className="mt-2 flex flex-col gap-1">
      {template.subject && (
        <Typography.Text strong>{template.subject}</Typography.Text>
      )}
      <Typography.Text>{template.body}</Typography.Text>
      {method === NotificationDeliveryMethod.MICROSOFT_TEAMS &&
        template.themeColor && (
          <span
            className="mt-1 inline-block h-2 w-24 rounded"
            style={{ backgroundColor: template.themeColor }}
          />
        )}
    </div>
  );
}
