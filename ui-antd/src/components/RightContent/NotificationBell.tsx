/**
 * Header notification bell (ui-ngx notification-bell + show-notification-
 * popover parity): unread badge from the NOTIFICATIONS WS stream, click-open
 * 400px popover with the latest 6 entries, mark-read via REST (the server
 * then pushes a WS full snapshot, so badge and list self-heal) and a
 * view-all jump into the inbox page.
 *
 * One `subscribeNotifications({ limit: 6 })` stream feeds both the badge and
 * the popover — the ws-manager keeps WS data out of the query client, and the
 * snapshot merge lives in notification-feed.ts. Unlike ui-ngx we do NOT pause
 * the count subscription while the popover is open (spec §4.7 registers the
 * pause as an optional power-saving nicety, not a gate). Hidden until signed
 * in (same gate as AvatarDropdown).
 */
import { BellOutlined } from '@ant-design/icons';
import { history, useIntl, useModel } from '@umijs/max';
import { App, Badge, Button, Divider, Empty, Popover, Spin } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { serverErrorText } from '@/components/entities/server-error-text';
import {
  applyNotificationsSnapshot,
  EMPTY_NOTIFICATIONS_FEED,
  type NotificationsFeedState,
} from '@/components/notifications/notification-feed';
import { NotificationItem } from '@/components/notifications/notification-item';
import { getDefaultWsManager } from '@/core/ws/hooks';
import {
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '@/services/tb/notification';
import type { TbNotification } from '@/types/tb/notification';
import useHeaderActionStyles from './style';

/** Popover window size (ui-ngx: limit 6, width 400px). */
const FEED_LIMIT = 6;
const POPOVER_WIDTH = 400;

/**
 * Live NOTIFICATIONS feed: one WS subscription, snapshot merged into local
 * state through the pure reducer (use-global-alarm-data pattern — never
 * merge inside getSnapshot).
 */
function useNotificationFeed(limit: number): NotificationsFeedState {
  const manager = getDefaultWsManager();
  const subscription = useMemo(
    () => manager.subscribeNotifications({ limit }),
    [manager, limit],
  );
  useEffect(
    () => () => {
      subscription.unsubscribe();
    },
    [subscription],
  );

  const [state, setState] = useState<NotificationsFeedState>(
    EMPTY_NOTIFICATIONS_FEED,
  );
  useEffect(() => {
    const update = () =>
      setState((previous) =>
        applyNotificationsSnapshot(previous, subscription.getSnapshot(), limit),
      );
    update();
    return subscription.subscribe(update);
  }, [subscription, limit]);
  return state;
}

export const NotificationBell: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const { formatMessage } = useIntl();
  const { styles } = useHeaderActionStyles();
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const feed = useNotificationFeed(FEED_LIMIT);

  if (!initialState?.currentUser) {
    return null;
  }

  const title = formatMessage({
    id: 'pages.notifications.bell.title',
    defaultMessage: 'Notifications',
  });

  const markRead = async (notification: TbNotification) => {
    try {
      // REST read → server pushes a WS full snapshot → feed self-heals.
      await markNotificationAsRead(notification.id.id);
    } catch (error) {
      void message.error(serverErrorText(error));
    }
  };

  const markAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
    } catch (error) {
      void message.error(serverErrorText(error));
    }
  };

  const viewAll = () => {
    setOpen(false);
    history.push('/notifications/inbox');
  };

  const hasItems = feed.items.length > 0;

  const content = (
    <div
      className="flex flex-col"
      style={{ maxHeight: '70vh', overflow: 'auto' }}
      data-testid="notification-bell-popover"
    >
      <div className="flex items-center justify-between px-3 pt-2 pb-1">
        <span style={{ fontWeight: 500, letterSpacing: 0.25 }}>{title}</span>
        {feed.totalUnreadCount > 0 && (
          <Button
            type="link"
            size="small"
            data-testid="notification-bell-mark-all"
            onClick={() => void markAllRead()}
          >
            {formatMessage({
              id: 'pages.notifications.bell.markAllAsRead',
              defaultMessage: 'Mark all as read',
            })}
          </Button>
        )}
      </div>
      <Divider style={{ margin: 0 }} />
      {!feed.loaded ? (
        <div
          className="flex flex-col items-center gap-4 py-8"
          data-testid="notification-bell-loading"
        >
          <Spin />
          <span className="text-secondary">
            {formatMessage({
              id: 'pages.notifications.bell.loading',
              defaultMessage: 'Loading notifications…',
            })}
          </span>
        </div>
      ) : !hasItems ? (
        <div
          className="flex flex-col items-center gap-2 py-8"
          data-testid="notification-bell-empty"
        >
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={false} />
          <span>
            {formatMessage({
              id: 'pages.notifications.bell.empty',
              defaultMessage: 'No notifications yet',
            })}
          </span>
        </div>
      ) : (
        <>
          <div style={{ padding: '6px 0' }}>
            {feed.items.map((notification, index) => (
              <div key={notification.id.id}>
                <NotificationItem
                  notification={notification}
                  onMarkRead={(target) => void markRead(target)}
                  onNavigateAway={() => setOpen(false)}
                  testId={`notification-bell-item-${index}`}
                />
                {index < feed.items.length - 1 && (
                  <Divider style={{ margin: 4 }} />
                )}
              </div>
            ))}
          </div>
          <Divider style={{ margin: 0 }} />
          <Button
            type="link"
            block
            data-testid="notification-bell-view-all"
            onClick={viewAll}
          >
            {formatMessage({
              id: 'pages.notifications.bell.viewAll',
              defaultMessage: 'View all',
            })}
          </Button>
        </>
      )}
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      placement="bottomRight"
      arrow
      open={open}
      onOpenChange={setOpen}
      styles={{ root: { width: POPOVER_WIDTH, maxWidth: '90vw' } }}
    >
      <Badge
        count={feed.totalUnreadCount}
        overflowCount={99}
        data-testid="notification-bell-badge"
      >
        <Button
          type="text"
          className={styles.action}
          aria-label={title}
          title={title}
          data-testid="notification-bell-trigger"
        >
          <BellOutlined />
        </Button>
      </Badge>
    </Popover>
  );
};
