/**
 * Notification presentation helpers (ui-ngx tb-notification parity).
 *
 * Icon/color decisions:
 *  - Custom template icons (additionalConfig.icon) carry Material-font glyph
 *    NAMES on the wire; antd has no Material font, so the name resolves
 *    through a small alias map (common TB template choices) and falls back to
 *    the plain bell. The configured color always applies.
 *  - Type icons mirror ui-ngx NotificationTypeIcons: types absent from that
 *    map (GENERAL, NEW_PLATFORM_VERSION, RATE_LIMITS, RULE_NODE, EDGE_*) render
 *    no icon at all.
 *  - Active-alarm accent colors are antd tokens; per-severity exactness is
 *    carried by the severity Tag presets (ALARM_SEVERITY_TAG), the border/icon
 *    accent is deliberately coarse (error/warning/quaternary).
 */
import {
  ApiOutlined,
  BellOutlined,
  CommentOutlined,
  DesktopOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  MobileOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import type { GlobalToken } from 'antd/es/theme';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { AlarmSeverity } from '@/types/tb';

// fromNow/from need the plugin; dayjs.extend is idempotent (app.tsx also
// extends globally — this keeps the component usable standalone, tests
// included).
dayjs.extend(relativeTime);

import {
  type NotificationInfo,
  NotificationType,
  type TbNotification,
} from '@/types/tb/notification';

/** ui-ngx alarm.models.ts severity accents, mapped to antd tokens. */
export function alarmAccentColor(
  severity: AlarmSeverity | undefined,
  token: GlobalToken,
): string {
  switch (severity) {
    case AlarmSeverity.CRITICAL:
      return token.colorError;
    case AlarmSeverity.MAJOR:
    case AlarmSeverity.MINOR:
    case AlarmSeverity.WARNING:
      return token.colorWarning;
    default:
      return token.colorTextQuaternary;
  }
}

/** Extra per-type icon accents from ui-ngx notificationIconColor(). */
export function typeIconColor(
  type: NotificationType | undefined,
  token: GlobalToken,
): string | null {
  if (type === NotificationType.RULE_ENGINE_COMPONENT_LIFECYCLE_EVENT) {
    return token.colorError; // ui-ngx #D12730
  }
  if (type === NotificationType.ENTITIES_LIMIT_INCREASE_REQUEST) {
    return token.colorInfo; // ui-ngx #305680
  }
  return null;
}

type IconComponent = typeof BellOutlined;

/** ui-ngx NotificationTypeIcons (Material glyph → antd icon). */
export const NOTIFICATION_TYPE_ICONS: Record<
  NotificationType,
  IconComponent | null
> = {
  [NotificationType.ALARM]: WarningOutlined,
  [NotificationType.DEVICE_ACTIVITY]: MobileOutlined,
  [NotificationType.ENTITY_ACTION]: DesktopOutlined,
  [NotificationType.ALARM_COMMENT]: CommentOutlined,
  [NotificationType.ALARM_ASSIGNMENT]: FileDoneOutlined,
  [NotificationType.RULE_ENGINE_COMPONENT_LIFECYCLE_EVENT]: ApiOutlined,
  [NotificationType.ENTITIES_LIMIT]: FileTextOutlined,
  [NotificationType.ENTITIES_LIMIT_INCREASE_REQUEST]: FileTextOutlined,
  [NotificationType.API_USAGE_LIMIT]: ApiOutlined,
  [NotificationType.TASK_PROCESSING_FAILURE]: WarningOutlined,
  [NotificationType.RESOURCES_SHORTAGE]: WarningOutlined,
  // Types ui-ngx leaves iconless.
  [NotificationType.GENERAL]: null,
  [NotificationType.NEW_PLATFORM_VERSION]: null,
  [NotificationType.RULE_NODE]: null,
  [NotificationType.RATE_LIMITS]: null,
  [NotificationType.EDGE_CONNECTION]: null,
  [NotificationType.EDGE_COMMUNICATION_FAILURE]: null,
};

/**
 * Material glyph names seen in TB web-template icon configs → the antd icon
 * rendered instead. Everything unknown falls back to the plain bell.
 */
const CUSTOM_ICON_ALIASES: Record<string, IconComponent> = {
  notifications: BellOutlined,
  notifications_none: BellOutlined,
  warning: WarningOutlined,
  error_outline: WarningOutlined,
  comment: CommentOutlined,
  devices: DesktopOutlined,
  device_hub: ApiOutlined,
  phonelink_off: MobileOutlined,
  assignment_turned_in: FileDoneOutlined,
  insert_chart: FileTextOutlined,
  data_thresholding: FileTextOutlined,
  settings_ethernet: ApiOutlined,
};

export function customIconComponent(
  iconName: string | undefined,
): IconComponent {
  return (iconName && CUSTOM_ICON_ALIASES[iconName]) || BellOutlined;
}

/** Typed view of the info keys this fork's alarm rules put on the wire. */
export type NotificationAlarmInfo = NotificationInfo & {
  alarmSeverity?: AlarmSeverity;
  cleared?: boolean;
};

export function alarmInfoOf(
  notification: TbNotification,
): NotificationAlarmInfo | null {
  return (notification.info as NotificationAlarmInfo | undefined) ?? null;
}

/** True for an ALARM notification that is not cleared yet (accent target). */
export function isActiveAlarmNotification(
  notification: TbNotification,
): boolean {
  if (notification.type !== NotificationType.ALARM) {
    return false;
  }
  return !alarmInfoOf(notification)?.cleared;
}

/** ui-ngx dateAgo — relative time anchored to an injectable `now`. */
export function notificationRelativeTime(ts: number, now: number): string {
  if (!ts) {
    return '';
  }
  return dayjs(ts).from(dayjs(now));
}
