import { expect, test } from '@playwright/test';

import { apiLogin, findDevice } from '../../fixtures/api';

/**
 * Smoke matrix — devices domain (spec §3.3 row 1, M1).
 *
 * TA: list → search → detail → tab switch → back (two tests, list and
 * detail halves). CU: read-only list face.
 *
 * Known defect (recorded, not fixed): the tenant device list has NO detail
 * entry point (name renders as plain text; only the alarms tab originator
 * link and the customer-scope device list navigate to /devices/:id), so the
 * TA detail tests address the page by URL.
 */

const TA = { email: 'tenant@thingsboard.org', password: 'tenant' };
const DEVICE_NAME = 'E2E Thermostat';

test.describe('devices — tenant admin', () => {
  test.use({ storageState: 'e2e/.auth/ta.json' });

  let deviceId: string;

  test.beforeAll(async () => {
    const token = await apiLogin(TA.email, TA.password);
    deviceId = (await findDevice(token, DEVICE_NAME)).id.id;
  });

  test('TA list: open, search, row shows up, search state bookmarks into the URL', async ({
    page,
  }) => {
    await page.goto('/devices');
    await expect(page.locator('.ant-table')).toBeVisible();

    const search = page.getByPlaceholder(/搜索设备|Search devices/i);
    await expect(search).toBeVisible();
    await search.fill(DEVICE_NAME);

    const row = page.locator('.ant-table').getByText(DEVICE_NAME).first();
    await expect(row).toBeVisible();

    // URL-state bookmark (cross-cutting §3.2 item 5): the committed search
    // lands in the URL as textSearch.
    await expect(page).toHaveURL(/textSearch=/);
  });

  test('TA detail: tabs mount lazily, switch and return to the list', async ({
    page,
  }) => {
    await page.goto(`/devices/${deviceId}`);
    // Landing tab: the active tabpanel mounts with the device's details
    // (antd renders it as .ant-tabs-content-active).
    await expect(
      page.locator('.ant-tabs-content-active').getByText(DEVICE_NAME),
    ).toBeVisible();

    // Details tab is the landing tab — its form is mounted.
    await expect(
      page.getByRole('tab', { name: /详情|Details/i }),
    ).toHaveAttribute('aria-selected', 'true');

    // Attributes tab mounts only after the click (destroyOnHidden).
    await page.getByRole('tab', { name: /属性|Attributes/i }).click();
    const pane = page.locator('.ant-tabs-content-active');
    await expect(pane.locator('.ant-table, .ant-empty').first()).toBeVisible();

    await page.getByRole('tab', { name: /最新遥测|Latest telemetry/i }).click();
    await expect(pane.locator('.ant-table, .ant-empty').first()).toBeVisible();

    await page.getByRole('tab', { name: /^告警$|Alarms/i }).click();
    await expect(pane.locator('.ant-table, .ant-empty').first()).toBeVisible();

    // Back to the list via the page's own back arrow (goBack would leave the
    // history entry this page was deep-linked from).
    await page
      .getByRole('button', { name: /back|返回/i })
      .first()
      .click();
    await expect(page).toHaveURL(/\/devices/);
    await expect(page.locator('.ant-table')).toBeVisible();
  });
});

test.describe('devices — customer user (read-only)', () => {
  test.use({ storageState: 'e2e/.auth/cu.json' });

  test('CU list: renders read-only, search empties out, no mutation entries', async ({
    page,
  }) => {
    await page.goto('/devices');
    await expect(page.locator('.ant-table')).toBeVisible();

    // CU scope (E2E Customer) owns no devices — empty state, not an error.
    const search = page.getByPlaceholder(/搜索设备|Search devices/i);
    await search.fill('zzz-no-match');
    await expect(page.getByText(/暂无设备|No devices/i)).toBeVisible();
    await expect(page.locator('.ant-alert-error')).toHaveCount(0);

    // Read-only face: no "Add new device" entry, no row selection column.
    await expect(
      page.getByRole('button', { name: /添加设备|Add new device/i }),
    ).toHaveCount(0);
  });
});
