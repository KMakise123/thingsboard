/**
 * NotificationItem tests: icon branches (custom template icon > per-type
 * icon > none), action-button LINK vs DASHBOARD navigation (with the
 * base64 state deep-link), the unread mark-read affordance and the
 * sanitizer pass on template HTML.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { createIntl, RawIntlProvider } from 'react-intl';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { base64ToObj } from '@/core/dashboard/states';
import zhDevicesDetail from '@/locales/zh-CN/devices/detail';
import zhBell from '@/locales/zh-CN/notifications/bell';
import { AlarmSeverity, EntityType } from '@/types/tb';
import {
  NotificationStatus,
  NotificationType,
  type TbNotification,
} from '@/types/tb/notification';

const historyMock = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('@umijs/max', () => ({ history: historyMock }));

import { NotificationItem } from './notification-item';

const intl = createIntl({
  locale: 'zh-CN',
  messages: { ...zhBell, ...zhDevicesDetail },
});

function wrap(node: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <RawIntlProvider value={intl}>{node}</RawIntlProvider>
    </QueryClientProvider>
  );
}

function renderItem(node: ReactNode) {
  return render(wrap(node));
}

function baseNotification(extra: Partial<TbNotification> = {}): TbNotification {
  return {
    id: { entityType: EntityType.NOTIFICATION, id: 'notif-1' },
    createdTime: 1_700_000_000_000,
    type: NotificationType.GENERAL,
    status: NotificationStatus.SENT,
    subject: 'Hello <b>world</b>',
    text: 'Body text',
    ...extra,
  };
}

describe('NotificationItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  it('renders subject/text through the sanitizer (script stripped)', () => {
    renderItem(
      <NotificationItem
        notification={baseNotification({
          subject: 'Title <script>alert(1)</script><b>B</b>',
          text: 'Body <img src=x onerror="alert(2)">ok',
        })}
        now={1_700_000_000_000}
      />,
    );
    expect(screen.getByTestId('notification-title').innerHTML).toContain(
      '<b>B</b>',
    );
    expect(screen.getByTestId('notification-title').innerHTML).not.toContain(
      '<script',
    );
    const message = screen.getByTestId('notification-message');
    expect(message.innerHTML).toContain('ok');
    expect(message.innerHTML).not.toContain('onerror');
    expect(message.querySelector('img')).not.toBeNull();
  });

  it('renders no icon for iconless types and a type icon for ALARM', () => {
    const view = renderItem(
      <NotificationItem notification={baseNotification()} />,
    );
    expect(document.querySelector('.anticon')).toBeNull();

    view.rerender(
      wrap(
        <NotificationItem
          notification={baseNotification({ type: NotificationType.ALARM })}
        />,
      ),
    );
    expect(document.querySelector('.anticon-warning')).not.toBeNull();
  });

  it('resolves a custom template icon and its color over the type icon', () => {
    renderItem(
      <NotificationItem
        notification={baseNotification({
          type: NotificationType.ALARM,
          additionalConfig: {
            icon: { enabled: true, icon: 'warning', color: '#ff0000' },
          },
        })}
      />,
    );
    const icon = document.querySelector<HTMLElement>('.anticon-warning');
    expect(icon).not.toBeNull();
    // The configured template color wins over the severity accent.
    expect(icon?.getAttribute('style')).toContain('#ff0000');
  });

  it('marks an active alarm with the severity chip and accent border', () => {
    renderItem(
      <NotificationItem
        notification={baseNotification({
          type: NotificationType.ALARM,
          info: { type: 'ALARM', alarmSeverity: AlarmSeverity.CRITICAL },
        })}
      />,
    );
    expect(screen.getByTestId('notification-severity')).toHaveTextContent(
      '紧急',
    );
    const item = screen.getByTestId('notification-item');
    expect(item.getAttribute('style')).toContain('border-left-color');
  });

  it('opens LINK action buttons in a new window', () => {
    renderItem(
      <NotificationItem
        notification={baseNotification({
          additionalConfig: {
            actionButtonConfig: {
              enabled: true,
              text: 'Open',
              linkType: 'LINK',
              link: 'https://example.com',
            },
            // The wire carries the full button config; the handwritten
            // type only names the flat keys (see notification-item.tsx).
          } as TbNotification['additionalConfig'],
        })}
      />,
    );
    fireEvent.click(screen.getByTestId('notification-action'));
    expect(window.open).toHaveBeenCalledWith(
      'https://example.com',
      '_blank',
      'noopener,noreferrer',
    );
    expect(historyMock.push).not.toHaveBeenCalled();
  });

  it('navigates DASHBOARD action buttons in-app with the base64 state', () => {
    renderItem(
      <NotificationItem
        notification={baseNotification({
          info: {
            type: 'ALARM',
            stateEntityId: { entityType: EntityType.DEVICE, id: 'dev-1' },
          },
          additionalConfig: {
            actionButtonConfig: {
              enabled: true,
              text: 'View',
              linkType: 'DASHBOARD',
              dashboardId: 'dash-1',
              dashboardState: 'alarm-state',
              setEntityIdInState: true,
            },
          } as TbNotification['additionalConfig'],
        })}
      />,
    );
    fireEvent.click(screen.getByTestId('notification-action'));
    expect(historyMock.push).toHaveBeenCalledTimes(1);
    const link = historyMock.push.mock.calls[0][0] as string;
    expect(link.startsWith('/dashboards/dash-1?state=')).toBe(true);
    const raw = link.split('?state=')[1];
    const state = base64ToObj(decodeURIComponent(raw));
    expect(state).toEqual([
      {
        id: 'alarm-state',
        params: { entityId: { entityType: 'DEVICE', id: 'dev-1' } },
      },
    ]);
  });

  it('shows the mark-read affordance only while unread', () => {
    const onMarkRead = vi.fn();
    const view = renderItem(
      <NotificationItem
        notification={baseNotification()}
        onMarkRead={onMarkRead}
      />,
    );
    expect(screen.getByTestId('notification-mark-read')).not.toBeNull();
    fireEvent.click(screen.getByTestId('notification-mark-read'));
    expect(onMarkRead).toHaveBeenCalledTimes(1);

    view.rerender(
      wrap(
        <NotificationItem
          notification={baseNotification({ status: NotificationStatus.READ })}
          onMarkRead={onMarkRead}
        />,
      ),
    );
    expect(screen.queryByTestId('notification-mark-read')).toBeNull();
  });
});
