/**
 * Queue conversion unit tests (M14 wave-3, R26/R34-3): topic derivation,
 * create-vs-edit payload shape, Main-queue guard.
 */
import { describe, expect, it } from 'vitest';
import type { Queue } from '@/types/tb/queue';
import {
  defaultQueueFormValues,
  deriveQueueTopic,
  isMainQueue,
  toQueueFormValues,
  toQueuePayload,
} from './data';

function storedQueue(): Queue {
  return {
    id: { entityType: 'QUEUE', id: 'q-1' },
    createdTime: 1_700_000_000_000,
    tenantId: { entityType: 'TENANT', id: 't-1' },
    name: 'Main',
    topic: 'tb_rule_engine.Main',
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
    additionalInfo: { description: 'stock', duplicateMsgToAllPartitions: false },
  };
}

describe('deriveQueueTopic', () => {
  it('derives tb_rule_engine.{name} (name changes re-derive)', () => {
    expect(deriveQueueTopic('Main')).toBe('tb_rule_engine.Main');
    expect(deriveQueueTopic('m14-wave3-test')).toBe(
      'tb_rule_engine.m14-wave3-test',
    );
  });
});

describe('isMainQueue', () => {
  it('gates only the exact Main name', () => {
    expect(isMainQueue({ name: 'Main' })).toBe(true);
    expect(isMainQueue({ name: 'main' })).toBe(false);
    expect(isMainQueue({ name: 'Edge' })).toBe(false);
  });
});

describe('toQueuePayload', () => {
  it('create payload carries NO id/createdTime (backend mints them)', () => {
    const values: ReturnType<typeof defaultQueueFormValues> = {
      ...defaultQueueFormValues(),
      name: 'm14-wave3-test',
    };
    const payload = toQueuePayload(undefined, values);
    expect(payload).not.toHaveProperty('id');
    expect(payload).not.toHaveProperty('createdTime');
    expect(payload.name).toBe('m14-wave3-test');
    expect(payload.topic).toBe('tb_rule_engine.m14-wave3-test');
  });

  it('edit payload keeps the snapshot identity and non-BATCH keeps batchSize 1000', () => {
    const snapshot = storedQueue();
    const values = {
      ...toQueueFormValues(snapshot),
      submitStrategy: {
        type: 'SEQUENTIAL' as const,
        batchSize: 999,
      },
    };
    const payload = toQueuePayload(snapshot, values);
    expect(payload.id).toEqual(snapshot.id);
    expect(payload.createdTime).toBe(snapshot.createdTime);
    expect(payload.name).toBe('Main');
    expect(payload.topic).toBe('tb_rule_engine.Main');
    expect(payload.submitStrategy.batchSize).toBe(1000);
  });

  it('edit payload keeps the BATCH batchSize from the form', () => {
    const snapshot = storedQueue();
    const values = {
      ...toQueueFormValues(snapshot),
      submitStrategy: { type: 'BATCH' as const, batchSize: 500 },
    };
    expect(toQueuePayload(snapshot, values).submitStrategy.batchSize).toBe(500);
  });

  it('form round-trips through toQueueFormValues', () => {
    const snapshot = storedQueue();
    const values = toQueueFormValues(snapshot);
    expect(values.additionalInfo.description).toBe('stock');
    expect(values.processingStrategy.maxPauseBetweenRetries).toBe(3);
  });
});
