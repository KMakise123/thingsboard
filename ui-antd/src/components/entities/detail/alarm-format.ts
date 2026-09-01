/**
 * Alarm presentation helpers: severity/status label keys + tag colors and
 * the system-comment (timeline) formatter for the details dialog.
 */

import type { AlarmCommentInfo } from '@/services/tb/alarm';
import { type AlarmInfo, AlarmSeverity, AlarmStatus } from '@/types/tb';

/** AlarmInfo + the assignee join the openapi AlarmInfo carries (handwritten type omits it). */
export interface AlarmAssignee {
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface AlarmRow extends AlarmInfo {
  assignee?: AlarmAssignee;
}

export const ALARM_SEVERITY_ORDER: Array<AlarmSeverity> = [
  AlarmSeverity.CRITICAL,
  AlarmSeverity.MAJOR,
  AlarmSeverity.MINOR,
  AlarmSeverity.WARNING,
  AlarmSeverity.INDETERMINATE,
];

/** antd Tag preset names — token-derived colors, no inline hex (ADR 0007). */
export const ALARM_SEVERITY_TAG: Record<AlarmSeverity, string> = {
  [AlarmSeverity.CRITICAL]: 'red',
  [AlarmSeverity.MAJOR]: 'volcano',
  [AlarmSeverity.MINOR]: 'orange',
  [AlarmSeverity.WARNING]: 'gold',
  [AlarmSeverity.INDETERMINATE]: 'purple',
};

export const ALARM_STATUS_TAG: Record<AlarmStatus, string> = {
  [AlarmStatus.ACTIVE_UNACK]: 'error',
  [AlarmStatus.ACTIVE_ACK]: 'warning',
  [AlarmStatus.CLEARED_UNACK]: 'processing',
  [AlarmStatus.CLEARED_ACK]: 'default',
};

export function alarmAssigneeName(alarm: AlarmRow | null): string {
  const assignee = alarm?.assignee;
  if (!assignee) {
    return '';
  }
  const name = [assignee.firstName, assignee.lastName]
    .filter((part) => !!part)
    .join(' ')
    .trim();
  return name || assignee.email || '';
}

/**
 * Render text for one timeline entry. System comments localize by subtype
 * (ui-ngx AlarmMessage map); user comments render verbatim.
 */
export function formatAlarmComment(
  entry: AlarmCommentInfo,
  translate: (key: string, values?: Record<string, string>) => string,
): string {
  const comment = entry.comment;
  if (entry.type !== 'SYSTEM' || !comment.subtype) {
    return comment.text;
  }
  switch (comment.subtype) {
    case 'acked-by-user':
      return translate('pages.devices.detail.alarmComment.acked', {
        user: comment.userName ?? '',
      });
    case 'cleared-by-user':
      return translate('pages.devices.detail.alarmComment.cleared', {
        user: comment.userName ?? '',
      });
    case 'assigned-to-user':
      return translate('pages.devices.detail.alarmComment.assigned', {
        user: comment.assigneeName ?? comment.userName ?? '',
      });
    case 'unassigned-by-user':
      return translate('pages.devices.detail.alarmComment.unassigned', {
        user: comment.assigneeName ?? comment.userName ?? '',
      });
    case 'severity-changed':
      return translate('pages.devices.detail.alarmComment.severityChanged', {
        from: comment.oldSeverity ?? '',
        to: comment.newSeverity ?? '',
      });
    case 'comment-deleted':
      return translate('pages.devices.detail.alarmComment.commentDeleted');
    default:
      return comment.text;
  }
}

/** Comment author display name. */
export function alarmCommentAuthor(entry: AlarmCommentInfo): string {
  const name = [entry.firstName, entry.lastName]
    .filter((part) => !!part)
    .join(' ')
    .trim();
  return name || entry.email || '';
}
