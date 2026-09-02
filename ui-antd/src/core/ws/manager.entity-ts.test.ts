/**
 * The M5 W2 ENTITY_DATA timeseries family: subscribeEntityTimeseries
 * (tsCmd realtime stream / historyCmd fixed read) + the incremental update
 * merge. Frame/budget behavior rides the shared manager machinery covered in
 * manager.test.ts; these tests pin the typed payload and the merge rules.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EntityType } from '@/types/tb';
import {
  createWsManager,
  type EntityTimeseriesRow,
  mergeTimeseriesRows,
  type WsManager,
} from './manager';
import type { EntityDataUpdateMsg } from './protocol';
import { CmdUpdateType, WsCmdType } from './protocol';

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
  readyState = 0;
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

  frames(): Array<{ authCmd?: unknown; cmds: Array<Record<string, unknown>> }> {
    return this.sent.map((raw) => JSON.parse(raw));
  }
}

async function flush(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
}

describe('ws manager entity timeseries family (M5 W2)', () => {
  let manager: WsManager;

  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.useFakeTimers();
    manager = createWsManager({
      ensureToken: async () => 'jwt-token',
      WebSocketCtor: FakeWebSocket as unknown as typeof WebSocket,
    });
  });

  afterEach(() => {
    manager?.close();
    vi.useRealTimers();
  });

  it('sends an ENTITY_DATA cmd carrying the typed realtime tsCmd', async () => {
    const subscription = manager.subscribeEntityTimeseries({
      query: {
        entityFilter: { type: 'entityType', entityType: 'DEVICE' },
        pageLink: { pageSize: 100, page: 0 },
      },
      tsCmd: {
        keys: ['temperature'],
        startTs: 1000,
        timeWindow: 60_000,
        intervalType: 'MILLISECONDS',
        interval: 5000,
        limit: 500,
        agg: 'AVG',
      },
    });
    await flush();
    FakeWebSocket.last.serverOpen();
    const cmds = FakeWebSocket.last
      .frames()[0]
      .cmds.filter((c) => c.type === WsCmdType.ENTITY_DATA);
    expect(cmds).toHaveLength(1);
    expect(cmds[0].tsCmd).toMatchObject({
      keys: ['temperature'],
      startTs: 1000,
      timeWindow: 60_000,
      intervalType: 'MILLISECONDS',
      interval: 5000,
      agg: 'AVG',
    });
    expect(subscription.getSnapshot()).toEqual([]);
  });

  it('replaces the buffer with the first full snapshot and merges streamed diffs per key', async () => {
    const seed: Array<EntityTimeseriesRow> = [
      {
        entityId: { entityType: EntityType.DEVICE, id: 'd1' },
        timeseries: { temperature: [{ ts: 1000, value: '20' }] },
      },
    ];
    const subscription = manager.subscribeEntityTimeseries({
      query: {
        entityFilter: { type: 'entityType', entityType: 'DEVICE' },
        pageLink: { pageSize: 100, page: 0 },
      },
      tsCmd: {
        keys: ['temperature'],
        startTs: 0,
        timeWindow: 60_000,
        intervalType: 'MILLISECONDS',
        interval: 0,
        limit: 500,
        agg: 'NONE',
      },
      seed,
    });
    expect(subscription.getSnapshot()).toEqual(seed);

    await flush();
    FakeWebSocket.last.serverOpen();
    // streamed diff: one new point for d1, one for a late-joining d2
    FakeWebSocket.last.serverMessage({
      cmdId: 1,
      errorCode: 0,
      errorMsg: '',
      cmdUpdateType: CmdUpdateType.ENTITY_DATA,
      update: [
        {
          entityId: { entityType: EntityType.DEVICE, id: 'd1' },
          timeseries: { temperature: [{ ts: 61_000, value: '21' }] },
        },
        {
          entityId: { entityType: EntityType.DEVICE, id: 'd2' },
          timeseries: {
            temperature: [
              { ts: 1000, value: '30' },
              { ts: 2000, value: '31' },
            ],
          },
        },
      ],
    } satisfies EntityDataUpdateMsg);

    const rows = subscription.getSnapshot();
    expect(rows).toHaveLength(2);
    const d1 = rows.find((row) => (row.entityId as { id: string }).id === 'd1');
    expect(d1?.timeseries.temperature.map((p) => p.ts)).toEqual([1000, 61_000]);
    // seeded point survived the diff — streaming never clobbers history
    expect(d1?.timeseries.temperature[0].value).toBe('20');
  });

  it('merges latest values from latestCmd updates and unsubscribes with the ENTITY_DATA id', async () => {
    const subscription = manager.subscribeEntityTimeseries({
      query: {
        entityFilter: { type: 'singleEntity' },
        pageLink: { pageSize: 100, page: 0 },
      },
      historyCmd: {
        keys: ['temperature'],
        startTs: 0,
        endTs: 60_000,
        intervalType: 'MILLISECONDS',
        interval: 10_000,
        limit: 100,
        agg: 'AVG',
      },
      latestCmd: {
        keys: [{ type: 'ATTRIBUTE', key: 'active' }],
      },
    });
    await flush();
    FakeWebSocket.last.serverOpen();
    FakeWebSocket.last.serverMessage({
      cmdId: 1,
      errorCode: 0,
      errorMsg: '',
      cmdUpdateType: CmdUpdateType.ENTITY_DATA,
      data: {
        data: [
          {
            entityId: { entityType: EntityType.DEVICE, id: 'd1' },
            timeseries: { temperature: [{ ts: 5000, value: '22.5' }] },
            latest: {
              ATTRIBUTE: { active: { ts: 5000, value: 'true' } },
            },
          },
        ],
        totalPages: 1,
        totalElements: 1,
        hasNext: false,
      },
    } satisfies EntityDataUpdateMsg);
    expect(subscription.getSnapshot()).toEqual([
      {
        entityId: { entityType: EntityType.DEVICE, id: 'd1' },
        timeseries: { temperature: [{ ts: 5000, value: '22.5' }] },
        latest: { ATTRIBUTE: { active: { ts: 5000, value: 'true' } } },
      },
    ]);

    subscription.unsubscribe();
    const unsub = FakeWebSocket.last
      .frames()
      .find((frame) =>
        frame.cmds.some((c) => c.type === WsCmdType.ENTITY_DATA_UNSUBSCRIBE),
      )
      ?.cmds.find((c) => c.type === WsCmdType.ENTITY_DATA_UNSUBSCRIBE);
    expect(unsub).toMatchObject({ cmdId: 1, type: 'ENTITY_DATA_UNSUBSCRIBE' });
  });

  it('routes entity-data latest updates to the right row (object ids)', async () => {
    // regression: the update match used String(entityId), which collapses to
    // '[object Object]' for wire object ids and misroutes every update to
    // the first row (M5 W2 fix while wiring the entities table)
    const subscription = manager.subscribeEntityData({
      query: {
        entityFilter: { type: 'entityType', entityType: 'DEVICE' },
        pageLink: { pageSize: 10, page: 0 },
      },
      latestCmd: { keys: [{ type: 'ATTRIBUTE', key: 'active' }] },
    });
    await flush();
    FakeWebSocket.last.serverOpen();
    FakeWebSocket.last.serverMessage({
      cmdId: 1,
      errorCode: 0,
      errorMsg: '',
      cmdUpdateType: CmdUpdateType.ENTITY_DATA,
      data: {
        data: [
          {
            entityId: { entityType: EntityType.DEVICE, id: 'd1' },
            latest: { ATTRIBUTE: { active: { ts: 1, value: 'true' } } },
          },
          {
            entityId: { entityType: EntityType.DEVICE, id: 'd2' },
            latest: { ATTRIBUTE: { active: { ts: 1, value: 'true' } } },
          },
        ],
        totalPages: 1,
        totalElements: 2,
        hasNext: false,
      },
    });
    FakeWebSocket.last.serverMessage({
      cmdId: 1,
      errorCode: 0,
      errorMsg: '',
      cmdUpdateType: CmdUpdateType.ENTITY_DATA,
      update: [
        {
          entityId: { entityType: EntityType.DEVICE, id: 'd2' },
          latest: { ATTRIBUTE: { active: { ts: 2, value: 'false' } } },
        },
      ],
    });
    const rows = subscription.getSnapshot();
    const d2 = rows.find((row) => (row.entityId as { id: string }).id === 'd2');
    const d1 = rows.find((row) => (row.entityId as { id: string }).id === 'd1');
    expect(d2?.latest?.ATTRIBUTE?.active?.value).toBe('false');
    expect(d1?.latest?.ATTRIBUTE?.active?.value).toBe('true');
  });

  describe('mergeTimeseriesRows (pure)', () => {
    const device = (id: string) => ({ entityType: EntityType.DEVICE, id });

    it('dedupes re-sent timestamps by keeping the latest value and keeps ts ascending', () => {
      const merged = mergeTimeseriesRows(
        [
          {
            entityId: device('d1'),
            timeseries: {
              temperature: [
                { ts: 1000, value: '20' },
                { ts: 2000, value: '21' },
              ],
            },
          },
        ],
        [
          {
            entityId: device('d1'),
            timeseries: {
              temperature: [
                { ts: 2000, value: '21.5' },
                { ts: 500, value: '19' },
                { ts: 3000, value: '22' },
              ],
            },
          },
        ],
      );
      expect(merged[0].timeseries.temperature).toEqual([
        { ts: 500, value: '19' },
        { ts: 1000, value: '20' },
        { ts: 2000, value: '21.5' },
        { ts: 3000, value: '22' },
      ]);
    });

    it('does not mutate the input snapshot', () => {
      const current: Array<EntityTimeseriesRow> = [
        { entityId: device('d1'), timeseries: {} },
      ];
      const merged = mergeTimeseriesRows(current, [
        { entityId: device('d1'), timeseries: { t: [{ ts: 1, value: '1' }] } },
      ]);
      expect(current[0].timeseries).toEqual({});
      expect(merged[0].timeseries.t).toEqual([{ ts: 1, value: '1' }]);
    });
  });
});
