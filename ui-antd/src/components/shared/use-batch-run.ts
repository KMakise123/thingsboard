/**
 * Front-end fan-out runner for the batch operations (delete / assign /
 * unassign) — upstream has no bulk endpoints (BCR gap from Wave1), so M1
 * does the ui-ngx forkJoin dance with visible progress: every settled call
 * ticks the counter, failures are collected with the row key and the
 * summary feeds both the progress modal and the result toast.
 */
import { useCallback, useState } from 'react';

export interface BatchFailure {
  key: string;
  error: string;
}

export interface BatchRunState {
  running: boolean;
  total: number;
  done: number;
  failures: BatchFailure[];
}

export interface BatchSummary {
  ok: number;
  failed: number;
  failures: BatchFailure[];
}

const IDLE: BatchRunState = { running: false, total: 0, done: 0, failures: [] };

export function useBatchRun() {
  const [state, setState] = useState<BatchRunState>(IDLE);

  const run = useCallback(
    async <T>(
      items: Array<T>,
      keyOf: (item: T) => string,
      task: (item: T) => Promise<unknown>,
    ): Promise<BatchSummary> => {
      const failures: BatchFailure[] = [];
      setState({ running: true, total: items.length, done: 0, failures });
      let done = 0;
      await Promise.all(
        items.map(async (item) => {
          try {
            await task(item);
          } catch (error) {
            failures.push({
              key: keyOf(item),
              error: error instanceof Error ? error.message : String(error),
            });
          } finally {
            done += 1;
            setState((previous) => ({ ...previous, done }));
          }
        }),
      );
      const summary: BatchSummary = {
        ok: items.length - failures.length,
        failed: failures.length,
        failures,
      };
      // Keep BatchRunState's shape (no summary keys leak into state).
      setState({
        running: false,
        total: items.length,
        done,
        failures,
      });
      return summary;
    },
    [],
  );

  const reset = useCallback(() => {
    setState(IDLE);
  }, []);

  return { state, run, reset };
}
