/**
 * Calculated-field edit dialog (M14 wave-4, R13 骨架, spec 6.1-4..7): name /
 * debugSettings / target entity / type switch + the configuration branch
 * (SIMPLE/SCRIPT configurators; wave-5 types render the placeholder).
 *
 * Locked-in contract details: entityId is an OBJECT and immutable after
 * creation (edit mode locks the picker, contract #20); SIMPLE↔SCRIPT
 * switches keep the configuration while any other transition resets it to
 * the target defaults (ngx setupTypeChange); debug settings default to
 * failures-ON. Save runs the testScript precheck for expression-carrying
 * types — an envelope error blocks the save inline, a TBEL-disabled 400
 * degrades to a warning (spec 6.6 enhancement).
 */
import { useMutation } from '@tanstack/react-query';
import { Alert, App, Form, Input, Modal, Select, Space } from 'antd';
import { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import {
  getLatestCalculatedFieldDebugEvent,
  saveCalculatedField,
  testCalculatedFieldScript,
} from '@/services/tb/calculated-fields';
import type {
  CalculatedField,
  CalculatedFieldConfiguration,
  CalculatedFieldDebugSettings,
  CalculatedFieldType,
} from '@/types/tb/calculated-fields';
import type { EntityId } from '@/types/tb/entity';
import { EntitySearchSelect } from './argument-panel';
import {
  buildTestScriptPayload,
  CF_PAGE_TYPES,
  CF_SUPPORTED_ENTITY_TYPES,
  CF_WAVE5_TYPES,
  type CfHostEntityType,
  configurationExpression,
  configurationProblems,
  deepTrim,
  defaultConfiguration,
  defaultDebugSettings,
  interpretPrecheckOutcome,
  migrateSimpleFamilyConfiguration,
  precheckRequired,
  prepareConfiguration,
  typeChangeClearsConfiguration,
} from './data';
import DebugSettingsButton from './debug-settings-button';
import PlaceholderConfiguration from './placeholder-configuration';
import SimpleConfiguration from './simple-configuration';
import CfTestDialog from './test-dialog';

export type CfDialogMode = 'create' | 'edit' | 'copy' | 'import';

export interface CfDialogProps {
  /** The row opening the dialog (idless for create/copy/import). */
  field: CalculatedField;
  mode: CfDialogMode;
  /** Import: the type select is locked (ngx disabledSelectType). */
  lockType?: boolean;
  tenantId: string;
  onClose: () => void;
  onSaved: (field: CalculatedField) => void;
}

interface CfDialogFormValues {
  name: string;
  entityId: EntityId | undefined;
  type: CalculatedFieldType;
}

const PROBLEM_MESSAGE_KEYS: Record<string, string> = {
  argumentsRequired: 'pages.calculatedFields.argumentsRequired',
  argumentsRollingInSimple: 'pages.calculatedFields.argumentsRollingInSimple',
  argumentsEntityNotFound: 'pages.calculatedFields.argumentsEntityNotFound',
  expressionRequired: 'pages.calculatedFields.expressionRequired',
  expressionMaxLength: 'pages.calculatedFields.expressionMaxLength',
  expressionPattern: 'pages.calculatedFields.expressionPattern',
  outputKeyRequired: 'pages.calculatedFields.outputKeyRequired',
  outputKeyPattern: 'pages.calculatedFields.outputKeyPattern',
};

export default function CfDialog({
  field: initialField,
  mode,
  lockType,
  tenantId,
  onClose,
  onSaved,
}: CfDialogProps) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const [form] = Form.useForm<CfDialogFormValues>();
  const [targetType, setTargetType] = useState<CfHostEntityType | undefined>(
    initialField.entityId?.entityType as CfHostEntityType | undefined,
  );

  const [configuration, setConfiguration] =
    useState<CalculatedFieldConfiguration>(() =>
      initialField.configuration?.type
        ? prepareConfiguration(initialField.configuration)
        : defaultConfiguration(initialField.type ?? 'SIMPLE'),
    );
  const [debugSettings, setDebugSettings] =
    useState<CalculatedFieldDebugSettings>(
      () => initialField.debugSettings ?? defaultDebugSettings(),
    );
  const [problems, setProblems] = useState<Array<string>>([]);
  const [precheckError, setPrecheckError] = useState('');
  const [precheckWarning, setPrecheckWarning] = useState('');
  const [testOpen, setTestOpen] = useState(false);
  const [testPrefill, setTestPrefill] = useState<Record<
    string,
    unknown
  > | null>(null);

  const type = Form.useWatch('type', form) ?? initialField.type;
  const isScript = type === 'SCRIPT';
  const isPlaceholder = CF_WAVE5_TYPES.includes(type);
  const editLocked = mode === 'edit';

  // Seed once per mount; the list page unmounts the dialog between opens,
  // so the open-time snapshot is the intended (and only) seed.
  // biome-ignore lint/correctness/useExhaustiveDependencies: mount-only form seeding from the open-time field snapshot
  useEffect(() => {
    form.setFieldsValue({
      name: initialField.name ?? '',
      entityId: initialField.entityId,
      type: initialField.type ?? 'SIMPLE',
    });
  }, [form]);

  const saveMutation = useMutation({
    mutationFn: (field: CalculatedField) => saveCalculatedField(field),
    onSuccess: (saved) => {
      void message.success(
        formatMessage({
          id: 'pages.calculatedFields.toastSaved',
          defaultMessage: 'Calculated field saved.',
        }),
      );
      onSaved(saved);
    },
    onError: (error) => {
      void message.error(serverErrorText(error));
    },
  });

  /** The SCRIPT test entry (R15): prefill from the latest debug event. */
  const openTestDialog = () => {
    const fetchPrefill = async () => {
      if (!initialField.id?.id) {
        setTestPrefill(null);
        return;
      }
      try {
        const event = await getLatestCalculatedFieldDebugEvent(
          initialField.id.id,
        );
        const raw = event?.arguments;
        if (typeof raw === 'string') {
          try {
            setTestPrefill(JSON.parse(raw) as Record<string, unknown>);
            return;
          } catch {
            // fall through to no prefill
          }
        }
        setTestPrefill(
          raw && typeof raw === 'object'
            ? (raw as Record<string, unknown>)
            : null,
        );
      } catch {
        setTestPrefill(null);
      }
    };
    void fetchPrefill();
    setTestOpen(true);
  };

  /**
   * Save-time testScript precheck (spec 6.1-10 / 6.6). Envelope `error`
   * blocks inline; the TBEL-disabled 400 degrades to a warning.
   */
  const runPrecheck = async (): Promise<boolean> => {
    setPrecheckError('');
    setPrecheckWarning('');
    const payload = buildTestScriptPayload(
      configurationExpression(configuration),
      configuration && 'arguments' in configuration
        ? (configuration.arguments ?? {})
        : {},
    );
    try {
      const envelope = await testCalculatedFieldScript(payload);
      const outcome = interpretPrecheckOutcome(envelope, null);
      if (!outcome.allowed) {
        setPrecheckError(outcome.error);
        return false;
      }
      if (outcome.warning) {
        setPrecheckWarning(outcome.warning ?? '');
      }
      return true;
    } catch (httpError) {
      const outcome = interpretPrecheckOutcome(null, httpError);
      if (!outcome.allowed) {
        setPrecheckError(outcome.error);
        return false;
      }
      setPrecheckWarning(outcome.warning ?? '');
      return true;
    }
  };

  const submit = async () => {
    setPrecheckError('');
    setPrecheckWarning('');
    try {
      const values = await form.validateFields();
      const nextProblems = configurationProblems(configuration, isScript).map(
        (problem) => PROBLEM_MESSAGE_KEYS[problem] ?? problem,
      );
      setProblems(nextProblems);
      if (nextProblems.length > 0) {
        return;
      }
      if (precheckRequired(type) && !(await runPrecheck())) {
        return;
      }
      const base: CalculatedField =
        mode === 'edit'
          ? initialField
          : (() => {
              const { id: _strippedId, ...rest } = initialField;
              return rest as CalculatedField;
            })();
      saveMutation.mutate(
        deepTrim({
          ...base,
          name: values.name,
          // validateFields' required rule guarantees presence.
          entityId: values.entityId as EntityId,
          type,
          debugSettings,
          configuration,
        }),
      );
    } catch {
      // antd validation failure — field errors are already rendered.
    }
  };

  const onTypeChange = (next: CalculatedFieldType) => {
    const previous = type;
    if (previous === next) {
      return;
    }
    if (typeChangeClearsConfiguration(previous, next)) {
      setConfiguration(defaultConfiguration(next));
      return;
    }
    // SIMPLE↔SCRIPT keeps the user's configuration (ngx setupTypeChange) —
    // but the wire discriminator must be re-stamped and a SCRIPT target
    // needs an expression (the ngx default script when coming from SIMPLE).
    setConfiguration((previousConfig) =>
      migrateSimpleFamilyConfiguration(previousConfig, next),
    );
  };

  return (
    <Modal
      open
      onCancel={onClose}
      width={860}
      maskClosable={false}
      confirmLoading={saveMutation.isPending}
      onOk={() => void submit()}
      okText={formatMessage({
        id:
          mode === 'edit'
            ? 'pages.calculatedFields.apply'
            : 'pages.calculatedFields.add',
        defaultMessage: mode === 'edit' ? 'Apply' : 'Add',
      })}
      okButtonProps={{ disabled: isPlaceholder }}
      cancelText={formatMessage({
        id: 'pages.calculatedFields.cancel',
        defaultMessage: 'Cancel',
      })}
      title={formatMessage(
        {
          id:
            mode === 'edit'
              ? 'pages.calculatedFields.editTitle'
              : mode === 'import'
                ? 'pages.calculatedFields.importTitle'
                : 'pages.calculatedFields.addTitle',
          defaultMessage:
            mode === 'edit' ? 'Edit calculated field' : 'Add calculated field',
        },
        { name: initialField.name },
      )}
    >
      <Form<CfDialogFormValues> form={form} layout="vertical">
        <Form.Item
          name="name"
          label={formatMessage({
            id: 'pages.calculatedFields.name',
            defaultMessage: 'Name',
          })}
          rules={[
            {
              required: true,
              whitespace: true,
              message: formatMessage({
                id: 'pages.calculatedFields.nameRequired',
                defaultMessage: 'Name is required.',
              }),
            },
            {
              max: 255,
              message: formatMessage({
                id: 'pages.calculatedFields.nameMaxLength',
                defaultMessage: 'Name should be less than 256 characters.',
              }),
            },
          ]}
        >
          <Input />
        </Form.Item>

        <Form.Item
          label={formatMessage({
            id: 'pages.calculatedFields.targetEntity',
            defaultMessage: 'Target entity',
          })}
          required
          extra={
            editLocked
              ? formatMessage({
                  id: 'pages.calculatedFields.targetEntityLocked',
                  defaultMessage:
                    'The target entity cannot be changed after creation — delete and recreate the field to move it.',
                })
              : undefined
          }
        >
          <Space.Compact className="w-full">
            <Select
              className="w-44"
              value={targetType}
              disabled={editLocked}
              placeholder={formatMessage({
                id: 'pages.calculatedFields.targetEntityType',
                defaultMessage: 'Entity type',
              })}
              options={CF_SUPPORTED_ENTITY_TYPES.map((option) => ({
                value: option,
                label: formatMessage({
                  id: `pages.calculatedFields.entityType.${option}`,
                  defaultMessage: option,
                }),
              }))}
              onChange={(next) => {
                // Switching the host type invalidates the chosen entity.
                setTargetType(next);
                form.setFieldValue('entityId', undefined);
              }}
            />
            {targetType && (
              <Form.Item
                name="entityId"
                noStyle
                rules={[
                  {
                    required: true,
                    message: formatMessage({
                      id: 'pages.calculatedFields.targetEntityRequired',
                      defaultMessage: 'Target entity is required.',
                    }),
                  },
                ]}
              >
                <EntitySearchSelect
                  entityType={targetType}
                  disabled={editLocked}
                />
              </Form.Item>
            )}
          </Space.Compact>
        </Form.Item>

        <Space wrap align="start" className="w-full">
          <Form.Item
            name="type"
            label={formatMessage({
              id: 'pages.calculatedFields.type',
              defaultMessage: 'Type',
            })}
            className="min-w-64"
            extra={
              isPlaceholder
                ? formatMessage({
                    id: 'pages.calculatedFields.placeholderHint',
                    defaultMessage:
                      'Saving is disabled until the full editor ships.',
                  })
                : undefined
            }
          >
            <Select
              disabled={lockType}
              options={CF_PAGE_TYPES.map((option) => ({
                value: option,
                label: formatMessage({
                  id: `pages.calculatedFields.type.${option}`,
                  defaultMessage: option,
                }),
              }))}
              onChange={onTypeChange}
            />
          </Form.Item>
          <Form.Item
            label={formatMessage({
              id: 'pages.calculatedFields.debugSettings',
              defaultMessage: 'Debug settings',
            })}
          >
            <DebugSettingsButton
              value={debugSettings}
              onChange={setDebugSettings}
            />
          </Form.Item>
        </Space>
      </Form>

      {precheckError && (
        <Alert
          type="error"
          showIcon
          className="mb-3"
          message={formatMessage({
            id: 'pages.calculatedFields.precheckBlocked',
            defaultMessage:
              'The expression failed the pre-check — fix it before saving.',
          })}
          description={precheckError}
          data-testid="cf-precheck-error"
        />
      )}
      {precheckWarning && (
        <Alert
          type="warning"
          showIcon
          className="mb-3"
          message={formatMessage({
            id: 'pages.calculatedFields.precheckDegraded',
            defaultMessage:
              'The pre-check could not run (TBEL script engine disabled) — the field is saved without validation.',
          })}
          description={precheckWarning}
        />
      )}
      {problems.length > 0 && (
        <Alert
          type="error"
          showIcon
          className="mb-3"
          message={formatMessage({
            id: 'pages.calculatedFields.fixProblems',
            defaultMessage: 'Fix the highlighted problems before saving.',
          })}
        />
      )}

      {isPlaceholder ? (
        <PlaceholderConfiguration />
      ) : (
        <SimpleConfiguration
          value={configuration}
          onChange={setConfiguration}
          isScript={isScript}
          hostEntityType={targetType}
          tenantId={tenantId}
          onTest={openTestDialog}
        />
      )}

      {testOpen && (
        <CfTestDialog
          open
          expression={configurationExpression(configuration)}
          args={
            configuration && 'arguments' in configuration
              ? (configuration.arguments ?? {})
              : {}
          }
          prefill={testPrefill}
          onRun={testCalculatedFieldScript}
          onClose={() => setTestOpen(false)}
          onSave={(expression) => {
            setConfiguration(
              (previous) =>
                ({ ...previous, expression }) as CalculatedFieldConfiguration,
            );
            setTestOpen(false);
          }}
        />
      )}
    </Modal>
  );
}
