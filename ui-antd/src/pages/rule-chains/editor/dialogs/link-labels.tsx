/**
 * LinkLabelsDialog — relation-label multi-select (ui-ngx
 * add-rule-node-link-dialog parity). Candidates = the source node's
 * descriptor relationTypes; when the source node forwards into another
 * chain (descriptor `ruleChainNode`), the candidates come from
 * `getRuleChainOutputLabels` of THAT chain instead (ui-ngx
 * ruleNodeSourceRuleChainId parity — the shell resolves the id into the
 * payload). `customRelations` allows arbitrary extra labels (tags mode).
 *
 * Collects only: the shell commits addEdge / updateEdgeLabels.
 */

import { useQuery } from '@tanstack/react-query';
import { Modal, Select, Typography } from 'antd';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { getRuleChainOutputLabels } from '@/services/tb/rule-chain';

export interface LinkLabelsDialogPayload {
  mode: 'create' | 'edit';
  /** edit mode: the canvas edge id (shell commits updateEdgeLabels). */
  edgeId?: string;
  sourceUid: string;
  targetUid?: string;
  initialLabels: Array<string>;
  candidateLabels: Array<string>;
  allowCustom: boolean;
  /** set when the source is a rule-chain node → fetch its output labels. */
  sourceRuleChainId?: string | null;
  onConfirm: (labels: Array<string>) => void;
}

interface LinkLabelsDialogProps {
  open: boolean;
  /** LinkLabelsDialogPayload — narrowed from the shared `unknown` contract. */
  payload?: unknown;
  onClose: () => void;
}

export function LinkLabelsDialog({
  open,
  payload,
  onClose,
}: LinkLabelsDialogProps) {
  const { formatMessage } = useIntl();
  const typed = payload as LinkLabelsDialogPayload | undefined;
  const [labels, setLabels] = useState<Array<string>>(
    () => typed?.initialLabels ?? [],
  );

  const outputLabelsQuery = useQuery({
    queryKey: ['ruleChainOutputLabels', typed?.sourceRuleChainId],
    queryFn: () => getRuleChainOutputLabels(typed?.sourceRuleChainId as string),
    enabled: Boolean(typed?.sourceRuleChainId),
    staleTime: Infinity,
  });

  if (!typed) {
    return null;
  }
  const remoteLabels = outputLabelsQuery.data ?? [];
  const candidates = typed.sourceRuleChainId
    ? remoteLabels
    : typed.candidateLabels;
  const options = Array.from(new Set([...candidates, ...labels])).map(
    (label) => ({ value: label, label }),
  );

  const submit = () => {
    if (labels.length === 0) {
      return;
    }
    typed.onConfirm(labels);
    onClose();
  };

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'editor.ruleChain.canvas.linkLabels.title',
        defaultMessage: 'Link labels',
      })}
      okText={formatMessage({
        id: 'editor.ruleChain.canvas.addNode.ok',
        defaultMessage: 'OK',
      })}
      cancelText={formatMessage({
        id: 'editor.common.cancel',
        defaultMessage: 'Cancel',
      })}
      okButtonProps={{ disabled: labels.length === 0 }}
      onOk={submit}
      onCancel={onClose}
      destroyOnHidden
      maskClosable={false}
    >
      <div data-testid="rc-link-labels-dialog">
        <Typography.Text>
          {formatMessage({
            id: 'editor.ruleChain.canvas.linkLabels.labels',
            defaultMessage: 'Link labels',
          })}
        </Typography.Text>
        <Select
          mode={typed.allowCustom ? 'tags' : 'multiple'}
          value={labels}
          onChange={setLabels}
          options={options}
          placeholder={formatMessage({
            id: 'editor.ruleChain.canvas.linkLabels.noLabelsFound',
            defaultMessage: 'No link labels found',
          })}
          style={{ width: '100%', marginTop: 8 }}
          data-testid="rc-link-labels-select"
        />
        {labels.length === 0 ? (
          <Typography.Text type="danger">
            {formatMessage({
              id: 'editor.ruleChain.canvas.linkLabels.required',
              defaultMessage: 'Link labels are required.',
            })}
          </Typography.Text>
        ) : null}
      </div>
    </Modal>
  );
}
