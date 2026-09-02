/**
 * Tenant-profile queues editor (ui-ngx tb-tenant-profile-queues +
 * tb-queue-form parity, AntD-ized as collapsible cards).
 *
 * Rendered only while isolatedTbRuleEngine is on. Each queue card edits the
 * full QueueInfo shape: name (ASCII pattern), poll settings, submit
 * strategy (+ batch size when BATCH), processing strategy retries, and the
 * additional-info trio. The first card (the stock Main queue) is not
 * removable, matching the ui-ngx @if (!($index === 0)) remove guard. The
 * topic is derived server-side from the name — never edited here.
 */
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Checkbox,
  Collapse,
  Form,
  Input,
  InputNumber,
  Select,
} from 'antd';
import { useIntl } from 'react-intl';
import type {
  QueueProcessingStrategyType,
  QueueSubmitStrategyType,
} from '@/types/tb/tenant';

const SUBMIT_STRATEGIES: Array<QueueSubmitStrategyType> = [
  'SEQUENTIAL_BY_ORIGINATOR',
  'SEQUENTIAL_BY_TENANT',
  'SEQUENTIAL',
  'BURST',
  'BATCH',
];

const PROCESSING_STRATEGIES: Array<QueueProcessingStrategyType> = [
  'RETRY_FAILED_AND_TIMED_OUT',
  'SKIP_ALL_FAILURES',
  'SKIP_ALL_FAILURES_AND_TIMED_OUT',
  'RETRY_ALL',
  'RETRY_FAILED',
  'RETRY_TIMED_OUT',
];

/** ui-ngx queue-name pattern: ASCII alphanumerics, dot, underscore, dash. */
const QUEUE_NAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

