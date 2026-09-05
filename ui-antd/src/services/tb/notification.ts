/**
 * TB-notification transport (M12 wave 2).
 *
 * Endpoints verified against NotificationController / NotificationRuleController
 * / NotificationTargetController / NotificationTemplateController
 * (application/src/main/java/org/thingsboard/server/controller) — full table
 * in docs/agents/m12-backend-contract.md.
 *
 * Wire gotchas pinned here:
 *   - GET /api/notifications/unread/count defaults deliveryMethod to
 *     MOBILE_APP server-side: this layer always sends WEB unless the caller
 *     overrides it.
 *   - Page numbers are 0-based (server PageLink semantics, see ./page).
 *   - Set-valued query params (`notificationTypes`, `ids`) are comma-joined
 *     into a single param — Spring's collection binding splits them back,
 *     same as repeated params.
 */

import {
  NotificationDeliveryMethod,
  NotificationType,
  SlackConversationType,
  type NotificationRequest,
  type NotificationRequestPreview,
  type NotificationRequestInfo,
  type NotificationRule,
  type NotificationRuleInfo,
  type NotificationSettings,
  type NotificationTarget,
  type NotificationTemplate,
  type SlackConversation,
  type TbNotification,
  type UserNotificationSettings,
} from '@/types/tb/notification';
import { type EntityType, type User } from '@/types/tb';
import type { PageData, PageLink } from '@/types/tb/page';
import { pageLinkToQueryParams } from '@/types/tb/page';

import { tbHttp } from './http';

// ---------------------------------------------------------------------------
// Inbox (NotificationController, /api)
// ---------------------------------------------------------------------------

/**
 * GET /api/notifications — the paged inbox (WEB by default; only WEB and
 * MOBILE_APP are valid deliveryMethod values server-side).
 */
export async function getNotifications(
  pageLink: PageLink,
  options: {
    unreadOnly?: boolean;
    deliveryMethod?: NotificationDeliveryMethod;
  } = {},
): Promise<PageData<TbNotification>> {
  return tbHttp.get<PageData<TbNotification>>('/api/notifications', {
    ...pageLinkToQueryParams(pageLink),
    unreadOnly: options.unreadOnly,
    deliveryMethod: options.deliveryMethod ?? NotificationDeliveryMethod.WEB,
  });
}

/**
 * GET /api/notifications/unread/count — unread badge counter. The server
 * default here is MOBILE_APP, so WEB is always sent explicitly.
 */
export async function getUnreadNotificationsCount(
  deliveryMethod: NotificationDeliveryMethod = NotificationDeliveryMethod.WEB,
): Promise<number> {
  return tbHttp.get<number>('/api/notifications/unread/count', {
    deliveryMethod,
  });
}

/** PUT /api/notification/{id}/read — mark one inbox entry read. */
export async function markNotificationAsRead(id: string): Promise<void> {
  await tbHttp.put<void>(`/api/notification/${id}/read`);
}

/** PUT /api/notifications/read?deliveryMethod= — mark everything read. */
export async function markAllNotificationsAsRead(
  deliveryMethod: NotificationDeliveryMethod = NotificationDeliveryMethod.WEB,
): Promise<void> {
  await tbHttp.put<void>('/api/notifications/read', undefined, {
    deliveryMethod,
  });
}

/** DELETE /api/notification/{id} — remove one inbox entry. */
export async function deleteNotification(id: string): Promise<void> {
  await tbHttp.delete<void>(`/api/notification/${id}`);
}

// ---------------------------------------------------------------------------
// Send requests
// ---------------------------------------------------------------------------

/**
 * POST /api/notification/request — async dispatch; answers PROCESSING while
 * the server fans out (delivery failures land in the stats afterwards).
 */
export async function sendNotificationRequest(
  request: NotificationRequest,
): Promise<NotificationRequest> {
  return tbHttp.post<NotificationRequest>('/api/notification/request', request);
}

/**
 * POST /api/notification/request/preview?recipientsPreviewSize= — dry-run
 * rendering + recipient list for the send wizard review step.
 */
