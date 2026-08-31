/**
 * WS subscription manager — a first-class deliverable of M1.
 *
 * Single multiplexed `/api/ws` socket; every subscription gets a cmdId and
 * rides the same connection. Semantics (issue #7/#8 + ui-ngx websocket.service):
 *
 *   - First frame carries in-band AUTH (`{ authCmd: { token }, cmds: [...] }`).
 *     The socket is only opened after `ensureToken()` returns a fresh-enough
 *     JWT (locally expired → refresh happens inside the injected hook, which
 *     the composition root wires to the HTTP client's single-flight refresh).
 *   - AUTH failure (server closes 1007/1008 before any productive message):
 *     force-refresh → reconnect → resubscribe. A second consecutive failure
 *     abandons the manager and emits the unified unauthorized event
 *     (`{ source: 'ws' }`) — the same exit the HTTP 401 path uses.
 *   - Unexpected close: exponential reconnect 2s×2^n capped at 60s, at most
 *     10 attempts; a productive message resets the counter. After each
 *     reconnect ALL subscriptions are re-sent under fresh cmdIds and their
 *     buffers are replaced wholesale by the next full snapshot (no gap
 *     filling).
 *   - Zero subscriptions + open socket → close after 90s idle.
 *   - Outbound frames carry at most 10 commands each.
 *
 * This module never touches queryClient.setQueryData: WS data lives in
 * per-subscription buffers exposed via subscribe/getSnapshot (designed for
 * useSyncExternalStore). The only channel back into the query cache is
 * mutation-driven invalidation, owned by the app layer.
 */

import type {
  AlarmData,
  AttributeData,
  AttributeScope,
  EntityId,
  LatestTelemetry,
  TsValue,
} from '@/types/tb';

import {
  type AnySubCmd,
  type AttributesSubscriptionCmd,
  type CmdsWrapper,
  type EntityDataCmd,
  type EntityDataUpdateMsg,
  type EntityDataWire,
  type LatestValueCmd,
  type SubscriptionUpdateMsg,
  type TimeseriesSubscriptionCmd,
  type WsServerMessage,
  isSubscriptionUpdate,
  parseServerMessage,
  WsCmdType,
} from './protocol';

export type WsStatus = 'idle' | 'connecting' | 'open' | 'reconnecting' | 'closed' | 'auth-error';

export interface UnauthorizedEvent {
  source: 'ws';
  reason?: string;
}

export interface WsManagerOptions {
  /** ws(s)://…/api/ws; derived from location when omitted. */
  url?: string;
  /**
   * Returns a usable JWT, refreshing first when locally expired (or always
   * when forceRefresh). Wired to the HTTP client refresh single-flight by
   * the composition root so both transports share one flight.
   */
  ensureToken: (forceRefresh?: boolean) => Promise<string | null>;
  /** Unified auth exit (same shape as the HTTP client's onUnauthorized). */
  onUnauthorized?: (event: UnauthorizedEvent) => void;
  /** Server-side errorCode/errorMsg surface (rate limits, bad cmds...). */
  onWsError?: (errorCode: number, errorMsg: string) => void;
  WebSocketCtor?: typeof WebSocket;
  maxCmdsPerFrame?: number;
  reconnectBaseMs?: number;
  reconnectMaxMs?: number;
  maxReconnectAttempts?: number;
  idleCloseMs?: number;
}

export interface WsSubscription<T> {
  /** Immutable snapshot; new reference on every change (uSES contract). */
  getSnapshot(): T;
  getStatus(): WsStatus;
  /** Register a change listener; returns its disposer. */
  subscribe(listener: () => void): () => void;
  unsubscribe(): void;
}

export interface EntityDataSubscription extends WsSubscription<EntityDataWire[]> {
  /** Same-cmdId re-send: change pagination/sort/keys without resubscribing. */
  update(changes: { query?: EntityDataCmd['query']; latestCmd?: LatestValueCmd }): void;
}

export interface AttributesParams {
  entityId: EntityId;
  scope?: AttributeScope;
  /** Undefined/empty = all keys. */
  keys?: Array<string>;
  /** REST snapshot seed — displayed until the first WS snapshot replaces it. */
  seed?: AttributeData[];
}

