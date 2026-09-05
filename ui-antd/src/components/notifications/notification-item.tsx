/**
 * TbNotification renderer — the ui-ngx tb-notification parity component
 * shared by the header bell popover and the inbox detail dialog.
 *
 * Layout mirrors ui-ngx notification.component.html: icon | (title, message,
 * action button) | (relative time, mark-as-read, alarm severity chip).
 * subject/text are template HTML — sanitized through DOMPurify before the
 * innerHTML render. DASHBOARD action buttons rebuild the ui-ngx deep link:
 * /dashboards/{id}?state=base64([{id: dashboardState, params: {entityId}}]).
 */
import { CheckCircleOutlined } from '@ant-design/icons';
import { history } from '@umijs/max';
import { Button, Tag, Tooltip, theme } from 'antd';
import { createStyles } from 'antd-style';
import { useIntl } from 'react-intl';
import { ALARM_SEVERITY_TAG } from '@/components/entities/detail/alarm-format';
import { objToBase64 } from '@/core/dashboard/states';
import {
  type NotificationButtonConfig,
  NotificationStatus,
  NotificationType,
  type TbNotification,
  type WebTemplateAdditionalConfig,
} from '@/types/tb/notification';
import {
  alarmAccentColor,
  alarmInfoOf,
  customIconComponent,
  isActiveAlarmNotification,
  NOTIFICATION_TYPE_ICONS,
  notificationRelativeTime,
  typeIconColor,
} from './notification-format';
import { sanitizeNotificationHtml } from './notification-sanitize';

/** additionalConfig with the full action-button shape carried on the wire. */
type NotificationAdditionalConfig = Omit<
  WebTemplateAdditionalConfig,
  'actionButtonConfig'
> & { actionButtonConfig?: NotificationButtonConfig };

const additionalConfigOf = (
  notification: TbNotification,
): NotificationAdditionalConfig | undefined =>
  notification.additionalConfig as NotificationAdditionalConfig | undefined;

const useStyles = createStyles(({ token }) => ({
  item: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
    padding: '10px 12px',
  },
  alarmItem: {
    borderLeft: '3px solid transparent',
  },
  icon: {
    fontSize: 22,
    lineHeight: 1.2,
    flexShrink: 0,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontWeight: 600,
    // Template HTML may carry nested block tags — keep the flow compact.
    '> *': { margin: 0 },
  },
  titleRead: {
    fontWeight: 400,
    color: token.colorTextSecondary,
  },
  message: {
    color: token.colorTextSecondary,
    '> *': { margin: 0 },
  },
  button: {
    marginTop: 6,
  },
  aside: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
  },
  time: {
    fontSize: token.fontSizeSM,
    color: token.colorTextTertiary,
    whiteSpace: 'nowrap',
  },
  markRead: {
    fontSize: 14,
    color: token.colorTextSecondary,
  },
}));

export interface NotificationItemProps {
  notification: TbNotification;
  /**
   * Present = unread items render the mark-as-read affordance and invoke it
   * (popover: REST + WS self-heal; dialog: same handler).
   */
  onMarkRead?: (notification: TbNotification) => void;
  /** Called after an action-button navigation closes the context (popover). */
  onNavigateAway?: () => void;
  /** Time anchor for the relative stamp (defaults to now). */
  now?: number;
  testId?: string;
}

