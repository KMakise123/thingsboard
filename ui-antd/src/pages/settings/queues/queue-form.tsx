/**
 * Queue form (M14 wave-3, R26, ngx tb-queue-form parity): name (locked in
 * edit mode — the server rejects name/topic changes with 400), the derived
 * read-only topic, three collapse sections (submit strategy radio + BATCH
 * batchSize / processing strategy radio + retry numbers / polling) and the
 * additional-info trio.
 *
 * The maxPauseBetweenRetries ≥ pauseBetweenRetries cross-field validator
 * is an antd-side ADDITION over ngx (ngx has no such check): it prevents
 * the server 400 instead of surfacing it.
 */
import { InfoCircleOutlined } from '@ant-design/icons';
import {
  Checkbox,
  Col,
  Collapse,
  Form,
  Input,
  InputNumber,
  Radio,
  Row,
  Tooltip,
} from 'antd';
import type { NamePath } from 'antd/es/form/interface';
import { useIntl } from 'react-intl';
import {
  deriveQueueTopic,
  processingStrategyHintKey,
  processingStrategyLabelKey,
  QUEUE_NAME_PATTERN,
  QUEUE_PROCESSING_STRATEGIES,
  QUEUE_SUBMIT_STRATEGIES,
  type QueueFormValues,
  submitStrategyHintKey,
  submitStrategyLabelKey,
} from './data';

type QueueFormInstance = ReturnType<typeof Form.useForm<QueueFormValues>>[0];

/**
 * Radio option list with the ngx label + hint tooltip. The Form.Item
 * `value`/`onChange` injection MUST be forwarded to Radio.Group (a custom
 * child that drops them would silently never update the store).
 */
function StrategyRadio<T extends string>({
  value,
  onChange,
  options,
  labelKey,
  hintKey,
}: {
  value?: T;
  onChange?: (value: T) => void;
  options: readonly T[];
  labelKey: (value: T) => string;
  hintKey: (value: T) => string;
}) {
  const { formatMessage } = useIntl();
  return (
    <Radio.Group
      className="flex flex-col gap-1"
      value={value}
      onChange={(event) => onChange?.(event.target.value as T)}
    >
      {options.map((option) => (
        <Radio key={option} value={option}>
          <span className="inline-flex items-center gap-1">
            {formatMessage({ id: labelKey(option), defaultMessage: option })}
            <Tooltip
              title={formatMessage({
                id: hintKey(option),
                defaultMessage: option,
              })}
            >
              <InfoCircleOutlined
                className="text-[rgba(0,0,0,0.45)]"
                aria-label={formatMessage({
                  id: hintKey(option),
                  defaultMessage: option,
                })}
              />
            </Tooltip>
          </span>
        </Radio>
      ))}
    </Radio.Group>
  );
}

