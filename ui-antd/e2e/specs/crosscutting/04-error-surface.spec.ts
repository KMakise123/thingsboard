import { expect, test } from '@playwright/test';

/**
 * Cross-cutting group 4: error surface — backend messages reach the UI
 * VERBATIM inside generic shell copy (docs/spec/v1-test-baseline.md
 * §3.2 item 4; src/core/http/server-error.ts).
 *
 * - 5xx on a list query → global toast: shell title + verbatim detail;
 * - 404 on the telemetry seed → the panel's error Alert: shell title +
 *   verbatim detail;
 * - going offline → the global offline banner.
 *
 * Locale note: the E2E accounts run with the default zh-CN locale, so shell
 * titles are asserted in zh with en fallbacks where the suite may drift.
 */

test.use({ storageState: 'e2e/.auth/ta.json' });

const SYNTHETIC_DETAIL = 'E2E synthetic backend message';

function failBody(status: number, errorCode: number): string {
  return JSON.stringify({
    timestamp: Date.now(),
    status,
    message: SYNTHETIC_DETAIL,
    errorCode,
  });
}

test('backend 500 detail is passed through verbatim with the shell title', async ({
  page,
}) => {
  await page.route('**/api/tenant/deviceInfos*', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      // errorCode 46 = DATABASE → tb.error.server (shell title).
      body: failBody(500, 46),
    });
  });

  await page.goto('/devices');

  // Global error toast (antd App context → message): shell title prefix +
  // the backend's own message, unmapped.
  const toast = page.locator('.ant-message-notice', {
    hasText: SYNTHETIC_DETAIL,
  });
  await expect(toast).toBeVisible();
  await expect(toast).toContainText(/服务器内部错误|Internal server error/);
});

test('backend 404 detail is passed through verbatim in the panel alert', async ({
  page,
}) => {
  // The latest-telemetry tab seeds from GET .../values/timeseries.
  await page.route('**/values/timeseries*', async (route) => {
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      // errorCode 32 = ITEM_NOT_FOUND → tb.error.notFound (shell title).
      body: failBody(404, 32),
    });
  });

  const token = await taToken();
  const device = await deviceRef(token);
  await page.goto(`/devices/${device.id}?tab=latest-telemetry`);

  // Panel-level error surface (Alert with the normalized shell title and
  // the verbatim server message as its description).
  const alert = page.locator('.ant-alert-error', {
    hasText: SYNTHETIC_DETAIL,
  });
  await expect(alert).toBeVisible();
  await expect(alert).toContainText(
    /遥测数据加载失败|Failed to load telemetry/,
  );
});

async function taToken(): Promise<string> {
  const res = await fetch('http://localhost:8080/api/auth/login', {
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

async function deviceRef(token: string): Promise<{ id: string }> {
  const headers = { 'X-Authorization': `Bearer ${token}` };
  const search = await fetch(
    `http://localhost:8080/api/tenant/devices?pageSize=100&page=0&textSearch=${encodeURIComponent('E2E Thermostat')}`,
    { headers },
  );
  const result = (await search.json()) as {
    data: Array<{ name: string; id: { id: string } }>;
  };
  const device = result.data.find((d) => d.name === 'E2E Thermostat');
  if (!device) throw new Error('seed device E2E Thermostat not found');
  return { id: device.id.id };
}

test('going offline shows the global offline banner, recovery hides it', async ({
  page,
}) => {
  await page.goto('/devices');
  await expect(page.getByText('E2E Thermostat')).toBeVisible();

  await page.context().setOffline(true);
  const banner = page.locator('.ant-alert-warning');
  await expect(banner).toBeVisible({ timeout: 5_000 });
  await expect(banner).toContainText(/离线|offline/i);

  await page.context().setOffline(false);
  await expect(banner).toBeHidden({ timeout: 5_000 });
});
