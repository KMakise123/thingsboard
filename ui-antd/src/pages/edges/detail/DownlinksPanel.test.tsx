/**
 * Downlinks pure-function tests (M13 wave-4): the queueStartTs-derived
 * status column (spec §5.4) — the `createdTime == queueStartTs` boundary
 * counts as Deployed (ngx isPending is strictly greater), a missing
 * queueStartTs behaves as 0, and payload-availability rules. The content
 * lookup resolves through the entity services with the body fallback.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EntityType } from '@/types/tb';
import type { EdgeEvent } from '@/types/tb/edge';
import { EdgeEventActionType, EdgeEventType } from '@/types/tb/edge';

const deviceMock = vi.hoisted(() => ({ getDeviceById: vi.fn() }));

vi.mock('@/services/tb/device', () => deviceMock);

import {
  deriveEdgeEventStatus,
  edgeEventHasData,
  isEdgeEventPending,
  lookupEdgeEventContent,
  queueStartTsFromAttributes,
} from './DownlinksPanel';

describe('deriveEdgeEventStatus', () => {
  it('marks everything before the watermark Deployed', () => {
    expect(deriveEdgeEventStatus(1_000, 2_000)).toBe('DEPLOYED');
    expect(isEdgeEventPending(1_000, 2_000)).toBe(false);
  });

  it('counts the == boundary as Deployed (ngx isPending is strict)', () => {
    expect(deriveEdgeEventStatus(2_000, 2_000)).toBe('DEPLOYED');
    expect(isEdgeEventPending(2_000, 2_000)).toBe(false);
  });

  it('marks everything after the watermark Pending', () => {
    expect(deriveEdgeEventStatus(2_001, 2_000)).toBe('PENDING');
    expect(isEdgeEventPending(2_001, 2_000)).toBe(true);
  });

  it('treats a missing queueStartTs as 0 (everything Pending)', () => {
    expect(queueStartTsFromAttributes([])).toBe(0);
    expect(deriveEdgeEventStatus(0, 0)).toBe('DEPLOYED');
    expect(deriveEdgeEventStatus(1, 0)).toBe('PENDING');
  });
});

describe('queueStartTsFromAttributes', () => {
  it('reads the numeric attribute value', () => {
    expect(
      queueStartTsFromAttributes([
        { key: 'other', value: 'x' },
        { key: 'queueStartTs', value: 1_700_000_000_000 },
      ]),
    ).toBe(1_700_000_000_000);
  });

  it('accepts a numeric string and rejects blanks / junk as 0', () => {
    expect(
      queueStartTsFromAttributes([{ key: 'queueStartTs', value: '1700' }]),
    ).toBe(1700);
    expect(
      queueStartTsFromAttributes([{ key: 'queueStartTs', value: '' }]),
    ).toBe(0);
    expect(
      queueStartTsFromAttributes([{ key: 'queueStartTs', value: 'soon' }]),
    ).toBe(0);
    expect(
      queueStartTsFromAttributes([{ key: 'queueStartTs', value: null }]),
    ).toBe(0);
  });
});

describe('edgeEventHasData', () => {
  it('hides the view entry for ADMIN_SETTINGS rows and deletes', () => {
    expect(
      edgeEventHasData({
        type: EdgeEventType.ADMIN_SETTINGS,
        action: EdgeEventActionType.UPDATED,
      }),
    ).toBe(false);
    expect(
      edgeEventHasData({
        type: EdgeEventType.DEVICE,
        action: EdgeEventActionType.DELETED,
      }),
    ).toBe(false);
    expect(
      edgeEventHasData({
        type: EdgeEventType.DEVICE,
        action: EdgeEventActionType.ADDED,
      }),
    ).toBe(true);
  });
});

describe('lookupEdgeEventContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function event(extra: Partial<EdgeEvent> = {}): EdgeEvent {
    return {
      seqId: 1,
      edgeId: { entityType: EntityType.EDGE, id: 'edge-1' },
      action: EdgeEventActionType.ADDED,
      type: EdgeEventType.QUEUE,
      entityId: 'dev-1',
      uid: 'u-1',
      body: { fallback: true },
      createdTime: 1,
      ...extra,
    } as EdgeEvent;
  }

  it('short-circuits body-carrying actions to the raw body', async () => {
    const content = await lookupEdgeEventContent(
      event({
        type: EdgeEventType.DEVICE,
        action: EdgeEventActionType.POST_ATTRIBUTES,
        body: { a: 1 },
      }),
    );
    expect(content).toEqual({ a: 1 });
    expect(deviceMock.getDeviceById).not.toHaveBeenCalled();
  });

  it('falls back to the body for types without a lookup', async () => {
    const content = await lookupEdgeEventContent(
      event({ type: EdgeEventType.QUEUE }),
    );
    expect(content).toEqual({ fallback: true });
  });

  it('re-reads the entity through the matching service otherwise', async () => {
    deviceMock.getDeviceById.mockResolvedValue({ name: 'dev' });
    const content = await lookupEdgeEventContent(
      event({ type: EdgeEventType.DEVICE }),
    );
    expect(deviceMock.getDeviceById).toHaveBeenCalledWith('dev-1');
    expect(content).toEqual({ name: 'dev' });
  });
});
