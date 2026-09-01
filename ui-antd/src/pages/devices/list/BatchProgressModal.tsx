/**
 * Progress + result presentation for the fan-out batch operations:
 * a progress bar while running, then ok/failed counters with the failure
 * details (device key + server error) before the caller closes it.
 */
import { Alert, Modal, Progress, Typography } from 'antd';
import { useIntl } from 'react-intl';

import type { BatchRunState } from './use-batch-run';

export interface BatchProgressModalProps {
  open: boolean;
  state: BatchRunState;
  onClose: () => void;
}

export function BatchProgressModal({
  open,
  state,
  onClose,
}: BatchProgressModalProps) {
  const { formatMessage } = useIntl();
  const percent =
    state.total > 0 ? Math.round((state.done / state.total) * 100) : 100;

  return (
    <Modal
      open={open}
      closable={!state.running}
      keyboard={false}
      maskClosable={false}
      title={
        state.running
          ? formatMessage(
              {
                id: 'pages.devices.list.batchRunning',
                defaultMessage: 'Processing {done}/{total}…',
              },
              { done: state.done, total: state.total },
            )
          : formatMessage(
              {
                id: 'pages.devices.list.batchResult',
                defaultMessage: '{ok} succeeded, {fail} failed.',
              },
              {
                ok: state.total - state.failures.length,
                fail: state.failures.length,
              },
            )
      }
      footer={null}
      onCancel={onClose}
    >
      <div className="flex flex-col gap-4">
        <Progress
          percent={percent}
          status={
            state.running
              ? 'active'
              : state.failures.length > 0
                ? 'exception'
                : 'success'
          }
        />
        {state.failures.length > 0 && (
          <Alert
            type="error"
            showIcon
            title={formatMessage({
              id: 'pages.devices.list.batchFailures',
              defaultMessage: 'Failure details',
            })}
            description={
              <ul className="mb-0 max-h-48 list-disc overflow-auto pl-4">
                {state.failures.map((failure) => (
                  <li key={failure.key}>
                    <Typography.Text strong>{failure.key}</Typography.Text>
                    <Typography.Text type="secondary">
                      {' '}
                      — {failure.error}
                    </Typography.Text>
                  </li>
                ))}
              </ul>
            }
          />
        )}
      </div>
    </Modal>
  );
}
