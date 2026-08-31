/**
 * TB /api/ws wire protocol (handwritten, authoritative).
 *
 * Mirrors ui-ngx shared/models/telemetry/telemetry.models.ts command set
 * and org.thingsboard.server.service.ws WsCmdType/WsCommandsWrapper.
 *
 * Frame layout (single multiplexed socket):
 *   client→server: { authCmd?: {token}, cmds: WebsocketCmd[] }   (≤10 cmds/frame)
 *   server→client: CmdUpdateMsg (cmdId-keyed) | SubscriptionUpdateMsg
 *                  (subscriptionId-keyed, legacy attr/ts cmds)
 */

import type { AlarmData, EntityId, TsValue } from '@/types/tb';

// ---------------------------------------------------------------------------
// Commands (client → server)
// ---------------------------------------------------------------------------

export enum WsCmdType {
  AUTH = 'AUTH',
  ATTRIBUTES = 'ATTRIBUTES',
  TIMESERIES = 'TIMESERIES',
  TIMESERIES_HISTORY = 'TIMESERIES_HISTORY',
  ENTITY_DATA = 'ENTITY_DATA',
  ENTITY_COUNT = 'ENTITY_COUNT',
  ALARM_DATA = 'ALARM_DATA',
  ALARM_COUNT = 'ALARM_COUNT',
  ALARM_STATUS = 'ALARM_STATUS',
  NOTIFICATIONS = 'NOTIFICATIONS',
  NOTIFICATIONS_COUNT = 'NOTIFICATIONS_COUNT',
  MARK_NOTIFICATIONS_AS_READ = 'MARK_NOTIFICATIONS_AS_READ',
  MARK_ALL_NOTIFICATIONS_AS_READ = 'MARK_ALL_NOTIFICATIONS_AS_READ',
  ALARM_DATA_UNSUBSCRIBE = 'ALARM_DATA_UNSUBSCRIBE',
  ALARM_COUNT_UNSUBSCRIBE = 'ALARM_COUNT_UNSUBSCRIBE',
  ALARM_STATUS_UNSUBSCRIBE = 'ALARM_STATUS_UNSUBSCRIBE',
  ENTITY_DATA_UNSUBSCRIBE = 'ENTITY_DATA_UNSUBSCRIBE',
  ENTITY_COUNT_UNSUBSCRIBE = 'ENTITY_COUNT_UNSUBSCRIBE',
  NOTIFICATIONS_UNSUBSCRIBE = 'NOTIFICATIONS_UNSUBSCRIBE',
}

export interface WebsocketCmd {
  cmdId: number;
  type: WsCmdType;
}

/** In-band first-frame auth (server: TbWebSocketHandler). */
export interface AuthCmd {
  cmdId: 0;
  type: WsCmdType.AUTH;
  token: string;
  apiKey?: string;
}

/** ATTRIBUTES — legacy per-entity attribute subscription. */
export interface AttributesSubscriptionCmd extends WebsocketCmd {
  type: WsCmdType.ATTRIBUTES;
  /** Comma-separated key list ('' = all). */
  keys: string;
  entityType: EntityId['entityType'];
  entityId: string;
  scope?: string;
  unsubscribe?: boolean;
}

/** TIMESERIES — live latest-value subscription. */
export interface TimeseriesSubscriptionCmd extends WebsocketCmd {
  type: WsCmdType.TIMESERIES;
  keys: string;
  entityType: EntityId['entityType'];
  entityId: string;
  startTs: number;
  timeWindow: number;
  interval: number;
  limit: number;
  agg: string;
  unsubscribe?: boolean;
}

/** Latest-value fetch riding on EntityData. */
export interface LatestValueCmd {
  keys: Array<{ type: string; key: string }>;
}

/** EntityData query body (paged, server-side evaluated). */
export interface EntityDataQueryLike {
  entityFilter: Record<string, unknown>;
  pageLink: {
    pageSize: number;
    page: number;
    textSearch?: string;
    sortOrder?: {
      key: { type: string; key: string };
      direction: 'ASC' | 'DESC';
    };
  };
  entityFields?: Array<{ type: string; key: string }>;
  latestValues?: Array<{ type: string; key: string }>;
}

/**
 * ENTITY_DATA — the heavyweight cmd. Same cmdId re-send = update semantics:
 * change pageLink/sort/keys without resubscribing (server keeps the stream).
 */
export interface EntityDataCmd extends WebsocketCmd {
  type: WsCmdType.ENTITY_DATA;
  query?: EntityDataQueryLike;
  latestCmd?: LatestValueCmd;
  historyCmd?: Record<string, unknown>;
  tsCmd?: Record<string, unknown>;
}

export interface EntityCountCmd extends WebsocketCmd {
  type: WsCmdType.ENTITY_COUNT;
  query?: { entityFilter: Record<string, unknown> };
}

export interface AlarmDataQueryLike extends EntityDataQueryLike {
  alarmFields?: Array<{ type: string; key: string }>;
}

export interface AlarmDataCmd extends WebsocketCmd {
  type: WsCmdType.ALARM_DATA;
  query?: AlarmDataQueryLike;
}

export interface AlarmCountCmd extends WebsocketCmd {
  type: WsCmdType.ALARM_COUNT;
  query?: { entityFilter: Record<string, unknown> };
}

export interface AlarmStatusCmd extends WebsocketCmd {
  type: WsCmdType.ALARM_STATUS;
  originatorId: EntityId;
  severityList?: Array<string>;
  typeList?: Array<string>;
}