export interface LatestTelemetryParams {
  entityId: EntityId;
  keys?: Array<string>;
  /** Rolling window the server streams inside. Default 60_000. */
  timeWindowMs?: number;
  seed?: AttributeData[];
}

export interface EntityDataParams {
  query: EntityDataCmd['query'];
  latestCmd?: LatestValueCmd;
  seed?: EntityDataWire[];
}

const DEFAULTS = {
  maxCmdsPerFrame: 10,
  reconnectBaseMs: 2000,
  reconnectMaxMs: 60_000,
  maxReconnectAttempts: 10,
  idleCloseMs: 90_000,
};

/** Server close codes meaning "your auth was rejected" (TbWebSocketHandler). */
const AUTH_FAILURE_CODES = new Set([1007, 1008]);

function defaultWsUrl(): string {
  if (typeof location === 'undefined') {
    return 'ws://localhost:8080/api/ws';
  }
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const port = location.port || (location.protocol === 'https:' ? '443' : '80');
  return `${protocol}//${location.hostname}:${port}/api/ws`;
}

function mergeKeyedValues(
  current: AttributeData[],
  data: SubscriptionUpdateMsg['data'],
  replaceAll: boolean,
): AttributeData[] {
  const next = replaceAll ? [] : [...current];
  if (data) {
    for (const [key, entries] of Object.entries(data)) {
      if (!entries || entries.length === 0) {
        continue;
      }
      const [ts, value] = entries[0];
      const existingIndex = next.findIndex((entry) => entry.key === key);
      if (existingIndex >= 0) {
        next[existingIndex] = { key, value, lastUpdateTs: ts };
      } else {
        next.push({ key, value, lastUpdateTs: ts });
      }
    }
  }
  return next.sort((a, b) => a.key.localeCompare(b.key));
}

interface BaseRecord {
  cmdId: number;
  status: WsStatus;
  listeners: Set<() => void>;
  /** True from (re)subscribe until the first full snapshot arrives. */
  awaitingSnapshot: boolean;
}

interface AttrLikeRecord extends BaseRecord {
  kind: 'attributes' | 'latest-telemetry';
  cmd: AttributesSubscriptionCmd | TimeseriesSubscriptionCmd;
  snapshot: AttributeData[];
}

interface EntityDataRecord extends BaseRecord {
  kind: 'entity-data';
  cmd: EntityDataCmd;
  snapshot: EntityDataWire[];
}

interface AlarmDataRecord extends BaseRecord {
  kind: 'alarm-data';
  cmd: Extract<AnySubCmd, { type: WsCmdType.ALARM_DATA }>;
  snapshot: AlarmData[];
}

interface CountRecord extends BaseRecord {
  kind: 'count';
  cmd: AnySubCmd;
  snapshot: number;
}

interface AlarmStatusRecord extends BaseRecord {
  kind: 'alarm-status';
  cmd: Extract<AnySubCmd, { type: WsCmdType.ALARM_STATUS }>;
  snapshot: boolean;
}

type WsRecord = AttrLikeRecord | EntityDataRecord | AlarmDataRecord | CountRecord | AlarmStatusRecord;

export interface WsManager {
  subscribeAttributes(params: AttributesParams): WsSubscription<AttributeData[]>;
  subscribeLatestTelemetry(params: LatestTelemetryParams): WsSubscription<AttributeData[]>;
  subscribeEntityData(params: EntityDataParams): EntityDataSubscription;
  subscribeEntityCount(params: { query: { entityFilter: Record<string, unknown> } }): WsSubscription<number>;
  subscribeAlarmData(params: {
    query: Record<string, unknown>;
    seed?: AlarmData[];
  }): WsSubscription<AlarmData[]>;
  subscribeAlarmCount(params: { query: { entityFilter: Record<string, unknown> } }): WsSubscription<number>;
  subscribeAlarmStatus(params: {
    originatorId: EntityId;
    severityList?: Array<string>;
    typeList?: Array<string>;
  }): WsSubscription<boolean>;
  subscribeUnreadNotificationCount(): WsSubscription<number>;
  /** Manual teardown (logout). */
  close(): void;
}

