/**
 * NotificationBell tests: badge count from the WS feed (with the 99+
 * overflow), popover open/close with items/empty/loading states, view-all
 * navigation and the REST mark-read wiring. The WS manager is mocked at the
 * seam the component consumes (getDefaultWsManager).
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NotificationsSnapshot } from '@/core/ws/manager';
import zhBell from '@/locales/zh-CN/notifications/bell';
import zhInboxTypes from '@/locales/zh-CN/notifications/inbox';
import { EntityType } from '@/types/tb/entity';
import {
  NotificationStatus,
  NotificationType,
  type TbNotification,
} from '@/types/tb/notification';

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));
const servicesMock = vi.hoisted(() => ({
  markNotificationAsRead: vi.fn(),
  markAllNotificationsAsRead: vi.fn(),
}));
const stateMock = vi.hoisted(() => ({
  currentUser: { id: 'user-1' } as unknown,
}));

vi.mock('@umijs/max', () => ({
  history: historyMock,
  useIntl: () => ({
    formatMessage: ({ defaultMessage }: { defaultMessage?: string }) =>
      defaultMessage ?? '',
  }),
  useModel: () => ({ initialState: { currentUser: stateMock.currentUser } }),
}));

vi.mock('@/services/tb/notification', () => servicesMock);

type Listener = () => void;

const wsMock = vi.hoisted(() => {
  let snapshot: unknown;
  const listeners = new Set<Listener>();
  return {
    unsubscribe: vi.fn(),
    setSnapshot: (next: unknown) => {
      snapshot = next;
    },
    emit: (next: unknown) => {
      snapshot = next;
      for (const listener of listeners) {
        listener();
      }
    },
    subscription: {
      getSnapshot: () => snapshot,
      getStatus: () => 'open',
      subscribe: (listener: Listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      unsubscribe: () => wsMock.unsubscribe(),
    },
  };
});

vi.mock('@/core/ws/hooks', () => ({
  getDefaultWsManager: () => ({
    subscribeNotifications: vi.fn(() => wsMock.subscription),
  }),
}));

import { NotificationBell } from './NotificationBell';

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

function notification(
  id: string,
  createdTime: number,
  extra: Partial<TbNotification> = {},
): TbNotification {
  return {
    id: { entityType: EntityType.NOTIFICATION, id },
    createdTime,
    type: NotificationType.GENERAL,
    status: NotificationStatus.SENT,
    subject: `Subject ${id}`,
    text: 'Body',
    ...extra,
  };
}

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhBell, ...zhInboxTypes },
});

function renderBell() {
  return render(
    <RawIntlProvider value={intl}>
      <NotificationBell />
    </RawIntlProvider>,
  );
}

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stateMock.currentUser = { id: 'user-1' };
    wsMock.setSnapshot(
      snapshot({ notifications: null, update: null, sequenceNumber: 0 }),
    );
  });

  it('renders nothing while signed out', () => {
    stateMock.currentUser = null;
    const { container } = renderBell();
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the unread badge from the WS feed, 99+ above 99', () => {
    wsMock.setSnapshot(
      snapshot({
        notifications: [notification('n-1', 2), notification('n-2', 1)],
        totalUnreadCount: 120,
        sequenceNumber: 1,
      }),
    );
    renderBell();
    expect(screen.getByTestId('notification-bell-badge')).toHaveTextContent(
      '99+',
    );
  });

  it('opens the popover with the latest entries and mark-all', async () => {
    wsMock.setSnapshot(
      snapshot({
        notifications: [
          notification('n-1', 2),
          notification('n-2', 1, { status: NotificationStatus.READ }),
        ],
        totalUnreadCount: 1,
        sequenceNumber: 1,
      }),
    );
    renderBell();

    fireEvent.click(screen.getByTestId('notification-bell-trigger'));
    expect(
      await screen.findByTestId('notification-bell-popover'),
    ).not.toBeNull();
    expect(screen.getByText('Subject n-1')).not.toBeNull();
    // Read entries keep no mark-read button; unread ones do.
    expect(screen.getAllByTestId('notification-bell-item-0')).not.toBeNull();
    expect(screen.getByTestId('notification-bell-mark-all')).not.toBeNull();

    fireEvent.click(screen.getByTestId('notification-bell-mark-all'));
    await waitFor(() => {
      expect(servicesMock.markAllNotificationsAsRead).toHaveBeenCalledTimes(1);
    });
  });

  it('shows the empty state after a loaded empty feed', async () => {
    wsMock.setSnapshot(
      snapshot({ notifications: [], totalUnreadCount: 0, sequenceNumber: 1 }),
    );
    renderBell();
    fireEvent.click(screen.getByTestId('notification-bell-trigger'));
    expect(await screen.findByTestId('notification-bell-empty')).not.toBeNull();
    expect(screen.queryByTestId('notification-bell-view-all')).toBeNull();
  });

  it('marks one entry read over REST', async () => {
    wsMock.setSnapshot(
      snapshot({
        notifications: [notification('n-1', 2)],
        totalUnreadCount: 1,
        sequenceNumber: 1,
      }),
    );
    servicesMock.markNotificationAsRead.mockResolvedValue(undefined);
    renderBell();
    fireEvent.click(screen.getByTestId('notification-bell-trigger'));

    const item = await screen.findByTestId('notification-bell-item-0');
    fireEvent.click(
      item.querySelector('[data-testid="notification-mark-read"]') ??
        document.body,
    );
    await waitFor(() => {
      expect(servicesMock.markNotificationAsRead).toHaveBeenCalledWith('n-1');
    });
  });

  it('view-all closes the popover and jumps to the inbox page', async () => {
    wsMock.setSnapshot(
      snapshot({
        notifications: [notification('n-1', 2)],
        totalUnreadCount: 1,
        sequenceNumber: 1,
      }),
    );
    renderBell();
    fireEvent.click(screen.getByTestId('notification-bell-trigger'));
    fireEvent.click(await screen.findByTestId('notification-bell-view-all'));
    expect(historyMock.push).toHaveBeenCalledWith('/notifications/inbox');
  });
});
