/**
 * Server error normalization — the single exit point every HTTP/WS failure
 * funnels through before reaching UI.
 *
 * Wire body (ThingsboardErrorResponse):
 *   { timestamp: number, status: number, message: string, errorCode: number }
 *
 * Rules (ADR #7/#8):
 *   - `detail` is the server message **verbatim** — no en→zh mapping table here.
 *   - `titleKey` is an i18n key tiered on errorCode first, then HTTP status.
 *   - Error discrimination elsewhere keys on `errorCode`/`status`, never on text.
 */

/** Numeric ThingsboardErrorCode enum (backend assigns ints on the wire). */
export const ThingsboardErrorCode = {
  GENERAL: 2,
  AUTHENTICATION: 10,
  JWT_TOKEN_EXPIRED: 11,
  CREDENTIALS_EXPIRED: 15,
  PERMISSION_DENIED: 20,
  INVALID_ARGUMENTS: 30,
  BAD_REQUEST_PARAMS: 31,
  ITEM_NOT_FOUND: 32,
  TOO_MANY_REQUESTS: 33,
  TOO_MANY_UPDATES: 34,
  VERSION_CONFLICT: 35,
  SUBSCRIPTION_VIOLATION: 40,
  ENTITIES_LIMIT_EXCEEDED: 41,
  PASSWORD_VIOLATION: 45,
  DATABASE: 46,
} as const;

export type ThingsboardErrorCodeValue =
  (typeof ThingsboardErrorCode)[keyof typeof ThingsboardErrorCode];

/** Normalized error shape consumed by UI (toast/dialog) and logic (flows). */
export interface ServerError {
  /** HTTP status; 0 = network-level failure (offline/DNS/timeout/abort). */
  status: number;
  /** ThingsboardErrorCode when the body carried one. */
  errorCode?: number;
  /** Server message, verbatim. Empty when nothing readable came back. */
  detail: string;
  /** i18n key for the generic shell text; UI layers resolve it. */
  titleKey: string;
  /** Server timestamp when present (ms epoch). */
  timestamp?: number;
}

/** Error thrown by the HTTP client; `cause` keeps the raw Response for edge cases. */
export class ServerErrorError extends Error implements ServerError {
  readonly status: number;
  readonly errorCode?: number;
  readonly detail: string;
  readonly titleKey: string;
  readonly timestamp?: number;

  constructor(se: ServerError) {
    super(`[${se.status}] ${se.titleKey}: ${se.detail}`);
    this.name = 'ServerErrorError';
    this.status = se.status;
    this.errorCode = se.errorCode;
    this.detail = se.detail;
    this.titleKey = se.titleKey;
    this.timestamp = se.timestamp;
  }
}

/** Tier table: errorCode → i18n key. Checked before the status-tier table. */
const ERROR_CODE_KEYS: Record<number, string> = {
  [ThingsboardErrorCode.CREDENTIALS_EXPIRED]: 'tb.error.credentialsExpired',
  [ThingsboardErrorCode.JWT_TOKEN_EXPIRED]: 'tb.error.tokenExpired',
  [ThingsboardErrorCode.AUTHENTICATION]: 'tb.error.unauthorized',
  [ThingsboardErrorCode.PERMISSION_DENIED]: 'tb.error.forbidden',
  [ThingsboardErrorCode.INVALID_ARGUMENTS]: 'tb.error.badRequest',
  [ThingsboardErrorCode.BAD_REQUEST_PARAMS]: 'tb.error.badRequest',
  [ThingsboardErrorCode.ITEM_NOT_FOUND]: 'tb.error.notFound',
  [ThingsboardErrorCode.TOO_MANY_REQUESTS]: 'tb.error.tooManyRequests',
  [ThingsboardErrorCode.TOO_MANY_UPDATES]: 'tb.error.tooManyUpdates',
  [ThingsboardErrorCode.VERSION_CONFLICT]: 'tb.error.versionConflict',
  [ThingsboardErrorCode.SUBSCRIPTION_VIOLATION]: 'tb.error.subscriptionViolation',
  [ThingsboardErrorCode.ENTITIES_LIMIT_EXCEEDED]: 'tb.error.entitiesLimitExceeded',
  [ThingsboardErrorCode.PASSWORD_VIOLATION]: 'tb.error.passwordViolation',
  [ThingsboardErrorCode.DATABASE]: 'tb.error.server',
};

/** Status-tier fallback (also used for network-level status 0). */
export function titleKeyFor(status: number): string {
  switch (status) {
    case 0:
      return 'tb.error.network';
    case 400:
    case 405:
    case 406:
    case 415:
    case 422:
      return 'tb.error.badRequest';
    case 401:
      return 'tb.error.unauthorized';
    case 403:
      return 'tb.error.forbidden';
    case 404:
      return 'tb.error.notFound';
    case 409:
      return 'tb.error.versionConflict';
    case 429:
      return 'tb.error.tooManyRequests';
    default:
      return status >= 500 ? 'tb.error.server' : 'tb.error.generic';
  }
}

interface RawErrorBody {
  timestamp?: number;
  status?: number;
  message?: string;
  /** Some Spring error paths emit `error` instead of `message`. */
  error?: string;
  errorCode?: number;
}

/** Build a ServerError from a Response and its (possibly unparsed) body. */
export function serverErrorFromResponse(
  response: Pick<Response, 'status'>,
  body: unknown,
): ServerError {
  let parsed: RawErrorBody = {};
  if (typeof body === 'string') {
    try {
      const maybeJson: unknown = JSON.parse(body);
      if (maybeJson && typeof maybeJson === 'object') {
        parsed = maybeJson as RawErrorBody;
      }
    } catch {
      /* non-JSON body — leave parsed empty */
    }
  } else if (body && typeof body === 'object') {
    parsed = body as RawErrorBody;
  }

  const status = response.status;
  const errorCode = typeof parsed.errorCode === 'number' ? parsed.errorCode : undefined;
  const titleKey =
    errorCode !== undefined && ERROR_CODE_KEYS[errorCode]
      ? ERROR_CODE_KEYS[errorCode]
      : titleKeyFor(status);
  const detail = parsed.message ?? parsed.error ?? '';

  return {
    status,
    errorCode,
    detail: typeof detail === 'string' ? detail : '',
    titleKey,
    timestamp: typeof parsed.timestamp === 'number' ? parsed.timestamp : undefined,
  };
}

/** Network-level failure (fetch rejected: offline, DNS, timeout abort). */
export function networkServerError(reason?: unknown): ServerError {
  const aborted = reason instanceof Error && reason.name === 'AbortError';
  return {
    status: 0,
    detail: reason instanceof Error ? reason.message : '',
    titleKey: aborted ? 'tb.error.timeout' : 'tb.error.network',
  };
}

/** True when the error represents an expired-password flow (drives redirect). */
export function isCredentialsExpired(se: ServerError): boolean {
  return se.errorCode === ThingsboardErrorCode.CREDENTIALS_EXPIRED;
}
