/**
 * Pure merge tests for the NOTIFICATIONS WS feed (bell): full-snapshot
 * replacement, single-update upsert (replace-by-id), count-only bumps,
 * sequence dedupe and the limit cap.
 */
import { describe, expect, it } from 'vitest';
import type { NotificationsSnapshot } from '@/core/ws/manager';
import { EntityType } from '@/types/tb/entity';
import {
  NotificationStatus,
  NotificationType,
  type TbNotification,
} from '@/types/tb/notification';
import {
  applyNotificationsSnapshot,
  EMPTY_NOTIFICATIONS_FEED,
} from './notification-feed';

let nextId = 0;

function notification(
  createdTime: number,
  extra: Partial<TbNotification> = {},
): TbNotification {
  nextId += 1;
  return {
    id: { entityType: EntityType.NOTIFICATION, id: `n-${nextId}` },
    createdTime,
    type: NotificationType.GENERAL,
    status: NotificationStatus.SENT,
    ...extra,
  };
}

function snapshot(
  fields: Partial<NotificationsSnapshot>,
): NotificationsSnapshot {
  return {
    notifications: null,
    update: null,
    totalUnreadCount: 0,
    sequenceNumber: 1,
    errorCode: 0,
    errorMsg: '',
    ...fields,
  };
}

describe('applyNotificationsSnapshot', () => {
  it('replaces the whole list on a full snapshot and marks the feed loaded', () => {
    const a = notification(3);
    const b = notification(4);
    const next = applyNotificationsSnapshot(
      EMPTY_NOTIFICATIONS_FEED,
      snapshot({
        notifications: [a, b],
        totalUnreadCount: 2,
        sequenceNumber: 1,
      }),
      6,
    );
    expect(next.loaded).toBe(true);
    // Defensive: even a mis-ordered full snapshot normalizes newest-first.
    expect(next.items).toEqual([b, a]);
    expect(next.totalUnreadCount).toBe(2);
  });

  it('applies a single update as an upsert sorted newest-first', () => {
    const a = notification(1);
    const b = notification(2);
    const seed = applyNotificationsSnapshot(
      EMPTY_NOTIFICATIONS_FEED,
      snapshot({ notifications: [a, b], totalUnreadCount: 2 }),
      6,
    );
    const c = notification(3);
    const next = applyNotificationsSnapshot(
      seed,
      snapshot({ update: c, totalUnreadCount: 3, sequenceNumber: 2 }),
      6,
    );
    expect(next.items).toEqual([c, b, a]);
    expect(next.totalUnreadCount).toBe(3);
  });

  it('replaces an existing entry by id on an update', () => {
    const a = notification(1);
    const b = notification(2);
    const seed = applyNotificationsSnapshot(
      EMPTY_NOTIFICATIONS_FEED,
      snapshot({ notifications: [a, b], totalUnreadCount: 2 }),
      6,
    );
    const bRead = { ...b, status: NotificationStatus.READ };
    const next = applyNotificationsSnapshot(
      seed,
      snapshot({ update: bRead, totalUnreadCount: 1, sequenceNumber: 2 }),
      6,
    );
    expect(next.items).toEqual([bRead, a]);
  });

  it('keeps items untouched on a count-only message', () => {
    const a = notification(1);
    const seed = applyNotificationsSnapshot(
      EMPTY_NOTIFICATIONS_FEED,
      snapshot({ notifications: [a], totalUnreadCount: 1 }),
      6,
    );
    // The manager snapshot is cumulative: a count-only message leaves the
    // previous array reference in place — it must NOT re-replace items.
    const next = applyNotificationsSnapshot(
      seed,
      snapshot({ notifications: [a], totalUnreadCount: 0, sequenceNumber: 2 }),
      6,
    );
    expect(next.items).toEqual([a]);
    expect(next.totalUnreadCount).toBe(0);
  });

  it('applies an update after a partial without reverting to the stale array', () => {
    const a = notification(1);
    // The manager carries ONE array instance forward across partial/count
    // messages until a new full snapshot replaces it.
    const staleArray = [a];
    const seed = applyNotificationsSnapshot(
      EMPTY_NOTIFICATIONS_FEED,
      snapshot({ notifications: staleArray, totalUnreadCount: 1 }),
      6,
    );
    const b = notification(2);
    const withB = applyNotificationsSnapshot(
      seed,
      // Partial message: notifications field still carries the stale array.
      snapshot({
        notifications: staleArray,
        update: b,
        totalUnreadCount: 2,
        sequenceNumber: 2,
      }),
      6,
    );
    expect(withB.items).toEqual([b, a]);
    // A subsequent count-only bump must not roll [b, a] back to [a].
    const counted = applyNotificationsSnapshot(
      withB,
      snapshot({
        notifications: staleArray,
        totalUnreadCount: 1,
        sequenceNumber: 3,
      }),
      6,
    );
    expect(counted.items).toEqual([b, a]);
  });

  it('caps the window to the limit and ignores replayed sequences', () => {
    const old = [notification(1), notification(2)];
    const seed = applyNotificationsSnapshot(
      EMPTY_NOTIFICATIONS_FEED,
      snapshot({ notifications: old, totalUnreadCount: 2, sequenceNumber: 5 }),
      6,
    );
    // Same sequence again → the exact previous state object (no-op).
    expect(
      applyNotificationsSnapshot(
        seed,
        snapshot({ notifications: [], sequenceNumber: 5 }),
        6,
      ),
    ).toBe(seed);

    const fresh = [1, 2, 3, 4].map((ts) => notification(ts));
    const next = applyNotificationsSnapshot(
      seed,
      snapshot({
        notifications: fresh,
        totalUnreadCount: 4,
        sequenceNumber: 6,
      }),
      3,
    );
    expect(next.items).toHaveLength(3);
    expect(next.items.map((item) => item.createdTime)).toEqual([4, 3, 2]);
  });
});
