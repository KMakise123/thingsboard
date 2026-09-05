/**
 * Notification template create/edit/copy wizard (M12 wave 3-C, spec §4.6;
 * ui-ngx template-notification-dialog parity).
 *
 * Two steps in one Modal (ngx stepper structure):
 *   1. Setup — name / notificationType (candidates narrow by authority,
 *      locked while editing) / the six delivery-method toggles (atLeastOne).
 *   2. Compose — the shared TemplateConfiguration editor rendering exactly
 *      the enabled methods; the last-step button saves via
 *      POST /api/notification/template.
 *
 * Copy prefills the source (name + " (copy)") and saves as a fresh entity;
 * edit keeps the source identity (template-setup.buildTemplatePayload).
 */
import {
  Alert,
  App,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Steps,
  Switch,
  Typography,
} from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';

import { serverErrorText } from '@/components/entities/server-error-text';
import { TemplateConfiguration } from '@/components/notifications/template-configuration';
import {
  hasEnabledMethod,
  type TemplateValue,
  validateTemplateConfiguration,
} from '@/components/notifications/template-configuration/template-fields';
import { useAuthority } from '@/components/shared/use-authority';
import { saveNotificationTemplate } from '@/services/tb/notification';
import type { NotificationTemplate } from '@/types/tb/notification';
import {
  NotificationDeliveryMethod,
  NotificationType,
} from '@/types/tb/notification';

import {
  buildTemplatePayload,
  copiedTemplateName,
  emptySetupValue,
  enabledMethodsOf,
  normalizeTemplateValue,
  notificationTypesForAuthority,
  withMethodEnabled,
} from './template-setup';

export interface TemplateWizardProps {
  open: boolean;
  /** Edit source; null = create (or copy prefill). */
  source?: NotificationTemplate | null;
  /** Copy mode: prefill from source but save as a new template. */
  copy?: boolean;
  onClose: () => void;
  /** Fired after a successful save (caller invalidates + closes). */
  onSaved: () => void;
}

interface SetupFormValues {
  name: string;
  notificationType: NotificationType;
}

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

