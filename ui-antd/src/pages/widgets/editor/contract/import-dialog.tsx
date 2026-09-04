/**
 * ImportWidgetDialog — confirm step of the widget-type import (spec §5.7).
 * Registered in the DialogHost under the id `import` (added by wave-3 D —
 * the only host change). The file is parsed by import-export.ts BEFORE the
 * dialog opens, so this component only presents the decision:
 *
 *  - react-1: shows the type summary and replaces the current draft with
 *    the imported doc through `onConfirm` (the shell commits it as ONE
 *    undoable transaction group — nothing reaches the server until save).
 *  - Angular (P9): ALLOWED IN (ADR 0004 — refusing would strand the
 *    dashboards referencing it), badged 非 react-1, with the honest
 *    placeholder explanation; the action here is a VERBATIM server copy
 *    (`saveImportedAngularCopy` posts the descriptor untouched). The
 *    current draft is NOT replaced (the shell cannot edit Angular source).
 */

import { App, Badge, Button, Modal, Space, Typography } from 'antd';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import type { WidgetTypeDetails } from '@/types/tb/widget-type';
import type { WidgetEditorDialogProps } from '../dialog-host';
import type { WidgetEditorDoc } from '../draft-convert';
import type { WidgetImport } from '../import-export';
import { saveImportedAngularCopy } from '../import-export';

export interface ImportWidgetDialogPayload {
  /** the parsed file (already validated by import-export). */
  result: WidgetImport;
  /** react-1 only: delivers the imported doc (one undoable draft group). */
  onConfirm: (doc: WidgetEditorDoc) => void;
}

export function ImportWidgetDialog({
  open,
  payload,
  onClose,
}: WidgetEditorDialogProps) {
  const { formatMessage } = useIntl();
  const { message } = App.useApp();
  const typed = payload as ImportWidgetDialogPayload | undefined;
  const [savingCopy, setSavingCopy] = useState(false);

  const source: WidgetTypeDetails | undefined = typed?.result.source;
  const isReact = typed?.result.kind === 'react-1';

  const saveCopy = async () => {
    if (!source) {
      return;
    }
    setSavingCopy(true);
    try {
      await saveImportedAngularCopy(source);
      message.success(
        formatMessage({
          id: 'editor.widget.io.importCopySaved',
          defaultMessage: 'Server copy saved.',
        }),
      );
      onClose();
    } catch (error) {
      console.error('[widget import] verbatim copy failed', error);
      message.error(
        `${formatMessage({
          id: 'editor.widget.io.importCopyFailed',
          defaultMessage: 'Saving the copy failed',
        })}: ${serverErrorText(error)}`,
      );
    } finally {
      setSavingCopy(false);
    }
  };

  if (!typed || !source) {
    return null;
  }

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'editor.widget.io.importTitle',
        defaultMessage: 'Import widget type',
      })}
      footer={null}
      onCancel={onClose}
      destroyOnHidden
      data-testid="widget-import-dialog"
    >
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <div data-testid="widget-import-source">
          <Typography.Text type="secondary">
            {formatMessage({
              id: 'editor.widget.io.importSource',
              defaultMessage: 'Type in the file',
            })}
            {': '}
          </Typography.Text>
          <Typography.Text strong>{source.name}</Typography.Text>{' '}
          {source.fqn ? (
            <Typography.Text type="secondary">({source.fqn})</Typography.Text>
          ) : null}
        </div>

        {isReact ? (
          <>
            <Typography.Paragraph type="warning" style={{ marginBottom: 0 }}>
              {formatMessage({
                id: 'editor.widget.io.importReplace',
                defaultMessage:
                  'Importing replaces the current draft (one undoable group); nothing reaches the server until you save.',
              })}
            </Typography.Paragraph>
            <Button
              type="primary"
              data-testid="widget-import-confirm"
              onClick={() => {
                if (typed.result.kind === 'react-1') {
                  typed.onConfirm(typed.result.doc);
                  onClose();
                }
              }}
            >
              {formatMessage({
                id: 'editor.widget.io.importConfirm',
                defaultMessage: 'Import and replace draft',
              })}
            </Button>
          </>
        ) : (
          <>
            <div>
              <Badge
                status="warning"
                text={
                  <Typography.Text type="warning" strong>
                    {formatMessage({
                      id: 'editor.widget.io.importAngularBadge',
                      defaultMessage: 'Angular (not react-1)',
                    })}
                  </Typography.Text>
                }
              />
            </div>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {formatMessage({
                id: 'editor.widget.io.importAngularText',
                defaultMessage:
                  'This file is an Angular widget: its source cannot be opened here.',
              })}
            </Typography.Paragraph>
            <Button
              data-testid="widget-import-save-copy"
              loading={savingCopy}
              onClick={() => void saveCopy()}
            >
              {formatMessage({
                id: 'editor.widget.io.importSaveCopy',
                defaultMessage: 'Save as server copy',
              })}
            </Button>
          </>
        )}
      </Space>
    </Modal>
  );
}
