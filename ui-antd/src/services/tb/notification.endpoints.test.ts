/**
 * TB-notification transport endpoints. Paths pinned against
 * NotificationController/NotificationRuleController/NotificationTargetController/
 * NotificationTemplateController (verified 2026-09-05); the unread count
 * always sends deliveryMethod=WEB (server default is MOBILE_APP); set-valued
 * query params are comma-joined.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  NotificationDeliveryMethod,
  NotificationType,
  SlackConversationType,
  type NotificationRequest,
  type NotificationSettings,
} from '@/types/tb/notification';
import { EntityType } from '@/types/tb';

import { tbHttp } from './http';

vi.mock('./http', () => ({
  tbHttp: {
    request: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import {
  deleteNotification,
  deleteNotificationRequest,
  deleteNotificationRule,
  deleteNotificationTarget,
  deleteNotificationTemplate,
  getAvailableDeliveryMethods,
  getNotificationRequestById,
  getNotificationRequestPreview,
  getNotificationRequests,
  getNotificationRuleById,
  getNotificationRules,
  getNotificationSettings,
  getNotificationTargetById,
  getNotificationTargetRecipients,
  getNotificationTargets,
  getNotificationTargetsByIds,
  getNotificationTargetsByNotificationType,
  getNotificationTemplateById,
  getNotificationTemplates,
  getNotifications,
  getSlackConversations,
  getUnreadNotificationsCount,
  getUserNotificationSettings,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  requestEntitiesLimitIncrease,
  saveNotificationRule,
  saveNotificationSettings,
  saveNotificationTarget,
  saveNotificationTemplate,
  saveUserNotificationSettings,
  sendNotificationRequest,
} from './notification';

const get = vi.mocked(tbHttp.get);
const post = vi.mocked(tbHttp.post);
const put = vi.mocked(tbHttp.put);
const del = vi.mocked(tbHttp.delete);

const PAGE_LINK = {
  pageSize: 20,
  page: 3,
  textSearch: 'notif',
  sortOrder: { property: 'createdTime', direction: 'DESC' as const },
};

describe('notification transport endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({} as never);
    post.mockResolvedValue({} as never);
    put.mockResolvedValue(undefined as never);
    del.mockResolvedValue(undefined as never);
  });

  it('lists the inbox with unreadOnly and an explicit WEB delivery method', async () => {
    await getNotifications(PAGE_LINK, { unreadOnly: true });
    expect(get).toHaveBeenCalledWith('/api/notifications', {
      pageSize: 20,
      page: 3,
      textSearch: 'notif',
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
      unreadOnly: true,
      deliveryMethod: 'WEB',
    });
  });

  it('passes a custom delivery method to the inbox listing', async () => {
    await getNotifications({ ...PAGE_LINK, textSearch: undefined }, {
      deliveryMethod: NotificationDeliveryMethod.MOBILE_APP,
    });
    expect(get).toHaveBeenCalledWith('/api/notifications', {
      pageSize: 20,
      page: 3,
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
      unreadOnly: undefined,
      deliveryMethod: 'MOBILE_APP',
    });
  });

  it('always sends deliveryMethod=WEB on the unread count (server default is MOBILE_APP)', async () => {
    await getUnreadNotificationsCount();
    expect(get).toHaveBeenCalledWith('/api/notifications/unread/count', {
      deliveryMethod: 'WEB',
    });

    await getUnreadNotificationsCount(NotificationDeliveryMethod.MOBILE_APP);
    expect(get).toHaveBeenLastCalledWith('/api/notifications/unread/count', {
      deliveryMethod: 'MOBILE_APP',
    });
  });

  it('marks one entry read over PUT and all over PUT with a delivery query', async () => {
    await markNotificationAsRead('n-1');
    expect(put).toHaveBeenCalledWith('/api/notification/n-1/read');

    await markAllNotificationsAsRead();
    expect(put).toHaveBeenCalledWith('/api/notifications/read', undefined, {
      deliveryMethod: 'WEB',
    });
  });

  it('deletes an inbox entry', async () => {
    await deleteNotification('n-1');
    expect(del).toHaveBeenCalledWith('/api/notification/n-1');
  });

  it('sends a notification request on POST /api/notification/request', async () => {
    const request: NotificationRequest = {
      id: { entityType: EntityType.NOTIFICATION_REQUEST, id: 'req-1' },
      createdTime: 0,
      targets: ['t-1', 't-2'],
      templateId: { entityType: EntityType.NOTIFICATION_TEMPLATE, id: 'tpl-1' },
    };
    await sendNotificationRequest(request);
    expect(post).toHaveBeenCalledWith('/api/notification/request', request);
  });

  it('posts the preview with the recipientsPreviewSize query', async () => {
    const request: NotificationRequest = {
      id: { entityType: EntityType.NOTIFICATION_REQUEST, id: 'req-1' },
      createdTime: 0,
      targets: ['t-1'],
    };
    await getNotificationRequestPreview(request, 50);
    expect(post).toHaveBeenCalledWith(
      '/api/notification/request/preview',
      request,
      { recipientsPreviewSize: 50 },
    );

    await getNotificationRequestPreview(request);
    expect(post).toHaveBeenLastCalledWith(
      '/api/notification/request/preview',
      request,
      { recipientsPreviewSize: 20 },
    );
  });

  it('reads and lists notification requests over the info endpoints', async () => {
    await getNotificationRequestById('req-1');
    expect(get).toHaveBeenCalledWith('/api/notification/request/req-1');

    await getNotificationRequests(PAGE_LINK);
    expect(get).toHaveBeenCalledWith('/api/notification/requests', {
      pageSize: 20,
      page: 3,
      textSearch: 'notif',
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
    });

    await deleteNotificationRequest('req-1');
    expect(del).toHaveBeenCalledWith('/api/notification/request/req-1');
  });

  it('requests an entities-limit increase over the entityType path', async () => {
    await requestEntitiesLimitIncrease(EntityType.DEVICE);
    expect(post).toHaveBeenCalledWith(
      '/api/notification/entitiesLimitIncreaseRequest/DEVICE',
    );
  });

  it('saves and reads notification settings', async () => {
    const settings: NotificationSettings = {
      deliveryMethodsConfigs: {
        SLACK: { method: NotificationDeliveryMethod.SLACK, botToken: 'xoxb' },
      },
    };
    await saveNotificationSettings(settings);
    expect(post).toHaveBeenCalledWith('/api/notification/settings', settings);

    await getNotificationSettings();
    expect(get).toHaveBeenCalledWith('/api/notification/settings');
  });

  it('reads available delivery methods and per-user prefs', async () => {
    await getAvailableDeliveryMethods();
    expect(get).toHaveBeenCalledWith('/api/notification/deliveryMethods');

    const prefs = { prefs: { ALARM: { enabledDeliveryMethods: {} } } };
    await saveUserNotificationSettings(prefs);
    expect(post).toHaveBeenCalledWith('/api/notification/settings/user', prefs);

    await getUserNotificationSettings();
    expect(get).toHaveBeenCalledWith('/api/notification/settings/user');
  });

  it('saves/reads/deletes rules over /api/notification/rule*', async () => {
    const rule = { name: 'r', enabled: true } as never;
    await saveNotificationRule(rule);
    expect(post).toHaveBeenCalledWith('/api/notification/rule', rule);

    await getNotificationRuleById('rule-1');
    expect(get).toHaveBeenCalledWith('/api/notification/rule/rule-1');

    await getNotificationRules(PAGE_LINK);
    expect(get).toHaveBeenCalledWith('/api/notification/rules', {
      pageSize: 20,
      page: 3,
      textSearch: 'notif',
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
    });

    await deleteNotificationRule('rule-1');
    expect(del).toHaveBeenCalledWith('/api/notification/rule/rule-1');
  });

  it('saves/reads/deletes targets and resolves recipients with body + paged query', async () => {
    const target = {
      name: 'ops',
      configuration: { type: 'PLATFORM_USERS', usersFilter: { type: 'ALL_USERS' } },
    } as never;
    await saveNotificationTarget(target);
    expect(post).toHaveBeenCalledWith('/api/notification/target', target);

    await getNotificationTargetById('t-1');
    expect(get).toHaveBeenCalledWith('/api/notification/target/t-1');

    await getNotificationTargetRecipients(target, PAGE_LINK);
    expect(post).toHaveBeenCalledWith(
      '/api/notification/target/recipients',
      target,
      {
        pageSize: 20,
        page: 3,
        textSearch: 'notif',
        sortProperty: 'createdTime',
        sortOrder: 'DESC',
      },
    );

    await deleteNotificationTarget('t-1');
    expect(del).toHaveBeenCalledWith('/api/notification/target/t-1');
  });

  it('lists targets paged, by exact ids (comma-joined) and by notification type path', async () => {
    await getNotificationTargets(PAGE_LINK);
    expect(get).toHaveBeenCalledWith('/api/notification/targets', {
      pageSize: 20,
      page: 3,
      textSearch: 'notif',
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
    });

    await getNotificationTargetsByIds(['a', 'b', 'c']);
    expect(get).toHaveBeenCalledWith('/api/notification/targets/list', {
      ids: 'a,b,c',
    });

    await getNotificationTargetsByNotificationType(
      NotificationType.ENTITIES_LIMIT,
      PAGE_LINK,
    );
    expect(get).toHaveBeenCalledWith(
      '/api/notification/targets/notificationType/ENTITIES_LIMIT',
      {
        pageSize: 20,
        page: 3,
        textSearch: 'notif',
        sortProperty: 'createdTime',
        sortOrder: 'DESC',
      },
    );
  });

  it('saves/reads/deletes templates over /api/notification/template*', async () => {
    const template = { name: 't', notificationType: 'GENERAL' } as never;
    await saveNotificationTemplate(template);
    expect(post).toHaveBeenCalledWith('/api/notification/template', template);

    await getNotificationTemplateById('tpl-1');
    expect(get).toHaveBeenCalledWith('/api/notification/template/tpl-1');

    await deleteNotificationTemplate('tpl-1');
    expect(del).toHaveBeenCalledWith('/api/notification/template/tpl-1');
  });

  it('filters templates by notificationTypes joined into one param', async () => {
    await getNotificationTemplates(PAGE_LINK, [
      NotificationType.GENERAL,
      NotificationType.ALARM,
    ]);
    expect(get).toHaveBeenCalledWith('/api/notification/templates', {
      pageSize: 20,
      page: 3,
      textSearch: 'notif',
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
      notificationTypes: 'GENERAL,ALARM',
    });

    await getNotificationTemplates(PAGE_LINK);
    expect(get).toHaveBeenLastCalledWith('/api/notification/templates', {
      pageSize: 20,
      page: 3,
      textSearch: 'notif',
      sortProperty: 'createdTime',
      sortOrder: 'DESC',
      notificationTypes: undefined,
    });
  });

  it('lists slack conversations with the type and optional token', async () => {
    await getSlackConversations(SlackConversationType.DIRECT, 'xoxb-1');
    expect(get).toHaveBeenCalledWith('/api/notification/slack/conversations', {
      type: 'DIRECT',
      token: 'xoxb-1',
    });

    await getSlackConversations(SlackConversationType.PRIVATE_CHANNEL);
    expect(get).toHaveBeenLastCalledWith(
      '/api/notification/slack/conversations',
      { type: 'PRIVATE_CHANNEL', token: undefined },
    );
  });
});
