/**
 * NoteEditDialog — sticky note create/edit (ui-ngx add-note-dialog +
 * rule-note-editor parity): markdown content, background color, border
 * color/width, apply-default-markdown-style switch and the namespaced
 * custom CSS fragment. Defaults follow the ui-ngx note constants
 * (#FFF9C4 background, 1px border, default markdown style on).
 *
 * Collects only: the shell commits addNote / updateNote.
 */
import {
  ColorPicker,
  Input,
  InputNumber,
  Modal,
  Space,
  Switch,
  Typography,
} from 'antd';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import type { NoteFieldPatch } from '@/core/rulechain/rule-chain-draft';

export interface NoteEditDialogPayload {
  mode: 'create' | 'edit';
  initial?: NoteFieldPatch;
  onConfirm: (fields: NoteFieldPatch) => void;
}

interface NoteEditDialogProps {
  open: boolean;
  /** NoteEditDialogPayload — narrowed from the shared `unknown` contract. */
  payload?: unknown;
  onClose: () => void;
}

export function NoteEditDialog({
  open,
  payload,
  onClose,
}: NoteEditDialogProps) {
  const { formatMessage } = useIntl();
  const typed = payload as NoteEditDialogPayload | undefined;
  const [content, setContent] = useState(() => typed?.initial?.content ?? '');
  const [backgroundColor, setBackgroundColor] = useState(
    () => typed?.initial?.backgroundColor ?? '#FFF9C4',
  );
  const [borderColor, setBorderColor] = useState(
    () => typed?.initial?.borderColor ?? '#E6D98A',
  );
  const [borderWidth, setBorderWidth] = useState<number>(
    () => typed?.initial?.borderWidth ?? 1,
  );
  const [applyDefault, setApplyDefault] = useState<boolean>(
    () => typed?.initial?.applyDefaultMarkdownStyle ?? true,
  );
  const [markdownCss, setMarkdownCss] = useState(
    () => typed?.initial?.markdownCss ?? '',
  );

  if (!typed) {
    return null;
  }

  const submit = () => {
    typed.onConfirm({
      content,
      backgroundColor,
      borderColor,
      borderWidth,
      applyDefaultMarkdownStyle: applyDefault,
      markdownCss,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      title={formatMessage({
        id:
          typed.mode === 'create'
            ? 'editor.ruleChain.canvas.note.addTitle'
            : 'editor.ruleChain.canvas.note.editTitle',
        defaultMessage: typed.mode === 'create' ? 'Add note' : 'Edit note',
      })}
      okText={formatMessage({
        id: 'editor.ruleChain.canvas.addNode.ok',
        defaultMessage: 'OK',
      })}
      cancelText={formatMessage({
        id: 'editor.common.cancel',
        defaultMessage: 'Cancel',
      })}
      onOk={submit}
      onCancel={onClose}
      destroyOnHidden
      maskClosable={false}
    >
      <div data-testid="rc-note-dialog">
        <Typography.Text>
          {formatMessage({
            id: 'editor.ruleChain.canvas.note.content',
            defaultMessage: 'Markdown/HTML content',
          })}
        </Typography.Text>
        <Input.TextArea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={5}
          style={{ marginBottom: 12 }}
          data-testid="rc-note-content"
        />
        <Space wrap size={16} style={{ marginBottom: 12 }}>
          <span>
            <Typography.Text>
              {formatMessage({
                id: 'editor.ruleChain.canvas.note.backgroundColor',
                defaultMessage: 'Background color',
              })}
              {'  '}
            </Typography.Text>
            <ColorPicker
              value={backgroundColor}
              onChange={(color) => setBackgroundColor(color.toHexString())}
              size="small"
            />
          </span>
          <span>
            <Typography.Text>
              {formatMessage({
                id: 'editor.ruleChain.canvas.note.border',
                defaultMessage: 'Border',
              })}
              {'  '}
            </Typography.Text>
            <ColorPicker
              value={borderColor}
              onChange={(color) => setBorderColor(color.toHexString())}
              size="small"
            />
            <InputNumber
              min={0}
              max={10}
              value={borderWidth}
              onChange={(value) => setBorderWidth(value ?? 1)}
              size="small"
              style={{ width: 64, marginLeft: 8 }}
            />
          </span>
        </Space>
        <div style={{ marginBottom: 12 }}>
          <Typography.Text>
            {formatMessage({
              id: 'editor.ruleChain.canvas.note.applyDefaultMarkdownStyle',
              defaultMessage: 'Apply default markdown style',
            })}
          </Typography.Text>
          <Switch
            checked={applyDefault}
            onChange={setApplyDefault}
            style={{ marginLeft: 8 }}
          />
        </div>
        <Typography.Text>
          {formatMessage({
            id: 'editor.ruleChain.canvas.note.customCss',
            defaultMessage: 'Note content CSS',
          })}
        </Typography.Text>
        <Input.TextArea
          value={markdownCss}
          onChange={(event) => setMarkdownCss(event.target.value)}
          rows={3}
        />
      </div>
    </Modal>
  );
}