export async function getNotificationRequestPreview(
  request: NotificationRequest,
  recipientsPreviewSize = 20,
): Promise<NotificationRequestPreview> {
  return tbHttp.post<NotificationRequestPreview>(
    '/api/notification/request/preview',
    request,
    { recipientsPreviewSize },
  );
}

/** GET /api/notification/request/{id} — one sent request with stats. */
export async function getNotificationRequestById(
  id: string,
): Promise<NotificationRequestInfo> {
  return tbHttp.get<NotificationRequestInfo>(
    `/api/notification/request/${id}`,
  );
}

/** GET /api/notification/requests — paged sent-request list. */
export async function getNotificationRequests(
  pageLink: PageLink,
): Promise<PageData<NotificationRequestInfo>> {
  return tbHttp.get<PageData<NotificationRequestInfo>>(
    '/api/notification/requests',
    pageLinkToQueryParams(pageLink),
  );
}

/** DELETE /api/notification/request/{id} — forget a sent request. */
export async function deleteNotificationRequest(id: string): Promise<void> {
  await tbHttp.delete<void>(`/api/notification/request/${id}`);
}

/**
 * POST /api/notification/entitiesLimitIncreaseRequest/{entityType} — tenant
 * asks the sysadmin to raise the entity limit for one type.
 */
