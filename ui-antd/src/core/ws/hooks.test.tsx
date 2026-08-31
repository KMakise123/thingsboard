import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EntityType } from '@/types/tb';
import {
  setDefaultWsManager,
  useAttributeSubscription,
  useLatestTelemetrySubscription,
} from './hooks';
import { createWsManager, type WsManager } from './manager';
import { WsCmdType } from './protocol';

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  sent: string[] = [];
  onopen: ((ev: unknown) => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  onclose: ((ev: { code: number }) => void) | null = null;

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(): void {
    this.onclose?.({ code: 1000 });
  }

  serverOpen(): void {
    this.onopen?.({});
  }

  serverMessage(obj: unknown): void {
    this.onmessage?.({ data: JSON.stringify(obj) });
  }

  frames(): Array<{
    authCmd?: unknown;
    cmds: Array<{ cmdId: number; type: string }>;
  }> {
    return this.sent.map((raw) => JSON.parse(raw));
  }
}

async function flush(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
}

describe('ws hooks', () => {
  let manager: WsManager;

  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.useFakeTimers();
    manager = createWsManager({
      ensureToken: async () => 'jwt-token',
      WebSocketCtor: FakeWebSocket as unknown as typeof WebSocket,
    });
    setDefaultWsManager(manager);
  });

  afterEach(() => {
    setDefaultWsManager(null);
    vi.useRealTimers();
  });

  it('renders the REST seed, then replaces it with the WS snapshot', async () => {
    const seed = [{ key: 'voltage', value: 220, lastUpdateTs: 1 }];
    const { result } = renderHook(() =>
      useAttributeSubscription({
        entityId: { entityType: EntityType.DEVICE, id: 'd1' },
        scope: 'CLIENT_SCOPE' as never,
        keys: ['voltage'],
        seed,
      }),
    );
    // seed renders synchronously before the socket even opens
    expect(result.current.data).toEqual(seed);
    await flush();
    const ws = FakeWebSocket.instances[0];
    act(() => ws.serverOpen());
    const cmd = ws.frames()[0].cmds[0];
    expect(cmd.type).toBe(WsCmdType.ATTRIBUTES);
    act(() => {
      ws.serverMessage({
        subscriptionId: cmd.cmdId,
        errorCode: 0,
        errorMsg: '',
        data: { voltage: [[99, 230]] },
      });
    });
    expect(result.current.data).toEqual([
      { key: 'voltage', value: 230, lastUpdateTs: 99 },
    ]);
    expect(result.current.status).toBe('open');
  });

  it('unsubscribes on unmount (idle close eventually reaps the socket)', async () => {
    const { unmount } = renderHook(() =>
      useLatestTelemetrySubscription({
        entityId: { entityType: EntityType.DEVICE, id: 'd1' },
        keys: ['temp'],
      }),
    );
    await flush();
    const ws = FakeWebSocket.instances[0];
    act(() => ws.serverOpen());
    expect(ws.frames()[0].cmds[0].type).toBe(WsCmdType.TIMESERIES);
    unmount();
    // unsubscribe command flushed to the server
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const last = ws.frames().at(-1)?.cmds[0];
    expect(last).toMatchObject({
      type: WsCmdType.TIMESERIES,
      unsubscribe: true,
    });
  });

  it('resubscribes when the scope changes', async () => {
    const { rerender } = renderHook(
      ({ scope }: { scope: 'SERVER_SCOPE' | 'SHARED_SCOPE' }) =>
        useAttributeSubscription({
          entityId: { entityType: EntityType.DEVICE, id: 'd1' },
          scope: scope as never,
        }),
      { initialProps: { scope: 'SERVER_SCOPE' as const } },
    );
    await flush();
    const ws = FakeWebSocket.instances[0];
    act(() => ws.serverOpen());
    rerender({ scope: 'SHARED_SCOPE' });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    const frames = ws.frames();
    // second subscribe carries the new scope; first got unsubscribed
    const scopes = frames.map((f) => (f.cmds[0] as { scope?: string }).scope);
    expect(scopes).toContain('SHARED_SCOPE');
  });
});
