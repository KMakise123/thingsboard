/**
 * QueryClient factory for the TB app.
 *
 * Retry policy is 4xx-sensitive: the HTTP layer already owns 401 refresh and
 * 429 backoff, so blindly retrying 4xx here would only duplicate load and
 * delay error surfaces. 5xx and network-level failures (status 0) get the
 * react-query default of 2 retries.
 *
 * Global error routing: QueryCache/MutationCache onError hand normalized
 * ServerError objects to the injected hook. Toast display belongs to the UI
 * layer — this module only provides the event.
 */

import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import type { ServerError } from './http/server-error';
import { ServerErrorError } from './http/server-error';

export interface TbQueryClientOptions {
  /** Global error sink (query + mutation). Receives the normalized error. */
  onError?: (error: ServerError) => void;
  /** Overrides for QueryClient defaults (staleTime etc. are app decisions). */
  defaultOptions?: {
    queries?: {
      staleTime?: number;
      refetchOnWindowFocus?: boolean;
      retry?: number | ((failureCount: number, error: unknown) => boolean);
    };
  };
}

function isServerError(error: unknown): error is ServerErrorError {
  return error instanceof ServerErrorError;
}

/**
 * Default retry predicate: never 4xx; up to 2 retries for 5xx/network.
 * (v5 semantics: a function `retry` has no built-in cap — cap it here.)
 */
export function tbRetryPredicate(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) {
    return false;
  }
  if (isServerError(error)) {
    if (error.status >= 400 && error.status < 500) {
      return false;
    }
    return true;
  }
  // Unknown shape: let the default behaviour stand (retry).
  return true;
}

export function createTbQueryClient(options: TbQueryClientOptions = {}): QueryClient {
  const emit = (error: unknown) => {
    if (isServerError(error)) {
      options.onError?.(error);
    }
  };

  return new QueryClient({
    queryCache: new QueryCache({ onError: emit }),
    mutationCache: new MutationCache({ onError: emit }),
    defaultOptions: {
      queries: {
        retry: tbRetryPredicate,
        ...options.defaultOptions?.queries,
      },
    },
  });
}
