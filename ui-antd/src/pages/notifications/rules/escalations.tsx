/**
 * Escalation-chain editor for ALARM rules (M12 wave 3-B, spec §4.5; ui-ngx
 * escalations + escalation-form parity). Controlled Form control: the value
 * is the wire `escalationTable` (seconds → target ids).
 *
 * First stage is fixed at 0 seconds (immediately); later stages use a
 * number + unit (minutes/hours/days) delay picker bounded to 1 minute…7 days.
 * Each row carries its own targets picker with the inline create-new entry.
 */
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, InputNumber, Select, Typography } from 'antd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { NotificationType } from '@/types/tb/notification';
import type { DelayUnit, EscalationRow } from './escalations-logic';
import {
  DEFAULT_STAGE_DELAY_SEC,
  delaySecToPicker,
  escalationEntryIsValid,
  escalationTableToRows,
  pickerToDelaySec,
  rowsToEscalationTable,
} from './escalations-logic';
import { TargetPickerWithCreate } from './rule-target-picker';

const MAX_PICKER_VALUE: Record<DelayUnit, number> = {
  minutes: 7 * 24 * 60,
  hours: 7 * 24,
  days: 7,
};

const UNIT_OPTIONS: Array<{ value: DelayUnit; labelKey: string }> = [
  {
    value: 'minutes',
    labelKey: 'pages.notifications.rules.escalation.unit.minutes',
  },
  {
    value: 'hours',
    labelKey: 'pages.notifications.rules.escalation.unit.hours',
  },
  { value: 'days', labelKey: 'pages.notifications.rules.escalation.unit.days' },
];

export interface EscalationsEditorProps {
  value?: Record<string, Array<string>>;
  onChange?: (value: Record<string, Array<string>>) => void;
  disabled?: boolean;
}

interface PickerState {
  value: number;
  unit: DelayUnit;
}

export default function EscalationsEditor({
  value,
  onChange,
  disabled,
}: EscalationsEditorProps) {
  const { formatMessage } = useIntl();
  const rows = useMemo(() => escalationTableToRows(value), [value]);

  // Stable per-row keys: the wire table has no identity, so mint an id per
  // visible row and re-mint the whole set only when the row count changes
  // (add/remove) — NOT when a delay changes (that would remount the input
  // mid-typing).
  const rowIdsRef = useRef<Array<number>>([]);
  const nextRowIdRef = useRef(0);
  if (rowIdsRef.current.length !== rows.length) {
    rowIdsRef.current = rows.map(() => {
      nextRowIdRef.current += 1;
      return nextRowIdRef.current;
    });
  }
  const rowIds = rowIdsRef.current;

  // Per-row delay picker state (value + unit). Re-seeded whenever the wire
  // value changes underneath (edit prefill, add/remove row re-emits).
  const [pickers, setPickers] = useState<Record<number, PickerState>>({});
  // biome-ignore lint/correctness/useExhaustiveDependencies: re-seed only when the wire value changes underneath
  useEffect(() => {
    setPickers(
      Object.fromEntries(
        rows.map((row, index) => [index, delaySecToPicker(row.delayInSec)]),
      ),
    );
  }, [value]);

  const label = (id: string, defaultMessage: string) =>
    formatMessage({ id, defaultMessage });

  const emit = (next: Array<EscalationRow>) => {
    onChange?.(rowsToEscalationTable(next));
  };

  const updateRow = (index: number, patch: Partial<EscalationRow>) => {
    emit(rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const updateDelay = (index: number, sec: number) => {
    updateRow(index, { delayInSec: sec });
  };

  const updatePicker = (index: number, next: PickerState) => {
    setPickers((previous) => ({ ...previous, [index]: next }));
    updateDelay(index, pickerToDelaySec(next.value, next.unit));
  };

  const removeRow = (index: number) => {
    emit(rows.filter((_, i) => i !== index));
  };

  const addStage = () => {
    emit([...rows, { delayInSec: DEFAULT_STAGE_DELAY_SEC, targets: [] }]);
  };

  return (
    <div className="flex flex-col gap-2" data-testid="escalations-editor">
      {rows.map((row, index) => {
        const picker = pickers[index] ?? delaySecToPicker(row.delayInSec);
        const valid = escalationEntryIsValid(row.delayInSec, row.targets);
        return (
          <div
            key={rowIds[index]}
            className="flex flex-wrap items-center gap-2"
          >
            {index === 0 ? (
              <Typography.Text className="w-48 shrink-0">
                {label(
                  'pages.notifications.rules.escalation.firstRecipient',
                  'First recipients (immediately)',
                )}
              </Typography.Text>
            ) : (
              <div className="flex shrink-0 items-center gap-2">
                <Typography.Text>
                  {label('pages.notifications.rules.escalation.after', 'After')}
                </Typography.Text>
                <InputNumber
                  min={1}
                  max={MAX_PICKER_VALUE[picker.unit]}
                  step={1}
                  value={picker.value}
                  disabled={disabled}
                  onChange={(next) =>
                    updatePicker(index, { ...picker, value: next ?? 1 })
                  }
                  data-testid={`escalation-delay-${index}`}
                />
                <Select<DelayUnit>
                  className="w-28"
                  value={picker.unit}
                  disabled={disabled}
                  onChange={(unit) =>
                    updatePicker(index, { value: picker.value, unit })
                  }
                  options={UNIT_OPTIONS.map((option) => ({
                    value: option.value,
                    label: label(option.labelKey, option.value),
                  }))}
                  data-testid={`escalation-unit-${index}`}
                />
                <Typography.Text>
                  {label(
                    'pages.notifications.rules.escalation.notify',
                    'notify',
                  )}
                </Typography.Text>
              </div>
            )}
            <div className="min-w-64 flex-1">
              <TargetPickerWithCreate
                value={row.targets}
                onChange={(targets) => updateRow(index, { targets })}
                notificationType={NotificationType.ALARM}
                disabled={disabled}
                placeholder={label(
                  'pages.notifications.rules.escalation.searchTargets',
                  'Search recipients',
                )}
                createLabel={label(
                  'pages.notifications.rules.createNew',
                  'Create new',
                )}
              />
            </div>
            {index === 0 ? (
              <div className="w-8 shrink-0" />
            ) : (
              <Button
                type="text"
                size="small"
                danger
                disabled={disabled}
                icon={<DeleteOutlined />}
                title={label(
                  'pages.notifications.rules.escalation.remove',
                  'Remove',
                )}
                onClick={() => removeRow(index)}
              />
            )}
            {!valid && !disabled && (
              <Typography.Text type="danger" className="w-full">
                {label(
                  'pages.notifications.rules.escalation.stageInvalid',
                  'Every stage needs recipients; delays must be between 1 minute and 7 days.',
                )}
              </Typography.Text>
            )}
          </div>
        );
      })}
      {!disabled && (
        <Button
          type="primary"
          ghost
          icon={<PlusOutlined />}
          onClick={addStage}
          data-testid="escalation-add-stage"
        >
          {label('pages.notifications.rules.escalation.addStage', 'Add stage')}
        </Button>
      )}
    </div>
  );
}
