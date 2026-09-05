/**
 * Notification rule create/edit wizard (M12 wave 3-B, spec §4.5; ui-ngx
 * rule-notification-dialog parity).
 *
 * Two steps in one Modal (ngx step structure):
 *   1. Basic settings — name / enabled / triggerType (locked when editing) /
 *      template (filtered by the same-name NotificationType) + the recipients
 *      fork: plain targets for non-ALARM, the escalation chain (+ clearRule
 *      gate) for ALARM.
 *   2. Trigger settings — the 14 trigger-config forms + the
 *      additionalConfig.description textarea.
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
} from 'antd';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';

import { serverErrorText } from '@/components/entities/server-error-text';
import { RecipientEntitySelect } from '@/components/notifications/recipient-entity-select';
import { useAuthority } from '@/components/shared/use-authority';
import {
  getNotificationTemplateById,
  getNotificationTemplates,
  saveNotificationRule,
} from '@/services/tb/notification';
import {
  type NotificationRuleInfo,
  NotificationRuleTriggerType,
} from '@/types/tb/notification';

import EscalationsEditor from './escalations';
import {
  escalationTableIsValid,
  clearRuleEnabled as hasMultipleStages,
} from './escalations-logic';
import {
  defaultTriggerTypeFor,
  TRIGGER_TO_NOTIFICATION_TYPE,
  triggerNameKey,
  triggerTypesForAuthority,
} from './rule-meta';
import type { BasicFormValues, TriggerFormValues } from './rule-submit';
import { buildRulePayload, triggerConfigToFormValues } from './rule-submit';
import { TargetPickerWithCreate } from './rule-target-picker';
import { TRIGGER_FORM_DEFAULTS, TriggerSettingsBody } from './trigger-forms';

export interface RuleWizardProps {
  open: boolean;
  /** Edit source; null = create. */
  source?: NotificationRuleInfo | null;
  /** Copy mode: prefill from source but save as a new rule (name + " (copy)"). */
  copy?: boolean;
  onClose: () => void;
  /** Fired after a successful save (caller invalidates + closes). */
  onSaved: () => void;
}

const TEMPLATE_PICKER_SORT = {
  pageSize: 50,
  page: 0,
  sortOrder: { property: 'name', direction: 'ASC' as const },
};