export default function TemplateWizard({
  open,
  source,
  copy,
  onClose,
  onSaved,
}: TemplateWizardProps) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const { authority } = useAuthority();
  const isSysAdmin = authority === 'SYS_ADMIN';
  const isEdit = !!source && !copy;

  const [form] = Form.useForm<SetupFormValues>();
  const [step, setStep] = useState(0);
  const [templateValue, setTemplateValue] = useState<TemplateValue>({});
  const [gateError, setGateError] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const label = (id: string, defaultMessage: string) =>
    formatMessage({ id, defaultMessage });

  const activeType =
    Form.useWatch('notificationType', form) ??
    (source ? source.notificationType : NotificationType.GENERAL);

  // ---- seed on open ---------------------------------------------------------
  useEffect(() => {
    if (!open) {
      return;
    }
    setStep(0);
    setGateError(undefined);
    setSubmitError(undefined);
    setSaving(false);
    form.resetFields();
    if (source) {
      form.setFieldsValue({
        name: copy ? copiedTemplateName(source.name) : source.name,
        notificationType: source.notificationType,
      });
      // Keep enabled:true entries only — the toggles read from this map and
      // the editor renders exactly its enabled methods.
      setTemplateValue(
        normalizeTemplateValue(source.configuration?.deliveryMethodsTemplates),
      );
    } else {
      form.setFieldsValue({
        name: '',
        notificationType: NotificationType.GENERAL,
      });
      // ngx constructor: WEB is the only method that starts enabled.
      setTemplateValue(emptySetupValue());
    }
  }, [open, source, copy, form]);

  const typeOptions = useMemo(
    () =>
      notificationTypesForAuthority(isSysAdmin).map((type) => ({
        value: type,
        label: formatMessage({
          id: `pages.notifications.templates.type.${type}`,
          defaultMessage: type,
        }),
      })),
    [isSysAdmin, formatMessage],
  );

  // ---- step gating ------------------------------------------------------------
  const validateSetup = async (): Promise<boolean> => {
    try {
      await form.validateFields();
    } catch {
      return false;
    }
    if (!hasEnabledMethod(templateValue)) {
      setGateError(
        label(
          'pages.notifications.templates.wizard.atLeastOne',
          'At least one delivery method should be selected',
        ),
      );
      return false;
    }
    setGateError(undefined);
    return true;
  };

  const validateCompose = (): boolean => {
    if (!hasEnabledMethod(templateValue)) {
      setGateError(
        label(
          'pages.notifications.templates.wizard.atLeastOne',
          'At least one delivery method should be selected',
        ),
      );
      return false;
    }
    if (validateTemplateConfiguration(templateValue).length > 0) {
      setGateError(
        label(
          'pages.notifications.templates.wizard.composeIncomplete',
          'Complete every enabled message before continuing.',
        ),
      );
      return false;
    }
    setGateError(undefined);
    return true;
  };

  const save = async () => {
    if (!validateCompose()) {
      return;
    }
    const values = form.getFieldsValue(true);
    setSaving(true);
    setSubmitError(undefined);
    try {
      await saveNotificationTemplate(
        buildTemplatePayload({
          source: source ?? null,
          isCopy: !!copy,
          name: values.name ?? '',
          notificationType: values.notificationType,
          templateValue,
        }),
      );
      void message.success(
        label(
          'pages.notifications.templates.wizard.toastSaved',
          'Template saved.',
        ),
      );
      onSaved();
    } catch (error) {
      setSubmitError(serverErrorText(error));
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (step === 0 && !(await validateSetup())) {
      return;
    }
    if (step === 0) {
      setStep(1);
      return;
    }
    await save();
  };

  const stepItems = [
    {
      title: label('pages.notifications.templates.wizard.stepSetup', 'Setup'),
    },
    {
      title: label(
        'pages.notifications.templates.wizard.stepCompose',
        'Compose',
      ),
    },
  ];

  return (
    <Modal
      open={open}
      title={
        isEdit
          ? label(
              'pages.notifications.templates.wizard.editTitle',
              'Edit notification template',
            )
          : label(
              'pages.notifications.templates.wizard.addTitle',
              'Add notification template',
            )
      }
      width={860}
      footer={
        <div className="flex items-center gap-3">
          {step > 0 && (
            <Button
              onClick={() => setStep(0)}
              data-testid="template-wizard-back"
            >
              {label('pages.notifications.templates.wizard.back', 'Back')}
            </Button>
          )}
          <div className="flex-1" />
          {submitError && (
            <Typography.Text
              type="danger"
              data-testid="template-wizard-submit-error"
            >
              {submitError}
            </Typography.Text>
          )}
          <Button
            type="primary"
            loading={saving}
            onClick={() => void handleNext()}
            data-testid="template-wizard-next"
          >
            {step === 0
              ? label('pages.notifications.templates.wizard.next', 'Next')
              : isEdit
                ? label('pages.notifications.templates.wizard.save', 'Save')
                : label('pages.notifications.templates.wizard.add', 'Add')}
          </Button>
        </div>
      }
      destroyOnHidden
      // ngx opens the dialog disableClose: no mask-click and no Escape exit.
      mask={{ closable: false }}
      keyboard={false}
      onCancel={onClose}
      data-testid="template-wizard"
    >
      <Steps size="small" current={step} items={stepItems} className="mb-4" />

      {gateError && (
        <Alert
          type="error"
          showIcon
          title={gateError}
          className="mb-3"
          data-testid="template-wizard-gate-error"
        />
      )}

      {/* ---- Setup ---- */}
      <div
        className={step === 0 ? '' : 'hidden'}
        data-testid="template-wizard-step-setup"
      >
        <Form form={form} layout="vertical" component={false}>
          <Form.Item
            name="name"
            label={label('pages.notifications.templates.wizard.name', 'Name')}
            rules={[
              {
                required: true,
                message: label(
                  'pages.notifications.templates.wizard.nameRequired',
                  'Name is required',
                ),
              },
            ]}
          >
            <Input maxLength={255} data-testid="template-wizard-name" />
          </Form.Item>
          <Form.Item
            name="notificationType"
            label={label(
              'pages.notifications.templates.wizard.notificationType',
              'Type',
            )}
            rules={[{ required: true }]}
          >
            <Select
              options={typeOptions}
              disabled={isEdit}
              data-testid="template-wizard-type"
            />
          </Form.Item>

          <div className="mb-2 flex items-baseline gap-3">
            <Typography.Text strong>
              {label(
                'pages.notifications.templates.wizard.deliveryMethods',
                'Delivery method',
              )}
            </Typography.Text>
            <Typography.Text type="secondary">
              {label(
                'pages.notifications.templates.wizard.atLeastOne',
                'At least one delivery method should be selected',
              )}
            </Typography.Text>
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_METHODS.map((method) => {
              const enabled = templateValue[method]?.enabled === true;
              return (
                <span
                  key={method}
                  className="inline-flex items-center gap-2 rounded-md border border-solid px-3 py-2"
                  data-testid={`template-method-toggle-${method}`}
                >
                  <Switch
                    size="small"
                    checked={enabled}
                    onChange={(checked) =>
                      setTemplateValue((previous) =>
                        withMethodEnabled(previous, method, checked),
                      )
                    }
                  />
                  <Typography.Text>
                    {formatMessage({
                      id: METHOD_NAME_KEYS[method],
                      defaultMessage: method,
                    })}
                  </Typography.Text>
                </span>
              );
            })}
          </div>
        </Form>
      </div>

      {/* ---- Compose ---- */}
      <div
        className={step === 1 ? '' : 'hidden'}
        data-testid="template-wizard-step-compose"
      >
        <TemplateConfiguration
          value={templateValue}
          onChange={setTemplateValue}
          notificationType={activeType}
          enabledMethods={enabledMethodsOf(templateValue)}
        />
      </div>
    </Modal>
  );
}
