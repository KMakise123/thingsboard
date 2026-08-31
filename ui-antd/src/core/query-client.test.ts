import { describe, expect, it, vi } from 'vitest';
import { ServerErrorError } from './http/server-error';
import { createTbQueryClient } from './query-client';

function se(partial: { status: number; errorCode?: number }): ServerErrorError {
  return new ServerErrorError({
    status: partial.status,
    errorCode: partial.errorCode,
    detail: 'boom',
    titleKey: 'tb.error.generic',
  });
}

describe('tb query client retry policy', () => {
  it('does not retry 4xx failures', async () => {
    const client = createTbQueryClient();
    let attempts = 0;
    await expect(
      client.fetchQuery({
        queryKey: ['q'],
        queryFn: () => {
          attempts += 1;
          throw se({ status: 404 });
        },
        retry: undefined,
      }),
    ).rejects.toMatchObject({ status: 404 });
    expect(attempts).toBe(1);
  });

  it('does not retry 401 (session handling belongs to the http layer)', async () => {
    const client = createTbQueryClient();
    let attempts = 0;
    await expect(
      client.fetchQuery({
        queryKey: ['q'],
        queryFn: () => {
          attempts += 1;
          throw se({ status: 401, errorCode: 11 });
        },
      }),
    ).rejects.toBeTruthy();
    expect(attempts).toBe(1);
  });

  it('retries 5xx failures up to the default count', async () => {
    const client = createTbQueryClient();
    let attempts = 0;
    await expect(
      client.fetchQuery({
        queryKey: ['q'],
        queryFn: () => {
          attempts += 1;
          throw se({ status: 502 });
        },
      }),
    ).rejects.toBeTruthy();
    expect(attempts).toBe(3); // 1 initial + 2 retries
  });

  it('retries network-level failures (status 0)', async () => {
    const client = createTbQueryClient();
    let attempts = 0;
    await expect(
      client.fetchQuery({
        queryKey: ['q'],
        queryFn: () => {
          attempts += 1;
          throw se({ status: 0 });
        },
      }),
    ).rejects.toBeTruthy();
    expect(attempts).toBe(3);
  });

  it('routes query errors through the global onError hook', async () => {
    const onError = vi.fn();
    const client = createTbQueryClient({ onError });
    await expect(
      client.fetchQuery({
        queryKey: ['boom'],
        queryFn: () => {
          throw se({ status: 500 });
        },
      }),
    ).rejects.toBeTruthy();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ status: 500 }));
  });

  it('routes mutation errors through the global onError hook', async () => {
    const onError = vi.fn();
    const client = createTbQueryClient({ onError });
    // v5 has no client.mutate(); drive a mutation through the cache directly.
    const mutation = client.getMutationCache().build(client, {
      mutationFn: () => {
        throw se({ status: 403, errorCode: 20 });
      },
      mutationKey: ['m'],
    });
    await expect(mutation.execute()).rejects.toBeTruthy();
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ status: 403, errorCode: 20 }));
  });
});
