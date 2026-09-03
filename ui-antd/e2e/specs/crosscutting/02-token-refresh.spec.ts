import { expect, test } from '@playwright/test';

/**
 * Cross-cutting group 2: 401 refresh single-flight
 * (docs/spec/v1-test-baseline.md §3.2 item 2).
 *
 * Client contract (src/core/http/client.ts):
 * - a 401 on a non-exempt path triggers POST /api/auth/token; concurrent 401s
 *   queue on the SAME refresh promise (single-flight) and replay with the new
 *   token — exactly one refresh POST per flight;
 * - a failed refresh clears the four token keys and fires ONE unauthorized
 *   event, which the app layer (src/app.tsx handleUnauthorized) turns into a
 *   redirect to /user/login?redirect=...
 *
 * Fault injection rides on the REAL backend (spec §3.1): the first call to
 * each data endpoint answers a synthetic 401, its replay passes through.
 */

test.use({ storageState: 'e2e/.auth/ta.json' });

/** ThingsboardErrorResponse wire shape with JWT_TOKEN_EXPIRED (11). */
const unauthorizedBody = JSON.stringify({
  timestamp: Date.now(),
  status: 401,
  message: 'Token is expired [e2e-injected]',
  errorCode: 11,
});

test('concurrent 401s share one refresh flight and replay with the new token', async ({
  page,
}) => {
  let refreshPosts = 0;
  page.on('request', (req) => {
    if (req.method() === 'POST' && req.url().includes('/api/auth/token')) {
      refreshPosts += 1;
    }
  });

  // First hit per endpoint answers 401; the post-refresh replay passes
  // through to the real backend. Bearer headers are captured per phase.
  const firstAuth = new Map<string, string>();
  const replayAuth = new Map<string, string>();
  const failFirst = (pattern: string, tag: string) => {
    let hits = 0;
    return page.route(pattern, async (route) => {
      hits += 1;
      const auth = route.request().headers().authorization ?? '';
      if (hits === 1) {
        firstAuth.set(tag, auth);
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: unauthorizedBody,
        });
        return;
      }
      replayAuth.set(tag, auth);
      await route.continue();
    });
  };

  // The device list page mounts BOTH queries at once, so the two 401s land
  // on the client in the same batch — the single-flight queue scenario.
  // Real wire endpoints: /api/tenant/deviceInfos + /api/deviceProfileInfos.
  await failFirst('**/api/tenant/deviceInfos*', 'devices');
  await failFirst('**/api/deviceProfileInfos*', 'profiles');

  await page.goto('/devices');

  // Both replays succeeded against the real backend: seeded device renders.
  await expect(page.getByText('E2E Thermostat')).toBeVisible();

  // Single-flight: exactly one refresh POST despite two concurrent 401s.
  expect(refreshPosts).toBe(1);

  // Every queued request replayed with a DIFFERENT (fresh) bearer token.
  for (const tag of ['devices', 'profiles']) {
    expect(firstAuth.get(tag), `${tag} first attempt carried a bearer`).toMatch(
      /^Bearer .+/,
    );
    expect(replayAuth.get(tag), `${tag} replay carried a bearer`).toMatch(
      /^Bearer .+/,
    );
    expect(
      replayAuth.get(tag),
      `${tag} replay used the refreshed token`,
    ).not.toBe(firstAuth.get(tag));
  }
});

test('failed refresh logs out: tokens cleared, login page with redirect', async ({
  page,
}) => {
  let deviceHits = 0;
  await page.route('**/api/tenant/deviceInfos*', async (route) => {
    deviceHits += 1;
    if (deviceHits === 1) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: unauthorizedBody,
      });
      return;
    }
    await route.continue();
  });
  // The refresh endpoint itself rejects: the refresh token is dead too.
  await page.route('**/api/auth/token*', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: unauthorizedBody,
      });
      return;
    }
    await route.continue();
  });

  await page.goto('/devices');

  // Sample the address bar while the exit fires. The unified unauthorized
  // exit (src/app.tsx handleUnauthorized) replaces to /user/login carrying
  // the current path as the redirect target.
  const timeline: string[] = [];
  const sampler = setInterval(() => {
    timeline.push(page.url());
  }, 100);
  try {
    await expect
      .poll(() => timeline.join('\n'), { timeout: 15_000 })
      .toContain('/user/login?redirect=');

    // The redirect target points back at the page the user was on.
    const loginHit = timeline.find((u) => u.includes('/user/login?redirect='));
    const redirect = new URL(loginHit as string).searchParams.get('redirect');
    expect(redirect, 'redirect target points back at the app').toContain(
      '/devices',
    );
  } finally {
    clearInterval(sampler);
  }

  // Session destroyed: all four token keys are gone from localStorage
  // (token-store clear()).
  await expect
    .poll(async () => {
      const storage = await page.evaluate(() => ({
        jwt: localStorage.getItem('jwt_token'),
        jwtExp: localStorage.getItem('jwt_token_expiration'),
        refresh: localStorage.getItem('refresh_token'),
        refreshExp: localStorage.getItem('refresh_token_expiration'),
      }));
      return Object.values(storage).every((v) => v === null);
    })
    .toBe(true);

  // KNOWN PRODUCT DEFECT (recorded per task brief, not fixed here):
  // the login landing does NOT stick. handleUnauthorized clears the token
  // keys but leaves initialState.currentUser set, and the mount effect of
  // src/pages/home/entry.tsx replaces back to the role default page
  // (/devices) ~200ms later — the user ends up on a token-less cached page
  // instead of staying on the login form (ui-ngx parity: stays). The manual
  // logout path (AvatarDropdown) clears currentUser and sticks. When fixed,
  // replace the transient-hit poll above with a stable /user/login URL
  // assertion.
});
