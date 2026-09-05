/**
 * subscribeNotifications (NOTIFICATIONS cmd) — M12 wave 2. Message shapes
 * pinned against TbWebSocketMsgHandler: a bare object per message with
 * `notifications` (full replace), `update` (single entry) and the unread
 * counter; the server pushes a full snapshot after (re)subscribe.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  NotificationDeliveryMethod,
  NotificationType,
} from '@/types/tb/notification';

import { createWsManager, type WsManager } from './manager';
import { WsCmdType } from './protocol';

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: FakeWebSocket[] = [];
  static get last(): FakeWebSocket {
    return FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
  }

  url: string;
  readyState = 0; // CONNECTING
  sent: string[] = [];
  onopen: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: ((ev: { code: number; reason?: string }) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.readyState = 3;
  }

  serverOpen(): void {
    this.readyState = 1;
    this.onopen?.({});
  }

  serverMessage(obj: unknown): void {
    this.onmessage?.({ data: JSON.stringify(obj) });
  }

  serverClose(code = 1006, reason = ''): void {
    this.readyState = 3;
    this.onclose?.({ code, reason });
  }

  frames(): Array<{
    authCmd?: unknown;
    cmds: Array<{ cmdId: number; type: string }>;
  }> {
    return this.sent.map((raw) => JSON.parse(raw));
  }
}

async function flush(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
}

describe('ws manager — notifications subscription', () => {
  let manager: WsManager;

  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.useFakeTimers();
  });

  afterEach(() => {
    manager?.close();
    vi.useRealTimers();
  });

  function create(): WsManager {
    manager = createWsManager({
      ensureToken: async () => 'jwt-token',
      WebSocketCtor: FakeWebSocket as unknown as typeof WebSocket,
    });
    return manager;
  }

  const notification = (id: string) => ({
    id: { entityType: 'NOTIFICATION', id },
    createdTime: 1000,
    requestId: { entityType: 'NOTIFICATION_REQUEST', id: `req-${id}` },
    recipientId: { entityType: 'USER', id: 'u-1' },
    type: NotificationType.ALARM,
    deliveryMethod: NotificationDeliveryMethod.WEB,
    subject: 'Alarm',
    text: 'High temperature',
    status: 'SENT',
  });

  it('sends the NOTIFICATIONS cmd with limit/types and unsubscribes on teardown', async () => {
    const m = create();
    const sub = m.subscribeNotifications({
      limit: 10,
      types: [NotificationType.ALARM, NotificationType.GENERAL],
    });
    await flush();
    const ws = FakeWebSocket.last;
    ws.serverOpen();
    expect(ws.frames()[0].cmds[0]).toEqual({
      cmdId: 1,
      type: WsCmdType.NOTIFICATIONS,
      limit: 10,
      types: ['ALARM', 'GENERAL'],
    });

    sub.unsubscribe();
    expect(ws.frames().at(-1)?.cmds[0]).toEqual({
      cmdId: 1,
      type: WsCmdType.NOTIFICATIONS_UNSUBSCRIBE,
    });
  });

  it('replaces on full snapshots, exposes single updates, tracks the unread counter', async () => {
    const m = create();
    const sub = m.subscribeNotifications({ limit: 5 });
    const listener = vi.fn();
    sub.subscribe(listener);
    await flush();
    const ws = FakeWebSocket.last;
    ws.serverOpen();
    // Status transitions (open) notify too — baseline after connect.
    const baseline = listener.mock.calls.length;
    expect(baseline).toBeGreaterThanOrEqual(1);

    // Full snapshot (subscribe push): replaces, carries count + sequence.
    ws.serverMessage({
      cmdId: 1,
      errorCode: 0,
      errorMsg: '',
      cmdUpdateType: 'NOTIFICATIONS',
      notifications: [notification('n-2'), notification('n-1')],
      totalUnreadCount: 2,
      sequenceNumber: 2,
    });
    expect(sub.getSnapshot().notifications).toHaveLength(2);
    expect(sub.getSnapshot().update).toBeNull();
    expect(sub.getSnapshot().totalUnreadCount).toBe(2);
    expect(sub.getSnapshot().sequenceNumber).toBe(2);

    // Single update: count bumps, list is retained for the consumer.
    const before = sub.getSnapshot();
    ws.serverMessage({
      cmdId: 1,
      errorCode: 0,
      errorMsg: '',
      cmdUpdateType: 'NOTIFICATIONS',
      update: notification('n-3'),
      totalUnreadCount: 3,
      sequenceNumber: 3,
    });
    expect(sub.getSnapshot().update?.id.id).toBe('n-3');
    expect(sub.getSnapshot().notifications).toHaveLength(2);
    expect(sub.getSnapshot().totalUnreadCount).toBe(3);
    // useSyncExternalStore contract: a fresh snapshot reference per message.
    expect(sub.getSnapshot()).not.toBe(before);

    // Count-only message: update clears back to null, list stays.
    ws.serverMessage({
      cmdId: 1,
      errorCode: 0,
      errorMsg: '',
      cmdUpdateType: 'NOTIFICATIONS',
      totalUnreadCount: 1,
      sequenceNumber: 4,
    });
    expect(sub.getSnapshot().update).toBeNull();
    expect(sub.getSnapshot().notifications).toHaveLength(2);
    expect(sub.getSnapshot().totalUnreadCount).toBe(1);
    expect(listener).toHaveBeenCalledTimes(baseline + 3);
  });

  it('re-subscribes with a fresh cmdId after reconnect; the next snapshot replaces the list', async () => {
    const m = create();
    const sub = m.subscribeNotifications({ limit: 5 });
    await flush();
    let ws = FakeWebSocket.last;
    ws.serverOpen();
    ws.serverMessage({
      cmdId: 1,
      errorCode: 0,
      errorMsg: '',
      cmdUpdateType: 'NOTIFICATIONS',
      notifications: [notification('n-1')],
      totalUnreadCount: 1,
      sequenceNumber: 1,
    });

    ws.serverClose(1006);
    await vi.advanceTimersByTimeAsync(2000); // 2s backoff → socket #2
    ws = FakeWebSocket.last;
    ws.serverOpen();
    const resub = ws.frames()[0].cmds[0];
    expect(resub).toMatchObject({ cmdId: 2, type: WsCmdType.NOTIFICATIONS });

    ws.serverMessage({
      cmdId: 2,
      errorCode: 0,
      errorMsg: '',
      cmdUpdateType: 'NOTIFICATIONS',
      notifications: [notification('n-4'), notification('n-3')],
      totalUnreadCount: 2,
      sequenceNumber: 5,
    });
    expect(sub.getSnapshot().notifications?.map((n) => n.id.id)).toEqual([
      'n-4',
      'n-3',
    ]);
    expect(sub.getSnapshot().sequenceNumber).toBe(5);
  });
});
