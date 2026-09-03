import { expect, test } from '@playwright/test';

/**
 * Cross-cutting group 3: WS reconnect restores the page without manual
 * action (docs/spec/v1-test-baseline.md §3.2 item 3).
 *
 * Real socket, real backend (Playwright cannot intercept WS frames):
 * 1. push telemetry v1, open the device's latest-telemetry tab — the value
 *    is visible (REST seed);
 * 2. go offline (page.context().setOffline) — the socket dies and the
 *    manager schedules exponential reconnects (2s × 2^n);
 * 3. push telemetry v2 while offline — the page cannot see it;
 * 4. go back online — the next reconnect attempt succeeds, subscriptions
 *    are re-sent and v2 appears WITHOUT any reload or manual refresh.
 */

test.use({ storageState: 'e2e/.auth/ta.json' });

const API = process.env.E2E_API_URL ?? 'http://localhost:8080';
const DEVICE_NAME = 'E2E Thermostat';

async function taToken(): Promise<string> {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'tenant@thingsboard.org',
      password: 'tenant',
    }),
  });
  if (!res.ok) throw new Error(`TA login failed: ${res.status}`);
  return ((await res.json()) as { token: string }).token;
}

async function deviceRef(
  token: string,
): Promise<{ id: string; accessToken: string }> {
  const headers = { 'X-Authorization': `Bearer ${token}` };
  const search = await fetch(
    `${API}/api/tenant/devices?pageSize=100&page=0&textSearch=${encodeURIComponent(DEVICE_NAME)}`,
    { headers },
  );
  const page = (await search.json()) as {
    data: Array<{ name: string; id: { id: string } }>;
  };
  const device = page.data.find((d) => d.name === DEVICE_NAME);
  if (!device) throw new Error(`seed device ${DEVICE_NAME} not found`);
  const cred = await fetch(`${API}/api/device/${device.id.id}/credentials`, {
    headers,
  });
  const credentials = (await cred.json()) as { credentialsId: string };
  return { id: device.id.id, accessToken: credentials.credentialsId };
}

async function pushTelemetry(
  accessToken: string,
  values: Record<string, number>,
): Promise<void> {
  const res = await fetch(`${API}/api/v1/${accessToken}/telemetry`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(values),
  });
  if (!res.ok) throw new Error(`telemetry push failed: ${res.status}`);
}

test('telemetry resumes automatically after an offline window', async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000); // offline window + reconnect backoff
  const token = await taToken();
  const device = await deviceRef(token);

  // v1 arrives while the page is closed; the REST seed shows it on open.
  await pushTelemetry(device.accessToken, { temperature: 21.5 });
  await page.goto(`/devices/${device.id}?tab=latest-telemetry`);
  await expect(
    page.getByRole('cell', { name: '21.5', exact: true }),
  ).toBeVisible({ timeout: 15_000 });

  // Cut the network: the socket drops, the manager schedules reconnects.
  await page.context().setOffline(true);

  // v2 is written server-side while the page is unreachable.
  await pushTelemetry(device.accessToken, { temperature: 22.5 });

  // Keep the outage past the first reconnect attempt(s).
  await page.waitForTimeout(3_000);
  await page.context().setOffline(false);

  // NO reload, NO manual refresh: the reconnected subscription delivers v2.
  await expect(
    page.getByRole('cell', { name: '22.5', exact: true }),
  ).toBeVisible({ timeout: 20_000 });

  // The live-status tag is no longer stuck reconnecting (the subscription
  // is healthy again; the manager reports open/idle on a live socket).
  await expect(page.getByText(/:\s*(open|idle)/)).toBeVisible({
    timeout: 10_000,
  });
  void testInfo;
});
