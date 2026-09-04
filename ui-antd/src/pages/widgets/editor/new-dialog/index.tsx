/**
 * NewWidgetDialog — create-entry dialog of the widget editor (M9 brief §3
 * wave S item 9). FROZEN CONTRACT for wave-3 D: registered in the shell
 * DialogHost under the id `new`, and rendered directly by the create route
 * (/widgets/editor). D fills the five React starter templates
 * (latest-values / timeseries / rpc / alarm / static — the ui-ngx
 * select-widget-type buckets) and delivers the starter draft through
 * onConfirm, WITHOUT changing the payload signature.
 *
 * The placeholder lists the five buckets as an honest skeleton with the
 * confirm disabled (no template exists to deliver yet).
 */

import { Modal, Radio, Typography } from 'antd';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import type { WidgetEditorDialogProps } from '../dialog-host';
import type { WidgetEditorDoc } from '../draft-convert';

/** The five upstream create buckets (ui-ngx select-widget-type-dialog). */
export type WidgetStarterKind =
  | 'latest'
  | 'timeseries'
  | 'rpc'
  | 'alarm'
  | 'static';

export interface NewWidgetDialogPayload {
  /** delivers the starter draft built from the picked template (D). */
  onConfirm: (draft: WidgetEditorDoc) => void;
}

const STARTER_KINDS: Array<{
  kind: WidgetStarterKind;
  labelId: string;
  defaultMessage: string;
}> = [
  {
    kind: 'latest',
    labelId: 'editor.widget.editor.kind.latest',
    defaultMessage: 'Latest values',
  },
  {
    kind: 'timeseries',
    labelId: 'editor.widget.editor.kind.timeseries',
    defaultMessage: 'Timeseries',
  },
  {
    kind: 'rpc',
    labelId: 'editor.widget.editor.kind.rpc',
    defaultMessage: 'Control (RPC)',
  },
  {
    kind: 'alarm',
    labelId: 'editor.widget.editor.kind.alarm',
    defaultMessage: 'Alarm',
  },
  {
    kind: 'static',
    labelId: 'editor.widget.editor.kind.static',
    defaultMessage: 'Static',
  },
];

export function NewWidgetDialog({ open, onClose }: WidgetEditorDialogProps) {
  const { formatMessage } = useIntl();
  const [kind, setKind] = useState<WidgetStarterKind>('latest');

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'editor.widget.editor.dialog.new.title',
        defaultMessage: 'New widget',
      })}
      onCancel={onClose}
      // no footer confirm yet: wave-3 D wires the starter templates
      okButtonProps={{ disabled: true }}
      okText={formatMessage({
        id: 'editor.common.save',
        defaultMessage: 'Save',
      })}
      data-testid="widget-new-dialog"
    >
      <Radio.Group
        value={kind}
        onChange={(event) => setKind(event.target.value)}
        data-testid="widget-new-kind"
      >
        {STARTER_KINDS.map((entry) => (
          <Radio key={entry.kind} value={entry.kind}>
            {formatMessage({
              id: entry.labelId,
              defaultMessage: entry.defaultMessage,
            })}
          </Radio>
        ))}
      </Radio.Group>
      <Typography.Paragraph type="secondary" style={{ marginTop: 12 }}>
        {formatMessage({
          id: 'editor.widget.editor.dialog.new.pending',
          defaultMessage: 'The starter-template picker will be provided here.',
        })}
      </Typography.Paragraph>
    </Modal>
  );
}
