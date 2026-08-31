import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createWsManager, type WsManager } from './manager';
import { WsCmdType } from './protocol';
import { EntityType } from '@/types/tb';

class FakeWebSocket {
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
  onerror: ((ev: unknown) => void) | null = null;

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

  // --- test-side controls -------------------------------------------------
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

  frames(): Array<{ authCmd?: unknown; cmds: unknown[] }> {
    return this.sent.map((raw) => JSON.parse(raw));
  }
}

/** Socket construction happens behind an async ensureToken — flush it. */
async function flush(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
}

function makeEnsureToken(token = 'jwt-token') {
  return vi.fn(async (forceRefresh?: boolean) =>
    forceRefresh ? `jwt-refreshed-${FakeWebSocket.instances.length}` : token,
  );
}

describe('ws manager', () => {
  let manager: WsManager;

  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.useFakeTimers();
  });

  afterEach(() => {
    manager?.close();
    vi.useRealTimers();
  });

  function create(
    overrides: Partial<Parameters<typeof createWsManager>[0]> = {},
  ): WsManager {
    manager = createWsManager({
      ensureToken: makeEnsureToken(),
      WebSocketCtor: FakeWebSocket as unknown as typeof WebSocket,
      ...overrides,
    });
    return manager;
  }

  it('sends in-band AUTH as the first frame with the first command batch', async () => {
    const m = create();
    m.subscribeAttributes({
      entityId: { entityType: EntityType.DEVICE, id: 'd1' },
      keys: ['voltage'],
    });
    await flush();
    const ws = FakeWebSocket.last;
    ws.serverOpen();
    const frame = ws.frames()[0];
    expect(frame.authCmd).toMatchObject({
      type: WsCmdType.AUTH,
      token: 'jwt-token',
    });
    expect(frame.cmds[0]).toMatchObject({
      type: WsCmdType.ATTRIBUTES,
      keys: 'voltage',
    });
    // auth never repeats on subsequent frames
    m.subscribeAttributes({
      entityId: { entityType: EntityType.DEVICE, id: 'd2' },
      keys: ['temp'],
    });
    const frame2 = ws.frames()[1];
    expect(frame2.authCmd).toBeUndefined();
  });

  it('refreshes the token before connecting when it is locally expired', async () => {
    const ensureToken = makeEnsureToken();
    const m = create({ ensureToken });
    m.subscribeAttributes({
      entityId: { entityType: EntityType.DEVICE, id: 'd1' },
    });
    await flush();
    FakeWebSocket.last.serverOpen();
    expect(FakeWebSocket.last.frames()[0].authCmd).toMatchObject({
      token: 'jwt-token',
    });
    expect(ensureToken).toHaveBeenCalled();
  });

  it('AUTH failure refreshes, reconnects, resubscribes; second failure abandons', async () => {
    const onUnauthorized = vi.fn();
    const ensureToken = makeEnsureToken();
    const m = create({ ensureToken, onUnauthorized });
    const sub = m.subscribeAttributes({
      entityId: { entityType: EntityType.DEVICE, id: 'd1' },
      keys: ['v1'],
    });
    await flush();
    const ws1 = FakeWebSocket.last;
    ws1.serverOpen();
    // server rejects token: BAD_DATA close before any productive message
    ws1.serverClose(1007, 'Token has expired');
    await flush();
    // reconnect socket opened with the refreshed token
    const ws2 = FakeWebSocket.last;
    expect(ws2).not.toBe(ws1);
    ws2.serverOpen();
    expect(ws2.frames()[0].authCmd).toMatchObject({
      token: expect.stringContaining('jwt-refreshed'),
    });
    // resubscribed on the new socket with a NEW cmdId (old was 1)
    const resub = ws2.frames()[0].cmds[0];
    expect(resub).toMatchObject({ type: WsCmdType.ATTRIBUTES, cmdId: 2 });
    // second consecutive auth failure → abandon + unified unauthorized event
    ws2.serverClose(1007, 'Token has expired');
    await flush();
    expect(onUnauthorized).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'ws' }),
    );
    expect(sub.getStatus()).toBe('auth-error');
  });

  it('reconnects with 2s*2^n backoff capped at 60s, max 10 attempts', async () => {
    const m = create();
    m.subscribeAttributes({
      entityId: { entityType: EntityType.DEVICE, id: 'd1' },
    });
    await flush();
    let ws = FakeWebSocket.last;
    ws.serverOpen();
    // productive message resets the attempt counter
    ws.serverMessage({
      subscriptionId: 1,
      errorCode: 0,
      errorMsg: '',
      data: { v: [[1000, 'x']] },
    });

    const expected = [2000, 4000, 8000, 16000, 32000, 60000, 60000, 60000, 60000, 60000];
    for (let i = 0; i < expected.length; i++) {
      ws.serverClose(1006);
      // no reconnect before the delay elapses
      await vi.advanceTimersByTimeAsync(expected[i] - 100);
      expect(FakeWebSocket.instances).toHaveLength(i + 1);
      await vi.advanceTimersByTimeAsync(100);
      expect(FakeWebSocket.instances).toHaveLength(i + 2);
      ws = FakeWebSocket.last;
      ws.serverOpen();
    }
    // 11th failure: attempts exhausted → abandoned, no further sockets
    ws.serverClose(1006);
    await vi.advanceTimersByTimeAsync(120_000);
    expect(FakeWebSocket.instances).toHaveLength(11);
  });

  it('a productive message resets the backoff sequence', async () => {
    const m = create();
    m.subscribeAttributes({
      entityId: { entityType: EntityType.DEVICE, id: 'd1' },
    });
    await flush();
    let ws = FakeWebSocket.last;
    ws.serverOpen();
    ws.serverClose(1006);
    await vi.advanceTimersByTimeAsync(2000);
    ws = FakeWebSocket.last; // reconnect #1 (delay 2s)
    ws.serverOpen();
    ws.serverMessage({
      subscriptionId: 2,
      errorCode: 0,
      errorMsg: '',
      data: {},
    });
    ws.serverClose(1006);
    // counter was reset → next delay is 2s again, not 4s
    await vi.advanceTimersByTimeAsync(2000);
    expect(FakeWebSocket.instances).toHaveLength(3);
  });

  it('reconnect resubscribes everything with fresh cmdIds; buffer replaced wholesale', async () => {
    const m = create();
    const sub = m.subscribeAttributes({
      entityId: { entityType: EntityType.DEVICE, id: 'd1' },
      keys: ['a', 'b'],
      seed: [{ key: 'seed', value: 1 }],
    });
    await flush();
    let ws = FakeWebSocket.last;
    ws.serverOpen();
    ws.serverMessage({
      subscriptionId: 1,
      errorCode: 0,
      errorMsg: '',
      data: { a: [[111, 1]] },
    });
    expect(sub.getSnapshot()).toEqual([{ key: 'a', value: 1, lastUpdateTs: 111 }]);

    ws.serverClose(1006);
    await vi.advanceTimersByTimeAsync(2000);
    ws = FakeWebSocket.last;
    ws.serverOpen();
    // new cmdId (2) — full re-subscribe frame
    expect(ws.frames()[0].cmds[0]).toMatchObject({
      cmdId: 2,
      type: WsCmdType.ATTRIBUTES,
    });
    // first message after resubscribe REPLACES the buffer (seed + old data gone)
    ws.serverMessage({
      subscriptionId: 2,
      errorCode: 0,
      errorMsg: '',
      data: { b: [[222, 2]] },
    });
    expect(sub.getSnapshot()).toEqual([{ key: 'b', value: 2, lastUpdateTs: 222 }]);
  });

  it('merges incremental legacy updates per key', async () => {
    const m = create();
    const sub = m.subscribeAttributes({
      entityId: { entityType: EntityType.DEVICE, id: 'd1' },
      keys: ['a'],
    });
    await flush();
    const ws = FakeWebSocket.last;
    ws.serverOpen();
    ws.serverMessage({
      subscriptionId: 1,
      errorCode: 0,
      errorMsg: '',
      data: { a: [[100, 'old']] },
    });
    ws.serverMessage({
      subscriptionId: 1,
      errorCode: 0,
      errorMsg: '',
      data: { a: [[200, 'new']] },
    });
    expect(sub.getSnapshot()).toEqual([{ key: 'a', value: 'new', lastUpdateTs: 200 }]);
  });

  it('caps command frames at 10 per send', async () => {
    const m = create();
    for (let i = 0; i < 25; i++) {
      m.subscribeAttributes({
        entityId: { entityType: EntityType.DEVICE, id: `d${i}` },
      });
    }
    await flush();
    const ws = FakeWebSocket.last; // pre-connect queueing
    ws.serverOpen();
    expect(ws.frames()).toHaveLength(3);
    expect(ws.frames()[0].cmds).toHaveLength(10);
    expect(ws.frames()[1].cmds).toHaveLength(10);
    expect(ws.frames()[2].cmds).toHaveLength(5);
  });

  it('closes the socket after 90s with zero subscriptions', async () => {
    const m = create();
    const sub = m.subscribeAttributes({
      entityId: { entityType: EntityType.DEVICE, id: 'd1' },
    });
    await flush();
    const ws = FakeWebSocket.last;
    ws.serverOpen();
    sub.unsubscribe();
    expect(ws.readyState).toBe(1); // not closed immediately
    // unsubscribe cmd was sent
    expect(ws.frames().at(-1)?.cmds[0]).toMatchObject({
      type: WsCmdType.ATTRIBUTES,
      unsubscribe: true,
    });
    await vi.advanceTimersByTimeAsync(89_999);
    expect(ws.readyState).toBe(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(ws.readyState).toBe(3);
    // a late subscription cancels the pending close
    const sub2 = m.subscribeAttributes({
      entityId: { entityType: EntityType.DEVICE, id: 'd2' },
    });
    await flush();
    const ws2 = FakeWebSocket.last;
    ws2.serverOpen();
    sub2.unsubscribe();
    await vi.advanceTimersByTimeAsync(30_000);
    m.subscribeAttributes({
      entityId: { entityType: EntityType.DEVICE, id: 'd3' },
    });
    await flush();
    await vi.advanceTimersByTimeAsync(70_000);
    expect(FakeWebSocket.last.readyState).toBe(1);
  });

  it('entity-data subscription: full snapshot replaces, updates merge by entity', async () => {
    const m = create();
    const sub = m.subscribeEntityData({
      query: {
        entityFilter: {
          type: 'singleEntity',
          singleEntity: { entityType: EntityType.DEVICE, id: 'd1' },
        },
        pageLink: { page: 0, pageSize: 10 },
      },
      latestCmd: { keys: [{ type: 'TIME_SERIES', key: 'temp' }] },
    });
    await flush();
    const ws = FakeWebSocket.last;
    ws.serverOpen();
    sub.update({
      query: {
        entityFilter: {
          type: 'singleEntity',
          singleEntity: { entityType: EntityType.DEVICE, id: 'd1' },
        },
        pageLink: { page: 1, pageSize: 10 },
      },
    });
    const updateFrames = ws.frames().filter((f) =>
      f.cmds.some((c) => c.type === WsCmdType.ENTITY_DATA),
    );
    // same cmdId re-sent with the new page (update semantics, no resubscribe)
    const ids = updateFrames.map(
      (f) => f.cmds.find((c) => c.type === WsCmdType.ENTITY_DATA).cmdId,
    );
    expect(new Set(ids).size).toBe(1);

    const entity = { entityType: EntityType.DEVICE, id: 'd1' };
    ws.serverMessage({
      cmdId: ids[0],
      errorCode: 0,
      errorMsg: '',
      cmdUpdateType: 'ENTITY_DATA',
      data: {
        data: [
          { entityId: entity, latest: { TIME_SERIES: { temp: { ts: 1, value: '21' } } } },
        ],
        totalPages: 1,
        totalElements: 1,
        hasNext: false,
      },
    });
    expect(sub.getSnapshot()).toHaveLength(1);
    ws.serverMessage({
      cmdId: ids[0],
      errorCode: 0,
      errorMsg: '',
      cmdUpdateType: 'ENTITY_DATA',
      update: [
        { entityId: entity, latest: { TIME_SERIES: { temp: { ts: 2, value: '22' } } } },
      ],
    });
    expect(sub.getSnapshot()[0].latest?.TIME_SERIES?.temp).toEqual({ ts: 2, value: '22' });
  });

  it('notifies listeners on every data change (useSyncExternalStore contract)', async () => {
    const m = create();
    const sub = m.subscribeAttributes({
      entityId: { entityType: EntityType.DEVICE, id: 'd1' },
      keys: ['a'],
    });
    const listener = vi.fn();
    const dispose = sub.subscribe(listener);
    await flush();
    const ws = FakeWebSocket.last;
    ws.serverOpen();
    // status transitions (open) notify too — baseline after connect
    const baseline = listener.mock.calls.length;
    expect(baseline).toBeGreaterThanOrEqual(1);
    ws.serverMessage({
      subscriptionId: 1,
      errorCode: 0,
      errorMsg: '',
      data: { a: [[1, 'x']] },
    });
    expect(listener).toHaveBeenCalledTimes(baseline + 1);
    dispose();
    ws.serverMessage({
      subscriptionId: 1,
      errorCode: 0,
      errorMsg: '',
      data: { a: [[2, 'y']] },
    });
    expect(listener).toHaveBeenCalledTimes(baseline + 1);
  });

  it('latest telemetry subscription sends TIMESERIES cmd and decodes values', async () => {
    const m = create();
    const sub = m.subscribeLatestTelemetry({
      entityId: { entityType: EntityType.DEVICE, id: 'd1' },
      keys: ['temp'],
      timeWindowMs: 60_000,
    });
    await flush();
    const ws = FakeWebSocket.last;
    ws.serverOpen();
    const cmd = ws.frames()[0].cmds[0];
    expect(cmd).toMatchObject({ type: WsCmdType.TIMESERIES, keys: 'temp' });
    ws.serverMessage({
      subscriptionId: cmd.cmdId,
      errorCode: 0,
      errorMsg: '',
      data: { temp: [[500, '42']] },
    });
    expect(sub.getSnapshot()).toEqual([
      { key: 'temp', value: '42', lastUpdateTs: 500 },
    ]);
  });

  it('surfaces ws errorCode messages through onWsError', async () => {
    const onWsError = vi.fn();
    const m = create({ onWsError });
    m.subscribeAttributes({
      entityId: { entityType: EntityType.DEVICE, id: 'd1' },
    });
    await flush();
    const ws = FakeWebSocket.last;
    ws.serverOpen();
    ws.serverMessage({
      cmdId: 1,
      errorCode: 1,
      errorMsg: 'boom',
      cmdUpdateType: 'ENTITY_DATA',
    });
    expect(onWsError).toHaveBeenCalledWith(1, 'boom');
  });
});
