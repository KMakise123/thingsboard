/**
 * SelectTargetLayoutDialog — target-layout choice for paste / multi-widget
 * add on multi-layout dashboards. The C wave ships the minimal functional
 * picker (Radio list + confirm) so paste flows work end to end; the P wave
 * replaces the body behind the same EditorDialogProps signature.
 *
 * Payload (frozen): { layouts: Array<{id, name}>; onPick: (layoutId) => void }
 */
import { Button, Modal, Radio, Space } from 'antd';
import { useState } from 'react';
import { useIntl } from 'react-intl';

import type { EditorDialogProps } from './host';

export interface SelectTargetLayoutPayload {
  layouts: Array<{ id: string; name: string }>;
  onPick: (layoutId: string) => void;
}

export function SelectTargetLayoutDialog({
  open,
  payload,
  onClose,
}: EditorDialogProps) {
  const { formatMessage } = useIntl();
  const [picked, setPicked] = useState<string | undefined>(undefined);
  const typed = payload as SelectTargetLayoutPayload | undefined;
  const layouts = typed?.layouts ?? [];

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'editor.dashboard.selectLayout.title',
        defaultMessage: 'Select target layout',
      })}
      footer={
        <Space>
          <Button onClick={onClose} data-testid="select-target-layout-cancel">
            {formatMessage({
              id: 'editor.common.cancel',
              defaultMessage: 'Cancel',
            })}
          </Button>
          <Button
            type="primary"
            disabled={!picked}
            data-testid="select-target-layout-confirm"
            onClick={() => {
              if (picked) {
                typed?.onPick(picked);
              }
              onClose();
            }}
          >
            {formatMessage({
              id: 'editor.common.save',
              defaultMessage: 'Save',
            })}
          </Button>
        </Space>
      }
      onCancel={onClose}
      destroyOnHidden
      maskClosable={false}
      data-testid="select-target-layout"
    >
      <Radio.Group
        value={picked}
        onChange={(event) => setPicked(event.target.value)}
      >
        <Space direction="vertical">
          {layouts.map((layout) => (
            <Radio key={layout.id} value={layout.id}>
              {layout.name}
            </Radio>
          ))}
        </Space>
      </Radio.Group>
    </Modal>
  );
}
