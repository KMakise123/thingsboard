/**
 * Queue page helpers (M14 wave-3, R26).
 *
 * Wire rules (contract #14/#15/#16): name/topic are immutable after
 * creation (edit locks name, topic is DERIVED — never editable); the
 * server cross-checks maxPauseBetweenRetries ≥ pauseBetweenRetries (400
 * otherwise) so the form carries the same cross-field validator up front.
 */
import type {
  Queue,
  QueueProcessingStrategyType,
  QueueSubmitStrategyType,
} from '@/types/tb/queue';

export const QUEUE_SUBMIT_STRATEGIES: Array<QueueSubmitStrategyType> = [
  'SEQUENTIAL_BY_ORIGINATOR',
  'SEQUENTIAL_BY_TENANT',
  'SEQUENTIAL',
  'BURST',
  'BATCH',
];

export const QUEUE_PROCESSING_STRATEGIES: Array<QueueProcessingStrategyType> = [
  'RETRY_FAILED_AND_TIMED_OUT',
  'SKIP_ALL_FAILURES',
  'SKIP_ALL_FAILURES_AND_TIMED_OUT',
  'RETRY_ALL',
  'RETRY_FAILED',
  'RETRY_TIMED_OUT',
];

const SUBMIT_LABEL_KEYS: Record<QueueSubmitStrategyType, string> = {
  SEQUENTIAL_BY_ORIGINATOR: 'sequentialByOriginator',
  SEQUENTIAL_BY_TENANT: 'sequentialByTenant',
  SEQUENTIAL: 'sequential',
  BURST: 'burst',
  BATCH: 'batch',
};

const PROCESSING_LABEL_KEYS: Record<QueueProcessingStrategyType, string> = {
  RETRY_FAILED_AND_TIMED_OUT: 'retryFailedAndTimeout',
  SKIP_ALL_FAILURES: 'skipAllFailures',
  SKIP_ALL_FAILURES_AND_TIMED_OUT: 'skipAllFailuresAndTimeouts',
  RETRY_ALL: 'retryAll',
  RETRY_FAILED: 'retryFailed',
  RETRY_TIMED_OUT: 'retryTimeout',
};

export const submitStrategyLabelKey = (type: QueueSubmitStrategyType) =>
  `pages.settings.queues.strategies.${SUBMIT_LABEL_KEYS[type]}`;
export const submitStrategyHintKey = (type: QueueSubmitStrategyType) =>
  `pages.settings.queues.strategies.${SUBMIT_LABEL_KEYS[type]}Hint`;
export const processingStrategyLabelKey = (type: QueueProcessingStrategyType) =>
  `pages.settings.queues.strategies.${PROCESSING_LABEL_KEYS[type]}`;
export const processingStrategyHintKey = (type: QueueProcessingStrategyType) =>
  `pages.settings.queues.strategies.${PROCESSING_LABEL_KEYS[type]}Hint`;

/** ui-ngx queue-name pattern: ASCII alphanumerics, dot, underscore, dash. */
export const QUEUE_NAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

/**
 * Topic derivation pinned by the backend: `tb_rule_engine.{name}` (the
 * TopicService prefixes the rule-engine topic; a queue row's topic is
 * never user-typed).
 */
export function deriveQueueTopic(name: string): string {
  return `tb_rule_engine.${name}`;
}

/**
 * The Main system queue: the backend has NO name-based delete protection,
 * so the UI gates it in both places (selection + delete) and the backend
 * hardening lives in a separate issue (registered boundary).
 */
export function isMainQueue(queue: Pick<Queue, 'name'>): boolean {
  return queue.name === 'Main';
}

/** Flat form shape (matches the wire nesting 1:1 for a cheap payload). */
export interface QueueFormValues {
  name: string;
  pollInterval: number;
  partitions: number;
  consumerPerPartition: boolean;
  packProcessingTimeout: number;
  submitStrategy: Queue['submitStrategy'];
  processingStrategy: Queue['processingStrategy'];
  additionalInfo: {
    description?: string;
    customProperties?: string;
    duplicateMsgToAllPartitions: boolean;
  };
}

/** Blank create-form defaults (ngx queue-form defaults, R26 matrix). */
export function defaultQueueFormValues(): QueueFormValues {
  return {
    name: '',
    pollInterval: 25,
    partitions: 10,
    consumerPerPartition: false,
    packProcessingTimeout: 2000,
    submitStrategy: { type: 'BURST', batchSize: 1000 },
    processingStrategy: {
      type: 'RETRY_FAILED_AND_TIMED_OUT',
      retries: 3,
      failurePercentage: 0,
      pauseBetweenRetries: 3,
      maxPauseBetweenRetries: 3,
    },
    additionalInfo: {
      description: '',
      customProperties: '',
      duplicateMsgToAllPartitions: false,
    },
  };
}

export function toQueueFormValues(queue: Queue): QueueFormValues {
  return {
    name: queue.name,
    pollInterval: queue.pollInterval,
    partitions: queue.partitions,
    consumerPerPartition: queue.consumerPerPartition,
    packProcessingTimeout: queue.packProcessingTimeout,
    submitStrategy: queue.submitStrategy,
    processingStrategy: queue.processingStrategy,
    additionalInfo: {
      // `description` rides the additionalInfo index signature — narrow it.
      description:
        (queue.additionalInfo?.description as string | undefined) ?? '',
      customProperties: queue.additionalInfo?.customProperties ?? '',
      duplicateMsgToAllPartitions:
        queue.additionalInfo?.duplicateMsgToAllPartitions ?? false,
    },
  };
}

/**
 * Form values → wire body. On EDIT the snapshot rides along (id/createdTime
 * survive; name/topic stay the stored immutable ones) — the save response
 * of a rule-engine save is an EMPTY body, so the page never parses it.
 */
export function toQueuePayload(
  snapshot: Queue | undefined,
  values: QueueFormValues,
): Queue {
  const base: Queue = {
    ...(snapshot as Queue),
    name: values.name,
    topic: deriveQueueTopic(values.name),
    pollInterval: values.pollInterval,
    partitions: values.partitions,
    consumerPerPartition: values.consumerPerPartition,
    packProcessingTimeout: values.packProcessingTimeout,
    submitStrategy: {
      ...values.submitStrategy,
      // batchSize only means something for BATCH; keep the constant default
      // on the wire for the other strategies (server default).
      batchSize:
        values.submitStrategy.type === 'BATCH'
          ? values.submitStrategy.batchSize
          : 1000,
    },
    processingStrategy: values.processingStrategy,
    additionalInfo: values.additionalInfo,
  };
  if (!snapshot) {
    // Create: no id/createdTime — the backend mints them.
    const { id: _id, createdTime: _createdTime, ...draft } = base;
    return draft as Queue;
  }
  return base;
}