export async function requestEntitiesLimitIncrease(
  entityType: EntityType,
): Promise<void> {
  await tbHttp.post<void>(
    `/api/notification/entitiesLimitIncreaseRequest/${entityType}`,
  );
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

/** POST /api/notification/settings — sysadmin/tenant channel configuration. */
export async function saveNotificationSettings(
  settings: NotificationSettings,
): Promise<NotificationSettings> {
  return tbHttp.post<NotificationSettings>(
    '/api/notification/settings',
    settings,
  );
}

/** GET /api/notification/settings — unconfigured server answers `{ deliveryMethodsConfigs: {} }`. */
export async function getNotificationSettings(): Promise<NotificationSettings> {
  return tbHttp.get<NotificationSettings>('/api/notification/settings');
}

/** GET /api/notification/deliveryMethods — currently configured channels. */
export async function getAvailableDeliveryMethods(): Promise<
  Array<NotificationDeliveryMethod>
> {
  return tbHttp.get<Array<NotificationDeliveryMethod>>(
    '/api/notification/deliveryMethods',
  );
}

/** POST /api/notification/settings/user — per-user type × channel prefs. */
export async function saveUserNotificationSettings(
  settings: UserNotificationSettings,
): Promise<UserNotificationSettings> {
  return tbHttp.post<UserNotificationSettings>(
    '/api/notification/settings/user',
    settings,
  );
}

/** GET /api/notification/settings/user — defaults to all enabled when unset. */
export async function getUserNotificationSettings(): Promise<UserNotificationSettings> {
  return tbHttp.get<UserNotificationSettings>(
    '/api/notification/settings/user',
  );
}

// ---------------------------------------------------------------------------
// Rules (NotificationRuleController, /api/notification)
// ---------------------------------------------------------------------------

/** POST /api/notification/rule — create/update; triggerType is immutable. */
export async function saveNotificationRule(
  rule: NotificationRule,
): Promise<NotificationRule> {
  return tbHttp.post<NotificationRule>('/api/notification/rule', rule);
}

/** GET /api/notification/rule/{id} */
export async function getNotificationRuleById(
  id: string,
): Promise<NotificationRuleInfo> {
  return tbHttp.get<NotificationRuleInfo>(`/api/notification/rule/${id}`);
}

/** GET /api/notification/rules — paged rule list (textSearch matches name). */
export async function getNotificationRules(
  pageLink: PageLink,
): Promise<PageData<NotificationRuleInfo>> {
  return tbHttp.get<PageData<NotificationRuleInfo>>(
    '/api/notification/rules',
    pageLinkToQueryParams(pageLink),
  );
}

/** DELETE /api/notification/rule/{id} */
export async function deleteNotificationRule(id: string): Promise<void> {
  await tbHttp.delete<void>(`/api/notification/rule/${id}`);
}

// ---------------------------------------------------------------------------
// Targets (NotificationTargetController, /api/notification)
// ---------------------------------------------------------------------------

/** POST /api/notification/target — create/update a recipient group. */
export async function saveNotificationTarget(
  target: NotificationTarget,
): Promise<NotificationTarget> {
  return tbHttp.post<NotificationTarget>('/api/notification/target', target);
}

/** GET /api/notification/target/{id} */
export async function getNotificationTargetById(
  id: string,
): Promise<NotificationTarget> {
  return tbHttp.get<NotificationTarget>(`/api/notification/target/${id}`);
}

/**
 * POST /api/notification/target/recipients?page=&pageSize= — resolve the
 * users a PLATFORM_USERS target would notify (body + paged query).
 */
export async function getNotificationTargetRecipients(
  target: NotificationTarget,
  pageLink: PageLink,
): Promise<PageData<User>> {
  return tbHttp.post<PageData<User>>(
    '/api/notification/target/recipients',
    target,
    pageLinkToQueryParams(pageLink),
  );
}

/** GET /api/notification/targets — paged target list (textSearch matches name). */
export async function getNotificationTargets(
  pageLink: PageLink,
): Promise<PageData<NotificationTarget>> {
  return tbHttp.get<PageData<NotificationTarget>>(
    '/api/notification/targets',
    pageLinkToQueryParams(pageLink),
  );
}

/** GET /api/notification/targets/list?ids= — exact fetch, ids comma-joined. */
export async function getNotificationTargetsByIds(
  ids: Array<string>,
): Promise<Array<NotificationTarget>> {
  return tbHttp.get<Array<NotificationTarget>>('/api/notification/targets/list', {
    ids: ids.join(','),
  });
}

/**
 * GET /api/notification/targets/notificationType/{notificationType} — paged
 * targets usable with the given notification type (V2 shape of the
 * `?notificationType=` variant, per the double-path V2 convention).
 */
export async function getNotificationTargetsByNotificationType(
  notificationType: NotificationType,
  pageLink: PageLink,
): Promise<PageData<NotificationTarget>> {
  return tbHttp.get<PageData<NotificationTarget>>(
    `/api/notification/targets/notificationType/${notificationType}`,
    pageLinkToQueryParams(pageLink),
  );
}

/** DELETE /api/notification/target/{id} */
export async function deleteNotificationTarget(id: string): Promise<void> {
  await tbHttp.delete<void>(`/api/notification/target/${id}`);
}

// ---------------------------------------------------------------------------
// Templates + Slack (NotificationTemplateController, /api/notification)
// ---------------------------------------------------------------------------

/** POST /api/notification/template — create/update a template. */
export async function saveNotificationTemplate(
  template: NotificationTemplate,
): Promise<NotificationTemplate> {
  return tbHttp.post<NotificationTemplate>(
    '/api/notification/template',
    template,
  );
}

/** GET /api/notification/template/{id} */
export async function getNotificationTemplateById(
  id: string,
): Promise<NotificationTemplate> {
  return tbHttp.get<NotificationTemplate>(`/api/notification/template/${id}`);
}

/**
 * GET /api/notification/templates — paged; `notificationTypes` filters the
 * list (omitted = all types).
 */
export async function getNotificationTemplates(
  pageLink: PageLink,
  notificationTypes?: Array<NotificationType>,
): Promise<PageData<NotificationTemplate>> {
  return tbHttp.get<PageData<NotificationTemplate>>(
    '/api/notification/templates',
    {
      ...pageLinkToQueryParams(pageLink),
      notificationTypes: notificationTypes?.length
        ? notificationTypes.join(',')
        : undefined,
    },
  );
}

/** DELETE /api/notification/template/{id} */
export async function deleteNotificationTemplate(id: string): Promise<void> {
  await tbHttp.delete<void>(`/api/notification/template/${id}`);
}

/**
 * GET /api/notification/slack/conversations?type=&token= — workspace
 * conversation picker; token omitted falls back to the configured SLACK
 * botToken in the notification settings.
 */
export async function getSlackConversations(
  type: SlackConversationType,
  token?: string,
): Promise<Array<SlackConversation>> {
  return tbHttp.get<Array<SlackConversation>>(
    '/api/notification/slack/conversations',
    { type, token },
  );
}
