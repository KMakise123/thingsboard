/**
 * Alarm transport (handwritten) — device alarms tab + alarm details dialog.
 *
 * Base paths (V2 surface, entity-typed):
 *   GET    /api/alarm/info/{alarmId}                     AlarmInfo
 *   POST   /api/alarm/{alarmId}/ack                      ack
 *   POST   /api/alarm/{alarmId}/clear                    clear
 *   DELETE /api/alarm/{alarmId}                          delete
 *   GET    /api/v2/alarm/{entityType}/{entityId}         entity-scoped page
 *   GET    /api/alarm/{alarmId}/comment                  comments timeline
 *   POST   /api/alarm/{alarmId}/comment                  add comment
 *
 * List filters (statusList/severityList/typeList) travel as the backend's
 * comma-separated single-param form (AlarmQueryV2 semantics).
 */

import type { QueryParams } from '@/core/http/client';
import type {
  AlarmInfo,
  AlarmSeverity,
  BaseData,
  EntityId,
  EntityType,
  PageData,
  PageLink,
} from '@/types/tb';

import { tbHttp } from './http';

/** Search-status values the v2 endpoints accept (ui-ngx AlarmSearchStatus). */
export type AlarmSearchStatus = 'ACTIVE' | 'UNACK' | 'ACK' | 'CLEARED';

/** REST seed / fallback read for the entity-scoped alarm tab. */
export interface EntityAlarmsFilter {
  statusList?: Array<AlarmSearchStatus>;
  severityList?: Array<AlarmSeverity>;
  typeList?: Array<string>;
  startTime?: number;
  endTime?: number;
}

function listParam(values?: Array<string>): string | undefined {
  return values?.length ? values.join(',') : undefined;
}

/** GET /api/v2/alarm/{entityType}/{entityId} — first-page seed for the WS stream. */
export async function getEntityAlarms(
  entityId: EntityId,
  filter: EntityAlarmsFilter,
  pageLink: PageLink,
): Promise<PageData<AlarmInfo>> {
  const params: QueryParams = {
    pageSize: pageLink.pageSize,
    page: pageLink.page,
    textSearch: pageLink.textSearch,
    sortProperty: pageLink.sortOrder?.property,
    sortOrder: pageLink.sortOrder?.direction,
    statusList: listParam(filter.statusList),
    severityList: listParam(filter.severityList),
    typeList: listParam(filter.typeList),
    startTime: filter.startTime,
    endTime: filter.endTime,
  };
  return tbHttp.get<PageData<AlarmInfo>>(
    `/api/v2/alarm/${entityId.entityType}/${entityId.id}`,
    params,
  );
}

/** GET /api/alarm/info/{alarmId} — details dialog full read. */
export async function getAlarmInfoById(alarmId: string): Promise<AlarmInfo> {
  return tbHttp.get<AlarmInfo>(`/api/alarm/info/${alarmId}`);
}

/** POST /api/alarm/{alarmId}/ack. */
export async function ackAlarm(alarmId: string): Promise<AlarmInfo> {
  return tbHttp.post<AlarmInfo>(`/api/alarm/${alarmId}/ack`);
}

/** POST /api/alarm/{alarmId}/clear. */
export async function clearAlarm(alarmId: string): Promise<AlarmInfo> {
  return tbHttp.post<AlarmInfo>(`/api/alarm/${alarmId}/clear`);
}

/** DELETE /api/alarm/{alarmId}. */
export async function deleteAlarm(alarmId: string): Promise<boolean> {
  return tbHttp.delete<boolean>(`/api/alarm/${alarmId}`);
}

/**
 * Alarm comment row (system + user comments form the alarm timeline).
 * The comment id carries its own backend entity type which the frontend
 * never addresses — modeled as a loose id reference here.
 */
export interface AlarmComment
  extends BaseData<{ entityType: EntityType; id: string }> {
  alarmId: { entityType: EntityType.ALARM; id: string };
  userId?: { entityType: EntityType.USER; id: string };
  type: 'SYSTEM' | 'OTHER';
  comment: {
    text: string;
    subtype?: string;
    userName?: string;
    assigneeName?: string;
    oldSeverity?: AlarmSeverity;
    newSeverity?: AlarmSeverity;
    edited?: boolean;
    editedOn?: number;
  };
}

export interface AlarmCommentInfo extends AlarmComment {
  firstName?: string;
  lastName?: string;
  email?: string;
}

/** GET /api/alarm/{alarmId}/comment — paged timeline read. */
export async function getAlarmComments(
  alarmId: string,
  pageLink: { pageSize: number; page: number },
): Promise<PageData<AlarmCommentInfo>> {
  return tbHttp.get<PageData<AlarmCommentInfo>>(
    `/api/alarm/${alarmId}/comment`,
    {
      pageSize: pageLink.pageSize,
      page: pageLink.page,
      sortProperty: 'createdTime',
      sortOrder: 'ASC',
    },
  );
}

/** POST /api/alarm/{alarmId}/comment — append a user comment. */
export async function saveAlarmComment(
  alarmId: string,
  text: string,
): Promise<AlarmComment> {
  return tbHttp.post<AlarmComment>(`/api/alarm/${alarmId}/comment`, {
    type: 'OTHER',
    comment: { text },
  });
}
