/**
 * WYSIWYG settings form for the preview (spec §5.4): the descriptor's
 * settingsForm schema rendered against the parsed `config.settings`, with
 * every edit merged back into the defaultConfig JSON STRING through a
 * single onChange (the shell routes it into the EditorSession — keep-string
 * discipline, never re-stored parsed).
 *
 * Deliberately OUTSIDE the runId-keyed subtree: editing a setting must not
 * remount the preview (no focus loss, no subscription reset) — the compiled
 * widget simply re-renders with fresh props.
 */

import { Typography } from 'antd';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { FormPropertyForm } from '@/components/form-property/FormPropertyForm';
import type { FormProperty } from '@/components/form-property/types';

export interface PreviewSettingsFormProps {
  settingsForm: FormProperty[];
  settings: Record<string, unknown>;
  onChange: (next: Record<string, unknown>) => void;
}

export function PreviewSettingsForm({
  settingsForm,
  settings,
  onChange,
}: PreviewSettingsFormProps) {
  const { formatMessage } = useIntl();
  // memoized — one formatMessage call per instance, not per render
  const title = useMemo(
    () =>
      formatMessage({
        id: 'editor.widget.editor.preview.settings',
        defaultMessage: 'Settings',
      }),
    [formatMessage],
  );
  if (settingsForm.length === 0) {
    return null;
  }
  return (
    <div
      data-testid="widget-preview-settings"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        borderTop: '1px solid var(--ant-color-border-secondary, transparent)',
        paddingTop: 8,
      }}
    >
      <Typography.Text type="secondary">{title}</Typography.Text>
      <FormPropertyForm
        properties={settingsForm}
        value={settings}
        onChange={onChange}
        jsonFallbackEnabled={false}
      />
    </div>
  );
}
