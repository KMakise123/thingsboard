/**
 * Settings-card shell shared by the settings pages (ui-ngx settings-card
 * parity): a titled card whose body is one form, with the per-card
 * undo/save footer — each settings bucket saves independently, exactly
 * like ui-ngx (general page has two such cards; mail and 2fa one each).
 *
 * `dirty` is owned by the page (a form onValuesChange flag): undo resets
 * the form to the server snapshot, save posts it.
 */
import { Button, Card } from 'antd';
import type { ReactNode } from 'react';
import { useIntl } from 'react-intl';

export interface SettingsCardProps {
  title: string;
  loading?: boolean;
  dirty?: boolean;
  invalid?: boolean;
  saving?: boolean;
  onUndo: () => void;
  onSave: () => void;
  children: ReactNode;
}

export default function SettingsCard({
  title,
  loading = false,
  dirty = false,
  invalid = false,
  saving = false,
  onUndo,
  onSave,
  children,
}: SettingsCardProps) {
  const { formatMessage } = useIntl();
  return (
    <Card title={title} loading={loading}>
      {children}
      <div className="mt-4 flex items-center justify-end gap-2">
        <Button disabled={!dirty || saving} onClick={onUndo}>
          {formatMessage({
            id: 'pages.settings.common.undo',
            defaultMessage: 'Undo',
          })}
        </Button>
        <Button
          type="primary"
          loading={saving}
          disabled={loading || invalid || !dirty}
          onClick={onSave}
        >
          {formatMessage({
            id: 'pages.settings.common.save',
            defaultMessage: 'Save',
          })}
        </Button>
      </div>
    </Card>
  );
}
