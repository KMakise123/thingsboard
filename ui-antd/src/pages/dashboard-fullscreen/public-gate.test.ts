/**
 * public-gate decision-table unit tests (M15 R48): every branch of
 * resolvePublicGate plus the URL helpers the gate component consumes.
 */
import { describe, expect, it } from 'vitest';

import type { TokenClaims } from '@/core/auth/token-store';

import {
  loginRedirectUrl,
  resolvePublicGate,
  stripPublicIdParam,
} from './public-gate';

const publicClaims = (sub: string): TokenClaims => ({
  sub,
  scopes: ['CUSTOMER_USER'],
  isPublic: true,
});

const userClaims: TokenClaims = {
  sub: 'user-1',
  scopes: ['TENANT_ADMIN'],
};

describe('resolvePublicGate', () => {
  it('① anonymous + URL publicId → public-login (token exchange)', () => {
    expect(
      resolvePublicGate({
        hasValidToken: false,
        claims: null,
        publicId: 'pub-cust',
      }),
    ).toBe('public-login');
  });

  it('② anonymous without publicId → login-redirect (old access exit)', () => {
    expect(
      resolvePublicGate({ hasValidToken: false, claims: null, publicId: null }),
    ).toBe('login-redirect');
    // A corrupt local token is not a session either.
    expect(
      resolvePublicGate({
        hasValidToken: false,
        claims: publicClaims('pub-cust'),
        publicId: null,
      }),
    ).toBe('login-redirect');
  });

  it('③ valid public token matching the URL publicId → render (F5 refresh)', () => {
    expect(
      resolvePublicGate({
        hasValidToken: true,
        claims: publicClaims('pub-cust'),
        publicId: 'pub-cust',
      }),
    ).toBe('render');
  });

  it('④ logged-in user → render, publicId ignored', () => {
    expect(
      resolvePublicGate({
        hasValidToken: true,
        claims: userClaims,
        publicId: 'pub-cust',
      }),
    ).toBe('render');
    expect(
      resolvePublicGate({
        hasValidToken: true,
        claims: userClaims,
        publicId: null,
      }),
    ).toBe('render');
  });

  it('additional: isPublic but sub !== publicId → relogin-public', () => {
    expect(
      resolvePublicGate({
        hasValidToken: true,
        claims: publicClaims('other-pub'),
        publicId: 'pub-cust',
      }),
    ).toBe('relogin-public');
  });

  it('additional: isPublic without a URL publicId renders on the current ticket', () => {
    // ngx parity: the guard only enforces consistency when the route
    // carries a publicId; backend visibility still applies.
    expect(
      resolvePublicGate({
        hasValidToken: true,
        claims: publicClaims('pub-cust'),
        publicId: null,
      }),
    ).toBe('render');
  });
});

describe('stripPublicIdParam', () => {
  it('strips publicId and keeps the rest', () => {
    expect(stripPublicIdParam('?publicId=pub-cust&state=abc')).toBe(
      '?state=abc',
    );
  });

  it('drops the leading ? when nothing remains', () => {
    expect(stripPublicIdParam('?publicId=pub-cust')).toBe('');
    expect(stripPublicIdParam('?publicId=pub-cust&')).toBe('');
  });

  it('passes unrelated query strings through', () => {
    expect(stripPublicIdParam('?state=abc&reload=1')).toBe(
      '?state=abc&reload=1',
    );
    expect(stripPublicIdParam('')).toBe('');
  });
});

describe('loginRedirectUrl', () => {
  it('carries the publicId-stripped full address as the redirect target', () => {
    expect(
      loginRedirectUrl('/dashboard/dash-1', '?publicId=pub-cust&state=abc', ''),
    ).toBe(
      `/user/login?redirect=${encodeURIComponent('/dashboard/dash-1?state=abc')}`,
    );
  });

  it('keeps the hash', () => {
    expect(
      loginRedirectUrl('/dashboard/dash-1', '?publicId=pub-cust', '#frag'),
    ).toBe(
      `/user/login?redirect=${encodeURIComponent('/dashboard/dash-1#frag')}`,
    );
  });
});