/** NOTIFICATIONS_COUNT — unread badge stream. */
export interface UnreadCountSubCmd extends WebsocketCmd {
  type: WsCmdType.NOTIFICATIONS_COUNT;
}

/** NOTIFICATIONS — notification list stream (typed for v2; M1 unused). */
export interface UnreadSubCmd extends WebsocketCmd {
  type: WsCmdType.NOTIFICATIONS;
  limit: number;
  types?: Array<string>;
}

export type UnsubscribeCmd =
  | (AttributesSubscriptionCmd & { unsubscribe: true })
  | { cmdId: number; type: WsCmdType.ENTITY_DATA_UNSUBSCRIBE }
  | { cmdId: number; type: WsCmdType.ENTITY_COUNT_UNSUBSCRIBE }
  | { cmdId: number; type: WsCmdType.ALARM_DATA_UNSUBSCRIBE }
  | { cmdId: number; type: WsCmdType.ALARM_COUNT_UNSUBSCRIBE }
  | { cmdId: number; type: WsCmdType.ALARM_STATUS_UNSUBSCRIBE }
  | { cmdId: number; type: WsCmdType.NOTIFICATIONS_UNSUBSCRIBE };

export type AnySubCmd =
  | AttributesSubscriptionCmd
  | TimeseriesSubscriptionCmd
  | EntityDataCmd
  | EntityCountCmd
  | AlarmDataCmd
  | AlarmCountCmd
  | AlarmStatusCmd
  | UnreadCountSubCmd
  | UnreadSubCmd;

/** Outbound frame. */
export interface CmdsWrapper {
  authCmd?: AuthCmd;
  cmds: Array<AnySubCmd | UnsubscribeCmd>;
}

// ---------------------------------------------------------------------------
// Updates (server → client)
// ---------------------------------------------------------------------------

export enum CmdUpdateType {
  ENTITY_DATA = 'ENTITY_DATA',
  ALARM_DATA = 'ALARM_DATA',
  ALARM_COUNT_DATA = 'ALARM_COUNT_DATA',
  ALARM_STATUS = 'ALARM_STATUS',
  COUNT_DATA = 'COUNT_DATA',
  NOTIFICATIONS_COUNT = 'NOTIFICATIONS_COUNT',
  NOTIFICATIONS = 'NOTIFICATIONS',
}

/** Legacy attr/ts reply — keyed by subscriptionId (== assigned cmdId). */
export interface SubscriptionUpdateMsg {
  subscriptionId: number;
  errorCode: number;
  errorMsg: string;
  /** key → [ts, value] tuples. */
  data?: Record<string, Array<[number, unknown, number?]>>;
}

export interface CmdUpdateMsg {
  cmdId: number;
  errorCode: number;
  errorMsg: string;
  cmdUpdateType: CmdUpdateType;
}

export interface EntityDataUpdateMsg extends CmdUpdateMsg {
  cmdUpdateType: CmdUpdateType.ENTITY_DATA;
  data?: {
    data: EntityDataWire[];
    totalPages: number;
    totalElements: number;
    hasNext: boolean;
  };
  update?: Array<EntityDataWire>;
}

export interface EntityDataWire {
  entityId: EntityId | string;
  latest?: Record<string, Record<string, TsValue>>;
  timeseries?: Record<string, Array<TsValue>>;
}

export interface AlarmDataUpdateMsg extends CmdUpdateMsg {
  cmdUpdateType: CmdUpdateType.ALARM_DATA;
  data?: {
    data: AlarmData[];
    totalPages: number;
    totalElements: number;
    hasNext: boolean;
  };
  update?: Array<AlarmData>;
  allowedEntities: number;
  totalEntities: number;
}

export interface EntityCountUpdateMsg extends CmdUpdateMsg {
  cmdUpdateType: CmdUpdateType.COUNT_DATA;
  count: number;
}

export interface AlarmCountUpdateMsg extends CmdUpdateMsg {
  cmdUpdateType: CmdUpdateType.ALARM_COUNT_DATA;
  count: number;
}

export interface AlarmStatusUpdateMsg extends CmdUpdateMsg {
  cmdUpdateType: CmdUpdateType.ALARM_STATUS;
  active: boolean;
}

export interface NotificationCountUpdateMsg extends CmdUpdateMsg {
  cmdUpdateType: CmdUpdateType.NOTIFICATIONS_COUNT;
  totalUnreadCount: number;
  sequenceNumber: number;
}

export interface NotificationsUpdateMsg extends CmdUpdateMsg {
  cmdUpdateType: CmdUpdateType.NOTIFICATIONS;
  update?: Record<string, unknown>;
  notifications?: Array<Record<string, unknown>>;
  totalUnreadCount: number;
  sequenceNumber: number;
}

export type WsServerMessage =
  | SubscriptionUpdateMsg
  | EntityDataUpdateMsg
  | AlarmDataUpdateMsg
  | EntityCountUpdateMsg
  | AlarmCountUpdateMsg
  | AlarmStatusUpdateMsg
  | NotificationCountUpdateMsg
  | NotificationsUpdateMsg;

export function parseServerMessage(raw: string): WsServerMessage | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object') {
      return null;
    }
    return parsed as WsServerMessage;
  } catch {
    return null;
  }
}

/** Discriminator: legacy subscriptionId replies vs cmdId-keyed updates. */
export function isSubscriptionUpdate(
  msg: WsServerMessage,
): msg is SubscriptionUpdateMsg {
  return (
    (msg as SubscriptionUpdateMsg).subscriptionId !== undefined &&
    (msg as CmdUpdateMsg).cmdUpdateType === undefined
  );
}