export default function RuleWizard({
  open,
  source,
  copy,
  onClose,
  onSaved,
}: RuleWizardProps) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const { authority } = useAuthority();
  const isSysAdmin = authority === 'SYS_ADMIN';
  const isEdit = !!source && !copy;

  const [basicForm] = Form.useForm<BasicFormValues>();
  const [triggerForm] = Form.useForm<TriggerFormValues>();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState<string>();

  const label = (id: string, defaultMessage: string) =>
    formatMessage({ id, defaultMessage });

  const activeTriggerType =
    Form.useWatch('triggerType', basicForm) ??
    (source ? source.triggerType : defaultTriggerTypeFor(isSysAdmin));
  const escalationsValue = Form.useWatch('escalations', basicForm);
  const clearRuleAllowed = hasMultipleStages(escalationsValue);

  // ---- template candidates (filtered by the trigger's notification type);
  // the picker select below fetches per keystroke, this query keeps the
  // candidate list warm for the active trigger type.
  const notificationType = TRIGGER_TO_NOTIFICATION_TYPE[activeTriggerType];

  // ---- seed on open
  // biome-ignore lint/correctness/useExhaustiveDependencies: seed-on-open by design
  useEffect(() => {
    if (!open) {
      return;
    }
    setErrorText(undefined);
    setStep(0);
    setSaving(false);
    basicForm.resetFields();
    triggerForm.resetFields();
    if (source) {
      const isAlarm = source.triggerType === NotificationRuleTriggerType.ALARM;
      const recipients = source.recipientsConfig;
      basicForm.setFieldsValue({
        name: copy ? `${source.name} (copy)` : source.name,
        enabled: source.enabled,
        triggerType: source.triggerType,
        templateId: source.templateId?.id,
        targets: isAlarm
          ? undefined
          : (recipients as { targets?: Array<string> }).targets,
        escalations: isAlarm
          ? (recipients as { escalationTable?: Record<string, Array<string>> })
              .escalationTable
          : { 0: [] },
      });
      triggerForm.setFieldsValue({
        ...triggerConfigToFormValues(source.triggerType, source.triggerConfig),
        description: source.additionalConfig?.description ?? '',
      });
    } else {
      const defaultType = defaultTriggerTypeFor(isSysAdmin);
      basicForm.setFieldsValue({
        name: '',
        enabled: true,
        triggerType: defaultType,
        templateId: undefined,
        targets: [],
        escalations:
          defaultType === NotificationRuleTriggerType.ALARM
            ? { 0: [] }
            : undefined,
      });
      triggerForm.setFieldsValue(TRIGGER_FORM_DEFAULTS[defaultType]);
    }
  }, [open, source, copy, isSysAdmin]);

  const onTriggerTypeChange = (next: NotificationRuleTriggerType) => {
    // ngx resets the template when the trigger type changes (the candidate
    // set moves) and swaps in the fresh trigger form defaults.
    basicForm.setFieldsValue({ templateId: undefined });
    triggerForm.resetFields();
    triggerForm.setFieldsValue(TRIGGER_FORM_DEFAULTS[next]);
  };

  const goNext = async () => {
    try {
      await basicForm.validateFields();
      setErrorText(undefined);
      setStep(1);
    } catch {
      // Inline field errors render next to the fields.
    }
  };

  const goBack = () => setStep(0);

  const submit = async () => {
    // Both step forms stay mounted (inactive one hidden) so validateFields
    // sees every registered field; jump back to the first invalid step.
    let basic: BasicFormValues;
    let trigger: TriggerFormValues;
    try {
      await basicForm.validateFields();
      basic = basicForm.getFieldsValue(true);
    } catch {
      setStep(0);
      return;
    }
    try {
      await triggerForm.validateFields();
      trigger = triggerForm.getFieldsValue(true);
    } catch {
      setStep(1);
      return;
    }
    setSaving(true);
    try {
      await saveNotificationRule(
        buildRulePayload({
          basic,
          trigger,
          source: source ?? null,
          isCopy: !!copy,
        }),
      );
      void message.success(
        label('pages.notifications.rules.wizard.toastSaved', 'Rule saved.'),
      );
      onSaved();
    } catch (error) {
      setErrorText(serverErrorText(error));
    } finally {
      setSaving(false);
    }
  };

  const stepItems = [
    {
      title: label(
        'pages.notifications.rules.wizard.stepBasic',
        'Basic settings',
      ),
    },
    {
      title: label(
        'pages.notifications.rules.wizard.stepTrigger',
        'Trigger settings',
      ),
    },
  ];

  const triggerTypeOptions = triggerTypesForAuthority(isSysAdmin).map(
    (type) => ({
      value: type,
      label: formatMessage({
        id: triggerNameKey(type),
        defaultMessage: type,
      }),
    }),
  );

  return (
    <Modal
      open={open}
      title={
        isEdit
          ? label('pages.notifications.rules.wizard.editTitle', 'Edit rule')
          : label('pages.notifications.rules.wizard.addTitle', 'Add rule')
      }
      width={760}
      footer={null}
      destroyOnHidden
      mask={{ closable: false }}
      onCancel={onClose}
      data-testid="rule-wizard"
    >
      <Steps size="small" current={step} items={stepItems} className="mb-6" />
      {errorText && (
        <Alert
          className="mb-4"
          type="error"
          showIcon
          title={errorText}
          data-testid="rule-wizard-error"
        />
      )}

      {/* Steps stay mounted (inactive hidden) so cross-step validation and
          preserved values survive step navigation. */}
      <div style={{ display: step === 0 ? undefined : 'none' }}>
        <Form form={basicForm} layout="vertical">
          <Form.Item
            name="name"
            label={label('pages.notifications.rules.wizard.name', 'Name')}
            rules={[
              {
                required: true,
                message: label(
                  'pages.notifications.rules.wizard.nameRequired',
                  'Name is required',
                ),
              },
            ]}
          >
            <Input maxLength={255} data-testid="rule-wizard-name" />
          </Form.Item>
          <Form.Item name="enabled" valuePropName="checked">
            <Switch data-testid="rule-wizard-enabled" />
          </Form.Item>
          <Form.Item
            name="triggerType"
            label={label(
              'pages.notifications.rules.wizard.triggerType',
              'Trigger',
            )}
            rules={[{ required: true }]}
          >
            <Select
              options={triggerTypeOptions}
              disabled={isEdit}
              onChange={onTriggerTypeChange}
              data-testid="rule-wizard-trigger-type"
            />
          </Form.Item>
          <Form.Item
            name="templateId"
            label={label(
              'pages.notifications.rules.wizard.template',
              'Template',
            )}
            rules={[
              {
                required: true,
                message: label(
                  'pages.notifications.rules.wizard.templateRequired',
                  'Template is required',
                ),
              },
            ]}
          >
            <RecipientEntitySelect
              queryKey={[
                'notifications',
                'rules',
                'template-picker',
                notificationType,
              ]}
              fetchPage={(textSearch) =>
                getNotificationTemplates(
                  {
                    ...TEMPLATE_PICKER_SORT,
                    textSearch: textSearch || undefined,
                  },
                  [notificationType],
                )
              }
              toOption={(template) => ({
                label: template.name,
                value: template.id.id,
              })}
              resolveOne={async (id) => {
                const template = await getNotificationTemplateById(id);
                return { label: template.name, value: id };
              }}
              placeholder={label(
                'pages.notifications.rules.wizard.searchTemplate',
                'Search templates',
              )}
              data-testid="rule-wizard-template"
            />
          </Form.Item>

          {activeTriggerType === NotificationRuleTriggerType.ALARM ? (
            <fieldset className="rounded border-0 border-solid border-neutral-200 pb-2 dark:border-neutral-700">
              <legend className="mb-2 text-sm text-neutral-500">
                {label(
                  'pages.notifications.rules.wizard.escalationChain',
                  'Escalation chain',
                )}
              </legend>
              <Form.Item
                name="escalations"
                rules={[
                  {
                    validator: (_rule, value: Record<string, Array<string>>) =>
                      escalationTableIsValid(value)
                        ? Promise.resolve()
                        : Promise.reject(
                            new Error(
                              label(
                                'pages.notifications.rules.wizard.escalationsRequired',
                                'Every stage needs recipients; delays must be between 1 minute and 7 days.',
                              ),
                            ),
                          ),
                  },
                ]}
              >
                <EscalationsEditor />
              </Form.Item>
            </fieldset>
          ) : (
            <Form.Item
              name="targets"
              label={label(
                'pages.notifications.rules.wizard.recipients',
                'Recipients',
              )}
              rules={[
                {
                  required: true,
                  message: label(
                    'pages.notifications.rules.wizard.recipientsRequired',
                    'Recipients is required',
                  ),
                },
              ]}
            >
              <TargetPickerWithCreate
                notificationType={notificationType}
                placeholder={label(
                  'pages.notifications.rules.wizard.searchTargets',
                  'Search recipients',
                )}
                createLabel={label(
                  'pages.notifications.rules.wizard.createRecipient',
                  'Create new recipient',
                )}
              />
            </Form.Item>
          )}
        </Form>
      </div>

      <div style={{ display: step === 1 ? undefined : 'none' }}>
        <Form form={triggerForm} layout="vertical">
          <TriggerSettingsBody
            triggerType={activeTriggerType}
            clearRuleEnabled={clearRuleAllowed}
          />
        </Form>
      </div>

      <div className="mt-6 flex items-center gap-2">
        {step > 0 && (
          <Button onClick={goBack} data-testid="rule-wizard-back">
            {label('pages.notifications.rules.wizard.back', 'Back')}
          </Button>
        )}
        <div className="flex-1" />
        {step === 0 ? (
          <Button
            type="primary"
            onClick={() => void goNext()}
            data-testid="rule-wizard-next"
          >
            {label('pages.notifications.rules.wizard.next', 'Next')}
          </Button>
        ) : (
          <Button
            type="primary"
            loading={saving}
            onClick={() => void submit()}
            data-testid="rule-wizard-submit"
          >
            {isEdit
              ? label('pages.notifications.rules.wizard.save', 'Save')
              : label('pages.notifications.rules.wizard.add', 'Add')}
          </Button>
        )}
      </div>
    </Modal>
  );
}
