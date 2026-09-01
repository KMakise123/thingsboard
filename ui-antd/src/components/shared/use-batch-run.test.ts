import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useBatchRun } from './use-batch-run';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('useBatchRun (fan-out batch progress)', () => {
  it('ticks progress per settled call and reports ok/failed counts', async () => {
    const { result } = renderHook(() => useBatchRun());
    const gate = deferred<void>();
    const items = ['a', 'b', 'c'];

    let runPromise: Promise<ReturnType<typeof useBatchRun>['state']> | null =
      null;
    act(() => {
      runPromise = result.current.run(
        items,
        (item) => item,
        async (item) => {
          if (item === 'a') {
            await gate.promise;
          }
          if (item === 'c') {
            throw new Error('boom');
          }
        },
      ) as never;
    });

    // b settled, c failed, a still pending -> done 2/3.
    await waitFor(() => {
      expect(result.current.state.done).toBe(2);
    });
    expect(result.current.state.running).toBe(true);
    expect(result.current.state.failures).toEqual([
      { key: 'c', error: 'boom' },
    ]);

    act(() => {
      gate.resolve();
    });
    const summary = await runPromise;

    expect(summary).toEqual({
      ok: 2,
      failed: 1,
      failures: [{ key: 'c', error: 'boom' }],
    });
    await waitFor(() => {
      expect(result.current.state).toEqual({
        running: false,
        total: 3,
        done: 3,
        failures: [{ key: 'c', error: 'boom' }],
      });
    });
  });

  it('reset returns the state to idle', async () => {
    const { result } = renderHook(() => useBatchRun());
    await act(async () => {
      await result.current.run(
        ['x'],
        (item) => item,
        () => Promise.resolve(),
      );
    });
    expect(result.current.state.done).toBe(1);

    act(() => {
      result.current.reset();
    });
    expect(result.current.state).toEqual({
      running: false,
      total: 0,
      done: 0,
      failures: [],
    });
  });

  it('captures non-Error throwables as strings', async () => {
    const { result } = renderHook(() => useBatchRun());
    let summary: Awaited<ReturnType<typeof result.current.run>> | undefined;
    await act(async () => {
      summary = await result.current.run(
        ['x'],
        (item) => item,
        () => Promise.reject('plain string'),
      );
    });
    expect(summary?.failures).toEqual([{ key: 'x', error: 'plain string' }]);
  });

  it('does not invoke the task for an empty selection', async () => {
    const { result } = renderHook(() => useBatchRun());
    const task = vi.fn();
    let summary: Awaited<ReturnType<typeof result.current.run>> | undefined;
    await act(async () => {
      summary = await result.current.run([], (item) => item, task);
    });
    expect(task).not.toHaveBeenCalled();
    expect(summary).toEqual({ ok: 0, failed: 0, failures: [] });
  });
});