export function createWsManager(options: WsManagerOptions): WsManager {
  const {
    url = defaultWsUrl(),
    ensureToken,
    onUnauthorized,
    onWsError,
    WebSocketCtor = typeof WebSocket !== 'undefined' ? WebSocket : undefined,
    maxCmdsPerFrame = DEFAULTS.maxCmdsPerFrame,
    reconnectBaseMs = DEFAULTS.reconnectBaseMs,
    reconnectMaxMs = DEFAULTS.reconnectMaxMs,
    maxReconnectAttempts = DEFAULTS.maxReconnectAttempts,
    idleCloseMs = DEFAULTS.idleCloseMs,
  } = options;

  if (!WebSocketCtor) {
    throw new Error('No WebSocket implementation available');
  }

  const records = new Map<number, WsRecord>();
  const queue: Array<AnySubCmd | { cmdId: number; type: WsCmdType }> = [];

  let socket: WebSocket | null = null;
  let pendingAuthCmd: { cmdId: 0; type: WsCmdType.AUTH; token: string } | null = null;
  let isActive = false; // manager wants a connection
  let isOpening = false;
  let isOpened = false;
  let isReconnect = false;
  let reconnectAttempts = 0;
  let consecutiveAuthFailures = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let idleCloseTimer: ReturnType<typeof setTimeout> | null = null;
  let lastCmdId = 0;
  let gotProductiveMessageOnSocket = false;

  const notify = (record: WsRecord) => {
    for (const listener of record.listeners) {
      listener();
    }
  };

  const setStatus = (record: WsRecord, status: WsStatus) => {
    record.status = status;
    notify(record);
  };

  const enqueueCmd = (cmd: AnySubCmd | { cmdId: number; type: WsCmdType }) => {
    queue.push(cmd);
  };

  const checkToClose = () => {
    if (records.size === 0 && isOpened) {
      if (!idleCloseTimer && socket) {
        const currentSocket = socket;
        idleCloseTimer = setTimeout(() => {
          idleCloseTimer = null;
          isActive = false;
          isOpened = false;
          currentSocket.close();
        }, idleCloseMs);
      }
    }
  };

  const cancelIdleClose = () => {
    if (idleCloseTimer) {
      clearTimeout(idleCloseTimer);
      idleCloseTimer = null;
    }
  };

  const publishCommands = () => {
    while (isOpened && socket && queue.length > 0) {
      const wrapper: CmdsWrapper = { cmds: queue.splice(0, maxCmdsPerFrame) };
      if (pendingAuthCmd) {
        wrapper.authCmd = pendingAuthCmd;
        pendingAuthCmd = null;
      }
      socket.send(JSON.stringify(wrapper));
      checkToClose();
    }
    if (records.size > 0) {
      tryOpenSocket();
    }
  };

  const abandon = (reason: string) => {
    isActive = false;
    cancelIdleClose();
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    queue.length = 0;
    for (const record of records.values()) {
      setStatus(record, 'auth-error');
    }
    onUnauthorized?.({ source: 'ws', reason });
  };

  const tryOpenSocket = () => {
    if (!isActive || isOpened || isOpening) {
      return;
    }
    isOpening = true;
    ensureToken(false)
      .then((token) => {
        isOpening = false;
        if (!token) {
          abandon('no-token');
          return;
        }
        if (!isActive) {
          return;
        }
        openSocket(token);
      })
      .catch(() => {
        isOpening = false;
        abandon('refresh-failed');
      });
  };

  const openSocket = (token: string) => {
    const ws = new WebSocketCtor(url);
    socket = ws;
    gotProductiveMessageOnSocket = false;
    pendingAuthCmd = { cmdId: 0, type: WsCmdType.AUTH, token };
    ws.onopen = () => {
      isOpening = false;
      isOpened = true;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (isReconnect) {
        isReconnect = false;
        // Re-send every live subscription under a FRESH cmdId. The next full
        // snapshot replaces each buffer wholesale (awaitingSnapshot).
        for (const record of records.values()) {
          record.cmdId = ++lastCmdId;
          record.cmd.cmdId = record.cmdId;
          record.awaitingSnapshot = true;
          records.delete(record.cmdId); // no-op when unchanged; re-keyed below
        }
        // re-key map (cmdIds just moved)
        const all = [...records.values()];
        records.clear();
        for (const record of all) {
          records.set(record.cmdId, record);
          setStatus(record, 'open');
          enqueueCmd(record.cmd as AnySubCmd);
        }
      } else {
        for (const record of records.values()) {
          setStatus(record, 'open');
        }
      }
      publishCommands();
    };
    ws.onmessage = (ev: MessageEvent) => {
      handleMessage(parseServerMessage(String(ev.data)));
    };
    ws.onclose = (ev: CloseEvent) => {
      handleClose(ev.code, ev.reason);
    };
  };

  const handleMessage = (message: WsServerMessage | null) => {
    if (!message) {
      return;
    }
    const asCmd = message as { errorCode?: number; errorMsg?: string };
    if (asCmd.errorCode) {
      onWsError?.(asCmd.errorCode, asCmd.errorMsg ?? '');
      return;
    }
    gotProductiveMessageOnSocket = true;
    consecutiveAuthFailures = 0;
    reconnectAttempts = 0;

    if (isSubscriptionUpdate(message)) {
      const record = records.get(message.subscriptionId);
      if (record && (record.kind === 'attributes' || record.kind === 'latest-telemetry')) {
        const replace = record.awaitingSnapshot;
        record.awaitingSnapshot = false;
        record.snapshot = mergeKeyedValues(record.snapshot, message.data, replace);
        notify(record);
      }
      return;
    }

    const cmdMsg = message as { cmdId: number };
    const record = records.get(cmdMsg.cmdId);
    if (!record) {
      return;
    }
    switch (record.kind) {
      case 'entity-data': {
        const msg = message as unknown as EntityDataUpdateMsg;
        if (msg.data?.data) {
          record.snapshot = record.awaitingSnapshot || !msg.update ? [...msg.data.data] : record.snapshot;
          record.awaitingSnapshot = false;
        }
        if (msg.update?.length) {
          const merged = msg.update;
          for (const incoming of merged) {
            const idx = record.snapshot.findIndex(
              (row) => String(row.entityId) === String(incoming.entityId),
            );
            if (idx >= 0) {
              record.snapshot = [
                ...record.snapshot.slice(0, idx),
                { ...record.snapshot[idx], ...incoming, latest: { ...record.snapshot[idx].latest, ...incoming.latest } },
                ...record.snapshot.slice(idx + 1),
              ];
            } else {
              record.snapshot = [...record.snapshot, incoming];
            }
          }
        }
        notify(record);
        break;
      }
      case 'alarm-data': {
        const msg = message as { data?: { data: AlarmData[] }; update?: AlarmData[] };
        if (msg.data?.data) {
          record.snapshot = [...msg.data.data];
        }
        if (msg.update?.length) {
          for (const incoming of msg.update) {
            const idx = record.snapshot.findIndex(
              (row) => row.id?.id === incoming.id?.id,
            );
            if (idx >= 0) {
              record.snapshot = [
                ...record.snapshot.slice(0, idx),
                { ...record.snapshot[idx], ...incoming },
                ...record.snapshot.slice(idx + 1),
              ];
            } else {
              record.snapshot = [...record.snapshot, incoming];
            }
          }
        }
        notify(record);
        break;
      }
      case 'count': {
        const msg = message as { count?: number };
        if (typeof msg.count === 'number') {
          record.snapshot = msg.count;
          notify(record);
        }
        break;
      }
      case 'alarm-status': {
        const msg = message as { active?: boolean };
        if (typeof msg.active === 'boolean') {
          record.snapshot = msg.active;
          notify(record);
        }
        break;
      }
      default:
        break;
    }
    checkToClose();
  };

  const scheduleReconnect = (delay: number) => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      tryOpenSocket();
    }, delay);
  };

  const handleClose = (code: number, reason: string) => {
    isOpening = false;
    isOpened = false;
    socket = null;
    if (!isActive) {
      return;
    }

    // Auth rejection: server closed with BAD_DATA/POLICY_VIOLATION before any
    // productive message on this socket.
    if (!gotProductiveMessageOnSocket && AUTH_FAILURE_CODES.has(code)) {
      consecutiveAuthFailures += 1;
      if (consecutiveAuthFailures >= 2) {
        abandon(reason || 'auth-failed-twice');
        return;
      }
      ensureToken(true)
        .then((token) => {
          if (!token || !isActive) {
            abandon('auth-refresh-failed');
            return;
          }
          isReconnect = true;
          for (const record of records.values()) {
            setStatus(record, 'reconnecting');
          }
          openSocket(token);
        })
        .catch(() => abandon('auth-refresh-failed'));
      return;
    }

    if (!isReconnect) {
      isReconnect = true;
      for (const record of records.values()) {
        setStatus(record, 'reconnecting');
      }
    }
    if (reconnectAttempts >= maxReconnectAttempts) {
      abandon('reconnect-exhausted');
      return;
    }
    const delay = Math.min(reconnectBaseMs * 2 ** reconnectAttempts, reconnectMaxMs);
    reconnectAttempts = Math.min(reconnectAttempts + 1, maxReconnectAttempts);
    scheduleReconnect(delay);
  };

  const makeUnsubscribeCmd = (record: WsRecord): { cmdId: number; type: WsCmdType } => {
    switch (record.kind) {
      case 'attributes':
        return { ...record.cmd, unsubscribe: true } as AttributesSubscriptionCmd;
      case 'latest-telemetry':
        return { ...record.cmd, unsubscribe: true } as TimeseriesSubscriptionCmd;
      case 'entity-data':
        return { cmdId: record.cmdId, type: WsCmdType.ENTITY_DATA_UNSUBSCRIBE };
      case 'alarm-data':
        return { cmdId: record.cmdId, type: WsCmdType.ALARM_DATA_UNSUBSCRIBE };
      case 'count':
        return record.cmd.type === WsCmdType.ALARM_COUNT
          ? { cmdId: record.cmdId, type: WsCmdType.ALARM_COUNT_UNSUBSCRIBE }
          : { cmdId: record.cmdId, type: WsCmdType.ENTITY_COUNT_UNSUBSCRIBE };
      case 'alarm-status':
        return { cmdId: record.cmdId, type: WsCmdType.ALARM_STATUS_UNSUBSCRIBE };
    }
  };

  const detachRecord = (record: WsRecord) => {
    if (isActive && isOpened) {
      enqueueCmd(makeUnsubscribeCmd(record));
    }
    records.delete(record.cmdId);
    publishCommands();
    checkToClose();
  };

  const registerRecord = (record: WsRecord): void => {
    record.cmdId = ++lastCmdId;
    record.cmd.cmdId = record.cmdId;
    records.set(record.cmdId, record);
    isActive = true;
    cancelIdleClose();
    enqueueCmd(record.cmd as AnySubCmd);
    publishCommands();
  };

  const wireSubscription = <T>(record: WsRecord, read: () => T): WsSubscription<T> => ({
    getSnapshot: read,
    getStatus: () => record.status,
    subscribe(listener: () => void) {
      record.listeners.add(listener);
      return () => {
        record.listeners.delete(listener);
      };
    },
    unsubscribe() {
      detachRecord(record);
    },
  });

  return {
    subscribeAttributes({ entityId, scope, keys, seed }) {
      const record: AttrLikeRecord = {
        kind: 'attributes',
        cmdId: 0,
        status: 'idle',
        listeners: new Set(),
        awaitingSnapshot: true,
        cmd: {
          cmdId: 0,
          type: WsCmdType.ATTRIBUTES,
          keys: keys?.join(',') ?? '',
          entityType: entityId.entityType,
          entityId: entityId.id,
          scope,
        },
        snapshot: seed ? [...seed] : [],
      };
      registerRecord(record);
      return wireSubscription(record, () => record.snapshot);
    },

    subscribeLatestTelemetry({ entityId, keys, timeWindowMs = 60_000, seed }) {
      const record: AttrLikeRecord = {
        kind: 'latest-telemetry',
        cmdId: 0,
        status: 'idle',
        listeners: new Set(),
        awaitingSnapshot: true,
        cmd: {
          cmdId: 0,
          type: WsCmdType.TIMESERIES,
          keys: keys?.join(',') ?? '',
          entityType: entityId.entityType,
          entityId: entityId.id,
          startTs: Date.now() - timeWindowMs,
          timeWindow: timeWindowMs,
          interval: 0,
          limit: 100,
          agg: 'NONE',
        },
        snapshot: seed ? [...seed] : [],
      };
      registerRecord(record);
      return wireSubscription(record, () => record.snapshot);
    },

    subscribeEntityData({ query, latestCmd, seed }) {
      const record: EntityDataRecord = {
        kind: 'entity-data',
        cmdId: 0,
        status: 'idle',
        listeners: new Set(),
        awaitingSnapshot: true,
        cmd: { cmdId: 0, type: WsCmdType.ENTITY_DATA, query, latestCmd },
        snapshot: seed ? [...seed] : [],
      };
      registerRecord(record);
      const base = wireSubscription(record, () => record.snapshot);
      return {
        ...base,
        update(changes) {
          if (!isOpened || isReconnect) {
            return; // ui-ngx semantics: no update sends during reconnect
          }
          record.cmd = {
            ...record.cmd,
            ...(changes.query ? { query: changes.query } : {}),
            ...(changes.latestCmd ? { latestCmd: changes.latestCmd } : {}),
          };
          enqueueCmd(record.cmd);
          publishCommands();
        },
      };
    },

    subscribeEntityCount({ query }) {
      const record: CountRecord = {
        kind: 'count',
        cmdId: 0,
        status: 'idle',
        listeners: new Set(),
        awaitingSnapshot: true,
        cmd: { cmdId: 0, type: WsCmdType.ENTITY_COUNT, query },
        snapshot: 0,
      };
      registerRecord(record);
      return wireSubscription(record, () => record.snapshot);
    },

    subscribeAlarmData({ query, seed }) {
      const record: AlarmDataRecord = {
        kind: 'alarm-data',
        cmdId: 0,
        status: 'idle',
        listeners: new Set(),
        awaitingSnapshot: true,
        cmd: {
          cmdId: 0,
          type: WsCmdType.ALARM_DATA,
          query: query as never,
        },
        snapshot: seed ? [...seed] : [],
      };
      registerRecord(record);
      return wireSubscription(record, () => record.snapshot);
    },

    subscribeAlarmCount({ query }) {
      const record: CountRecord = {
        kind: 'count',
        cmdId: 0,
        status: 'idle',
        listeners: new Set(),
        awaitingSnapshot: true,
        cmd: { cmdId: 0, type: WsCmdType.ALARM_COUNT, query },
        snapshot: 0,
      };
      registerRecord(record);
      return wireSubscription(record, () => record.snapshot);
    },

    subscribeAlarmStatus({ originatorId, severityList, typeList }) {
      const record: AlarmStatusRecord = {
        kind: 'alarm-status',
        cmdId: 0,
        status: 'idle',
        listeners: new Set(),
        awaitingSnapshot: true,
        cmd: {
          cmdId: 0,
          type: WsCmdType.ALARM_STATUS,
          originatorId,
          severityList,
          typeList,
        },
        snapshot: false,
      };
      registerRecord(record);
      return wireSubscription(record, () => record.snapshot);
    },

    subscribeUnreadNotificationCount() {
      const record: CountRecord = {
        kind: 'count',
        cmdId: 0,
        status: 'idle',
        listeners: new Set(),
        awaitingSnapshot: true,
        cmd: { cmdId: 0, type: WsCmdType.NOTIFICATIONS_COUNT },
        snapshot: 0,
      };
      registerRecord(record);
      return wireSubscription(record, () => record.snapshot);
    },

    close() {
      isActive = false;
      cancelIdleClose();
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      queue.length = 0;
      if (socket) {
        const currentSocket = socket;
        socket = null;
        currentSocket.close();
      }
      isOpened = false;
      for (const record of records.values()) {
        setStatus(record, 'closed');
      }
    },
  };
}