export function TenantProfileQueues() {
  const { formatMessage } = useIntl();

  const queueLabel = (key: string, defaultMessage: string): string =>
    formatMessage({
      id: `pages.tenantProfiles.queues.${key}`,
      defaultMessage,
    });

  return (
    <Form.List name={['profileData', 'queueConfiguration']}>
      {(fields, { add, remove }) => (
        <div className="flex flex-col gap-3">
          {fields.length === 0 && (
            <div className="text-center text-sm text-[rgba(0,0,0,0.45)]">
              {queueLabel('noQueue', 'No queues configured')}
            </div>
          )}
          <Collapse
            items={fields.map((field, index) => ({
              key: String(field.key),
              label: (
                <span className="font-medium">{`Queue #${index + 1}`}</span>
              ),
              extra:
                index === 0 ? undefined : (
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(event) => {
                      event.stopPropagation();
                      remove(index);
                    }}
                    title={queueLabel('delete', 'Delete queue')}
                  />
                ),
              children: (
                <div className="flex flex-col gap-4">
                  <Form.Item
                    name={[field.name, 'name']}
                    label={queueLabel('name', 'Name')}
                    rules={[
                      {
                        required: true,
                        message: queueLabel(
                          'nameRequired',
                          'Queue name is required!',
                        ),
                      },
                      {
                        pattern: QUEUE_NAME_PATTERN,
                        message: queueLabel(
                          'namePattern',
                          'Queue name contains characters other than ASCII alphanumerics, ".", "_" and "-"!',
                        ),
                      },
                    ]}
                  >
                    <Input />
                  </Form.Item>

                  <div className="grid grid-cols-1 gap-x-6 md:grid-cols-3">
                    <Form.Item
                      name={[field.name, 'pollInterval']}
                      label={queueLabel('pollInterval', 'Polling interval')}
                      rules={[
                        {
                          required: true,
                          message: queueLabel(
                            'pollIntervalRequired',
                            'Polling interval is required!',
                          ),
                        },
                      ]}
                    >
                      <InputNumber className="w-full" min={1} precision={0} />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, 'partitions']}
                      label={queueLabel('partitions', 'Partitions')}
                      rules={[
                        {
                          required: true,
                          message: queueLabel(
                            'partitionsRequired',
                            'Partitions is required!',
                          ),
                        },
                      ]}
                    >
                      <InputNumber className="w-full" min={1} precision={0} />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, 'packProcessingTimeout']}
                      label={queueLabel(
                        'packProcessingTimeout',
                        'Pack processing timeout (ms)',
                      )}
                      rules={[
                        {
                          required: true,
                          message: queueLabel(
                            'packProcessingTimeoutRequired',
                            'Pack processing timeout is required!',
                          ),
                        },
                      ]}
                    >
                      <InputNumber className="w-full" min={1} precision={0} />
                    </Form.Item>
                  </div>

                  <div className="rounded border border-solid border-[rgba(0,0,0,0.15)] p-3">
                    <div className="mb-2 font-medium">
                      {queueLabel('submitSettings', 'Submit settings')}
                    </div>
                    <div className="grid grid-cols-1 gap-x-6 md:grid-cols-3">
                      <Form.Item
                        name={[field.name, 'submitStrategy', 'type']}
                        label={queueLabel('submitStrategy', 'Strategy type')}
                        rules={[
                          {
                            required: true,
                            message: queueLabel(
                              'submitStrategyTypeRequired',
                              'Submit strategy type is required!',
                            ),
                          },
                        ]}
                      >
                        <Select
                          options={SUBMIT_STRATEGIES.map((value) => ({
                            value,
                          }))}
                        />
                      </Form.Item>
                      <Form.Item
                        noStyle
                        shouldUpdate={(prev, next) =>
                          prev?.profileData?.queueConfiguration?.[field.name]
                            ?.submitStrategy?.type !==
                          next?.profileData?.queueConfiguration?.[field.name]
                            ?.submitStrategy?.type
                        }
                      >
                        {({ getFieldValue }) =>
                          getFieldValue([
                            'profileData',
                            'queueConfiguration',
                            field.name,
                            'submitStrategy',
                            'type',
                          ]) === 'BATCH' ? (
                            <Form.Item
                              name={[field.name, 'submitStrategy', 'batchSize']}
                              label={queueLabel('batchSize', 'Batch size')}
                              rules={[
                                {
                                  required: true,
                                  message: queueLabel(
                                    'batchSizeRequired',
                                    'Batch size is required!',
                                  ),
                                },
                              ]}
                            >
                              <InputNumber
                                className="w-full"
                                min={1}
                                precision={0}
                              />
                            </Form.Item>
                          ) : null
                        }
                      </Form.Item>
                    </div>
                  </div>

                  <div className="rounded border border-solid border-[rgba(0,0,0,0.15)] p-3">
                    <div className="mb-2 font-medium">
                      {queueLabel(
                        'processingSettings',
                        'Retry processing settings',
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-x-6 md:grid-cols-3">
                      <Form.Item
                        name={[field.name, 'processingStrategy', 'type']}
                        label={queueLabel(
                          'processingStrategy',
                          'Processing type',
                        )}
                        rules={[
                          {
                            required: true,
                            message: queueLabel(
                              'processingStrategyTypeRequired',
                              'Processing strategy type is required!',
                            ),
                          },
                        ]}
                      >
                        <Select
                          options={PROCESSING_STRATEGIES.map((value) => ({
                            value,
                          }))}
                        />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, 'processingStrategy', 'retries']}
                        label={queueLabel('retries', 'Retries (0 — unlimited)')}
                        rules={[
                          {
                            required: true,
                            message: queueLabel(
                              'retriesRequired',
                              'Retries is required!',
                            ),
                          },
                        ]}
                      >
                        <InputNumber className="w-full" min={0} precision={0} />
                      </Form.Item>
                      <Form.Item
                        name={[
                          field.name,
                          'processingStrategy',
                          'failurePercentage',
                        ]}
                        label={queueLabel(
                          'failurePercentage',
                          'Percentage of failed messages to skip retries (%)',
                        )}
                        rules={[
                          {
                            required: true,
                            message: queueLabel(
                              'failurePercentageRequired',
                              'Failure percentage is required!',
                            ),
                          },
                        ]}
                      >
                        <InputNumber
                          className="w-full"
                          min={0}
                          max={100}
                          precision={0}
                        />
                      </Form.Item>
                      <Form.Item
                        name={[
                          field.name,
                          'processingStrategy',
                          'pauseBetweenRetries',
                        ]}
                        label={queueLabel(
                          'pauseBetweenRetries',
                          'Pause between retries (seconds)',
                        )}
                        rules={[
                          {
                            required: true,
                            message: queueLabel(
                              'pauseBetweenRetriesRequired',
                              'Pause between retries is required!',
                            ),
                          },
                        ]}
                      >
                        <InputNumber className="w-full" min={1} precision={0} />
                      </Form.Item>
                      <Form.Item
                        name={[
                          field.name,
                          'processingStrategy',
                          'maxPauseBetweenRetries',
                        ]}
                        label={queueLabel(
                          'maxPauseBetweenRetries',
                          'Extra pause between retries (seconds)',
                        )}
                        rules={[
                          {
                            required: true,
                            message: queueLabel(
                              'maxPauseBetweenRetriesRequired',
                              'Max pause between retries is required!',
                            ),
                          },
                        ]}
                      >
                        <InputNumber className="w-full" min={1} precision={0} />
                      </Form.Item>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-x-6">
                    <Form.Item
                      name={[field.name, 'consumerPerPartition']}
                      valuePropName="checked"
                    >
                      <Checkbox>
                        {queueLabel(
                          'consumerPerPartition',
                          'Poll messages per consumer per partition',
                        )}
                      </Checkbox>
                    </Form.Item>
                    <Form.Item
                      name={[
                        field.name,
                        'additionalInfo',
                        'duplicateMsgToAllPartitions',
                      ]}
                      valuePropName="checked"
                    >
                      <Checkbox>
                        {queueLabel(
                          'duplicateMsgToAllPartitions',
                          'Duplicate messages to all partitions',
                        )}
                      </Checkbox>
                    </Form.Item>
                    <Form.Item
                      name={[field.name, 'additionalInfo', 'customProperties']}
                      label={queueLabel(
                        'customProperties',
                        'Custom properties',
                      )}
                    >
                      <Input.TextArea
                        rows={1}
                        autoSize={{ minRows: 1, maxRows: 4 }}
                        placeholder="retention.ms:604800000;retention.bytes:1048576000"
                      />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, 'additionalInfo', 'description']}
                      label={queueLabel('description', 'Description')}
                    >
                      <Input.TextArea
                        rows={1}
                        autoSize={{ minRows: 1, maxRows: 4 }}
                      />
                    </Form.Item>
                  </div>
                </div>
              ),
            }))}
          />
          <div>
            <Button
              type="primary"
              ghost
              icon={<PlusOutlined />}
              onClick={() =>
                add({
                  name: '',
                  pollInterval: 2000,
                  partitions: 1,
                  consumerPerPartition: false,
                  packProcessingTimeout: 10000,
                  submitStrategy: { type: 'BURST', batchSize: 1000 },
                  processingStrategy: {
                    type: 'RETRY_FAILED_AND_TIMED_OUT',
                    retries: 3,
                    failurePercentage: 0,
                    pauseBetweenRetries: 5,
                    maxPauseBetweenRetries: 5,
                  },
                  additionalInfo: {
                    description: '',
                    customProperties: '',
                    duplicateMsgToAllPartitions: false,
                  },
                })
              }
            >
              {queueLabel('addQueue', 'Add queue')}
            </Button>
          </div>
        </div>
      )}
    </Form.List>
  );
}