export function NotificationItem({
  notification,
  onMarkRead,
  onNavigateAway,
  now,
  testId,
}: NotificationItemProps) {
  const { formatMessage } = useIntl();
  const { token } = theme.useToken();
  const { styles, cx } = useStyles();

  const config = additionalConfigOf(notification);
  const read = notification.status === NotificationStatus.READ;
  const activeAlarm = isActiveAlarmNotification(notification);
  const alarmInfo = alarmInfoOf(notification);
  const accent = activeAlarm
    ? alarmAccentColor(alarmInfo?.alarmSeverity, token)
    : null;

  // ---- icon resolution: custom template icon > per-type icon > none
  const customIcon = config?.icon?.enabled
    ? customIconComponent(config.icon.icon)
    : null;
  const typeIcon = customIcon
    ? null
    : NOTIFICATION_TYPE_ICONS[notification.type ?? NotificationType.GENERAL];
  const typeIconAccent = typeIcon
    ? (typeIconColor(notification.type, token) ??
      (activeAlarm ? accent : undefined) ??
      undefined)
    : undefined;
  const Icon = customIcon ?? typeIcon;

  // ---- action button (template-configured LINK / DASHBOARD jump)
  const action = config?.actionButtonConfig?.enabled
    ? config.actionButtonConfig
    : null;

  const navigateByAction = () => {
    if (!action) {
      return;
    }
    let link = action.link ?? '/';
    if (action.linkType === 'DASHBOARD' && action.dashboardId) {
      link = `/dashboards/${action.dashboardId}`;
      if (action.dashboardState || action.setEntityIdInState) {
        // ui-ngx: single-layer state [{id, params}]; entityId is the
        // notification's triggering entity (info.stateEntityId).
        const stateObject: {
          id?: string;
          params?: Record<string, unknown>;
        } = {
          params: action.setEntityIdInState
            ? { entityId: alarmInfo?.stateEntityId ?? null }
            : {},
        };
        if (action.dashboardState) {
          stateObject.id = action.dashboardState;
        }
        link += `?state=${encodeURIComponent(objToBase64([stateObject]))}`;
      }
    }
    if (link.startsWith('/')) {
      history.push(link);
    } else {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
    onNavigateAway?.();
  };

  const markAsReadLabel = formatMessage({
    id: 'pages.notifications.bell.markAsRead',
    defaultMessage: 'Mark as read',
  });

  return (
    <section
      data-testid={testId ?? 'notification-item'}
      className={cx(styles.item, styles.alarmItem)}
      style={accent ? { borderLeftColor: accent } : undefined}
    >
      {Icon && (
        <Icon
          className={styles.icon}
          style={{ color: customIcon ? config?.icon?.color : typeIconAccent }}
        />
      )}
      <div className={styles.content}>
        {/* Template subject HTML — sanitized below (DOMPurify allowlist +
            forbidden-tag sweep); never trusted raw. */}
        <div
          className={cx(styles.title, read && styles.titleRead)}
          data-testid="notification-title"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized template HTML, DOMPurify allowlist + forbidden-tag sweep
          dangerouslySetInnerHTML={{
            __html: sanitizeNotificationHtml(notification.subject ?? ''),
          }}
        />
        {/* Template body HTML — same sanitizer as the subject line. */}
        <div
          className={styles.message}
          data-testid="notification-message"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized template HTML, DOMPurify allowlist + forbidden-tag sweep
          dangerouslySetInnerHTML={{
            __html: sanitizeNotificationHtml(notification.text ?? ''),
          }}
        />
        {action && (
          <Button
            size="small"
            className={styles.button}
            data-testid="notification-action"
            onClick={(event) => {
              event.stopPropagation();
              navigateByAction();
            }}
          >
            {action.text}
          </Button>
        )}
      </div>
      <div className={styles.aside}>
        <span className={styles.time} data-testid="notification-time">
          {notificationRelativeTime(
            notification.createdTime,
            now ?? Date.now(),
          )}
        </span>
        {onMarkRead && !read && (
          <Tooltip title={markAsReadLabel}>
            <Button
              type="text"
              size="small"
              className={styles.markRead}
              icon={<CheckCircleOutlined />}
              data-testid="notification-mark-read"
              aria-label={markAsReadLabel}
              onClick={(event) => {
                event.stopPropagation();
                onMarkRead(notification);
              }}
            />
          </Tooltip>
        )}
        {activeAlarm && !!alarmInfo?.alarmSeverity && (
          <Tag
            color={ALARM_SEVERITY_TAG[alarmInfo.alarmSeverity]}
            style={{ marginInlineEnd: 0 }}
            data-testid="notification-severity"
          >
            {formatMessage({
              id: `pages.devices.detail.alarmSeverity.${alarmInfo.alarmSeverity}`,
              defaultMessage: alarmInfo.alarmSeverity,
            })}
          </Tag>
        )}
      </div>
    </section>
  );
}
