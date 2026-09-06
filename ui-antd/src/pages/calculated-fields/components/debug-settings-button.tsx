/**
 * Debug-settings controls (M14 wave-4, R13 底座; ui-ngx
 * tb-entity-debug-settings-button parity): a Form.Item-compatible button
 * + popover for the edit dialog, and a bare panel reused by the list's
 * debug-settings modal. Defaults to failures-ON (ngx updateForm fallback).
 */
import { BugOutlined } from '@ant-design/icons';
import { Button, Popover, Space, Switch, Typography } from 'antd';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import type { CalculatedFieldDebugSettings } from '@/types/tb/calculated-fields';
import { defaultDebugSettings } from './data';

/** The two switches + hint, shared by the popover and the list modal. */
export function DebugSettingsPanel({
  value,
  onChange,
  disabled,
}: {
  value: CalculatedFieldDebugSettings;
  onChange: (value: CalculatedFieldDebugSettings) => void;
  disabled?: boolean;
}) {
  const { formatMessage } = useIntl();
  return (
    <div className="flex w-72 flex-col gap-3">
      <Space className="justify-between">
        <Typography.Text>
          {formatMessage({
            id: 'pages.calculatedFields.debugFailures',
            defaultMessage: 'Debug failures',
          })}
        </Typography.Text>
        <Switch
          checked={value.failuresEnabled === true}
          disabled={disabled || value.allEnabled === true}
          onChange={(checked) =>
            onChange({ ...value, failuresEnabled: checked })
          }
        />
      </Space>
      <Space className="justify-between">
        <Typography.Text>
          {formatMessage({
            id: 'pages.calculatedFields.debugAll',
            defaultMessage: 'Debug all',
          })}
        </Typography.Text>
        <Switch
          checked={value.allEnabled === true}
          disabled={disabled}
          onChange={(checked) =>
            onChange({ ...value, allEnabled: checked, failuresEnabled: true })
          }
        />
      </Space>
      <Typography.Text type="secondary">
        {formatMessage({
          id: 'pages.calculatedFields.debugSettingsHint',
          defaultMessage:
            'Debug events appear under the Events row action while debugging is on.',
        })}
      </Typography.Text>
    </div>
  );
}

export interface DebugSettingsButtonProps {
  value?: CalculatedFieldDebugSettings;
  onChange?: (value: CalculatedFieldDebugSettings) => void;
  disabled?: boolean;
}

export default function DebugSettingsButton({
  value,
  onChange,
  disabled,
}: DebugSettingsButtonProps) {
  const { formatMessage } = useIntl();
  const [open, setOpen] = useState(false);
  const settings = value ?? defaultDebugSettings();

  const active = settings.allEnabled || settings.failuresEnabled;

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger="click"
      placement="bottom"
      content={
        <DebugSettingsPanel
          value={settings}
          onChange={(next) => onChange?.(next)}
          disabled={disabled}
        />
      }
    >
      <Button
        icon={<BugOutlined />}
        disabled={disabled}
        danger={settings.allEnabled === true}
        type={active ? 'default' : 'text'}
      >
        {formatMessage({
          id: 'pages.calculatedFields.debugSettings',
          defaultMessage: 'Debug settings',
        })}
      </Button>
    </Popover>
  );
}