export default function QueueForm({
  form,
  editMode,
}: {
  form: QueueFormInstance;
  /** true = update: name is locked (immutable on the wire). */
  editMode: boolean;
}) {
  const { formatMessage } = useIntl();
  const label = (id: string, defaultMessage: string) =>
    formatMessage({ id, defaultMessage });
  const msg = (id: string, defaultMessage: string) => ({
    required: true,
    message: label(id, defaultMessage),
  });
  const submitType = Form.useWatch(['submitStrategy', 'type'], form) ?? 'BURST';

  return (
    <Form<QueueFormValues> form={form} layout="vertical">
      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            name="name"
            label={label('pages.settings.queues.name', 'Name')}
            rules={[
              msg(
                'pages.settings.queues.nameRequired',
                'Queue name is required!',
              ),
              {
                pattern: QUEUE_NAME_PATTERN,
                message: label(
                  'pages.settings.queues.namePattern',
                  "Queue name contains a character other than ASCII alphanumerics, '.', '_' and '-'!",
                ),
              },
            ]}
          >
            <Input disabled={editMode} autoComplete="off" />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          {/* Topic is DERIVED from the name on the wire — display only. */}
          <Form.Item label={label('pages.settings.queues.topic', 'Topic')}>
            <TopicPreview form={form} editMode={editMode} />
          </Form.Item>
        </Col>
      </Row>

      <Collapse
        className="mb-4"
        defaultActiveKey={['submit', 'processing', 'polling']}
        items={[
          {
            key: 'submit',
            label: label(
              'pages.settings.queues.submitSettings',
              'Submit settings',
            ),
            children: (
              <Row gutter={24}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name={['submitStrategy', 'type']}
                    label={label(
                      'pages.settings.queues.submitStrategy',
                      'Strategy type',
                    )}
                    rules={[
                      msg(
                        'pages.settings.queues.submitStrategyTypeRequired',
                        'Submit strategy type is required!',
                      ),
                    ]}
                  >
                    <StrategyRadio
                      options={QUEUE_SUBMIT_STRATEGIES}
                      labelKey={submitStrategyLabelKey}
                      hintKey={submitStrategyHintKey}
                    />
                  </Form.Item>
                </Col>
                {submitType === 'BATCH' && (
                  <Col xs={24} md={12}>
                    <Form.Item
                      name={['submitStrategy', 'batchSize']}
                      label={label(
                        'pages.settings.queues.groupingParameter',
                        'Grouping parameter',
                      )}
                      rules={[
                        msg(
                          'pages.settings.queues.batchSizeRequired',
                          'Batch size is required!',
                        ),
                      ]}
                    >
                      <InputNumber className="w-full" min={1} precision={0} />
                    </Form.Item>
                  </Col>
                )}
              </Row>
            ),
          },
          {
            key: 'processing',
            label: label(
              'pages.settings.queues.processingSettings',
              'Retries processing settings',
            ),
            children: (
              <Row gutter={24}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name={['processingStrategy', 'type']}
                    label={label(
                      'pages.settings.queues.processingStrategy',
                      'Processing type',
                    )}
                    rules={[
                      msg(
                        'pages.settings.queues.processingStrategyTypeRequired',
                        'Processing strategy type is required!',
                      ),
                    ]}
                  >
                    <StrategyRadio
                      options={QUEUE_PROCESSING_STRATEGIES}
                      labelKey={processingStrategyLabelKey}
                      hintKey={processingStrategyHintKey}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item
                    name={['processingStrategy', 'retries']}
                    label={label(
                      'pages.settings.queues.retries',
                      'Number of retries (0 – unlimited)',
                    )}
                    rules={[
                      msg(
                        'pages.settings.queues.retriesRequired',
                        'Retries is required!',
                      ),
                    ]}
                  >
                    <InputNumber className="w-full" min={0} precision={0} />
                  </Form.Item>
                  <Form.Item
                    name={['processingStrategy', 'failurePercentage']}
                    label={label(
                      'pages.settings.queues.failurePercentage',
                      'Percentage of failed messages to skip retries (%)',
                    )}
                    rules={[
                      msg(
                        'pages.settings.queues.failurePercentageRequired',
                        'Failure percentage is required!',
                      ),
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
                    name={['processingStrategy', 'pauseBetweenRetries']}
                    label={label(
                      'pages.settings.queues.pauseBetweenRetries',
                      'Pause between retries (ms)',
                    )}
                    rules={[
                      msg(
                        'pages.settings.queues.pauseBetweenRetriesRequired',
                        'Pause between retries is required!',
                      ),
                    ]}
                  >
                    <InputNumber className="w-full" min={1} precision={0} />
                  </Form.Item>
                  <Form.Item
                    name={['processingStrategy', 'maxPauseBetweenRetries']}
                    label={label(
                      'pages.settings.queues.maxPauseBetweenRetries',
                      'Additional pause between retries (ms)',
                    )}
                    dependencies={[
                      ['processingStrategy', 'pauseBetweenRetries'] as NamePath,
                    ]}
                    rules={[
                      msg(
                        'pages.settings.queues.maxPauseBetweenRetriesRequired',
                        'Max pause between retries is required!',
                      ),
                      {
                        validator: async (_rule, value: number | undefined) => {
                          const pause = form.getFieldValue([
                            'processingStrategy',
                            'pauseBetweenRetries',
                          ]) as number | undefined;
                          if (
                            typeof value === 'number' &&
                            typeof pause === 'number' &&
                            value < pause
                          ) {
                            throw new Error(
                              label(
                                'pages.settings.queues.maxPauseLessThanPause',
                                'The additional pause between retries cannot be smaller than the pause between retries.',
                              ),
                            );
                          }
                        },
                      },
                    ]}
                  >
                    <InputNumber className="w-full" min={1} precision={0} />
                  </Form.Item>
                </Col>
              </Row>
            ),
          },
          {
            key: 'polling',
            label: label(
              'pages.settings.queues.pollingSettings',
              'Polling settings',
            ),
            children: (
              <>
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="pollInterval"
                      label={label(
                        'pages.settings.queues.pollInterval',
                        'Polling interval (ms)',
                      )}
                      rules={[
                        msg(
                          'pages.settings.queues.pollIntervalRequired',
                          'Polling interval is required!',
                        ),
                      ]}
                    >
                      <InputNumber className="w-full" min={1} precision={0} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item
                      name="partitions"
                      label={label(
                        'pages.settings.queues.partitions',
                        'Partitions',
                      )}
                      rules={[
                        msg(
                          'pages.settings.queues.partitionsRequired',
                          'Partitions is required!',
                        ),
                      ]}
                    >
                      <InputNumber className="w-full" min={1} precision={0} />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="consumerPerPartition" valuePropName="checked">
                  <Checkbox>
                    {label(
                      'pages.settings.queues.consumerPerPartition',
                      'Consumer per partition',
                    )}
                  </Checkbox>
                </Form.Item>
                <Form.Item
                  name="packProcessingTimeout"
                  label={label(
                    'pages.settings.queues.packProcessingTimeout',
                    'Pack processing timeout (ms)',
                  )}
                  rules={[
                    msg(
                      'pages.settings.queues.packProcessingTimeoutRequired',
                      'Pack processing timeout is required!',
                    ),
                  ]}
                >
                  <InputNumber className="w-full" min={1} precision={0} />
                </Form.Item>
              </>
            ),
          },
        ]}
      />

      <Form.Item
        name={['additionalInfo', 'duplicateMsgToAllPartitions']}
        valuePropName="checked"
      >
        <Checkbox>
          {label(
            'pages.settings.queues.duplicateMsgToAllPartitions',
            'Duplicate messages to all partitions',
          )}
        </Checkbox>
      </Form.Item>
      <Form.Item
        name={['additionalInfo', 'customProperties']}
        label={label(
          'pages.settings.queues.customProperties',
          'Custom properties',
        )}
        extra={label(
          'pages.settings.queues.customPropertiesHint',
          'Semicolon-separated key:value pairs, ex. retention.ms:604800000;retention.bytes:1048576000',
        )}
      >
        <Input.TextArea rows={1} autoSize={{ minRows: 1, maxRows: 4 }} />
      </Form.Item>
      <Form.Item
        name={['additionalInfo', 'description']}
        label={label('pages.settings.queues.description', 'Description')}
      >
        <Input.TextArea rows={1} autoSize={{ minRows: 1, maxRows: 4 }} />
      </Form.Item>
    </Form>
  );
}

/** Read-only preview of the wire topic (`tb_rule_engine.{name}`). */
function TopicPreview({
  form,
  editMode,
}: {
  form: QueueFormInstance;
  editMode: boolean;
}) {
  const name = (Form.useWatch('name', form) as string) ?? '';
  const value = editMode && !name ? '' : deriveQueueTopic(name);
  return <Input value={value} readOnly disabled />;
}
