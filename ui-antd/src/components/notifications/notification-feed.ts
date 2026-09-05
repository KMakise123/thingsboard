/**
 * NOTIFICATIONS WS stream merge — the pure half of the bell's feed.
 *
 * Wire semantics (docs/agents/m12-backend-contract.md §3, verified against
 * DefaultNotificationCommandsHandler): every message carries exactly one of
 *   - `notifications` — FULL snapshot of the unread list (subscribe,
 *     reconnect, and every REST mark-read/mark-all/delete touching a tracked
 *     unread entry); a read entry simply drops out.
 *   - `update` — one created/changed entry (single increment, replace-by-id).
 *   - neither — unread-count-only bump.
 * The manager snapshot is cumulative (last full array + last single update),
 * so the consumer replays by sequenceNumber: each NEW sequence applies only
 * what that message carried (update wins, else full replace, else count).
 * Never write to the queryClient from here (manager red line).
 */
import type { NotificationsSnapshot } from '@/core/ws/manager';
import type { EntityIdOf, EntityType } from '@/types/tb/entity';
import type { TbNotification } from '@/types/tb/notification';

export interface NotificationsFeedState {
  /** True once at least one server message arrived (spinner gate). */
  loaded: boolean;
  /** Latest unread entries, createdTime DESC, capped to the window size. */
  items: Array<TbNotification>;
  totalUnreadCount: number;
  /** sequenceNumber of the last applied message (dedupe replay). */
  sequenceNumber: number;
  /**
   * Array reference of the last applied FULL snapshot. The manager snapshot
   * is cumulative — a partial/count message keeps the previous array — so a
   * reference comparison is what separates "a new full snapshot arrived"
   * from "this field is just stale".
   */
  fullNotifications: Array<TbNotification> | null;
}

export const EMPTY_NOTIFICATIONS_FEED: NotificationsFeedState = {
  loaded: false,
  items: [],
  totalUnreadCount: 0,
  sequenceNumber: 0,
  fullNotifications: null,
};

function notificationKey(notification: TbNotification): string {
  // Wire ids are {entityType, id}; guard the degenerate string form anyway
  // (same defensive read as the manager's entityIdKey).
  const id = notification.id as EntityIdOf<EntityType.NOTIFICATION> | string;
  return typeof id === 'string' ? id : id.id;
}

/** Upsert one entry (created/updated), keep newest-first, cap to `limit`. */
function upsert(
  items: Array<TbNotification>,
  entry: TbNotification,
  limit: number,
): Array<TbNotification> {
  const key = notificationKey(entry);
  const next = items.filter((item) => notificationKey(item) !== key);
  next.push(entry);
  return next
    .sort((a, b) => (b.createdTime ?? 0) - (a.createdTime ?? 0))
    .slice(0, limit);
}

export function applyNotificationsSnapshot(
  previous: NotificationsFeedState,
  snapshot: NotificationsSnapshot,
  limit: number,
): NotificationsFeedState {
  if (snapshot.sequenceNumber === previous.sequenceNumber) {
    return previous;
  }
  let items = previous.items;
  let fullNotifications = previous.fullNotifications;
  if (snapshot.update) {
    // Partial message: the snapshot's `notifications` field is the stale
    // previous array — apply the single entry instead.
    items = upsert(items, snapshot.update, limit);
  } else if (
    snapshot.notifications &&
    snapshot.notifications !== previous.fullNotifications
  ) {
    // A genuinely NEW full snapshot (fresh array instance on the wire).
    fullNotifications = snapshot.notifications;
    items = snapshot.notifications
      .slice()
      .sort((a, b) => (b.createdTime ?? 0) - (a.createdTime ?? 0))
      .slice(0, limit);
  }
  return {
    loaded: true,
    items,
    totalUnreadCount: snapshot.totalUnreadCount,
    sequenceNumber: snapshot.sequenceNumber,
    fullNotifications,
  };
}
