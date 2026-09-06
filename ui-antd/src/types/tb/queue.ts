/**
 * Queue wire types (handwritten, authoritative) — M14 wave-1.
 *
 * Modeled against common/data/src/main/java/org/thingsboard/server/common/
 * data/queue/*.java (Queue, SubmitStrategy, ProcessingStrategy + the two
 * type enums, read 2026-09-06). Note the two UX-facing extras ride inside
 * `additionalInfo`, not as top-level fields (Java Queue.getCustomProperties
 * / isDuplicateMsgToAllPartitions read them from there).
 */

import type {
  BaseData,
  EntityType,
  HasTenantIdAndCustomer,
} from './entity';

export type QueueSubmitStrategyType =
  | 'BURST'
  | 'BATCH'
  | 'SEQUENTIAL_BY_ORIGINATOR'
  | 'SEQUENTIAL_BY_TENANT'
  | 'SEQUENTIAL';

export type QueueProcessingStrategyType =
  | 'SKIP_ALL_FAILURES'
  | 'SKIP_ALL_FAILURES_AND_TIMED_OUT'
  | 'RETRY_ALL'
  | 'RETRY_FAILED'
  | 'RETRY_TIMED_OUT'
  | 'RETRY_FAILED_AND_TIMED_OUT';

/** BATCH submit mode carries the batch size (min 1, default 1000). */
export interface QueueSubmitStrategy {
  type: QueueSubmitStrategyType;
  batchSize: number;
}

export interface QueueProcessingStrategy {
  type: QueueProcessingStrategyType;
  /** ≥ 0. */
  retries: number;
  /** 0..100. */
  failurePercentage: number;
  /** ≥ 0, ms. */
  pauseBetweenRetries: number;
  /** Server cross-checks: must be ≥ pauseBetweenRetries (400 otherwise). */
  maxPauseBetweenRetries: number;
}

/**
 * GET/POST /api/queues row (Java queue/Queue.java). Name and topic are
 * immutable after creation (update attempts 400). Wire `serviceType` is a
 * LIST/SAVE query param, not a field of this object.
 */
export interface Queue
  extends BaseData<{ entityType: EntityType.QUEUE; id: string }>,
    HasTenantIdAndCustomer {
  name: string;
  /** Derived from the name on the wire: `tb_rule_engine.{name}`. */
  topic: string;
  /** ms between polls (default 25). */
  pollInterval: number;
  partitions: number;
  consumerPerPartition: boolean;
  /** ms (default 2000). */
  packProcessingTimeout: number;
  submitStrategy: QueueSubmitStrategy;
  processingStrategy: QueueProcessingStrategy;
  additionalInfo?: QueueAdditionalInfo;
}

export interface QueueAdditionalInfo {
  customProperties?: string;
  duplicateMsgToAllPartitions?: boolean;
  [key: string]: unknown;
}
