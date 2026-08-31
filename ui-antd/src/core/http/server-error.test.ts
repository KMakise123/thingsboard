import { describe, expect, it } from 'vitest';

import {
  ServerErrorError,
  serverErrorFromResponse,
  titleKeyFor,
} from './server-error';

function res(status: number) {
  return { status } as Response;
}

describe('serverErrorFromResponse', () => {
  it('passes through the server message verbatim', () => {
    const err = serverErrorFromResponse(res(400), {
      timestamp: 1609459200000,
      status: 400,
      message: 'Invalid username or password',
      errorCode: 30,
    });
    expect(err.detail).toBe('Invalid username or password');
    expect(err.status).toBe(400);
    expect(err.errorCode).toBe(30);
    expect(err.timestamp).toBe(1609459200000);
  });

  it('falls back to error field when message is absent', () => {
    const err = serverErrorFromResponse(res(500), { error: 'boom' });
    expect(err.detail).toBe('boom');
    expect(err.errorCode).toBeUndefined();
  });

  it('keys title on errorCode first (CREDENTIALS_EXPIRED)', () => {
    const err = serverErrorFromResponse(res(401), {
      status: 401,
      message: 'User password expired!',
      errorCode: 15,
    });
    expect(err.titleKey).toBe('tb.error.credentialsExpired');
  });

  it('JWT_TOKEN_EXPIRED maps to tokenExpired', () => {
    const err = serverErrorFromResponse(res(401), {
      status: 401,
      message: 'Token has expired',
      errorCode: 11,
    });
    expect(err.titleKey).toBe('tb.error.tokenExpired');
  });

  it('falls back to status tier when errorCode is unknown', () => {
    expect(
      serverErrorFromResponse(res(403), { message: 'no', errorCode: 20 })
        .titleKey,
    ).toBe('tb.error.forbidden');
    expect(serverErrorFromResponse(res(404), { message: 'no' }).titleKey).toBe(
      'tb.error.notFound',
    );
    expect(serverErrorFromResponse(res(429), { message: 'no' }).titleKey).toBe(
      'tb.error.tooManyRequests',
    );
    expect(serverErrorFromResponse(res(400), { message: 'no' }).titleKey).toBe(
      'tb.error.badRequest',
    );
    expect(serverErrorFromResponse(res(502), { message: 'no' }).titleKey).toBe(
      'tb.error.server',
    );
    expect(serverErrorFromResponse(res(500), {}).titleKey).toBe(
      'tb.error.server',
    );
  });

  it('empty body on 4xx yields empty detail (UI decides)', () => {
    const err = serverErrorFromResponse(res(403), undefined);
    expect(err.detail).toBe('');
    expect(err.titleKey).toBe('tb.error.forbidden');
  });

  it('non-JSON body does not throw', () => {
    const err = serverErrorFromResponse(res(500), 'plain text garbage');
    expect(err.detail).toBe('');
    expect(err.status).toBe(500);
  });

  it('network failure maps to status 0 + network key', () => {
    expect(titleKeyFor(0)).toBe('tb.error.network');
  });

  it('carries resetToken from credentials-expired bodies', () => {
    const err = serverErrorFromResponse(res(401), {
      timestamp: 1609459200000,
      status: 401,
      message: 'User password expired!',
      errorCode: 15,
      resetToken: 'tok-1',
    });
    expect(err.resetToken).toBe('tok-1');
    expect(err.titleKey).toBe('tb.error.credentialsExpired');
  });

  it('resetToken stays undefined for other errors or non-string values', () => {
    expect(
      serverErrorFromResponse(res(401), { errorCode: 10, message: 'x' })
        .resetToken,
    ).toBeUndefined();
    expect(
      serverErrorFromResponse(res(401), { errorCode: 15, resetToken: 42 })
        .resetToken,
    ).toBeUndefined();
  });
});

describe('ServerErrorError', () => {
  it('keeps resetToken and the raw body for edge-case consumers', () => {
    const wire = {
      timestamp: 1,
      status: 401,
      message: 'User password expired!',
      errorCode: 15,
      resetToken: 'tok-1',
    };
    const error = new ServerErrorError(
      serverErrorFromResponse(res(401), wire),
      wire,
    );
    expect(error.resetToken).toBe('tok-1');
    expect(error.rawBody).toEqual(wire);
    expect(String(error)).toContain('[401]');
  });

  it('rawBody optional — constructor stays compatible with ServerError only', () => {
    const error = new ServerErrorError(serverErrorFromResponse(res(403), {}));
    expect(error.rawBody).toBeUndefined();
    expect(error.resetToken).toBeUndefined();
  });
});

describe('titleKeyFor error-code tiers', () => {
  it.each([
    // GENERAL is uncategorized: falls through to the status tier (400 here).
    [2, 'tb.error.badRequest'],
    [33, 'tb.error.tooManyRequests'],
    [34, 'tb.error.tooManyUpdates'],
    [35, 'tb.error.versionConflict'],
    [41, 'tb.error.entitiesLimitExceeded'],
    [45, 'tb.error.passwordViolation'],
    [46, 'tb.error.server'],
  ])('errorCode %d → %s', (code, key) => {
    expect(
      serverErrorFromResponse(res(400), { message: 'x', errorCode: code })
        .titleKey,
    ).toBe(key);
  });
});
