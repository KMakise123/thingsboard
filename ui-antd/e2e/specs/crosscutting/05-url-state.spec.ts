import { expect, test } from '@playwright/test';

/**
 * Cross-cutting group 5: list URL state is bookmarkable
 * (docs/spec/v1-test-baseline.md §3.2 item 5).
 *
 * Contract (src/pages/devices/list/url-state.ts): page/pageSize/
 * sortProperty/sortOrder/textSearch live in the query string; operating the
 * list writes the URL, opening a URL restores the exact view. Navigation
 * into a bookmarked URL is a hard load — popstate automation is out of
 * scope (see M5 acceptance notes: synthetic popstate tears umi routing).
 *
 * The suite creates its own 12-device pool ("E2E Page Device NN", removed
 * afterwards) so paging is deterministic regardless of the demo dataset.
 */

test.use({ storageState: 'e2e/.auth/ta.json' });

const API = process.env.E2E_API_URL ?? 'http://localhost:8080';
const POOL_PREFIX = 'E2E Page Device';
const POOL_SIZE = 12;
const SEARCH = 'E2E Page';

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

function authed(token: string): Record<string, string> {
  return {
    'X-Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

async function findDevice(
  token: string,
  name: string,
): Promise<{ id: { id: string } } | undefined> {
  const res = await fetch(
    `${API}/api/tenant/devices?pageSize=100&page=0&textSearch=${encodeURIComponent(name)}`,
    { headers: authed(token) },
  );
  const page = (await res.json()) as {
    data: Array<{ name: string; id: { id: string } }>;
  };
  return page.data.find((d) => d.name === name);
}

test.beforeAll(async () => {
  const token = await taToken();
  for (let i = 1; i <= POOL_SIZE; i += 1) {
    const name = `${POOL_PREFIX} ${String(i).padStart(2, '0')}`;
    const existing = await findDevice(token, name);
    if (existing) {
      continue;
    }
    const res = await fetch(`${API}/api/device`, {
      method: 'POST',
      headers: authed(token),
      body: JSON.stringify({ name, type: 'default' }),
    });
    if (!res.ok) throw new Error(`create ${name} failed: ${res.status}`);
  }
});

test.afterAll(async () => {
  const token = await taToken();
  for (let i = 1; i <= POOL_SIZE; i += 1) {
    const name = `${POOL_PREFIX} ${String(i).padStart(2, '0')}`;
    const device = await findDevice(token, name);
    if (device) {
      await fetch(`${API}/api/device/${device.id.id}`, {
        method: 'DELETE',
        headers: authed(token),
      });
    }
  }
});

test('operating the list writes page/sort/filter into the URL', async ({
  page,
}) => {
  await page.goto('/devices');
  // Freshly created pool devices sit at the top (createdTime DESC sort).
  await expect(page.getByText(`${POOL_PREFIX} 12`)).toBeVisible();

  // 1. Filter: the debounced search lands in the URL.
  await page
    .getByPlaceholder(/搜索设备|Search devices/i)
    .first()
    .fill(SEARCH);
  // URLSearchParams encodes the space as '+' (urlencoded), not %20.
  await expect
    .poll(() => page.url(), { timeout: 10_000 })
    .toMatch(/textSearch=E2E(%20|\+)Page/);

  // 2. Sort by name: first click = ascending.
  await page
    .getByRole('columnheader', { name: /名称|Name/ })
    .first()
    .click();
  await expect
    .poll(() => page.url(), { timeout: 10_000 })
    .toContain('sortProperty=name');

  // 3. Page 2.
  await page
    .locator('.ant-pagination-item-2, [aria-label*="2"][class*=pagination]')
    .first()
    .click();
  await expect
    .poll(() => page.url(), { timeout: 10_000 })
    .toMatch(/([?&])page=2/);

  // The view matches the URL state: 12 pool devices → page 2 has 2 rows.
  await expect(page.getByText(`${POOL_PREFIX} 11`)).toBeVisible();
  await expect(page.getByText(`${POOL_PREFIX} 12`)).toBeVisible();
});

test('opening a bookmarked URL restores the exact list view', async ({
  page,
}) => {
  const query = new URLSearchParams({
    textSearch: SEARCH,
    sortProperty: 'name',
    sortOrder: 'ASC',
    pageSize: '10',
    page: '2',
  }).toString();

  await page.goto(`/devices?${query}`);

  // Filter restored: the search box carries the query back.
  await expect(
    page.getByPlaceholder(/搜索设备|Search devices/i).first(),
  ).toHaveValue(SEARCH);

  // Paging restored: page 2 of the 12-device pool = rows 11 and 12.
  await expect(page.getByText(`${POOL_PREFIX} 11`)).toBeVisible();
  await expect(page.getByText(`${POOL_PREFIX} 12`)).toBeVisible();
  await expect(page.getByText(`${POOL_PREFIX} 01`)).toBeHidden();

  // Sort restored: the name column shows the ascending sort indicator.
  await expect(
    page.locator('th[aria-sort="ascending"], th.ant-table-column-sort').first(),
  ).toBeVisible();
});
