/**
 * Rule wizard metadata (M12 wave 3-B, spec §4.5) — trigger-type candidates by
 * authority, defaults, and the triggerType → NotificationType mapping that
 * filters templates and recipient targets.
 *
 * The mapping is the same-name direct pairing: every NotificationRuleTriggerType
 * value is also a valid NotificationType value (ui-ngx feeds the raw triggerType
 * into tb-template-autocomplete's `notificationTypes` input and the targets
 * entity-list `subType` — rule-notification-dialog.component.html:69,77).
 */
import { EntityType } from '@/types/tb/entity';
import {
  NotificationRuleTriggerType,
  NotificationType,
} from '@/types/tb/notification';

/** The 6 sysadmin-only trigger types (ui-ngx allowTriggerTypes :520-534). */
const SYSADMIN_ONLY_TRIGGER_TYPES: ReadonlySet<NotificationRuleTriggerType> =
  new Set([
    NotificationRuleTriggerType.ENTITIES_LIMIT,
    NotificationRuleTriggerType.API_USAGE_LIMIT,
    NotificationRuleTriggerType.NEW_PLATFORM_VERSION,
    NotificationRuleTriggerType.RATE_LIMITS,
    NotificationRuleTriggerType.TASK_PROCESSING_FAILURE,
    NotificationRuleTriggerType.RESOURCES_SHORTAGE,
  ]);

/** Candidate trigger types for an authority (tenant sees the other 8). */
export function triggerTypesForAuthority(
  isSysAdmin: boolean,
): Array<NotificationRuleTriggerType> {
  return Object.values(NotificationRuleTriggerType).filter(
    (type) =>
      isSysAdmin === SYSADMIN_ONLY_TRIGGER_TYPES.has(type),
  );
}

/** New-rule default: SYS=ENTITIES_LIMIT, TENANT=ALARM (ui-ngx :200). */
export function defaultTriggerTypeFor(
  isSysAdmin: boolean,
): NotificationRuleTriggerType {
  return isSysAdmin
    ? NotificationRuleTriggerType.ENTITIES_LIMIT
    : NotificationRuleTriggerType.ALARM;
}

/** Same-name pairing; every trigger type is a valid notification type. */
export const TRIGGER_TO_NOTIFICATION_TYPE: Record<
  NotificationRuleTriggerType,
  NotificationType
> = Object.fromEntries(
  Object.values(NotificationRuleTriggerType).map((type) => [
    type,
    NotificationType[type],
  ]),
) as Record<NotificationRuleTriggerType, NotificationType>;

/** locale key suffix per trigger type (`pages.notifications.rules.trigger.*`). */
export const TRIGGER_NAME_KEY_PREFIX = 'pages.notifications.rules.trigger';

export function triggerNameKey(type: NotificationRuleTriggerType): string {
  return `${TRIGGER_NAME_KEY_PREFIX}.${type}`;
}

/** ENTITIES_LIMIT candidates (six types, ui-ngx :149-156). */
export const ENTITIES_LIMIT_ENTITY_TYPES: Array<EntityType> = [
  EntityType.DEVICE,
  EntityType.ASSET,
  EntityType.CUSTOMER,
  EntityType.USER,
  EntityType.DASHBOARD,
  EntityType.RULE_CHAIN,
];

/**
 * ENTITY_ACTION candidates = all types minus the ui-ngx exclusion list
 * (:536-549). JOB/ADMIN_SETTINGS are fork-added internal types that cannot be
 * entity-action originators, so they are excluded here as well.
 */
const ENTITY_ACTION_EXCLUDED: ReadonlySet<EntityType> = new Set([
  EntityType.API_USAGE_STATE,
  EntityType.TENANT_PROFILE,
  EntityType.RPC,
  EntityType.QUEUE,
  EntityType.NOTIFICATION,
  EntityType.NOTIFICATION_REQUEST,
  EntityType.WIDGET_TYPE,
  EntityType.JOB,
  EntityType.ADMIN_SETTINGS,
]);

export const ENTITY_ACTION_ENTITY_TYPES: Array<EntityType> =
  Object.values(EntityType).filter(
    (type) => !ENTITY_ACTION_EXCLUDED.has(type),
  );
