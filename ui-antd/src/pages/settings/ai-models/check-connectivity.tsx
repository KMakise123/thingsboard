/**
 * Check-connectivity dialog (M14 wave-3, R27, ngx check-connectivity-dialog
 * parity): fires POST /api/ai/model/chat ONCE per open with the edit
 * dialog's UNSAVED form configuration. The endpoint answers HTTP 200
 * ALWAYS — the FAILURE envelope's errorDetails is the failure display
 * (contract #24), NOT an HTTP catch.
 */
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { Modal, Spin, Typography, theme } from 'antd';
import { useEffect } from 'react';
import { useIntl } from 'react-intl';
import { serverErrorText } from '@/components/entities/server-error-text';
import { checkAiModelConnectivity } from '@/services/tb/ai-model';
import type { AiChatModelConfig } from '@/types/tb/ai-model';
import { buildConnectivityRequest, parseConnectivityError } from './data';

export interface CheckConnectivityDialogProps {
  open: boolean;
  configuration?: AiChatModelConfig;
  onClose: () => void;
}

export default function CheckConnectivityDialog({
  open,
  configuration,
  onClose,
}: CheckConnectivityDialogProps) {
  const { formatMessage } = useIntl();
  const { token } = theme.useToken();
  const mutation = useMutation({
    mutationFn: (config: AiChatModelConfig) =>
      checkAiModelConnectivity(buildConnectivityRequest(config)),
  });

  const result = mutation.data;

  // Fire the probe per open (ngx runs it in the dialog constructor); stale
  // results from a previous run are dropped first.
  useEffect(() => {
    if (open) {
      mutation.reset();
      if (configuration) {
        mutation.mutate(configuration);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mutation.reset, mutation.mutate, configuration]);

  return (
    <Modal
      open={open}
      title={formatMessage({
        id: 'pages.aiModels.checkConnectivity',
        defaultMessage: 'Check connectivity',
      })}
      footer={null}
      onCancel={onClose}
    >
      <div className="flex min-h-48 flex-col items-center justify-center gap-3">
        {mutation.isPending && <Spin size="large" />}
        {result?.status === 'SUCCESS' && (
          <>
            <CheckCircleOutlined
              className="text-5xl"
              style={{ color: token.colorSuccess }}
            />
            <Typography.Text>
              {formatMessage({
                id: 'pages.aiModels.checkConnectivitySuccess',
                defaultMessage: 'Test request was successful',
              })}
            </Typography.Text>
          </>
        )}
        {result?.status === 'FAILURE' && (
          <>
            <CloseCircleOutlined
              className="text-5xl"
              style={{ color: token.colorError }}
            />
            <Typography.Text type="danger">
              {formatMessage({
                id: 'pages.aiModels.checkConnectivityFailed',
                defaultMessage: 'Test request failed',
              })}
            </Typography.Text>
            <pre className="max-h-64 max-w-full overflow-auto self-stretch rounded bg-[rgba(0,0,0,0.04)] p-3 text-xs whitespace-pre-wrap">
              {parseConnectivityError(result.errorDetails) ||
                formatMessage({
                  id: 'pages.aiModels.checkConnectivityNoDetails',
                  defaultMessage: 'The provider returned no error details.',
                })}
            </pre>
          </>
        )}
        {/* HTTP-layer failures (transport abort / non-envelope status) —
            the protocol path itself always answers 200 + envelope. */}
        {mutation.error && (
          <>
            <CloseCircleOutlined
              className="text-5xl"
              style={{ color: token.colorError }}
            />
            <Typography.Text type="danger">
              {formatMessage({
                id: 'pages.aiModels.checkConnectivityFailed',
                defaultMessage: 'Test request failed',
              })}
            </Typography.Text>
            <Typography.Text type="secondary" className="px-4 text-center">
              {serverErrorText(mutation.error)}
            </Typography.Text>
          </>
        )}
      </div>
    </Modal>
  );
}
